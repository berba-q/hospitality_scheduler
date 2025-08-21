import hashlib
import uuid
from datetime import datetime, timezone, timedelta
from sqlmodel import Session, select, and_
from sqlmodel import desc
from typing import Optional, List
import logging

from ..models import UserSession, User, SecuritySettings
from ..core.config import get_settings

logger = logging.getLogger(__name__)

class SessionService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()
    
    def _hash_token(self, token: str) -> str:
        """Hash JWT token for storage"""
        return hashlib.sha256(token.encode()).hexdigest()
    
    async def create_session(
        self,
        user_id: uuid.UUID,
        token: str,
        ip_address: str,
        user_agent: Optional[str] = None,
        device_fingerprint: Optional[str] = None
    ) -> UserSession:
        """Create a new user session"""
        
        # Get user's tenant security settings
        user = self.db.get(User, user_id)
        security_settings = None
        
        if user:
            security_settings = self.db.exec(
                select(SecuritySettings).where(SecuritySettings.tenant_id == user.tenant_id)
            ).first()
        
        # Determine session timeout
        timeout_minutes = security_settings.session_timeout_minutes if security_settings else 480
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=timeout_minutes)
        
        # Check concurrent session limit
        if security_settings and security_settings.max_concurrent_sessions:
            await self._enforce_session_limit(user_id, security_settings.max_concurrent_sessions)
        
        # Create session
        session = UserSession(
            user_id=user_id,
            session_token_hash=self._hash_token(token),
            ip_address=ip_address,
            user_agent=user_agent,
            device_fingerprint=device_fingerprint,
            expires_at=expires_at
        )
        
        self.db.add(session)
        self.db.commit()
        
        logger.info(f"Created session for user {user_id} from IP {ip_address}")
        return session
    
    async def _enforce_session_limit(self, user_id: uuid.UUID, max_sessions: int) -> None:
        """Enforce maximum concurrent sessions"""
        active_sessions = self.db.exec(
            select(UserSession).where(
                and_(
                    UserSession.user_id == user_id,
                    UserSession.is_active == True,
                    UserSession.expires_at > datetime.now(timezone.utc)
                )
            ).order_by(desc(UserSession.last_used))
        ).all()
        
        # Revoke oldest sessions if limit exceeded
        if len(active_sessions) >= max_sessions:
            sessions_to_revoke = active_sessions[max_sessions-1:]
            for session in sessions_to_revoke:
                session.is_active = False
                session.revoked_at = datetime.now(timezone.utc)
                session.revocation_reason = "session_limit_exceeded"
            
            self.db.commit()
            logger.info(f"Revoked {len(sessions_to_revoke)} sessions for user {user_id} (limit: {max_sessions})")
    
    async def validate_session(self, token: str) -> Optional[UserSession]:
        """Validate if session is active and not expired"""
        token_hash = self._hash_token(token)
        
        session = self.db.exec(
            select(UserSession).where(UserSession.session_token_hash == token_hash)
        ).first()
        
        if not session or not session.is_valid:
            return None
        
        # Update last used timestamp
        session.last_used = datetime.now(timezone.utc)
        self.db.commit()
        
        return session
    
    async def revoke_session(self, token: str) -> bool:
        """Revoke a specific session"""
        token_hash = self._hash_token(token)
        
        session = self.db.exec(
            select(UserSession).where(
                and_(
                    UserSession.session_token_hash == token_hash,
                    UserSession.is_active == True
                )
            )
        ).first()
        
        if session:
            session.is_active = False
            session.revoked_at = datetime.now(timezone.utc)
            session.revocation_reason = "user_requested"
            self.db.commit()
            
            logger.info(f"Revoked session for user {session.user_id}")
            return True
        
        return False
    
    async def revoke_all_user_sessions(self, user_id: uuid.UUID, except_token: Optional[str] = None) -> int:
        """Revoke all sessions for a user, optionally except current session"""
        query = select(UserSession).where(
            and_(
                UserSession.user_id == user_id,
                UserSession.is_active == True
            )
        )
        
        sessions = self.db.exec(query).all()
        revoked_count = 0
        
        except_token_hash = self._hash_token(except_token) if except_token else None
        
        for session in sessions:
            if except_token_hash and session.session_token_hash == except_token_hash:
                continue  # Skip current session
            
            session.is_active = False
            session.revoked_at = datetime.now(timezone.utc)
            session.revocation_reason = "all_sessions_revoked"
            revoked_count += 1
        
        self.db.commit()
        
        logger.info(f"Revoked {revoked_count} sessions for user {user_id}")
        return revoked_count
    
    async def cleanup_expired_sessions(self) -> int:
        """Clean up expired sessions (should be run periodically)"""
        expired_sessions = self.db.exec(
            select(UserSession).where(
                and_(
                    UserSession.is_active == True,
                    UserSession.expires_at < datetime.now(timezone.utc)
                )
            )
        ).all()
        
        for session in expired_sessions:
            session.is_active = False
            session.revoked_at = datetime.now(timezone.utc)
            session.revocation_reason = "expired"
        
        self.db.commit()
        
        logger.info(f"Cleaned up {len(expired_sessions)} expired sessions")
        return len(expired_sessions)
    
    async def get_user_sessions(self, user_id: uuid.UUID, active_only: bool = True) -> List[UserSession]:
        """Get all sessions for a user"""
        query = select(UserSession).where(UserSession.user_id == user_id)
        
        if active_only:
            query = query.where(
                and_(
                    UserSession.is_active == True,
                    UserSession.expires_at > datetime.now(timezone.utc)
                )
            )

        query = query.order_by(desc(UserSession.last_used))

        return list(self.db.exec(query).all())