# app/services/enhanced_notification_service.py
# Updated to include better schedule notifications

import uuid
from typing import Dict, List, Optional, Any
from sqlmodel import Session
from fastapi import BackgroundTasks

from app.models import Notification, NotificationType, NotificationPriority, User, SwapRequest
from app.services.notification_service import NotificationService
from app.services.user_staff_mapping import UserStaffMappingService

class EnhancedNotificationService(NotificationService):
    """Enhanced notification service with actionable notifications"""
    
    def get_user_display_name(self, user: User, db: Session) -> str:
        """Get user's display name, falling back to email if no staff record"""
        if user.is_manager:
            return user.email.split('@')[0].replace('.', ' ').title()
        
        mapping_service = UserStaffMappingService(db)
        staff = mapping_service.get_staff_from_user_id(user.id)
        
        if staff and staff.full_name:
            return staff.full_name
        
        return user.email.split('@')[0].replace('.', ' ').title()
    
    async def create_swap_request_notification(
        self,
        db: Session,
        swap_request: SwapRequest,
        target_staff: User,
        template_data: Dict[str, Any],
        background_tasks: Optional[BackgroundTasks] = None
    ) -> Notification:
        """Create swap request notification with quick actions"""
        
        quick_actions = [
            {
                "id": "approve_swap",
                "label": "Accept",
                "action": "approve",
                "api_endpoint": f"/v1/swaps/{swap_request.id}/approve",
                "method": "POST",
                "variant": "default"
            },
            {
                "id": "decline_swap", 
                "label": "Decline",
                "action": "decline",
                "api_endpoint": f"/v1/swaps/{swap_request.id}/decline",
                "method": "POST",
                "variant": "outline"
            },
            {
                "id": "view_details",
                "label": "Details",
                "action": "view",
                "url": f"/swaps/{swap_request.id}",
                "variant": "secondary"
            }
        ]
        
        enhanced_template_data = {
            **template_data,
            "swap_id": str(swap_request.id),
            "quick_actions": quick_actions,
            "urgency": swap_request.urgency
        }
        
        return await self.send_notification(
            notification_type=NotificationType.SWAP_REQUEST,
            recipient_user_id=target_staff.id,
            template_data=enhanced_template_data,
            channels=['IN_APP', 'PUSH', 'WHATSAPP'],
            priority=self._get_priority_for_urgency(swap_request.urgency),
            action_url=f"/swaps/{swap_request.id}/respond",
            action_text="Respond to Swap Request",
            background_tasks=background_tasks
        )
    
    async def create_schedule_published_notification(
        self,
        db: Session,
        schedule: Any,  # Schedule model
        staff_member: User,
        template_data: Dict[str, Any],
        background_tasks: Optional[BackgroundTasks] = None
    ) -> Notification:
        """Create schedule published notification with quick actions"""
        
        # ✅ Enhanced quick actions for schedule notifications
        quick_actions = [
            {
                "id": "view_schedule",
                "label": "View Schedule",
                "action": "view",
                "url": f"/schedule/{schedule.id}",
                "variant": "default"
            },
            {
                "id": "download_schedule",
                "label": "Download PDF",
                "action": "view",
                "url": f"/schedule/{schedule.id}/pdf",
                "variant": "outline"
            },
            {
                "id": "request_changes",
                "label": "Request Changes",
                "action": "view", 
                "url": f"/schedule/{schedule.id}/feedback",
                "variant": "secondary"
            }
        ]
        
        enhanced_template_data = {
            **template_data,
            "schedule_id": str(schedule.id),
            "facility_id": str(schedule.facility_id),
            "quick_actions": quick_actions,  # ✅ This will create the quick actions
            "week_start": template_data.get("week_start", ""),
            "facility_name": template_data.get("facility_name", "")
        }
     
        return await self.send_notification(
            notification_type=NotificationType.SCHEDULE_PUBLISHED,
            recipient_user_id=staff_member.id,
            template_data=enhanced_template_data,
            channels=['IN_APP', 'PUSH'],
            priority=NotificationPriority.HIGH,  # High priority for new schedules
            action_url=f"/schedule/{schedule.id}",
            action_text="View Schedule",
            background_tasks=background_tasks
        )
    
    async def create_emergency_coverage_notification(
        self,
        db: Session,
        shift_details: Dict[str, Any],
        target_staff: User,
        template_data: Dict[str, Any],
        background_tasks: Optional[BackgroundTasks] = None
    ) -> Notification:
        """Create emergency coverage notification with quick actions"""
        
        shift_id = shift_details.get("shift_id")
        
        quick_actions = [
            {
                "id": "volunteer_cover",
                "label": "I Can Help",
                "action": "cover",
                "api_endpoint": f"/v1/swaps/coverage/{shift_id}/volunteer",
                "method": "POST",
                "variant": "default"
            },
            {
                "id": "view_shift_details",
                "label": "View Details",
                "action": "view",
                "url": f"/shifts/{shift_id}",
                "variant": "outline"
            },
            {
                "id": "contact_manager",
                "label": "Contact Manager",
                "action": "view",
                "url": f"/contact/manager",
                "variant": "secondary"
            }
        ]
        
        enhanced_template_data = {
            **template_data,
            "shift_id": str(shift_id),
            "quick_actions": quick_actions,
            "urgency": "emergency"
        }
        
        return await self.send_notification(
            notification_type=NotificationType.EMERGENCY_COVERAGE,
            recipient_user_id=target_staff.id,
            template_data=enhanced_template_data,
            channels=['IN_APP', 'PUSH', 'WHATSAPP'],
            priority=NotificationPriority.URGENT,
            action_url=f"/coverage/{shift_id}",
            action_text="Help Out",
            background_tasks=background_tasks
        )
    
    async def create_swap_approved_notification(
        self,
        db: Session,
        swap_request: SwapRequest,
        approver: User,
        template_data: Dict[str, Any],
        background_tasks: Optional[BackgroundTasks] = None
    ) -> Notification:
        """Create swap approved notification with quick actions"""
        
        quick_actions = [
            {
                "id": "view_updated_schedule",
                "label": "View Updated Schedule",
                "action": "view",
                "url": "/schedule/current",
                "variant": "default"
            },
            {
                "id": "download_confirmation",
                "label": "Download Confirmation",
                "action": "view",
                "url": f"/swaps/{swap_request.id}/confirmation",
                "variant": "outline"
            }
        ]
        
        enhanced_template_data = {
            **template_data,
            "swap_id": str(swap_request.id),
            "quick_actions": quick_actions
        }
        
        return await self.send_notification(
            notification_type=NotificationType.SWAP_APPROVED,
            recipient_user_id=swap_request.requesting_staff_id,
            template_data=enhanced_template_data,
            channels=['IN_APP', 'PUSH'],
            priority=NotificationPriority.HIGH,
            action_url="/schedule/current",
            action_text="View Updated Schedule",
            background_tasks=background_tasks
        )
    
    async def create_swap_declined_notification(
        self,
        db: Session,
        swap_request: SwapRequest,
        decliner: User,
        template_data: Dict[str, Any],
        background_tasks: Optional[BackgroundTasks] = None
    ) -> Notification:
        """Create swap declined notification with quick actions"""
        
        quick_actions = [
            {
                "id": "find_alternative",
                "label": "Find Alternative",
                "action": "view",
                "url": f"/swaps/create?original_shift={swap_request.original_shift_date}",
                "variant": "default"
            },
            {
                "id": "view_swap_details",
                "label": "View Details",
                "action": "view",
                "url": f"/swaps/{swap_request.id}",
                "variant": "outline"
            },
            {
                "id": "contact_manager",
                "label": "Contact Manager",
                "action": "view",
                "url": "/contact/manager",
                "variant": "secondary"
            }
        ]
        
        enhanced_template_data = {
            **template_data,
            "swap_id": str(swap_request.id),
            "quick_actions": quick_actions
        }
        
        return await self.send_notification(
            notification_type=NotificationType.SWAP_DENIED,
            recipient_user_id=swap_request.requesting_staff_id,
            template_data=enhanced_template_data,
            channels=['IN_APP', 'PUSH'],
            priority=NotificationPriority.MEDIUM,
            action_url=f"/swaps/{swap_request.id}",
            action_text="View Details",
            background_tasks=background_tasks
        )
    
    def _get_priority_for_urgency(self, urgency: str) -> NotificationPriority:
        """Map swap urgency to notification priority"""
        urgency_map = {
            'emergency': NotificationPriority.URGENT,
            'high': NotificationPriority.HIGH,
            'normal': NotificationPriority.MEDIUM,
            'low': NotificationPriority.LOW
        }
        return urgency_map.get(urgency, NotificationPriority.MEDIUM)