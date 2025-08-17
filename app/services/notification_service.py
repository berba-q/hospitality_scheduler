# app/services/notification_service.py

from asyncio.log import logger
from typing import List, Dict, Any, Optional
from sqlmodel import Session, select
from fastapi import BackgroundTasks
import httpx
import uuid
from datetime import datetime
import string
import asyncio, logging

from app.services.user_staff_mapping import UserStaffMappingService

from ..models import (
    Facility, Notification, NotificationTemplate, NotificationPreference, Schedule, SwapRequest,
    User, Staff, NotificationType, NotificationPriority, ShiftAssignment
)
from ..core.config import get_settings
from .firebase_service import FirebaseService

settings = get_settings()

class NotificationService:
    """Centralized notification service"""
    
    def __init__(self, db: Session):
        self.db = db
        self.firebase_service = FirebaseService()
    
    def _get_validated_user_from_staff(self, staff_id: uuid.UUID) -> Optional[User]:
        """Get and validate user from staff ID"""
        mapping_service = UserStaffMappingService(self.db)
        user = mapping_service.get_user_from_staff_id(staff_id)
        
        if not user:
            print(f"No user found for staff ID {staff_id}")
            return None
        
        if not user.is_active:
            print(f"User {user.email} is not active")
            return None
        
        print(f"Validated user {user.email} for staff ID {staff_id}")
        return user
    
    async def send_bulk_schedule_notifications(
        self, 
        schedule_id: uuid.UUID, 
        notification_type: NotificationType,
        custom_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send schedule notifications to all staff using multicast"""
        
        # Get all staff for the schedule
        schedule = self.db.get(Schedule, schedule_id)
        if not schedule:
            raise ValueError(f"Schedule {schedule_id} not found")
        
        # Get all staff assignments for this schedule
        assignments = self.db.exec(
            select(ShiftAssignment)
            .where(ShiftAssignment.schedule_id == schedule_id)
        ).all()
        
        staff_user_mapping = {}
        notification_data = []
        
        for assignment in assignments:
            user = self._get_validated_user_from_staff(assignment.staff_id)
            if user and user.push_token:
                staff_user_mapping[user.push_token] = user
                
                # Create notification record for each user
                notification = Notification(
                    notification_type=notification_type,
                    recipient_user_id=user.id,
                    tenant_id=user.tenant_id,  # Added tenant_id
                    title="Schedule Published",
                    message=custom_message or f"Your schedule for week starting {schedule.week_start} is now available",
                    priority=NotificationPriority.HIGH,
                    channels=["PUSH", "IN_APP"],
                    data={
                        "schedule_id": str(schedule_id),
                        "week_start": schedule.week_start.isoformat(),
                        "facility_id": str(schedule.facility_id)
                    }
                )
                self.db.add(notification)
                notification_data.append(notification)
        
        self.db.commit()
        
        # Use multicast for efficient push delivery
        if staff_user_mapping:
            tokens = list(staff_user_mapping.keys())
            
            success_count, failure_count = await self.firebase_service.send_push_multicast(
                tokens=tokens,
                title="Schedule Published",
                body=custom_message or f"Your schedule for week starting {schedule.week_start} is now available",
                data={
                    "notification_type": str(notification_type),
                    "schedule_id": str(schedule_id),
                    "action_url": f"/schedule/{schedule_id}"
                },
                action_url=f"/schedule/{schedule_id}",
                analytics_label=f"schedule_published_{schedule.facility_id}"
            )
            
            # Update delivery status for all notifications
            for notification in notification_data:
                user = self.db.get(User, notification.recipient_user_id)
                if user and user.push_token in tokens:
                    # Determine if this specific token succeeded
                    # (Firebase multicast gives batch totals, not per-token results)
                    delivery_status = {
                        "PUSH": {
                            "status": "delivered" if success_count > 0 else "failed",
                            "timestamp": datetime.utcnow().isoformat(),
                            "method": "multicast"
                        },
                        "IN_APP": {
                            "status": "delivered",
                            "timestamp": datetime.utcnow().isoformat()
                        }
                    }
                    
                    notification.delivery_status = delivery_status
                    notification.is_delivered = True
                    notification.delivered_at = datetime.utcnow()
            
            self.db.commit()
            
            logger.info(
                "bulk_schedule_notification_sent",
                extra={
                    "schedule_id": str(schedule_id),
                    "total_recipients": len(tokens),
                    "push_success": success_count,
                    "push_failure": failure_count,
                    "analytics_label": f"schedule_published_{schedule.facility_id}"
                }
            )
        
        return {
            "total_recipients": len(notification_data),
            "push_success": success_count if staff_user_mapping else 0,
            "push_failure": failure_count if staff_user_mapping else 0,
            "notifications_created": len(notification_data)
        }
    
    # Send a notification through multiple channels
    async def send_notification(
        self,
        notification_type: NotificationType,
        recipient_user_id: uuid.UUID,
        template_data: Dict[str, Any],
        channels: Optional[List[str]] = None,
        priority: Optional[NotificationPriority] = None,
        action_url: Optional[str] = None,
        action_text: Optional[str] = None,
        background_tasks: Optional[BackgroundTasks] = None,
        pdf_attachment_url: Optional[str] = None
    ) -> Notification:
        """Send a notification through multiple channels"""
        
        print(f"🔍 Creating notification: {notification_type} for user {recipient_user_id}")
    
        # CRITICAL: Validate recipient exists and is active
        user = self.db.get(User, recipient_user_id)
        if not user:
            raise ValueError(f"User {recipient_user_id} not found")
        
        if not user.is_active:
            raise ValueError(f" User {user.email} is not active")
        
        print(f" Validated recipient: {user.email} (User ID: {user.id})")
        
        # Get template
        template = self._get_template(notification_type, user.tenant_id)
        if not template:
            print(f" No template found for {notification_type}, creating basic notification")
            return await self._create_basic_notification(
                notification_type, user, template_data, channels, priority, action_url, action_text, pdf_attachment_url
            )
        
        # Get user preferences
        preferences = self._get_user_preferences(user.id, notification_type)
        
        # Determine channels
        if channels is None:
            channels = self._determine_channels(template, preferences)
        
        # Render content
        title = self._render_template(template.title_template, template_data)
        message = self._render_template(template.message_template, template_data)
        
        # Add PDF attachment to data if provided
        notification_data = template_data.copy()
        if pdf_attachment_url:
            notification_data["pdf_attachment_url"] = pdf_attachment_url
            print(f"📎 PDF attachment added: {pdf_attachment_url}")
        
        # Create notification record
        notification = Notification(
            recipient_user_id=user.id,
            tenant_id=user.tenant_id,
            notification_type=notification_type,
            title=title,
            message=message,
            priority=priority or template.priority,
            channels=channels,
            data=notification_data,  # updated data with PDF
            action_url=action_url,
            action_text=action_text
        )
        
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        
        print(f"Notification {notification.id} created for {user.email}")
        
        # Send through channels
        if background_tasks:
            background_tasks.add_task(
                self._deliver_notification,
                str(notification.id),  # Pass as string ID
                template_data
            )
        else:
            # Deliver immediately
            await self._deliver_notification(str(notification.id), template_data)
        
        return notification
    
    async def _create_basic_notification(
        self,
        notification_type: NotificationType,
        user: User,
        template_data: Dict[str, Any],
        channels: Optional[List[str]],
        priority: Optional[NotificationPriority],
        action_url: Optional[str],
        action_text: Optional[str],
        pdf_attachment_url: Optional[str] = None  # PDF support in basic notifications
    ) -> Notification:
        """Create a basic notification when no template exists"""
        
        # Basic fallback messages
        basic_messages = {
            NotificationType.SCHEDULE_PUBLISHED: "Your new schedule is available",
            NotificationType.SWAP_REQUEST: "You have a new shift swap request",
            NotificationType.SWAP_APPROVED: "Your swap request has been approved",
            NotificationType.SWAP_DENIED: "Your swap request has been declined",
            NotificationType.EMERGENCY_COVERAGE: "Urgent coverage needed",
            NotificationType.SHIFT_REMINDER: "Shift reminder",
            NotificationType.SCHEDULE_CHANGE: "Schedule has been updated",
            NotificationType.SWAP_ASSIGNMENT: "You have been assigned to cover a shift",  # ✅ NEW
            NotificationType.PASSWORD_RESET: "A password reset instruction has been sent to your email"
        }
        
        title = f"{notification_type.value.replace('_', ' ').title()}"
        message = basic_messages.get(notification_type, "You have a new notification")
        
        # Add PDF attachment to data if provided
        notification_data = template_data.copy()
        if pdf_attachment_url:
            notification_data["pdf_attachment_url"] = pdf_attachment_url
            print(f"📎 PDF attachment added to basic notification: {pdf_attachment_url}")
        
        notification = Notification(
            recipient_user_id=user.id,
            tenant_id=user.tenant_id,
            notification_type=notification_type,
            title=title,
            message=message,
            priority=priority or NotificationPriority.MEDIUM,
            channels=channels or ["IN_APP"],
            data=notification_data,  # updated data with PDF
            action_url=action_url,
            action_text=action_text
        )
        
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        
        return notification
    
    async def _deliver_notification(
        self, 
        notification_id: str,
        template_data: Dict[str, Any]
    ):
        """Deliver notification through all specified channels - SAFE VERSION"""
        
        # ✅ Create a new session for the background task
        from sqlmodel import Session
        from app.deps import engine
        
        with Session(engine) as session:
            # ✅ Fetch fresh notification object in this session
            notification = session.get(Notification, uuid.UUID(notification_id))
            if not notification:
                print(f"❌ Notification {notification_id} not found")
                return
            
            # Get template in this session
            template = session.exec(
                select(NotificationTemplate).where(
                    NotificationTemplate.notification_type == notification.notification_type,
                    NotificationTemplate.tenant_id == notification.tenant_id
                )
            ).first()
            
            delivery_status = {}
            
            print(f"📧 Delivering notification {notification.id} via channels: {notification.channels}")
            
            for channel in notification.channels:
                try:
                    if channel == "IN_APP":
                        # In-app notifications are already stored in DB
                        delivery_status[channel] = {
                            "status": "delivered", 
                            "timestamp": datetime.utcnow().isoformat()
                        }
                        print(f"In-app notification delivered")
                    
                    elif channel == "PUSH":
                        success = await self._send_push_notification(notification, session)
                        delivery_status[channel] = {
                            "status": "delivered" if success else "failed",
                            "timestamp": datetime.utcnow().isoformat()
                        }
                        print(f"{'Done' if success else 'Err'} Push notification {'delivered' if success else 'failed'}")
                    
                except Exception as e:
                    delivery_status[channel] = {
                        "status": "error",
                        "error": str(e),
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    print(f"Error delivering via {channel}: {e}")
            
            #  Update delivery status in the same session
            notification.delivery_status = delivery_status
            notification.is_delivered = any(
                status.get("status") == "delivered" 
                for status in delivery_status.values()
            )
            if notification.is_delivered:
                notification.delivered_at = datetime.utcnow()
            
            session.add(notification)
            session.commit()
            
            print(f"Delivery status updated for notification {notification.id}")
    
    async def _send_push_notification(self, notification: Notification, session: Session) -> bool:
        """Send push notification with session safety"""
        try:
            user = session.get(User, notification.recipient_user_id)
            if not user or not user.push_token:
                logger.warning(
                    "push_notification_no_token",
                    extra={
                        "user_id": str(notification.recipient_user_id),
                        "user_email": user.email if user else "unknown"
                    }
                )
                return False
            
            if not self.firebase_service.is_available():
                logger.error("firebase_service_unavailable")
                return False
            
            push_data = {
                "notification_id": str(notification.id),
                "type": str(notification.notification_type),
                "action_url": notification.action_url or "",
                **notification.data
            }
            
            return await self.firebase_service.send_push_notification(
                token=user.push_token,
                title=notification.title,
                body=notification.message,
                data=push_data,
                action_url=notification.action_url,
                analytics_label=f"single_{notification.notification_type}"
            )
            
        except Exception as e:
            logger.error(f"Push notification failed: {e}")
            return False
    
    async def _send_whatsapp_message(
        self, 
        notification: Notification, 
        template: Optional[NotificationTemplate],
        template_data: Dict[str, Any]
    ) -> bool:
        """Send WhatsApp message via Twilio"""
        user = self.db.get(User, notification.recipient_user_id)
        if not user or not user.whatsapp_number:
            print(f" No WhatsApp number for user {user.email if user else 'unknown'}")
            return False
        
        # Check Twilio configuration
        if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_WHATSAPP_NUMBER]):
            print("Twilio WhatsApp not configured, skipping WhatsApp message")
            return False
        
        # Use WhatsApp template if available, otherwise use notification message
        if template and template.whatsapp_template:
            whatsapp_message = self._render_template(template.whatsapp_template, template_data)
        else:
            # Create a formatted WhatsApp message
            whatsapp_message = f"*{notification.title}*\n\n{notification.message}"
            if notification.action_url:
                whatsapp_message += f"\n\n {notification.action_text or 'View Details'}: {notification.action_url}"
        
        # ✅ NEW: Add PDF attachment link to WhatsApp message
        if notification.data.get("pdf_attachment_url"):
            pdf_url = notification.data["pdf_attachment_url"]
            whatsapp_message += f"\n\n📎 Download PDF: {pdf_url}"
            print(f"📱 Including PDF attachment in WhatsApp: {pdf_url}")
        
        # Ensure phone number has country code
        phone_number = user.whatsapp_number
        if not phone_number.startswith('+'):
            phone_number = f"+1{phone_number}"  # Default to US if no country code
        
        # Twilio API payload
        payload = {
            "From": f"whatsapp:{settings.TWILIO_WHATSAPP_NUMBER}",
            "To": f"whatsapp:{phone_number}",
            "Body": whatsapp_message
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json",
                    auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN), # type: ignore
                    data=payload
                )
                
                if response.status_code == 201:
                    result = response.json()
                    print(f"WhatsApp sent successfully to {user.email} (SID: {result.get('sid')})")
                    return True
                else:
                    print(f"WhatsApp failed {response.status_code}: {response.text}")
                    return False
                    
        except Exception as e:
            print(f" WhatsApp error: {e}")
            return False
    
    # ✅ FIXED: Auto-assignment notification method
    async def send_auto_assignment_notification(
        self, 
        swap_request: SwapRequest, 
        background_tasks: BackgroundTasks
    ):
        """Notify assigned staff about auto-assignment"""
        
        if not swap_request.assigned_staff_id:
            print("⚠️ No assigned staff ID found for auto-assignment notification")
            return
        
        assigned_staff = self.db.get(Staff, swap_request.assigned_staff_id)
        if not assigned_staff:
            print(f"⚠️ Assigned staff {swap_request.assigned_staff_id} not found")
            return
        
        assigned_user = self.db.exec(
            select(User).where(User.email == assigned_staff.email)
        ).first()
        
        if not assigned_user:
            print(f"⚠️ No user account found for assigned staff {assigned_staff.email}")
            return
        
        requesting_staff = self.db.get(Staff, swap_request.requesting_staff_id)
        schedule = self.db.get(Schedule, swap_request.schedule_id)
        facility = self.db.get(Facility, schedule.facility_id) if schedule else None
        
        # ✅ FIXED: Use self.send_notification instead of self.notification_service.send_notification
        await self.send_notification(
            notification_type=NotificationType.SWAP_ASSIGNMENT,
            recipient_user_id=assigned_user.id,
            template_data={
                "assigned_staff_name": assigned_staff.full_name,
                "requester_name": requesting_staff.full_name if requesting_staff else "Staff member",
                "facility_name": facility.name if facility else "Facility",
                "original_day": self._get_day_name(swap_request.original_day),
                "original_shift": self._get_shift_name(swap_request.original_shift),
                "reason": swap_request.reason or "Coverage needed",
                "urgency": swap_request.urgency
            },
            channels=["IN_APP", "PUSH", "WHATSAPP"],
            priority=NotificationPriority.HIGH if swap_request.urgency == "emergency" else NotificationPriority.MEDIUM,
            action_url=f"/swaps/{swap_request.id}",
            action_text="Accept or Decline",
            background_tasks=background_tasks
        )
    
        print(f"✅ Auto-assignment notification queued for {assigned_staff.full_name}")
    
    # ✅ NEW: Helper methods for day and shift names
    def _get_day_name(self, day: int) -> str:
        """Convert day number to name"""
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        return days[day] if 0 <= day < 7 else f"Day {day}"
    
    def _get_shift_name(self, shift: int) -> str:
        """Convert shift number to name"""
        shifts = ["Morning", "Afternoon", "Evening"]
        return shifts[shift] if 0 <= shift < 3 else f"Shift {shift}"
    
    async def _send_email_notification(
        self, 
        notification: Notification, 
        template: Optional[NotificationTemplate],
        template_data: Dict[str, Any]
    ) -> bool:
        """Send email notification (placeholder - implement your email service)"""
        user = self.db.get(User, notification.recipient_user_id)
        if not user or not user.email:
            print(f" No email for user {user.email if user else 'unknown'}")
            return False
        
        print(f"📧 EMAIL: Would send to {user.email}")
        print(f"📧 Subject: {notification.title}")
        print(f"📧 Body: {notification.message}")
        
        # ✅ NEW: Handle PDF attachment in email
        if notification.data.get("pdf_attachment_url"):
            pdf_url = notification.data["pdf_attachment_url"]
            print(f"📧 PDF Attachment: {pdf_url}")
            # TODO: Implement actual email sending with PDF attachment
            # This would typically involve:
            # 1. Downloading the PDF from the URL
            # 2. Attaching it to the email
            # 3. Sending via your email service (SendGrid, SES, etc.)
        
        # For now, return True to simulate successful sending
        # Replace this with actual email service implementation
        return True
    
    def _get_template(self, notification_type: NotificationType, tenant_id: uuid.UUID) -> Optional[NotificationTemplate]:
        """Get notification template (tenant-specific or global)"""
        # Try tenant-specific first
        template = self.db.exec(
            select(NotificationTemplate).where(
                NotificationTemplate.notification_type == notification_type,
                NotificationTemplate.tenant_id == tenant_id,
                NotificationTemplate.enabled == True
            )
        ).first()
        
        # Fall back to global template
        if not template:
            template = self.db.exec(
                select(NotificationTemplate).where(
                    NotificationTemplate.notification_type == notification_type,
                    NotificationTemplate.tenant_id.is_(None), # type: ignore
                    NotificationTemplate.enabled == True
                )
            ).first()
        
        return template
    
    def _get_user_preferences(self, user_id: uuid.UUID, notification_type: NotificationType) -> Optional[NotificationPreference]:
        """Get user's notification preferences"""
        return self.db.exec(
            select(NotificationPreference).where(
                NotificationPreference.user_id == user_id,
                NotificationPreference.notification_type == notification_type
            )
        ).first()
    
    def _determine_channels(self, template: NotificationTemplate, preferences: Optional[NotificationPreference]) -> List[str]:
        """Determine which channels to use based on template and user preferences"""
        if not preferences:
            return template.default_channels
        
        channels = []
        if preferences.in_app_enabled and "IN_APP" in template.default_channels:
            channels.append("IN_APP")
        if preferences.push_enabled and "PUSH" in template.default_channels:
            channels.append("PUSH")
        if preferences.whatsapp_enabled and "WHATSAPP" in template.default_channels:
            channels.append("WHATSAPP")
        if preferences.email_enabled and "EMAIL" in template.default_channels:
            channels.append("EMAIL")
        
        return channels or ["IN_APP"]  # Always fall back to in-app
    
    def _render_template(self, template: str, data: Dict[str, Any]) -> str:
        """Simple template rendering using string.Template"""
        try:
            # Add default values for common template variables
            safe_data = {
                "staff_name": "User",
                "facility_name": "Your workplace",
                "week_start": "this week",
                "original_day": "scheduled day",
                "original_shift": "scheduled shift",
                "requester_name": "A colleague",
                "target_name": "You",
                "approver_name": "Manager",
                "reason": "Not specified",
                "urgency": "Normal",
                "action_url": "#",
                "assigned_staff_name": "Staff member",  # ✅ NEW for auto-assignments
                **data  # Override with actual data
            }
            return string.Template(template).safe_substitute(safe_data)
        except Exception as e:
            print(f" Template rendering error: {e}")
            return template  # Return original if rendering fails