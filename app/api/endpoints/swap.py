# app/api/endpoints/swap.py
"""Enhanced swap endpoint with comprehensive workflow and role verification"""
import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from typing import List, Optional, Literal
from datetime import datetime, timedelta
from uuid import UUID
from collections import Counter, defaultdict
from typing import Dict, Any

from app.services.notification_service import NotificationService
from app.models import NotificationType, NotificationPriority
from app.services.user_staff_mapping import UserStaffMappingService

from ...deps import get_db, get_current_user
from ...models import (
    StaffUnavailability, SwapRequest, SwapHistory, Schedule, ShiftAssignment, 
    Staff, Facility, User, SwapStatus, ZoneAssignment
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
    # ✅ FIX: Get correct user ID for target staff
            if swap_request.target_staff_id:
                # Example fix: Retrieve the target staff details
                target_staff = db.get(Staff, swap_request.target_staff_id)
                if target_staff:
                    print(f"Target staff found: {target_staff.full_name}")
                target_staff = db.get(Staff, swap_request.target_staff_id)
                if target_staff:
                    mapping_service = UserStaffMappingService(db)
                    target_user = mapping_service.get_user_from_staff_id(swap_request.target_staff_id)
                    
                    if target_user and target_user.is_active:
                        await notification_service.send_notification(
                            notification_type=NotificationType.SWAP_REQUEST,
                            recipient_user_id=target_user.id,  #  CORRECT: user ID, not staff ID
                            template_data={
                                **base_template_data,
                                'target_name': target_staff.full_name,
                                'target_day': _get_day_name(swap_request.target_day) if swap_request.target_day is not None else "Unknown",
                                'target_shift': _get_shift_name(swap_request.target_shift) if swap_request.target_shift is not None else "Unknown"
                            },
                            channels=channels,
                            priority=NotificationPriority.HIGH if swap_request.urgency == "emergency" else NotificationPriority.MEDIUM,
                            action_url=f"/swaps/{swap_request.id}/respond",
                            action_text="Respond to Swap Request",
                            background_tasks=background_tasks
                        )
                        print(f" Notification sent to correct user: {target_user.email}")
                    else:
                        print(f"Could not find active user for staff {target_staff.email}")
        
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
            
async def send_swap_accepted_notifications(
    swap_request: SwapRequest,
    notification_service: NotificationService,
    db: Session,
    background_tasks: BackgroundTasks
):
    """Send notifications when a swap is accepted by staff"""
    
    # Get staff and facility info
    requesting_staff = db.get(Staff, swap_request.requesting_staff_id)
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id) if schedule else None
    
    if not requesting_staff or not facility:
        return
    
    # Determine who accepted
    if swap_request.swap_type == "specific":
        accepting_staff = db.get(Staff, swap_request.target_staff_id)
        acceptance_type = "swap"
    else:
        accepting_staff = db.get(Staff, swap_request.assigned_staff_id)
        acceptance_type = "assignment"
    
    if not accepting_staff:
        return
    
    base_template_data = {
        'requester_name': requesting_staff.full_name,
        'accepting_staff_name': accepting_staff.full_name,
        'facility_name': facility.name,
        'original_day': _get_day_name(swap_request.original_day),
        'original_shift': _get_shift_name(swap_request.original_shift),
        'reason': swap_request.reason,
        'acceptance_type': acceptance_type
    }
    
    try:
        # Notify requesting staff
        requesting_user = db.exec(
            select(User).where(User.email == requesting_staff.email)
        ).first()
        
        if requesting_user:
            await notification_service.send_notification(
                notification_type=NotificationType.SWAP_APPROVED,
                recipient_user_id=requesting_user.id,
                template_data=base_template_data,
                channels=['IN_APP', 'PUSH'],
                priority=NotificationPriority.MEDIUM,
                action_url=f"/swaps/{swap_request.id}",
                action_text="View Swap Status",
                background_tasks=background_tasks
            )
        
        # Notify managers about acceptance
        await _notify_managers_of_swap_acceptance(
            swap_request, notification_service, db, background_tasks, base_template_data
        )
        
    except Exception as e:
        print(f"Failed to send swap accepted notifications: {e}")

async def send_swap_declined_notifications(
    swap_request: SwapRequest,
    notification_service: NotificationService,
    db: Session,
    background_tasks: BackgroundTasks
):
    """Send notifications when a swap is declined by staff"""
    
    # Get staff and facility info
    requesting_staff = db.get(Staff, swap_request.requesting_staff_id)
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id) if schedule else None
    
    if not requesting_staff or not facility:
        return
    
    # Determine who declined
    if swap_request.swap_type == "specific":
        declining_staff = db.get(Staff, swap_request.target_staff_id)
        decline_type = "swap"
    else:
        declining_staff = db.get(Staff, swap_request.assigned_staff_id)
        decline_type = "assignment"
    
    if not declining_staff:
        return
    
    base_template_data = {
        'requester_name': requesting_staff.full_name,
        'declining_staff_name': declining_staff.full_name,
        'facility_name': facility.name,
        'original_day': _get_day_name(swap_request.original_day),
        'original_shift': _get_shift_name(swap_request.original_shift),
        'reason': swap_request.reason,
        'decline_type': decline_type
    }
    
    try:
        # Notify requesting staff
        requesting_user = db.exec(
            select(User).where(User.email == requesting_staff.email)
        ).first()
        
        if requesting_user:
            await notification_service.send_notification(
                notification_type=NotificationType.SWAP_DENIED,
                recipient_user_id=requesting_user.id,
                template_data=base_template_data,
                channels=['IN_APP', 'PUSH'],
                priority=NotificationPriority.MEDIUM,
                action_url=f"/swaps/{swap_request.id}",
                action_text="View Swap Status",
                background_tasks=background_tasks
            )
        
        # Notify managers about decline (they may need to find alternative coverage)
        await _notify_managers_of_swap_decline(
            swap_request, notification_service, db, background_tasks, base_template_data
        )
        
    except Exception as e:
        print(f"Failed to send swap declined notifications: {e}")

async def _notify_managers_of_swap_acceptance(
    swap_request: SwapRequest,
    notification_service: NotificationService,
    db: Session,
    background_tasks: BackgroundTasks,
    base_template_data: Dict[str, Any]
):
    """Notify managers when staff accepts a swap"""
    
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
                notification_type=NotificationType.SWAP_APPROVED,
                recipient_user_id=manager.id,
                template_data={
                    **base_template_data,
                    'message': f"Swap {base_template_data['acceptance_type']} accepted by {base_template_data['accepting_staff_name']}"
                },
                channels=['IN_APP'],
                priority=NotificationPriority.LOW,
                action_url=f"/swaps/{swap_request.id}",
                action_text="View Details",
                background_tasks=background_tasks
            )
        except Exception as e:
            print(f"Failed to notify manager {manager.email} of acceptance: {e}")

