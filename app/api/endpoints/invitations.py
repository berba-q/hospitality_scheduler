from datetime import datetime, timedelta, timezone
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlmodel import Session, select
from typing import List, Optional

from ...deps import get_current_user, get_db
from ...models import User, StaffInvitation, Staff
from ...schemas import (
    InvitationCreate, InvitationRead, BulkInvitationRequest,
    InvitationAcceptRequest, InvitationStatsResponse
)
from ...services.invitation_service import InvitationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/invitations", tags=["invitations"])

@router.post("/", response_model=InvitationRead)
async def create_invitation(
    invitation_data: InvitationCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a single staff invitation"""
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Only managers can send invitations")
    
    service = InvitationService(db)
    try:
        invitation = await service.create_invitation(
            invitation_data, 
            current_user.id, 
            background_tasks
        )
        return invitation
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/bulk")
async def create_bulk_invitations(
    request: BulkInvitationRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create invitations for multiple staff members"""
    logger.info(f"🎯 Bulk invitation endpoint called by user: {current_user.email}")
    logger.info(f"📊 Request details - Staff IDs: {request.staff_ids}, "
               f"Custom message: {bool(request.custom_message)}, "
               f"Expires in: {request.expires_in_hours} hours")

    if not current_user.is_manager:
        logger.warning(f"⚠️ Non-manager user {current_user.email} attempted to send invitations")
        raise HTTPException(status_code=403, detail="Only managers can send invitations")

    service = InvitationService(db)
    logger.info(f"🚀 Starting bulk invitation service")
    results = await service.create_bulk_invitations(
        request.staff_ids,
        current_user.id,
        request.custom_message,
        request.expires_in_hours,
        background_tasks
    )

    logger.info(f"✅ Bulk invitation endpoint returning results: {results}")

    return results

@router.get("/", response_model=List[InvitationRead])
def list_invitations(
    status: Optional[str] = Query(None, regex="^(pending|sent|accepted|expired|cancelled)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List invitations for current tenant"""
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Only managers can view invitations")
    
    query = select(StaffInvitation).where(
        StaffInvitation.tenant_id == current_user.tenant_id
    )
    
    invitations = db.exec(query).all()
    
    # Filter by status if provided
    if status:
        invitations = [inv for inv in invitations if inv.status == status]
    
    # Convert to response format with related data
    result = []
    for invitation in invitations:
        result.append({
            **invitation.dict(),
            "staff_name": invitation.staff.full_name,
            "facility_name": invitation.facility.name,
            "invited_by_name": invitation.invited_by_user.email
        })
    
    return result

@router.get("/verify/{token}", response_model=InvitationRead)
def get_invitation_by_token(
    token: str,
    db: Session = Depends(get_db)
):
    """Get invitation details by token (for validation)"""
    logger.info(f"🔍 Validating invitation token: {token}")
    
    invitation = db.exec(
        select(StaffInvitation).where(StaffInvitation.token == token)
    ).first()
    
    if not invitation:
        logger.warning(f"❌ Invitation token not found: {token}")
        raise HTTPException(status_code=404, detail="Invitation not found")
        
    if not invitation.is_valid():
        logger.warning(f"❌ Invitation invalid or expired. Status: {invitation.status}, Expires: {invitation.expires_at}")
        raise HTTPException(status_code=400, detail="Invitation is invalid or expired")
        
    logger.info(f"✅ Invitation valid for: {invitation.email}")
    return {
        **invitation.dict(),
        "status": invitation.status,
        "staff_name": invitation.staff.full_name,
        "facility_name": invitation.facility.name,
        "invited_by_name": invitation.invited_by_user.email
    }

from app.core.security import create_access_token

@router.post("/accept")
def accept_invitation(
    request: InvitationAcceptRequest,
    db: Session = Depends(get_db)
):
    """Accept an invitation and create user account"""
    logger.info(f"📝 Accept invitation request received for token: {request.token}")
    service = InvitationService(db)
    
    try:
        result = service.accept_invitation(
            request.token,
            request.signup_method,
            request.password
        )
        
        # Generate access token for the new user
        access_token = create_access_token(subject=str(result["user_id"]))
        
        logger.info(f"✅ Invitation accepted successfully for user: {result.get('email', 'unknown')}")
        
        # Return result with token
        return {
            **result,
            "access_token": access_token,
            "token_type": "bearer"
        }
    except ValueError as e:
        logger.error(f"❌ Failed to accept invitation: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/stats", response_model=InvitationStatsResponse)
def get_invitation_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get invitation statistics for current tenant"""
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Only managers can view stats")
    
    service = InvitationService(db)
    stats = service.get_invitation_stats(current_user.tenant_id)
    
    return InvitationStatsResponse(**stats)

@router.post("/{invitation_id}/resend")
async def resend_invitation(
    invitation_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resend an invitation"""
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Only managers can resend invitations")
    
    invitation = db.get(StaffInvitation, invitation_id)
    if not invitation or invitation.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    if invitation.accepted_at:
        raise HTTPException(status_code=400, detail="Invitation already accepted")
    
    # Extend expiry and resend
    invitation.expires_at = datetime.now(timezone.utc) + timedelta(hours=168)  # 7 days
    invitation.sent_at = datetime.now(timezone.utc)
    
    service = InvitationService(db)
    await service._send_invitation_email(invitation, background_tasks)
    
    db.commit()
    
    return {"message": "Invitation resent successfully"}

@router.delete("/{invitation_id}")
def cancel_invitation(
    invitation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel an invitation"""
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Only managers can cancel invitations")
    
    invitation = db.get(StaffInvitation, invitation_id)
    if not invitation or invitation.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    if invitation.accepted_at:
        raise HTTPException(status_code=400, detail="Cannot cancel accepted invitation")
    
    invitation.cancelled_at = datetime.now(timezone.utc)
    db.commit()
    
    return {"message": "Invitation cancelled successfully"}