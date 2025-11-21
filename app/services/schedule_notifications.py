# app/services/schedule_notifications.py

from datetime import datetime
from typing import List
from fastapi import BackgroundTasks
from sqlmodel import Session, select

from .notification_service import NotificationService
from ..models import Schedule, Staff, User, Facility, NotificationType, NotificationPriority
from ..core.config import get_settings

class ScheduleNotificationHandler:
    """Handles all schedule-related notifications"""
    
    def __init__(self, db: Session, notification_service: NotificationService):
        self.db = db
        self.notification_service = notification_service
    
    async def notify_schedule_published(
        self, 
        schedule: Schedule, 
        background_tasks: BackgroundTasks,
        pdf_url: str = None
    ):
        """Notify all staff when a new schedule is published"""
        
        # Get all staff for this facility
        staff_list = self.db.exec(
            select(Staff).where(
                Staff.facility_id == schedule.facility_id,
                Staff.is_active == True
            )
        ).all()
        
        # Get facility name
        facility = self.db.get(Facility, schedule.facility_id)
        facility_name = facility.name if facility else "Your facility"
        
        print(f" Sending schedule notifications to {len(staff_list)} staff members")

        # Get frontend URL for absolute links
        settings = get_settings()

        for staff in staff_list:
            # Find their user account
            user = self.db.exec(
                select(User).where(User.email == staff.email)
            ).first()

            if user:
                # Build absolute URL for email links
                action_url = f"{settings.FRONTEND_URL}/schedule/{schedule.id}"

                await self.notification_service.send_notification(
                    notification_type=NotificationType.SCHEDULE_PUBLISHED,
                    recipient_user_id=user.id,
                    template_data={
                        "staff_name": staff.full_name,
                        "week_start": schedule.week_start.strftime("%B %d, %Y"),
                        "facility_name": facility_name
                    },
                    channels=["IN_APP", "PUSH", "WHATSAPP"],
                    priority=NotificationPriority.HIGH,
                    action_url=action_url,
                    action_text="View Schedule",
                    background_tasks=background_tasks,
                    pdf_attachment_url=pdf_url
                )
            else:
                print(f"No user account found for staff {staff.email}")
        
        print(f"Schedule publication notifications queued for {facility_name}")