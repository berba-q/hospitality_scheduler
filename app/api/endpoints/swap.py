# app/api/endpoints/swaps.py
"""Swaps endpoint with comprehensive notifications"""
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
    Staff, Facility, User
)
from ...schemas import (
    SpecificSwapRequestCreate, AutoSwapRequestCreate, SwapRequestCreate, SwapRequestRead,
    SwapRequestWithDetails, ManagerSwapDecision, StaffSwapResponse,
    AutoAssignmentResult, SwapStatus, SwapSummary, SwapHistoryRead, SwapRequestUpdate
)
from ...services.swap_service import assign_swap_coverage

router = APIRouter(prefix="/swaps", tags=["emergency-swaps"])

# ==================== COMPREHENSIVE NOTIFICATION HELPERS ====================

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
            # 1. Notify target staff member
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
                    print(f"Specific swap notification sent to {target_staff.full_name}")
            
            # 2. Notify managers of specific swap request
            await _notify_managers_of_swap_request(swap_request, notification_service, db, background_tasks, base_template_data)
        
        elif swap_request.swap_type == "auto":
            # 1. Notify managers of auto coverage request  
            await _notify_managers_of_coverage_request(swap_request, notification_service, db, background_tasks, base_template_data)
        
        # 3. Send confirmation to requesting staff
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
        print(f"Confirmation sent to requester {requesting_staff.full_name}")
        
    except Exception as e:
        print(f"Failed to send swap creation notifications: {e}")

async def send_manager_decision_notifications(
    swap_request: SwapRequest,
    decision_approved: bool,
    manager_notes: str,
    notification_service: NotificationService,
    db: Session,
    background_tasks: BackgroundTasks
):
    """Send notifications when manager makes a decision on swap request"""
    
    requesting_staff = db.get(Staff, swap_request.requesting_staff_id)
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id) if schedule else None
    
    if not requesting_staff or not facility:
        return
    
    base_template_data = {
        'requester_name': requesting_staff.full_name,
        'facility_name': facility.name,
        'original_day': _get_day_name(swap_request.original_day),
        'original_shift': _get_shift_name(swap_request.original_shift),
        'reason': swap_request.reason,
        'manager_notes': manager_notes or '',
        'approver_name': 'Manager'
    }
    
    try:
        if decision_approved:
            # Manager approved the request
            notification_type = NotificationType.SWAP_APPROVED
            action_text = "View Approved Request"
            
            if swap_request.swap_type == "specific":
                # For specific swaps, notify target staff that manager approved
                if swap_request.target_staff_id:
                    target_staff = db.get(Staff, swap_request.target_staff_id)
                    if target_staff:
                        await notification_service.send_notification(
                            notification_type=NotificationType.SWAP_APPROVED,
                            recipient_user_id=target_staff.id,
                            template_data={
                                **base_template_data,
                                'target_name': target_staff.full_name,
                                'message': f"Manager approved the swap request from {requesting_staff.full_name}. Please respond."
                            },
                            channels=['IN_APP', 'PUSH', 'WHATSAPP'],
                            priority=NotificationPriority.HIGH,
                            action_url=f"/swaps/{swap_request.id}/respond",
                            action_text="Respond Now",
                            background_tasks=background_tasks
                        )
                        print(f"Manager approval notification sent to target {target_staff.full_name}")
            
            elif swap_request.swap_type == "auto":
                # For auto swaps, notify that coverage assignment is in progress
                base_template_data['message'] = "Manager approved your coverage request. Finding replacement..."
                action_text = "View Coverage Status"
                
        else:
            # Manager declined the request
            notification_type = NotificationType.SWAP_DENIED
            action_text = "View Declined Request"
            base_template_data['message'] = f"Your swap request was declined. {manager_notes}"
        
        # Notify requesting staff of manager decision
        await notification_service.send_notification(
            notification_type=notification_type,
            recipient_user_id=requesting_staff.id,
            template_data=base_template_data,
            channels=['IN_APP', 'PUSH', 'WHATSAPP'],
            priority=NotificationPriority.HIGH,
            action_url=f"/swaps/{swap_request.id}",
            action_text=action_text,
            background_tasks=background_tasks
        )
        print(f"Manager decision notification sent to {requesting_staff.full_name}")
        
    except Exception as e:
        print(f"Failed to send manager decision notifications: {e}")