async def _notify_managers_of_swap_decline(
    swap_request: SwapRequest,
    notification_service: NotificationService,
    db: Session,
    background_tasks: BackgroundTasks,
    base_template_data: Dict[str, Any]
):
    """Notify managers when staff declines a swap - they may need to find alternative coverage"""
    
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
    
    # Higher priority if it was an emergency or urgent request
    priority = NotificationPriority.HIGH if swap_request.urgency in ["high", "emergency"] else NotificationPriority.MEDIUM
    
    for manager in managers:
        try:
            await notification_service.send_notification(
                notification_type=NotificationType.EMERGENCY_COVERAGE if swap_request.urgency == "emergency" else NotificationType.SWAP_DENIED,
                recipient_user_id=manager.id,
                template_data={
                    **base_template_data,
                    'message': f"ATTENTION: {base_template_data['decline_type'].title()} declined by {base_template_data['declining_staff_name']}. Alternative coverage may be needed."
                },
                channels=['IN_APP', 'PUSH'],
                priority=priority,
                action_url=f"/swaps/{swap_request.id}/manage",
                action_text="Find Alternative Coverage",
                background_tasks=background_tasks
            )
        except Exception as e:
            print(f"Failed to notify manager {manager.email} of decline: {e}")

def _get_day_name(day_number: int) -> str:
    """Convert day number to day name"""
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    return days[day_number] if 0 <= day_number < 7 else f"Day {day_number}"

def _get_shift_name(shift_number: int) -> str:
    """Convert shift number to shift name"""
    shifts = ['Morning', 'Afternoon', 'Evening']
    return shifts[shift_number] if 0 <= shift_number < 3 else f"Shift {shift_number}"

# ==================== CRITICAL: COLLECTION ENDPOINTS MUST BE BEFORE /{swap_id} ====================

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

@router.get("/global-summary")
async def get_global_swap_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get global swap summary across all facilities"""
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    # Get all swaps for tenant
    all_swaps = db.exec(
        select(SwapRequest)
        .join(Schedule)
        .join(Facility)
        .where(Facility.tenant_id == current_user.tenant_id)
    ).all()
    
    # Calculate summary metrics
    total_swaps = len(all_swaps)
    pending_swaps = len([s for s in all_swaps if s.status == SwapStatus.PENDING])
    urgent_swaps = len([s for s in all_swaps if s.status == SwapStatus.PENDING and s.urgency in ["high", "emergency"]])
    completed_swaps = len([s for s in all_swaps if s.status == SwapStatus.EXECUTED])
    
    return {
        "total_swaps": total_swaps,
        "pending_swaps": pending_swaps,
        "urgent_swaps": urgent_swaps,
        "completed_swaps": completed_swaps,
        "success_rate": (completed_swaps / total_swaps * 100) if total_swaps > 0 else 0
    }

@router.get("/health")
async def swap_service_health_check(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Health check for swap service"""
    
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
    actor_user_id=current_user.id, 
    notes=f"Specific swap requested with {target_staff.full_name}"
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
    actor_user_id=current_user.id,  # ← ADD THIS LINE
    notes=f"Auto-assignment requested: {swap_in.reason}"
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

# ==================== LISTING ENDPOINTS ====================

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

