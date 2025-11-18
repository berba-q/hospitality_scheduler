from fastapi import APIRouter

from app.api.endpoints import devices
from .endpoints import auth, facility, staff, import_staff,schedule,schedule_config, availability, swap, notifications,settings, invitations, account_linking
from app.api.endpoints.quick_actions import router as quick_actions_router


api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(facility.router)
api_router.include_router(staff.router)
api_router.include_router(import_staff.router)
api_router.include_router(availability.router)
api_router.include_router(swap.router)
api_router.include_router(schedule.router, prefix="/schedule", tags=["Schedule"])
api_router.include_router(schedule_config.router, prefix="/schedule-config", tags=["Schedule Config"])
api_router.include_router(notifications.router)
api_router.include_router(quick_actions_router, tags=["quick-actions"])
api_router.include_router(settings.router)
api_router.include_router(invitations.router)
api_router.include_router(devices.router)
api_router.include_router(account_linking.router) 