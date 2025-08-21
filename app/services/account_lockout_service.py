"""
Account Lockout Service

Handles account lockout logic, including tracking failed login attempts and locking accounts.
"""
from datetime import datetime, timezone, timedelta
from sqlmodel import Session, select, and_
from typing import Optional
import logging

from ..models import LoginAttempt, AccountLockout, SecuritySettings, User
from ..core.config import get_settings

logger = logging.getLogger(__name__)

class AccountLockoutService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()
    
    async def is_account_locked(self, email: str) -> bool:
        """Check if account is currently locked"""
        lockout = self.db.exec(
            select(AccountLockout).where(
                AccountLockout.email == email.lower(),
                AccountLockout.is_active == True
            )
        ).first()
        
        if not lockout:
            return False
        
        return lockout.is_locked
    
    async def record_failed_attempt(
                self, email: str, 
                ip_address: str, 
                user_agent: Optional[str] = None
                ) -> None: # type: ignore
        """Record a failed login attempt and potentially lock account"""
        email = email.lower()
        
        # Get security settings for this user's tenant
        user = self.db.exec(select(User).where(User.email == email)).first()
        security_settings = None
        
        if user:
            security_settings = self.db.exec(
                select(SecuritySettings).where(SecuritySettings.tenant_id == user.tenant_id)
            ).first()
        
        # Use default settings if none found
        max_attempts = security_settings.max_failed_attempts if security_settings else 5
        window_minutes = security_settings.failed_attempts_window_minutes if security_settings else 15
        lockout_minutes = security_settings.lockout_duration_minutes if security_settings else 30
        
        # Record the failed attempt
        attempt = LoginAttempt(
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            failure_reason="invalid_credentials",
            attempted_at=datetime.now(timezone.utc)
        )
        self.db.add(attempt)
        
        # Count recent failed attempts within the window
        window_start = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)
        recent_attempts = self.db.exec(
            select(LoginAttempt).where(
                and_(
                    LoginAttempt.email == email,
                    LoginAttempt.success == False,
                    LoginAttempt.attempted_at >= window_start
                )
            )
        ).all()
        
        failed_count = len(recent_attempts) + 1  # +1 for current attempt
        
        logger.info(f"Failed login attempts for {email}: {failed_count}/{max_attempts}")
        
        # Lock account if threshold exceeded
        if failed_count >= max_attempts:
            await self._lock_account(email, failed_count, lockout_minutes)
        
        self.db.commit()
    
    async def _lock_account(self, email: str, failed_attempts: int, lockout_minutes: int) -> None:
        """Lock an account"""
        locked_until = datetime.now(timezone.utc) + timedelta(minutes=lockout_minutes)
        
        # Check if lockout already exists
        existing_lockout = self.db.exec(
            select(AccountLockout).where(AccountLockout.email == email)
        ).first()
        
        if existing_lockout:
            # Update existing lockout
            existing_lockout.locked_at = datetime.now(timezone.utc)
            existing_lockout.locked_until = locked_until
            existing_lockout.failed_attempts = failed_attempts
            existing_lockout.is_active = True
        else:
            # Create new lockout
            lockout = AccountLockout(
                email=email,
                locked_until=locked_until,
                failed_attempts=failed_attempts,
                lockout_reason="too_many_failed_attempts"
            )
            self.db.add(lockout)
        
        logger.warning(f"Account locked: {email} until {locked_until}")
    
    async def clear_failed_attempts(self, email: str) -> None:
        """Clear failed attempts and unlock account (on successful login)"""
        email = email.lower()
        
        # Mark existing lockout as inactive
        lockout = self.db.exec(
            select(AccountLockout).where(AccountLockout.email == email)
        ).first()
        
        if lockout:
            lockout.is_active = False
            
        # Record successful login attempt
        attempt = LoginAttempt(
            email=email,
            ip_address="",  # Will be filled by caller
            success=True,
            attempted_at=datetime.now(timezone.utc)
        )
        self.db.add(attempt)
        self.db.commit()
        
        logger.info(f"Cleared failed attempts for {email}")
    
    async def unlock_account(self, email: str, admin_user_id: Optional[str] = None) -> bool: #type: ignore
        """Manually unlock an account (admin action)"""
        email = email.lower()
        
        lockout = self.db.exec(
            select(AccountLockout).where(
                AccountLockout.email == email,
                AccountLockout.is_active == True
            )
        ).first()
        
        if lockout:
            lockout.is_active = False
            self.db.commit()
            
            logger.info(f"Account manually unlocked: {email} by admin: {admin_user_id}")
            return True
        
        return False