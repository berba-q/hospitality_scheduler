from fastapi import Request, Response, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from sqlmodel import Session
from datetime import datetime, timezone
import logging
import uuid
import time

from ..deps import get_db
from ..services.session_service import SessionService
from ..services.audit_service import AuditService, AuditEvent
from ..core.security import decode_access_token

logger = logging.getLogger(__name__)

class SecurityMiddleware(BaseHTTPMiddleware):
    """Enhanced security middleware for session validation and audit logging"""
    
    def __init__(self, app):
        super().__init__(app)
        self.security = HTTPBearer(auto_error=False)
        
        # Paths that don't require session validation
        self.excluded_paths = {
            "/v1/auth/login",
            "/v1/auth/signup", 
            "/v1/auth/forgot-password",
            "/v1/auth/reset-password",
            "/v1/auth/verify-reset-token",
            "/v1/invitations/accept",
            "/docs",
            "/redoc", 
            "/openapi.json",
            "/health",           # Health checks
            "/metrics",          # Monitoring
            "/favicon.ico",      # Browser requests
            "/robots.txt",       # SEO crawlers
            "/sitemap.xml",      # SEO crawlers
            "/.well-known/",     # Various discovery protocols
        }
        
        self.monitoring_paths = {
            "/health",
            "/metrics", 
            "/status",
            "/ping",
            "/healthz"
        }
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Generate request ID for tracing
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Get client info
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")
        
        # ✅ FIX: Skip middleware completely for excluded paths
        if (request.url.path in self.excluded_paths or 
            request.url.path.startswith("/static") or 
            any(request.url.path.startswith(path) for path in self.monitoring_paths)):
            response = await call_next(request)
            return response
        
        # ✅ FIX: Skip audit logging for monitoring tools
        is_monitoring_request = self._is_monitoring_request(user_agent, request.url.path)
        
        # Get database session
        db = next(get_db())
        audit_service = AuditService(db)
        session_service = SessionService(db)
        
        # Initialize user_id to avoid unbound variable error
        user_id = None
        try:
            # Validate session for protected routes
            if request.url.path.startswith("/v1/") and request.method != "OPTIONS":
                user_id = await self._validate_session(request, session_service, audit_service, is_monitoring_request)
                request.state.user_id = user_id
            
            # Process request
            response = await call_next(request)
            
            # Log successful request (only for authenticated endpoints, not monitoring)
            if user_id and response.status_code < 400 and not is_monitoring_request:
                await self._log_request_success(
                    audit_service, user_id, request, response, 
                    client_ip, user_agent, request_id, start_time
                )
            
            return response
            
        except HTTPException as e:
            # ✅ FIX: Only log suspicious activity for actual users, not monitoring tools
            if not is_monitoring_request:
                await audit_service.log_event(
                    AuditEvent.SUSPICIOUS_ACTIVITY if e.status_code == 401 else AuditEvent.LOGIN_FAILED,
                    user_id=user_id,
                    ip_address=client_ip,
                    user_agent=user_agent,
                    request_id=request_id,
                    details={
                        "path": request.url.path,
                        "method": request.method,
                        "status_code": e.status_code,
                        "error": e.detail
                    },
                    severity="warning" if e.status_code == 401 else "error"
                )
            else:
                # Just log to application logger for monitoring tools
                logger.debug(f"Monitoring tool access: {client_ip} -> {request.url.path}")
            
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail}
            )
            
        except Exception as e:
            # ✅ FIX: Don't spam audit logs for monitoring tool errors
            if not is_monitoring_request:
                await audit_service.log_event(
                    AuditEvent.SUSPICIOUS_ACTIVITY,
                    user_id=user_id,
                    ip_address=client_ip,
                    user_agent=user_agent,
                    request_id=request_id,
                    details={
                        "path": request.url.path,
                        "method": request.method,
                        "error": str(e)
                    },
                    severity="error"
                )
            
            logger.error(f"Unexpected error in security middleware: {e}")
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"}
            )
        finally:
            db.close()
            
    def _is_monitoring_request(self, user_agent: str, path: str) -> bool:
        """Detect if this is a monitoring/health check request"""
        monitoring_user_agents = [
            "curl",
            "wget", 
            "python-requests",
            "health-check",
            "monitoring",
            "probe",
            "pingdom",
            "uptimerobot",
            "kube-probe",
            "docker"
        ]
        
        monitoring_paths = [
            "/health",
            "/metrics",
            "/status", 
            "/ping"
        ]
        
        user_agent_lower = user_agent.lower()
        is_monitoring_ua = any(ua in user_agent_lower for ua in monitoring_user_agents)
        is_monitoring_path = any(path.startswith(mp) for mp in monitoring_paths)
        
        return is_monitoring_ua or is_monitoring_path
    
    async def _validate_session(
        self, 
        request: Request, 
        session_service: SessionService,
        audit_service: AuditService,
        is_monitoring_request: bool = False
    ) -> uuid.UUID:
        """Validate session and return user ID"""
        
        # Extract bearer token
        authorization = request.headers.get("authorization", "")
        if not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid authorization header"
            )
        
        token = authorization.replace("Bearer ", "")
        
        # Decode JWT to get user info
        try:
            payload = decode_access_token(token)
            user_id = uuid.UUID(payload.get("sub"))
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Validate session in database
        session = await session_service.validate_session(token)
        if not session:
            # ✅ FIX: Only log for non-monitoring requests
            if not is_monitoring_request:
                await audit_service.log_event(
                    AuditEvent.SUSPICIOUS_ACTIVITY,
                    user_id=user_id,
                    ip_address=self._get_client_ip(request),
                    user_agent=request.headers.get("user-agent", ""),
                    request_id=request.state.request_id,
                    details={
                        "reason": "invalid_session",
                        "path": request.url.path
                    },
                    severity="warning"
                )
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired or invalid"
            )
        
        return user_id
    
    async def _log_request_success(
        self,
        audit_service: AuditService,
        user_id: uuid.UUID,
        request: Request,
        response: Response,
        client_ip: str,
        user_agent: str,
        request_id: str,
        start_time: float
    ):
        """Log successful authenticated request"""
        
        # Only log sensitive operations, not every API call
        sensitive_paths = [
            "/v1/staff",
            "/v1/schedules", 
            "/v1/facilities",
            "/v1/admin",
            "/v1/reports"
        ]
        
        if any(request.url.path.startswith(path) for path in sensitive_paths):
            processing_time = time.time() - start_time
            
            await audit_service.log_event(
                AuditEvent.SENSITIVE_DATA_ACCESSED,
                user_id=user_id,
                ip_address=client_ip,
                user_agent=user_agent,
                request_id=request_id,
                resource_type=request.url.path.split("/")[2] if len(request.url.path.split("/")) > 2 else None,
                details={
                    "path": request.url.path,
                    "method": request.method,
                    "status_code": response.status_code,
                    "processing_time_ms": round(processing_time * 1000, 2)
                }
            )
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address, handling proxies"""
        # Check for common proxy headers
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"