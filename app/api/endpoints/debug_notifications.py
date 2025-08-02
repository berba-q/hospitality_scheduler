# app/api/endpoints/debug_notifications.py
# Debug endpoint to inspect notification data structure

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import Dict, Any, List
import json

from app.models import Notification, User, NotificationType
from app.deps import get_current_user, get_db

router = APIRouter(prefix="/debug")

@router.get("/notifications/debug/all")
async def get_all_notifications_debug(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug endpoint to see all notifications for current user with data analysis"""
    
    notifications = db.exec(
        select(Notification)
        .where(Notification.recipient_user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(10)
    ).all()
    
    debug_info = []
    
    for notification in notifications:
        debug_info.append({
            "id": str(notification.id),
            "title": notification.title,
            "type": notification.notification_type,
            "created": notification.created_at.isoformat(),
            "has_data": notification.data is not None,
            "data_keys": list(notification.data.keys()) if notification.data else [],
            "has_quick_actions": "quick_actions" in (notification.data or {}),
            "quick_actions_count": len(notification.data.get("quick_actions", [])) if notification.data else 0,
            "quick_actions_summary": [
                {
                    "id": qa.get("id"),
                    "label": qa.get("label"),
                    "action": qa.get("action"),
                    "has_api_endpoint": "api_endpoint" in qa,
                    "api_endpoint": qa.get("api_endpoint")
                }
                for qa in notification.data.get("quick_actions", [])
            ] if notification.data and "quick_actions" in notification.data else [],
            "raw_data": notification.data
        })
    
    return {
        "user_id": str(current_user.id),
        "user_email": current_user.email,
        "total_notifications": len(debug_info),
        "notifications_with_quick_actions": len([n for n in debug_info if n["has_quick_actions"]]),
        "notifications": debug_info
    }

@router.post("/notifications/test/create-swap")
async def create_test_swap_notification(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a test swap notification with quick actions for debugging"""
    
    from app.services.enhanced_notification_service import EnhancedNotificationService
    
    # Mock SwapRequest object
    class MockSwapRequest:
        def __init__(self):
            self.id = "test-swap-123"
            self.urgency = "high"
    
    mock_swap_request = MockSwapRequest()
    
    service = EnhancedNotificationService(db)
    
    try:
        notification = await service.create_swap_request_notification(
            db=db,
            swap_request=mock_swap_request,
            target_staff=current_user,
            template_data={
                "requester_name": "Test User",
                "original_date": "January 30, 2025",
                "requested_date": "January 31, 2025",
                "reason": "Testing quick actions"
            }
        )
        
        return {
            "message": "Test notification created successfully",
            "notification_id": str(notification.id),
            "has_quick_actions": "quick_actions" in (notification.data or {}),
            "quick_actions_count": len(notification.data.get("quick_actions", [])) if notification.data else 0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create test notification: {str(e)}")
        
@router.post("/notifications/test/create-emergency")
async def create_test_emergency_notification(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a test emergency coverage notification with quick actions for debugging"""
    
    from app.services.enhanced_notification_service import EnhancedNotificationService
    
    service = EnhancedNotificationService(db)
    
    try:
        notification = await service.create_emergency_coverage_notification(
            db=db,
            shift_details={"shift_id": "test-shift-456"},
            target_staff=current_user,
            template_data={
                "volunteer_name": "Test Volunteer",
                "shift_id": "test-shift-456",
                "facility_name": "Test Facility"
            }
        )
        
        return {
            "message": "Test emergency notification created successfully",
            "notification_id": str(notification.id),
            "has_quick_actions": "quick_actions" in (notification.data or {}),
            "quick_actions_count": len(notification.data.get("quick_actions", [])) if notification.data else 0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create test emergency notification: {str(e)}")

@router.get("/notifications/{notification_id}")
async def get_notification_debug(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug endpoint to inspect a specific notification's data structure"""
    
    notification = db.get(Notification, notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Check if user owns this notification
    if notification.recipient_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this notification")
    
    # Return detailed debugging info
    return {
        "notification_id": str(notification.id),
        "title": notification.title,
        "message": notification.message,
        "notification_type": notification.notification_type,
        "priority": notification.priority,
        "is_read": notification.is_read,
        "created_at": notification.created_at.isoformat(),
        "action_url": notification.action_url,
        "action_text": notification.action_text,
        "channels": notification.channels,
        "data_type": type(notification.data).__name__,
        "data_keys": list(notification.data.keys()) if notification.data else [],
        "has_quick_actions": "quick_actions" in (notification.data or {}),
        "quick_actions_count": len(notification.data.get("quick_actions", [])) if notification.data else 0,
        "raw_data": notification.data,
        "data_as_json": json.dumps(notification.data, indent=2) if notification.data else None
    }