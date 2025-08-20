from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session
from typing import List

from ...deps import get_current_user, get_db
from ...models import User
from ...schemas import (
    AccountLinkRequest, 
    AccountUnlinkRequest, 
    UserProviderRead,
    UserProfileWithProviders
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