from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import time
from collections import defaultdict, deque
from typing import Dict, Tuple
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
            "/v1/auth/signup": (3, 300),        # 3 requests per 5 minutes  
            "/v1/auth/forgot-password": (3, 300), # 3 requests per 5 minutes
            "/v1/auth/reset-password": (5, 300), # 5 requests per 5 minutes
            "/v1/invitations/send": (20, 3600), # 20 requests per hour
            "default": (100, 3600)              # 100 requests per hour for other endpoints
        }
    
    async def dispatch(self, request: Request, call_next):
        client_ip = self._get_client_ip(request)
        endpoint = request.url.path
        
        # Skip rate limiting for certain paths
        if endpoint.startswith("/docs") or endpoint.startswith("/static") or endpoint == "/health":
            return await call_next(request)
        
        # Check rate limit
        if self._is_rate_limited(client_ip, endpoint):
            logger.warning(f"Rate limit exceeded for {client_ip} on {endpoint}")
            
            # Log to audit if we have the service available
            try:
                from ..services.audit_service import AuditService, AuditEvent
                from ..deps import get_db
                
                db = next(get_db())
                audit_service = AuditService(db)
                
                await audit_service.log_event(
                    AuditEvent.RATE_LIMIT_EXCEEDED,
                    ip_address=client_ip,
                    user_agent=request.headers.get("user-agent", ""),
                    details={
                        "endpoint": endpoint,
                        "method": request.method
                    },
                    severity="warning"
                )
                
                db.close()
            except Exception as e:
                logger.error(f"Failed to log rate limit event: {e}")
            
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests. Please slow down and try again later.",
                    "retry_after": 300  # Suggest retry after 5 minutes
                }
            )
        
        return await call_next(request)
    
    def _is_rate_limited(self, client_ip: str, endpoint: str) -> bool:
        """Check if request should be rate limited"""
        current_time = time.time()
        
        # Get rate limit for this endpoint
        max_requests, window_seconds = self.limits.get(endpoint, self.limits["default"])
        
        # Get request history for this IP and endpoint
        request_times = self.requests[client_ip][endpoint]
        
        # Remove old requests outside the window
        while request_times and request_times[0] < current_time - window_seconds:
            request_times.popleft()
        
        # Check if limit exceeded
        if len(request_times) >= max_requests:
            return True
        
        # Add current request
        request_times.append(current_time)
        
        return False
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address, handling proxies"""
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"