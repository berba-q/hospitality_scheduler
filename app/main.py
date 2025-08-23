# app/main.py - Enhanced with comprehensive security features
from sqlalchemy import text
import uvicorn
import os
import logging
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter
from slowapi.errors import RateLimitExceeded
from redis import asyncio as redis_async

# Import your existing modules
from .core.config import get_settings
from .api.api_v1 import api_router
import app.logging_config  # Ensure logging is configured

#  Import security middleware and services
from .middleware.security_middleware import SecurityMiddleware
from .middleware.rate_limit_middleware import CustomRateLimitMiddleware
from .services.session_service import SessionService
from .services.audit_service import AuditService, AuditEvent
from .deps import get_db

settings = get_settings()
logger = logging.getLogger(__name__)

#  Application lifespan manager for proper startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager with security features"""
    # Startup
    logger.info("🚀 Starting Hospitality Scheduler API with enhanced security")
    
    # Initialize Redis for rate limiting
    try:
        redis = redis_async.from_url(
            os.getenv("REDIS_URL", "redis://redis:6379/0"), 
            encoding="utf8"
        )
        await FastAPILimiter.init(redis)
        logger.info("Redis rate limiting initialized")
    except Exception as e:
        logger.warning(f"⚠️ Redis not available, rate limiting may be limited: {e}")
    
    # Start background security tasks
    cleanup_task = asyncio.create_task(session_cleanup_task())
    logger.info(" Background security tasks started")
    
    #  Log application startup
    try:
        db = next(get_db())
        audit_service = AuditService(db)
        logger.info("✅ System startup completed successfully")
        db.close()
    except Exception as e:
        logger.warning(f"Could not log startup event: {e}")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down Hospitality Scheduler API")
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        logger.info("✅ Background tasks cancelled")

# Background task for session cleanup
async def session_cleanup_task():
    """Periodic task to clean up expired sessions"""
    while True:
        try:
            db = next(get_db())
            session_service = SessionService(db)
            cleaned = await session_service.cleanup_expired_sessions()
            if cleaned > 0:
                logger.info(f"🧹 Cleaned up {cleaned} expired sessions")
            db.close()
        except Exception as e:
            logger.error(f"Session cleanup failed: {e}")
        
        # Run every hour
        await asyncio.sleep(3600)

# Create FastAPI app with lifespan
app = FastAPI(
    title="Hospitality Scheduler API",
    description="Enhanced API with comprehensive security features",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc" 
)

# CORS middleware with better security
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else "",
        # Add production domains here
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type", 
        "X-Requested-With",
        "Accept",
        "Origin",
        "User-Agent",
        "DNT",
        "Cache-Control",
        "X-Mx-ReqToken",
    ],
    expose_headers=["X-Rate-Limit-Remaining", "X-Rate-Limit-Reset"]
)

#  Add security middleware
app.add_middleware(SecurityMiddleware)
app.add_middleware(CustomRateLimitMiddleware)

#  Enhanced exception handlers
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Handle rate limit exceptions with audit logging"""
    logger.warning(f"Rate limit exceeded for IP: {request.client.host if request.client else 'unknown'}")
    
    # Log to audit system
    try:
        db = next(get_db())
        audit_service = AuditService(db)
        await audit_service.log_event(
            AuditEvent.RATE_LIMIT_EXCEEDED,
            ip_address=request.client.host if request.client else "unknown",
            user_agent=request.headers.get("user-agent", ""),
            details={
                "endpoint": str(request.url.path),
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
            "retry_after": 300,
            "type": "rate_limit_exceeded"
        },
        headers={
            "Retry-After": "300",
            "X-Rate-Limit-Reset": str(int(datetime.now(timezone.utc).timestamp()) + 300)
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Enhanced HTTP exception handler with security logging"""
    
    # Log security-related HTTP errors
    if exc.status_code in [401, 403, 423]:  # Unauthorized, Forbidden, Locked
        try:
            db = next(get_db())
            audit_service = AuditService(db)
            
            event_type = AuditEvent.SUSPICIOUS_ACTIVITY
            if exc.status_code == 401:
                event_type = AuditEvent.UNAUTHORIZED_ACCESS
            elif exc.status_code == 423:
                event_type = AuditEvent.ACCOUNT_LOCKED
            
            await audit_service.log_event(
                event_type,
                ip_address=request.client.host if request.client else "unknown",
                user_agent=request.headers.get("user-agent", ""),
                details={
                    "endpoint": str(request.url.path),
                    "method": request.method,
                    "status_code": exc.status_code,
                    "error": exc.detail
                },
                severity="warning" if exc.status_code in [401, 403] else "error"
            )
            db.close()
        except Exception as e:
            logger.error(f"Failed to log HTTP exception: {e}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "type": "http_exception"}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler with security logging"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    # Log unexpected errors as suspicious activity
    try:
        db = next(get_db())
        audit_service = AuditService(db)
        await audit_service.log_event(
            AuditEvent.SYSTEM_ERROR,
            ip_address=request.client.host if request.client else "unknown",
            user_agent=request.headers.get("user-agent", ""),
            details={
                "endpoint": str(request.url.path),
                "method": request.method,
                "error_type": type(exc).__name__,
                "error_message": str(exc)
            },
            severity="error"
        )
        db.close()
    except Exception as e:
        logger.error(f"Failed to log global exception: {e}")
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": "internal_error"}
    )

