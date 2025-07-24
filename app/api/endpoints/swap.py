# app/api/endpoints/swaps.py
"""Enhanced swaps endpoint with comprehensive workflow and role verification"""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from typing import List, Optional, Literal
from datetime import datetime, timedelta
from uuid import UUID
from collections import Counter, defaultdict
from typing import Dict, Any

from app.services.notification_service import NotificationService
from app.models import NotificationType, NotificationPriority

from ...deps import get_db, get_current_user
from ...models import (
    SwapRequest, SwapHistory, Schedule, ShiftAssignment, 
    Staff, Facility, User, SwapStatus
)
from ...schemas import (
    SpecificSwapRequestCreate, AutoSwapRequestCreate, SwapRequestCreate, SwapRequestRead,
    SwapRequestWithDetails, ManagerSwapDecision, StaffSwapResponse, SwapRequestUpdate,
    AutoAssignmentResult, SwapSummary, SwapHistoryRead, SwapWorkflowStatus,
    PotentialAssignmentResponse, ManagerFinalApproval, RoleMatchAudit,
    SwapValidationResult, SwapAnalytics, BulkSwapApproval, BulkSwapResult
)
from ...services.swap_service import assign_swap_coverage, get_swap_workflow_status

router = APIRouter(prefix="/swaps", tags=["emergency-swaps"])

# ==================== ENHANCED NOTIFICATION HELPERS ====================

async def send_swap_creation_notifications(
    swap_request: SwapRequest,
    notification_service: NotificationService,
    db: Session,
    background_tasks: BackgroundTasks,
    notification_options: Optional[Dict[str, Any]] = None
):
    """Send notifications when a swap request is created"""
    
    if notification_options is None:
        notification_options = {'send_whatsapp': True, 'send_push': True, 'send_email': False}
    
    # Get requesting staff and facility info
    requesting_staff = db.get(Staff, swap_request.requesting_staff_id)
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id) if schedule else None
    
    if not requesting_staff or not facility:
        return
    
    # Determine notification channels
    channels = ['IN_APP']
    if notification_options.get('send_push', True):
        channels.append('PUSH')
    if notification_options.get('send_whatsapp', True):
        channels.append('WHATSAPP')
    if notification_options.get('send_email', False):
        channels.append('EMAIL')
    
    base_template_data = {
        'requester_name': requesting_staff.full_name,
        'requester_role': requesting_staff.role,
        'facility_name': facility.name,
        'original_day': _get_day_name(swap_request.original_day),
        'original_shift': _get_shift_name(swap_request.original_shift),
        'reason': swap_request.reason,
        'urgency': swap_request.urgency,
        'week_start': schedule.week_start.strftime('%B %d, %Y') if schedule else 'this week'
    }
    
    try:
        if swap_request.swap_type == "specific":
            # Notify target staff member
            if swap_request.target_staff_id:
                target_staff = db.get(Staff, swap_request.target_staff_id)
                if target_staff:
                    await notification_service.send_notification(
                        notification_type=NotificationType.SWAP_REQUEST,
                        recipient_user_id=target_staff.id,
                        template_data={
                            **base_template_data,
                            'target_name': target_staff.full_name,
                            'target_day': _get_day_name(swap_request.target_day),
                            'target_shift': _get_shift_name(swap_request.target_shift)
                        },
                        channels=channels,
                        priority=NotificationPriority.HIGH if swap_request.urgency == "emergency" else NotificationPriority.MEDIUM,
                        action_url=f"/swaps/{swap_request.id}/respond",
                        action_text="Respond to Swap Request",
                        background_tasks=background_tasks
                    )
        
        # Notify managers
        await _notify_managers_of_swap_request(swap_request, notification_service, db, background_tasks, base_template_data)
        
        # Send confirmation to requesting staff
        await notification_service.send_notification(
            notification_type=NotificationType.SWAP_REQUEST,
            recipient_user_id=requesting_staff.id,
            template_data={
                **base_template_data,
                'target_name': requesting_staff.full_name,
                'message': f"Your {swap_request.swap_type} swap request has been submitted and is pending approval"
            },
            channels=['IN_APP'],
            priority=NotificationPriority.LOW,
            action_url=f"/swaps/{swap_request.id}",
            action_text="View Request Status",
            background_tasks=background_tasks
        )
        
    except Exception as e:
        print(f"Failed to send swap creation notifications: {e}")

async def _notify_managers_of_swap_request(
    swap_request: SwapRequest,
    notification_service: NotificationService,
    db: Session,
    background_tasks: BackgroundTasks,
    base_template_data: Dict[str, Any]
):
    """Notify managers of new swap requests"""
    
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id) if schedule else None
    
    if not facility:
        return
    
    # Get managers for this facility
    managers = db.exec(
        select(User).join(Staff).where(
            Staff.facility_id == facility.id,
            User.is_manager == True,
            User.is_active == True
        )
    ).all()
    
    for manager in managers:
        try:
            await notification_service.send_notification(
                notification_type=NotificationType.SWAP_REQUEST,
                recipient_user_id=manager.id,
                template_data={
                    **base_template_data,
                    'target_name': 'Manager',
                    'message': f"New swap request from {base_template_data['requester_name']} requires approval"
                },
                channels=['IN_APP', 'PUSH'],
                priority=NotificationPriority.HIGH if swap_request.urgency == "emergency" else NotificationPriority.MEDIUM,
                action_url=f"/swaps/{swap_request.id}/manage",
                action_text="Review Request",
                background_tasks=background_tasks
            )
        except Exception as e:
            print(f"Failed to notify manager {manager.email}: {e}")

def _get_day_name(day_number: int) -> str:
    """Convert day number to day name"""
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    return days[day_number] if 0 <= day_number < 7 else f"Day {day_number}"

def _get_shift_name(shift_number: int) -> str:
    """Convert shift number to shift name"""
    shifts = ['Morning', 'Afternoon', 'Evening']
    return shifts[shift_number] if 0 <= shift_number < 3 else f"Shift {shift_number}"

# ==================== CREATING SWAP REQUESTS WITH ENHANCED WORKFLOW ====================

