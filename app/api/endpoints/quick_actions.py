# app/api/endpoints/quick_actions.py
"""
Quick action API endpoints for actionable notifications
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session
from datetime import datetime
from typing import Dict, Any

# Import your models
from app.models import (
    SwapRequest, 
    User, 
    NotificationType, 
    NotificationPriority,
    Notification  # Make sure this is imported
)

# Import dependencies
from app.deps import get_current_user, get_db

# Import services - adjust this import path to match your project structure
from app.services.notification_service import NotificationService
from app.services.enhanced_notification_service import EnhancedNotificationService

# Import logging utility
# Import logging utility (adjust path if needed)
import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/swaps")

@router.post("/{swap_id}/approve")
async def approve_swap_quick_action(
    swap_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Quick action API endpoint for approving swap requests"""
    
    try:
        # Get the swap request
        swap_request = db.get(SwapRequest, swap_id)
        if not swap_request:
            raise HTTPException(status_code=404, detail="Swap request not found")
        
        # Verify user has permission to approve this swap
        if swap_request.target_staff_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to approve this swap")
        
        if swap_request.status != "PENDING":
            raise HTTPException(status_code=400, detail="Swap request is not pending")
        
        # Update swap status
        swap_request.status = "APPROVED"
        swap_request.approved_by_id = current_user.id
        swap_request.approved_at = datetime.utcnow()
        
        db.add(swap_request)
        db.commit()
        db.refresh(swap_request)
        
        # Use enhanced notification service
        notification_service = EnhancedNotificationService(db)
        
        # Send notification to requester with quick actions
        await notification_service.create_swap_approved_notification(
            db=db,
            swap_request=swap_request,
            approver=current_user,
            template_data={
                "requester_name": swap_request.requesting_staff.full_name,
                "approver_name": current_user.full_name,
                "original_day": swap_request.original_day,
                "original_shift": swap_request.original_shift
            },
            background_tasks=background_tasks
        )   
        return {
            "message": "Swap request approved successfully",
            "swap_id": swap_id,
            "status": "APPROVED"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to approve swap {swap_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to approve swap request")


@router.post("/{swap_id}/decline")
async def decline_swap_quick_action(
    swap_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Quick action API endpoint for declining swap requests"""
    
    try:
        swap_request = db.get(SwapRequest, swap_id)
        if not swap_request:
            raise HTTPException(status_code=404, detail="Swap request not found")
        
        if swap_request.target_staff_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to decline this swap")
        
        if swap_request.status != "PENDING":
            raise HTTPException(status_code=400, detail="Swap request is not pending")
        
        # Update swap status
        swap_request.status = "DECLINED" 
        swap_request.declined_by_id = current_user.id
        swap_request.declined_at = datetime.utcnow()
        
        db.add(swap_request)
        db.commit()
        db.refresh(swap_request)
        
        # Use enhanced notification service
        notification_service = EnhancedNotificationService(db)
        
        # Send notification to requester with helpful quick actions
        await notification_service.create_swap_declined_notification(
            db=db,
            swap_request=swap_request,
            decliner=current_user,
            template_data={
                "requester_name": swap_request.requesting_staff.full_name,
                "decliner_name": current_user.full_name,
                "original_day": swap_request.original_day,
                "original_shift": swap_request.original_shift
            },
            background_tasks=background_tasks
        )
        
        logger.info(f"Swap {swap_id} declined by {current_user.id}")
        
        return {
            "message": "Swap request declined",
            "swap_id": swap_id,
            "status": "DECLINED"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to decline swap {swap_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to decline swap request")


@router.post("/coverage/{shift_id}/volunteer")
async def volunteer_for_coverage(
    shift_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Quick action API endpoint for volunteering for emergency coverage"""
    
    try:
        # You might want to validate the shift exists here
        # shift = db.get(Shift, shift_id)
        # if not shift:
        #     raise HTTPException(status_code=404, detail="Shift not found")
        
        # For now, we'll just create notifications for managers
        # In a real implementation, you'd create a CoverageVolunteer record
        
        # Use enhanced notification service  
        notification_service = EnhancedNotificationService(db)
        
        # Find managers to notify
        managers = db.query(User).filter(
            User.is_manager == True,
            User.tenant_id == current_user.tenant_id
        ).all()
        
        if not managers:
            raise HTTPException(status_code=404, detail="No managers found to notify")
        
        # Notify each manager with enhanced notifications
        for manager in managers:
            try:
                await notification_service.create_emergency_coverage_notification(
                    db=db,
                    shift_details={"shift_id": shift_id},
                    target_staff=manager,
                    template_data={
                        "volunteer_name": current_user.full_name,
                        "shift_id": shift_id,
                        "facility_name": "Main Facility"  # You'd get this from the shift
                    },
                    background_tasks=background_tasks
                )
                
            except Exception as e:
                logger.error(f"Failed to notify manager {manager.id}: {str(e)}")
                # Continue with other managers
                continue
        
        logger.info(f"User {current_user.id} volunteered for coverage on shift {shift_id}")
        
        return {
            "message": "Thank you for volunteering! A manager will confirm shortly.",
            "shift_id": shift_id,
            "volunteer_id": str(current_user.id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to process volunteer request for shift {shift_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process volunteer request")


@router.post("/{swap_id}/cancel")
async def cancel_swap_request(
    swap_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a swap request (for the requester)"""
    
    try:
        swap_request = db.get(SwapRequest, swap_id)
        if not swap_request:
            raise HTTPException(status_code=404, detail="Swap request not found")
        
        # Only the requester can cancel their own request
        if swap_request.requesting_staff_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to cancel this swap")
        
        if swap_request.status != "PENDING":
            raise HTTPException(status_code=400, detail="Can only cancel pending requests")
        
        # Update status
        swap_request.status = "CANCELLED"
        swap_request.cancelled_at = datetime.utcnow()
        
        db.add(swap_request)
        db.commit()
        
        # Optionally notify the target staff that the request was cancelled
        if swap_request.target_staff_id:
            notification_service = EnhancedNotificationService(db)
            
            # Send simple notification about cancellation
            await notification_service.send_notification(
                notification_type=NotificationType.SWAP_REQUEST,  # You might want to add SWAP_CANCELLED type
                recipient_user_id=swap_request.target_staff_id,
                template_data={
                    "requester_name": current_user.full_name,
                    "original_day": swap_request.original_day,
                    "original_shift": swap_request.original_shift,
                    "message": "Swap request has been cancelled"
                },
                channels=['IN_APP'],
                priority=NotificationPriority.LOW,
                background_tasks=background_tasks
            )
        
        logger.info(f"Swap {swap_id} cancelled by requester {current_user.id}")
        
        return {
            "message": "Swap request cancelled successfully",
            "swap_id": swap_id,
            "status": "CANCELLED"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel swap {swap_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to cancel swap request")