#  Health check endpoint with security status
@app.get("/health")
async def health_check():
    """Enhanced health check with better error handling"""
    try:
        # ✅ FIX: Simple database connectivity test without audit logging
        db = next(get_db())
        try:
            # Simple query that won't trigger complex operations
            result = db.exec(text("SELECT 1 as test")).first()
            db_status = "healthy" if result else "unhealthy"
        except Exception as db_error:
            logger.warning(f"Database health check failed: {db_error}")
            db_status = "unhealthy"
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        db_status = "unhealthy"
    
    # Check Redis connectivity
    try:
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
        redis = redis_async.from_url(redis_url)
        await redis.ping()
        redis_status = "healthy"
        await redis.close()
    except Exception as e:
        logger.warning(f"Redis health check failed: {e}")
        redis_status = "unhealthy"
    
    # Overall status
    overall_status = "healthy" if db_status == "healthy" and redis_status == "healthy" else "degraded"
    
    return {
        "status": overall_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "2.0.0",
        "services": {
            "database": db_status,
            "redis": redis_status
        },
        "features": [
            "account_lockout",
            "audit_logging", 
            "session_management",
            "rate_limiting",
            "enhanced_security"
        ]
    }

#  Security status endpoint for monitoring
@app.get("/security/status")
async def security_status(request: Request):
    """Get security status for monitoring"""
    try:
        db = next(get_db())
        audit_service = AuditService(db)
        
        # Get recent security events
        recent_events = await audit_service.get_security_events(hours=24)
        
        status = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "security_events_24h": len(recent_events),
            "high_severity_events": len([e for e in recent_events if hasattr(e, 'severity') and e.severity in ["error", "critical"]]),
            "rate_limit_violations": len([e for e in recent_events if hasattr(e, 'event_type') and e.event_type == "rate_limit_exceeded"]),
            "failed_logins": len([e for e in recent_events if hasattr(e, 'event_type') and e.event_type == "login_failed"]),
            "status": "monitoring"
        }
        
        db.close()
        return status
        
    except Exception as e:
        logger.error(f"Security status check failed: {e}")
        return {
            "status": "error", 
            "message": "Security monitoring unavailable",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

#  Add security admin endpoints
from .api.endpoints.security_admin import router as security_router
app.include_router(security_router, prefix="/v1/security", tags=["security"])

# Include your existing API router
app.include_router(api_router, prefix="/v1")

#  Add root endpoint with API info
@app.get("/")
async def root():
    """API root with information"""
    return {
        "name": "Hospitality Scheduler API",
        "version": "2.0.0",
        "description": "Enhanced hospitality management API with enterprise security",
        "features": [
            "Multi-tenant architecture",
            "Staff scheduling",
            "Shift management", 
            "Account lockout protection",
            "Comprehensive audit logging",
            "Session management",
            "Rate limiting",
            "Real-time notifications"
        ],
        "docs": "/docs" if settings.DEBUG else None,
        "status": "operational"
    }

# Development server configuration
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info",
        access_log=True,
        workers=1 if settings.DEBUG else 4
    )