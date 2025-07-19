# app/services/swap_notifications.py

from datetime import datetime
from typing import List
from fastapi import BackgroundTasks
from sqlmodel import Session, select

from .notification_service import NotificationService
from ..models import SwapRequest, Staff, User, NotificationType, NotificationPriority, Facility, Schedule

class SwapNotificationHandler:
    """Handles all swap-related notifications"""
    
    def __init__(self, db: Session, notification_service: NotificationService):
        self.db = db
        self.notification_service = notification_service
    
    async def notify_swap_request_created(
        self, 
        swap_request: SwapRequest, 
        background_tasks: BackgroundTasks
    ):
        """Notify target staff when someone wants to swap with them"""
        
        if not swap_request.target_staff_id:
            print(" No target staff for swap request notification")
            return
        
        target_staff = self.db.get(Staff, swap_request.target_staff_id)
        requesting_staff = self.db.get(Staff, swap_request.requesting_staff_id)
        
        if not target_staff or not requesting_staff:
            print(" Could not find staff members for swap notification")
            return
        
        # Find target staff's user account
        target_user = self.db.exec(
            select(User).where(User.email == target_staff.email)
        ).first()
        
        if not target_user:
            print(f" No user account found for staff {target_staff.email}")
            return
        
        await self.notification_service.send_notification(
            notification_type=NotificationType.SWAP_REQUEST,
            recipient_user_id=target_user.id,
            template_data={
                "requester_name": requesting_staff.full_name,
                "target_name": target_staff.full_name,
                "original_day": self._get_day_name(swap_request.original_day),
                "original_shift": self._get_shift_name(swap_request.original_shift),
                "week_start": "this week",
                "reason": swap_request.reason,
                "urgency": swap_request.urgency
            },
            channels=["IN_APP", "PUSH", "WHATSAPP"],
            priority=NotificationPriority.HIGH if swap_request.urgency == "emergency" else NotificationPriority.MEDIUM,
            action_url=f"/swaps/{swap_request.id}",
            action_text="Respond to Request",
            background_tasks=background_tasks
        )
        
        print(f"Swap request notification queued for {target_staff.full_name}")
    
    async def notify_swap_approved(
        self, 
        swap_request: SwapRequest, 
        background_tasks: BackgroundTasks
    ):
        """Notify requesting staff when their swap is approved"""
        
        requesting_staff = self.db.get(Staff, swap_request.requesting_staff_id)
        if not requesting_staff:
            return
        
        requesting_user = self.db.exec(
            select(User).where(User.email == requesting_staff.email)
        ).first()
        
        if not requesting_user:
            print(f" No user account found for staff {requesting_staff.email}")
            return
        
        await self.notification_service.send_notification(
            notification_type=NotificationType.SWAP_APPROVED,
            recipient_user_id=requesting_user.id,
            template_data={
                "requester_name": requesting_staff.full_name,
                "original_day": self._get_day_name(swap_request.original_day),
                "original_shift": self._get_shift_name(swap_request.original_shift),
                "approver_name": "Manager"
            },
            channels=["IN_APP", "PUSH"],
            priority=NotificationPriority.HIGH,
            action_url=f"/schedule/{swap_request.schedule_id}",
            action_text="View Updated Schedule",
            background_tasks=background_tasks
        )
        
        print(f" Swap approval notification queued for {requesting_staff.full_name}")
    
    async def notify_managers_urgent_swap(
        self, 
        swap_request: SwapRequest, 
        background_tasks: BackgroundTasks
    ):
        """Notify managers when there's an urgent swap request"""
        
        # Get the schedule to find tenant
        schedule = self.db.get(Schedule, swap_request.schedule_id)
        if not schedule:
            return
            
        facility = self.db.get(Facility, schedule.facility_id)
        if not facility:
            return
        
        # Get all managers for this tenant
        managers = self.db.exec(
            select(User).where(
                User.tenant_id == facility.tenant_id,
                User.is_manager == True,
                User.is_active == True
            )
        ).all()
        
        requesting_staff = self.db.get(Staff, swap_request.requesting_staff_id)
        
        for manager in managers:
            await self.notification_service.send_notification(
                notification_type=NotificationType.EMERGENCY_COVERAGE,
                recipient_user_id=manager.id,
                template_data={
                    "requester_name": requesting_staff.full_name if requesting_staff else "Staff member",
                    "facility_name": facility.name,
                    "original_day": self._get_day_name(swap_request.original_day),
                    "original_shift": self._get_shift_name(swap_request.original_shift),
                    "reason": swap_request.reason or "Not specified",
                    "urgency": "URGENT" if swap_request.urgency == "emergency" else "Normal"
                },
                channels=["IN_APP", "PUSH", "WHATSAPP"],
                priority=NotificationPriority.URGENT,
                action_url=f"/swaps/{swap_request.id}/manage",
                action_text="Review Request",
                background_tasks=background_tasks
            )
        
        print(f" Urgent swap notifications queued for {len(managers)} managers")
    
    def _get_day_name(self, day: int) -> str:
        """Convert day number to name"""
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        return days[day] if 0 <= day < 7 else f"Day {day}"
    
    def _get_shift_name(self, shift: int) -> str:
        """Convert shift number to name"""
        shifts = ["Morning", "Afternoon", "Evening"]
        return shifts[shift] if 0 <= shift < 3 else f"Shift {shift}"