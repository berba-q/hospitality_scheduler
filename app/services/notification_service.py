# app/services/notification_service.py

from typing import List, Dict, Any, Optional
from sqlmodel import Session, select
from fastapi import BackgroundTasks
import httpx
import uuid
from datetime import datetime
import string
import asyncio

from ..models import (
    Notification, NotificationTemplate, NotificationPreference,
    User, Staff, NotificationType, NotificationPriority
)
from ..core.config import get_settings
from .firebase_service import FirebaseService

settings = get_settings()

class NotificationService:
    """Centralized notification service"""
    
    def __init__(self, db: Session):
        self.db = db
        self.firebase_service = FirebaseService()
    
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
        
        print(f"Creating notification: {notification_type} for user {recipient_user_id}")
        
        # Get recipient
        user = self.db.get(User, recipient_user_id)
        if not user:
            raise ValueError(f"User {recipient_user_id} not found")
        
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
                self._deliver_notification, notification, template, notification_data
            )
        else:
            # Run delivery in background without blocking
            asyncio.create_task(self._deliver_notification(notification, template, notification_data))
        
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
            NotificationType.SCHEDULE_CHANGE: "Schedule has been updated"
        }
        
        title = f"{notification_type.value.replace('_', ' ').title()}"
        message = basic_messages.get(notification_type, "You have a new notification")
        
        # ✅ NEW: Add PDF attachment to data if provided
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
        notification: Notification, 
        template: Optional[NotificationTemplate],
        template_data: Dict[str, Any]
    ):
        """Deliver notification through all specified channels"""
        delivery_status = {}
        
        print(f" Delivering notification {notification.id} via channels: {notification.channels}")
        
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
                    success = await self._send_push_notification(notification)
                    delivery_status[channel] = {
                        "status": "delivered" if success else "failed",
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    print(f"{'Done' if success else 'Err'} Push notification {'delivered' if success else 'failed'}")
                
                elif channel == "WHATSAPP":
                    success = await self._send_whatsapp_message(notification, template, template_data)
                    delivery_status[channel] = {
                        "status": "delivered" if success else "failed",
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    print(f"WhatsApp message {'delivered' if success else 'failed'}")
                
                elif channel == "EMAIL":
                    success = await self._send_email_notification(notification, template, template_data)
                    delivery_status[channel] = {
                        "status": "delivered" if success else "failed",
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    print(f"Email notification {'delivered' if success else 'failed'}")
                
            except Exception as e:
                delivery_status[channel] = {
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                }
                print(f" Error delivering via {channel}: {e}")
        
        # Update delivery status
        notification.delivery_status = delivery_status
        notification.is_delivered = any(
            status.get("status") == "delivered" 
            for status in delivery_status.values()
        )
        if notification.is_delivered:
            notification.delivered_at = datetime.utcnow()
        
        self.db.commit()
        print(f"Delivery status updated for notification {notification.id}")
    
    async def _send_push_notification(self, notification: Notification) -> bool:
        """Send push notification via Firebase"""
        user = self.db.get(User, notification.recipient_user_id)
        if not user or not user.push_token:
            print(f" No push token for user {user.email if user else 'unknown'}")
            return False
        
        if not self.firebase_service.is_available():
            print(" Firebase service not available, skipping push notification")
            return False
        
        # ✅ NEW: Include PDF attachment in push notification data
        push_data = {
            "notification_id": str(notification.id),
            "type": str(notification.notification_type),
            "action_url": notification.action_url or "",
            **notification.data
        }
        
        # Add PDF attachment info if available
        if notification.data.get("pdf_attachment_url"):
            push_data["has_pdf_attachment"] = True
            push_data["pdf_url"] = notification.data["pdf_attachment_url"]
            print(f"📱 Including PDF attachment in push: {notification.data['pdf_attachment_url']}")
        
        return await self.firebase_service.send_push_notification(
            token=user.push_token,
            title=notification.title,
            body=notification.message,
            data=push_data,
            action_url=notification.action_url # type: ignore
        )
    
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
                **data  # Override with actual data
            }
            return string.Template(template).safe_substitute(safe_data)
        except Exception as e:
            print(f" Template rendering error: {e}")
            return template  # Return original if rendering fails