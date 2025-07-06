from fastapi import APIRouter
from .endpoints import auth, facility, staff, import_staff,schedule,schedule_config, availability

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(facility.router)
api_router.include_router(staff.router)
api_router.include_router(import_staff.router)
api_router.include_router(availability.router)
api_router.include_router(schedule.router, prefix="/schedule", tags=["Schedule"])
api_router.include_router(schedule_config.router, prefix="/schedule-config", tags=["Schedule Config"])
