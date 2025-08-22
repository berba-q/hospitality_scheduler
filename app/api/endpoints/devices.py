"""
Device Management API Endpoints

Provides endpoints for device registration, push token management, and re-authorization workflow.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlmodel import Session
from typing import List
import uuid

from ...deps import get_db, get_current_user
from ...models import DeviceStatus, User, UserDevice
from ...schemas import (
    RegisterDeviceRequest, RegisterDeviceResponse, UpdateTokenRequest,
    PushStatsResponse, DeviceReauth, UserDeviceRead, PushNotificationTestRequest,
    PushNotificationTestResponse, DeviceCleanupRequest, DeviceCleanupResponse,
    PushTokenValidationRequest, PushTokenValidationResponse, DeviceStatusUpdate
)
from ...services.push_token_manager import PushTokenManager
from ...services.firebase_service import FirebaseService

router = APIRouter(prefix="/devices", tags=["device-management"])

# ==================== DEVICE REGISTRATION ====================

@router.post("/register", response_model=RegisterDeviceResponse)
def register_device(
    device_request: RegisterDeviceRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Register a new device or update existing device for push notifications"""
    
    # Get client IP
    client_ip = request.client.host if request.client else None
    if not client_ip and request.headers.get("x-forwarded-for"):
        client_ip = request.headers.get("x-forwarded-for").split(",")[0].strip() # type: ignore
    
    push_manager = PushTokenManager(db)
    return push_manager.register_device(
        user_id=str(current_user.id),
        device_request=device_request,
        ip_address=client_ip
    )

@router.get("/", response_model=List[UserDeviceRead])
def get_my_devices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all devices for the current user"""
    
    push_manager = PushTokenManager(db)
    devices = push_manager.get_user_devices(str(current_user.id))
    
    return [
        UserDeviceRead(
            id=device.id,
            user_id=device.user_id,
            device_name=device.device_name,
            device_type=device.device_type,
            platform=device.platform,
            push_failures=device.push_failures,
            last_push_failure=device.last_push_failure,
            last_push_success=device.last_push_success,
            status=device.status,
            needs_permission_prompt=device.needs_permission_prompt,
            permission_denied_at=device.permission_denied_at,
            ip_address=device.ip_address,
            is_active=device.is_active,
            last_seen=device.last_seen,
            created_at=device.created_at,
            updated_at=device.updated_at,
            has_push_token=bool(device.push_token)
        )
        for device in devices
    ]

# ==================== PUSH NOTIFICATION STATS ====================

@router.get("/push-stats", response_model=PushStatsResponse)
def get_push_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get push notification statistics for the current user"""
    
    push_manager = PushTokenManager(db)
    return push_manager.get_push_stats(str(current_user.id))