@router.post("/specific", response_model=SwapRequestRead, status_code=201)
async def create_specific_swap_request(
    swap_in: SpecificSwapRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Create a request to swap shifts with a specific staff member"""
    
    # Verify schedule exists and user has access
    schedule = db.get(Schedule, swap_in.schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Handle both staff and manager access properly
    if current_user.is_manager:
        if hasattr(swap_in, 'requesting_staff_id') and swap_in.requesting_staff_id:
            requesting_staff = db.get(Staff, swap_in.requesting_staff_id)
            if not requesting_staff or requesting_staff.facility_id != schedule.facility_id:
                raise HTTPException(status_code=400, detail="Invalid requesting staff member")
        else:
            raise HTTPException(status_code=400, detail="Manager must specify requesting_staff_id")
    else:
        # For staff users, find their staff record using email lookup
        requesting_staff = db.exec(
            select(Staff).join(Facility).where(
                Staff.email == current_user.email,
                Facility.tenant_id == current_user.tenant_id,
                Staff.facility_id == schedule.facility_id,
                Staff.is_active.is_(True)
            )
        ).first()
        
        if not requesting_staff:
            raise HTTPException(
                status_code=403, 
                detail=f"No active staff record found for {current_user.email} in this facility"
            )
    
    # Validate target staff
    target_staff = db.get(Staff, swap_in.target_staff_id)
    if not target_staff or target_staff.facility_id != schedule.facility_id:
        raise HTTPException(status_code=400, detail="Invalid target staff member")
    
    # Verify assignments exist
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
    
    # Create the swap request with enhanced workflow fields
    swap_request = SwapRequest(
        schedule_id=swap_in.schedule_id,
        requesting_staff_id=requesting_staff.id,
        original_day=swap_in.original_day,
        original_shift=swap_in.original_shift,
        original_zone_id=getattr(swap_in, 'original_zone_id', None),
        swap_type=swap_in.swap_type,
        target_staff_id=swap_in.target_staff_id,
        target_day=swap_in.target_day,
        target_shift=swap_in.target_shift,
        target_zone_id=getattr(swap_in, 'target_zone_id', None),
        reason=swap_in.reason,
        urgency=swap_in.urgency,
        status=SwapStatus.PENDING,
        requires_manager_final_approval=getattr(swap_in, 'requires_manager_final_approval', True),
        role_verification_required=getattr(swap_in, 'role_verification_required', True),
        expires_at=swap_in.expires_at or (datetime.utcnow() + timedelta(days=3))
    )
    
    db.add(swap_request)
    db.flush()
    
    # Create history entry
    history = SwapHistory(
        swap_request_id=swap_request.id,
        action="requested",
        actor_staff_id=requesting_staff.id,
        notes=f"Specific swap requested with {target_staff.full_name}",
        system_action=False
    )
    db.add(history)
    db.commit()
    db.refresh(swap_request)
    
    # Send notifications
    notification_service = NotificationService(db)
    try:
        await send_swap_creation_notifications(
            swap_request=swap_request,
            notification_service=notification_service,
            db=db,
            background_tasks=background_tasks
        )
    except Exception as e:
        print(f"Failed to send swap creation notifications: {e}")
    
    return swap_request

@router.post("/auto", response_model=SwapRequestRead, status_code=201)
async def create_auto_swap_request(
    swap_in: AutoSwapRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks()
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
        if swap_in.requesting_staff_id:
            requesting_staff = db.get(Staff, swap_in.requesting_staff_id)
            if not requesting_staff or requesting_staff.facility_id != schedule.facility_id:
                raise HTTPException(status_code=400, detail="Invalid staff member")
        else:
            raise HTTPException(status_code=400, detail="Manager must specify requesting_staff_id")
    else:
        requesting_staff = db.exec(
            select(Staff).join(Facility).where(
                Staff.email == current_user.email,
                Facility.tenant_id == current_user.tenant_id,
                Staff.facility_id == schedule.facility_id,
                Staff.is_active.is_(True)
            )
        ).first()
        
        if not requesting_staff:
            raise HTTPException(
                status_code=403, 
                detail=f"No active staff record found for {current_user.email} in this facility"
            )
    
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
    
    # Create auto swap request with enhanced workflow fields
    swap_request = SwapRequest(
        schedule_id=swap_in.schedule_id,
        requesting_staff_id=requesting_staff.id,
        original_day=swap_in.original_day,
        original_shift=swap_in.original_shift,
        original_zone_id=getattr(swap_in, 'original_zone_id', None),
        swap_type=swap_in.swap_type,
        reason=swap_in.reason,
        urgency=swap_in.urgency,
        status=SwapStatus.PENDING,
        requires_manager_final_approval=getattr(swap_in, 'requires_manager_final_approval', True),
        role_verification_required=getattr(swap_in, 'role_verification_required', True),
        expires_at=swap_in.expires_at or (datetime.utcnow() + timedelta(days=2))
    )
    
    db.add(swap_request)
    db.flush()
    
    # Create history entry
    history = SwapHistory(
        swap_request_id=swap_request.id,  
        action="requested",               
        actor_staff_id=requesting_staff.id,
        notes=f"Auto-assignment requested: {swap_in.reason}",
        system_action=False
    )
    db.add(history)
    db.commit()
    db.refresh(swap_request)
    
    # Send notifications
    notification_service = NotificationService(db)
    try:
        await send_swap_creation_notifications(
            swap_request=swap_request,
            notification_service=notification_service,
            db=db,
            background_tasks=background_tasks
        )
    except Exception as e:
        print(f"Failed to send swap creation notifications: {e}")
    
    return swap_request

# ==================== ENHANCED WORKFLOW ENDPOINTS ====================

@router.put("/{swap_id}/potential-assignment-response", response_model=SwapRequestRead)
async def respond_to_potential_assignment(
    swap_id: UUID,
    response: PotentialAssignmentResponse,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Staff response to potential auto-assignment (NEW)"""
    
    swap_request = db.get(SwapRequest, swap_id)
    if not swap_request:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    # Verify this is the assigned staff member
    if swap_request.assigned_staff_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to respond to this assignment")
    
    # Verify request is in the correct status
    if swap_request.status != SwapStatus.POTENTIAL_ASSIGNMENT:
        raise HTTPException(status_code=400, detail="Invalid status for potential assignment response")
    
    # Update response
    swap_request.assigned_staff_accepted = response.accepted
    swap_request.staff_responded_at = datetime.utcnow()
    
    if response.accepted:
        if swap_request.requires_manager_final_approval:
            swap_request.status = SwapStatus.MANAGER_FINAL_APPROVAL
        else:
            swap_request.status = SwapStatus.STAFF_ACCEPTED
            # Execute immediately if no final approval needed
            _execute_auto_assignment(db, swap_request)
            swap_request.status = SwapStatus.EXECUTED
            swap_request.completed_at = datetime.utcnow()
    else:
        swap_request.status = SwapStatus.ASSIGNMENT_DECLINED
        swap_request.assigned_staff_id = None  # Clear the declined assignment
    
    # Create history entry
    action = "assignment_accepted" if response.accepted else "assignment_declined"
    history = SwapHistory(
        swap_request_id=swap_id,
        action=action,
        actor_staff_id=current_user.id,
        notes=response.notes,
        system_action=False
    )
    
    db.add(swap_request)
    db.add(history)
    db.commit()
    db.refresh(swap_request)
    
    return swap_request

@router.put("/{swap_id}/manager-final-approval", response_model=SwapRequestRead)
async def manager_final_approval(
    swap_id: UUID,
    approval: ManagerFinalApproval,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Manager's final approval for swap execution (NEW)"""
    
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    swap_request = db.get(SwapRequest, swap_id)
    if not swap_request:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    # Verify access
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Verify status
    if swap_request.status != SwapStatus.MANAGER_FINAL_APPROVAL:
        raise HTTPException(status_code=400, detail="Swap not ready for final approval")
    
    # Update final approval
    swap_request.manager_final_approved = approval.approved
    swap_request.manager_final_approved_at = datetime.utcnow()
    swap_request.manager_notes = approval.notes
    
    if approval.override_role_verification:
        swap_request.role_match_override = True
        swap_request.role_match_reason = approval.role_override_reason
    
    if approval.approved:
        # Execute the swap
        if swap_request.swap_type == "specific":
            _execute_specific_swap(db, swap_request)
        else:
            _execute_auto_assignment(db, swap_request)
        
        swap_request.status = SwapStatus.EXECUTED
        swap_request.completed_at = datetime.utcnow()
    else:
        swap_request.status = SwapStatus.DECLINED
    
    # Create history entry
    action = "manager_final_approved" if approval.approved else "manager_final_declined"
    history = SwapHistory(
        swap_request_id=swap_id,
        action=action,
        actor_staff_id=current_user.id,
        notes=approval.notes,
        system_action=False,
        role_information={
            "override_applied": approval.override_role_verification,
            "override_reason": approval.role_override_reason
        } if approval.override_role_verification else None
    )
    
    db.add(swap_request)
    db.add(history)
    db.commit()
    db.refresh(swap_request)
    
    return swap_request

@router.get("/{swap_id}/workflow-status", response_model=SwapWorkflowStatus)
async def get_swap_workflow_status_endpoint(
    swap_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current workflow status and next required actions (NEW)"""
    
    swap_request = db.get(SwapRequest, swap_id)
    if not swap_request:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    # Verify access
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    status_info = get_swap_workflow_status(swap_request)
    
    return SwapWorkflowStatus(**status_info)

@router.get("/{swap_id}/role-audit", response_model=RoleMatchAudit)
async def get_swap_role_audit(
    swap_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get role matching audit information for swap (NEW)"""
    
    swap_request = db.get(SwapRequest, swap_id)
    if not swap_request:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    # Verify access
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Build role audit information
    audit_info = {
        "original_shift_role": None,
        "assigned_staff_role": None,
        "target_staff_role": None,
        "roles_compatible": True,
        "match_level": "exact_match",
        "override_applied": swap_request.role_match_override or False,
        "override_reason": swap_request.role_match_reason,
        "skill_levels_compatible": True,
        "minimum_skill_required": None
    }
    
    # Get role information from staff records
    if swap_request.assigned_staff_id:
        assigned_staff = db.get(Staff, swap_request.assigned_staff_id)
        if assigned_staff:
            audit_info["assigned_staff_role"] = assigned_staff.role
    
    if swap_request.target_staff_id:
        target_staff = db.get(Staff, swap_request.target_staff_id)
        if target_staff:
            audit_info["target_staff_role"] = target_staff.role
    
    return RoleMatchAudit(**audit_info)

# ==================== ENHANCED MANAGER DECISION ENDPOINT ====================

@router.put("/{swap_id}/manager-decision", response_model=SwapRequestRead)
async def manager_swap_decision(
    swap_id: UUID,
    decision: ManagerSwapDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Manager approves or denies a swap request (ENHANCED)"""
    
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    swap_request = db.get(SwapRequest, swap_id)
    if not swap_request:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    # Verify access
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update manager decision
    swap_request.manager_approved = decision.approved
    swap_request.manager_notes = decision.notes
    swap_request.manager_approved_at = datetime.utcnow()
    
    if decision.approved:
        swap_request.status = SwapStatus.MANAGER_APPROVED
        
        if swap_request.swap_type == "auto":
            # Try to assign coverage immediately
            try:
                assignment_result = assign_swap_coverage(db, swap_request)
                if assignment_result.success and assignment_result.assigned_staff_id:
                    swap_request.assigned_staff_id = assignment_result.assigned_staff_id
                    swap_request.status = SwapStatus.POTENTIAL_ASSIGNMENT
                    swap_request.assigned_staff_accepted = None
                    
                    # Store role matching information
                    if hasattr(assignment_result, 'role_match_level'):
                        swap_request.role_match_reason = assignment_result.reason
                else:
                    swap_request.status = SwapStatus.ASSIGNMENT_FAILED
                    
            except Exception as e:
                swap_request.status = SwapStatus.ASSIGNMENT_FAILED
                swap_request.manager_notes = f"{decision.notes or ''} | Auto-assignment error: {str(e)}"
    else:
        swap_request.status = SwapStatus.DECLINED
    
    # Create history entry
    action = "manager_approved" if decision.approved else "manager_declined"
    history = SwapHistory(
        swap_request_id=swap_id,
        action=action,
        actor_staff_id=current_user.id,
        notes=decision.notes,
        system_action=False
    )
    
    db.add(swap_request)
    db.add(history)
    db.commit()
    db.refresh(swap_request)
    
    return swap_request

# ==================== STAFF RESPONSE ENDPOINT (ENHANCED) ====================

@router.put("/{swap_id}/staff-response", response_model=SwapRequestRead)
async def respond_to_swap_request(
    swap_id: UUID,
    response: StaffSwapResponse,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Staff response to a specific swap request (ENHANCED)"""
    
    swap_request = db.get(SwapRequest, swap_id)
    if not swap_request:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    # Verify this is the target staff member for specific swaps
    if swap_request.swap_type == "specific":
        if swap_request.target_staff_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to respond to this swap")
    else:
        raise HTTPException(status_code=400, detail="Use potential-assignment-response for auto swaps")
    
    # Verify request can still be responded to
    valid_statuses = [SwapStatus.PENDING, SwapStatus.MANAGER_APPROVED]
    if swap_request.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Swap request can no longer be responded to")
    
    # Update staff response
    swap_request.target_staff_accepted = response.accepted
    swap_request.staff_responded_at = datetime.utcnow()
    
    if response.accepted:
        if swap_request.manager_approved:
            if swap_request.requires_manager_final_approval:
                swap_request.status = SwapStatus.MANAGER_FINAL_APPROVAL
            else:
                # Both manager and staff approved - execute the swap
                swap_request.status = SwapStatus.STAFF_ACCEPTED
                _execute_specific_swap(db, swap_request)
                swap_request.status = SwapStatus.EXECUTED
                swap_request.completed_at = datetime.utcnow()
        else:
            # Staff accepted but manager hasn't approved yet
            swap_request.status = SwapStatus.PENDING
    else:
        # Staff declined
        swap_request.status = SwapStatus.STAFF_DECLINED
    
    # Create history entry
    action = "staff_accepted" if response.accepted else "staff_declined"
    history = SwapHistory(
        swap_request_id=swap_id,
        action=action,
        actor_staff_id=current_user.id,
        notes=response.notes,
        system_action=False
    )
    
    db.add(swap_request)
    db.add(history)
    db.commit()
    db.refresh(swap_request)
    
    return swap_request

# ==================== BULK OPERATIONS (NEW) ====================

@router.post("/bulk-approve", response_model=BulkSwapResult)
async def bulk_approve_swaps(
    bulk_approval: BulkSwapApproval,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Bulk approve multiple swap requests (NEW)"""
    
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    results = []
    successful = 0
    failed = 0
    errors = []
    
    for swap_id in bulk_approval.swap_ids:
        try:
            swap_request = db.get(SwapRequest, swap_id)
            if not swap_request:
                errors.append(f"Swap {swap_id} not found")
                failed += 1
                continue
            
            # Verify access
            schedule = db.get(Schedule, swap_request.schedule_id)
            facility = db.get(Facility, schedule.facility_id)
            if not facility or facility.tenant_id != current_user.tenant_id:
                errors.append(f"Access denied for swap {swap_id}")
                failed += 1
                continue
            
            # Apply approval
            swap_request.manager_approved = bulk_approval.approved
            swap_request.manager_notes = bulk_approval.notes
            swap_request.manager_approved_at = datetime.utcnow()
            
            if bulk_approval.approved:
                swap_request.status = SwapStatus.MANAGER_APPROVED
                
                if swap_request.swap_type == "auto":
                    # Try auto-assignment
                    try:
                        assignment_result = assign_swap_coverage(db, swap_request)
                        if assignment_result.success:
                            swap_request.assigned_staff_id = assignment_result.assigned_staff_id
                            swap_request.status = SwapStatus.POTENTIAL_ASSIGNMENT
                        else:
                            swap_request.status = SwapStatus.ASSIGNMENT_FAILED
                    except Exception as e:
                        swap_request.status = SwapStatus.ASSIGNMENT_FAILED
            else:
                swap_request.status = SwapStatus.DECLINED
            
            # Create history entry
            action = "manager_approved" if bulk_approval.approved else "manager_declined"
            history = SwapHistory(
                swap_request_id=swap_id,
                action=action,
                actor_staff_id=current_user.id,
                notes=f"Bulk {action}: {bulk_approval.notes or ''}",
                system_action=False
            )
            
            db.add(swap_request)
            db.add(history)
            
            results.append({
                "swap_id": str(swap_id),
                "status": "success",
                "new_status": swap_request.status.value
            })
            successful += 1
            
        except Exception as e:
            errors.append(f"Error processing swap {swap_id}: {str(e)}")
            failed += 1
    
    db.commit()
    
    return BulkSwapResult(
        total_processed=len(bulk_approval.swap_ids),
        successful=successful,
        failed=failed,
        results=results,
        errors=errors
    )

# ==================== VALIDATION ENDPOINTS (NEW) ====================

@router.post("/{swap_id}/validate", response_model=SwapValidationResult)
async def validate_swap_request(
    swap_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Validate a swap request for conflicts and requirements (NEW)"""
    
    swap_request = db.get(SwapRequest, swap_id)
    if not swap_request:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    # Verify access
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Perform validation checks
    validation_result = {
        "is_valid": True,
        "errors": [],
        "warnings": [],
        "role_verification_passed": True,
        "zone_requirements_met": True,
        "skill_requirements_met": True,
        "staff_available": True,
        "no_conflicts": True,
        "within_work_limits": True
    }
    
    # Check staff availability
    if swap_request.assigned_staff_id:
        assigned_staff = db.get(Staff, swap_request.assigned_staff_id)
        if not assigned_staff or not assigned_staff.is_active:
            validation_result["staff_available"] = False
            validation_result["is_valid"] = False
            validation_result["errors"].append({
                "error_code": "STAFF_UNAVAILABLE",
                "error_message": "Assigned staff is not available",
                "field": "assigned_staff_id"
            })
    
    # Check for scheduling conflicts
    if swap_request.swap_type == "specific" and swap_request.target_staff_id:
        # Check if target staff has other assignments at the same time
        existing_assignments = db.exec(
            select(ShiftAssignment).where(
                ShiftAssignment.schedule_id == swap_request.schedule_id,
                ShiftAssignment.staff_id == swap_request.target_staff_id,
                ShiftAssignment.day == swap_request.original_day,
                ShiftAssignment.shift == swap_request.original_shift
            )
        ).all()
        
        if len(existing_assignments) > 1:
            validation_result["no_conflicts"] = False
            validation_result["is_valid"] = False
            validation_result["errors"].append({
                "error_code": "SCHEDULING_CONFLICT",
                "error_message": "Staff member has conflicting assignments",
                "field": "target_staff_id"
            })
    
    return SwapValidationResult(**validation_result)

# ==================== ANALYTICS ENDPOINTS (ENHANCED) ====================

@router.get("/analytics/{facility_id}", response_model=SwapAnalytics)
async def get_swap_analytics(
    facility_id: UUID,
    period_start: datetime = Query(...),
    period_end: datetime = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive swap analytics for facility (NEW)"""
    
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    # Verify facility access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get swap requests in the period
    swap_requests = db.exec(
        select(SwapRequest)
        .join(Schedule, SwapRequest.schedule_id == Schedule.id)
        .where(
            Schedule.facility_id == facility_id,
            SwapRequest.created_at >= period_start,
            SwapRequest.created_at <= period_end
        )
    ).all()
    
    # Calculate metrics
    total_requests = len(swap_requests)
    auto_requests = len([s for s in swap_requests if s.swap_type == "auto"])
    specific_requests = len([s for s in swap_requests if s.swap_type == "specific"])
    completed_swaps = len([s for s in swap_requests if s.status == SwapStatus.EXECUTED])
    failed_swaps = len([s for s in swap_requests if s.status in [SwapStatus.DECLINED, SwapStatus.ASSIGNMENT_FAILED]])
    
    # Role compatibility analysis
    role_compatible = len([s for s in swap_requests if not s.role_match_override])
    role_compatibility_rate = (role_compatible / total_requests * 100) if total_requests > 0 else 0
    
    # Timing analysis
    completed_requests = [s for s in swap_requests if s.completed_at and s.created_at]
    avg_resolution_time = 0.0
    if completed_requests:
        resolution_times = [(s.completed_at - s.created_at).total_seconds() / 3600 for s in completed_requests]
        avg_resolution_time = sum(resolution_times) / len(resolution_times)
    
    # Manager response times
    manager_approved_requests = [s for s in swap_requests if s.manager_approved_at and s.created_at]
    avg_manager_approval_time = 0.0
    if manager_approved_requests:
        approval_times = [(s.manager_approved_at - s.created_at).total_seconds() / 3600 for s in manager_approved_requests]
        avg_manager_approval_time = sum(approval_times) / len(approval_times)
    
    # Staff response times
    staff_responded_requests = [s for s in swap_requests if s.staff_responded_at and s.created_at]
    avg_staff_response_time = 0.0
    if staff_responded_requests:
        response_times = [(s.staff_responded_at - s.created_at).total_seconds() / 3600 for s in staff_responded_requests]
        avg_staff_response_time = sum(response_times) / len(response_times)
    
    return SwapAnalytics(
        facility_id=facility_id,
        period_start=period_start,
        period_end=period_end,
        total_requests=total_requests,
        auto_requests=auto_requests,
        specific_requests=specific_requests,
        completed_swaps=completed_swaps,
        failed_swaps=failed_swaps,
        role_compatibility_rate=role_compatibility_rate,
        most_requested_roles=[],  # Could be implemented with more complex queries
        role_coverage_gaps=[],
        most_helpful_staff=[],
        staff_acceptance_rates={},
        emergency_coverage_providers=[],
        average_resolution_time=avg_resolution_time,
        manager_approval_time=avg_manager_approval_time,
        staff_response_time=avg_staff_response_time,
        recommendations=[]
    )

# ==================== UPDATED LISTING ENDPOINTS ====================

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
    """List swap requests with filtering (ENHANCED)"""
    
    # Base query
    if current_user.is_manager:
        query = select(SwapRequest).join(Schedule).join(Facility).where(
            Facility.tenant_id == current_user.tenant_id
        )
    else:
        query = select(SwapRequest).where(
            SwapRequest.requesting_staff_id == current_user.id
        )
    
    # Apply filters
    if facility_id:
        if current_user.is_manager:
            query = query.where(Schedule.facility_id == facility_id)
        else:
            query = query.join(Schedule).where(Schedule.facility_id == facility_id)
    
    if status:
        # Support both string and enum status filtering
        try:
            status_enum = SwapStatus(status)
            query = query.where(SwapRequest.status == status_enum)
        except ValueError:
            # Fallback to string comparison for backward compatibility
            query = query.where(SwapRequest.status == status)
    
    if urgency:
        query = query.where(SwapRequest.urgency == urgency)
    if swap_type:
        query = query.where(SwapRequest.swap_type == swap_type)
    
    query = query.order_by(SwapRequest.created_at.desc()).limit(limit)
    
    swap_requests = db.exec(query).all()
    
    # Load related data and build enhanced response
    result = []
    for swap in swap_requests:
        requesting_staff = db.get(Staff, swap.requesting_staff_id)
        target_staff = db.get(Staff, swap.target_staff_id) if swap.target_staff_id else None
        assigned_staff = db.get(Staff, swap.assigned_staff_id) if swap.assigned_staff_id else None
        
        # Convert to dict and create SwapRequestWithDetails
        swap_data = swap.dict()
        swap_data["requesting_staff"] = requesting_staff.dict() if requesting_staff else None
        swap_data["target_staff"] = target_staff.dict() if target_staff else None
        swap_data["assigned_staff"] = assigned_staff.dict() if assigned_staff else None
        
        # Add role names for display
        swap_data["original_shift_role_name"] = requesting_staff.role if requesting_staff else None
        swap_data["target_staff_role_name"] = target_staff.role if target_staff else None
        swap_data["assigned_staff_role_name"] = assigned_staff.role if assigned_staff else None
        
        result.append(SwapRequestWithDetails(**swap_data))
    
    return result

# ==================== ROLE VERIFICATION ENDPOINTS (NEW) ====================

@router.post("/check-role-compatibility")
async def check_role_compatibility(
    facility_id: UUID = Query(...),
    zone_id: str = Query(...),
    staff_id: UUID = Query(...),
    original_shift_day: int = Query(..., ge=0, le=6),
    original_shift_number: int = Query(..., ge=0, le=2),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check if staff member is compatible for a specific role/zone (NEW)"""
    
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    # Verify facility access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get staff member
    staff = db.get(Staff, staff_id)
    if not staff or staff.facility_id != facility_id:
        raise HTTPException(status_code=400, detail="Invalid staff member")
    
    # Basic compatibility check (can be enhanced with actual role/zone logic)
    compatibility_result = {
        "compatible": True,
        "match_level": "exact_match",
        "staff_role": staff.role,
        "required_role": "Any",  # This would come from zone configuration
        "skill_level_match": True,
        "override_required": False,
        "compatibility_score": 100,
        "warnings": [],
        "recommendations": []
    }
    
    # Add any role-specific logic here
    # For example, check if staff has required certifications, skill levels, etc.
    
    return compatibility_result

@router.get("/{swap_id}/available-actions")
async def get_available_swap_actions(
    swap_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get available actions for current user on this swap (NEW)"""
    
    swap_request = db.get(SwapRequest, swap_id)
    if not swap_request:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    # Verify access
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    available_actions = []
    
    # Determine available actions based on user role and swap status
    if current_user.is_manager:
        if swap_request.status == SwapStatus.PENDING:
            available_actions.extend(["approve", "decline", "update"])
        elif swap_request.status == SwapStatus.MANAGER_FINAL_APPROVAL:
            available_actions.extend(["final_approve", "final_decline"])
        elif swap_request.status == SwapStatus.ASSIGNMENT_FAILED:
            available_actions.extend(["retry_assignment", "manual_assign"])
        
        # Managers can always view details and history
        available_actions.extend(["view_details", "view_history", "view_analytics"])
        
        if swap_request.status in [SwapStatus.PENDING, SwapStatus.MANAGER_APPROVED]:
            available_actions.append("cancel")
    
    else:  # Staff user
        # Check if this staff member can respond
        if (swap_request.swap_type == "specific" and 
            swap_request.target_staff_id == current_user.id and 
            swap_request.status in [SwapStatus.PENDING, SwapStatus.MANAGER_APPROVED]):
            available_actions.extend(["accept", "decline"])
        
        elif (swap_request.swap_type == "auto" and 
              swap_request.assigned_staff_id == current_user.id and 
              swap_request.status == SwapStatus.POTENTIAL_ASSIGNMENT):
            available_actions.extend(["accept_assignment", "decline_assignment"])
        
        # Requesting staff can view and potentially cancel
        if swap_request.requesting_staff_id == current_user.id:
            available_actions.extend(["view_details", "view_history"])
            if swap_request.status == SwapStatus.PENDING:
                available_actions.extend(["update", "cancel"])
    
    return {
        "swap_id": str(swap_id),
        "current_status": swap_request.status.value,
        "available_actions": list(set(available_actions)),  # Remove duplicates
        "user_role": "manager" if current_user.is_manager else "staff",
        "can_execute": swap_request.status in [SwapStatus.STAFF_ACCEPTED, SwapStatus.MANAGER_FINAL_APPROVAL],
        "requires_manager_action": swap_request.status in [SwapStatus.PENDING, SwapStatus.MANAGER_FINAL_APPROVAL],
        "requires_staff_action": swap_request.status in [SwapStatus.MANAGER_APPROVED, SwapStatus.POTENTIAL_ASSIGNMENT]
    }

# ==================== NOTIFICATION TESTING ENDPOINT (DEVELOPMENT) ====================

@router.post("/{swap_id}/test-notifications")
async def test_swap_notifications(
    swap_id: UUID,
    notification_type: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Test notification sending for swap events (DEVELOPMENT ONLY)"""
    
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    swap_request = db.get(SwapRequest, swap_id)
    if not swap_request:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    notification_service = NotificationService(db)
    
    try:
        if notification_type == "creation":
            await send_swap_creation_notifications(
                swap_request=swap_request,
                notification_service=notification_service,
                db=db,
                background_tasks=background_tasks
            )
        else:
            return {"error": "Unsupported notification type"}
        
        return {"message": f"Test {notification_type} notifications sent successfully"}
        
    except Exception as e:
        return {"error": f"Failed to send test notifications: {str(e)}"}

# ==================== EXPORT ENDPOINTS (NEW) ====================

@router.get("/export/{facility_id}")
async def export_swap_data(
    facility_id: UUID,
    format: str = Query("excel", regex="^(excel|csv|pdf)$"),
    period_start: Optional[datetime] = Query(None),
    period_end: Optional[datetime] = Query(None),
    include_history: bool = Query(True),
    include_analytics: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export swap data for facility (NEW)"""
    
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    # Verify facility access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Set default period if not provided
    if not period_end:
        period_end = datetime.utcnow()
    if not period_start:
        period_start = period_end - timedelta(days=30)
    
    # Get swap data
    swap_requests = db.exec(
        select(SwapRequest)
        .join(Schedule)
        .where(
            Schedule.facility_id == facility_id,
            SwapRequest.created_at >= period_start,
            SwapRequest.created_at <= period_end
        )
        .order_by(SwapRequest.created_at.desc())
    ).all()
    
    # For now, return summary data (actual export implementation would depend on requirements)
    export_data = {
        "facility_name": facility.name,
        "export_period": {
            "start": period_start.isoformat(),
            "end": period_end.isoformat()
        },
        "total_records": len(swap_requests),
        "export_format": format,
        "includes_history": include_history,
        "includes_analytics": include_analytics,
        "generated_at": datetime.utcnow().isoformat(),
        "generated_by": current_user.email
    }
    
    # In a real implementation, you would:
    # 1. Generate the actual file (Excel/CSV/PDF)
    # 2. Store it temporarily or in cloud storage
    # 3. Return download URL
    
    return {
        "export_summary": export_data,
        "download_url": f"/downloads/swaps_{facility_id}_{period_start.strftime('%Y%m%d')}_{period_end.strftime('%Y%m%d')}.{format}",
        "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat()
    }

# ==================== HEALTH CHECK AND METRICS ====================

@router.get("/health")
async def swap_service_health_check(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Health check for swap service (NEW)"""
    
    try:
        # Check database connectivity
        db.exec(select(SwapRequest).limit(1))
        
        # Get basic metrics
        total_swaps = len(db.exec(select(SwapRequest)).all())
        pending_swaps = len(db.exec(select(SwapRequest).where(SwapRequest.status == SwapStatus.PENDING)).all())
        
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database_connected": True,
            "total_swaps_in_system": total_swaps,
            "pending_swaps": pending_swaps,
            "service_version": "2.0.0",
            "features": [
                "enhanced_workflow",
                "role_verification", 
                "bulk_operations",
                "analytics",
                "notifications"
            ]
        }
        
        return health_status
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e),
            "database_connected": False
        }

# ==================== EMERGENCY OVERRIDE ENDPOINTS ====================

@router.post("/{swap_id}/emergency-override")
async def emergency_override_swap(
    swap_id: UUID,
    override_reason: str = Query(...),
    assigned_staff_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Emergency override for swap execution (NEW)"""
    
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    swap_request = db.get(SwapRequest, swap_id)
    if not swap_request:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    # Verify access
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Apply emergency override
    if assigned_staff_id:
        swap_request.assigned_staff_id = assigned_staff_id
    
    swap_request.manager_final_approved = True
    swap_request.manager_final_approved_at = datetime.utcnow()
    swap_request.role_match_override = True
    swap_request.role_match_reason = f"Emergency override: {override_reason}"
    swap_request.manager_notes = f"EMERGENCY OVERRIDE: {override_reason}"
    
    # Execute immediately
    if swap_request.swap_type == "specific":
        _execute_specific_swap(db, swap_request)
    else:
        _execute_auto_assignment(db, swap_request)
    
    swap_request.status = SwapStatus.EXECUTED
    swap_request.completed_at = datetime.utcnow()
    
    # Create history entry
    history = SwapHistory(
        swap_request_id=swap_id,
        action="emergency_override",
        actor_staff_id=current_user.id,
        notes=f"Emergency override executed: {override_reason}",
        system_action=False,
        role_information={
            "override_applied": True,
            "override_reason": override_reason,
            "emergency_override": True
        }
    )
    
    db.add(swap_request)
    db.add(history)
    db.commit()
    db.refresh(swap_request)
    
    return {
        "message": "Emergency override executed successfully",
        "swap_id": str(swap_id),
        "new_status": swap_request.status.value,
        "override_reason": override_reason,
        "executed_at": swap_request.completed_at.isoformat()
    }

# ==================== SCHEDULED CLEANUP ENDPOINT ====================

@router.post("/cleanup/expired")
async def cleanup_expired_swaps(
    dry_run: bool = Query(True),
    days_old: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clean up expired and old swap requests (NEW)"""
    
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    cutoff_date = datetime.utcnow() - timedelta(days=days_old)
    
    # Find expired/old swaps
    expired_swaps = db.exec(
        select(SwapRequest).where(
            SwapRequest.created_at < cutoff_date,
            SwapRequest.status.in_([
                SwapStatus.DECLINED,
                SwapStatus.CANCELLED,
                SwapStatus.ASSIGNMENT_FAILED
            ])
        )
    ).all()
    
    # Also find swaps that have expired based on expires_at
    naturally_expired = db.exec(
        select(SwapRequest).where(
            SwapRequest.expires_at < datetime.utcnow(),
            SwapRequest.status == SwapStatus.PENDING
        )
    ).all()
    
    cleanup_summary = {
        "dry_run": dry_run,
        "cutoff_date": cutoff_date.isoformat(),
        "old_swaps_found": len(expired_swaps),
        "naturally_expired_found": len(naturally_expired),
        "total_to_cleanup": len(expired_swaps) + len(naturally_expired),
        "cleaned_up": 0 if dry_run else len(expired_swaps) + len(naturally_expired)
    }
    
    if not dry_run:
        # Update naturally expired swaps to cancelled
        for swap in naturally_expired:
            swap.status = SwapStatus.CANCELLED
            
            # Create history entry
            history = SwapHistory(
                swap_request_id=swap.id,
                action="auto_expired",
                actor_staff_id=None,
                notes="Automatically expired due to timeout",
                system_action=True
            )
            db.add(history)
        
        db.commit()
        cleanup_summary["message"] = f"Cleaned up {len(naturally_expired)} expired swaps"
    else:
        cleanup_summary["message"] = "Dry run completed - no changes made"
    
    return cleanup_summary

# ==================== FINAL ENDPOINT - SWAP STATISTICS ====================

@router.get("/statistics/global")
async def get_global_swap_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive global swap statistics (NEW)"""
    
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    # Get all swaps for tenant
    all_swaps = db.exec(
        select(SwapRequest)
        .join(Schedule)
        .join(Facility)
        .where(Facility.tenant_id == current_user.tenant_id)
    ).all()
    
    # Calculate comprehensive statistics
    total_swaps = len(all_swaps)
    if total_swaps == 0:
        return {"message": "No swap data available"}
    
    # Status distribution
    status_distribution = {}
    for status in SwapStatus:
        count = len([s for s in all_swaps if s.status == status])
        status_distribution[status.value] = {
            "count": count,
            "percentage": (count / total_swaps * 100) if total_swaps > 0 else 0
        }
    
    # Type distribution
    auto_swaps = len([s for s in all_swaps if s.swap_type == "auto"])
    specific_swaps = len([s for s in all_swaps if s.swap_type == "specific"])
    
    # Urgency distribution
    urgency_distribution = {}
    for urgency in ["low", "normal", "high", "emergency"]:
        count = len([s for s in all_swaps if s.urgency == urgency])
        urgency_distribution[urgency] = {
            "count": count,
            "percentage": (count / total_swaps * 100) if total_swaps > 0 else 0
        }
    
    # Success metrics
    successful_swaps = len([s for s in all_swaps if s.status == SwapStatus.EXECUTED])
    failed_swaps = len([s for s in all_swaps if s.status in [SwapStatus.DECLINED, SwapStatus.ASSIGNMENT_FAILED, SwapStatus.CANCELLED]])
    
    # Role override statistics
    role_overrides = len([s for s in all_swaps if s.role_match_override])
    
    # Time-based metrics
    today = datetime.utcnow().date()
    swaps_today = len([s for s in all_swaps if s.created_at.date() == today])
    swaps_this_week = len([s for s in all_swaps if s.created_at.date() >= (today - timedelta(days=7))])
    swaps_this_month = len([s for s in all_swaps if s.created_at.date() >= (today - timedelta(days=30))])
    
    return {
        "tenant_id": str(current_user.tenant_id),
        "generated_at": datetime.utcnow().isoformat(),
        "total_swaps": total_swaps,
        "status_distribution": status_distribution,
        "type_distribution": {
            "auto": {"count": auto_swaps, "percentage": (auto_swaps / total_swaps * 100)},
            "specific": {"count": specific_swaps, "percentage": (specific_swaps / total_swaps * 100)}
        },
        "urgency_distribution": urgency_distribution,
        "success_metrics": {
            "successful_swaps": successful_swaps,
            "failed_swaps": failed_swaps,
            "success_rate": (successful_swaps / total_swaps * 100) if total_swaps > 0 else 0,
            "failure_rate": (failed_swaps / total_swaps * 100) if total_swaps > 0 else 0
        },
        "role_statistics": {
            "total_overrides": role_overrides,
            "override_rate": (role_overrides / total_swaps * 100) if total_swaps > 0 else 0
        },
        "time_based_metrics": {
            "swaps_today": swaps_today,
            "swaps_this_week": swaps_this_week,
            "swaps_this_month": swaps_this_month
        },
        "data_quality": {
            "complete_records": len([s for s in all_swaps if s.reason and s.urgency]),
            "records_with_notes": len([s for s in all_swaps if s.manager_notes]),
            "records_with_timestamps": len([s for s in all_swaps if s.created_at])
        }
    }

@router.get("/facility/{facility_id}/summary", response_model=SwapSummary)
def get_swap_summary(
    facility_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get enhanced swap summary for facility dashboard (ENHANCED)"""
    
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    # Verify facility access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get all swap requests for facility
    base_query = select(SwapRequest).join(Schedule).where(Schedule.facility_id == facility_id)
    all_swaps = db.exec(base_query).all()
    
    # Calculate enhanced metrics
    pending_swaps = len([s for s in all_swaps if s.status == SwapStatus.PENDING])
    manager_approval_needed = len([s for s in all_swaps if s.status == SwapStatus.PENDING])
    potential_assignments = len([s for s in all_swaps if s.status == SwapStatus.POTENTIAL_ASSIGNMENT])
    staff_responses_needed = len([s for s in all_swaps if s.status == SwapStatus.MANAGER_APPROVED and s.swap_type == "specific"])
    manager_final_approval_needed = len([s for s in all_swaps if s.status == SwapStatus.MANAGER_FINAL_APPROVAL])
    
    urgent_swaps = len([s for s in all_swaps if s.status == SwapStatus.PENDING and s.urgency in ["high", "emergency"]])
    auto_swaps_needing_assignment = len([s for s in all_swaps if s.status == SwapStatus.MANAGER_APPROVED and s.swap_type == "auto"])
    specific_swaps_awaiting_response = len([s for s in all_swaps if s.status == SwapStatus.MANAGER_APPROVED and s.swap_type == "specific"])
    
    recent_completions = len([s for s in all_swaps if s.status == SwapStatus.EXECUTED and s.completed_at and s.completed_at >= datetime.utcnow() - timedelta(days=7)])
    
    # Role verification stats
    role_compatible_assignments = len([s for s in all_swaps if not s.role_match_override])
    role_override_assignments = len([s for s in all_swaps if s.role_match_override])
    failed_role_verifications = len([s for s in all_swaps if s.status == SwapStatus.ASSIGNMENT_FAILED])
    
    # Timing metrics
    completed_swaps = [s for s in all_swaps if s.completed_at and s.manager_approved_at]
    avg_approval_time = None
    if completed_swaps:
        approval_times = [(s.manager_approved_at - s.created_at).total_seconds() / 3600 for s in completed_swaps if s.manager_approved_at]
        avg_approval_time = sum(approval_times) / len(approval_times) if approval_times else None
    
    staff_responded_swaps = [s for s in all_swaps if s.staff_responded_at]
    avg_staff_response_time = None
    if staff_responded_swaps:
        response_times = [(s.staff_responded_at - s.created_at).total_seconds() / 3600 for s in staff_responded_swaps]
        avg_staff_response_time = sum(response_times) / len(response_times)
    
    pending_over_24h = len([s for s in all_swaps if s.status == SwapStatus.PENDING and s.created_at <= datetime.utcnow() - timedelta(hours=24)])
    
    return SwapSummary(
        facility_id=facility_id,
        pending_swaps=pending_swaps,
        manager_approval_needed=manager_approval_needed,
        potential_assignments=potential_assignments,
        staff_responses_needed=staff_responses_needed,
        manager_final_approval_needed=manager_final_approval_needed,
        urgent_swaps=urgent_swaps,
        auto_swaps_needing_assignment=auto_swaps_needing_assignment,
        specific_swaps_awaiting_response=specific_swaps_awaiting_response,
        recent_completions=recent_completions,
        role_compatible_assignments=role_compatible_assignments,
        role_override_assignments=role_override_assignments,
        failed_role_verifications=failed_role_verifications,
        average_approval_time_hours=avg_approval_time,
        average_staff_response_time_hours=avg_staff_response_time,
        pending_over_24h=pending_over_24h
    )


# ==================== COLLECTION ENDPOINTS (NEW) ====================

@router.get("/all", response_model=List[SwapRequestWithDetails])
def get_all_swap_requests(
    limit: int = Query(200, le=300),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return *all* swap requests the current user is allowed to see.
    Managers will receive every swap for their tenant, while
    staff will only receive the swaps they are directly involved in.
    Placed **before** the dynamic `/{swap_id}` route so the literal
    path segment `/all` is not swallowed by the UUID matcher.
    """
    return list_swap_requests(  # re‑use the existing helper
        db=db,
        current_user=current_user,
        facility_id=None,
        status=None,
        urgency=None,
        swap_type=None,
        limit=limit,
    )



# ==================== DASHBOARD SUMMARY ENDPOINTS (NEW) ====================


# ==================== UPDATE ENDPOINT (NEW) ====================

@router.put("/{swap_id}", response_model=SwapRequestRead)
async def update_swap_request(
    swap_id: UUID,
    update_data: SwapRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update swap request details (NEW)"""
    
    swap_request = db.get(SwapRequest, swap_id)
    if not swap_request:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    # Verify access - only requesting staff or managers can update
    if not current_user.is_manager and swap_request.requesting_staff_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Verify swap is still editable
    if swap_request.status not in [SwapStatus.PENDING]:
        raise HTTPException(status_code=400, detail="Swap request cannot be modified in current status")
    
    # Apply updates
    update_dict = update_data.dict(exclude_unset=True)
    for field, value in update_dict.items():
        if hasattr(swap_request, field):
            setattr(swap_request, field, value)
    
    # Create history entry
    history = SwapHistory(
        swap_request_id=swap_id,
        action="updated",
        actor_staff_id=current_user.id if not current_user.is_manager else None,
        notes=f"Swap request updated: {', '.join(update_dict.keys())}",
        system_action=False
    )
    
    db.add(swap_request)
    db.add(history)
    db.commit()
    db.refresh(swap_request)
    
    return swap_request

@router.delete("/{swap_id}")
async def cancel_swap_request(
    swap_id: UUID,
    reason: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel a swap request (NEW)"""
    
    swap_request = db.get(SwapRequest, swap_id)
    if not swap_request:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    # Verify access
    if not current_user.is_manager and swap_request.requesting_staff_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Verify swap can be cancelled
    if swap_request.status in [SwapStatus.EXECUTED]:
        raise HTTPException(status_code=400, detail="Cannot cancel executed swap")
    
    # Update status
    swap_request.status = SwapStatus.CANCELLED
    
    # Create history entry
    history = SwapHistory(
        swap_request_id=swap_id,
        action="cancelled",
        actor_staff_id=current_user.id if not current_user.is_manager else None,
        notes=reason or "Swap request cancelled",
        system_action=False
    )
    
    db.add(swap_request)
    db.add(history)
    db.commit()
    
    return {"message": "Swap request cancelled successfully"}

# ==================== EXISTING ENDPOINTS (KEPT FOR COMPATIBILITY) ====================

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

@router.get("/{swap_id}", response_model=SwapRequestWithDetails)
def get_swap_request(
    swap_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single swap request by ID"""
    
    swap_request = db.get(SwapRequest, swap_id)
    if not swap_request:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    # Verify access
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Load related staff data
    requesting_staff = db.get(Staff, swap_request.requesting_staff_id)
    target_staff = db.get(Staff, swap_request.target_staff_id) if swap_request.target_staff_id else None
    assigned_staff = db.get(Staff, swap_request.assigned_staff_id) if swap_request.assigned_staff_id else None
    
    # Convert to dict and create SwapRequestWithDetails
    swap_data = swap_request.dict()
    swap_data["requesting_staff"] = requesting_staff.dict() if requesting_staff else None
    swap_data["target_staff"] = target_staff.dict() if target_staff else None
    swap_data["assigned_staff"] = assigned_staff.dict() if assigned_staff else None
    
    # Add role names
    swap_data["original_shift_role_name"] = requesting_staff.role if requesting_staff else None
    swap_data["target_staff_role_name"] = target_staff.role if target_staff else None
    swap_data["assigned_staff_role_name"] = assigned_staff.role if assigned_staff else None
    
    # Add facility info
    swap_data["facility_id"] = str(facility.id)
    swap_data["facility_name"] = facility.name
    
    return SwapRequestWithDetails(**swap_data)

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
        db.add(original_assignment)

# ==================== EXISTING ANALYTICS ENDPOINTS (ENHANCED) ====================

@router.get("/analytics/top-requesters/{facility_id}")
def get_top_requesting_staff(
    facility_id: UUID,
    days: int = Query(30, le=180),
    limit: int = Query(10, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get staff members who request swaps most frequently"""
    
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    # Verify facility access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get cutoff date
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Query swap requests for this facility in the time period
    swap_requests = db.exec(
        select(SwapRequest, Staff)
        .join(Schedule, SwapRequest.schedule_id == Schedule.id)
        .join(Staff, SwapRequest.requesting_staff_id == Staff.id)
        .where(
            Schedule.facility_id == facility_id,
            SwapRequest.created_at >= cutoff_date
        )
    ).all()
    
    # Aggregate data by staff
    staff_stats = defaultdict(lambda: {
        'staff_id': None,
        'staff_name': '',
        'role': '',
        'total_requests': 0,
        'approved_requests': 0,
        'declined_requests': 0,
        'pending_requests': 0,
        'success_rate': 0.0,
        'avg_urgency_score': 0.0,
        'most_common_reason': ''
    })
    
    urgency_scores = {'low': 1, 'normal': 2, 'high': 3, 'emergency': 4}
    staff_reasons = defaultdict(list)
    
    for swap_request, staff in swap_requests:
        staff_id = staff.id
        staff_stats[staff_id]['staff_id'] = str(staff_id)
        staff_stats[staff_id]['staff_name'] = staff.full_name
        staff_stats[staff_id]['role'] = staff.role
        staff_stats[staff_id]['total_requests'] += 1
        
        # Count by status using enum values
        if swap_request.status in [SwapStatus.EXECUTED, SwapStatus.STAFF_ACCEPTED]:
            staff_stats[staff_id]['approved_requests'] += 1
        elif swap_request.status in [SwapStatus.DECLINED, SwapStatus.STAFF_DECLINED]:
            staff_stats[staff_id]['declined_requests'] += 1
        else:
            staff_stats[staff_id]['pending_requests'] += 1
        
        # Track urgency
        staff_stats[staff_id]['avg_urgency_score'] += urgency_scores.get(swap_request.urgency, 2)
        
        # Track reasons
        staff_reasons[staff_id].append(swap_request.reason)
    
    # Calculate derived metrics
    result = []
    for staff_id, stats in staff_stats.items():
        if stats['total_requests'] > 0:
            stats['success_rate'] = (stats['approved_requests'] / stats['total_requests']) * 100
            stats['avg_urgency_score'] = stats['avg_urgency_score'] / stats['total_requests']
            
            # Find most common reason
            if staff_reasons[staff_id]:
                reason_counter = Counter(staff_reasons[staff_id])
                stats['most_common_reason'] = reason_counter.most_common(1)[0][0]
            
            result.append(stats)
    
    # Sort by total requests and limit
    result.sort(key=lambda x: x['total_requests'], reverse=True)
    
    return {
        "facility_id": str(facility_id),
        "period_days": days,
        "top_requesters": result[:limit],
        "summary": {
            "total_unique_requesters": len(result),
            "total_requests_period": sum(s['total_requests'] for s in result),
            "avg_success_rate": sum(s['success_rate'] for s in result) / len(result) if result else 0
        }
    }

@router.get("/analytics/reasons/{facility_id}")
def get_swap_reasons_analysis(
    facility_id: UUID,
    days: int = Query(30, le=180),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Analyze most common reasons for swap requests"""
    
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    # Verify facility access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get cutoff date
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Query swap requests for this facility
    swap_requests = db.exec(
        select(SwapRequest)
        .join(Schedule, SwapRequest.schedule_id == Schedule.id)
        .where(
            Schedule.facility_id == facility_id,
            SwapRequest.created_at >= cutoff_date
        )
    ).all()
    
    if not swap_requests:
        return {
            "facility_id": str(facility_id),
            "period_days": days,
            "reason_analysis": [],
            "summary": {"total_requests": 0, "unique_reasons": 0}
        }
    
    # Analyze reasons
    reason_counter = Counter()
    reason_urgency = defaultdict(list)
    reason_success = defaultdict(lambda: {'approved': 0, 'total': 0})
    
    for swap in swap_requests:
        reason = swap.reason.strip()
        reason_counter[reason] += 1
        reason_urgency[reason].append(swap.urgency)
        
        reason_success[reason]['total'] += 1
        if swap.status in [SwapStatus.EXECUTED, SwapStatus.STAFF_ACCEPTED]:
            reason_success[reason]['approved'] += 1
    
    # Build result
    reason_analysis = []
    for reason, count in reason_counter.most_common():
        urgency_counts = Counter(reason_urgency[reason])
        success_rate = (reason_success[reason]['approved'] / reason_success[reason]['total']) * 100
        
        reason_analysis.append({
            "reason": reason,
            "count": count,
            "percentage": (count / len(swap_requests)) * 100,
            "success_rate": success_rate,
            "urgency_breakdown": dict(urgency_counts),
            "most_common_urgency": urgency_counts.most_common(1)[0][0] if urgency_counts else "normal"
        })
    
    return {
        "facility_id": str(facility_id),
        "period_days": days,
        "reason_analysis": reason_analysis,
        "summary": {
            "total_requests": len(swap_requests),
            "unique_reasons": len(reason_counter),
            "avg_success_rate": sum(r['success_rate'] for r in reason_analysis) / len(reason_analysis) if reason_analysis else 0
        }
    }

@router.get("/analytics/staff-performance/{facility_id}")
def get_staff_performance_metrics(
    facility_id: UUID,
    days: int = Query(30, le=180),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get staff performance metrics for swaps"""
    
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    # Verify facility access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Get all swap requests where staff were targets or assigned
    target_swaps = db.exec(
        select(SwapRequest, Staff)
        .join(Schedule, SwapRequest.schedule_id == Schedule.id)
        .join(Staff, SwapRequest.target_staff_id == Staff.id)
        .where(
            Schedule.facility_id == facility_id,
            SwapRequest.swap_type == "specific",
            SwapRequest.created_at >= cutoff_date,
            SwapRequest.target_staff_id.is_not(None)
        )
    ).all()
    
    assigned_swaps = db.exec(
        select(SwapRequest, Staff)
        .join(Schedule, SwapRequest.schedule_id == Schedule.id)
        .join(Staff, SwapRequest.assigned_staff_id == Staff.id)
        .where(
            Schedule.facility_id == facility_id,
            SwapRequest.swap_type == "auto",
            SwapRequest.created_at >= cutoff_date,
            SwapRequest.assigned_staff_id.is_not(None)
        )
    ).all()
    
    # Calculate performance metrics
    staff_performance = defaultdict(lambda: {
        'staff_id': None,
        'staff_name': '',
        'role': '',
        'times_requested_as_target': 0,
        'times_accepted_target': 0,
        'times_assigned_auto': 0,
        'times_completed_auto': 0,
        'target_acceptance_rate': 0.0,
        'auto_completion_rate': 0.0,
        'overall_helpfulness_score': 0.0,
        'avg_response_time_hours': 0.0
    })
    
    # Process target swaps (specific)
    for swap, staff in target_swaps:
        staff_id = staff.id
        staff_performance[staff_id]['staff_id'] = str(staff_id)
        staff_performance[staff_id]['staff_name'] = staff.full_name
        staff_performance[staff_id]['role'] = staff.role
        staff_performance[staff_id]['times_requested_as_target'] += 1
        
        if swap.target_staff_accepted:
            staff_performance[staff_id]['times_accepted_target'] += 1
    
    # Process auto assignments
    for swap, staff in assigned_swaps:
        staff_id = staff.id
        if staff_id not in staff_performance:
            staff_performance[staff_id]['staff_id'] = str(staff_id)
            staff_performance[staff_id]['staff_name'] = staff.full_name
            staff_performance[staff_id]['role'] = staff.role
        
        staff_performance[staff_id]['times_assigned_auto'] += 1
        
        if swap.status == SwapStatus.EXECUTED:
            staff_performance[staff_id]['times_completed_auto'] += 1
    
    # Calculate rates and scores
    result = []
    for staff_id, perf in staff_performance.items():
        if perf['times_requested_as_target'] > 0:
            perf['target_acceptance_rate'] = (perf['times_accepted_target'] / perf['times_requested_as_target']) * 100
        
        if perf['times_assigned_auto'] > 0:
            perf['auto_completion_rate'] = (perf['times_completed_auto'] / perf['times_assigned_auto']) * 100
        
        # Overall helpfulness score (weighted combination)
        total_opportunities = perf['times_requested_as_target'] + perf['times_assigned_auto']
        if total_opportunities > 0:
            total_helped = perf['times_accepted_target'] + perf['times_completed_auto']
            perf['overall_helpfulness_score'] = (total_helped / total_opportunities) * 100
            result.append(perf)
    
    # Sort by helpfulness score
    result.sort(key=lambda x: x['overall_helpfulness_score'], reverse=True)
    
    return {
        "facility_id": str(facility_id),
        "period_days": days,
        "staff_performance": result,
        "summary": {
            "total_staff_analyzed": len(result),
            "avg_target_acceptance_rate": sum(s['target_acceptance_rate'] for s in result) / len(result) if result else 0,
            "avg_auto_completion_rate": sum(s['auto_completion_rate'] for s in result) / len(result) if result else 0,
            "most_helpful_staff": result[0]['staff_name'] if result else None
        }
    }

@router.get("/analytics/problem-patterns/{facility_id}")
def get_problem_patterns(
    facility_id: UUID,
    days: int = Query(30, le=180),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Identify problematic patterns in swap requests"""
    
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    # Verify facility access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Get swap requests with staff data
    swap_requests = db.exec(
        select(SwapRequest, Staff)
        .join(Schedule, SwapRequest.schedule_id == Schedule.id)
        .join(Staff, SwapRequest.requesting_staff_id == Staff.id)
        .where(
            Schedule.facility_id == facility_id,
            SwapRequest.created_at >= cutoff_date
        )
    ).all()
    
    # Analyze patterns
    high_frequency_requesters = []
    frequent_emergency_users = []
    low_success_staff = []
    
    staff_stats = defaultdict(lambda: {
        'name': '', 'role': '', 'total': 0, 'emergency': 0, 
        'approved': 0, 'success_rate': 0
    })
    
    for swap, staff in swap_requests:
        staff_id = staff.id
        staff_stats[staff_id]['name'] = staff.full_name
        staff_stats[staff_id]['role'] = staff.role
        staff_stats[staff_id]['total'] += 1
        
        if swap.urgency == 'emergency':
            staff_stats[staff_id]['emergency'] += 1
        
        if swap.status in [SwapStatus.EXECUTED, SwapStatus.STAFF_ACCEPTED]:
            staff_stats[staff_id]['approved'] += 1
    
    # Calculate rates and identify problems
    for staff_id, stats in staff_stats.items():
        stats['success_rate'] = (stats['approved'] / stats['total']) * 100 if stats['total'] > 0 else 0
        
        # High frequency (>5 requests in period)
        if stats['total'] > 5:
            high_frequency_requesters.append({
                'staff_name': stats['name'],
                'role': stats['role'],
                'total_requests': stats['total'],
                'success_rate': stats['success_rate']
            })
        
        # Frequent emergency users (>2 emergency requests)
        if stats['emergency'] > 2:
            frequent_emergency_users.append({
                'staff_name': stats['name'],
                'role': stats['role'],
                'emergency_requests': stats['emergency'],
                'total_requests': stats['total'],
                'emergency_rate': (stats['emergency'] / stats['total']) * 100
            })
        
        # Low success rate (<50%)
        if stats['total'] >= 3 and stats['success_rate'] < 50:
            low_success_staff.append({
                'staff_name': stats['name'],
                'role': stats['role'],
                'success_rate': stats['success_rate'],
                'total_requests': stats['total']
            })
    
    return {
        "facility_id": str(facility_id),
        "period_days": days,
        "problem_patterns": {
            "high_frequency_requesters": sorted(high_frequency_requesters, 
                                              key=lambda x: x['total_requests'], reverse=True),
            "frequent_emergency_users": sorted(frequent_emergency_users, 
                                             key=lambda x: x['emergency_requests'], reverse=True),
            "low_success_staff": sorted(low_success_staff, 
                                      key=lambda x: x['success_rate'])
        },
        "recommendations": {
            "high_frequency_attention": len(high_frequency_requesters),
            "emergency_pattern_review": len(frequent_emergency_users),
            "success_rate_coaching": len(low_success_staff)
        }
    }

# ==================== GLOBAL SUMMARY ENDPOINTS ====================
@router.get("/facilities-summary")
def get_facilities_swap_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get swap summary for all facilities (ENHANCED)"""
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    facilities = db.exec(
        select(Facility).where(Facility.tenant_id == current_user.tenant_id)
    ).all()
    
    result = []
    for facility in facilities:
        # Get swap requests for this facility
        base_query = select(SwapRequest).join(Schedule).where(Schedule.facility_id == facility.id)
        facility_swaps = db.exec(base_query).all()
        
        # Enhanced metrics using enum statuses
        pending_swaps = len([s for s in facility_swaps if s.status == SwapStatus.PENDING])
        urgent_swaps = len([s for s in facility_swaps if s.status == SwapStatus.PENDING and s.urgency in ["high", "emergency"]])
        emergency_swaps = len([s for s in facility_swaps if s.status == SwapStatus.PENDING and s.urgency == "emergency"])
        potential_assignments = len([s for s in facility_swaps if s.status == SwapStatus.POTENTIAL_ASSIGNMENT])
        awaiting_final_approval = len([s for s in facility_swaps if s.status == SwapStatus.MANAGER_FINAL_APPROVAL])
        
        recent_completions = len([s for s in facility_swaps if s.status == SwapStatus.EXECUTED and s.completed_at and s.completed_at >= datetime.utcnow() - timedelta(days=7)])
        
        # Role statistics
        role_overrides = len([s for s in facility_swaps if s.role_match_override])
        role_compatible = len([s for s in facility_swaps if not s.role_match_override and s.status == SwapStatus.EXECUTED])
        
        # Get staff count
        staff_count = len(db.exec(
            select(Staff).where(Staff.facility_id == facility.id, Staff.is_active == True)
        ).all())
        
        result.append({
            "facility_id": str(facility.id),
            "facility_name": facility.name,
            "facility_type": getattr(facility, 'facility_type', 'hotel'),
            "pending_swaps": pending_swaps,
            "urgent_swaps": urgent_swaps,
            "emergency_swaps": emergency_swaps,
            "potential_assignments": potential_assignments,
            "awaiting_final_approval": awaiting_final_approval,
            "recent_completions": recent_completions,
            "role_overrides": role_overrides,
            "role_compatible": role_compatible,
            "staff_count": staff_count
        })
    
    return result

@router.get("/all")
def get_all_swap_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(100, le=200),
):
    """Get all swap requests across facilities (ENHANCED)"""
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    # Get all swap requests for this tenant
    query = (
        select(SwapRequest)
        .join(Schedule)
        .join(Facility)
        .where(Facility.tenant_id == current_user.tenant_id)
        .order_by(SwapRequest.created_at.desc())
        .limit(limit)
    )
    
    swap_requests = db.exec(query).all()
    
    # Load related data for each swap
    result = []
    for swap in swap_requests:
        requesting_staff = db.get(Staff, swap.requesting_staff_id)
        target_staff = db.get(Staff, swap.target_staff_id) if swap.target_staff_id else None
        assigned_staff = db.get(Staff, swap.assigned_staff_id) if swap.assigned_staff_id else None
        
        # Get facility info
        schedule = db.get(Schedule, swap.schedule_id)
        facility = db.get(Facility, schedule.facility_id) if schedule else None
        
        swap_dict = {
            **swap.__dict__,
            "requesting_staff": requesting_staff.__dict__ if requesting_staff else None,
            "target_staff": target_staff.__dict__ if target_staff else None,
            "assigned_staff": assigned_staff.__dict__ if assigned_staff else None,
            "facility_id": str(facility.id) if facility else None,
            "facility_name": facility.name if facility else None,
            "status": swap.status.value if isinstance(swap.status, SwapStatus) else swap.status  # Ensure string output
        }
        
        result.append(swap_dict)
    
    return result

# ==================== RETRY AND RECOVERY ENDPOINTS ====================

@router.post("/{swap_id}/retry-auto-assignment", response_model=AutoAssignmentResult)
async def retry_auto_assignment(
    swap_id: UUID,
    avoid_staff_ids: List[UUID] = Query(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Retry automatic assignment with different parameters (ENHANCED)"""
    
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
    
    # Verify status allows retry
    if swap_request.status not in [SwapStatus.ASSIGNMENT_FAILED, SwapStatus.ASSIGNMENT_DECLINED]:
        raise HTTPException(status_code=400, detail="Swap not eligible for retry")
    
    # Clear previous assignment
    swap_request.assigned_staff_id = None
    swap_request.assigned_staff_accepted = None
    
    # Retry assignment
    try:
        result = assign_swap_coverage(db, swap_request, avoid_staff_ids=avoid_staff_ids)
        
        if result.success:
            swap_request.assigned_staff_id = result.assigned_staff_id
            swap_request.status = SwapStatus.POTENTIAL_ASSIGNMENT
            
            # Create history
            history = SwapHistory(
                swap_request_id=swap_id,
                action="auto_assigned_retry",
                actor_staff_id=current_user.id,
                notes=f"Retry auto-assigned to {result.assigned_staff_name}",
                system_action=False
            )
            db.add(history)
            db.commit()
            
            # Send notifications for new assignment
            notification_service = NotificationService(db)
            # Add notification logic here if needed
            
        else:
            swap_request.status = SwapStatus.ASSIGNMENT_FAILED
            swap_request.manager_notes = f"Retry failed: {result.reason}"
            
            # Create failure history
            history = SwapHistory(
                swap_request_id=swap_id,
                action="auto_assignment_retry_failed",
                actor_staff_id=current_user.id,
                notes=f"Retry failed: {result.reason}",
                system_action=False
            )
            db.add(history)
            db.commit()
            
    except Exception as e:
        result = AutoAssignmentResult(
            success=False,
            reason=f"Retry error: {str(e)}"
        )
        swap_request.status = SwapStatus.ASSIGNMENT_FAILED
        db.commit()
    
    return result