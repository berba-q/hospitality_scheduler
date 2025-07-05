import uvicorn
from fastapi import FastAPI
from .core.config import get_settings
from .api.api_v1 import api_router

settings = get_settings()

app = FastAPI(title="Scheduler MVP")
app.include_router(api_router, prefix=settings.API_V1_STR)