async def send_staff_response_notifications(
    swap_request: SwapRequest,
    staff_accepted: bool,
    response_notes: str,
    responding_staff_id: UUID,
    notification_service: NotificationService,
    db: Session,
    background_tasks: BackgroundTasks
):
    """Send notifications when staff responds to a swap request"""
    
    requesting_staff = db.get(Staff, swap_request.requesting_staff_id)
    responding_staff = db.get(Staff, responding_staff_id)
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id) if schedule else None
    
    if not requesting_staff or not responding_staff or not facility:
        return
    
    base_template_data = {
        'requester_name': requesting_staff.full_name,
        'target_name': responding_staff.full_name,
        'facility_name': facility.name,
        'original_day': _get_day_name(swap_request.original_day),
        'original_shift': _get_shift_name(swap_request.original_shift),
        'reason': swap_request.reason,
        'response_notes': response_notes or ''
    }
    
    try:
        if staff_accepted:
            # Staff accepted the swap/assignment
            if swap_request.swap_type == "specific":
                message = f"{responding_staff.full_name} accepted your swap request! The schedule will be updated."
                notification_type = NotificationType.SWAP_APPROVED
            else:  # auto assignment
                message = f"{responding_staff.full_name} accepted the coverage assignment. Your shift is covered!"
                notification_type = NotificationType.SWAP_APPROVED
            
            action_text = "View Updated Schedule"
            priority = NotificationPriority.HIGH
            
        else:
            # Staff declined the swap/assignment
            if swap_request.swap_type == "specific":
                message = f"{responding_staff.full_name} declined your swap request. {response_notes}"
                notification_type = NotificationType.SWAP_DENIED
            else:  # auto assignment declined
                message = f"{responding_staff.full_name} declined the coverage assignment. Looking for alternatives..."
                notification_type = NotificationType.SWAP_DENIED
            
            action_text = "View Request Status"
            priority = NotificationPriority.MEDIUM
        
        # Notify requesting staff of the response
        await notification_service.send_notification(
            notification_type=notification_type,
            recipient_user_id=requesting_staff.id,
            template_data={**base_template_data, 'message': message},
            channels=['IN_APP', 'PUSH', 'WHATSAPP'],
            priority=priority,
            action_url=f"/swaps/{swap_request.id}",
            action_text=action_text,
            background_tasks=background_tasks
        )
        print(f"Staff response notification sent to {requesting_staff.full_name}")
        
        # Notify managers of staff response
        await _notify_managers_of_staff_response(
            swap_request, staff_accepted, responding_staff, 
            notification_service, db, background_tasks, base_template_data
        )
        
    except Exception as e:
        print(f"Failed to send staff response notifications: {e}")

async def send_auto_assignment_notifications(
    swap_request: SwapRequest,
    assigned_staff_id: UUID,
    notification_service: NotificationService,
    db: Session,
    background_tasks: BackgroundTasks
):
    """Send notifications when auto-assignment is made"""
    
    requesting_staff = db.get(Staff, swap_request.requesting_staff_id)
    assigned_staff = db.get(Staff, assigned_staff_id)
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id) if schedule else None
    
    if not requesting_staff or not assigned_staff or not facility:
        return
    
    base_template_data = {
        'requester_name': requesting_staff.full_name,
        'target_name': assigned_staff.full_name,
        'facility_name': facility.name,
        'original_day': _get_day_name(swap_request.original_day),
        'original_shift': _get_shift_name(swap_request.original_shift),
        'reason': swap_request.reason
    }
    
    try:
        # 1. Notify assigned staff of their assignment
        await notification_service.send_notification(
            notification_type=NotificationType.EMERGENCY_COVERAGE,
            recipient_user_id=assigned_staff.id,
            template_data={
                **base_template_data,
                'message': f"You've been assigned to cover {requesting_staff.full_name}'s shift on {_get_day_name(swap_request.original_day)}."
            },
            channels=['IN_APP', 'PUSH', 'WHATSAPP'],
            priority=NotificationPriority.HIGH,
            action_url=f"/swaps/{swap_request.id}/respond",
            action_text="Accept or Decline Assignment",
            background_tasks=background_tasks
        )
        print(f"Auto-assignment notification sent to {assigned_staff.full_name}")
        
        # 2. Notify requesting staff that coverage has been assigned
        await notification_service.send_notification(
            notification_type=NotificationType.SWAP_APPROVED,
            recipient_user_id=requesting_staff.id,
            template_data={
                **base_template_data,
                'message': f"Good news! {assigned_staff.full_name} has been assigned to cover your shift. Waiting for their confirmation."
            },
            channels=['IN_APP', 'PUSH'],
            priority=NotificationPriority.MEDIUM,
            action_url=f"/swaps/{swap_request.id}",
            action_text="View Assignment Status",
            background_tasks=background_tasks
        )
        print(f"Assignment update sent to {requesting_staff.full_name}")
        
    except Exception as e:
        print(f"Failed to send auto-assignment notifications: {e}")

