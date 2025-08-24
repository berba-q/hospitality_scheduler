from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from starlette.responses import Response
import time
from collections import defaultdict, deque
from typing import Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class CustomRateLimitMiddleware(BaseHTTPMiddleware):
    """Custom rate limiting middleware with different limits per endpoint"""
    
    EXEMPT_METHODS = {"OPTIONS"}
    EXEMPT_PATH_PREFIXES = {"/docs", "/static", "/health", "/ping", "/v1/notifications", "/v1/notifications/stream"}
    DEFAULT_RETRY_AFTER = 10  # seconds
    CORS_ALLOWED_ORIGINS = {"http://localhost:3000", "http://127.0.0.1:3000"}

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
            "/v1/notifications:GET": (300, 60),  # 300 req/min for dev polling; exempted anyway by prefix check
            "default": (500, 3600)              # 500 requests per hour for other endpoints
        }
        self.retry_after = getattr(self, "retry_after", self.DEFAULT_RETRY_AFTER)
    
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
        # Never rate-limit preflight and exempt certain paths (health, docs, notifications)
        path = request.url.path
        method = request.method
        if method in self.EXEMPT_METHODS or any(path.startswith(p) for p in self.EXEMPT_PATH_PREFIXES):
            return await call_next(request)

        client_ip = self._get_client_ip(request)
        endpoint = request.url.path
        # Prefer user/session identity when present; fall back to IP. Include endpoint+method to avoid cross-endpoint contention.
        user_id = getattr(getattr(request, "state", None), "user_id", None)
        rate_key_identity = str(user_id) if user_id else client_ip
        rate_bucket_key = f"{endpoint}:{method}"

        # Check rate limit
        if self._is_rate_limited(rate_key_identity, rate_bucket_key):
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
            
            resp = JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests. Please slow down and try again later.",
                    "retry_after": self.retry_after,
                    "type": "rate_limit_exceeded",
                    "endpoint": endpoint
                },
            )
            resp.headers["Retry-After"] = str(self.retry_after)
            limit_for_bucket = self._get_limit_for_endpoint(endpoint, method)[0]
            resp.headers["X-RateLimit-Limit"] = str(limit_for_bucket)
            resp.headers["X-RateLimit-Remaining"] = "0"
            self._apply_cors_headers(resp, request)
            return resp
        
        # Continue with request
        response = await call_next(request)
        
        limit, window = self._get_limit_for_endpoint(endpoint, method)
        remaining = self._get_remaining_requests(rate_key_identity, rate_bucket_key, method)

        response.headers["X-Rate-Limit-Limit"] = str(limit)
        response.headers["X-Rate-Limit-Remaining"] = str(remaining)
        response.headers["X-Rate-Limit-Window"] = str(window)
        
        return response
    
    def _is_rate_limited(self, identity: str, bucket_key: str) -> bool:
        """Check if request should be rate limited"""
        limit, window = self._get_limit_for_bucket(bucket_key)
        now = time.time()

        requests_for_endpoint = self.requests[identity][bucket_key]
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
    
    def _get_limit_for_endpoint(self, endpoint: str, method: Optional[str] = None) -> tuple:
        """Get rate limit for specific endpoint/method"""
        if method is not None:
            key = f"{endpoint}:{method}"
            if key in self.limits:
                return self.limits[key]
        return self.limits.get(endpoint, self.limits["default"])
    
    def _get_limit_for_bucket(self, bucket_key: str) -> tuple:
        return self.limits.get(bucket_key, self.limits.get(bucket_key.split(":" )[0], self.limits["default"]))

    def _get_remaining_requests(self, identity: str, bucket_key: str, method: Optional[str] = None) -> int:
        """Get remaining requests for client/endpoint/method"""
        limit, _ = self._get_limit_for_bucket(bucket_key)
        current_count = len(self.requests[identity][bucket_key])
        return max(0, limit - current_count)

    def _apply_cors_headers(self, response: Response, request: Request) -> None:
        origin = request.headers.get("origin")
        if not origin:
            return
        if "*" in self.CORS_ALLOWED_ORIGINS or origin in self.CORS_ALLOWED_ORIGINS:
            if not response.headers.get("Access-Control-Allow-Origin"):
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Vary"] = "Origin"
                response.headers["Access-Control-Allow-Credentials"] = "true"
                allow_headers = request.headers.get("access-control-request-headers") or "*"
                response.headers.setdefault("Access-Control-Allow-Headers", allow_headers)
                response.headers.setdefault("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")