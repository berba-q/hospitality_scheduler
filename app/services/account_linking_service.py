import uuid
from sqlmodel import Session, select
from typing import Optional, Dict, Any, List
from fastapi import HTTPException

from ..models import User, UserProvider
from ..schemas import AccountLinkRequest, UserProviderRead

class AccountLinkingService:
    def __init__(self, db: Session):
        self.db = db
    
    def link_provider(
        self, 
        user_id: uuid.UUID, 
        link_request: AccountLinkRequest
    ) -> UserProvider:
        """Link a new provider to an existing user account"""
        
        # Get user
        user = self.db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if provider already linked
        existing_link = self.db.exec(
            select(UserProvider).where(
                UserProvider.user_id == user_id,
                UserProvider.provider == link_request.provider,
                UserProvider.is_active == True
            )
        ).first()
        
        if existing_link:
            raise HTTPException(
                status_code=400, 
                detail=f"{link_request.provider} account already linked"
            )
        
        # Check if provider is linked to another user
        existing_provider = self.db.exec(
            select(UserProvider).where(
                UserProvider.provider == link_request.provider,
                UserProvider.provider_id == link_request.provider_id,
                UserProvider.is_active == True
            )
        ).first()
        
        if existing_provider and existing_provider.user_id != user_id:
            raise HTTPException(
                status_code=400,
                detail=f"This {link_request.provider} account is already linked to another user"
            )
        
        # Create provider link
        provider_link = UserProvider(
            user_id=user_id,
            provider=link_request.provider,
            provider_id=link_request.provider_id,
            provider_email=link_request.provider_email,
            provider_data=link_request.provider_data or {},
            is_primary=len(user.providers) == 0  # First provider is primary
        )
        
        self.db.add(provider_link)
        self.db.commit()
        self.db.refresh(provider_link)
        
        return provider_link
    
    def unlink_provider(
        self, 
        user_id: uuid.UUID, 
        provider: str
    ) -> bool:
        """Unlink a provider from user account"""
        
        user = self.db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if user has other authentication methods
        active_providers = [p for p in user.providers if p.is_active]
        
        if len(active_providers) <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot unlink the only authentication method"
            )
        
        # Find and deactivate provider
        provider_link = self.db.exec(
            select(UserProvider).where(
                UserProvider.user_id == user_id,
                UserProvider.provider == provider,
                UserProvider.is_active == True
            )
        ).first()
        
        if not provider_link:
            raise HTTPException(
                status_code=404,
                detail=f"{provider} account not found or already unlinked"
            )
        
        provider_link.is_active = False
        
        # If this was the primary provider, set another as primary
        if provider_link.is_primary:
            other_provider = next(
                (p for p in user.providers if p.is_active and p.id != provider_link.id), 
                None
            )
            if other_provider:
                other_provider.is_primary = True
        
        self.db.commit()
        return True
    
    def find_user_by_provider(
        self, 
        provider: str, 
        provider_id: str
    ) -> Optional[User]:
        """Find user by provider information"""
        
        provider_link = self.db.exec(
            select(UserProvider).where(
                UserProvider.provider == provider,
                UserProvider.provider_id == provider_id,
                UserProvider.is_active == True
            )
        ).first()
        
        if provider_link:
            return self.db.get(User, provider_link.user_id)
        
        return None
    
    def find_user_by_provider_email(
        self, 
        provider: str, 
        email: str
    ) -> Optional[User]:
        """Find user by provider email (for account linking suggestions)"""
        
        # First try exact provider match
        provider_link = self.db.exec(
            select(UserProvider).where(
                UserProvider.provider == provider,
                UserProvider.provider_email == email,
                UserProvider.is_active == True
            )
        ).first()
        
        if provider_link:
            return self.db.get(User, provider_link.user_id)
        
        # Then try finding user by email (any provider or direct user email)
        user = self.db.exec(
            select(User).where(User.email == email)
        ).first()
        
        return user
    
    def suggest_account_linking(
        self, 
        provider: str, 
        provider_email: str
    ) -> Optional[Dict[str, Any]]:
        """Suggest account linking if email matches existing user"""
        
        existing_user = self.find_user_by_provider_email(provider, provider_email)
        
        if not existing_user:
            return None
        
        # Check if provider already linked
        existing_provider = self.db.exec(
            select(UserProvider).where(
                UserProvider.user_id == existing_user.id,
                UserProvider.provider == provider,
                UserProvider.is_active == True
            )
        ).first()
        
        if existing_provider:
            return None  # Already linked
        
        return {
            "user_id": str(existing_user.id),
            "email": existing_user.email,
            "existing_providers": [p.provider for p in existing_user.providers if p.is_active],
            "suggested_action": "link_accounts"
        }