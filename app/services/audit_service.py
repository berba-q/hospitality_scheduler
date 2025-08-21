import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import and_
from sqlmodel import Session, select, desc, col
from typing import Optional, Dict, Any, List
import logging

from ..models import AuditLog, AuditEvent, User

logger = logging.getLogger(__name__)

class AuditService:
    def __init__(self, db: Session):
        self.db = db
    
    async def log_event(
        self,
        event_type: AuditEvent,
        user_id: Optional[uuid.UUID] = None,
        tenant_id: Optional[uuid.UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        severity: str = "info",
        event_description: Optional[str] = None
    ) -> Optional[AuditLog]:
        """Log an audit event with smart tenant context handling"""
        
        try:
            # ✅ FIX: Try to derive tenant_id from user_id if missing
            if not tenant_id and user_id:
                from ..models import User
                user = self.db.get(User, user_id)
                if user:
                    tenant_id = user.tenant_id
            
            # ✅ FIX: Skip logging if no tenant context for non-system events
            if not tenant_id and event_type not in [
                AuditEvent.SYSTEM_STARTUP,
                AuditEvent.SYSTEM_SHUTDOWN,
                AuditEvent.SYSTEM_ERROR,
                AuditEvent.SYSTEM_MAINTENANCE
            ]:
                logger.warning(f"Skipping audit log - no tenant context: {event_type.value}")
                return None
            
            # Auto-generate description if not provided
            if not event_description:
                event_description = self._generate_description(event_type, details)
            
            # Create audit log data
            audit_log_data = {
                "action": event_type.value,
                "resource_type": resource_type or "system",
                "resource_id": uuid.UUID(resource_id) if resource_id else None,
                "changes": {},
                "ip_address": ip_address,
                "user_agent": user_agent,
                "created_at": datetime.now(timezone.utc),
                "event_type": event_type.value,
                "event_description": event_description,
                "severity": severity,
                "request_id": request_id,
                "details": details or {}
            }
            
            # ✅ FIX: Only add if not None
            if user_id:
                audit_log_data["user_id"] = user_id
            if tenant_id:
                audit_log_data["tenant_id"] = tenant_id
            
            audit_log = AuditLog(**audit_log_data)
            self.db.add(audit_log)
            self.db.commit()
            
            # Log to application logger as well
            log_level = getattr(logging, severity.upper(), logging.INFO)
            logger.log(
                log_level,
                f"AUDIT: {event_type.value} - {event_description} (User: {user_id}, IP: {ip_address})"
            )
            
            return audit_log
            
        except Exception as e:
            # ✅ FAILSAFE: Don't break the application if audit logging fails
            logger.error(f"Audit logging failed: {e}")
            self.db.rollback()
            return None
    
    def _generate_description(self, event_type: AuditEvent, details: Optional[Dict[str, Any]]) -> str:
        """Generate human-readable event description"""
        descriptions = {
            AuditEvent.LOGIN_SUCCESS: "User successfully logged in",
            AuditEvent.LOGIN_FAILED: "Failed login attempt",
            AuditEvent.LOGIN_FAILED_LOCKED: "Login attempt on locked account",
            AuditEvent.SIGNUP_SUCCESS: "New user account created",
            AuditEvent.SIGNUP_FAILED: "Failed signup attempt",
            AuditEvent.PASSWORD_RESET_REQUESTED: "Password reset requested",
            AuditEvent.PASSWORD_RESET_SUCCESS: "Password successfully reset",
            AuditEvent.PASSWORD_RESET_FAILED: "Failed password reset attempt",
            AuditEvent.ACCOUNT_LOCKED: "Account locked due to failed attempts",
            AuditEvent.ACCOUNT_UNLOCKED: "Account manually unlocked",
            AuditEvent.SESSION_REVOKED: "User session revoked",
            AuditEvent.ALL_SESSIONS_REVOKED: "All user sessions revoked",
            AuditEvent.SUSPICIOUS_ACTIVITY: "Suspicious activity detected",
            AuditEvent.RATE_LIMIT_EXCEEDED: "Rate limit exceeded",
            AuditEvent.SYSTEM_STARTUP: "System started",
            AuditEvent.SYSTEM_SHUTDOWN: "System shutdown",
            AuditEvent.SYSTEM_ERROR: "System error occurred",
        }
        
        base_description = descriptions.get(event_type, f"Event: {event_type.value}")
        
        # Add context from details if available
        if details:
            if 'email' in details:
                base_description += f" for {details['email']}"
            if 'reason' in details:
                base_description += f" - {details['reason']}"
        
        return base_description
    
    async def get_user_audit_trail(
        self,
        user_id: uuid.UUID,
        limit: int = 100,
        event_types: Optional[List[str]] = None
    ) -> List[AuditLog]:
        """Get audit trail for a specific user"""
        # ✅ FIX: Use proper column references
        query = select(AuditLog).where(col(AuditLog.user_id) == user_id)
        
        # ✅ FIX: Handle event_types filtering properly
        if event_types and hasattr(AuditLog, 'event_type'):
            query = query.where(col(AuditLog.event_type).in_(event_types))
        
        query = query.order_by(desc(col(AuditLog.created_at))).limit(limit)
        
        # ✅ FIX: Explicit type casting for exec result
        result = self.db.exec(query)
        return list(result.all())
    
    async def get_security_events(self, hours: int = 24) -> List[AuditLog]:
        """Get recent security events"""
        from_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        query = select(AuditLog).where(
            AuditLog.created_at >= from_time
        ).order_by(desc(AuditLog.created_at))
        
        result = self.db.exec(query)
        return list(result.all())
    
    # ✅ ADD: Helper methods for backward compatibility
    async def get_recent_events(
        self,
        tenant_id: Optional[uuid.UUID] = None,
        limit: int = 50
    ) -> List[AuditLog]:
        """Get recent audit events for a tenant"""
        query = select(AuditLog)
        
        if tenant_id:
            query = query.where(col(AuditLog.tenant_id) == tenant_id)
        
        query = query.order_by(desc(col(AuditLog.created_at))).limit(limit)
        
        result = self.db.exec(query)
        return list(result.all())
    
    async def get_events_by_action(
        self,
        action: str,
        hours: int = 24,
        tenant_id: Optional[uuid.UUID] = None
    ) -> List[AuditLog]:
        """Get events by action type (for backward compatibility)"""
        from_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        conditions = [
            col(AuditLog.action) == action,
            col(AuditLog.created_at) >= from_time
        ]
        
        if tenant_id:
            conditions.append(col(AuditLog.tenant_id) == tenant_id)
        
        query = select(AuditLog).where(and_(*conditions))
        query = query.order_by(desc(col(AuditLog.created_at)))
        
        result = self.db.exec(query)
        return list(result.all())
    
    # Cleanup method for maintenance
    async def cleanup_old_logs(self, days: int = 90) -> int:
        """Clean up audit logs older than specified days"""
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Get count of logs to be deleted
        count_query = select(AuditLog).where(col(AuditLog.created_at) < cutoff_date)
        count_result = self.db.exec(count_query)
        logs_to_delete = list(count_result.all())
        count = len(logs_to_delete)
        
        # Delete old logs
        for log in logs_to_delete:
            self.db.delete(log)
        
        self.db.commit()
        
        logger.info(f"Cleaned up {count} audit logs older than {days} days")
        return count