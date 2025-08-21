import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import and_
from sqlmodel import Session, select, desc, col
from typing import Optional, Dict, Any, List
import logging

from ..models import AuditLog, AuditEvent

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
    ) -> AuditLog:
        """Log an audit event"""
        
        # Auto-generate description if not provided
        if not event_description:
            event_description = self._generate_description(event_type, details)
        
        # ✅ FIX: Better action mapping for your existing AuditLog structure
        action_mapping = {
            AuditEvent.LOGIN_SUCCESS: "LOGIN_SUCCESS",
            AuditEvent.LOGIN_FAILED: "LOGIN_FAILED",
            AuditEvent.LOGIN_FAILED_LOCKED: "LOGIN_FAILED_LOCKED",
            AuditEvent.SIGNUP_SUCCESS: "CREATE_USER",
            AuditEvent.SIGNUP_FAILED: "CREATE_USER_FAILED",
            AuditEvent.PASSWORD_RESET_REQUESTED: "PASSWORD_RESET_REQUEST",
            AuditEvent.PASSWORD_RESET_SUCCESS: "PASSWORD_RESET_SUCCESS",
            AuditEvent.PASSWORD_RESET_FAILED: "PASSWORD_RESET_FAILED",
            AuditEvent.ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
            AuditEvent.ACCOUNT_UNLOCKED: "ACCOUNT_UNLOCKED",
            AuditEvent.SESSION_REVOKED: "SESSION_REVOKED",
            AuditEvent.ALL_SESSIONS_REVOKED: "ALL_SESSIONS_REVOKED",
            AuditEvent.SUSPICIOUS_ACTIVITY: "SUSPICIOUS_ACTIVITY",
            AuditEvent.RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
        }
        
        # ✅ FIX: Create audit log with proper field handling
        audit_log_data = {
            "action": action_mapping.get(event_type, event_type.value),
            "resource_type": resource_type or "system",
            "resource_id": uuid.UUID(resource_id) if resource_id else None,
            "changes": {},  # Initialize empty for your existing structure
            "ip_address": ip_address,
            "user_agent": user_agent,
            "created_at": datetime.now(timezone.utc)
        }
        
        # Add user_id and tenant_id if provided
        if user_id:
            audit_log_data["user_id"] = user_id
        if tenant_id:
            audit_log_data["tenant_id"] = tenant_id
        
        # ✅ FIX: Add new fields only if they exist in your model
        if hasattr(AuditLog, 'event_type'):
            audit_log_data["event_type"] = event_type.value
        if hasattr(AuditLog, 'event_description'):
            audit_log_data["event_description"] = event_description
        if hasattr(AuditLog, 'severity'):
            audit_log_data["severity"] = severity
        if hasattr(AuditLog, 'request_id'):
            audit_log_data["request_id"] = request_id
        if hasattr(AuditLog, 'details'):
            audit_log_data["details"] = details or {}
        
        audit_log = AuditLog(**audit_log_data)
        
        self.db.add(audit_log)
        self.db.commit()
        
        # Log to application logger as well for immediate visibility
        log_level = getattr(logging, severity.upper(), logging.INFO)
        logger.log(
            log_level,
            f"AUDIT: {event_type.value} - {event_description} (User: {user_id}, IP: {ip_address})"
        )
        
        return audit_log
    
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
    
    async def get_security_events(
        self,
        hours: int = 24,
        severity: Optional[str] = None
    ) -> List[AuditLog]:
        """Get recent security-related events"""
        from_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        # ✅ FIX: Use string values for event types (compatible with both old and new models)
        security_events = [
            "login_failed",
            "login_failed_locked", 
            "account_locked",
            "suspicious_activity",
            "rate_limit_exceeded",
            "password_reset_failed"
        ]
        
        # ✅ FIX: Build query with proper column references
        base_conditions = [col(AuditLog.created_at) >= from_time]
        
        # Check if we have the new event_type field, otherwise use action field
        if hasattr(AuditLog, 'event_type'):
            base_conditions.append(col(AuditLog.event_type).in_(security_events))
        else:
            # Fallback to action field for compatibility
            security_actions = [
                "LOGIN_FAILED",
                "LOGIN_FAILED_LOCKED",
                "ACCOUNT_LOCKED", 
                "SUSPICIOUS_ACTIVITY",
                "RATE_LIMIT_EXCEEDED",
                "PASSWORD_RESET_FAILED"
            ]
            base_conditions.append(col(AuditLog.action).in_(security_actions))
        
        #  Add severity filter if available and requested
        if severity and hasattr(AuditLog, 'severity'):
            base_conditions.append(col(AuditLog.severity) == severity)
        
        # Combine conditions properly
        query = select(AuditLog).where(and_(*base_conditions))
        query = query.order_by(desc(col(AuditLog.created_at)))
        
        #  Explicit type casting for exec result
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