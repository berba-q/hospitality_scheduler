# app/api/endpoints/quick_actions.py
"""
Quick action API endpoints for actionable notifications
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select
from datetime import datetime
from typing import Dict, Any

# Import your models
from app.models import (
    SwapRequest, 
    User, 
    Staff,
    NotificationType, 
    NotificationPriority,
    Notification
)

# Import dependencies
from app.deps import get_current_user, get_db

# Import services
from app.services.notification_service import NotificationService
from app.services.enhanced_notification_service import EnhancedNotificationService
from app.services.user_staff_mapping import UserStaffMappingService

import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/swaps")

def get_user_display_name(current_user: User, db: Session) -> str:
    """Get user's display name, falling back to email if no staff record"""
    if current_user.is_manager:
        # For managers, we might not have a staff record, use email
        return current_user.email.split('@')[0].replace('.', ' ').title()
    
    # For staff users, get full name from Staff table
    mapping_service = UserStaffMappingService(db)
    staff = mapping_service.get_staff_from_user_id(current_user.id)
    
    if staff and staff.full_name:
        return staff.full_name
    
    # Fallback to email-based name
    return current_user.email.split('@')[0].replace('.', ' ').title()

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
        
        db.commit()
        db.refresh(swap_request)
        
        # Send notifications to relevant parties
        notification_service = EnhancedNotificationService(db)
        user_display_name = get_user_display_name(current_user, db)  # ← FIXED: No more .full_name
        
        # Notify the requesting staff
        requesting_user = db.get(User, swap_request.requesting_staff_id)
        if requesting_user:
            await notification_service.create_swap_approved_notification(
                db=db,
                swap_request=swap_request,
                approver=current_user,
                template_data={
                    "approver_name": user_display_name,  # ← FIXED: Use helper function
                    "swap_id": str(swap_request.id),
                    "original_date": swap_request.original_shift_date.strftime("%B %d, %Y"),
                    "new_date": swap_request.requested_shift_date.strftime("%B %d, %Y"),
                },
                background_tasks=background_tasks
            )
        
        logger.info(f"Swap {swap_id} approved by user {current_user.id}")
        
        return {
            "message": "Swap request approved successfully!",
            "swap_id": swap_id,
            "status": "APPROVED"
        }
        
    except Exception as e:
        logger.error(f"Error approving swap {swap_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to approve swap: {str(e)}")

@router.post("/{swap_id}/decline")
async def decline_swap_quick_action(
    swap_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Quick action API endpoint for declining swap requests"""
    
    try:
        # Get the swap request
        swap_request = db.get(SwapRequest, swap_id)
        if not swap_request:
            raise HTTPException(status_code=404, detail="Swap request not found")
        
        # Verify user has permission to decline this swap
        if swap_request.target_staff_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to decline this swap")
        
        if swap_request.status != "PENDING":
            raise HTTPException(status_code=400, detail="Swap request is not pending")
        
        # Update swap status
        swap_request.status = "DECLINED"
        swap_request.declined_by_id = current_user.id
        swap_request.declined_at = datetime.utcnow()
        
        db.commit()
        db.refresh(swap_request)
        
        # Send notifications to relevant parties
        notification_service = EnhancedNotificationService(db)
        user_display_name = get_user_display_name(current_user, db)  
        
        # Notify the requesting staff
        requesting_user = db.get(User, swap_request.requesting_staff_id)
        if requesting_user:
            await notification_service.create_swap_declined_notification(
                db=db,
                swap_request=swap_request,
                decliner=current_user,
                template_data={
                    "decliner_name": user_display_name,  
                    "swap_id": str(swap_request.id),
                    "original_date": swap_request.original_shift_date.strftime("%B %d, %Y"),
                    "requested_date": swap_request.requested_shift_date.strftime("%B %d, %Y"),
                },
                background_tasks=background_tasks
            )
        
        logger.info(f"Swap {swap_id} declined by user {current_user.id}")
        
        return {
            "message": "Swap request declined",
            "swap_id": swap_id,
            "status": "DECLINED"
        }
        
    except Exception as e:
        logger.error(f"Error declining swap {swap_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to decline swap: {str(e)}")

@router.post("/coverage/{shift_id}/volunteer")
async def volunteer_for_coverage(
    shift_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Quick action for volunteering for emergency coverage"""
    
    try:
        notification_service = EnhancedNotificationService(db)
        user_display_name = get_user_display_name(current_user, db)  # ← FIXED: No more .full_name
        
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
                        "volunteer_name": user_display_name,  #  Use helper function
                        "shift_id": shift_id,
                        "facility_name": "Main Facility"
                    },
                    background_tasks=background_tasks
                )
                
            except Exception as e:
                logger.error(f"Failed to notify manager {manager.id}: {str(e)}")
                continue
        
        logger.info(f"User {current_user.id} volunteered for coverage on shift {shift_id}")
        
        return {
            "message": "Thank you for volunteering! A manager will confirm shortly.",
            "shift_id": shift_id,
            "volunteer_name": user_display_name
        }
        
    except Exception as e:
        logger.error(f"Error volunteering for coverage on shift {shift_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to volunteer for coverage: {str(e)}")