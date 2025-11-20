import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any, cast
import uuid
import logging
from sqlmodel import Session, select
from sqlalchemy.sql.elements import ColumnElement
from fastapi import BackgroundTasks

from ..models import NotificationPriority, StaffInvitation, Staff, User, Facility, Tenant
from ..schemas import InvitationCreate, InvitationRead
from .notification_service import NotificationService, NotificationType
from ..core.config import get_settings

logger = logging.getLogger(__name__)

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

        logger.info(f"🎟️ Creating invitation for staff_id: {invitation_data.staff_id}")

        # Get staff member details
        staff = self.db.get(Staff, invitation_data.staff_id)
        if not staff:
            logger.error(f"❌ Staff member not found: {invitation_data.staff_id}")
            raise ValueError("Staff member not found")

        logger.info(f"✅ Found staff: {staff.full_name} ({staff.email})")

        if not staff.email:
            logger.error(f"❌ Staff {staff.full_name} has no email address")
            raise ValueError("Staff member must have an email address")

        # Check if active user already exists
        existing_user = self.db.exec(
            select(User).where(User.email == staff.email)
        ).first()

        if existing_user and existing_user.is_active:
            logger.warning(f"⚠️ Active user already exists for email: {staff.email}")
            raise ValueError("Active user already exists for this email address")

        # If inactive user exists, log it but allow invitation
        if existing_user and not existing_user.is_active:
            logger.info(f"ℹ️ Inactive user exists for {staff.email}, allowing re-invitation")

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
            logger.warning(f"⚠️ Valid invitation already exists for staff: {staff.full_name}")
            raise ValueError("Valid invitation already exists for this staff member")

        # Create invitation
        logger.info(f"📝 Creating invitation record in database for {staff.email}")
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

        logger.info(f"✅ Invitation record created with ID: {invitation.id}")

        # Send invitation email
        logger.info(f"📧 Attempting to send invitation email to {staff.email}")
        await self._send_invitation_email(invitation, background_tasks)

        # Update sent timestamp
        invitation.sent_at = datetime.now(timezone.utc)
        self.db.commit()

        logger.info(f"✅ Invitation process completed for {staff.email}")

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

        logger.info(f"🎟️ Starting bulk invitation creation for {len(staff_ids)} staff members")

        results = {
            "successful": [],
            "failed": [],
            "already_exists": [],
            "no_email": []
        }

        for i, staff_id in enumerate(staff_ids, 1):
            logger.info(f"📤 Processing invitation {i}/{len(staff_ids)} for staff_id: {staff_id}")
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

                logger.info(f"✅ Successfully created invitation {i}/{len(staff_ids)}")

            except ValueError as e:
                error_msg = str(e)
                logger.warning(f"⚠️ ValueError for staff {staff_id}: {error_msg}")
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
                logger.error(f"❌ Exception for staff {staff_id}: {str(e)}")
                results["failed"].append({
                    "staff_id": staff_id,
                    "error": str(e)
                })

        logger.info(f"✅ Bulk invitation completed: {len(results['successful'])} successful, "
                   f"{len(results['failed'])} failed, {len(results['already_exists'])} already exist, "
                   f"{len(results['no_email'])} without email")

        return results
    
    async def _send_invitation_email(
        self,
        invitation: StaffInvitation,
        background_tasks: Optional[BackgroundTasks] = None,
    ) -> None:
        """Send invitation email to staff member"""

        logger.info(f"📧 Preparing invitation email for {invitation.email}")

        # Get related data
        staff = invitation.staff
        facility = invitation.facility
        tenant = invitation.tenant
        invited_by = invitation.invited_by_user

        logger.info(f"📋 Email data - Staff: {staff.full_name}, Facility: {facility.name}, Tenant: {tenant.name}")

        settings = get_settings()

        # Create invitation accept URL
        accept_url = f"{settings.FRONTEND_URL}/signup/accept/{invitation.token}"
        logger.info(f"🔗 Invitation URL: {accept_url}")

        # Send notification
        logger.info(f"📨 Calling notification service to send email to {invitation.email}")
        try:
            result = await self.notification_service.send_email_to_address(
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
            logger.info(f"✅ Notification service returned: {result}")
        except Exception as e:
            logger.error(f"❌ Failed to send invitation email: {str(e)}")
            raise
    
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

        if existing_user and existing_user.is_active:
            raise ValueError("Active user account already exists")

        if not staff.email:
            raise ValueError("Staff member must have an email address")

        # Reactivate existing inactive user or create new user
        if existing_user and not existing_user.is_active:
            logger.info(f"♻️ Reactivating inactive user account for {staff.email}")
            user = existing_user
            user.is_active = True
            user.tenant_id = invitation.tenant_id  # Update tenant if needed

            # Auto-populate WhatsApp number from staff phone if not already set
            if not user.whatsapp_number and staff.phone:
                user.whatsapp_number = staff.phone
                logger.info(f"📱 Auto-populated WhatsApp number from staff phone: {staff.phone}")

            if signup_method == "credentials" and password:
                from ..core.security import hash_password
                user.hashed_password = hash_password(password)
        else:
            # Create new user account
            logger.info(f"✨ Creating new user account for {staff.email}")
            user = User(
                email=cast(str, staff.email),
                is_manager=False,
                is_active=True,
                tenant_id=invitation.tenant_id,
                hashed_password="",
                # Auto-populate WhatsApp number from staff phone
                whatsapp_number=staff.phone if staff.phone else None
            )

            if staff.phone:
                logger.info(f"📱 Auto-populated WhatsApp number from staff phone: {staff.phone}")

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
            "email": user.email,
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