@router.get("/needing-reauth", response_model=List[DeviceReauth])
def get_devices_needing_reauth(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get devices that need re-authorization"""
    
    push_manager = PushTokenManager(db)
    return push_manager.get_devices_needing_reauth(str(current_user.id))

# ==================== TOKEN RE-AUTHORIZATION ====================

@router.post("/reauth")
def update_token_after_reauth(
    request: UpdateTokenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Handle token update after user re-authorization"""
    
    # Verify device belongs to current user
    device = db.get(UserDevice, request.device_id)
    if not device or device.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Device not found")
    
    push_manager = PushTokenManager(db)
    result = push_manager.handle_token_reauthorization(request)
    
    return result

# ==================== PUSH TOKEN VALIDATION ====================

@router.post("/validate-tokens", response_model=PushTokenValidationResponse)
async def validate_push_tokens(
    request: PushTokenValidationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Validate push tokens for the current user"""
    
    push_manager = PushTokenManager(db)
    return await push_manager.validate_push_tokens(
        user_id=str(current_user.id),
        send_test=request.test_notification
    )

# ==================== TEST NOTIFICATIONS ====================

@router.post("/test-push", response_model=PushNotificationTestResponse)
async def send_test_push_notification(
    request: PushNotificationTestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send test push notification to all user devices"""
    
    push_manager = PushTokenManager(db)
    firebase_service = FirebaseService()
    
    # Get valid tokens
    tokens = push_manager.get_valid_push_tokens(str(current_user.id))
    
    if not tokens:
        return PushNotificationTestResponse(
            success=False,
            message="No valid push tokens found. Please enable notifications.",
            tokens_attempted=0,
            successful_deliveries=0,
            failed_deliveries=0
        )
    
    if not firebase_service.is_available():
        return PushNotificationTestResponse(
            success=False,
            message="Push notification service is not available",
            tokens_attempted=0,
            successful_deliveries=0,
            failed_deliveries=0
        )
    
    # Send multicast notification
    try:
        success_count, failure_count = await firebase_service.send_push_multicast(
            tokens=tokens,
            title=request.title,
            body=request.message,
            data={
                "test": "true",
                "user_id": str(current_user.id)
            },
            analytics_label="test_notification"
        )
        
        return PushNotificationTestResponse(
            success=success_count > 0,
            message=f"Test notification sent to {success_count} devices",
            tokens_attempted=len(tokens),
            successful_deliveries=success_count,
            failed_deliveries=failure_count
        )
        
    except Exception as e:
        return PushNotificationTestResponse(
            success=False,
            message=f"Failed to send test notification: {str(e)}",
            tokens_attempted=len(tokens),
            successful_deliveries=0,
            failed_deliveries=len(tokens)
        )

# ==================== DEVICE STATUS MANAGEMENT ====================

@router.patch("/{device_id}/status")
def update_device_status(
    device_id: uuid.UUID,
    status_update: DeviceStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update device status (enable/disable, mark for re-auth, etc.)"""
    
    device = db.get(UserDevice, device_id)
    if not device or device.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Device not found")
    
    device.status = status_update.status
    device.updated_at = datetime.now(timezone.utc)
    
    # Handle status-specific logic
    if status_update.status == DeviceStatus.PERMISSION_DENIED:
        device.permission_denied_at = datetime.now(timezone.utc)
        device.push_token = None
    elif status_update.status == DeviceStatus.REMOVED:
        device.is_active = False
    elif status_update.status == DeviceStatus.NEEDS_REAUTH:
        device.needs_permission_prompt = True
    
    db.add(device)
    db.commit()
    
    return {"success": True, "message": f"Device status updated to {status_update.status.value}"}

@router.delete("/{device_id}")
def remove_device(
    device_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove/deactivate a device"""
    
    device = db.get(UserDevice, device_id)
    if not device or device.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Device not found")
    
    device.is_active = False
    device.status = DeviceStatus.REMOVED
    device.push_token = None
    device.updated_at = datetime.now(timezone.utc)
    
    db.add(device)
    db.commit()
    
    return {"success": True, "message": "Device removed successfully"}

# ==================== CLEANUP OPERATIONS ====================

@router.post("/cleanup", response_model=DeviceCleanupResponse)
def cleanup_old_devices(
    cleanup_request: DeviceCleanupRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clean up old or inactive devices for the current user"""
    
    def perform_cleanup():
        push_manager = PushTokenManager(db)
        
        # Get user's devices before cleanup
        devices_before = len(push_manager.get_user_devices(str(current_user.id), active_only=False))
        
        # Perform cleanup
        result = push_manager.cleanup_old_devices(cleanup_request.days_inactive)
        
        # Get devices after cleanup
        devices_after = len(push_manager.get_user_devices(str(current_user.id), active_only=True))
        
        return {
            "devices_removed": result["devices_removed"],
            "devices_remaining": devices_after
        }
    
    # Run cleanup in background
    background_tasks.add_task(perform_cleanup)
    
    return DeviceCleanupResponse(
        success=True,
        message="Device cleanup initiated",
        devices_removed=0,  # Will be updated by background task
        devices_updated=0
    )

# ==================== DEVICE INSIGHTS ====================

@router.get("/{device_id}/insights")
def get_device_insights(
    device_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed insights for a specific device"""
    
    device = db.get(UserDevice, device_id)
    if not device or device.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Calculate insights
    days_since_last_success = None
    if device.last_push_success:
        days_since_last_success = (datetime.now(timezone.utc) - device.last_push_success).days
    
    days_since_registration = (datetime.now(timezone.utc) - device.created_at).days
    
    return {
        "device_id": str(device.id),
        "device_name": device.device_name,
        "status": device.status.value,
        "push_failures": device.push_failures,
        "days_since_registration": days_since_registration,
        "days_since_last_success": days_since_last_success,
        "needs_attention": device.status == DeviceStatus.NEEDS_REAUTH or device.push_failures >= 2,
        "recommendations": _generate_device_recommendations(device)
    }

def _generate_device_recommendations(device: UserDevice) -> List[str]:
    """Generate recommendations for device improvement"""
    recommendations = []
    
    if device.status == DeviceStatus.NEEDS_REAUTH:
        recommendations.append("Re-enable push notifications to receive alerts")
    
    if device.push_failures >= 2:
        recommendations.append("High failure rate detected - consider refreshing notifications")
    
    if not device.push_token:
        recommendations.append("No push token found - enable notifications for this device")
    
    if device.last_push_success and (datetime.now(timezone.utc) - device.last_push_success).days > 30:
        recommendations.append("Haven't received notifications recently - check notification settings")
    
    return recommendations