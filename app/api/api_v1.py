from fastapi import APIRouter
from .endpoints import auth, facility, staff, import_staff,schedule

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(facility.router)
api_router.include_router(staff.router)
api_router.include_router(import_staff.router)
api_router.include_router(schedule.router, prefix="/schedule", tags=["Schedule"])
