from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session
from typing import List

from app.services.notification_service import NotificationService

from ...deps import get_current_user, get_db
from ...models import NotificationType, User
from ...schemas import (
    AccountLinkRequest,
    AccountLinkingSuggestion, 
    AccountUnlinkRequest,
    AccountVerificationRequest,
    AccountVerificationResponse, 
    UserProviderRead,
    UserProfileWithProviders,
    VerificationCodeRequest,
    VerificationCodeResponse
)
from ...services.account_linking_service import AccountLinkingService

router = APIRouter(prefix="/account", tags=["account-linking"])

@router.get("/profile", response_model=UserProfileWithProviders)
def get_user_profile_with_providers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user profile with linked providers"""
    return current_user

@router.get("/providers", response_model=List[UserProviderRead])
def list_linked_providers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all linked providers for current user"""
    return [p for p in current_user.providers if p.is_active]

@router.post("/link-provider", response_model=UserProviderRead)
def link_provider(
    link_request: AccountLinkRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Link a new provider to current user account"""
    service = AccountLinkingService(db)
    provider_link = service.link_provider(current_user.id, link_request)
    return provider_link

@router.delete("/unlink-provider")
def unlink_provider(
    unlink_request: AccountUnlinkRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unlink a provider from current user account"""
    service = AccountLinkingService(db)
    success = service.unlink_provider(current_user.id, unlink_request.provider)
    
    return {"message": f"{unlink_request.provider} account unlinked successfully"}

@router.post("/suggest-linking")
def suggest_account_linking(
    provider: str,
    provider_email: str,
    db: Session = Depends(get_db)
):
    """Suggest account linking for new provider login"""
    service = AccountLinkingService(db)
    suggestion = service.suggest_account_linking(provider, provider_email)
    
    if suggestion:
        return {
            "link_suggestion": True,
            **suggestion
        }
    
    return {"link_suggestion": False}

@router.post("/suggest-linking", response_model=AccountLinkingSuggestion)
def suggest_account_linking_enhanced(
    provider: str,
    provider_email: str,
    db: Session = Depends(get_db)
):
    """Enhanced account linking suggestion with verification support"""
    service = AccountLinkingService(db)
    suggestion = service.suggest_account_linking_with_verification(provider, provider_email)
    
    return AccountLinkingSuggestion(**suggestion)

@router.post("/request-verification", response_model=AccountVerificationResponse)
async def request_email_verification(
    verification_request: AccountVerificationRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Request email verification for account linking"""
    
    service = AccountLinkingService(db)
    
    try:
        # Generate verification code
        code = service.request_email_verification(
            user_id=current_user.id,
            verification_request=verification_request
        )
        
        # Send verification email
        notification_service = NotificationService(db)
        await notification_service.send_notification(
            notification_type=NotificationType.EMAIL_VERIFICATION,
            recipient_user_id=current_user.id,
            template_data={
                "user_name": current_user.email.split('@')[0],
                "verification_code": code,
                "provider_name": verification_request.provider.title(),
                "provider_email": verification_request.provider_email,
                "target_email": verification_request.email,
                "expires_in": "24 hours"
            },
            channels=["EMAIL"],
            background_tasks=background_tasks,
            override_recipient_email=verification_request.email  # Send to the email being verified
        )
        
        return AccountVerificationResponse(
            success=True,
            message="Verification code sent to your email address",
            verification_email=verification_request.email
        )
        
    except HTTPException as e:
        return AccountVerificationResponse(
            success=False,
            message=e.detail
        )
    except Exception as e:
        return AccountVerificationResponse(
            success=False,
            message="Failed to send verification code"
        )

@router.post("/verify-code", response_model=VerificationCodeResponse)
def verify_email_and_link_account(
    verification_request: VerificationCodeRequest,
    db: Session = Depends(get_db)
):
    """Verify email code and complete account linking"""
    
    service = AccountLinkingService(db)
    
    try:
        provider_link = service.verify_code_and_complete_linking(verification_request)
        
        return VerificationCodeResponse(
            success=True,
            message="Email verified and account linked successfully",
            link_request_data={
                "provider": provider_link.provider,
                "provider_email": provider_link.provider_email,
                "linked_at": provider_link.linked_at.isoformat() if provider_link.linked_at else None
            }
        )
        
    except HTTPException as e:
        return VerificationCodeResponse(
            success=False,
            message=e.detail
        )
    except Exception as e:
        return VerificationCodeResponse(
            success=False,
            message="Failed to verify code and link account"
        )