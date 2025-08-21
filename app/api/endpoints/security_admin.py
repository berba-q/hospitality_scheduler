# Security Admin API Endpoints

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlmodel import Session, select, and_, func, desc
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from ...deps import get_db, get_current_user
from ...models import User, AuditLog, AccountLockout, UserSession, SecuritySettings
from ...services.audit_service import AuditService, AuditEvent
from ...services.account_lockout_service import AccountLockoutService
from ...services.session_service import SessionService
from ...schemas import (
    AccountUnlockRequest, AccountUnlockResponse, 
    SecuritySummaryResponse, SessionListResponse, SessionRevokeResponse,
    SessionInfo
)

router = APIRouter()

@router.get("/audit-logs")
async def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    hours: int = Query(24, ge=1, le=168),  # Max 1 week
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get audit logs (manager only)"""
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    # Build query
    from_time = datetime.now(timezone.utc) - timedelta(hours=hours)
    conditions = [AuditLog.created_at >= from_time]
    
    # Add tenant filter
    if current_user.tenant_id:
        conditions.append(AuditLog.tenant_id == current_user.tenant_id)
    
    # Add filters
    if event_type and hasattr(AuditLog, 'event_type'):
        conditions.append(AuditLog.event_type == event_type)
    elif event_type and hasattr(AuditLog, 'action'):
        conditions.append(AuditLog.action == event_type)
    
    if severity and hasattr(AuditLog, 'severity'):
        conditions.append(AuditLog.severity == severity)
    
    # Get total count
    total_query = select(func.count(AuditLog.id)).where(and_(*conditions)) #type: ignore
    total = db.exec(total_query).first() or 0
    
    # Get paginated results
    offset = (page - 1) * limit
    query = select(AuditLog).where(and_(*conditions))
    query = query.order_by(desc(AuditLog.created_at)).offset(offset).limit(limit)
    logs = list(db.exec(query).all())
    
    return {
        "logs": [
            {
                "id": str(log.id),
                "event_type": getattr(log, 'event_type', log.action),
                "event_description": getattr(log, 'event_description', log.action),
                "user_id": str(log.user_id) if log.user_id else None,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "created_at": log.created_at.isoformat(),
                "severity": getattr(log, 'severity', 'info'),
                "details": getattr(log, 'details', {})
            }
            for log in logs
        ],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit if total > 0 else 0
        }
    }

@router.get("/summary")
async def get_security_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get security summary dashboard"""
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    # Get stats for last 24 hours
    from_time = datetime.now(timezone.utc) - timedelta(hours=24)
    
    # Count failed logins
    failed_login_conditions = [AuditLog.created_at >= from_time]
    if current_user.tenant_id:
        failed_login_conditions.append(AuditLog.tenant_id == current_user.tenant_id)
    
    # Check both new and old field structures
    if hasattr(AuditLog, 'event_type'):
        failed_login_conditions.append(AuditLog.event_type == "login_failed")
    else:
        failed_login_conditions.append(AuditLog.action == "LOGIN_FAILED")
    
    failed_logins = db.exec(
        select(func.count(AuditLog.id)).where(and_(*failed_login_conditions)) #type: ignore
    ).first() or 0
    
    # Count locked accounts
    locked_accounts = db.exec(
        select(func.count(AccountLockout.id)).where( #type: ignore
            and_(
                AccountLockout.is_active == True,
                AccountLockout.locked_until > datetime.now(timezone.utc)
            )
        )
    ).first() or 0
    
    # Count active sessions
    active_sessions = db.exec(
        select(func.count(UserSession.id)).where( #type: ignore
            and_(
                UserSession.is_active == True,
                UserSession.expires_at > datetime.now(timezone.utc)
            )
        )
    ).first() or 0
    
    # Count rate limit violations
    rate_limit_conditions = [AuditLog.created_at >= from_time]
    if current_user.tenant_id:
        rate_limit_conditions.append(AuditLog.tenant_id == current_user.tenant_id)
    
    if hasattr(AuditLog, 'event_type'):
        rate_limit_conditions.append(AuditLog.event_type == "rate_limit_exceeded")
    else:
        rate_limit_conditions.append(AuditLog.action == "RATE_LIMIT_EXCEEDED")
    
    rate_limits = db.exec(
        select(func.count(AuditLog.id)).where(and_(*rate_limit_conditions)) #type: ignore
    ).first() or 0
    
    return {
        "summary": {
            "failed_logins_24h": failed_logins,
            "locked_accounts": locked_accounts,
            "active_sessions": active_sessions,
            "rate_limit_violations_24h": rate_limits
        },
        "status": "healthy" if failed_logins < 10 else "warning"
    }

