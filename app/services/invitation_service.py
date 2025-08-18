import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any, cast
import uuid
from sqlmodel import Session, select
from sqlalchemy.sql.elements import ColumnElement
from fastapi import BackgroundTasks

from ..models import NotificationPriority, StaffInvitation, Staff, User, Facility, Tenant
from ..schemas import InvitationCreate, InvitationRead
from .notification_service import NotificationService, NotificationType
from ..core.config import get_settings

class InvitationService:
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)
    
    async def create_invitation(
        self,
        invitation_data: InvitationCreate,
        invited_by: uuid.UUID,
        background_tasks: Optional[BackgroundTasks] = None,
    ) -> StaffInvitation:
        """Create and send a staff invitation"""
        
        # Get staff member details
        staff = self.db.get(Staff, invitation_data.staff_id)
        if not staff:
            raise ValueError("Staff member not found")
        
        if not staff.email:
            raise ValueError("Staff member must have an email address")
        
        # Check if user already exists
        existing_user = self.db.exec(
            select(User).where(User.email == staff.email)
        ).first()
        
        if existing_user:
            raise ValueError("User already exists for this email address")
        
        # Check for existing valid invitation
        cond: ColumnElement[bool] = (
            (StaffInvitation.staff_id == staff.id)
            & (StaffInvitation.accepted_at.is_(None))
            & (StaffInvitation.cancelled_at.is_(None))
            & (StaffInvitation.expires_at > datetime.now(timezone.utc))
        )  # type: ignore[assignment]
        existing_invitation = self.db.exec(
            select(StaffInvitation).where(cond)  # type: ignore[arg-type]
        ).first()
        
        if existing_invitation:
            raise ValueError("Valid invitation already exists for this staff member")
        
        # Create invitation
        invitation = StaffInvitation(
            staff_id=staff.id,
            email=staff.email,
            token=StaffInvitation.generate_token(),
            invited_by=invited_by,
            tenant_id=staff.facility.tenant_id,
            facility_id=staff.facility_id,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=invitation_data.expires_in_hours),
            custom_message=invitation_data.custom_message
        )
        
        self.db.add(invitation)
        self.db.commit()
        self.db.refresh(invitation)
        
        # Send invitation email
        await self._send_invitation_email(invitation, background_tasks)
        
        # Update sent timestamp
        invitation.sent_at = datetime.now(timezone.utc)
        self.db.commit()
        
        return invitation
    
    async def create_bulk_invitations(
        self,
        staff_ids: List[uuid.UUID],
        invited_by: uuid.UUID,
        custom_message: Optional[str] = None,
        expires_in_hours: int = 168,
        background_tasks: Optional[BackgroundTasks] = None
    ) -> Dict[str, Any]:
        """Create invitations for multiple staff members"""
        
        results = {
            "successful": [],
            "failed": [],
            "already_exists": [],
            "no_email": []
        }
        
        for staff_id in staff_ids:
            try:
                invitation_data = InvitationCreate(
                    staff_id=staff_id,
                    custom_message=custom_message,
                    expires_in_hours=expires_in_hours
                )
                
                invitation = await self.create_invitation(
                    invitation_data, 
                    invited_by, 
                    background_tasks
                )
                
                results["successful"].append({
                    "staff_id": staff_id,
                    "invitation_id": invitation.id,
                    "email": invitation.email
                })
                
            except ValueError as e:
                error_msg = str(e)
                if "already exists" in error_msg:
                    results["already_exists"].append(staff_id)
                elif "email address" in error_msg:
                    results["no_email"].append(staff_id)
                else:
                    results["failed"].append({
                        "staff_id": staff_id,
                        "error": error_msg
                    })
            except Exception as e:
                results["failed"].append({
                    "staff_id": staff_id,
                    "error": str(e)
                })
        
        return results
    
    async def _send_invitation_email(
        self,
        invitation: StaffInvitation,
        background_tasks: Optional[BackgroundTasks] = None,
    ) -> None:
        """Send invitation email to staff member"""
        
        # Get related data
        staff = invitation.staff
        facility = invitation.facility
        tenant = invitation.tenant
        invited_by = invitation.invited_by_user
        
        settings = get_settings()
        
        # Create invitation accept URL
        accept_url = f"{settings.FRONTEND_URL}/signup/accept/{invitation.token}"
        
        # Send notification
        await self.notification_service.send_email_to_address(
            notification_type=NotificationType.STAFF_INVITATION,
            to_email=invitation.email,
            template_data={
                "staff_name": staff.full_name,
                "organization_name": tenant.name,
                "facility_name": facility.name,
                "role": staff.role,
                "invited_by_name": invited_by.email.split('@')[0],
                "accept_url": accept_url,
                "recipient_email": invitation.email,
                "custom_message": invitation.custom_message or "",
                "expires_at": invitation.expires_at.strftime("%B %d, %Y at %I:%M %p"),
            },
            tenant_id=tenant.id,
            priority=NotificationPriority.MEDIUM,
            action_url=accept_url,
            action_text="Accept invitation",
            background_tasks=background_tasks,
        )
    
    def accept_invitation(
        self, 
        token: str,
        signup_method: str,
        password: Optional[str] = None
    ) -> Dict[str, Any]:
        """Accept an invitation and create user account"""
        
        # Find and validate invitation
        invitation = self.db.exec(
            select(StaffInvitation).where(StaffInvitation.token == token)
        ).first()
        
        if not invitation or not invitation.is_valid():
            raise ValueError("Invalid or expired invitation")
        
        staff = invitation.staff
        
        # Check if user already exists
        existing_user = self.db.exec(
            select(User).where(User.email == staff.email)
        ).first()
        
        if existing_user:
            raise ValueError("User account already exists")
        
        if not staff.email:
            raise ValueError("Staff member must have an email address")
        
        # Create user account
        user = User(
            email=cast(str, staff.email),
            is_manager=False,
            is_active=True,
            tenant_id=invitation.tenant_id,
            hashed_password="",
        )
        
        if signup_method == "credentials" and password:
            from ..core.security import hash_password
            user.hashed_password = hash_password(password)
        
        self.db.add(user)
        
        # Mark staff as active and link to user
        staff.is_active = True
        
        # Mark invitation as accepted
        invitation.accepted_at = datetime.now(timezone.utc)
        
        self.db.commit()
        self.db.refresh(user)
        
        return {
            "user_id": user.id,
            "staff_id": staff.id,
            "message": "Account created successfully"
        }
    
    def get_invitation_stats(self, tenant_id: uuid.UUID) -> Dict[str, Any]:
        """Get invitation statistics for a tenant"""
        
        invitations = self.db.exec(
            select(StaffInvitation).where(StaffInvitation.tenant_id == tenant_id)
        ).all()
        
        total = len(invitations)
        if total == 0:
            return {
                "total_sent": 0,
                "pending": 0,
                "accepted": 0,
                "expired": 0,
                "cancelled": 0,
                "acceptance_rate": 0.0
            }
        
        pending = sum(1 for inv in invitations if inv.status == "pending" or inv.status == "sent")
        accepted = sum(1 for inv in invitations if inv.status == "accepted")
        expired = sum(1 for inv in invitations if inv.status == "expired")
        cancelled = sum(1 for inv in invitations if inv.status == "cancelled")
        
        acceptance_rate = (accepted / total) * 100 if total > 0 else 0
        
        return {
            "total_sent": total,
            "pending": pending,
            "accepted": accepted,
            "expired": expired,
            "cancelled": cancelled,
            "acceptance_rate": round(acceptance_rate, 2)
        }