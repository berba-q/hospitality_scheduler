from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select, func
from typing import List, Optional
from datetime import datetime, timedelta, date
from uuid import UUID

from ...deps import get_db, get_current_user
from ...models import Staff, Facility, Schedule, ShiftAssignment, SwapRequest
from ...schemas import StaffCreate, StaffDuplicateCheck, StaffRead, StaffUpdate

router = APIRouter(prefix="/staff", tags=["staff"])


@router.post("/", response_model=StaffRead, status_code=201)
def create_staff(
    staff_in: StaffCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    facility = db.get(Facility, staff_in.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid facility")
    staff = Staff(**staff_in.dict())
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff


@router.get("/", response_model=list[StaffRead])
def list_staff(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    statement = (
        select(Staff)
        .join(Facility)
        .where(Facility.tenant_id == current_user.tenant_id)
    )
    #staff_list = db.exec(statement).all()
    return db.exec(statement).all()

@router.put("/{staff_id}", response_model=StaffRead)
def update_staff(
    staff_id: str,
    staff_update: StaffUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Update a staff member"""
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    staff = db.get(Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    # Verify staff belongs to user's tenant
    facility = db.get(Facility, staff.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update staff fields
    update_data = staff_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(staff, field, value)
    
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff

# This endpoint allows deletion of a staff member by ID
@router.delete("/{staff_id}", status_code=204)
def delete_staff(
    staff_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Delete a staff member"""
    if not current_user.is_manager:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager access required")
    
    # Convert string ID to UUID
    try:
        import uuid
        staff_uuid = uuid.UUID(staff_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid staff ID format")
    
    staff = db.get(Staff, staff_uuid)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    # Verify staff belongs to user's tenant
    facility = db.get(Facility, staff.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        db.delete(staff)
        db.commit()
        return  # Return nothing for 204 status
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete staff member: {str(e)}")

@router.post("/check-duplicate")
def check_staff_duplicate(
    check_data: StaffDuplicateCheck,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Check if staff member already exists"""
    existing = db.exec(
        select(Staff).where(
            Staff.full_name.ilike(f"%{check_data.full_name}%"),
            Staff.facility_id == check_data.facility_id,
            Staff.is_active == True
        )
    ).first()
    
    return {"exists": existing is not None}

#================== STAFF PROFILING ===============================================
@router.get("/me", response_model=StaffRead)
def get_my_staff_profile(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get current user's staff profile"""
    if current_user.is_manager:
        raise HTTPException(status_code=403, detail="This endpoint is for staff only")
    
    # Find staff record by email match
    staff = db.exec(
        select(Staff).join(Facility).where(
            Staff.email == current_user.email,
            Facility.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff profile not found")
    
    return staff

@router.get("/me/schedule")
def get_my_schedule(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get current staff member's schedule for a date range"""
    if current_user.is_manager:
        raise HTTPException(status_code=403, detail="This endpoint is for staff only")
    
    # Find staff record
    staff = db.exec(
        select(Staff).join(Facility).where(
            Staff.email == current_user.email,
            Facility.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff profile not found")
    
    start = datetime.fromisoformat(start_date).date()
    end = datetime.fromisoformat(end_date).date()
    
    # Get all schedules for this facility in date range
    schedules = db.exec(
        select(Schedule).where(
            Schedule.facility_id == staff.facility_id,
            Schedule.week_start >= start - timedelta(days=7),  # Include overlapping weeks
            Schedule.week_start <= end
        )
    ).all()
    
    my_assignments = []
    for schedule in schedules:
        assignments = db.exec(
            select(ShiftAssignment).where(
                ShiftAssignment.schedule_id == schedule.id,
                ShiftAssignment.staff_id == staff.id
            )
        ).all()
        
        for assignment in assignments:
            assignment_date = schedule.week_start + timedelta(days=assignment.day)
            
            # Only include assignments in requested date range
            if start <= assignment_date <= end:
                my_assignments.append({
                    "date": assignment_date.isoformat(),
                    "day_of_week": assignment.day,
                    "shift": assignment.shift,
                    "schedule_id": str(schedule.id),
                    "assignment_id": str(assignment.id)
                })
    
    return {
        "staff_id": str(staff.id),
        "staff_name": staff.full_name,
        "facility_id": str(staff.facility_id),
        "assignments": my_assignments
    }


@router.get("/me/dashboard-stats")
def get_my_dashboard_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get enhanced dashboard statistics for current staff member"""
    if current_user.is_manager:
        raise HTTPException(status_code=403, detail="This endpoint is for staff only")
    
    # Find staff record
    staff = db.exec(
        select(Staff).join(Facility).where(
            Staff.email == current_user.email,
            Facility.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff profile not found")
    
    # Get current week boundaries
    today = date.today()
    days_since_monday = today.weekday()
    week_start = today - timedelta(days=days_since_monday)
    week_end = week_start + timedelta(days=6)
    
    # Get next week
    next_week_start = week_start + timedelta(days=7)
    next_week_end = next_week_start + timedelta(days=6)
    
    # Get schedules for current and next week
    schedules = db.exec(
        select(Schedule).where(
            Schedule.facility_id == staff.facility_id,
            Schedule.week_start.in_([week_start, next_week_start])
        )
    ).all()
    
    # Count assignments and calculate hours
    current_week_hours = 0
    next_week_hours = 0
    upcoming_shifts = []
    
    for schedule in schedules:
        assignments = db.exec(
            select(ShiftAssignment).where(
                ShiftAssignment.schedule_id == schedule.id,
                ShiftAssignment.staff_id == staff.id
            )
        ).all()
        
        for assignment in assignments:
            assignment_date = schedule.week_start + timedelta(days=assignment.day)
            
            # Estimate 8 hours per shift (could be made configurable)
            shift_hours = 8
            
            if week_start <= assignment_date <= week_end:
                current_week_hours += shift_hours
            elif next_week_start <= assignment_date <= next_week_end:
                next_week_hours += shift_hours
            
            # Add to upcoming shifts if within next 7 days
            if assignment_date >= today and assignment_date <= (today + timedelta(days=7)):
                shift_names = ["Morning", "Afternoon", "Evening"]
                shift_times = ["6:00 AM - 2:00 PM", "2:00 PM - 10:00 PM", "10:00 PM - 6:00 AM"]
                day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
                
                upcoming_shifts.append({
                    "day": assignment.day,
                    "shift": assignment.shift,
                    "date": assignment_date.strftime("%Y-%m-%d"),
                    "day_name": day_names[assignment.day] if assignment.day < 7 else "Unknown",
                    "shift_name": shift_names[assignment.shift] if assignment.shift < 3 else "Unknown",
                    "shift_time": shift_times[assignment.shift] if assignment.shift < 3 else "Unknown",
                    "is_today": assignment_date == today,
                    "is_tomorrow": assignment_date == (today + timedelta(days=1)),
                    "assignment_id": str(assignment.id),
                    "schedule_id": str(schedule.id)
                })
    
    # Sort upcoming shifts by date
    upcoming_shifts.sort(key=lambda x: x["date"])
    
    # Get pending swap requests
    pending_swaps = db.exec(
        select(SwapRequest).where(
            SwapRequest.requesting_staff_id == staff.id,
            SwapRequest.status == "pending"
        )
    ).all()
    
    # Get recent swap activity for gamification stats
    recent_date = datetime.utcnow() - timedelta(days=30)
    
    # Requests where I was the target
    requests_for_me = db.exec(
        select(SwapRequest).where(
            SwapRequest.target_staff_id == staff.id,
            SwapRequest.created_at >= recent_date
        )
    ).all()
    
    # Requests where I helped others (auto-assigned)
    helped_others = db.exec(
        select(SwapRequest).where(
            SwapRequest.assigned_staff_id == staff.id,
            SwapRequest.created_at >= recent_date,
            SwapRequest.status.in_(["executed", "assigned"])
        )
    ).all()
    
    # Calculate acceptance rate
    total_requests_for_me = len(requests_for_me)
    accepted_requests = len([r for r in requests_for_me if r.target_staff_accepted == True])
    acceptance_rate = (accepted_requests / total_requests_for_me * 100) if total_requests_for_me > 0 else 0
    
    # Calculate helpfulness score
    total_auto_requests = db.exec(
        select(func.count(SwapRequest.id)).where(
            SwapRequest.swap_type == "auto",
            SwapRequest.created_at >= recent_date
        )
    ).one()
    
    helpfulness_score = (len(helped_others) / total_auto_requests * 100) if total_auto_requests > 0 else 0
    
    # Calculate current streak
    recent_requests = sorted(requests_for_me, key=lambda x: x.created_at, reverse=True)[:10]
    current_streak = 0
    for request in recent_requests:
        if request.target_staff_accepted == True:
            current_streak += 1
        elif request.target_staff_accepted == False:
            break
    
    # Calculate average response time
    responded_requests = [r for r in requests_for_me if r.target_staff_accepted is not None and r.updated_at]
    avg_response_time = "N/A"
    
    if responded_requests:
        total_response_time = sum([
            (r.updated_at - r.created_at).total_seconds() / 3600 
            for r in responded_requests
        ])
        avg_hours = total_response_time / len(responded_requests)
        
        if avg_hours < 1:
            avg_response_time = f"{int(avg_hours * 60)} minutes"
        elif avg_hours < 24:
            avg_response_time = f"{avg_hours:.1f} hours"
        else:
            avg_response_time = f"{int(avg_hours / 24)} days"
    
    return {
        "staff_id": str(staff.id),
        "thisWeekHours": current_week_hours,
        "nextWeekHours": next_week_hours,
        "upcomingShifts": upcoming_shifts,
        "pendingSwaps": len(pending_swaps),
        "acceptanceRate": round(acceptance_rate, 1),
        "helpfulnessScore": round(helpfulness_score, 1),
        "currentStreak": current_streak,
        "totalHelped": len(helped_others),
        "avgResponseTime": avg_response_time,
        "teamRating": min(95, round((acceptance_rate * 0.6) + (helpfulness_score * 0.4), 1))
    }

@router.get("/me/swap-requests", response_model=List[dict])
def get_my_swap_requests(
    status: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get swap requests for current staff member - FIXED VERSION"""
    if current_user.is_manager:
        raise HTTPException(status_code=403, detail="This endpoint is for staff only")
    
    # Find staff record
    staff = db.exec(
        select(Staff).join(Facility).where(
            Staff.email == current_user.email,
            Facility.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff profile not found")
    
    # FIX: Properly specify the join condition between SwapRequest and Schedule
    query = select(SwapRequest).join(
        Schedule, 
        SwapRequest.schedule_id == Schedule.id  # ✅ EXPLICIT JOIN CONDITION
    ).where(
        Schedule.facility_id == staff.facility_id,
        or_(
            SwapRequest.requesting_staff_id == staff.id,
            SwapRequest.target_staff_id == staff.id,
            SwapRequest.assigned_staff_id == staff.id
        )
    )
    
    if status:
        query = query.where(SwapRequest.status == status)
    
    swap_requests = db.exec(query.order_by(SwapRequest.created_at.desc()).limit(limit)).all()
    
    # Format results with additional context
    result = []
    for swap in swap_requests:
        requesting_staff = db.get(Staff, swap.requesting_staff_id)
        target_staff = db.get(Staff, swap.target_staff_id) if swap.target_staff_id else None
        assigned_staff = db.get(Staff, swap.assigned_staff_id) if swap.assigned_staff_id else None
        
        # Determine user's role in this swap
        user_role = "unknown"
        if swap.requesting_staff_id == staff.id:
            user_role = "requester"
        elif swap.target_staff_id == staff.id:
            user_role = "target"
        elif swap.assigned_staff_id == staff.id:
            user_role = "assigned"
        
        result.append({
            **swap.dict(),
            "user_role": user_role,
            "requesting_staff": requesting_staff.dict() if requesting_staff else None,
            "target_staff": target_staff.dict() if target_staff else None,
            "assigned_staff": assigned_staff.dict() if assigned_staff else None,
            "can_respond": user_role in ["target", "assigned"] and swap.status == "manager_approved"
        })
    
    return result