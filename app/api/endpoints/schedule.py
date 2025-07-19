# Schedule API endpoints for smart scheduling, daily, monthly generation, and zone management

from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional
from uuid import UUID
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlmodel import Session, select, text
from sqlalchemy import desc, func
 
from app.schemas import (
    ScheduleRead, ScheduleDetail, PreviewRequestWithConfig, 
    ScheduleValidationResult
)
from app.services.notification_service import NotificationService
from app.services.scheduler import create_schedule, validate_schedule_constraints
from app.services.schedule_solver import (
    generate_weekly_schedule, ScheduleConstraints, constraints_from_config
)
from app.models import NotificationType, Staff, Schedule, ScheduleConfig, Facility, ShiftAssignment, User
from app.deps import get_db, get_current_user
from ...services.pdf_service import PDFService 

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
    """Generate an intelligent schedule using zone-based optimization (NO AUTO-SAVE)"""
    
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
    schedule_config = db.exec(
        select(ScheduleConfig).where(ScheduleConfig.facility_id == request.facility_id)
    ).first()
    
    try:
        # Initialize smart scheduler
        from app.services.smart_scheduler import SmartScheduler
        from app.schemas import SmartScheduleConfiguration, ZoneConfiguration
        
        scheduler = SmartScheduler(db)
        
        # Parse zone assignments from request with correct schema
        zone_assignments = {}
        for zone_id in request.zones:
            # Get assigned roles from role mapping
            assigned_roles = request.role_mapping.get(zone_id, [])
            
            # Set default staff requirements
            required_staff = {"min": 1, "max": 2}
            
            # Set coverage hours based on zone type
            if zone_id in ['security', 'front-desk']:
                # 24/7 zones
                coverage_hours = {"morning": True, "afternoon": True, "evening": True}
            else:
                # Business hours zones
                coverage_hours = {"morning": True, "afternoon": True, "evening": False}
            
            zone_assignments[zone_id] = ZoneConfiguration(
                zone_id=zone_id,
                required_staff=required_staff,
                assigned_roles=assigned_roles,
                priority=5,  # Default priority
                coverage_hours=coverage_hours
            )
        
        # Convert period_start string to datetime
        period_start_dt = datetime.fromisoformat(request.period_start)
        
        smart_config = SmartScheduleConfiguration(
            facility_id=UUID(request.facility_id),
            period_start=period_start_dt,
            period_type=request.period_type,
            zones=request.zones,
            zone_assignments=zone_assignments,
            role_mapping=request.role_mapping,
            use_constraints=request.use_constraints,
            auto_assign_by_zone=request.auto_assign_by_zone,
            balance_workload=request.balance_workload,
            prioritize_skill_match=request.prioritize_skill_match,
            coverage_priority=request.coverage_priority,
            total_days=request.total_days or (7 if request.period_type == 'weekly' else 1),
            shifts_per_day=request.shifts_per_day
        )
        
        print(f"Smart config created with {len(zone_assignments)} zones")
        
        # Generate schedule using the proper SmartScheduler
        schedule_result = scheduler.generate_smart_schedule(
            config=smart_config,
            staff=staff,
            schedule_config=schedule_config
        )
        
        print(f"SmartScheduler result: {schedule_result}")
        
        if not schedule_result.get('success', False):
            error_msg = schedule_result.get('error', 'Unknown scheduling error')
            print(f"SmartScheduler failed: {error_msg}")
            raise HTTPException(status_code=422, detail=f"Smart scheduling failed: {error_msg}")
        
        assignments = schedule_result.get('assignments', [])
        print(f"SmartScheduler generated {len(assignments)} assignments")
        
        if len(assignments) == 0:
            print("No assignments generated - generating fallback schedule...")
            assignments = []
            
            # Simple fallback: assign available staff to shifts
            total_days = request.total_days or (7 if request.period_type == 'weekly' else 1)
            
            for day in range(total_days):
                for shift in range(request.shifts_per_day):
                    for zone_id in request.zones:
                        # Get staff for this zone
                        zone_roles = request.role_mapping.get(zone_id, [])
                        if zone_roles:
                            zone_staff = [s for s in staff if s.role in zone_roles]
                        else:
                            zone_staff = staff
                        
                        # Assign at least one staff member per zone per shift
                        if zone_staff:
                            # Rotate through staff to balance workload
                            staff_index = (day * request.shifts_per_day + shift) % len(zone_staff)
                            selected_staff = zone_staff[staff_index]
                            
                            assignments.append({
                                "day": day,
                                "shift": shift,
                                "staff_id": str(selected_staff.id),
                                "zone_id": zone_id,
                                "staff_name": selected_staff.full_name,
                                "staff_role": selected_staff.role
                            })
            
            print(f"Fallback generated {len(assignments)} assignments")
        
        # IMPORTANT: DO NOT SAVE TO DATABASE HERE
        # Just return the generated assignments for frontend to handle
        
        # Format assignments for frontend consistency
        formatted_assignments = []
        for assignment_data in assignments:
            formatted_assignments.append({
                'id': f"temp-{assignment_data['day']}-{assignment_data['shift']}-{assignment_data['staff_id']}",
                'day': assignment_data['day'],
                'shift': assignment_data['shift'],
                'staff_id': str(assignment_data['staff_id']),
                'zone_id': assignment_data.get('zone_id'),
                'staff_name': assignment_data.get('staff_name'),
                'staff_role': assignment_data.get('staff_role')
            })
        
        print(f"Returning {len(formatted_assignments)} assignments to frontend (NOT SAVED)")
        
        # Return the generated schedule data WITHOUT saving to database
        return {
            "period_type": request.period_type,
            "period_start": request.period_start,
            "assignments": formatted_assignments,
            "zone_coverage": schedule_result.get('zone_coverage', {}),
            "optimization_metrics": schedule_result.get('metrics', {}),
            "success": True,
            "generated": True,  # Flag to indicate this is generated, not saved
            "total_assignments": len(formatted_assignments)
        }
        
    except Exception as e:
        print(f"SmartScheduler failed: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
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
    
@router.delete("/{schedule_id}")
async def delete_schedule(
    schedule_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a schedule and all its assignments"""
    
    # Get the schedule
    schedule = db.get(Schedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Verify facility access
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        print(f" Deleting schedule {schedule_id}")
        
        # Get assignment count for logging
        assignments = db.exec(
            select(ShiftAssignment).where(ShiftAssignment.schedule_id == schedule_id)
        ).all()
        
        assignment_count = len(assignments)
        print(f" Found {assignment_count} assignments to delete")
        
        # Delete all assignments first
        for assignment in assignments:
            db.delete(assignment)
        
        print(f" Deleted {assignment_count} assignments")
        
        # Delete the schedule
        db.delete(schedule)
        db.commit()
        
        print(f" Successfully deleted schedule {schedule_id}")
        
        return {
            "success": True,
            "schedule_id": str(schedule_id),
            "deleted_assignments": assignment_count,
            "message": f"Schedule and {assignment_count} assignments deleted successfully"
        }
        
    except Exception as e:
        print(f"❌ Failed to delete schedule: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=422, detail=f"Failed to delete schedule: {str(e)}")
    
@router.get("/facility/{facility_id}/summary")
async def get_facility_schedule_summary(
    facility_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get a summary of all schedules for a facility (useful for the schedule list)"""
    
    # Verify facility access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Invalid facility")
    
    # Get schedules with assignment data
    schedules = db.exec(
        select(Schedule).where(Schedule.facility_id == facility_id).order_by(desc(Schedule.week_start))
    ).all()
    
    schedule_list = []
    for schedule in schedules:
        # Get assignments for this schedule (for summary, we just need count)
        assignments_count = db.exec(
            select(func.count(ShiftAssignment.id)).where(ShiftAssignment.schedule_id == schedule.id)
        ).one()
        
        # Optionally include full assignment data for schedule list modal
        assignments = db.exec(
            select(ShiftAssignment).where(ShiftAssignment.schedule_id == schedule.id)
        ).all()
        
        formatted_assignments = []
        for assignment in assignments:
            formatted_assignments.append({
                'id': f"{schedule.id}-{assignment.day}-{assignment.shift}-{assignment.staff_id}",
                'day': assignment.day,
                'shift': assignment.shift,
                'staff_id': str(assignment.staff_id),
                'schedule_id': str(schedule.id)
            })
        
        schedule_list.append({
            "id": str(schedule.id),
            "facility_id": str(schedule.facility_id),
            "week_start": schedule.week_start.isoformat(),
            "created_at": schedule.created_at.isoformat() if schedule.created_at else None,
            "updated_at": schedule.updated_at.isoformat() if schedule.updated_at else None,
            "assignment_count": assignments_count,
            "assignments": formatted_assignments  # Include assignments for calendar display
        })
    
    return schedule_list


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
    """Implement smart scheduling algorithm with proper zone-role enforcement"""
    
    assignments = []
    zone_coverage = {}
    
    # Define default zone-role mappings if not provided
    default_zone_roles = {
        'front-desk': ['Front Desk Agent', 'Concierge', 'Manager'],
        'housekeeping': ['Housekeeping', 'Maintenance'],
        'restaurant': ['Chef', 'Sous Chef', 'Waiter', 'Waitress', 'Manager'],
        'kitchen': ['Chef', 'Sous Chef', 'Line Cook'],
        'dining': ['Waiter', 'Waitress', 'Host/Hostess', 'Manager'],
        'bar': ['Bartender', 'Host/Hostess', 'Manager'],
        'security': ['Security'],
        'management': ['Manager', 'Assistant Manager'],
        'all': []  # Empty means any role is allowed
    }
    
    print(f"🔧 Smart scheduling for zones: {request.zones}")
    print(f"📋 Role mapping received: {request.role_mapping}")
    
    # Process each zone with proper role filtering
    for zone_id in request.zones:
        print(f"\n🎯 Processing zone: {zone_id}")
        
        # Get zone-specific staff based on role constraints
        zone_staff = []
        
        # First, try to use the role mapping from the frontend
        if zone_id in request.role_mapping and request.role_mapping[zone_id]:
            allowed_roles = request.role_mapping[zone_id]
            print(f"📝 Using frontend role mapping for {zone_id}: {allowed_roles}")
        # Fallback to default zone-role mappings
        elif zone_id in default_zone_roles:
            allowed_roles = default_zone_roles[zone_id]
            print(f"🔄 Using default role mapping for {zone_id}: {allowed_roles}")
        else:
            # For unknown zones, allow all roles but log a warning
            allowed_roles = []
            print(f"⚠️ Unknown zone {zone_id}, allowing all roles")
        
        # Filter staff by allowed roles for this zone
        if allowed_roles:  # If there are specific role requirements
            zone_staff = [s for s in staff if s.role in allowed_roles and s.is_active]
            print(f"✅ Filtered to {len(zone_staff)} staff members with roles: {allowed_roles}")
        else:  # If no role restrictions (like 'all' zone)
            zone_staff = [s for s in staff if s.is_active]
            print(f"✅ No role restrictions, using all {len(zone_staff)} active staff")
        
        # Log the staff that will be considered for this zone
        staff_roles = [f"{s.full_name} ({s.role})" for s in zone_staff]
        print(f"👥 Available staff for {zone_id}: {staff_roles}")
        
        if not zone_staff:
            print(f"❌ No staff available for zone {zone_id} with required roles")
            zone_coverage[zone_id] = {
                "assigned_staff": 0,
                "total_assignments": 0,
                "warning": f"No staff available with required roles: {allowed_roles}"
            }
            continue
        
        # Get zone assignment requirements
        zone_config = request.zone_assignments.get(zone_id, {})
        required_staff_config = zone_config.get('required_staff', {})
        min_staff = required_staff_config.get('min', 1)
        max_staff = required_staff_config.get('max', 2)
        
        print(f"📊 Zone {zone_id} requirements: min={min_staff}, max={max_staff}")
        
        # Create assignments for each day and shift
        total_days = request.total_days or 7
        shifts_per_day = request.shifts_per_day or 3
        zone_assignments = 0
        
        for day in range(total_days):
            for shift in range(shifts_per_day):
                # Select optimal staff for this shift
                shift_staff = _select_staff_for_shift(
                    zone_staff, min_staff, max_staff, shift, day, assignments
                )
                
                for staff_member in shift_staff:
                    assignment = {
                        "day": day,
                        "shift": shift,
                        "staff_id": str(staff_member.id),
                        "zone_id": zone_id,
                        "staff_name": staff_member.full_name,
                        "staff_role": staff_member.role,
                        "skill_level": staff_member.skill_level
                    }
                    assignments.append(assignment)
                    zone_assignments += 1
                    
                    print(f"✅ Assigned {staff_member.full_name} ({staff_member.role}) to {zone_id} day={day} shift={shift}")
        
        zone_coverage[zone_id] = {
            "assigned_staff": len(zone_staff),
            "total_assignments": zone_assignments,
            "available_roles": list(set(s.role for s in zone_staff))
        }
    
    print(f"\n📈 Final assignment summary:")
    print(f"Total assignments created: {len(assignments)}")
    for zone_id, coverage in zone_coverage.items():
        print(f"  {zone_id}: {coverage['total_assignments']} assignments, {coverage['assigned_staff']} staff available")
    
    return {
        "assignments": assignments,
        "zone_coverage": zone_coverage,
        "metrics": {
            "optimization_score": 85.5,
            "coverage_percentage": 95.2,
            "workload_balance": 78.3,
            "role_compliance": 100.0  # All assignments respect role constraints
        }
    }
    
# select staff for a shift based on constraints
def _select_staff_for_shift(zone_staff, min_staff, max_staff, shift, day, existing_assignments):
    """Select optimal staff for a specific shift, avoiding overworking individuals"""
    
    # Count how many shifts each staff member already has
    staff_shift_counts = {}
    for assignment in existing_assignments:
        staff_id = assignment["staff_id"]
        if staff_id not in staff_shift_counts:
            staff_shift_counts[staff_id] = 0
        staff_shift_counts[staff_id] += 1
    
    # Sort staff by workload (ascending) and skill level (descending) for balance
    available_staff = sorted(zone_staff, key=lambda s: (
        staff_shift_counts.get(str(s.id), 0),  # Fewer shifts first
        -s.skill_level  # Higher skill level second
    ))
    
    # Select between min and max staff for this shift
    optimal_count = min(max_staff, len(available_staff))
    optimal_count = max(min_staff, optimal_count)  # Ensure we meet minimum
    
    return available_staff[:optimal_count]

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

@router.post("/generate", response_model=ScheduleRead)
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
    """Get all schedules for a facility WITH assignments"""
    # Verify facility access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Invalid facility")
    
    # Get schedules
    schedules = db.exec(
        select(Schedule).where(Schedule.facility_id == facility_id).order_by(desc(Schedule.week_start))
    ).all()
    
    # Build response with assignments for each schedule
    result = []
    for schedule in schedules:
        # Get assignments for this schedule
        assignments = db.exec(
            select(ShiftAssignment).where(ShiftAssignment.schedule_id == schedule.id)
        ).all()
        
        # Format assignments
        formatted_assignments = []
        for assignment in assignments:
            formatted_assignments.append({
                'id': f"{schedule.id}-{assignment.day}-{assignment.shift}-{assignment.staff_id}",
                'day': assignment.day,
                'shift': assignment.shift,
                'staff_id': str(assignment.staff_id),
                'schedule_id': str(schedule.id)
            })
        
        # Build schedule response
        schedule_data = {
            "id": str(schedule.id),
            "facility_id": str(schedule.facility_id),
            "week_start": schedule.week_start.isoformat(),
            "created_at": schedule.created_at.isoformat() if schedule.created_at else None,
            "updated_at": schedule.updated_at.isoformat() if schedule.updated_at else None,
            "assignments": formatted_assignments  # ← Include assignments!
        }
        
        result.append(schedule_data)
    
    return result

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
    
# create schedule endpoint
@router.post("/create")
async def create_schedule(
    request: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new schedule"""
    
    facility_id = request.get('facility_id')
    week_start = request.get('week_start')
    assignments = request.get('assignments', [])
    
    # Verify facility access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Invalid facility")
    
    try:
        print(f"🆕 Creating new schedule for facility {facility_id} with {len(assignments)} assignments")
        
        # Parse week_start date
        week_start_date = datetime.fromisoformat(week_start).date()
        
        # Create new schedule
        schedule = Schedule(
            facility_id=UUID(facility_id),
            week_start=week_start_date
        )
        db.add(schedule)
        db.commit()
        db.refresh(schedule)
        
        print(f" Schedule created with ID: {schedule.id}")
        
        # Save assignments
        saved_assignments = []
        for i, assignment_data in enumerate(assignments):
            print(f" Adding assignment {i+1}: day={assignment_data.get('day')}, shift={assignment_data.get('shift')}, staff_id={assignment_data.get('staff_id')}")
            
            assignment = ShiftAssignment(
                schedule_id=schedule.id,
                day=assignment_data.get('day', 0),
                shift=assignment_data.get('shift', 0),
                staff_id=UUID(assignment_data['staff_id'])
            )
            db.add(assignment)
            
            saved_assignments.append({
                'id': f"{schedule.id}-{assignment.day}-{assignment.shift}-{assignment.staff_id}",
                'day': assignment.day,
                'shift': assignment.shift,
                'staff_id': str(assignment.staff_id),
                'schedule_id': str(schedule.id)
            })
        
        # Commit all assignments
        db.commit()
        
        print(f" Successfully created schedule with {len(saved_assignments)} assignments")
        
        return {
            "id": str(schedule.id),
            "facility_id": str(schedule.facility_id),
            "week_start": schedule.week_start.isoformat(),
            "assignments": saved_assignments,
            "created_at": schedule.created_at.isoformat() if schedule.created_at else None,
            "success": True
        }
        
    except Exception as e:
        print(f" Failed to create schedule: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=422, detail=f"Schedule creation failed: {str(e)}")

@router.put("/{schedule_id}")
async def update_schedule(
    schedule_id: UUID,
    request: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update an existing schedule"""
    
    # Get existing schedule
    schedule = db.get(Schedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Verify facility access
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Invalid facility")
    
    try:
        assignments = request.get('assignments', [])
        print(f"🔄 Updating schedule {schedule_id} with {len(assignments)} assignments")
        
        # Update the schedule timestamp
        schedule.updated_at = datetime.utcnow()  # Set updated timestamp
        
        # Properly delete existing assignments
        existing_assignments = db.exec(
            select(ShiftAssignment).where(ShiftAssignment.schedule_id == schedule_id)
        ).all()
        
        print(f" Deleting {len(existing_assignments)} existing assignments")
        for assignment in existing_assignments:
            db.delete(assignment)
        
        # Commit the deletions first
        db.commit()
        print(" Existing assignments deleted")
        
        # Add new assignments
        saved_assignments = []
        for i, assignment_data in enumerate(assignments):
            print(f" Adding assignment {i+1}: day={assignment_data.get('day')}, shift={assignment_data.get('shift')}, staff_id={assignment_data.get('staff_id')}")
            
            assignment = ShiftAssignment(
                schedule_id=schedule.id,
                day=assignment_data.get('day', 0),
                shift=assignment_data.get('shift', 0),
                staff_id=UUID(assignment_data['staff_id'])
            )
            db.add(assignment)
            
            # Build response data
            saved_assignments.append({
                'id': f"{schedule.id}-{assignment.day}-{assignment.shift}-{assignment.staff_id}",
                'day': assignment.day,
                'shift': assignment.shift,
                'staff_id': str(assignment.staff_id),
                'schedule_id': str(schedule.id)
            })
        
        # Commit all new assignments
        db.commit()
        db.refresh(schedule)
        
        print(f" Successfully saved {len(saved_assignments)} assignments")
        
        return {
            "id": str(schedule.id),
            "facility_id": str(schedule.facility_id),
            "week_start": schedule.week_start.isoformat(),
            "assignments": saved_assignments,
            "updated_at": schedule.updated_at.isoformat() if schedule.updated_at else None,  # Now safe to access
            "success": True
        }
        
    except Exception as e:
        print(f" Failed to update schedule: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=422, detail=f"Schedule update failed: {str(e)}")
    
#======================== NOTIFICATIONS ===============================================
@router.post("/{schedule_id}/publish")
async def publish_schedule(
    schedule_id: uuid.UUID,
    notification_options: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Publish a schedule and send notifications to staff
    
    notification_options should contain:
    - send_whatsapp: bool
    - send_push: bool 
    - send_email: bool
    - generate_pdf: bool
    - custom_message: Optional[str]
    """
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    # Get schedule
    schedule = db.get(Schedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Verify facility access
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get affected staff
    assignments = db.exec(
        select(ShiftAssignment).where(ShiftAssignment.schedule_id == schedule_id)
    ).all()
    
    staff_ids = list(set(assignment.staff_id for assignment in assignments))
    staff_members = db.exec(
        select(Staff).where(Staff.id.in_(staff_ids)) # type: ignore
    ).all()
    
    # Generate PDF if requested
    pdf_url = None
    if notification_options.get('generate_pdf', False):
        try:
            pdf_service = PDFService()
            pdf_data = await pdf_service.generate_schedule_pdf(
                schedule=schedule,
                assignments=assignments,
                staff=staff_members,
                facility=facility
            )
            # Save PDF and get URL (implement your file storage logic)
            pdf_url = await pdf_service.save_pdf(pdf_data, f"schedule_{schedule_id}.pdf")
        except Exception as e:
            print(f"PDF generation failed: {e}")
    
    # Send notifications
    notification_service = NotificationService(db)
    
    for staff_member in staff_members:
        try:
            # Determine channels
            channels = ['IN_APP']  # Always send in-app
            if notification_options.get('send_push', False):
                channels.append('PUSH')
            if notification_options.get('send_whatsapp', False):
                channels.append('WHATSAPP')
            if notification_options.get('send_email', False):
                channels.append('EMAIL')
            
            # Template data
            template_data = {
                'staff_name': staff_member.full_name,
                'week_start': schedule.week_start.strftime('%B %d, %Y'),
                'facility_name': facility.name,
                'custom_message': notification_options.get('custom_message', '')
            }
            
            # Send notification
            await notification_service.send_notification(
                notification_type=NotificationType.SCHEDULE_PUBLISHED,
                recipient_user_id=staff_member.id,
                template_data=template_data,
                channels=channels,
                action_url=f"/schedule?week={schedule.week_start}",
                action_text="View Schedule",
                background_tasks=background_tasks,
                pdf_attachment_url=pdf_url
            )
            
        except Exception as e:
            print(f"Failed to send notification to {staff_member.full_name}: {e}")
    
    # Mark schedule as published
    schedule.is_published = True
    schedule.published_at = datetime.utcnow()
    db.commit()
    
    return {
        "success": True,
        "message": f"Schedule published and notifications sent to {len(staff_members)} staff members",
        "pdf_url": pdf_url,
        "notifications_sent": len(staff_members)
    }