async def send_swap_completion_notifications(
    swap_request: SwapRequest,
    notification_service: NotificationService,
    db: Session,
    background_tasks: BackgroundTasks
):
    """Send notifications when swap is completed/executed"""
    
    requesting_staff = db.get(Staff, swap_request.requesting_staff_id)
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id) if schedule else None
    
    if not requesting_staff or not facility:
        return
    
    base_template_data = {
        'requester_name': requesting_staff.full_name,
        'facility_name': facility.name,
        'original_day': _get_day_name(swap_request.original_day),
        'original_shift': _get_shift_name(swap_request.original_shift),
        'week_start': schedule.week_start.strftime('%B %d, %Y') if schedule else 'this week'
    }
    
    try:
        # Determine who else to notify based on swap type
        other_staff = None
        if swap_request.swap_type == "specific" and swap_request.target_staff_id:
            other_staff = db.get(Staff, swap_request.target_staff_id)
        elif swap_request.swap_type == "auto" and swap_request.assigned_staff_id:
            other_staff = db.get(Staff, swap_request.assigned_staff_id)
        
        # 1. Notify requesting staff
        await notification_service.send_notification(
            notification_type=NotificationType.SCHEDULE_CHANGE,
            recipient_user_id=requesting_staff.id,
            template_data={
                **base_template_data,
                'target_name': requesting_staff.full_name,
                'message': f"Your swap request has been completed! Your schedule has been updated."
            },
            channels=['IN_APP', 'PUSH'],
            priority=NotificationPriority.MEDIUM,
            action_url=f"/schedule?week={schedule.week_start.isoformat()}" if schedule else "/schedule",
            action_text="View Updated Schedule",
            background_tasks=background_tasks
        )
        print(f"Completion notification sent to {requesting_staff.full_name}")
        
        # 2. Notify the other staff member involved
        if other_staff:
            await notification_service.send_notification(
                notification_type=NotificationType.SCHEDULE_CHANGE,
                recipient_user_id=other_staff.id,
                template_data={
                    **base_template_data,
                    'target_name': other_staff.full_name,
                    'message': f"Swap with {requesting_staff.full_name} is complete! Your schedule has been updated."
                },
                channels=['IN_APP', 'PUSH'],
                priority=NotificationPriority.MEDIUM,
                action_url=f"/schedule?week={schedule.week_start.isoformat()}" if schedule else "/schedule",
                action_text="View Updated Schedule",
                background_tasks=background_tasks
            )
            print(f"Completion notification sent to {other_staff.full_name}")
        
        # 3. Notify managers of completion
        await _notify_managers_of_swap_completion(
            swap_request, notification_service, db, background_tasks, base_template_data
        )
        
    except Exception as e:
        print(f"Failed to send swap completion notifications: {e}")

async def send_assignment_failure_notifications(
    swap_request: SwapRequest,
    failure_reason: str,
    notification_service: NotificationService,
    db: Session,
    background_tasks: BackgroundTasks
):
    """Send notifications when auto-assignment fails"""
    
    requesting_staff = db.get(Staff, swap_request.requesting_staff_id)
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id) if schedule else None
    
    if not requesting_staff or not facility:
        return
    
    base_template_data = {
        'requester_name': requesting_staff.full_name,
        'facility_name': facility.name,
        'original_day': _get_day_name(swap_request.original_day),
        'original_shift': _get_shift_name(swap_request.original_shift),
        'reason': swap_request.reason,
        'failure_reason': failure_reason
    }
    
    try:
        # Notify requesting staff of assignment failure
        await notification_service.send_notification(
            notification_type=NotificationType.EMERGENCY_COVERAGE,
            recipient_user_id=requesting_staff.id,
            template_data={
                **base_template_data,
                'target_name': requesting_staff.full_name,
                'message': f"Unable to find automatic coverage for your shift. Reason: {failure_reason}. Please contact your manager."
            },
            channels=['IN_APP', 'PUSH', 'WHATSAPP'],
            priority=NotificationPriority.HIGH,
            action_url=f"/swaps/{swap_request.id}",
            action_text="View Request Details",
            background_tasks=background_tasks
        )
        print(f"Assignment failure notification sent to {requesting_staff.full_name}")
        
        # Notify managers of assignment failure
        await _notify_managers_of_assignment_failure(
            swap_request, failure_reason, notification_service, db, background_tasks, base_template_data
        )
        
    except Exception as e:
        print(f"Failed to send assignment failure notifications: {e}")

