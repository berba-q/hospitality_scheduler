import uvicorn
from .core.config import get_settings
from .api.api_v1 import api_router
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter
from redis import asyncio as redis_async
import os
from fastapi.middleware.cors import CORSMiddleware

settings = get_settings()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js development server
        "http://127.0.0.1:3000",
        #"https://your-production-domain.com",  # Add production domain later
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

@app.on_event("startup")
async def startup():
    redis = redis_async.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))
    await FastAPILimiter.init(redis)

# Example: protect login route
from app.api.endpoints import auth
#app.include_router(auth.router, prefix="/v1/auth")  # per-endpoint limits inside the router
app.include_router(api_router, prefix="/v1")

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests, slow down."},
    )