@router.post("/unlock-account")
async def unlock_account(
    request: AccountUnlockRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unlock a user account (manager only)"""
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    lockout_service = AccountLockoutService(db)
    success = await lockout_service.unlock_account(request.email, str(current_user.id))
    
    # Log the unlock action
    audit_service = AuditService(db)
    await audit_service.log_event(
        AuditEvent.ACCOUNT_UNLOCKED,
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        details={
            "unlocked_email": request.email,
            "unlocked_by": current_user.email,
            "success": success
        }
    )
    
    if success:
        return AccountUnlockResponse(message=f"Account {request.email} has been unlocked")
    else:
        return AccountUnlockResponse(
            message=f"Account {request.email} was not locked or doesn't exist",
            success=False
        )

@router.get("/active-sessions", response_model=SessionListResponse)
async def get_active_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get active sessions for current user"""
    session_service = SessionService(db)
    sessions = await session_service.get_user_sessions(current_user.id, active_only=True)
    
    # ✅ FIX: Create proper SessionInfo objects instead of dictionaries
    session_info_list = [
        SessionInfo(
            id=session.id,
            created_at=session.created_at,
            last_used=session.last_used,
            ip_address=session.ip_address,
            user_agent=session.user_agent,
            expires_at=session.expires_at,
            is_current=False  # Could enhance this by checking current token
        )
        for session in sessions
    ]
    
    return SessionListResponse(
        sessions=session_info_list,
        total_count=len(sessions)
    )

@router.post("/revoke-session/{session_id}")
async def revoke_user_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke a specific session"""
    session_service = SessionService(db)
    
    # Get the session to verify ownership
    session = db.get(UserSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Only allow users to revoke their own sessions, or managers to revoke any
    if session.user_id != current_user.id and not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Cannot revoke other user's session")
    
    # Revoke the session
    session.is_active = False
    session.revoked_at = datetime.now(timezone.utc)
    session.revocation_reason = "admin_revoked" if current_user.is_manager else "user_revoked"
    db.commit()
    
    # Log the revocation
    audit_service = AuditService(db)
    await audit_service.log_event(
        AuditEvent.SESSION_REVOKED,
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        details={
            "revoked_session_id": session_id,
            "revoked_for_user": str(session.user_id),
            "revoked_by": current_user.email
        }
    )
    
    return SessionRevokeResponse(
        message="Session revoked successfully",
        sessions_revoked=1
    )

@router.post("/revoke-all-sessions")
async def revoke_all_user_sessions(
    target_user_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke all sessions for current user or specified user (manager only)"""
    session_service = SessionService(db)
    
    # Determine target user
    if target_user_id and current_user.is_manager:
        # Manager revoking another user's sessions
        target_id = target_user_id
    else:
        # User revoking their own sessions
        target_id = str(current_user.id)
    
    # Revoke all sessions
    revoked_count = await session_service.revoke_all_user_sessions(target_id) #type: ignore
    
    # Log the revocation
    audit_service = AuditService(db)
    await audit_service.log_event(
        AuditEvent.ALL_SESSIONS_REVOKED,
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        details={
            "target_user_id": target_id,
            "revoked_by": current_user.email,
            "sessions_revoked": revoked_count
        }
    )
    
    return SessionRevokeResponse(
        message=f"Successfully revoked {revoked_count} sessions",
        sessions_revoked=revoked_count
    )

@router.get("/events/recent")
async def get_recent_security_events(
    hours: int = Query(24, ge=1, le=168),
    severity: Optional[str] = Query(None, regex="^(info|warning|error|critical)$"),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent security events"""
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    audit_service = AuditService(db)
    events = await audit_service.get_security_events(hours=hours, severity=severity)
    
    # Limit results
    events = events[:limit]
    
    return {
        "events": [
            {
                "id": str(event.id),
                "event_type": getattr(event, 'event_type', event.action),
                "description": getattr(event, 'event_description', event.action),
                "severity": getattr(event, 'severity', 'info'),
                "ip_address": event.ip_address,
                "user_agent": event.user_agent,
                "created_at": event.created_at.isoformat(),
                "details": getattr(event, 'details', {})
            }
            for event in events
        ],
        "total_events": len(events),
        "time_range_hours": hours
    }

@router.get("/settings")
async def get_security_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get security settings for current tenant"""
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    settings = db.exec(
        select(SecuritySettings).where(SecuritySettings.tenant_id == current_user.tenant_id)
    ).first()
    
    if not settings:
        # Return default settings
        return {
            "max_failed_attempts": 5,
            "lockout_duration_minutes": 30,
            "session_timeout_minutes": 480,
            "require_2fa": False,
            "audit_retention_days": 90
        }
    
    return {
        "max_failed_attempts": settings.max_failed_attempts,
        "lockout_duration_minutes": settings.lockout_duration_minutes,
        "session_timeout_minutes": settings.session_timeout_minutes,
        "require_2fa": settings.require_2fa,
        "audit_retention_days": settings.audit_retention_days
    }