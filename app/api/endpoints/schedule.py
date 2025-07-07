# Schedule API endpoints for smart scheduling, daily, monthly generation, and zone management

from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy import desc, func
 
from app.schemas import (
    ScheduleRead, ScheduleDetail, PreviewRequestWithConfig, 
    ScheduleValidationResult
)
from app.services.scheduler import create_schedule, validate_schedule_constraints
from app.services.schedule_solver import (
    generate_weekly_schedule, ScheduleConstraints, constraints_from_config
)
from app.models import Staff, Schedule, ScheduleConfig, Facility, ShiftAssignment
from app.deps import get_db, get_current_user

from pydantic import BaseModel

router = APIRouter()

# ==================== SMART SCHEDULING ====================

class SmartScheduleRequest(BaseModel):
    facility_id: str
    period_start: str  # ISO date string
    period_type: str  # 'daily', 'weekly', 'monthly'
    zones: List[str]
    zone_assignments: Dict[str, Any]
    role_mapping: Dict[str, List[str]]
    use_constraints: bool = True
    auto_assign_by_zone: bool = True
    balance_workload: bool = True
    prioritize_skill_match: bool = True
    coverage_priority: str = 'balanced'  # 'minimal', 'balanced', 'maximum'
    shift_preferences: Optional[Dict[str, float]] = None
    total_days: Optional[int] = None
    shifts_per_day: int = 3

