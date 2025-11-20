# app/services/notification_service.py

from typing import List, Dict, Any, Optional, Tuple
from sqlmodel import Session, select
from fastapi import BackgroundTasks
import httpx
import uuid
from datetime import datetime, timezone
import string
import asyncio
import logging

# Mailing
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders

from app.services.user_staff_mapping import UserStaffMappingService
from app.services.i18n_service import i18n_service  

from ..models import (
    Facility, Notification, NotificationTemplate, NotificationPreference, Schedule, SwapRequest,
    User, Staff, NotificationType, NotificationPriority, ShiftAssignment, UserProfile, UserDevice, DeviceStatus
)
from ..core.config import get_settings
from .firebase_service import FirebaseService
from .push_token_manager import PushTokenManager

# Fix: Use proper logging setup
logger = logging.getLogger(__name__)
settings = get_settings()

class NotificationService:
    """Centralized notification service with i18n support"""
    
    def __init__(self, db: Session):
        self.db = db
        self.firebase_service = FirebaseService()
        self.push_manager = PushTokenManager(db)
    
    # Get user's preferred language
    def _get_user_locale(self, user_id: uuid.UUID) -> str:
        """Get user's preferred language from their profile"""
        user_profile = self.db.exec(
            select(UserProfile).where(UserProfile.user_id == user_id)
        ).first()
        
        if user_profile and user_profile.language:
            # Validate that the language is supported
            if user_profile.language in i18n_service.supported_locales:
                return user_profile.language
        
        # Fallback to default
        return i18n_service.default_locale
    
    # Enhanced template rendering with i18n support
    def _render_template(self, template: str, data: Dict[str, Any], user_id: Optional[uuid.UUID] = None) -> str:
        """Template rendering with i18n key resolution"""
        try:
            # Get user's locale
            locale = self._get_user_locale(user_id) if user_id else i18n_service.default_locale
            
            # If template is an i18n key, resolve it first
            if template.startswith("notifications."):
                template = i18n_service.resolve_template_key(template, locale)
                logger.debug(f"🌍 Resolved i18n key to: {template} (locale: {locale})")
            
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
                "assigned_staff_name": "Staff member",
                "user_name": "User",  #  For password reset
                "reset_url": "#",     # For password reset
                "expires_in": "24 hours",  #  For password reset
                "organization_name": "Organization",  # For invitations
                "role": "Staff",      #  For invitations
                **data  # Override with actual data
            }
            return string.Template(template).safe_substitute(safe_data)
        except Exception as e:
            logger.warning(f"⚠️ Template rendering error: {e}")
            return template  # Return original if rendering fails
    
    def _get_validated_user_from_staff(self, staff_id: uuid.UUID) -> Optional[User]:
        """Get and validate user from staff ID"""
        mapping_service = UserStaffMappingService(self.db)
        user = mapping_service.get_user_from_staff_id(staff_id)

        if not user:
            logger.warning(f"No user found for staff ID {staff_id}")
            return None

        if not user.is_active:
            logger.info(f"User {user.email} is not active")
            return None

        logger.debug(f"Validated user {user.email} for staff ID {staff_id}")
        return user
    
    # ==================== BULK NOTIFICATION WITH DEVICE SUPPORT ====================
    
    async def send_bulk_schedule_notification(
        self,
        schedule_id: uuid.UUID,
        notification_type: NotificationType,
        staff_ids: Optional[List[uuid.UUID]] = None,
        custom_message: Optional[str] = None,
        template_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Send bulk notifications with device-based delivery tracking"""
        
        schedule = self.db.get(Schedule, schedule_id)
        if not schedule:
            raise ValueError(f"Schedule {schedule_id} not found")
        
        # Get staff and their user mappings
        valid_device_tokens = []
        
        if staff_ids:
            staff_list = self.db.exec(
                select(Staff).where(Staff.id.in_(staff_ids))
            ).all()
        else:
            staff_list = self.db.exec(
                select(Staff).where(Staff.facility_id == schedule.facility_id)
            ).all()
        
        # Collect all valid tokens from all users' devices
        notification_data = []
        total_devices = 0
        
        for staff in staff_list:
            user = self.db.exec(
                select(User).where(User.id == staff.user_id)
            ).first()
            
            if user and user.is_active:
                # Get valid tokens for this user
                user_tokens = self.push_manager.get_valid_push_tokens(str(user.id))
                valid_device_tokens.extend(user_tokens)
                total_devices += len(user_tokens)
                
                # Create notification record
                if template_data:
                    notification_template_data = {**template_data}
                else:
                    facility = self.db.get(Facility, schedule.facility_id) if schedule.facility_id else None
                    notification_template_data = {
                        "staff_name": user.email.split('@')[0],
                        "facility_name": facility.name if facility else "Facility"
                    }
                
                # FIX: Add tenant_id parameter
                notification = Notification(
                    notification_type=notification_type,
                    recipient_user_id=user.id,
                    tenant_id=user.tenant_id,  # ✅ FIXED: Added missing tenant_id
                    title="Schedule Published",
                    message=custom_message or f"Your schedule for week starting {schedule.week_start} is now available",
                    priority=NotificationPriority.HIGH,
                    channels=["IN_APP", "PUSH"],
                    action_url=f"/schedule/{schedule_id}",
                    data=notification_template_data
                )
                self.db.add(notification)
                notification_data.append(notification)
        
        self.db.commit()
        
        # Send multicast push notification if we have valid tokens
        success_count = 0
        failure_count = 0
        
        if valid_device_tokens:
            try:
                success_count, failure_count = await self.firebase_service.send_push_multicast(
                    tokens=valid_device_tokens,
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
                    delivery_status: Dict[str, Dict[str, Any]] = {
                        "PUSH": {
                            "status": "delivered" if success_count > 0 else "failed",
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "method": "multicast",
                            "devices_attempted": total_devices,
                            "devices_success": success_count,
                            "devices_failed": failure_count
                        },
                        "IN_APP": {
                            "status": "delivered",
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }
                    }
                    
                    notification.delivery_status = delivery_status
                    notification.is_delivered = True
                    notification.delivered_at = datetime.now(timezone.utc)
                
                self.db.commit()
                
            except Exception as e:
                logger.error(f"Bulk push notification failed: {e}")
                failure_count = len(valid_device_tokens)
        
        logger.info(
            "bulk_schedule_notification_sent",
            extra={
                "schedule_id": str(schedule_id),
                "total_recipients": len(notification_data),
                "total_devices": total_devices,
                "push_success": success_count,
                "push_failure": failure_count,
                "analytics_label": f"schedule_published_{schedule.facility_id}"
            }
        )
        
        return {
            "total_recipients": len(notification_data),
            "total_devices": total_devices,
            "push_success": success_count,
            "push_failure": failure_count,
            "notifications_created": len(notification_data)
        }
    
    #  Main notification method with i18n support
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
        pdf_attachment_url: Optional[str] = None,
        override_recipient_email: Optional[str] = None
    ) -> Notification:
        """Send a notification through multiple channels with i18n support"""

        logger.info(f"📬 Creating notification: {notification_type} for user {recipient_user_id}")
    
        # Validate recipient exists and is active
        user = self.db.get(User, recipient_user_id)
        if not user:
            raise ValueError(f"User {recipient_user_id} not found")
        
        if not user.is_active:
            raise ValueError(f"User {user.email} is not active")

        logger.info(f"✅ Validated recipient: {user.email} (User ID: {user.id})")

        # Get user's locale
        user_locale = self._get_user_locale(user.id)
        logger.debug(f"🌍 User locale: {user_locale}")

        # Get template
        template = self._get_template(notification_type, user.tenant_id)
        if not template:
            logger.warning(f"⚠️ No template found for {notification_type}, creating basic notification")
            return await self._create_basic_notification(
                notification_type, user, template_data, channels, priority, action_url, action_text, pdf_attachment_url
            )
        
        # Get user preferences
        preferences = self._get_user_preferences(user.id, notification_type)
        
        # Determine channels
        if channels is None:
            channels = self._determine_channels(template, preferences)
        
        #  Render content with i18n and user locale
        title = self._render_template(template.title_template, template_data, user.id)
        message = self._render_template(template.message_template, template_data, user.id)
        
        # Add PDF attachment to data if provided
        notification_data = template_data.copy()
        if pdf_attachment_url:
            notification_data["pdf_attachment_url"] = pdf_attachment_url
            logger.info(f"📎 PDF attachment added: {pdf_attachment_url}")
        
        # Create notification record with tenant_id
        notification = Notification(
            recipient_user_id=user.id,
            tenant_id=user.tenant_id,  # Include tenant_id
            notification_type=notification_type,
            title=title,
            message=message,
            priority=priority or template.priority,
            channels=channels,
            data=notification_data,
            action_url=action_url,
            action_text=action_text
        )
        
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)

        logger.info(f"✅ Notification {notification.id} created for {user.email}")
        
        # Send through channels
        if background_tasks:
            background_tasks.add_task(
                self._deliver_notification,
                str(notification.id),
                template_data
            )
        else:
            # Deliver immediately
            await self._deliver_notification(str(notification.id), template_data)
        
        return notification

    #  Email to address with i18n support
    async def send_email_to_address(
        self,
        notification_type: NotificationType,
        to_email: str,
        template_data: Dict[str, Any],
        tenant_id: uuid.UUID,
        priority: Optional[NotificationPriority] = None,
        action_url: Optional[str] = None,
        action_text: Optional[str] = None,
        pdf_attachment_url: Optional[str] = None,
        background_tasks: Optional[BackgroundTasks] = None,
        target_locale: str = "en"
    ) -> Dict[str, Any]:
        """Render and send an email to a raw address (no user/notification row)."""

        # Get template (tenant-specific or global)
        template = self._get_template(notification_type, tenant_id)

        #  Use i18n-aware rendering
        if template:
            title = self._render_template(template.title_template, template_data)
            message = self._render_template(template.message_template, template_data)
        else:
            # Fallback to basic notification type translation
            title_key = f"notifications.templates.{notification_type.value.lower()}.title"
            message_key = f"notifications.templates.{notification_type.value.lower()}.message"

            title = i18n_service.resolve_template_key(title_key, target_locale)
            message = i18n_service.resolve_template_key(message_key, target_locale)

            if title == title_key:  # Key not found, use fallback
                title = notification_type.value.replace('_', ' ').title()
            else:
                # Render the i18n title
                title = self._render_template(title, template_data)
                
            if message == message_key:  # Key not found, use fallback
                message = template_data.get('message', 'You have a new message')
            else:
                # Render the i18n message
                message = self._render_template(message, template_data)

        logger.info(f"📧 EMAIL: Sending to {to_email} (locale: {target_locale})")
        logger.info(f"📧 Subject: {title}")
        logger.info(f"📧 Body: {message}")
        if pdf_attachment_url:
            logger.info(f"📎 PDF Attachment: {pdf_attachment_url}")

        # Actually send the email via SMTP
        success = await self._send_email_via_smtp(
            to_email=to_email,
            subject=title,
            message=message,
            action_url=action_url,
            action_text=action_text,
            pdf_attachment_url=pdf_attachment_url
        )

        return {
            "status": "sent" if success else "failed",
            "to": to_email,
            "notification_type": notification_type.value,
            "locale": target_locale,
        }

    async def _send_email_via_smtp(
        self,
        to_email: str,
        subject: str,
        message: str,
        action_url: Optional[str] = None,
        action_text: Optional[str] = None,
        pdf_attachment_url: Optional[str] = None
    ) -> bool:
        """Send email via SMTP (used for direct email sending without notification records)"""

        # Get SMTP settings from environment variables
        settings = get_settings()

        # Check if SMTP is configured in environment
        if not all([settings.SMTP_HOST, settings.SMTP_USERNAME, settings.SMTP_PASSWORD]):
            logger.warning(f"⚠️ SMTP not configured in environment variables")
            logger.info("💡 Set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD in your .env file")
            return False

        try:
            # Create message
            msg = MIMEMultipart()
            from_name = settings.SMTP_FROM_NAME or "Schedula"
            from_email = settings.SMTP_FROM_EMAIL

            if not from_email:
                logger.error(f"❌ SMTP_FROM_EMAIL not configured")
                return False

            msg['From'] = f"{from_name} <{from_email}>"
            msg['To'] = to_email
            msg['Subject'] = subject

            logger.info(f"📧 Preparing email message for {to_email}")

            # Pre-process the message content
            html_message = message.replace('\n', '<br>')
            action_button_html = ""

            # Pre-build action button HTML if needed
            if action_url and action_text:
                action_button_html = f"""
                    <div style="text-align: center; margin: 20px 0;">
                        <a href="{action_url}" class="button">{action_text}</a>
                    </div>
                """

            # Build HTML body with pre-processed content
            html_body = f"""<!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{subject}</title>
        <style>
            body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; }}
            .header {{ color: #333; text-align: center; margin-bottom: 30px; }}
            .content {{ background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }}
            .footer {{ border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 12px; }}
            .button {{
                display: inline-block;
                background-color: #007bff;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
            }}
        </style>
    </head>
    <body>
        <h2 class="header">{subject}</h2>
        <div class="content">
            {html_message}
            {action_button_html}
        </div>
        <div class="footer">
            <p>This email was sent by Schedula.</p>
        </div>
    </body>
    </html>"""

            # Attach HTML and plain text
            msg.attach(MIMEText(html_body, 'html'))
            msg.attach(MIMEText(message, 'plain'))

            # Handle PDF attachment if provided
            if pdf_attachment_url:
                await self._attach_pdf_to_email(msg, pdf_attachment_url)

            # Connect to SMTP server and send
            smtp_host = settings.SMTP_HOST
            smtp_port = settings.SMTP_PORT or 587
            smtp_password = settings.SMTP_PASSWORD

            logger.info(f"📧 Connecting to SMTP: {smtp_host}:{smtp_port}")

            # Use STARTTLS for port 587 (Resend's recommended method)
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
            server.set_debuglevel(0)  # Set to 1 for debugging
            server.ehlo()
            server.starttls(context=ssl.create_default_context())
            server.ehlo()

            # Login
            logger.info(f"📧 Authenticating with SMTP server...")
            server.login(settings.SMTP_USERNAME, smtp_password)

            # Send message
            logger.info(f"📧 Sending email to {to_email}...")
            server.send_message(msg)
            server.quit()

            logger.info(f"✅ EMAIL SENT: {subject} to {to_email}")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to send email to {to_email}: {e}")
            return False

    #  Basic notification with i18n support
    async def _create_basic_notification(
        self,
        notification_type: NotificationType,
        user: User,
        template_data: Dict[str, Any],
        channels: Optional[List[str]],
        priority: Optional[NotificationPriority],
        action_url: Optional[str],
        action_text: Optional[str],
        pdf_attachment_url: Optional[str] = None
    ) -> Notification:
        """Create a basic notification when no template exists, with i18n support"""
        
        #  Get user locale and try to get translations
        user_locale = self._get_user_locale(user.id)
        
        # Try to get translations from i18n service
        title_key = f"notifications.templates.{notification_type.value.lower()}.title"
        message_key = f"notifications.templates.{notification_type.value.lower()}.message"
        
        title = i18n_service.resolve_template_key(title_key, user_locale)
        message = i18n_service.resolve_template_key(message_key, user_locale)
        
        # If translations not found, use fallback
        if title == title_key:
            title = f"{notification_type.value.replace('_', ' ').title()}"
        
        if message == message_key:
            # Basic fallback messages
            basic_messages = {
                NotificationType.SCHEDULE_PUBLISHED: "Your new schedule is available",
                NotificationType.SWAP_REQUEST: "You have a new shift swap request",
                NotificationType.SWAP_APPROVED: "Your swap request has been approved",
                NotificationType.SWAP_DENIED: "Your swap request has been declined",
                NotificationType.EMERGENCY_COVERAGE: "Urgent coverage needed",
                NotificationType.SHIFT_REMINDER: "Shift reminder",
                NotificationType.SCHEDULE_CHANGE: "Schedule has been updated",
                NotificationType.SWAP_ASSIGNMENT: "You have been assigned to cover a shift",
                NotificationType.PASSWORD_RESET: "A password reset instruction has been sent to your email"
            }
            message = basic_messages.get(notification_type, "You have a new notification")
        
        # Render templates with user data
        title = self._render_template(title, template_data, user.id)
        message = self._render_template(message, template_data, user.id)
        
        # Add PDF attachment to data if provided
        notification_data = template_data.copy()
        if pdf_attachment_url:
            notification_data["pdf_attachment_url"] = pdf_attachment_url
            print(f"📎 PDF attachment added to basic notification: {pdf_attachment_url}")
        
        # Include tenant_id in basic notification
        notification = Notification(
            recipient_user_id=user.id,
            tenant_id=user.tenant_id,  # Include tenant_id
            notification_type=notification_type,
            title=title,
            message=message,
            priority=priority or NotificationPriority.MEDIUM,
            channels=channels or ["IN_APP"],
            data=notification_data,
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
        
        # Create a new session for the background task
        from sqlmodel import Session
        from app.deps import engine
        
        with Session(engine) as session:
            # Fetch fresh notification object in this session
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
            
            delivery_status: Dict[str, Dict[str, Any]] = {}
            
            print(f"📡 Delivering notification {notification.id} via channels: {notification.channels}")
            
            for channel in notification.channels:
                try:
                    if channel == "IN_APP":
                        # In-app notifications are already stored in DB
                        delivery_status[channel] = {
                            "status": "delivered", 
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }
                        print(f"✅ In-app notification delivered")
                    
                    elif channel == "PUSH":
                        success = await self._send_push_notification(notification, session)
                        delivery_status[channel] = {
                            "status": "delivered" if success else "failed",
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }
                        print(f"{'✅' if success else '❌'} Push notification {'delivered' if success else 'failed'}")
                    
                    elif channel == "EMAIL":
                        success = await self._send_email_notification(notification, template, template_data)
                        delivery_status[channel] = {
                            "status": "delivered" if success else "failed",
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }
                        print(f"{'✅' if success else '❌'} Email {'sent' if success else 'failed'}")

                    elif channel == "WHATSAPP":
                        success = await self._send_whatsapp_message(notification, template, template_data)
                        delivery_status[channel] = {
                            "status": "delivered" if success else "failed",
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }
                        print(f"{'✅' if success else '❌'} WhatsApp {'sent' if success else 'failed'}")
                    
                except Exception as e:
                    delivery_status[channel] = {
                        "status": "error",
                        "error": str(e),
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                    print(f"❌ Error delivering via {channel}: {e}")
            
            # Update delivery status in the same session
            notification.delivery_status = delivery_status
            notification.is_delivered = any(
                status.get("status") == "delivered" 
                for status in delivery_status.values()
            )
            if notification.is_delivered:
                notification.delivered_at = datetime.now(timezone.utc)
            
            session.add(notification)
            session.commit()
            
            print(f"✅ Delivery status updated for notification {notification.id}")
    
    async def _send_push_notification(self, notification: Notification, session: Session) -> bool:
        """Send push notification with session safety"""
        try:
            user = session.get(User, notification.recipient_user_id)
            if not user:
                logger.warning(f"User {notification.recipient_user_id} not found")
                return False
            
            # Get valid push tokens using device manager
            valid_tokens = self.push_manager.get_valid_push_tokens(str(user.id))
            
            if not valid_tokens:
                logger.warning(
                    "push_notification_no_valid_tokens",
                    extra={
                        "user_id": str(notification.recipient_user_id),
                        "user_email": user.email
                    }
                )
                return False
            
            if not self.firebase_service.is_available():
                logger.error("firebase_service_unavailable")
                return False
            
            # Prepare push data
            push_data = {
                "notification_id": str(notification.id),
                "type": str(notification.notification_type),
                "action_url": notification.action_url or "",
                **notification.data
            }
            
            # Send to multiple devices if user has multiple valid tokens
            if len(valid_tokens) == 1:
                # Single device
                success = await self._send_single_push_notification(
                    str(user.id), valid_tokens[0], notification, push_data
                )
                return success
            else:
                # Multiple devices - use multicast
                success_count, failure_count = await self._send_multicast_push_notification(
                    str(user.id), valid_tokens, notification, push_data
                )
                return success_count > 0
            
        except Exception as e:
            logger.error(f"Push notification failed: {e}")
            return False
    
    async def _send_single_push_notification(
        self, 
        user_id: str, 
        token: str, 
        notification: Notification, 
        push_data: Dict[str, Any]
    ) -> bool:
        """Send push notification to single device with failure tracking"""
        try:
            # Find device by token
            device = self.db.exec(
                select(UserDevice).where(
                    UserDevice.user_id == user_id,
                    UserDevice.push_token == token,
                    UserDevice.is_active == True
                )
            ).first()
            
            if not device:
                logger.warning(f"Device not found for token (user: {user_id})")
                return False
            
            # Send notification
            success = await self.firebase_service.send_push_notification(
                token=token,
                title=notification.title,
                body=notification.message,
                data=push_data,
                action_url=notification.action_url,
                analytics_label=f"single_{notification.notification_type}"
            )
            
            # Record result
            if success:
                self.push_manager.record_push_success(str(device.id))
                logger.info(f"Push notification sent successfully to device {device.id}")
            else:
                needs_reauth = self.push_manager.record_push_failure(
                    str(device.id), 
                    "Firebase send failed"
                )
                if needs_reauth:
                    logger.warning(f"Device {device.id} marked for re-authorization")
            
            return success
            
        except Exception as e:
            logger.error(f"Single push notification failed: {e}")
            return False
    
    async def _send_multicast_push_notification(
        self, 
        user_id: str, 
        tokens: List[str], 
        notification: Notification, 
        push_data: Dict[str, Any]
    ) -> Tuple[int, int]:
        """Send push notification to multiple devices with per-device failure tracking"""
        try:
            # Get devices for all tokens
            devices = self.db.exec(
                select(UserDevice).where(
                    UserDevice.user_id == user_id,
                    UserDevice.push_token.in_(tokens),
                    UserDevice.is_active == True
                )
            ).all()
            
            # Send multicast notification
            success_count, failure_count = await self.firebase_service.send_push_multicast(
                tokens=tokens,
                title=notification.title,
                body=notification.message,
                data=push_data,
                action_url=notification.action_url,
                analytics_label=f"multicast_{notification.notification_type}"
            )
            
            # Unfortunately, Firebase doesn't give us per-token results in multicast
            # So we'll mark all devices as successful if any succeeded, or failed if all failed
            if success_count > 0:
                # At least some succeeded - record success for all (optimistic)
                for device in devices:
                    self.push_manager.record_push_success(str(device.id))
            else:
                # All failed - record failures
                for device in devices:
                    needs_reauth = self.push_manager.record_push_failure(
                        str(device.id), 
                        "Multicast send failed"
                    )
                    if needs_reauth:
                        logger.warning(f"Device {device.id} marked for re-authorization")
            
            logger.info(
                f"Multicast push notification: {success_count} success, {failure_count} failures"
            )
            
            return success_count, failure_count
            
        except Exception as e:
            logger.error(f"Multicast push notification failed: {e}")
            return 0, len(tokens)
        
    
    
    # ✅ UPDATED: WhatsApp with i18n support
    async def _send_whatsapp_message(
        self,
        notification: Notification,
        template: Optional[NotificationTemplate],
        template_data: Dict[str, Any]
    ) -> bool:
        """Send WhatsApp message via Twilio with i18n support"""
        user = self.db.get(User, notification.recipient_user_id)
        if not user:
            print(f"⚠️ User not found for notification {notification.id}")
            return False

        # Try to get WhatsApp number from user, fallback to staff phone
        whatsapp_number = user.whatsapp_number

        if not whatsapp_number:
            # Try to find staff member and use their phone
            staff = self.db.exec(
                select(Staff).where(Staff.email == user.email)
            ).first()

            if staff and staff.phone:
                whatsapp_number = staff.phone
                logger.info(f"📱 Using staff phone number as WhatsApp fallback: {staff.phone}")
            else:
                print(f"⚠️ No WhatsApp number or phone for user {user.email}")
                return False
        
        # Check Twilio configuration
        if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_WHATSAPP_NUMBER]):
            logger.warning(f"⚠️ Twilio WhatsApp not configured. SID: {bool(settings.TWILIO_ACCOUNT_SID)}, Token: {bool(settings.TWILIO_AUTH_TOKEN)}, Number: {bool(settings.TWILIO_WHATSAPP_NUMBER)}")
            print("⚠️ Twilio WhatsApp not configured, skipping WhatsApp message")
            return False

        # ✅ UPDATED: Use i18n-aware template rendering
        user_locale = self._get_user_locale(user.id)

        # Debug: Log notification details
        logger.info(f"📱 Notification details:")
        logger.info(f"   notification.action_url = {notification.action_url}")
        logger.info(f"   notification.action_text = {notification.action_text}")
        logger.info(f"   notification.title = {notification.title}")

        # ✅ Add action_url to template_data so it's available in i18n templates
        template_data_with_url = {**template_data, "action_url": notification.action_url or "#"}

        if template and template.whatsapp_template:
            whatsapp_message = self._render_template(template.whatsapp_template, template_data_with_url, user.id)
        else:
            # Try to get WhatsApp template from i18n
            whatsapp_key = f"notifications.templates.{notification.notification_type.value.lower()}.whatsapp"
            whatsapp_template = i18n_service.resolve_template_key(whatsapp_key, user_locale)

            if whatsapp_template != whatsapp_key:  # Found translation
                whatsapp_message = self._render_template(whatsapp_template, template_data_with_url, user.id)
                logger.info(f"📱 Using i18n template with action_url={notification.action_url}")
            else:
                # Create a formatted WhatsApp message
                whatsapp_message = f"*{notification.title}*\n\n{notification.message}"
                # Use action_url from notification, not template defaults
                logger.info(f"📱 Building WhatsApp message. action_url={notification.action_url}, is #={notification.action_url == '#'}")
                if notification.action_url and notification.action_url != "#":
                    whatsapp_message += f"\n\n{notification.action_text or 'View Details'}: {notification.action_url}"
                    logger.info(f"📱 Added action URL to message")
        
        # ✅ Add PDF attachment link to WhatsApp message
        if notification.data.get("pdf_attachment_url"):
            pdf_url = notification.data["pdf_attachment_url"]
            whatsapp_message += f"\n\n📎 Download PDF: {pdf_url}"
            print(f"📱 Including PDF attachment in WhatsApp: {pdf_url}")
        
        # Ensure phone number has country code
        phone_number = whatsapp_number
        logger.info(f"📱 Original WhatsApp number: {whatsapp_number}")

        if not phone_number.startswith('+'):
            default_cc = getattr(settings, 'DEFAULT_COUNTRY_CODE', '+39')
            phone_number = f"{default_cc}{phone_number}"
            logger.info(f"📱 Added country code {default_cc}, final number: {phone_number}")
        else:
            logger.info(f"📱 Phone number already has country code: {phone_number}")

        # Twilio API payload
        payload = {
            "From": f"whatsapp:{settings.TWILIO_WHATSAPP_NUMBER}",
            "To": f"whatsapp:{phone_number}",
            "Body": whatsapp_message
        }

        # Debug logging
        logger.info(f"📱 Sending WhatsApp via Twilio:")
        logger.info(f"   User: {user.email}")
        logger.info(f"   From: whatsapp:{settings.TWILIO_WHATSAPP_NUMBER}")
        logger.info(f"   To: whatsapp:{phone_number}")
        logger.info(f"   Account SID: {settings.TWILIO_ACCOUNT_SID[:10]}... (length: {len(settings.TWILIO_ACCOUNT_SID) if settings.TWILIO_ACCOUNT_SID else 0})")
        logger.info(f"   Auth Token: {'*' * 10}... (length: {len(settings.TWILIO_AUTH_TOKEN) if settings.TWILIO_AUTH_TOKEN else 0})")
        logger.info(f"   Message preview: {whatsapp_message[:100]}...")

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json",
                    auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN), # type: ignore
                    data=payload
                )
                
                if response.status_code // 100 == 2:
                    result = response.json()
                    logger.info(
                        "whatsapp_sent",
                        extra={
                            "to": user.email,
                            "sid": result.get('sid'),
                            "status_code": response.status_code,
                            "locale": user_locale,
                        }
                    )
                    return True
                else:
                    logger.error(
                        "whatsapp_failed",
                        extra={
                            "to": user.email if user else 'unknown',
                            "status_code": response.status_code,
                            "response": response.text[:500],
                        }
                    )
                    return False
                    
        except Exception as e:
            logger.error("whatsapp_exception", extra={"error": str(e)})
            return False
    
    # ✅ UPDATED: Auto-assignment notification with i18n
    async def send_auto_assignment_notification(
        self, 
        swap_request: SwapRequest, 
        background_tasks: BackgroundTasks
    ):
        """Notify assigned staff about auto-assignment with i18n support"""
        
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
        
        # ✅ Use i18n-aware notification sending
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
    
    # ✅ Helper methods for day and shift names (unchanged)
    def _get_day_name(self, day: int) -> str:
        """Convert day number to name"""
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        return days[day] if 0 <= day < 7 else f"Day {day}"
    
    def _get_shift_name(self, shift: int) -> str:
        """Convert shift number to name"""
        shifts = ["Morning", "Afternoon", "Evening"]
        return shifts[shift] if 0 <= shift < 3 else f"Shift {shift}"
    
    # Email notification with i18n support
    async def _send_email_notification(
        self, 
        notification: Notification, 
        template: Optional[NotificationTemplate],
        template_data: Dict[str, Any]
    ) -> bool:
        """Send email notification with i18n support"""
        user = self.db.get(User, notification.recipient_user_id)
        if not user or not user.email:
            logger.warning(f"⚠️ No email for user {user.email if user else 'unknown'}")
            return False

        logger.info(f"📧 EMAIL: Preparing to send to {user.email}")
        logger.info(f"📧 Subject: {notification.title}")
        logger.debug(f"📧 Body: {notification.message}")
        
        # Get SMTP settings from environment variables
        settings = get_settings()

        # Check if SMTP is configured in environment
        if not all([settings.SMTP_HOST, settings.SMTP_USERNAME, settings.SMTP_PASSWORD]):
            logger.warning(f"⚠️ SMTP not configured in environment variables")
            logger.info("💡 Set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD in your .env file")
            return False
        
        try:
            # Create message
            msg = MIMEMultipart()
            from_name = settings.SMTP_FROM_NAME or "Schedula"
            from_email = settings.SMTP_FROM_EMAIL

            if not from_email:
                logger.error(f"❌ SMTP_FROM_EMAIL not configured")
                return False

            msg['From'] = f"{from_name} <{from_email}>"
            msg['To'] = user.email
            msg['Subject'] = notification.title
            
            # ✅ FIX: Pre-process the message content outside f-string
            html_message = notification.message.replace('\n', '<br>')
            action_button_html = ""
            
            # ✅ FIX: Pre-build action button HTML if needed
            if notification.action_url and notification.action_text:
                action_button_html = f"""
                    <div style="text-align: center; margin: 20px 0;">
                        <a href="{notification.action_url}" class="button">{notification.action_text}</a>
                    </div>
                """
            
            # ✅ FIX: Build HTML body with pre-processed content
            html_body = f"""<!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{notification.title}</title>
        <style>
            body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; }}
            .header {{ color: #333; text-align: center; margin-bottom: 30px; }}
            .content {{ background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }}
            .footer {{ border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 12px; }}
            .button {{ 
                display: inline-block; 
                background-color: #007bff; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 20px 0; 
            }}
        </style>
    </head>
    <body>
        <h2 class="header">{notification.title}</h2>
        <div class="content">
            {html_message}
            {action_button_html}
        </div>
        <div class="footer">
            <p>This email was sent by Schedula.</p>
        </div>
    </body>
    </html>"""
            
            # Attach HTML and plain text
            msg.attach(MIMEText(html_body, 'html'))
            msg.attach(MIMEText(notification.message, 'plain'))
            
            # Handle PDF attachment if provided
            if notification.data.get("pdf_attachment_url"):
                await self._attach_pdf_to_email(msg, notification.data["pdf_attachment_url"])
            
            # Connect to SMTP server and send
            smtp_host = settings.SMTP_HOST
            smtp_port = settings.SMTP_PORT or 587
            smtp_password = settings.SMTP_PASSWORD

            logger.info(f"📧 Connecting to SMTP: {smtp_host}:{smtp_port}")

            # Use STARTTLS for port 587 (Resend's recommended method)
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
            server.set_debuglevel(0)  # Set to 1 for debugging
            server.ehlo()
            server.starttls(context=ssl.create_default_context())
            server.ehlo()

            # Login
            logger.info(f"📧 Authenticating with SMTP server...")
            server.login(settings.SMTP_USERNAME, smtp_password)

            # Send message
            logger.info(f"📧 Sending email to {user.email}...")
            server.send_message(msg)
            server.quit()

            logger.info(f"✅ EMAIL SENT: {notification.title} to {user.email}")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to send email to {user.email}: {e}")
            return False
    
    #  Helper method to attach PDF to email
    async def _attach_pdf_to_email(self, msg: MIMEMultipart, pdf_url: str):
        """Download a PDF from a URL and attach it to the email."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(pdf_url)
                response.raise_for_status()
                pdf_data = response.content

            # Create a MIMEBase object for the PDF
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(pdf_data)
            encoders.encode_base64(part)
            part.add_header(
                'Content-Disposition',
                f'attachment; filename="{pdf_url.split("/")[-1]}"'
            )
            msg.attach(part)
            print(f"✅ PDF attached from {pdf_url}")
        except Exception as e:
            print(f"❌ Failed to attach PDF from {pdf_url}: {e}")

    # Helper methods ======================================
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
    
    # ==================== HELPER METHODS ====================
    
    def get_user_push_notification_summary(self, user_id: uuid.UUID) -> Dict[str, Any]:
        """Get comprehensive push notification summary for user"""
        stats = self.push_manager.get_push_stats(str(user_id))
        devices_needing_reauth = self.push_manager.get_devices_needing_reauth(str(user_id))
        
        return {
            "stats": stats,
            "devices_needing_reauth": devices_needing_reauth,
            "needs_attention": len(devices_needing_reauth) > 0,
            "has_valid_tokens": stats.devices_with_valid_tokens > 0
        }
    
    def should_show_reauth_modal(self, user_id: uuid.UUID) -> bool:
        """Determine if user should see re-authorization modal"""
        devices_needing_reauth = self.push_manager.get_devices_needing_reauth(str(user_id))
        return len(devices_needing_reauth) > 0