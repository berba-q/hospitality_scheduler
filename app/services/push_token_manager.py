# app/services/push_token_manager.py
"""
PushTokenManager - Smart device and push token management service

Handles device registration, token validation, failure tracking, and re-authorization workflow.
Tracks push failures per user/device and triggers re-auth prompts after 2 failures.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple
from sqlmodel import Session, select, and_, or_
from ..models import UserDevice, DeviceStatus, User
from ..schemas import (
    RegisterDeviceRequest, RegisterDeviceResponse, UpdateTokenRequest,
    PushStatsResponse, DeviceReauth, PushTokenValidationResponse
)
from .firebase_service import FirebaseService

logger = logging.getLogger(__name__)

class PushTokenManager:
    """Manages push tokens and device re-authorization workflow"""
    
    def __init__(self, db: Session):
        self.db = db
        self.firebase_service = FirebaseService()
        
    # ==================== DEVICE REGISTRATION ====================
    
    def register_device(
        self, 
        user_id: str, 
        device_request: RegisterDeviceRequest,
        ip_address: Optional[str] = None
    ) -> RegisterDeviceResponse:
        """Register a new device or update existing one"""
        try:
            # Try to find existing device by user_agent and platform
            existing_device = self._find_existing_device(
                user_id, device_request.user_agent, device_request.platform
            )
            
            if existing_device:
                # Update existing device
                device = self._update_existing_device(existing_device, device_request, ip_address)
                message = f"Device '{device.device_name}' updated successfully"
            else:
                # Create new device
                device = self._create_new_device(user_id, device_request, ip_address)
                message = f"Device '{device.device_name}' registered successfully"
            
            return RegisterDeviceResponse(
                success=True,
                message=message,
                device_id=str(device.id),
                has_push_token=bool(device.push_token)
            )
            
        except Exception as e:
            logger.error(f"Device registration failed for user {user_id}: {e}")
            return RegisterDeviceResponse(
                success=False,
                message=f"Device registration failed: {str(e)}",
                device_id="",
                has_push_token=False
            )
    
    def _find_existing_device(self, user_id: str, user_agent: str, platform: str) -> Optional[UserDevice]:
        """Find existing device by user_agent and platform"""
        return self.db.exec(
            select(UserDevice).where(
                and_(
                    UserDevice.user_id == user_id,
                    UserDevice.user_agent == user_agent,
                    UserDevice.platform == platform,
                    UserDevice.is_active == True
                )
            )
        ).first()
    
    def _create_new_device(
        self, 
        user_id: str, 
        device_request: RegisterDeviceRequest,
        ip_address: Optional[str]
    ) -> UserDevice:
        """Create a new device entry"""
        device = UserDevice(
            user_id=user_id,
            device_name=device_request.device_name,
            device_type=device_request.device_type,
            platform=device_request.platform,
            user_agent=device_request.user_agent,
            push_token=device_request.push_token,
            ip_address=ip_address,
            status=DeviceStatus.ACTIVE,
            is_active=True,
            last_seen=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc)
        )
        
        self.db.add(device)
        self.db.commit()
        self.db.refresh(device)
        
        logger.info(f"New device registered: {device.device_name} for user {user_id}")
        return device
    
    def _update_existing_device(
        self, 
        device: UserDevice, 
        device_request: RegisterDeviceRequest,
        ip_address: Optional[str]
    ) -> UserDevice:
        """Update existing device with new information"""
        # Update device info
        device.device_name = device_request.device_name
        device.push_token = device_request.push_token
        device.ip_address = ip_address
        device.last_seen = datetime.now(timezone.utc)
        device.updated_at = datetime.now(timezone.utc)
        
        # Reset failure count if new token provided
        if device_request.push_token and device.status == DeviceStatus.NEEDS_REAUTH:
            device.push_failures = 0
            device.status = DeviceStatus.ACTIVE
            device.needs_permission_prompt = False
            logger.info(f"Device {device.id} reauthorized successfully")
        
        self.db.add(device)
        self.db.commit()
        self.db.refresh(device)
        
        return device
    
    # ==================== TOKEN VALIDATION & FAILURE TRACKING ====================
    
    def record_push_failure(self, device_id: str, error_details: Optional[str] = None) -> bool:
        """Record a push notification failure and handle re-auth logic"""
        device = self.db.get(UserDevice, device_id)
        if not device:
            logger.warning(f"Device {device_id} not found for failure recording")
            return False
        
        # Increment failure count
        device.push_failures += 1
        device.last_push_failure = datetime.now(timezone.utc)
        
        # Check if device needs re-authorization (2 failures trigger re-auth)
        if device.push_failures >= 2:
            device.status = DeviceStatus.NEEDS_REAUTH
            device.needs_permission_prompt = True
            logger.warning(
                f"Device {device_id} marked for re-auth after {device.push_failures} failures"
            )
        
        self.db.add(device)
        self.db.commit()
        
        return device.push_failures >= 2  # Return True if re-auth needed
    
    def record_push_success(self, device_id: str) -> None:
        """Record a successful push notification"""
        device = self.db.get(UserDevice, device_id)
        if device:
            device.last_push_success = datetime.now(timezone.utc)
            # Reset failure count on success
            if device.push_failures > 0:
                device.push_failures = 0
                if device.status == DeviceStatus.NEEDS_REAUTH:
                    device.status = DeviceStatus.ACTIVE
                    device.needs_permission_prompt = False
            
            self.db.add(device)
            self.db.commit()
    
    def handle_token_reauthorization(self, request: UpdateTokenRequest) -> Dict[str, Any]:
        """Handle token update after user re-authorization"""
        device = self.db.get(UserDevice, request.device_id)
        if not device:
            return {"success": False, "message": "Device not found"}
        
        if request.success and request.new_token:
            # Successful re-authorization
            device.push_token = request.new_token
            device.push_failures = 0
            device.status = DeviceStatus.ACTIVE
            device.needs_permission_prompt = False
            device.updated_at = datetime.now(timezone.utc)
            message = "Device re-authorized successfully"
            logger.info(f"Device {device.id} re-authorized with new token")
            
        else:
            # Re-authorization failed or denied
            device.status = DeviceStatus.PERMISSION_DENIED
            device.permission_denied_at = datetime.now(timezone.utc)
            device.push_token = None
            message = "Push notifications disabled for this device"
            logger.info(f"Device {device.id} permission denied by user")
        
        self.db.add(device)
        self.db.commit()
        
        return {"success": True, "message": message}
    
    # ==================== DEVICE QUERIES & STATS ====================
    
    def get_user_devices(self, user_id: str, active_only: bool = True) -> List[UserDevice]:
        """Get all devices for a user"""
        query = select(UserDevice).where(UserDevice.user_id == user_id)
        if active_only:
            query = query.where(UserDevice.is_active == True)
        
        return list(self.db.exec(query).all())
    
    def get_valid_push_tokens(self, user_id: str) -> List[str]:
        """Get all valid push tokens for a user"""
        devices = self.db.exec(
            select(UserDevice).where(
                and_(
                    UserDevice.user_id == user_id,
                    UserDevice.is_active == True,
                    UserDevice.status == DeviceStatus.ACTIVE,
                    UserDevice.push_token!=None
                )
            )
        ).all()
        
        return [device.push_token for device in devices if device.push_token]
    
    def get_devices_needing_reauth(self, user_id: str) -> List[DeviceReauth]:
        """Get devices that need re-authorization"""
        devices = self.db.exec(
            select(UserDevice).where(
                and_(
                    UserDevice.user_id == user_id,
                    UserDevice.status == DeviceStatus.NEEDS_REAUTH,
                    UserDevice.is_active == True
                )
            )
        ).all()
        
        return [
            DeviceReauth(
                id=str(device.id),
                device_name=device.device_name,
                device_type=device.device_type,
                last_seen=device.last_seen,
                push_failures=device.push_failures,
                status=device.status.value
            )
            for device in devices
        ]
    
    def get_push_stats(self, user_id: str) -> PushStatsResponse:
        """Get comprehensive push notification statistics for user"""
        devices = self.get_user_devices(user_id, active_only=True)
        
        total_devices = len(devices)
        active_devices = len([d for d in devices if d.status == DeviceStatus.ACTIVE])
        devices_with_tokens = len([d for d in devices if d.push_token])
        devices_needing_reauth = len([d for d in devices if d.status == DeviceStatus.NEEDS_REAUTH])
        devices_permission_denied = len([d for d in devices if d.status == DeviceStatus.PERMISSION_DENIED])
        
        return PushStatsResponse(
            total_devices=total_devices,
            active_devices=active_devices,
            devices_with_valid_tokens=devices_with_tokens,
            devices_needing_reauth=devices_needing_reauth,
            devices_permission_denied=devices_permission_denied,
            push_enabled=devices_with_tokens > 0
        )
    
    # ==================== TOKEN VALIDATION ====================
    
    async def validate_push_tokens(self, user_id: str, send_test: bool = False) -> PushTokenValidationResponse:
        """Validate all push tokens for a user"""
        devices = self.get_user_devices(user_id)
        total_tokens = len([d for d in devices if d.push_token])
        valid_tokens = 0
        invalid_tokens = 0
        tokens_needing_refresh = 0
        recommendations = []
        
        for device in devices:
            if not device.push_token:
                continue
                
            try:
                if send_test:
                    # Send test notification to validate token
                    success = await self.firebase_service.send_push_notification(
                        token=device.push_token,
                        title="Token Validation",
                        body="Testing push notification delivery",
                        data={"test": "true"},
                        analytics_label="token_validation"
                    )
                    
                    if success:
                        valid_tokens += 1
                        self.record_push_success(str(device.id))
                    else:
                        invalid_tokens += 1
                        self.record_push_failure(str(device.id), "Token validation failed")
                else:
                    # Basic validation without sending
                    if device.push_failures >= 2:
                        tokens_needing_refresh += 1
                    elif device.last_push_success and device.last_push_success < datetime.now(timezone.utc) - timedelta(days=30):
                        tokens_needing_refresh += 1
                    else:
                        valid_tokens += 1
                        
            except Exception as e:
                logger.error(f"Token validation failed for device {device.id}: {e}")
                invalid_tokens += 1
        
        # Generate recommendations
        if invalid_tokens > 0:
            recommendations.append(f"{invalid_tokens} devices need re-authorization")
        if tokens_needing_refresh > 0:
            recommendations.append(f"{tokens_needing_refresh} tokens may need refreshing")
        if valid_tokens == 0 and total_tokens > 0:
            recommendations.append("No valid push tokens found. Re-enable notifications.")
        
        return PushTokenValidationResponse(
            total_tokens=total_tokens,
            valid_tokens=valid_tokens,
            invalid_tokens=invalid_tokens,
            tokens_needing_refresh=tokens_needing_refresh,
            recommendations=recommendations
        )
    
    # ==================== CLEANUP OPERATIONS ====================
    
    def cleanup_old_devices(self, days_inactive: int = 90) -> Dict[str, int]:
        """Clean up old inactive devices"""
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_inactive)
        
        # Find devices to remove
        old_devices = self.db.exec(
            select(UserDevice).where(
                or_(
                    UserDevice.last_seen < cutoff_date,
                    and_(
                        UserDevice.status == DeviceStatus.PERMISSION_DENIED,
                        UserDevice.permission_denied_at < cutoff_date
                    )
                )
            )
        ).all()
        
        devices_removed = 0
        for device in old_devices:
            device.is_active = False
            device.status = DeviceStatus.REMOVED
            self.db.add(device)
            devices_removed += 1
        
        self.db.commit()
        
        logger.info(f"Cleaned up {devices_removed} old devices")
        return {"devices_removed": devices_removed}