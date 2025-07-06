from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.schemas import (
    ScheduleRead, ScheduleDetail, PreviewRequestWithConfig, 
    ScheduleValidationResult
)
from app.services.scheduler import create_schedule, validate_schedule_constraints
from app.services.schedule_solver import (
    generate_weekly_schedule, ScheduleConstraints, constraints_from_config
)
from app.models import Staff, Schedule, ScheduleConfig, Facility
from app.deps import get_db, get_current_user

from pydantic import BaseModel

router = APIRouter()

class PreviewRequest(BaseModel):
    staff_ids: List[str]
    days: int = 7
    shifts_per_day: int = 3

@router.post("/preview")
def preview_schedule(body: PreviewRequest, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Preview a schedule with basic constraints"""
    staff = db.exec(select(Staff).where(Staff.id.in_(body.staff_ids))).all()
    
    # Verify staff belong to user's facilities
    facility_ids = [s.facility_id for s in staff]
    facilities = db.exec(select(Facility).where(Facility.id.in_(facility_ids))).all()
    
    for facility in facilities:
        if facility.tenant_id != current_user.tenant_id:
            raise HTTPException(status_code=403, detail="Invalid facility access")
    
    roster = generate_weekly_schedule(
        staff,
        days=body.days,
        shifts_per_day=body.shifts_per_day,
    )
    return {"roster": roster}

@router.post("/preview-with-constraints")
def preview_schedule_with_constraints(
    body: PreviewRequestWithConfig, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    """Preview a schedule with custom constraints"""
    staff = db.exec(select(Staff).where(Staff.id.in_(body.staff_ids))).all()
    
    if not staff:
        raise HTTPException(status_code=400, detail="No valid staff found")
    
    # Verify access
    facility_ids = [s.facility_id for s in staff]
    facilities = db.exec(select(Facility).where(Facility.id.in_(facility_ids))).all()
    
    for facility in facilities:
        if facility.tenant_id != current_user.tenant_id:
            raise HTTPException(status_code=403, detail="Invalid facility access")
    
    # Create custom constraints from request
    constraints = ScheduleConstraints(
        min_rest_hours=body.min_rest_hours or 8,
        max_consecutive_days=body.max_consecutive_days or 5,
        require_manager_per_shift=body.require_manager_per_shift or False,
        shift_role_requirements=body.shift_role_requirements or {}
    )
    
    try:
        roster = generate_weekly_schedule(
            staff,
            constraints=constraints,
            days=body.days,
            shifts_per_day=body.shifts_per_day,
            hours_per_shift=body.hours_per_shift,
        )
        return {"roster": roster, "constraints_applied": True}
    except RuntimeError as e:
        return {"error": str(e), "roster": [], "constraints_applied": False}

class GenerateRequest(BaseModel):
    facility_id: str
    week_start: date
    use_constraints: bool = True

@router.post("/", response_model=ScheduleRead)
def generate(body: GenerateRequest, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Generate a schedule for a facility"""
    # Verify facility access
    facility = db.get(Facility, body.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Invalid facility")
    
    try:
        sched = create_schedule(
            db, 
            body.facility_id, 
            body.week_start, 
            use_constraints=body.use_constraints
        )
        return sched
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=422, detail=f"Scheduling failed: {str(e)}")

@router.get("/{schedule_id}", response_model=ScheduleDetail)
def get_schedule(schedule_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get a schedule with all assignments"""
    schedule = db.get(Schedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Verify access through facility
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return schedule

@router.post("/{schedule_id}/validate", response_model=ScheduleValidationResult)
def validate_schedule(
    schedule_id: str, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    """Validate a schedule against facility constraints"""
    schedule = db.get(Schedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Verify access
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Convert assignments to roster format
    roster = []
    for assignment in schedule.assignments:
        roster.append({
            "day": assignment.day,
            "shift": assignment.shift,
            "staff_id": assignment.staff_id
        })
    
    validation_result = validate_schedule_constraints(
        db, schedule.facility_id, roster
    )
    
    return ScheduleValidationResult(**validation_result)

@router.get("/facility/{facility_id}/conflicts")
def check_scheduling_conflicts(
    facility_id: str,
    week_start: date,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Check for potential scheduling conflicts before generating"""
    # Verify access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Invalid facility")
    
    # Get staff and their constraints
    staff = db.exec(
        select(Staff).where(
            Staff.facility_id == facility_id,
            Staff.is_active.is_(True)
        )
    ).all()
    
    # Get facility config
    config = db.exec(
        select(ScheduleConfig).where(ScheduleConfig.facility_id == facility_id)
    ).first()
    
    conflicts = []
    warnings = []
    
    # Check if we have enough staff
    total_shifts_needed = 7 * 3  # 7 days, 3 shifts per day
    if config and config.min_staff_per_shift > 1:
        total_shifts_needed *= config.min_staff_per_shift
    
    max_possible_shifts = 0
    for s in staff:
        max_hours = s.weekly_hours_max or (config.max_weekly_hours if config else 40)
        max_shifts_per_staff = max_hours // 8  # 8 hours per shift
        max_possible_shifts += min(max_shifts_per_staff, 7)  # Max 1 shift per day
    
    if max_possible_shifts < total_shifts_needed:
        conflicts.append(f"Insufficient staff capacity: need {total_shifts_needed} shifts, can provide {max_possible_shifts}")
    
    # Check role requirements
    if config and config.require_manager_per_shift:
        managers = [s for s in staff if "manager" in s.role.lower()]
        if len(managers) == 0:
            conflicts.append("Manager required per shift but no managers available")
        elif len(managers) < 3:  # Need at least 3 for coverage
            warnings.append(f"Only {len(managers)} manager(s) available for 21 shifts per week")
    
    return {
        "has_conflicts": len(conflicts) > 0,
        "conflicts": conflicts,
        "warnings": warnings,
        "staff_count": len(staff),
        "estimated_feasibility": "high" if len(conflicts) == 0 else "low"
    }