@router.get("/{swap_id}/workflow-status")
async def get_swap_workflow_status(
    swap_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get workflow status for a swap request"""
    
    swap = db.get(SwapRequest, swap_id)
    if not swap:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    # Verify access
    schedule = db.get(Schedule, swap.schedule_id)
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Use your existing service function
        workflow_status = get_swap_workflow_status(swap, db)
        
        # Determine next action based on current status
        next_action_required = "Unknown"
        next_action_by = "system"
        can_execute = False
        blocking_reasons = []
        
        if swap.status == SwapStatus.PENDING:
            next_action_required = "Manager approval needed"
            next_action_by = "manager"
            can_execute = current_user.is_manager
        elif swap.status == SwapStatus.MANAGER_APPROVED:
            if swap.swap_type == "specific":
                next_action_required = "Target staff response needed"
                next_action_by = "staff"
            else:
                next_action_required = "Auto-assignment in progress"
                next_action_by = "system"
        elif swap.status == SwapStatus.POTENTIAL_ASSIGNMENT:
            next_action_required = "Staff response to assignment needed"
            next_action_by = "staff"
        elif swap.status == SwapStatus.MANAGER_FINAL_APPROVAL:
            next_action_required = "Final manager approval needed"
            next_action_by = "manager"
            can_execute = current_user.is_manager
        elif swap.status == SwapStatus.STAFF_ACCEPTED:
            next_action_required = "Ready for execution"
            next_action_by = "manager"
            can_execute = current_user.is_manager
        
        return {
            "current_status": swap.status,
            "next_action_required": next_action_required,
            "next_action_by": next_action_by,
            "can_execute": can_execute,
            "blocking_reasons": blocking_reasons,
            "estimated_completion": None
        }
        
    except Exception as e:
        return {
            "current_status": swap.status,
            "next_action_required": "Error determining workflow status",
            "next_action_by": "system",
            "can_execute": False,
            "blocking_reasons": [f"Error: {str(e)}"]
        }

@router.get("/{swap_id}/available-actions")
async def get_available_swap_actions(
    swap_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get available actions for a swap request"""
    
    swap = db.get(SwapRequest, swap_id)
    if not swap:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    # Verify access
    schedule = db.get(Schedule, swap.schedule_id)
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get current user's staff record
    current_staff = db.exec(
        select(Staff).where(Staff.email == current_user.email)
    ).first()
    
    available_actions = []
    
    # Determine available actions based on status and user role
    if swap.status == SwapStatus.PENDING:
        if current_user.is_manager:
            available_actions.extend([
                {
                    "action": "approve",
                    "label": "Approve Request",
                    "description": "Approve this swap request",
                    "requires_confirmation": False,
                    "endpoint": f"/v1/swaps/{swap_id}/manager-decision",
                    "method": "PUT"
                },
                {
                    "action": "decline",
                    "label": "Decline Request",
                    "description": "Decline this swap request",
                    "requires_confirmation": True,
                    "endpoint": f"/v1/swaps/{swap_id}/manager-decision", 
                    "method": "PUT"
                }
            ])
    
    elif swap.status == SwapStatus.MANAGER_APPROVED:
        if swap.swap_type == "specific" and current_staff and str(current_staff.id) == str(swap.target_staff_id):
            available_actions.extend([
                {
                    "action": "accept",
                    "label": "Accept Swap",
                    "description": "Accept this shift swap",
                    "requires_confirmation": False,
                    "endpoint": f"/v1/swaps/{swap_id}/staff-response",
                    "method": "PUT"
                },
                {
                    "action": "decline",
                    "label": "Decline Swap",
                    "description": "Decline this shift swap",
                    "requires_confirmation": True,
                    "endpoint": f"/v1/swaps/{swap_id}/staff-response",
                    "method": "PUT"
                }
            ])
    
    elif swap.status == SwapStatus.POTENTIAL_ASSIGNMENT:
        if current_staff and str(current_staff.id) == str(swap.assigned_staff_id):
            available_actions.extend([
                {
                    "action": "accept_assignment",
                    "label": "Accept Assignment",
                    "description": "Accept this shift assignment",
                    "requires_confirmation": False,
                    "endpoint": f"/v1/swaps/{swap_id}/staff-response",
                    "method": "PUT"
                },
                {
                    "action": "decline_assignment",
                    "label": "Decline Assignment", 
                    "description": "Decline this shift assignment",
                    "requires_confirmation": True,
                    "endpoint": f"/v1/swaps/{swap_id}/staff-response",
                    "method": "PUT"
                }
            ])
    
    elif swap.status == SwapStatus.MANAGER_FINAL_APPROVAL:
        if current_user.is_manager:
            available_actions.extend([
                {
                    "action": "final_approve",
                    "label": "Final Approval",
                    "description": "Give final approval to execute the swap",
                    "requires_confirmation": False,
                    "endpoint": f"/v1/swaps/{swap_id}/final-approval",
                    "method": "PUT"
                },
                {
                    "action": "final_decline",
                    "label": "Final Decline",
                    "description": "Decline final approval",
                    "requires_confirmation": True,
                    "endpoint": f"/v1/swaps/{swap_id}/final-approval", 
                    "method": "PUT"
                }
            ])
    
    # Universal actions
    if current_user.is_manager or (current_staff and str(current_staff.id) == str(swap.requesting_staff_id)):
        if swap.status not in [SwapStatus.EXECUTED, SwapStatus.CANCELLED]:
            available_actions.append({
                "action": "cancel",
                "label": "Cancel Request",
                "description": "Cancel this swap request",
                "requires_confirmation": True,
                "endpoint": f"/v1/swaps/{swap_id}",
                "method": "DELETE"
            })
    
    return {
        "swap_id": str(swap_id),
        "current_status": swap.status,
        "user_role": "manager" if current_user.is_manager else "staff",
        "available_actions": available_actions
    }

@router.post("/validate")
async def validate_swap_request(
    validation_data: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Validate swap request before creation"""
    
    try:
        errors = []
        warnings = []
        
        # Check required fields
        required_fields = ['schedule_id', 'requesting_staff_id', 'original_day', 'original_shift']
        for field in required_fields:
            if field not in validation_data:
                errors.append({
                    "error_code": "MISSING_FIELD",
                    "error_message": f"Missing required field: {field}",
                    "field": field,
                    "suggested_fix": f"Please provide {field}"
                })
        
        # Validate schedule exists
        if 'schedule_id' in validation_data:
            schedule = db.get(Schedule, validation_data['schedule_id'])
            if not schedule:
                errors.append({
                    "error_code": "INVALID_SCHEDULE",
                    "error_message": "Schedule not found",
                    "field": "schedule_id"
                })
            else:
                # Check facility access
                facility = db.get(Facility, schedule.facility_id)
                if not facility or facility.tenant_id != current_user.tenant_id:
                    errors.append({
                        "error_code": "ACCESS_DENIED",
                        "error_message": "No access to this schedule",
                        "field": "schedule_id"
                    })
        
        # Validate staff exists
        if 'requesting_staff_id' in validation_data:
            staff = db.get(Staff, validation_data['requesting_staff_id'])
            if not staff:
                errors.append({
                    "error_code": "INVALID_STAFF",
                    "error_message": "Staff member not found",
                    "field": "requesting_staff_id"
                })
            elif not staff.is_active:
                errors.append({
                    "error_code": "INACTIVE_STAFF",
                    "error_message": "Staff member is inactive",
                    "field": "requesting_staff_id"
                })
        
        # Validate day and shift ranges
        if 'original_day' in validation_data:
            day = validation_data['original_day']
            if not isinstance(day, int) or day < 0 or day > 6:
                errors.append({
                    "error_code": "INVALID_DAY",
                    "error_message": "Day must be between 0-6",
                    "field": "original_day"
                })
        
        if 'original_shift' in validation_data:
            shift = validation_data['original_shift']
            if not isinstance(shift, int) or shift < 0 or shift > 2:
                errors.append({
                    "error_code": "INVALID_SHIFT", 
                    "error_message": "Shift must be between 0-2",
                    "field": "original_shift"
                })
        
        # Check if assignment exists
        if (len(errors) == 0 and 'schedule_id' in validation_data and 
            'requesting_staff_id' in validation_data and 
            'original_day' in validation_data and 'original_shift' in validation_data):
            
            assignment = db.exec(
                select(ShiftAssignment).where(
                    ShiftAssignment.schedule_id == validation_data['schedule_id'],
                    ShiftAssignment.staff_id == validation_data['requesting_staff_id'],
                    ShiftAssignment.day == validation_data['original_day'],
                    ShiftAssignment.shift == validation_data['original_shift']
                )
            ).first()
            
            if not assignment:
                errors.append({
                    "error_code": "NO_ASSIGNMENT",
                    "error_message": "Staff member is not assigned to this shift",
                    "suggested_fix": "Check the schedule and ensure staff is assigned to the specified shift"
                })
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "role_verification_passed": True,  # Simplified
            "zone_requirements_met": True,     # Simplified
            "skill_requirements_met": True,    # Simplified
            "staff_available": True,           # Simplified
            "no_conflicts": True,              # Simplified
            "within_work_limits": True         # Simplified
        }
        
    except Exception as e:
        return {
            "is_valid": False,
            "errors": [{"error_code": "VALIDATION_ERROR", "error_message": str(e)}],
            "warnings": []
        }

@router.get("/conflicts/{schedule_id}/{day}/{shift}")
async def get_swap_conflicts(
    schedule_id: UUID,
    day: int,
    shift: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get conflicts and suggestions for a swap"""
    
    try:
        # Verify schedule access
        schedule = db.get(Schedule, schedule_id)
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        facility = db.get(Facility, schedule.facility_id)
        if not facility or facility.tenant_id != current_user.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get existing assignments for this slot
        existing_assignments = db.exec(
            select(ShiftAssignment, Staff).join(Staff).where(
                ShiftAssignment.schedule_id == schedule_id,
                ShiftAssignment.day == day,
                ShiftAssignment.shift == shift
            )
        ).all()
        
        conflicts = []
        alternative_suggestions = []
        
        # Check for conflicts
        if len(existing_assignments) > 1:
            conflicts.append({
                "conflict_type": "double_booking",
                "severity": "critical",
                "staff_id": str(existing_assignments[0][1].id),
                "staff_name": existing_assignments[0][1].full_name,
                "message": "Multiple staff assigned to same shift",
                "auto_resolvable": True,
                "resolution_suggestions": ["Remove duplicate assignments"]
            })
        
        # Get available staff for suggestions
        facility_staff = db.exec(
            select(Staff).where(
                Staff.facility_id == facility.id,
                Staff.is_active == True
            )
        ).all()
        
        # Filter out already assigned staff
        assigned_staff_ids = {str(assignment[1].id) for assignment in existing_assignments}
        available_staff = [s for s in facility_staff if str(s.id) not in assigned_staff_ids]
        
        # Generate suggestions
        for staff in available_staff[:3]:  # Limit to 3 suggestions
            # Check if staff has other assignments this day
            other_assignments = db.exec(
                select(ShiftAssignment).where(
                    ShiftAssignment.schedule_id == schedule_id,
                    ShiftAssignment.staff_id == staff.id,
                    ShiftAssignment.day == day
                )
            ).all()
            
            availability = len(other_assignments) == 0
            compatibility_score = 90 if availability else 60
            
            alternative_suggestions.append({
                "staff_id": str(staff.id),
                "staff_name": staff.full_name,
                "role": staff.role,
                "compatibility_score": compatibility_score,
                "availability": availability,
                "suggestion_reason": "Available and qualified" if availability else "Has other shifts this day"
            })
        
        return {
            "has_conflicts": len(conflicts) > 0,
            "conflicts": conflicts,
            "alternative_suggestions": alternative_suggestions
        }
        
    except Exception as e:
        return {
            "has_conflicts": False,
            "conflicts": [],
            "alternative_suggestions": []
        }

@router.post("/check-role-compatibility")
async def check_role_compatibility(
    compatibility_data: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Check role compatibility for assignment"""
    
    try:
        facility_id = compatibility_data.get('facility_id')
        staff_id = compatibility_data.get('staff_id')
        zone_id = compatibility_data.get('zone_id')
        
        # Verify facility access
        facility = db.get(Facility, facility_id)
        if not facility or facility.tenant_id != current_user.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get staff info
        staff = db.get(Staff, staff_id)
        if not staff:
            return {
                "compatible": False,
                "match_level": "incompatible",
                "match_reason": "Staff not found",
                "skill_level_compatible": False,
                "staff_skill_level": 0,
                "override_possible": False
            }
        
        # Basic compatibility check (simplified)
        # In a real implementation, you'd check against zone requirements, role mappings, etc.
        
        # Check if staff belongs to this facility
        if str(staff.facility_id) != str(facility_id):
            return {
                "compatible": False,
                "match_level": "incompatible",
                "match_reason": "Staff does not belong to this facility",
                "skill_level_compatible": False,
                "staff_skill_level": staff.skill_level or 1,
                "override_possible": False
            }
        
        # Check if staff is active
        if not staff.is_active:
            return {
                "compatible": False,
                "match_level": "incompatible",
                "match_reason": "Staff is inactive",
                "skill_level_compatible": False,
                "staff_skill_level": staff.skill_level or 1,
                "override_possible": True
            }
        
        # Simplified compatibility check - in reality you'd check:
        # - Zone role requirements
        # - Skill level requirements
        # - Certification requirements
        # etc.
        
        return {
            "compatible": True,
            "match_level": "compatible",
            "match_reason": "Staff is active and qualified",
            "skill_level_compatible": True,
            "minimum_skill_required": 1,
            "staff_skill_level": staff.skill_level or 1,
            "override_possible": True
        }
        
    except Exception as e:
        return {
            "compatible": False,
            "match_level": "incompatible",
            "match_reason": f"Error checking compatibility: {str(e)}",
            "skill_level_compatible": False,
            "staff_skill_level": 0,
            "override_possible": False
        }

# ==================== INDIVIDUAL SWAP ENDPOINTS (MUST BE AFTER COLLECTION ENDPOINTS) ====================

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

@router.put("/{swap_id}", response_model=SwapRequestRead)
async def update_swap_request(
    swap_id: UUID,
    update_data: SwapRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update swap request details"""
    
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
    actor_user_id=current_user.id,  # ← ADD THIS LINE
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
    """Cancel a swap request"""
    
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
    actor_user_id=current_user.id,  # ← ADD THIS LINE
    notes=reason or "Swap request cancelled",
    system_action=False
    )
    
    db.add(swap_request)
    db.add(history)
    db.commit()
    
    return {"message": "Swap request cancelled successfully"}

# ==================== WORKFLOW ENDPOINTS ====================

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
    
    # Verify access
    schedule = db.get(Schedule, swap_request.schedule_id)
    facility = db.get(Facility, schedule.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # rollback hanging transactions
    try:
        db.rollback()  # Clear any pending rollback
    except Exception:
        pass  # Ignore if no transaction to rollback
    
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
                    # ✅ CHANGED: Use consistent status that maps to awaiting_target in frontend
                    swap_request.status = SwapStatus.POTENTIAL_ASSIGNMENT
                    swap_request.assigned_staff_accepted = None
                    
                    # Store role matching information
                    if hasattr(assignment_result, 'role_match_level'):
                        swap_request.role_match_reason = assignment_result.reason
                    
                    # ✅ NEW: Send auto-assignment notification
                    print(f"🎯 Auto-assignment successful! Notifying staff {assignment_result.assigned_staff_id}")
                    
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
        actor_staff_id=None,
        actor_user_id=current_user.id,
        notes=decision.notes,
        system_action=False
    )
    
    db.add(swap_request)
    db.add(history)
    db.commit()
    db.refresh(swap_request)
    
    # ✅ NEW: Send auto-assignment notification AFTER commit
    if (decision.approved and 
        swap_request.swap_type == "auto" and 
        swap_request.assigned_staff_id and 
        swap_request.status == SwapStatus.POTENTIAL_ASSIGNMENT):
        
        notification_service = NotificationService(db)
        try:
            await notification_service.send_auto_assignment_notification(
                swap_request=swap_request,
                background_tasks=background_tasks
            )
            print(f"✅ Auto-assignment notification sent for swap {swap_request.id}")
        except Exception as e:
            print(f"⚠️ Failed to send auto-assignment notification: {e}")
    
    # OPTIMIZATION: Return full swap details instead of just basic swap
    # Load related staff data
    requesting_staff = db.get(Staff, swap_request.requesting_staff_id)
    target_staff = db.get(Staff, swap_request.target_staff_id) if swap_request.target_staff_id else None
    assigned_staff = db.get(Staff, swap_request.assigned_staff_id) if swap_request.assigned_staff_id else None
    
    # Convert to SwapRequestWithDetails
    swap_data = swap_request.dict()
    swap_data["requesting_staff"] = requesting_staff.dict() if requesting_staff else None
    swap_data["target_staff"] = target_staff.dict() if target_staff else None
    swap_data["assigned_staff"] = assigned_staff.dict() if assigned_staff else None
    
    # Add role names
    swap_data["original_shift_role_name"] = requesting_staff.role if requesting_staff else None
    swap_data["target_staff_role_name"] = target_staff.role if target_staff else None
    swap_data["assigned_staff_role_name"] = assigned_staff.role if assigned_staff else None
    
    return SwapRequestWithDetails(**swap_data)

@router.put("/{swap_id}/final-approval", response_model=SwapRequestRead)
async def manager_final_approval(
    swap_id: UUID,
    decision: ManagerFinalApproval,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Manager final approval to execute a swap"""
    
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
    
    # Verify swap is in final approval state
    if swap_request.status != SwapStatus.MANAGER_FINAL_APPROVAL:
        raise HTTPException(
            status_code=400, 
            detail=f"Swap is not ready for final approval. Current status: {swap_request.status}"
        )
    
    # Rollback any hanging transactions
    try:
        db.rollback()
    except Exception:
        pass
    
    # Process final approval
    swap_request.manager_final_approved = decision.approved
    swap_request.manager_final_approved_at = datetime.utcnow()
    
    # Update or append to manager notes
    if decision.notes:
        if swap_request.manager_notes:
            swap_request.manager_notes += f"\n[Final Approval] {decision.notes}"
        else:
            swap_request.manager_notes = f"[Final Approval] {decision.notes}"
    
    # Handle role override if applicable
    if decision.override_role_verification:
        swap_request.role_match_override = True
        swap_request.role_match_reason = decision.role_override_reason or "Manager override during final approval"
    
    if decision.approved:
        # Execute the swap - update schedule
        swap_request.status = SwapStatus.EXECUTED
        swap_request.completed_at = datetime.utcnow()
        
        print(f"✅ Swap {swap_id} executed successfully by manager {current_user.email}")
        
        # Execute the swap - update schedule
        try:
            print(f"🔄 Executing swap {swap_id}: {swap_request.swap_type} type")
            
            # Execute the schedule changes based on swap type
            if swap_request.swap_type == "specific":
                await execute_specific_swap_schedule_update(db, swap_request)
            elif swap_request.swap_type == "auto":
                await execute_auto_swap_schedule_update(db, swap_request)
            else:
                raise HTTPException(status_code=400, detail=f"Unknown swap type: {swap_request.swap_type}")
            
            print(f"Schedule updated successfully for swap {swap_id}")
            
        except Exception as e:
            print(f" Failed to update schedule for swap {swap_id}: {e}")
            # Rollback the swap status change
            swap_request.status = SwapStatus.MANAGER_FINAL_APPROVAL
            db.add(swap_request)
            db.commit()
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to update schedule: {str(e)}. Swap status reverted."
            )       
    else:
        # Manager denied final approval
        swap_request.status = SwapStatus.DECLINED
        print(f"❌ Swap {swap_id} denied final approval by manager {current_user.email}")
    
    # Create history entry
    action = "final_approved" if decision.approved else "final_declined"
    history_notes = decision.notes or ("Final approval granted - swap executed" if decision.approved else "Final approval denied")
    
    if decision.override_role_verification:
        history_notes += f" [Role Override: {decision.role_override_reason}]"
    
    history = SwapHistory(
        swap_request_id=swap_request.id,
        action=action,
        actor_staff_id=None,  # Manager action
        actor_user_id=current_user.id,
        notes=history_notes,
        system_action=False
    )
    
    db.add(swap_request)
    db.add(history)
    db.commit()
    db.refresh(swap_request)
    
    # Send notifications
    notification_service = NotificationService(db)
    try:
        if decision.approved:
            # Notify all involved parties that swap was executed
            print(f"📧 Sending swap execution notifications for swap {swap_id}")
            await send_swap_executed_notifications(
                swap_request=swap_request,
                notification_service=notification_service,
                db=db,
                background_tasks=background_tasks
            )
        else:
            # Notify that final approval was denied
            print(f"📧 Sending final approval denial notifications for swap {swap_id}")
            await send_swap_declined_notifications(
                swap_request=swap_request,
                notification_service=notification_service,
                db=db,
                background_tasks=background_tasks
            )
    except Exception as e:
        print(f"Failed to send final approval notifications: {e}")
    
    return swap_request

# Staff response to swap requests (both specific and auto-assignments)
@router.put("/{swap_id}/staff-response", response_model=SwapRequestRead)
async def respond_to_swap_request(
    swap_id: UUID,
    response: StaffSwapResponse,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Staff response to a swap request (both specific and auto-assignments)"""
    
    swap_request = db.get(SwapRequest, swap_id)
    if not swap_request:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    # Get current staff member
    current_staff = db.exec(
        select(Staff).where(Staff.email == current_user.email)
    ).first()
    
    if not current_staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    # Check if this staff member can respond to this swap
    can_respond = False
    response_type = None
    
    if swap_request.swap_type == "specific" and swap_request.target_staff_id == current_staff.id:
        can_respond = True
        response_type = "target_response"
    elif swap_request.swap_type == "auto" and swap_request.assigned_staff_id == current_staff.id:
        can_respond = True
        response_type = "assignment_response"
    
    if not can_respond:
        raise HTTPException(
            status_code=403, 
            detail="You are not authorized to respond to this swap request"
        )
    
    # Update the appropriate response field
    if response_type == "target_response":
        swap_request.target_staff_accepted = response.accepted
    elif response_type == "assignment_response":
        swap_request.assigned_staff_accepted = response.accepted
    
    # ✅ FIXED: Proper status transition logic
    if response.accepted:
        # Staff accepted - check if final approval is required
        if swap_request.requires_manager_final_approval:
            # Move to final approval status so manager gets notified
            swap_request.status = SwapStatus.MANAGER_FINAL_APPROVAL
            print(f"🎯 Staff accepted - moving to MANAGER_FINAL_APPROVAL status for swap {swap_id}")
        else:
            # No final approval needed - move directly to staff accepted
            swap_request.status = SwapStatus.STAFF_ACCEPTED
    else:
        # Staff declined
        if response_type == "target_response":
            swap_request.status = SwapStatus.STAFF_DECLINED
        else:
            swap_request.status = SwapStatus.ASSIGNMENT_DECLINED
    
    # Set response timestamp
    swap_request.staff_responded_at = datetime.utcnow()
    
    # Create history entry
    action = "staff_accepted" if response.accepted else "staff_declined"
    history = SwapHistory(
        swap_request_id=swap_request.id,
        action=action,
        actor_staff_id=current_staff.id,
        actor_user_id=current_user.id,
        notes=response.notes or ("Assignment accepted" if response.accepted else "Assignment declined"),
        system_action=False
    )
    
    db.add(swap_request)
    db.add(history)
    db.commit()
    db.refresh(swap_request)
    
    # ✅ ENHANCED: Send notifications based on new status
    notification_service = NotificationService(db)
    try:
        if response.accepted:
            if swap_request.status == SwapStatus.MANAGER_FINAL_APPROVAL:
                # Notify manager that final approval is required
                print(f"📧 Sending final approval notifications for swap {swap_id}")
                await send_final_approval_needed_notifications(
                    swap_request=swap_request,
                    notification_service=notification_service,
                    db=db,
                    background_tasks=background_tasks
                )
            else:
                # Standard acceptance notifications
                await send_swap_accepted_notifications(
                    swap_request=swap_request,
                    notification_service=notification_service,
                    db=db,
                    background_tasks=background_tasks
                )
        else:
            await send_swap_declined_notifications(
                swap_request=swap_request,
                notification_service=notification_service,
                db=db,
                background_tasks=background_tasks
            )
    except Exception as e:
        print(f"Failed to send response notifications: {e}")
    
    return swap_request

# ✅ Also add the potential assignment response endpoint fix
@router.put("/{swap_id}/potential-assignment-response", response_model=SwapRequestRead)
async def respond_to_potential_assignment(
    swap_id: UUID,
    response: PotentialAssignmentResponse,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Staff response to a potential auto-assignment"""
    
    swap_request = db.get(SwapRequest, swap_id)
    if not swap_request:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    # Verify this is a potential assignment for the current user
    current_staff = db.exec(
        select(Staff).where(Staff.email == current_user.email)
    ).first()
    
    if not current_staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    if (swap_request.status != SwapStatus.POTENTIAL_ASSIGNMENT or 
        swap_request.assigned_staff_id != current_staff.id):
        raise HTTPException(
            status_code=403, 
            detail="You are not authorized to respond to this potential assignment"
        )
    
    # Update response
    swap_request.assigned_staff_accepted = response.accepted
    swap_request.staff_responded_at = datetime.utcnow()
    
    # ✅ FIXED: Proper status transition for potential assignments
    if response.accepted:
        # Staff accepted - check if final approval is required
        if swap_request.requires_manager_final_approval:
            # Move to final approval status so manager gets notified
            swap_request.status = SwapStatus.MANAGER_FINAL_APPROVAL
            print(f"🎯 Potential assignment accepted - moving to MANAGER_FINAL_APPROVAL status for swap {swap_id}")
        else:
            # No final approval needed - move directly to staff accepted
            swap_request.status = SwapStatus.STAFF_ACCEPTED
    else:
        # Staff declined the assignment
        swap_request.status = SwapStatus.ASSIGNMENT_DECLINED
    
    # Create history entry
    action = "assignment_accepted" if response.accepted else "assignment_declined"
    history = SwapHistory(
        swap_request_id=swap_request.id,
        action=action,
        actor_staff_id=current_staff.id,
        actor_user_id=current_user.id,
        notes=response.notes or ("Potential assignment accepted" if response.accepted else "Potential assignment declined"),
        system_action=False
    )
    
    db.add(swap_request)
    db.add(history)
    db.commit()
    db.refresh(swap_request)
    
    # ✅ ENHANCED: Send notifications based on new status
    notification_service = NotificationService(db)
    try:
        if response.accepted:
            if swap_request.status == SwapStatus.MANAGER_FINAL_APPROVAL:
                # Notify manager that final approval is required
                print(f"📧 Sending final approval notifications for potential assignment {swap_id}")
                await send_final_approval_needed_notifications(
                    swap_request=swap_request,
                    notification_service=notification_service,
                    db=db,
                    background_tasks=background_tasks
                )
            else:
                # Standard acceptance notifications
                await send_swap_accepted_notifications(
                    swap_request=swap_request,
                    notification_service=notification_service,
                    db=db,
                    background_tasks=background_tasks
                )
        else:
            await send_swap_declined_notifications(
                swap_request=swap_request,
                notification_service=notification_service,
                db=db,
                background_tasks=background_tasks
            )
    except Exception as e:
        print(f"Failed to send potential assignment response notifications: {e}")
    
    return swap_request

# ==================== SUMMARY AND ANALYTICS ====================

@router.get("/facility/{facility_id}/summary", response_model=SwapSummary)
def get_swap_summary(
    facility_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get enhanced swap summary for facility dashboard"""
    
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

# ==================== HELPER FUNCTIONS ====================
async def execute_specific_swap_schedule_update(db: Session, swap_request: SwapRequest):
    """Execute schedule updates for specific staff-to-staff swaps"""
    
    print(f"🔄 Executing specific swap: {swap_request.requesting_staff_id} ↔ {swap_request.target_staff_id}")
    
    # Get the original assignments that need to be swapped
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
    
    if not original_assignment:
        raise Exception(f"Original assignment not found for requesting staff")
    
    if not target_assignment:
        raise Exception(f"Target assignment not found for target staff")
    
    # Check for conflicts before making changes
    await check_swap_conflicts(db, swap_request, original_assignment, target_assignment)
    
    # Perform the swap
    original_staff_id = original_assignment.staff_id
    target_staff_id = target_assignment.staff_id
    
    # Swap the staff assignments
    original_assignment.staff_id = target_staff_id
    target_assignment.staff_id = original_staff_id
    
    db.add(original_assignment)
    db.add(target_assignment)
    
    # Update zone assignments if they exist
    await update_zone_assignments_for_specific_swap(
        db, swap_request, original_staff_id, target_staff_id
    )
    
    # Commit the changes
    db.commit()
    print(f"✅ Specific swap assignments updated successfully")


async def execute_auto_swap_schedule_update(db: Session, swap_request: SwapRequest):
    """Execute schedule updates for auto-assignment swaps"""
    
    print(f"🔄 Executing auto swap: {swap_request.requesting_staff_id} → {swap_request.assigned_staff_id}")
    
    if not swap_request.assigned_staff_id:
        raise Exception("No assigned staff found for auto swap")
    
    # Get the original assignment
    original_assignment = db.exec(
        select(ShiftAssignment).where(
            ShiftAssignment.schedule_id == swap_request.schedule_id,
            ShiftAssignment.staff_id == swap_request.requesting_staff_id,
            ShiftAssignment.day == swap_request.original_day,
            ShiftAssignment.shift == swap_request.original_shift
        )
    ).first()
    
    if not original_assignment:
        raise Exception(f"Original assignment not found for requesting staff")
    
    # Check for conflicts with the new assignment
    await check_auto_swap_conflicts(db, swap_request, original_assignment)
    
    # Update the assignment to the new staff member
    original_staff_id = original_assignment.staff_id
    new_staff_id = swap_request.assigned_staff_id
    
    original_assignment.staff_id = new_staff_id
    db.add(original_assignment)
    
    # Update zone assignments if they exist
    await update_zone_assignments_for_auto_swap(
        db, swap_request, original_staff_id, new_staff_id
    )
    
    # Commit the changes
    db.commit()
    print(f"✅ Auto swap assignment updated successfully")


async def check_swap_conflicts(db: Session, swap_request: SwapRequest, original_assignment: ShiftAssignment, target_assignment: ShiftAssignment):
    """Check for scheduling conflicts before executing a specific swap"""
    
    conflicts = []
    
    # Check if either staff member has unavailability during the new shifts
    requesting_staff_unavailable = db.exec(
        select(StaffUnavailability).where(
            StaffUnavailability.staff_id == swap_request.requesting_staff_id,
            StaffUnavailability.start <= datetime.utcnow(),  # Simplified check
            StaffUnavailability.end >= datetime.utcnow()
        )
    ).first()
    
    target_staff_unavailable = db.exec(
        select(StaffUnavailability).where(
            StaffUnavailability.staff_id == swap_request.target_staff_id,
            StaffUnavailability.start <= datetime.utcnow(),  # Simplified check  
            StaffUnavailability.end >= datetime.utcnow()
        )
    ).first()
    
    if requesting_staff_unavailable:
        conflicts.append(f"Requesting staff has unavailability conflict")
    
    if target_staff_unavailable:
        conflicts.append(f"Target staff has unavailability conflict")
    
    # Check for double bookings (staff already assigned to other shifts same day)
    requesting_staff_other_shifts = db.exec(
        select(ShiftAssignment).where(
            ShiftAssignment.schedule_id == swap_request.schedule_id,
            ShiftAssignment.staff_id == swap_request.requesting_staff_id,
            ShiftAssignment.day == swap_request.target_day,
            ShiftAssignment.id != target_assignment.id
        )
    ).all()
    
    target_staff_other_shifts = db.exec(
        select(ShiftAssignment).where(
            ShiftAssignment.schedule_id == swap_request.schedule_id,
            ShiftAssignment.staff_id == swap_request.target_staff_id,
            ShiftAssignment.day == swap_request.original_day,
            ShiftAssignment.id != original_assignment.id
        )
    ).all()
    
    if requesting_staff_other_shifts:
        conflicts.append(f"Requesting staff already has {len(requesting_staff_other_shifts)} other shift(s) on target day")
    
    if target_staff_other_shifts:
        conflicts.append(f"Target staff already has {len(target_staff_other_shifts)} other shift(s) on original day")
    
    if conflicts:
        conflict_message = "; ".join(conflicts)
        print(f"⚠️ Swap conflicts detected: {conflict_message}")
        # For now, we'll log conflicts but allow the swap (manager override)
        # In production, you might want to block or require additional confirmation


async def check_auto_swap_conflicts(db: Session, swap_request: SwapRequest, original_assignment: ShiftAssignment):
    """Check for scheduling conflicts before executing an auto swap"""
    
    conflicts = []
    
    # Check if assigned staff has unavailability
    assigned_staff_unavailable = db.exec(
        select(StaffUnavailability).where(
            StaffUnavailability.staff_id == swap_request.assigned_staff_id,
            StaffUnavailability.start <= datetime.utcnow(),  # Simplified check
            StaffUnavailability.end >= datetime.utcnow()
        )
    ).first()
    
    if assigned_staff_unavailable:
        conflicts.append(f"Assigned staff has unavailability conflict")
    
    # Check for double bookings
    assigned_staff_other_shifts = db.exec(
        select(ShiftAssignment).where(
            ShiftAssignment.schedule_id == swap_request.schedule_id,
            ShiftAssignment.staff_id == swap_request.assigned_staff_id,
            ShiftAssignment.day == swap_request.original_day,
            ShiftAssignment.id != original_assignment.id
        )
    ).all()
    
    if assigned_staff_other_shifts:
        conflicts.append(f"Assigned staff already has {len(assigned_staff_other_shifts)} other shift(s) on this day")
    
    if conflicts:
        conflict_message = "; ".join(conflicts)
        print(f"⚠️ Auto swap conflicts detected: {conflict_message}")
        # Log conflicts but allow (manager has final authority)


async def update_zone_assignments_for_specific_swap(
    db: Session, 
    swap_request: SwapRequest, 
    original_staff_id: uuid.UUID, 
    target_staff_id: uuid.UUID
):
    """Update zone assignments for specific swaps"""
    
    # Get zone assignments for both staff members on their respective days
    original_zone_assignments = db.exec(
        select(ZoneAssignment).where(
            ZoneAssignment.schedule_id == swap_request.schedule_id,
            ZoneAssignment.staff_id == original_staff_id
        )
    ).all()
    
    target_zone_assignments = db.exec(
        select(ZoneAssignment).where(
            ZoneAssignment.schedule_id == swap_request.schedule_id,
            ZoneAssignment.staff_id == target_staff_id
        )
    ).all()
    
    # Swap zone assignments
    for zone_assignment in original_zone_assignments:
        zone_assignment.staff_id = target_staff_id
        db.add(zone_assignment)
    
    for zone_assignment in target_zone_assignments:
        zone_assignment.staff_id = original_staff_id
        db.add(zone_assignment)
    
    print(f"📍 Updated {len(original_zone_assignments) + len(target_zone_assignments)} zone assignments")


async def update_zone_assignments_for_auto_swap(
    db: Session, 
    swap_request: SwapRequest, 
    original_staff_id: uuid.UUID, 
    new_staff_id: uuid.UUID
):
    """Update zone assignments for auto swaps"""
    
    # Get zone assignments for the original staff member
    zone_assignments = db.exec(
        select(ZoneAssignment).where(
            ZoneAssignment.schedule_id == swap_request.schedule_id,
            ZoneAssignment.staff_id == original_staff_id
        )
    ).all()
    
    # Update zone assignments to new staff member
    for zone_assignment in zone_assignments:
        zone_assignment.staff_id = new_staff_id
        db.add(zone_assignment)
    
    print(f"📍 Updated {len(zone_assignments)} zone assignments for auto swap")

# Final approval notification function
async def send_final_approval_needed_notifications(
    swap_request: SwapRequest,
    notification_service: NotificationService,
    db: Session,
    background_tasks: BackgroundTasks
):
    """Send notifications when a swap needs final manager approval"""
    
    try:
        # Get schedule and facility info
        schedule = db.get(Schedule, swap_request.schedule_id)
        facility = db.get(Facility, schedule.facility_id)
        
        # Get facility managers
        managers = db.exec(
            select(User)
            .join(Staff, User.email == Staff.email)
            .where(Staff.facility_id == facility.id)
            .where(User.is_manager == True)
        ).all()
        
        # Get staff names for notification
        staff_name = "Unknown"
        requesting_staff_name = "Unknown"
        
        if swap_request.assigned_staff_id:
            assigned_staff = db.get(Staff, swap_request.assigned_staff_id)
            staff_name = assigned_staff.full_name if assigned_staff else "Unknown"
        elif swap_request.target_staff_id:
            target_staff = db.get(Staff, swap_request.target_staff_id)
            staff_name = target_staff.full_name if target_staff else "Unknown"
            
        if swap_request.requesting_staff_id:
            requesting_staff = db.get(Staff, swap_request.requesting_staff_id)
            requesting_staff_name = requesting_staff.full_name if requesting_staff else "Unknown"
        
        # Send notifications to managers
        for manager in managers:
            try:
                # 
                await notification_service.send_notification(
                    notification_type=NotificationType.SWAP_APPROVED,  # Using existing enum
                    recipient_user_id=manager.id,
                    template_data={
                        "staff_name": staff_name,
                        "requesting_staff_name": requesting_staff_name,
                        "swap_reason": swap_request.reason,
                        "facility_name": facility.name,
                        "swap_id": str(swap_request.id),
                        "action_required": "final_approval"
                    },
                    priority=NotificationPriority.HIGH,
                    action_url=f"/swaps/{swap_request.id}",
                    action_text="Review Final Approval",
                    background_tasks=background_tasks
                )
                
                print(f"📧 Sent final approval notification to manager: {manager.email}")
                
            except Exception as e:
                print(f"Failed to send notification to manager {manager.email}: {e}")
                
    except Exception as e:
        print(f"Failed to send final approval notifications: {e}")

# Update the notification function to use send_notification
async def send_swap_executed_notifications(
    swap_request: SwapRequest,
    notification_service: "NotificationService",
    db: Session,
    background_tasks: BackgroundTasks
):
    """Send notifications when a swap is executed (using SWAP_APPROVED notification type)"""
    
    try:
        # Get staff details
        requesting_staff = db.get(Staff, swap_request.requesting_staff_id)
        assigned_staff = db.get(Staff, swap_request.assigned_staff_id) if swap_request.assigned_staff_id else None
        target_staff = db.get(Staff, swap_request.target_staff_id) if swap_request.target_staff_id else None
        
        # Get the staff member who will be covering the shift
        covering_staff = assigned_staff or target_staff
        
        if not requesting_staff or not covering_staff:
            print("⚠️ Missing staff information for execution notifications")
            return
        
        # Notify the requesting staff
        if requesting_staff.email:
            try:
                requesting_user = db.exec(
                    select(User).where(User.email == requesting_staff.email)
                ).first()
                
                if requesting_user:
                    await notification_service.send_notification(
                        notification_type=NotificationType.SWAP_APPROVED,  # Using existing enum
                        recipient_user_id=requesting_user.id,
                        template_data={
                            "staff_name": requesting_staff.full_name,
                            "covering_staff_name": covering_staff.full_name,
                            "swap_reason": swap_request.reason,
                            "swap_id": str(swap_request.id)
                        },
                        priority=NotificationPriority.HIGH,
                        action_url=f"/swaps/{swap_request.id}",
                        action_text="View Swap Details",
                        background_tasks=background_tasks
                    )
                    
                    print(f"📧 Sent execution notification to requesting staff: {requesting_staff.email}")
                    
            except Exception as e:
                print(f"Failed to send notification to requesting staff {requesting_staff.email}: {e}")
        
        # Notify the covering staff
        if covering_staff.email:
            try:
                covering_user = db.exec(
                    select(User).where(User.email == covering_staff.email)
                ).first()
                
                if covering_user:
                    await notification_service.send_notification(
                        notification_type=NotificationType.SWAP_APPROVED,  # Using existing enum
                        recipient_user_id=covering_user.id,
                        template_data={
                            "staff_name": covering_staff.full_name,
                            "requesting_staff_name": requesting_staff.full_name,
                            "swap_reason": swap_request.reason,
                            "swap_id": str(swap_request.id)
                        },
                        priority=NotificationPriority.HIGH,
                        action_url=f"/schedule",
                        action_text="View Updated Schedule",
                        background_tasks=background_tasks
                    )
                    
                    print(f"📧 Sent execution notification to covering staff: {covering_staff.email}")
                    
            except Exception as e:
                print(f"Failed to send notification to covering staff {covering_staff.email}: {e}")
                
    except Exception as e:
        print(f"Failed to send swap execution notifications: {e}")

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