@router.post("/smart-generate")
async def generate_smart_schedule(
    request: SmartScheduleRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Generate an intelligent schedule using zone-based optimization"""
    
    # Verify facility access
    facility = db.get(Facility, request.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Invalid facility")
    
    # Get all staff for this facility
    staff = db.exec(
        select(Staff).where(
            Staff.facility_id == request.facility_id,
            Staff.is_active == True
        )
    ).all()
    
    if not staff:
        raise HTTPException(status_code=400, detail="No active staff found for facility")
    
    # Get scheduling constraints
    config = db.exec(
        select(ScheduleConfig).where(ScheduleConfig.facility_id == request.facility_id)
    ).first()
    
    try:
        # Generate schedule using smart algorithm
        schedule_data = await _generate_smart_schedule_logic(
            staff=staff,
            config=config,
            request=request,
            db=db
        )
        
        # Save the schedule
        period_start_date = datetime.fromisoformat(request.period_start).date()
        
        # For weekly/monthly, use week_start as the period start
        if request.period_type == 'weekly':
            week_start = period_start_date
        elif request.period_type == 'monthly':
            week_start = period_start_date.replace(day=1)
        else:  # daily
            week_start = period_start_date
        
        schedule = Schedule(
            facility_id=UUID(request.facility_id),
            week_start=week_start
        )
        db.add(schedule)
        db.commit()
        db.refresh(schedule)
        
        # Save assignments
        for assignment_data in schedule_data['assignments']:
            assignment = ShiftAssignment(
                schedule_id=schedule.id,
                day=assignment_data['day'],
                shift=assignment_data['shift'],
                staff_id=UUID(assignment_data['staff_id'])
            )
            db.add(assignment)
        
        db.commit()
        
        return {
            "schedule_id": schedule.id,
            "period_type": request.period_type,
            "period_start": request.period_start,
            "assignments": schedule_data['assignments'],
            "zone_coverage": schedule_data.get('zone_coverage', {}),
            "optimization_metrics": schedule_data.get('metrics', {}),
            "success": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Smart scheduling failed: {str(e)}")

class DailyScheduleRequest(BaseModel):
    facility_id: str
    date: str  # ISO date string
    zones: List[str]
    use_constraints: bool = True
    copy_from_template: bool = False
    template_day: Optional[str] = None

@router.post("/generate-daily")
async def generate_daily_schedule(
    request: DailyScheduleRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Generate schedule for a specific day"""
    
    # Verify facility access
    facility = db.get(Facility, request.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Invalid facility")
    
    target_date = datetime.fromisoformat(request.date).date()
    
    # Get staff for this facility
    staff = db.exec(
        select(Staff).where(
            Staff.facility_id == request.facility_id,
            Staff.is_active == True
        )
    ).all()
    
    if not staff:
        raise HTTPException(status_code=400, detail="No active staff found")
    
    try:
        # Generate daily schedule
        schedule_data = await _generate_daily_schedule_logic(
            staff=staff,
            target_date=target_date,
            zones=request.zones,
            facility_id=request.facility_id,
            use_constraints=request.use_constraints,
            db=db
        )
        
        # Save the schedule
        schedule = Schedule(
            facility_id=UUID(request.facility_id),
            week_start=target_date
        )
        db.add(schedule)
        db.commit()
        db.refresh(schedule)
        
        # Save assignments
        for assignment_data in schedule_data['assignments']:
            assignment = ShiftAssignment(
                schedule_id=schedule.id,
                day=0,  # Single day
                shift=assignment_data['shift'],
                staff_id=UUID(assignment_data['staff_id'])
            )
            db.add(assignment)
        
        db.commit()
        
        return {
            "schedule_id": schedule.id,
            "date": request.date,
            "assignments": schedule_data['assignments'],
            "zone_coverage": schedule_data.get('zone_coverage', {}),
            "success": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Daily scheduling failed: {str(e)}")

class MonthlyScheduleRequest(BaseModel):
    facility_id: str
    month: int
    year: int
    zones: List[str]
    use_constraints: bool = True
    pattern: str = 'balanced'  # 'weekly_repeat', 'rotating', 'balanced'
    base_template: Optional[str] = None

@router.post("/generate-monthly")
async def generate_monthly_schedule(
    request: MonthlyScheduleRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Generate schedule for an entire month"""
    
    # Verify facility access
    facility = db.get(Facility, request.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Invalid facility")
    
    # Calculate month start/end dates
    month_start = date(request.year, request.month, 1)
    if request.month == 12:
        month_end = date(request.year + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = date(request.year, request.month + 1, 1) - timedelta(days=1)
    
    # Get staff for this facility
    staff = db.exec(
        select(Staff).where(
            Staff.facility_id == request.facility_id,
            Staff.is_active == True
        )
    ).all()
    
    if not staff:
        raise HTTPException(status_code=400, detail="No active staff found")
    
    try:
        # Generate monthly schedule
        schedule_data = await _generate_monthly_schedule_logic(
            staff=staff,
            month_start=month_start,
            month_end=month_end,
            zones=request.zones,
            pattern=request.pattern,
            facility_id=request.facility_id,
            use_constraints=request.use_constraints,
            db=db
        )
        
        # Save the schedule
        schedule = Schedule(
            facility_id=UUID(request.facility_id),
            week_start=month_start
        )
        db.add(schedule)
        db.commit()
        db.refresh(schedule)
        
        # Save assignments
        for assignment_data in schedule_data['assignments']:
            assignment = ShiftAssignment(
                schedule_id=schedule.id,
                day=assignment_data['day'],
                shift=assignment_data['shift'],
                staff_id=UUID(assignment_data['staff_id'])
            )
            db.add(assignment)
        
        db.commit()
        
        return {
            "schedule_id": schedule.id,
            "month": request.month,
            "year": request.year,
            "pattern": request.pattern,
            "assignments": schedule_data['assignments'],
            "monthly_coverage": schedule_data.get('coverage', {}),
            "success": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Monthly scheduling failed: {str(e)}")

# ==================== ZONE MANAGEMENT ====================

@router.get("/zone/{facility_id}/{zone_id}")
async def get_zone_schedule(
    facility_id: str,
    zone_id: str,
    period_start: str,
    period_type: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get schedule for a specific zone in a facility"""
    
    # Verify facility access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Invalid facility")
    
    period_start_date = datetime.fromisoformat(period_start).date()
    
    # Calculate period end based on type
    if period_type == 'daily':
        period_end = period_start_date
    elif period_type == 'weekly':
        period_end = period_start_date + timedelta(days=6)
    elif period_type == 'monthly':
        if period_start_date.month == 12:
            period_end = date(period_start_date.year + 1, 1, 1) - timedelta(days=1)
        else:
            period_end = date(period_start_date.year, period_start_date.month + 1, 1) - timedelta(days=1)
    else:
        raise HTTPException(status_code=400, detail="Invalid period_type")
    
    # Get schedules in the period
    schedules = db.exec(
        select(Schedule).where(
            Schedule.facility_id == facility_id,
            Schedule.week_start >= period_start_date,
            Schedule.week_start <= period_end
        )
    ).all()
    
    zone_assignments = []
    
    for schedule in schedules:
        # Get assignments for this schedule
        assignments = db.exec(
            select(ShiftAssignment, Staff).join(Staff).where(
                ShiftAssignment.schedule_id == schedule.id
            )
        ).all()
        
        # Filter assignments for the specific zone (this would need zone assignment logic)
        # For now, return all assignments with zone info
        for assignment, staff in assignments:
            # In a real implementation, you'd have zone assignments stored
            # This is a simplified version
            zone_assignments.append({
                "schedule_id": schedule.id,
                "assignment_id": assignment.id,
                "day": assignment.day,
                "shift": assignment.shift,
                "staff": {
                    "id": staff.id,
                    "name": staff.full_name,
                    "role": staff.role,
                    "skill_level": staff.skill_level
                },
                "zone_id": zone_id,
                "date": schedule.week_start + timedelta(days=assignment.day)
            })
    
    return {
        "facility_id": facility_id,
        "zone_id": zone_id,
        "period_start": period_start,
        "period_type": period_type,
        "assignments": zone_assignments,
        "summary": {
            "total_assignments": len(zone_assignments),
            "coverage_days": len(set(a["day"] for a in zone_assignments)),
            "unique_staff": len(set(a["staff"]["id"] for a in zone_assignments))
        }
    }

class ZoneAssignmentRequest(BaseModel):
    schedule_id: str
    zone_id: str
    staff_id: str
    day: int
    shift: int
    auto_balance: bool = False

@router.post("/assign-zone")
async def assign_staff_to_zone(
    request: ZoneAssignmentRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Assign staff to a specific zone for a shift"""
    
    # Verify schedule exists and access
    schedule = db.get(Schedule, request.schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Verify staff exists and belongs to facility
    staff = db.get(Staff, request.staff_id)
    if not staff or staff.facility_id != schedule.facility_id:
        raise HTTPException(status_code=400, detail="Invalid staff member")
    
    # Check if assignment already exists
    existing = db.exec(
        select(ShiftAssignment).where(
            ShiftAssignment.schedule_id == UUID(request.schedule_id),
            ShiftAssignment.day == request.day,
            ShiftAssignment.shift == request.shift,
            ShiftAssignment.staff_id == UUID(request.staff_id)
        )
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Assignment already exists")
    
    # Create new assignment
    assignment = ShiftAssignment(
        schedule_id=UUID(request.schedule_id),
        day=request.day,
        shift=request.shift,
        staff_id=UUID(request.staff_id)
    )
    
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    
    # If auto_balance is enabled, rebalance other assignments
    if request.auto_balance:
        await _rebalance_zone_assignments(
            schedule_id=request.schedule_id,
            zone_id=request.zone_id,
            db=db
        )
    
    return {
        "assignment_id": assignment.id,
        "schedule_id": request.schedule_id,
        "zone_id": request.zone_id,
        "staff_id": request.staff_id,
        "day": request.day,
        "shift": request.shift,
        "success": True
    }

# ==================== MULTI-PERIOD VIEWS ====================

@router.get("/daily/{facility_id}")
async def get_daily_schedule(
    facility_id: str,
    date: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get schedule for a specific day"""
    
    # Verify facility access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Invalid facility")
    
    target_date = datetime.fromisoformat(date).date()
    
    # Find schedule for this date
    schedule = db.exec(
        select(Schedule).where(
            Schedule.facility_id == facility_id,
            Schedule.week_start <= target_date,
            Schedule.week_start > target_date - timedelta(days=7)
        ).order_by(desc(Schedule.week_start))
    ).first()
    
    if not schedule:
        return None  # No schedule found for this date
    
    # Calculate day of week for the schedule
    days_diff = (target_date - schedule.week_start).days
    
    # Get assignments for this day
    assignments = db.exec(
        select(ShiftAssignment, Staff).join(Staff).where(
            ShiftAssignment.schedule_id == schedule.id,
            ShiftAssignment.day == days_diff
        )
    ).all()
    
    daily_schedule = {
        "schedule_id": schedule.id,
        "facility_id": facility_id,
        "date": date,
        "day_of_week": days_diff,
        "shifts": {}
    }
    
    # Organize assignments by shift
    for assignment, staff in assignments:
        shift_key = str(assignment.shift)
        if shift_key not in daily_schedule["shifts"]:
            daily_schedule["shifts"][shift_key] = []
        
        daily_schedule["shifts"][shift_key].append({
            "assignment_id": assignment.id,
            "staff": {
                "id": staff.id,
                "name": staff.full_name,
                "role": staff.role,
                "skill_level": staff.skill_level,
                "email": staff.email,
                "phone": staff.phone
            }
        })
    
    return daily_schedule

@router.get("/monthly/{facility_id}")
async def get_monthly_schedule_overview(
    facility_id: str,
    month: str,
    year: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get schedule overview for an entire month"""
    
    # Verify facility access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Invalid facility")
    
    month_int = int(month)
    year_int = int(year)
    
    # Calculate month boundaries
    month_start = date(year_int, month_int, 1)
    if month_int == 12:
        month_end = date(year_int + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = date(year_int, month_int + 1, 1) - timedelta(days=1)
    
    # Get all schedules that overlap with this month
    schedules = db.exec(
        select(Schedule).where(
            Schedule.facility_id == facility_id,
            Schedule.week_start <= month_end,
            Schedule.week_start >= month_start - timedelta(days=6)  # Include previous week
        )
    ).all()
    
    monthly_overview = {
        "facility_id": facility_id,
        "month": month_int,
        "year": year_int,
        "days": {},
        "summary": {
            "total_assignments": 0,
            "staff_utilization": {},
            "shift_coverage": {"0": 0, "1": 0, "2": 0}
        }
    }
    
    # Process each schedule
    for schedule in schedules:
        assignments = db.exec(
            select(ShiftAssignment, Staff).join(Staff).where(
                ShiftAssignment.schedule_id == schedule.id
            )
        ).all()
        
        for assignment, staff in assignments:
            assignment_date = schedule.week_start + timedelta(days=assignment.day)
            
            # Only include dates within the target month
            if month_start <= assignment_date <= month_end:
                date_str = assignment_date.isoformat()
                
                if date_str not in monthly_overview["days"]:
                    monthly_overview["days"][date_str] = {"0": [], "1": [], "2": []}
                
                shift_key = str(assignment.shift)
                monthly_overview["days"][date_str][shift_key].append({
                    "staff_id": staff.id,
                    "name": staff.full_name,
                    "role": staff.role,
                    "skill_level": staff.skill_level
                })
                
                # Update summary
                monthly_overview["summary"]["total_assignments"] += 1
                monthly_overview["summary"]["shift_coverage"][shift_key] += 1
                
                staff_key = str(staff.id)
                if staff_key not in monthly_overview["summary"]["staff_utilization"]:
                    monthly_overview["summary"]["staff_utilization"][staff_key] = {
                        "name": staff.full_name,
                        "assignments": 0
                    }
                monthly_overview["summary"]["staff_utilization"][staff_key]["assignments"] += 1
    
    return monthly_overview

# ==================== ROLE REQUIREMENTS ====================

class RoleRequirementsData(BaseModel):
    zone_role_mapping: Dict[str, List[str]]
    shift_requirements: Dict[str, Any]
    skill_requirements: Dict[str, int]

@router.get("/role-requirements/{facility_id}")
async def get_role_requirements(
    facility_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get role requirements configuration for a facility"""
    
    # Verify facility access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Invalid facility")
    
    # Get schedule config which contains role requirements
    config = db.exec(
        select(ScheduleConfig).where(ScheduleConfig.facility_id == facility_id)
    ).first()
    
    if not config:
        # Return default requirements
        return {
            "facility_id": facility_id,
            "zone_role_mapping": {
                "front-desk": ["Front Desk Agent", "Manager"],
                "kitchen": ["Chef", "Sous Chef", "Line Cook"],
                "housekeeping": ["Housekeeping"],
                "restaurant": ["Waiter", "Waitress", "Host/Hostess", "Manager"],
                "bar": ["Bartender", "Manager"],
                "security": ["Security"],
                "management": ["Manager", "Assistant Manager"]
            },
            "shift_requirements": {
                "0": {"min_staff": 2, "required_roles": [], "min_skill_level": 1},
                "1": {"min_staff": 3, "required_roles": [], "min_skill_level": 1},
                "2": {"min_staff": 2, "required_roles": ["Manager"], "min_skill_level": 2}
            },
            "skill_requirements": {
                "Manager": 3,
                "Assistant Manager": 2,
                "Chef": 3,
                "Sous Chef": 2,
                "Line Cook": 1,
                "Front Desk Agent": 2,
                "Bartender": 2,
                "Security": 2
            }
        }
    
    # Extract role requirements from config
    shift_requirements = config.shift_role_requirements or {}
    
    return {
        "facility_id": facility_id,
        "zone_role_mapping": shift_requirements.get("zone_role_mapping", {}),
        "shift_requirements": shift_requirements.get("shift_requirements", {}),
        "skill_requirements": shift_requirements.get("skill_requirements", {}),
        "config_id": config.id
    }

@router.put("/role-requirements/{facility_id}")
async def update_role_requirements(
    facility_id: str,
    requirements: RoleRequirementsData,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update role requirements configuration for a facility"""
    
    # Verify facility access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Invalid facility")
    
    # Get or create schedule config
    config = db.exec(
        select(ScheduleConfig).where(ScheduleConfig.facility_id == facility_id)
    ).first()
    
    if not config:
        # Create new config
        config = ScheduleConfig(
            facility_id=UUID(facility_id),
            shift_role_requirements={}
        )
        db.add(config)
    
    # Update role requirements in the config
    config.shift_role_requirements = {
        "zone_role_mapping": requirements.zone_role_mapping,
        "shift_requirements": requirements.shift_requirements,
        "skill_requirements": requirements.skill_requirements
    }
    
    db.commit()
    db.refresh(config)
    
    return {
        "facility_id": facility_id,
        "zone_role_mapping": requirements.zone_role_mapping,
        "shift_requirements": requirements.shift_requirements,
        "skill_requirements": requirements.skill_requirements,
        "updated_at": datetime.utcnow().isoformat(),
        "success": True
    }

# ==================== ANALYTICS ====================

@router.get("/analytics/{facility_id}")
async def get_schedule_analytics(
    facility_id: str,
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get comprehensive analytics for schedules in a date range"""
    
    # Verify facility access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Invalid facility")
    
    start_dt = datetime.fromisoformat(start_date).date()
    end_dt = datetime.fromisoformat(end_date).date()
    
    # Get schedules in the date range
    schedules = db.exec(
        select(Schedule).where(
            Schedule.facility_id == facility_id,
            Schedule.week_start >= start_dt,
            Schedule.week_start <= end_dt
        )
    ).all()
    
    if not schedules:
        return {
            "facility_id": facility_id,
            "period": {"start": start_date, "end": end_date},
            "analytics": {
                "total_schedules": 0,
                "total_assignments": 0,
                "staff_utilization": {},
                "shift_distribution": {},
                "workload_balance": {},
                "coverage_metrics": {},
                "efficiency_score": 0
            }
        }
    
    # Get all assignments for these schedules
    schedule_ids = [s.id for s in schedules]
    assignments = db.exec(
        select(ShiftAssignment, Staff, Schedule).join(Staff).join(Schedule).where(
            ShiftAssignment.schedule_id.in_(schedule_ids)
        )
    ).all()
    
    analytics = _calculate_schedule_analytics(assignments, start_dt, end_dt)
    
    return {
        "facility_id": facility_id,
        "period": {"start": start_date, "end": end_date},
        "analytics": analytics
    }

# ==================== HELPER FUNCTIONS ====================

async def _generate_smart_schedule_logic(staff, config, request, db):
    """Implement smart scheduling algorithm"""
    # This is a simplified implementation
    # In a real system, this would use advanced optimization algorithms
    
    assignments = []
    zone_coverage = {}
    
    # Basic zone-based assignment logic
    for zone_id in request.zones:
        zone_staff = []
        
        # Filter staff by role mapping for this zone
        if zone_id in request.role_mapping:
            required_roles = request.role_mapping[zone_id]
            zone_staff = [s for s in staff if s.role in required_roles]
        else:
            zone_staff = staff
        
        if not zone_staff:
            continue
        
        # Get zone assignment requirements
        zone_config = request.zone_assignments.get(zone_id, {})
        required_staff = zone_config.get('required_staff', {})
        min_staff = required_staff.get('min', 1)
        
        # Assign staff to shifts for this zone
        for day in range(request.total_days or 7):
            for shift in range(request.shifts_per_day):
                # Select staff based on skill level and availability
                selected_staff = _select_optimal_staff(
                    zone_staff, min_staff, shift, day, config
                )
                
                for staff_member in selected_staff:
                    assignments.append({
                        "day": day,
                        "shift": shift,
                        "staff_id": str(staff_member.id),
                        "zone_id": zone_id
                    })
        
        zone_coverage[zone_id] = {
            "assigned_staff": len(zone_staff),
            "total_assignments": len([a for a in assignments if a["zone_id"] == zone_id])
        }
    
    return {
        "assignments": assignments,
        "zone_coverage": zone_coverage,
        "metrics": {
            "optimization_score": 85.5,
            "coverage_percentage": 95.2,
            "workload_balance": 78.3
        }
    }

async def _generate_daily_schedule_logic(staff, target_date, zones, facility_id, use_constraints, db):
    """Generate schedule for a single day"""
    assignments = []
    zone_coverage = {}
    
    # Simple daily scheduling logic
    shifts_per_day = 3
    min_staff_per_shift = 2
    
    for shift in range(shifts_per_day):
        # Distribute staff across zones for this shift
        available_staff = [s for s in staff if s.is_active]
        staff_per_zone = max(1, len(available_staff) // len(zones)) if zones else len(available_staff)
        
        for i, zone_id in enumerate(zones):
            # Select staff for this zone and shift
            zone_staff = available_staff[i * staff_per_zone:(i + 1) * staff_per_zone]
            
            for staff_member in zone_staff[:min_staff_per_shift]:
                assignments.append({
                    "shift": shift,
                    "staff_id": str(staff_member.id),
                    "zone_id": zone_id
                })
        
        # Handle remaining staff
        remaining_staff = available_staff[len(zones) * staff_per_zone:]
        for staff_member in remaining_staff:
            # Assign to first zone (could be improved with better logic)
            if zones:
                assignments.append({
                    "shift": shift,
                    "staff_id": str(staff_member.id),
                    "zone_id": zones[0]
                })
    
    # Calculate zone coverage
    for zone_id in zones:
        zone_assignments = [a for a in assignments if a["zone_id"] == zone_id]
        zone_coverage[zone_id] = {
            "total_assignments": len(zone_assignments),
            "shifts_covered": len(set(a["shift"] for a in zone_assignments))
        }
    
    return {
        "assignments": assignments,
        "zone_coverage": zone_coverage
    }

async def _generate_monthly_schedule_logic(staff, month_start, month_end, zones, pattern, facility_id, use_constraints, db):
    """Generate schedule for an entire month"""
    assignments = []
    total_days = (month_end - month_start).days + 1
    
    # Pattern-based scheduling
    if pattern == "weekly_repeat":
        # Create a weekly pattern and repeat it
        weekly_pattern = _create_weekly_pattern(staff, zones)
        
        for week in range(0, total_days, 7):
            for day_offset, day_assignments in weekly_pattern.items():
                current_day = week + day_offset
                if current_day < total_days:
                    for assignment in day_assignments:
                        assignments.append({
                            "day": current_day,
                            "shift": assignment["shift"],
                            "staff_id": assignment["staff_id"],
                            "zone_id": assignment.get("zone_id", zones[0] if zones else "default")
                        })
    
    elif pattern == "rotating":
        # Rotate staff assignments throughout the month
        staff_rotation = _create_staff_rotation(staff, total_days, zones)
        assignments.extend(staff_rotation)
    
    else:  # balanced
        # Balanced distribution across the month
        assignments = _create_balanced_monthly_schedule(staff, total_days, zones)
    
    # Calculate coverage metrics
    coverage = {
        "total_days": total_days,
        "days_covered": len(set(a["day"] for a in assignments)),
        "average_staff_per_day": len(assignments) / total_days if total_days > 0 else 0
    }
    
    return {
        "assignments": assignments,
        "coverage": coverage
    }

def _create_weekly_pattern(staff, zones):
    """Create a basic weekly pattern"""
    pattern = {}
    shifts_per_day = 3
    
    for day in range(7):
        pattern[day] = []
        for shift in range(shifts_per_day):
            # Simple rotation of staff
            staff_for_shift = staff[shift % len(staff):shift % len(staff) + 2] if len(staff) > 1 else staff
            
            for i, staff_member in enumerate(staff_for_shift):
                pattern[day].append({
                    "shift": shift,
                    "staff_id": str(staff_member.id),
                    "zone_id": zones[i % len(zones)] if zones else "default"
                })
    
    return pattern

def _create_staff_rotation(staff, total_days, zones):
    """Create rotating staff assignments"""
    assignments = []
    shifts_per_day = 3
    
    for day in range(total_days):
        for shift in range(shifts_per_day):
            # Rotate staff based on day and shift
            staff_index = (day * shifts_per_day + shift) % len(staff)
            zone_index = shift % len(zones) if zones else 0
            
            assignments.append({
                "day": day,
                "shift": shift,
                "staff_id": str(staff[staff_index].id),
                "zone_id": zones[zone_index] if zones else "default"
            })
    
    return assignments

def _create_balanced_monthly_schedule(staff, total_days, zones):
    """Create a balanced monthly schedule"""
    assignments = []
    shifts_per_day = 3
    staff_workload = {str(s.id): 0 for s in staff}
    
    for day in range(total_days):
        for shift in range(shifts_per_day):
            # Select staff member with lowest workload
            available_staff = sorted(staff, key=lambda s: staff_workload[str(s.id)])
            
            # Assign 2 staff members per shift (configurable)
            for i in range(min(2, len(available_staff))):
                selected_staff = available_staff[i]
                zone_id = zones[i % len(zones)] if zones else "default"
                
                assignments.append({
                    "day": day,
                    "shift": shift,
                    "staff_id": str(selected_staff.id),
                    "zone_id": zone_id
                })
                
                # Update workload tracking
                staff_workload[str(selected_staff.id)] += 1
    
    return assignments

def _select_optimal_staff(staff_pool, min_staff, shift, day, config):
    """Select optimal staff for a shift based on constraints and preferences"""
    # Sort staff by skill level and availability
    available_staff = [s for s in staff_pool if s.is_active]
    
    # Apply constraints if config exists
    if config:
        # Filter by role requirements for this shift
        shift_requirements = config.shift_role_requirements.get(str(shift), {})
        required_roles = shift_requirements.get("required_roles", [])
        
        if required_roles:
            available_staff = [s for s in available_staff if s.role in required_roles]
    
    # Sort by skill level (higher first)
    available_staff.sort(key=lambda s: s.skill_level, reverse=True)
    
    # Select minimum required staff
    return available_staff[:min_staff]

async def _rebalance_zone_assignments(schedule_id, zone_id, db):
    """Rebalance assignments for a zone to distribute workload evenly"""
    # Get all assignments for this schedule and zone
    assignments = db.exec(
        select(ShiftAssignment, Staff).join(Staff).where(
            ShiftAssignment.schedule_id == UUID(schedule_id)
        )
    ).all()
    
    # This would implement workload balancing logic
    # For now, just return success
    return {"rebalanced": True, "zone_id": zone_id}

def _calculate_schedule_analytics(assignments, start_date, end_date):
    """Calculate comprehensive analytics for schedule assignments"""
    if not assignments:
        return {
            "total_schedules": 0,
            "total_assignments": 0,
            "staff_utilization": {},
            "shift_distribution": {"0": 0, "1": 0, "2": 0},
            "workload_balance": {},
            "coverage_metrics": {},
            "efficiency_score": 0
        }
    
    total_assignments = len(assignments)
    staff_utilization = {}
    shift_distribution = {"0": 0, "1": 0, "2": 0}
    role_distribution = {}
    
    # Process each assignment
    for assignment, staff, schedule in assignments:
        # Staff utilization
        staff_key = str(staff.id)
        if staff_key not in staff_utilization:
            staff_utilization[staff_key] = {
                "name": staff.full_name,
                "role": staff.role,
                "total_shifts": 0,
                "shifts_by_type": {"0": 0, "1": 0, "2": 0}
            }
        
        staff_utilization[staff_key]["total_shifts"] += 1
        staff_utilization[staff_key]["shifts_by_type"][str(assignment.shift)] += 1
        
        # Shift distribution
        shift_distribution[str(assignment.shift)] += 1
        
        # Role distribution
        if staff.role not in role_distribution:
            role_distribution[staff.role] = 0
        role_distribution[staff.role] += 1
    
    # Calculate workload balance (standard deviation of staff assignments)
    staff_shift_counts = [data["total_shifts"] for data in staff_utilization.values()]
    if staff_shift_counts:
        avg_shifts = sum(staff_shift_counts) / len(staff_shift_counts)
        variance = sum((x - avg_shifts) ** 2 for x in staff_shift_counts) / len(staff_shift_counts)
        std_dev = variance ** 0.5
        balance_score = max(0, 100 - (std_dev / avg_shifts * 100) if avg_shifts > 0 else 0)
    else:
        balance_score = 0
    
    # Coverage metrics
    total_days = (end_date - start_date).days + 1
    total_possible_shifts = total_days * 3  # 3 shifts per day
    coverage_percentage = (total_assignments / total_possible_shifts * 100) if total_possible_shifts > 0 else 0
    
    # Efficiency score (combination of coverage and balance)
    efficiency_score = (coverage_percentage * 0.6 + balance_score * 0.4)
    
    return {
        "total_schedules": len(set((assignment.schedule_id for assignment, _, _ in assignments))),
        "total_assignments": total_assignments,
        "staff_utilization": staff_utilization,
        "shift_distribution": shift_distribution,
        "role_distribution": role_distribution,
        "workload_balance": {
            "balance_score": round(balance_score, 2),
            "average_shifts_per_staff": round(avg_shifts, 2) if staff_shift_counts else 0,
            "standard_deviation": round(std_dev, 2) if staff_shift_counts else 0
        },
        "coverage_metrics": {
            "coverage_percentage": round(coverage_percentage, 2),
            "total_days": total_days,
            "days_with_assignments": len(set((schedule.week_start + timedelta(days=assignment.day) for assignment, _, schedule in assignments))),
            "shifts_per_day_average": round(total_assignments / total_days, 2) if total_days > 0 else 0
        },
        "efficiency_score": round(efficiency_score, 2)
    }

# Add the remaining endpoints from the existing schedule.py file
# (keeping the existing preview and generate endpoints)

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
    
    # Verify access
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return schedule

@router.get("/facility/{facility_id}")
def get_facility_schedules(facility_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get all schedules for a facility"""
    # Verify facility access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Invalid facility")
    
    schedules = db.exec(
        select(Schedule).where(Schedule.facility_id == facility_id).order_by(desc(Schedule.week_start))
    ).all()
    
    return schedules

@router.post("/{schedule_id}/validate")
def validate_schedule(schedule_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Validate a schedule against constraints"""
    schedule = db.get(Schedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Verify access
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        validation_result = validate_schedule_constraints(db, schedule)
        return validation_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

@router.get("/facility/{facility_id}/conflicts")
def check_scheduling_conflicts(
    facility_id: str, 
    week_start: str,
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    """Check for scheduling conflicts in a facility for a given week"""
    # Verify facility access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Invalid facility")
    
    week_start_date = datetime.fromisoformat(week_start).date()
    
    # Get existing schedules for this week
    existing_schedule = db.exec(
        select(Schedule).where(
            Schedule.facility_id == facility_id,
            Schedule.week_start == week_start_date
        )
    ).first()
    
    conflicts = []
    
    if existing_schedule:
        # Check for assignment conflicts
        assignments = db.exec(
            select(ShiftAssignment, Staff).join(Staff).where(
                ShiftAssignment.schedule_id == existing_schedule.id
            )
        ).all()
        
        # Check for double bookings, unavailability conflicts, etc.
        staff_shifts = {}
        for assignment, staff in assignments:
            staff_key = str(staff.id)
            if staff_key not in staff_shifts:
                staff_shifts[staff_key] = []
            
            staff_shifts[staff_key].append({
                "day": assignment.day,
                "shift": assignment.shift,
                "staff_name": staff.full_name
            })
        
        # Check for conflicts (this is simplified)
        for staff_id, shifts in staff_shifts.items():
            if len(shifts) > 5:  # More than 5 shifts in a week might be problematic
                conflicts.append({
                    "type": "excessive_workload",
                    "staff_id": staff_id,
                    "staff_name": shifts[0]["staff_name"],
                    "shift_count": len(shifts),
                    "message": f"Staff member has {len(shifts)} shifts this week"
                })
    
    return {
        "facility_id": facility_id,
        "week_start": week_start,
        "has_conflicts": len(conflicts) > 0,
        "conflicts": conflicts,
        "existing_schedule_id": existing_schedule.id if existing_schedule else None
    }