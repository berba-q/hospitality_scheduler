# app/api/endpoints/notifications.py

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlmodel import Session, select, func, desc
from sqlalchemy import cast
from sqlalchemy.dialects.postgresql import JSONB
from typing import List, Optional
from datetime import datetime
import uuid

from ...deps import get_db, get_current_user
from ...models import Notification, NotificationPreference, NotificationType, User
from ...schemas import (
    NotificationRead, NotificationPreferenceRead, NotificationPreferenceUpdate, WhatsAppNumberUpdate
)
from ...services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/", response_model=List[NotificationRead])
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    unread_only:      bool = Query(False, alias="unread"),          # snake
    unread_camel:     bool = Query(False, alias="unreadOnly"),      # camel
    in_app_only:      bool = Query(False, alias="in_app"),
    in_app_camel:     bool = Query(False, alias="inAppOnly"),
    delivered_only:   bool = Query(False, alias="delivered"),
    delivered_camel:  bool = Query(False, alias="deliveredOnly"),
):
    # merge aliases
    unread     = unread_only or unread_camel
    in_app     = in_app_only or in_app_camel
    delivered  = delivered_only or delivered_camel
    """Get current user's notifications"""
    
    query = select(Notification).where(
        Notification.recipient_user_id == current_user.id
    )

    if unread:
        query = query.where(Notification.is_read == False)

    if delivered:
        query = query.where(Notification.is_delivered.is_(True)) # type: ignore

    if in_app:
        # channels is stored as JSONB/JSON; use the Postgres @> containment operator
        query = query.where(
            cast(Notification.channels, JSONB).contains(['IN_APP'])
        )
    
    query = query.order_by(desc(Notification.created_at)).offset(offset).limit(limit)
    
    notifications = db.exec(query).all()
    return notifications

@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a notification as read"""
    
    notification = db.get(Notification, notification_id)
    if not notification or notification.recipient_user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    notification.read_at = datetime.utcnow()
    db.commit()
    
    return {"success": True}

@router.post("/mark-all-read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all notifications as read"""
    
    notifications = db.exec(
        select(Notification).where(
            Notification.recipient_user_id == current_user.id,
            Notification.is_read == False
        )
    ).all()
    
    for notification in notifications:
        notification.is_read = True
        notification.read_at = datetime.utcnow()
    
    db.commit()
    
    return {"success": True, "marked_count": len(notifications)}

@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get count of unread notifications"""
    
    count = db.exec(
        select(func.count(Notification.id)).where( # type: ignore
            Notification.recipient_user_id == current_user.id,
            Notification.is_read == False
        )
    ).first()
    
    return {"unread_count": count or 0}

@router.get("/preferences", response_model=List[NotificationPreferenceRead])
def get_notification_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's notification preferences"""
    
    preferences = db.exec(
        select(NotificationPreference).where(
            NotificationPreference.user_id == current_user.id
        )
    ).all()
    
    return preferences

@router.put("/preferences/{notification_type}")
def update_notification_preference(
    notification_type: NotificationType,
    preference_update: NotificationPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update notification preferences for a specific type"""
    
    preference = db.exec(
        select(NotificationPreference).where(
            NotificationPreference.user_id == current_user.id,
            NotificationPreference.notification_type == notification_type
        )
    ).first()
    
    if not preference:
        preference = NotificationPreference(
            user_id=current_user.id,
            notification_type=notification_type
        )
    
    for field, value in preference_update.dict(exclude_unset=True).items():
        setattr(preference, field, value)
    
    preference.updated_at = datetime.utcnow()
    db.add(preference)
    db.commit()
    db.refresh(preference)
    
    return preference


@router.post("/whatsapp-number")
def update_whatsapp_number(
    number_update: WhatsAppNumberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user's WhatsApp number"""
    
    current_user.whatsapp_number = number_update.whatsapp_number
    db.add(current_user)
    db.commit()
    
    return {"success": True, "message": "WhatsApp number updated"}

@router.post("/test")
async def send_test_notification(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Send a test notification (for testing purposes)"""
    
    notification_service = NotificationService(db)
    
    try:
        notification = await notification_service.send_notification(
            notification_type=NotificationType.SCHEDULE_PUBLISHED,
            recipient_user_id=current_user.id,
            template_data={
                "staff_name": current_user.email.split('@')[0],
                "week_start": "January 20, 2025",
                "facility_name": "Test Facility"
            },
            channels=["IN_APP", "PUSH", "WHATSAPP"],
            background_tasks=background_tasks
        )
        return {
            "success": True, 
            "message": "Test notification sent",
            "notification_id": str(notification.id)
        }
    except Exception as e:
        return {"success": False, "message": f"Failed to send notification: {str(e)}"}

@router.get("/delivery-stats")
def get_delivery_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get notification delivery statistics (for managers)"""
    
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    # Get recent notifications for this tenant
    recent_notifications = db.exec(
        select(Notification).where(
            Notification.tenant_id == current_user.tenant_id
        ).order_by(desc(Notification.created_at)).limit(100)
    ).all()
    
    total_count = len(recent_notifications)
    delivered_count = sum(1 for n in recent_notifications if n.is_delivered)
    read_count = sum(1 for n in recent_notifications if n.is_read)
    
    # Channel performance
    channel_stats = {}
    for notification in recent_notifications:
        for channel, status in notification.delivery_status.items():
            if channel not in channel_stats:
                channel_stats[channel] = {"sent": 0, "delivered": 0}
            channel_stats[channel]["sent"] += 1
            if status.get("status") == "delivered":
                channel_stats[channel]["delivered"] += 1
    
    return {
        "total_notifications": total_count,
        "delivered_rate": f"{(delivered_count/total_count*100):.1f}%" if total_count > 0 else "0%",
        "read_rate": f"{(read_count/total_count*100):.1f}%" if total_count > 0 else "0%",
        "channel_performance": {
            channel: {
                "delivery_rate": f"{(stats['delivered']/stats['sent']*100):.1f}%" if stats['sent'] > 0 else "0%",
                **stats
            }
            for channel, stats in channel_stats.items()
        }
    }