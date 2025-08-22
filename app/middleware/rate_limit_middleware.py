from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import time
from collections import defaultdict, deque
from typing import Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class CustomRateLimitMiddleware(BaseHTTPMiddleware):
    """Custom rate limiting middleware with different limits per endpoint"""
    
    def __init__(self, app):
        super().__init__(app)
        
        # Track requests: IP -> endpoint -> deque of timestamps
        self.requests: Dict[str, Dict[str, deque]] = defaultdict(lambda: defaultdict(deque))
        
        # Rate limits: (requests_per_window, window_seconds)
        self.limits = {
            "/v1/auth/login": (10, 300),        # 10 requests per 5 minutes
            "/v1/auth/signup": (10, 300),        # 3 requests per 5 minutes  
            "/v1/auth/forgot-password": (3, 300), # 3 requests per 5 minutes
            "/v1/auth/reset-password": (5, 300), # 5 requests per 5 minutes
            "/v1/invitations/send": (20, 3600), # 20 requests per hour
            "/v1/notifications": (500, 3600),     # Increase notifications limit
            "default": (500, 3600)              # 500 requests per hour for other endpoints
        }
    
    def _extract_user_context(self, request: Request) -> Dict[str, Optional[str]]:
        """Extract user and tenant context from request"""
        context = {
            "user_id": None,
            "tenant_id": None,
            "authenticated": False
        }
        
        try:
            # Try to get from Authorization header
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                # You might want to decode the JWT token here to get user/tenant info
                # For now, we'll mark as authenticated
                context["authenticated"] = True
            
            # Try to get from request state (if set by auth middleware)
            if hasattr(request.state, "user_id"):
                context["user_id"] = str(request.state.user_id)
            if hasattr(request.state, "tenant_id"):
                context["tenant_id"] = str(request.state.tenant_id)
                
        except Exception as e:
            logger.debug(f"Could not extract user context: {e}")
        
        return context
    
    async def dispatch(self, request: Request, call_next):
        client_ip = self._get_client_ip(request)
        endpoint = request.url.path
        
        # Skip rate limiting for certain paths
        if endpoint.startswith("/docs") or endpoint.startswith("/static") or endpoint == "/health":
            return await call_next(request)
        
        # Check rate limit
        if self._is_rate_limited(client_ip, endpoint):
            logger.warning(f"Rate limit exceeded for {client_ip} on {endpoint}")
            
            # Extract context for audit logging
            user_context = self._extract_user_context(request)
            
            # Enhanced audit logging with fallback for missing context
            try:
                from ..services.audit_service import AuditService, AuditEvent
                from ..deps import get_db
                
                db = next(get_db())
                audit_service = AuditService(db)
                
                # Log with available context
                await audit_service.log_event(
                    AuditEvent.RATE_LIMIT_EXCEEDED,
                    user_id=user_context.get("user_id"),  # type: ignore
                    tenant_id=user_context.get("tenant_id"),  # type: ignore
                    ip_address=client_ip,
                    user_agent=request.headers.get("user-agent", ""),
                    details={
                        "endpoint": endpoint,
                        "method": request.method,
                        "authenticated": user_context.get("authenticated", False),
                        "context_available": bool(user_context.get("tenant_id"))
                    },
                    severity="warning"
                )
                
                db.close()
                
            except Exception as e:
                # Don't let audit failures break the rate limiting
                logger.error(f"Failed to log rate limit event: {e}")
                
                # Fall back to simple logging
                logger.warning(
                    f"Rate limit exceeded - IP: {client_ip}, "
                    f"Endpoint: {endpoint}, "
                    f"Auth: {user_context.get('authenticated', False)}"
                )
            
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests. Please slow down and try again later.",
                    "retry_after": 300,
                    "type": "rate_limit_exceeded",
                    "endpoint": endpoint
                },
                headers={
                    "Retry-After": "300",
                    "X-RateLimit-Limit": str(self._get_limit_for_endpoint(endpoint)[0]),
                    "X-RateLimit-Remaining": "0"
                }
            )
        
        # Continue with request
        response = await call_next(request)
        
        # Add rate limit headers to successful responses
        limit, window = self._get_limit_for_endpoint(endpoint)
        remaining = self._get_remaining_requests(client_ip, endpoint)
        
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Window"] = str(window)
        
        return response
    
    def _is_rate_limited(self, client_ip: str, endpoint: str) -> bool:
        """Check if request should be rate limited"""
        limit, window = self._get_limit_for_endpoint(endpoint)
        now = time.time()
        
        # Clean old requests
        requests_for_endpoint = self.requests[client_ip][endpoint]
        while requests_for_endpoint and requests_for_endpoint[0] < now - window:
            requests_for_endpoint.popleft()
        
        # Check if limit exceeded
        if len(requests_for_endpoint) >= limit:
            return True
        
        # Add current request
        requests_for_endpoint.append(now)
        return False
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP with proxy header support"""
        # Check for forwarded headers first
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fall back to client host
        return request.client.host if request.client else "unknown"
    
    def _get_limit_for_endpoint(self, endpoint: str) -> tuple:
        """Get rate limit for specific endpoint"""
        return self.limits.get(endpoint, self.limits["default"])
    
    def _get_remaining_requests(self, client_ip: str, endpoint: str) -> int:
        """Get remaining requests for client/endpoint"""
        limit, _ = self._get_limit_for_endpoint(endpoint)
        current_count = len(self.requests[client_ip][endpoint])
        return max(0, limit - current_count)