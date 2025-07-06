# app/api/endpoints/swaps.py

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from typing import List, Optional, Literal
from datetime import datetime, timedelta
from uuid import UUID

from ...deps import get_db, get_current_user
from ...models import (
    SwapRequest, SwapHistory, Schedule, ShiftAssignment, 
    Staff, Facility, User
)
from ...schemas import (
    SpecificSwapRequestCreate, AutoSwapRequestCreate, SwapRequestRead,
    SwapRequestWithDetails, ManagerSwapDecision, StaffSwapResponse,
    AutoAssignmentResult, SwapSummary, SwapHistoryRead, SwapRequestUpdate
)
from ...services.swap_service import assign_swap_coverage

router = APIRouter(prefix="/swaps", tags=["emergency-swaps"])

# ==================== CREATING SWAP REQUESTS ====================

@router.post("/specific", response_model=SwapRequestRead, status_code=201)
def create_specific_swap_request(
    swap_in: SpecificSwapRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a request to swap shifts with a specific staff member"""
    
    # Verify schedule exists and user has access
    schedule = db.get(Schedule, swap_in.schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Verify both staff members exist and belong to this facility
    requesting_staff = db.exec(
        select(Staff).where(
            Staff.id == current_user.id,  # Staff can only request for themselves
            Staff.facility_id == schedule.facility_id
        )
    ).first()
    
    target_staff = db.get(Staff, swap_in.target_staff_id)
    if not target_staff or target_staff.facility_id != schedule.facility_id:
        raise HTTPException(status_code=400, detail="Invalid target staff member")
    
    # Verify original shift assignment exists
    original_assignment = db.exec(
        select(ShiftAssignment).where(
            ShiftAssignment.schedule_id == swap_in.schedule_id,
            ShiftAssignment.staff_id == requesting_staff.id,
            ShiftAssignment.day == swap_in.original_day,
            ShiftAssignment.shift == swap_in.original_shift
        )
    ).first()
    
    if not original_assignment:
        raise HTTPException(
            status_code=400, 
            detail="You are not assigned to the specified shift"
        )
    
    # Verify target shift assignment exists
    target_assignment = db.exec(
        select(ShiftAssignment).where(
            ShiftAssignment.schedule_id == swap_in.schedule_id,
            ShiftAssignment.staff_id == swap_in.target_staff_id,
            ShiftAssignment.day == swap_in.target_day,
            ShiftAssignment.shift == swap_in.target_shift
        )
    ).first()
    
    if not target_assignment:
        raise HTTPException(
            status_code=400,
            detail="Target staff member is not assigned to the specified shift"
        )
    
    # Create the swap request
    swap_request = SwapRequest(
        schedule_id=swap_in.schedule_id,
        requesting_staff_id=requesting_staff.id,
        original_day=swap_in.original_day,
        original_shift=swap_in.original_shift,
        swap_type=swap_in.swap_type,
        target_staff_id=swap_in.target_staff_id,
        target_day=swap_in.target_day,
        target_shift=swap_in.target_shift,
        reason=swap_in.reason,
        urgency=swap_in.urgency,
        expires_at=swap_in.expires_at or (datetime.utcnow() + timedelta(days=3))
    )
    
    db.add(swap_request)
    db.flush()
    
    # Create history entry
    history = SwapHistory(
        swap_request_id=swap_request.id,
        action="requested",
        actor_staff_id=requesting_staff.id,
        notes=f"Specific swap requested with {target_staff.full_name}"
    )
    db.add(history)
    db.commit()
    db.refresh(swap_request)
    
    return swap_request

@router.post("/auto", response_model=SwapRequestRead, status_code=201)
def create_auto_swap_request(
    swap_in: AutoSwapRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a request for automatic coverage assignment"""
    
    # Validate schedule exists and user has access
    schedule = db.get(Schedule, swap_in.schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Handle both staff and manager access
    if current_user.is_manager:
        # Managers can create swaps for any staff in their facilities
        if swap_in.requesting_staff_id:
            requesting_staff = db.get(Staff, swap_in.requesting_staff_id)
            if not requesting_staff or requesting_staff.facility_id != schedule.facility_id:
                raise HTTPException(status_code=400, detail="Invalid staff member")
        else:
            raise HTTPException(status_code=400, detail="Manager must specify requesting_staff_id")
    else:
        # For staff users, we need to find their staff record
        # This is a temporary solution - in production you'd have User -> Staff relationship
        requesting_staff = None
        
        # Try to find staff record by looking for staff in this facility
        # For demo purposes, we'll just take the first active staff member
        # In production, you'd have a proper User.staff_id foreign key
        all_staff = db.exec(
            select(Staff).where(
                Staff.facility_id == schedule.facility_id,
                Staff.is_active.is_(True)
            )
        ).all()
        
        if all_staff:
            requesting_staff = all_staff[0]  # Demo: just use first staff
        
        if not requesting_staff:
            raise HTTPException(status_code=403, detail="No staff record found for this user")
    
    # Verify shift assignment exists
    original_assignment = db.exec(
        select(ShiftAssignment).where(
            ShiftAssignment.schedule_id == swap_in.schedule_id,
            ShiftAssignment.staff_id == requesting_staff.id,
            ShiftAssignment.day == swap_in.original_day,
            ShiftAssignment.shift == swap_in.original_shift
        )
    ).first()
    
    if not original_assignment:
        raise HTTPException(
            status_code=400,
            detail=f"{requesting_staff.full_name} is not assigned to day {swap_in.original_day}, shift {swap_in.original_shift}"
        )
    
    # Create auto swap request
    swap_request = SwapRequest(
        schedule_id=swap_in.schedule_id,
        requesting_staff_id=requesting_staff.id,
        original_day=swap_in.original_day,
        original_shift=swap_in.original_shift,
        swap_type=swap_in.swap_type,
        reason=swap_in.reason,
        urgency=swap_in.urgency,
        expires_at=swap_in.expires_at or (datetime.utcnow() + timedelta(days=2))
    )
    
    db.add(swap_request)
    db.flush()
    
    # Create history entry
    history = SwapHistory(
        swap_request_id=swap_id,
        action="approved" if decision.approved else "declined",
        actor_staff_id=None,  # Managers don't have staff records
        notes=f"Manager {current_user.email}: {decision.notes or ''}"
    )
    db.add(history)
    db.commit()
    db.refresh(swap_request)
    
    return swap_request

# ==================== STAFF RESPONSES ====================

@router.put("/{swap_id}/staff-response", response_model=SwapRequestRead)
def respond_to_swap_request(
    swap_id: UUID,
    response: StaffSwapResponse,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Staff response to a specific swap request"""
    
    swap_request = db.get(SwapRequest, swap_id)
    if not swap_request:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    # Verify this is the target staff member
    if swap_request.target_staff_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to respond to this swap")
    
    # Verify request is still pending
    if swap_request.status != "pending":
        raise HTTPException(status_code=400, detail="Swap request is no longer pending")
    
    # Update the request
    swap_request.target_staff_accepted = response.accepted
    
    # Create history entry
    history = SwapHistory(
        swap_request_id=swap_id,
        action="accepted" if response.accepted else "declined",
        actor_staff_id=None,
        notes=response.notes
    )
    
    db.add(swap_request)
    db.add(history)
    db.commit()
    db.refresh(swap_request)
    
    return swap_request

# ==================== MANAGER ACTIONS ====================

@router.put("/{swap_id}/manager-decision", response_model=SwapRequestRead)
def manager_swap_decision(
    swap_id: UUID,
    decision: ManagerSwapDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manager approves or denies a swap request"""
    
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    swap_request = db.get(SwapRequest, swap_id)
    if not swap_request:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    # Verify access through facility
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update the request
    swap_request.manager_approved = decision.approved
    swap_request.manager_notes = decision.notes
    
    if decision.approved:
        if swap_request.swap_type == "specific":
            # For specific swaps, need staff acceptance first
            if swap_request.target_staff_accepted is True:
                swap_request.status = "approved"
                # Execute the swap
                _execute_specific_swap(db, swap_request)
            else:
                swap_request.status = "pending"  # Still waiting for staff response
        else:
            # For auto swaps, try to assign coverage
            assignment_result = assign_swap_coverage(db, swap_request)
            if assignment_result.success:
                swap_request.assigned_staff_id = assignment_result.assigned_staff_id
                swap_request.status = "approved"
                # Execute the assignment
                _execute_auto_assignment(db, swap_request)
            else:
                swap_request.status = "pending"
                swap_request.manager_notes = f"{decision.notes or ''} | Auto-assignment failed: {assignment_result.reason}"
    else:
        swap_request.status = "declined"
    
    # Create history entry
    history = SwapHistory(
        swap_request_id=swap_id,
        action="approved" if decision.approved else "declined",
        actor_staff_id=None,
        notes=decision.notes
    )
    
    db.add(swap_request)
    db.add(history)
    db.commit()
    db.refresh(swap_request)
    
    return swap_request

@router.post("/{swap_id}/retry-auto-assignment", response_model=AutoAssignmentResult)
def retry_auto_assignment(
    swap_id: UUID,
    avoid_staff_ids: List[UUID] = Query(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retry automatic assignment with different parameters"""
    
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    swap_request = db.get(SwapRequest, swap_id)
    if not swap_request or swap_request.swap_type != "auto":
        raise HTTPException(status_code=400, detail="Invalid auto swap request")
    
    # Verify access
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Retry assignment
    result = assign_swap_coverage(db, swap_request, avoid_staff_ids=avoid_staff_ids)
    
    if result.success:
        swap_request.assigned_staff_id = result.assigned_staff_id
        swap_request.status = "approved"
        _execute_auto_assignment(db, swap_request)
        
        # Create history
        history = SwapHistory(
            swap_request_id=swap_id,
            action="auto_assigned",
            actor_staff_id=None,
            notes=f"Auto-assigned to {result.assigned_staff_name}"
        )
        db.add(history)
        db.commit()
    
    return result

# ==================== LISTING AND QUERYING ====================

@router.get("/", response_model=List[SwapRequestWithDetails])
def list_swap_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    facility_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    urgency: Optional[str] = Query(None),
    swap_type: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
):
    """List swap requests with filtering"""
    
    # Base query
    if current_user.is_manager:
        # Managers see all swaps for their facilities
        query = select(SwapRequest).join(Schedule).join(Facility).where(
            Facility.tenant_id == current_user.tenant_id
        )
    else:
        # Staff see only their own swap requests
        query = select(SwapRequest).where(
            SwapRequest.requesting_staff_id == current_user.id
        )
    
    # Apply filters
    if facility_id:
        query = query.join(Schedule).where(Schedule.facility_id == facility_id)
    if status:
        query = query.where(SwapRequest.status == status)
    if urgency:
        query = query.where(SwapRequest.urgency == urgency)
    if swap_type:
        query = query.where(SwapRequest.swap_type == swap_type)
    
    query = query.order_by(SwapRequest.created_at.desc()).limit(limit)
    
    swap_requests = db.exec(query).all()
    
    # Load related data
    result = []
    for swap in swap_requests:
        requesting_staff = db.get(Staff, swap.requesting_staff_id)
        target_staff = db.get(Staff, swap.target_staff_id) if swap.target_staff_id else None
        assigned_staff = db.get(Staff, swap.assigned_staff_id) if swap.assigned_staff_id else None
        
        result.append(SwapRequestWithDetails(
            **swap.dict(),
            requesting_staff=requesting_staff,
            target_staff=target_staff,
            assigned_staff=assigned_staff
        ))
    
    return result

@router.get("/summary/{facility_id}", response_model=SwapSummary)
def get_swap_summary(
    facility_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get swap summary for facility dashboard"""
    
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    # Verify facility access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Count various swap types
    base_query = select(SwapRequest).join(Schedule).where(Schedule.facility_id == facility_id)
    
    pending_swaps = len(db.exec(base_query.where(SwapRequest.status == "pending")).all())
    urgent_swaps = len(db.exec(base_query.where(
        SwapRequest.status == "pending",
        SwapRequest.urgency.in_(["high", "emergency"])
    )).all())
    auto_swaps_needing_assignment = len(db.exec(base_query.where(
        SwapRequest.status == "pending",
        SwapRequest.swap_type == "auto",
        SwapRequest.manager_approved.is_(True),
        SwapRequest.assigned_staff_id.is_(None)
    )).all())
    specific_swaps_awaiting_response = len(db.exec(base_query.where(
        SwapRequest.status == "pending",
        SwapRequest.swap_type == "specific",
        SwapRequest.target_staff_accepted.is_(None)
    )).all())
    
    recent_completions = len(db.exec(base_query.where(
        SwapRequest.status == "completed",
        SwapRequest.completed_at >= datetime.utcnow() - timedelta(days=7)
    )).all())
    
    return SwapSummary(
        facility_id=facility_id,
        pending_swaps=pending_swaps,
        urgent_swaps=urgent_swaps,
        auto_swaps_needing_assignment=auto_swaps_needing_assignment,
        specific_swaps_awaiting_response=specific_swaps_awaiting_response,
        recent_completions=recent_completions
    )

@router.get("/{swap_id}/history", response_model=List[SwapHistoryRead])
def get_swap_history(
    swap_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get history of actions for a swap request"""
    
    swap_request = db.get(SwapRequest, swap_id)
    if not swap_request:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    # Verify access
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    history = db.exec(
        select(SwapHistory)
        .where(SwapHistory.swap_request_id == swap_id)
        .order_by(SwapHistory.created_at)
    ).all()
    
    return history

# ==================== HELPER FUNCTIONS ====================

def _execute_specific_swap(db: Session, swap_request: SwapRequest):
    """Execute a specific staff-to-staff swap"""
    
    # Get the assignments
    original_assignment = db.exec(
        select(ShiftAssignment).where(
            ShiftAssignment.schedule_id == swap_request.schedule_id,
            ShiftAssignment.staff_id == swap_request.requesting_staff_id,
            ShiftAssignment.day == swap_request.original_day,
            ShiftAssignment.shift == swap_request.original_shift
        )
    ).first()
    
    target_assignment = db.exec(
        select(ShiftAssignment).where(
            ShiftAssignment.schedule_id == swap_request.schedule_id,
            ShiftAssignment.staff_id == swap_request.target_staff_id,
            ShiftAssignment.day == swap_request.target_day,
            ShiftAssignment.shift == swap_request.target_shift
        )
    ).first()
    
    # Swap the staff assignments
    if original_assignment and target_assignment:
        original_assignment.staff_id = swap_request.target_staff_id
        target_assignment.staff_id = swap_request.requesting_staff_id
        
        swap_request.status = "completed"
        swap_request.completed_at = datetime.utcnow()
        
        db.add(original_assignment)
        db.add(target_assignment)

def _execute_auto_assignment(db: Session, swap_request: SwapRequest):
    """Execute an auto-assignment swap"""
    
    # Get the original assignment
    original_assignment = db.exec(
        select(ShiftAssignment).where(
            ShiftAssignment.schedule_id == swap_request.schedule_id,
            ShiftAssignment.staff_id == swap_request.requesting_staff_id,
            ShiftAssignment.day == swap_request.original_day,
            ShiftAssignment.shift == swap_request.original_shift
        )
    ).first()
    
    # Update assignment to new staff member
    if original_assignment and swap_request.assigned_staff_id:
        original_assignment.staff_id = swap_request.assigned_staff_id
        
        swap_request.status = "completed"
        swap_request.completed_at = datetime.utcnow()
        
        db.add(original_assignment)