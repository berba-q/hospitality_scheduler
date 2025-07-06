from datetime import date
from typing import List, Sequence
from sqlmodel import Session, select

from .schedule_solver import generate_weekly_schedule, constraints_from_config
from ..models import (
    Schedule,
    ShiftAssignment,
    Staff,
    StaffUnavailability,
    ScheduleConfig,
)


def create_schedule(
    db: Session,
    facility_id: str,
    week_start: date,
    *,
    days: int = 7,
    shifts_per_day: int = 3,
    hours_per_shift: int = 8,
    use_constraints: bool = True,
) -> Schedule:
    """Create a schedule with configurable constraints"""
    
    # 1 Load active staff
    staff: Sequence[Staff] = db.exec(
        select(Staff).where(
            Staff.facility_id == facility_id,
            Staff.is_active.is_(True),
        )
    ).all()
    if not staff:
        raise ValueError("No staff found for that facility")

    # 2 Load scheduling configuration (if it exists)
    config = None
    if use_constraints:
        config = db.exec(
            select(ScheduleConfig).where(ScheduleConfig.facility_id == facility_id)
        ).first()

    # 3 Gather away periods inside the target week
    staff_ids = [s.id for s in staff]
    away_rows: Sequence[StaffUnavailability] = []
    if staff_ids:
        away_rows = db.exec(
            select(StaffUnavailability)
            .where(StaffUnavailability.staff_id.in_(staff_ids))
        ).all()

    away_tuples = []
    for ua in away_rows:
        day_idx = (ua.start.date() - week_start).days
        if 0 <= day_idx < days:
            # Simple mapping: determine shift based on hour
            shift_idx = 0  # Morning
            if ua.start.hour >= 14:  # 2 PM
                shift_idx = 1  # Afternoon
            if ua.start.hour >= 22:  # 10 PM
                shift_idx = 2  # Evening
            away_tuples.append((ua.staff_id, day_idx, shift_idx))

    # 4 Create constraints from config
    constraints = constraints_from_config(config)

    # 5 Solve with constraints
    try:
        roster = generate_weekly_schedule(
            staff,
            unavailability=away_tuples,
            constraints=constraints,
            days=days,
            shifts_per_day=shifts_per_day,
            hours_per_shift=hours_per_shift,
        )
    except RuntimeError as e:
        # If constrained scheduling fails, try with relaxed constraints
        if use_constraints and config:
            # Fallback to basic scheduling
            from .schedule_solver import generate_weekly_schedule as basic_schedule
            roster = basic_schedule(
                staff,
                unavailability=away_tuples,
                days=days,
                shifts_per_day=shifts_per_day,
                hours_per_shift=hours_per_shift,
            )
        else:
            raise e

    # 6 Persist
    sched = Schedule(facility_id=facility_id, week_start=week_start)
    db.add(sched)
    db.flush()  # get sched.id without second commit

    assignments = [
        ShiftAssignment(
            schedule_id=sched.id,
            day=r["day"],
            shift=r["shift"],
            staff_id=r["staff_id"],
        )
        for r in roster
    ]
    db.add_all(assignments)
    db.commit()
    db.refresh(sched)
    return sched

def validate_schedule_constraints(
    db: Session,
    facility_id: str,
    roster: List[dict],
    hours_per_shift: int = 8
) -> dict:
    """Validate a schedule against facility constraints"""
    
    # Load config
    config = db.exec(
        select(ScheduleConfig).where(ScheduleConfig.facility_id == facility_id)
    ).first()
    
    if not config:
        return {"is_valid": True, "issues": [], "warnings": ["No constraints configured"]}
    
    # Load staff
    staff_dict = {}
    staff_list = db.exec(
        select(Staff).where(Staff.facility_id == facility_id)
    ).all()
    
    for s in staff_list:
        staff_dict[str(s.id)] = s
    
    issues = []
    warnings = []
    staff_hours = {}
    
    # Check each assignment
    for assignment in roster:
        staff_id = str(assignment["staff_id"])
        day = assignment["day"]
        shift = assignment["shift"]
        
        if staff_id not in staff_dict:
            issues.append(f"Staff {staff_id} not found")
            continue
            
        staff = staff_dict[staff_id]
        
        # Track hours
        staff_hours[staff_id] = staff_hours.get(staff_id, 0) + hours_per_shift
        
        # Check weekly hours
        max_hours = staff.weekly_hours_max or config.max_weekly_hours
        if staff_hours[staff_id] > max_hours:
            if config.allow_overtime:
                warnings.append(f"{staff.full_name} scheduled for {staff_hours[staff_id]}h (overtime)")
            else:
                issues.append(f"{staff.full_name} exceeds weekly hours: {staff_hours[staff_id]}h > {max_hours}h")
        
        # Check shift requirements
        shift_key = str(shift)
        if shift_key in config.shift_role_requirements:
            req = config.shift_role_requirements[shift_key]
            
            if "required_roles" in req and req["required_roles"]:
                if staff.role not in req["required_roles"]:
                    issues.append(f"Day {day}, Shift {shift}: {staff.full_name} role '{staff.role}' not in required roles {req['required_roles']}")
            
            if "min_skill_level" in req:
                if (staff.skill_level or 1) < req["min_skill_level"]:
                    issues.append(f"Day {day}, Shift {shift}: {staff.full_name} skill level {staff.skill_level} < required {req['min_skill_level']}")
    
    return {
        "is_valid": len(issues) == 0,
        "issues": issues,
        "warnings": warnings,
        "staff_hours": staff_hours,
        "constraint_violations": issues
    }