# ==================== HELPER FUNCTIONS ====================

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

async def _notify_managers_of_coverage_request(
    swap_request: SwapRequest,
    notification_service: NotificationService,
    db: Session,
    background_tasks: BackgroundTasks,
    base_template_data: Dict[str, Any]
):
    """Notify managers of auto coverage requests"""
    
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id) if schedule else None
    
    if not facility:
        return
    
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
                notification_type=NotificationType.EMERGENCY_COVERAGE,
                recipient_user_id=manager.id,
                template_data={
                    **base_template_data,
                    'target_name': 'Manager',
                    'message': f"Coverage request from {base_template_data['requester_name']} needs immediate attention"
                },
                channels=['IN_APP', 'PUSH', 'WHATSAPP'],
                priority=NotificationPriority.HIGH,
                action_url=f"/swaps/{swap_request.id}/manage",
                action_text="Assign Coverage",
                background_tasks=background_tasks
            )
        except Exception as e:
            print(f"Failed to notify manager {manager.email}: {e}")

async def _notify_managers_of_staff_response(
    swap_request: SwapRequest,
    staff_accepted: bool,
    responding_staff: Staff,
    notification_service: NotificationService,
    db: Session,
    background_tasks: BackgroundTasks,
    base_template_data: Dict[str, Any]
):
    """Notify managers when staff responds to swap requests"""
    
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id) if schedule else None
    
    if not facility:
        return
    
    managers = db.exec(
        select(User).join(Staff).where(
            Staff.facility_id == facility.id,
            User.is_manager == True,
            User.is_active == True
        )
    ).all()
    
    action = "accepted" if staff_accepted else "declined"
    priority = NotificationPriority.MEDIUM if staff_accepted else NotificationPriority.HIGH
    
    for manager in managers:
        try:
            await notification_service.send_notification(
                notification_type=NotificationType.SWAP_APPROVED if staff_accepted else NotificationType.SWAP_DENIED,
                recipient_user_id=manager.id,
                template_data={
                    **base_template_data,
                    'target_name': 'Manager',
                    'message': f"{responding_staff.full_name} {action} the swap request from {base_template_data['requester_name']}"
                },
                channels=['IN_APP'],
                priority=priority,
                action_url=f"/swaps/{swap_request.id}",
                action_text="View Details",
                background_tasks=background_tasks
            )
        except Exception as e:
            print(f"Failed to notify manager {manager.email}: {e}")

async def _notify_managers_of_swap_completion(
    swap_request: SwapRequest,
    notification_service: NotificationService,
    db: Session,
    background_tasks: BackgroundTasks,
    base_template_data: Dict[str, Any]
):
    """Notify managers when swap is completed"""
    
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id) if schedule else None
    
    if not facility:
        return
    
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
                notification_type=NotificationType.SCHEDULE_CHANGE,
                recipient_user_id=manager.id,
                template_data={
                    **base_template_data,
                    'target_name': 'Manager',
                    'message': f"Swap request completed successfully. Schedule updated for {base_template_data['requester_name']}"
                },
                channels=['IN_APP'],
                priority=NotificationPriority.LOW,
                action_url=f"/schedule?week={schedule.week_start.isoformat()}" if schedule else "/schedule",
                action_text="View Schedule",
                background_tasks=background_tasks
            )
        except Exception as e:
            print(f"Failed to notify manager {manager.email}: {e}")

async def _notify_managers_of_assignment_failure(
    swap_request: SwapRequest,
    failure_reason: str,
    notification_service: NotificationService,
    db: Session,
    background_tasks: BackgroundTasks,
    base_template_data: Dict[str, Any]
):
    """Notify managers when auto-assignment fails"""
    
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id) if schedule else None
    
    if not facility:
        return
    
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
                notification_type=NotificationType.EMERGENCY_COVERAGE,
                recipient_user_id=manager.id,
                template_data={
                    **base_template_data,
                    'target_name': 'Manager',
                    'message': f"Auto-assignment failed for {base_template_data['requester_name']}: {failure_reason}. Manual intervention required."
                },
                channels=['IN_APP', 'PUSH', 'WHATSAPP'],
                priority=NotificationPriority.HIGH,
                action_url=f"/swaps/{swap_request.id}/manage",
                action_text="Assign Manually",
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

# ==================== CREATING SWAP REQUESTS WITH NOTIFICATIONS ====================

@router.post("/request")
async def create_swap_request(
    swap_data: SwapRequestCreate,
    notification_options: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Create a swap request with comprehensive notifications"""
    
    # Create swap request (keep existing logic but add proper type handling)
    swap_request = SwapRequest(
        schedule_id=swap_data.schedule_id,
        requesting_staff_id=swap_data.requesting_staff_id,
        target_staff_id=swap_data.target_staff_id if hasattr(swap_data, 'target_staff_id') and swap_data.target_staff_id else None,
        original_day=swap_data.original_day,
        original_shift=swap_data.original_shift,
        target_day=swap_data.target_day if hasattr(swap_data, 'target_day') else None,
        target_shift=swap_data.target_shift if hasattr(swap_data, 'target_shift') else None,
        swap_type=swap_data.swap_type,
        reason=swap_data.reason,
        urgency=swap_data.urgency,
        status="pending"
    )
    
    db.add(swap_request)
    db.commit()
    db.refresh(swap_request)
    
    # Send comprehensive notifications
    notification_service = NotificationService(db)
    
    if notification_options is None:
        notification_options = {
            'send_whatsapp': True,
            'send_push': True,
            'send_email': False
        }
    
    try:
        await send_swap_creation_notifications(
            swap_request=swap_request,
            notification_service=notification_service,
            db=db,
            background_tasks=background_tasks,
            notification_options=notification_options
        )
    except Exception as e:
        print(f"Failed to send swap creation notifications: {e}")
    
    return swap_request

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
        # Managers can create swaps for any staff in their facilities
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
            detail=f"{requesting_staff.full_name} is not assigned to day {swap_in.original_day}, shift {swap_in.original_shift}"
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
    
    # Send comprehensive notifications
    notification_service = NotificationService(db)
    try:
        await send_swap_creation_notifications(
            swap_request=swap_request,
            notification_service=notification_service,
            db=db,
            background_tasks=background_tasks,
            notification_options={'send_whatsapp': True, 'send_push': True, 'send_email': False}
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
        # Managers can create swaps for any staff in their facilities
        if swap_in.requesting_staff_id:
            requesting_staff = db.get(Staff, swap_in.requesting_staff_id)
            if not requesting_staff or requesting_staff.facility_id != schedule.facility_id:
                raise HTTPException(status_code=400, detail="Invalid staff member")
        else:
            raise HTTPException(status_code=400, detail="Manager must specify requesting_staff_id")
    else:
        # For staff users, find their staff record using their email AND tenant
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
    
    # Create auto swap request with the CORRECT staff ID
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
        swap_request_id=swap_request.id,  
        action="requested",               
        actor_staff_id=requesting_staff.id,
        notes=f"Auto-assignment requested: {swap_in.reason}"  
    )
    db.add(history)
    db.commit()
    db.refresh(swap_request)
    
    # Send comprehensive notifications
    notification_service = NotificationService(db)
    try:
        await send_swap_creation_notifications(
            swap_request=swap_request,
            notification_service=notification_service,
            db=db,
            background_tasks=background_tasks,
            notification_options={'send_whatsapp': True, 'send_push': True, 'send_email': False}
        )
    except Exception as e:
        print(f"Failed to send swap creation notifications: {e}")
    
    return swap_request

# ==================== STAFF RESPONSES WITH NOTIFICATIONS ====================

@router.put("/{swap_id}/staff-response", response_model=SwapRequestRead)
async def respond_to_swap_request(
    swap_id: UUID,
    response: StaffSwapResponse,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Staff response to a specific swap request OR auto-assignment"""
    
    swap_request = db.get(SwapRequest, swap_id)
    if not swap_request:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    # Handle both specific and auto swaps
    if swap_request.swap_type == "specific":
        # Verify this is the target staff member for specific swaps
        if swap_request.target_staff_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to respond to this swap")
    elif swap_request.swap_type == "auto":
        # Verify this is the assigned staff member for auto swaps
        if swap_request.assigned_staff_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to respond to this auto-assignment")
    else:
        raise HTTPException(status_code=400, detail="Invalid swap type")
    
    # Verify request can still be responded to
    valid_statuses = ["pending", "manager_approved", "assigned"]
    if swap_request.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Swap request can no longer be responded to")
    
    # Update staff response
    swap_request.target_staff_accepted = response.accepted
    
    if response.accepted:
        if swap_request.manager_approved:
            # Both manager and staff approved - execute the swap
            swap_request.status = "staff_accepted"
            
            if swap_request.swap_type == "specific":
                _execute_specific_swap(db, swap_request)
            else:  # auto swap
                _execute_auto_assignment(db, swap_request)
                
            swap_request.status = "executed"
            
            # Send completion notifications
            notification_service = NotificationService(db)
            try:
                await send_swap_completion_notifications(
                    swap_request=swap_request,
                    notification_service=notification_service,
                    db=db,
                    background_tasks=background_tasks
                )
            except Exception as e:
                print(f"Failed to send completion notifications: {e}")
                
        else:
            # Staff accepted but manager hasn't approved yet
            swap_request.status = "pending"
    else:
        # Staff declined
        if swap_request.swap_type == "auto":
            # For auto swaps, staff declined the assignment - need to find new coverage
            swap_request.status = "assignment_declined"
            swap_request.assigned_staff_id = None  # Clear the declined assignment
        else:
            swap_request.status = "staff_declined"
    
    # Create history entry
    action = "staff_accepted" if response.accepted else "staff_declined"
    if swap_request.swap_type == "auto":
        action = "assignment_accepted" if response.accepted else "assignment_declined"
        
    history = SwapHistory(
        swap_request_id=swap_id,
        action=action,
        actor_staff_id=current_user.id,
        notes=response.notes
    )
    
    db.add(swap_request)
    db.add(history)
    db.commit()
    db.refresh(swap_request)
    
    # Send staff response notifications
    notification_service = NotificationService(db)
    try:
        await send_staff_response_notifications(
            swap_request=swap_request,
            staff_accepted=response.accepted,
            response_notes=response.notes or "",
            responding_staff_id=current_user.id,
            notification_service=notification_service,
            db=db,
            background_tasks=background_tasks
        )
    except Exception as e:
        print(f"Failed to send staff response notifications: {e}")
    
    return swap_request

# ==================== MANAGER ACTIONS WITH NOTIFICATIONS ====================

@router.put("/{swap_id}/manager-decision", response_model=SwapRequestRead)
async def manager_swap_decision(
    swap_id: UUID,
    decision: ManagerSwapDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks()
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
    
    # Update manager decision
    swap_request.manager_approved = decision.approved
    swap_request.manager_notes = decision.notes
    
    if decision.approved:
        if swap_request.swap_type == "specific":
            # Manager approved specific swap
            swap_request.status = "manager_approved"
            
            # Check if staff already responded
            if swap_request.target_staff_accepted is True:
                # Staff already accepted - ready to execute
                swap_request.status = "staff_accepted"
                _execute_specific_swap(db, swap_request)
                swap_request.status = "executed"
                
                # Send completion notifications
                notification_service = NotificationService(db)
                try:
                    await send_swap_completion_notifications(
                        swap_request=swap_request,
                        notification_service=notification_service,
                        db=db,
                        background_tasks=background_tasks
                    )
                except Exception as e:
                    print(f"Failed to send completion notifications: {e}")
                    
            elif swap_request.target_staff_accepted is False:
                # Staff already declined
                swap_request.status = "staff_declined"
            # Otherwise stays "manager_approved" waiting for staff response
            
        else:  # auto swap
            # Manager approved auto swap
            swap_request.status = "manager_approved"
            
            # Try to assign coverage immediately
            try:
                assignment_result = assign_swap_coverage(db, swap_request)
                if assignment_result.success and assignment_result.assigned_staff_id:
                    swap_request.assigned_staff_id = assignment_result.assigned_staff_id
                    swap_request.status = "assigned"
                    swap_request.target_staff_accepted = None
                    
                    # Send auto-assignment notifications
                    notification_service = NotificationService(db)
                    try:
                        await send_auto_assignment_notifications(
                            swap_request=swap_request,
                            assigned_staff_id=assignment_result.assigned_staff_id,
                            notification_service=notification_service,
                            db=db,
                            background_tasks=background_tasks
                        )
                    except Exception as e:
                        print(f"Failed to send auto-assignment notifications: {e}")
                        
                else:
                    # Auto-assignment failed
                    swap_request.status = "assignment_failed"
                    failure_reason = assignment_result.reason if assignment_result else 'No suitable staff found'
                    swap_request.manager_notes = f"{decision.notes or ''} | Auto-assignment failed: {failure_reason}"
                    
                    # Send assignment failure notifications
                    notification_service = NotificationService(db)
                    try:
                        await send_assignment_failure_notifications(
                            swap_request=swap_request,
                            failure_reason=failure_reason,
                            notification_service=notification_service,
                            db=db,
                            background_tasks=background_tasks
                        )
                    except Exception as e:
                        print(f"Failed to send assignment failure notifications: {e}")
                        
            except Exception as e:
                swap_request.status = "assignment_failed"
                failure_reason = str(e)
                swap_request.manager_notes = f"{decision.notes or ''} | Auto-assignment error: {failure_reason}"
                
                # Send assignment failure notifications
                notification_service = NotificationService(db)
                try:
                    await send_assignment_failure_notifications(
                        swap_request=swap_request,
                        failure_reason=failure_reason,
                        notification_service=notification_service,
                        db=db,
                        background_tasks=background_tasks
                    )
                except Exception as e:
                    print(f"Failed to send assignment failure notifications: {e}")
    else:
        # Manager declined the request
        swap_request.status = "declined"
    
    # Create history entry with clear action
    action = "manager_approved" if decision.approved else "manager_declined"
    history = SwapHistory(
        swap_request_id=swap_id,
        action=action,
        actor_staff_id=None,
        notes=decision.notes
    )
    
    db.add(swap_request)
    db.add(history)
    db.commit()
    db.refresh(swap_request)
    
    # Send manager decision notifications
    notification_service = NotificationService(db)
    try:
        await send_manager_decision_notifications(
            swap_request=swap_request,
            decision_approved=decision.approved,
            manager_notes=decision.notes or "",
            notification_service=notification_service,
            db=db,
            background_tasks=background_tasks
        )
    except Exception as e:
        print(f"Failed to send manager decision notifications: {e}")
    
    return swap_request

@router.post("/{swap_id}/retry-auto-assignment", response_model=AutoAssignmentResult)
async def retry_auto_assignment(
    swap_id: UUID,
    avoid_staff_ids: List[UUID] = Query(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks()
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
        swap_request.status = "assigned"
        
        # Create history
        history = SwapHistory(
            swap_request_id=swap_id,
            action="auto_assigned",
            actor_staff_id=None,
            notes=f"Auto-assigned to {result.assigned_staff_name}"
        )
        db.add(history)
        db.commit()
        
        # Send auto-assignment notifications
        notification_service = NotificationService(db)
        try:
            await send_auto_assignment_notifications(
                swap_request=swap_request,
                assigned_staff_id=result.assigned_staff_id,
                notification_service=notification_service,
                db=db,
                background_tasks=background_tasks
            )
        except Exception as e:
            print(f"Failed to send retry auto-assignment notifications: {e}")
    else:
        # Send retry failure notifications
        notification_service = NotificationService(db)
        try:
            await send_assignment_failure_notifications(
                swap_request=swap_request,
                failure_reason=f"Retry failed: {result.reason}",
                notification_service=notification_service,
                db=db,
                background_tasks=background_tasks
            )
        except Exception as e:
            print(f"Failed to send retry failure notifications: {e}")
    
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
        if current_user.is_manager:
            # Schedule is already joined above for managers
            query = query.where(Schedule.facility_id == facility_id)
        else:
            # For staff, we need to join Schedule to filter by facility
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
        
        # Convert Staff models to dictionaries and create SwapRequestWithDetails properly
        swap_data = swap.dict()
        
        # Add staff data as dictionaries (which will be automatically converted to StaffRead)
        swap_data["requesting_staff"] = requesting_staff.dict() if requesting_staff else None
        swap_data["target_staff"] = target_staff.dict() if target_staff else None
        swap_data["assigned_staff"] = assigned_staff.dict() if assigned_staff else None
        
        result.append(SwapRequestWithDetails(**swap_data))
    
    return result

@router.get("/facility/{facility_id}/summary", response_model=SwapSummary)
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
    
@router.get("/global-summary")
def get_global_swap_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get global swap summary across all facilities"""
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    # Get all facilities for this tenant
    facilities = db.exec(
        select(Facility).where(Facility.tenant_id == current_user.tenant_id)
    ).all()
    
    total_facilities = len(facilities)
    
    # Get all swap requests for this tenant
    base_query = (
        select(SwapRequest)
        .join(Schedule)
        .join(Facility)
        .where(Facility.tenant_id == current_user.tenant_id)
    )
    
    all_swaps = db.exec(base_query).all()
    
    total_pending_swaps = len([s for s in all_swaps if s.status == "pending"])
    total_urgent_swaps = len([s for s in all_swaps if s.status == "pending" and s.urgency in ["high", "emergency"]])
    total_emergency_swaps = len([s for s in all_swaps if s.status == "pending" and s.urgency == "emergency"])
    
    # Swaps today and this week
    today = datetime.utcnow().date()
    week_start = today - timedelta(days=today.weekday())
    
    swaps_today = len([s for s in all_swaps if s.created_at.date() == today])
    swaps_this_week = len([s for s in all_swaps if s.created_at.date() >= week_start])
    
    # Calculate success rate and average approval time (simplified)
    completed_swaps = [s for s in all_swaps if s.status == "completed"]
    auto_assignment_success_rate = 0.85  # You can calculate this properly
    average_approval_time = 2.5  # Hours - you can calculate this properly
    
    return {
        "total_facilities": total_facilities,
        "total_pending_swaps": total_pending_swaps,
        "total_urgent_swaps": total_urgent_swaps,
        "total_emergency_swaps": total_emergency_swaps,
        "swaps_today": swaps_today,
        "swaps_this_week": swaps_this_week,
        "auto_assignment_success_rate": auto_assignment_success_rate,
        "average_approval_time": average_approval_time
    }

@router.get("/facilities-summary")
def get_facilities_swap_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get swap summary for all facilities"""
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    facilities = db.exec(
        select(Facility).where(Facility.tenant_id == current_user.tenant_id)
    ).all()
    
    result = []
    for facility in facilities:
        # Get swap requests for this facility
        base_query = select(SwapRequest).join(Schedule).where(Schedule.facility_id == facility.id)
        
        pending_swaps = len(db.exec(base_query.where(SwapRequest.status == "pending")).all())
        urgent_swaps = len(db.exec(base_query.where(
            SwapRequest.status == "pending",
            SwapRequest.urgency.in_(["high", "emergency"])
        )).all())
        emergency_swaps = len(db.exec(base_query.where(
            SwapRequest.status == "pending",
            SwapRequest.urgency == "emergency"
        )).all())
        
        recent_completions = len(db.exec(base_query.where(
            SwapRequest.status == "completed",
            SwapRequest.completed_at >= datetime.utcnow() - timedelta(days=7)
        )).all())
        
        # Get staff count
        staff_count = len(db.exec(
            select(Staff).where(Staff.facility_id == facility.id, Staff.is_active == True)
        ).all())
        
        result.append({
            "facility_id": str(facility.id),
            "facility_name": facility.name,
            "facility_type": getattr(facility, 'type', 'hotel'),
            "pending_swaps": pending_swaps,
            "urgent_swaps": urgent_swaps,
            "emergency_swaps": emergency_swaps,
            "recent_completions": recent_completions,
            "staff_count": staff_count
        })
    
    return result

@router.get("/all")
def get_all_swap_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(100, le=200),
):
    """Get all swap requests across facilities"""
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
            "facility_name": facility.name if facility else None
        }
        
        result.append(swap_dict)
    
    return result

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
    
    # Verify access through facility
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
    
    # Add facility info
    swap_data["facility_id"] = str(facility.id)
    swap_data["facility_name"] = facility.name
    
    return SwapRequestWithDetails(**swap_data)

# ==================== STAFF ANALYTICS ENDPOINTS ====================

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
        
        # Count by status
        if swap_request.status in ['approved', 'executed', 'staff_accepted']:
            staff_stats[staff_id]['approved_requests'] += 1
        elif swap_request.status in ['declined', 'staff_declined']:
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
        if swap.status in ['approved', 'executed', 'staff_accepted']:
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
        
        if swap.status == 'executed':
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
        
        if swap.status in ['approved', 'executed', 'staff_accepted']:
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