# app/services/push_error_handler.py
"""
Enhanced error handling for push notification system

Provides comprehensive error handling, retry logic, and fallback mechanisms
for the push notification re-authorization workflow.
"""

import logging
from enum import Enum
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass
from sqlmodel import Session, and_, select
from ..models import UserDevice, DeviceStatus
from ..services.firebase_service import FirebaseService

logger = logging.getLogger(__name__)

class PushErrorType(Enum):
    """Types of push notification errors"""
    INVALID_TOKEN = "invalid_token"
    NETWORK_ERROR = "network_error"
    FIREBASE_ERROR = "firebase_error"
    RATE_LIMIT = "rate_limit"
    TOKEN_EXPIRED = "token_expired"
    DEVICE_UNREGISTERED = "device_unregistered"
    PAYLOAD_TOO_LARGE = "payload_too_large"
    UNKNOWN_ERROR = "unknown_error"

@dataclass
class PushError:
    """Push notification error details"""
    error_type: PushErrorType
    message: str
    device_id: Optional[str] = None
    timestamp: datetime = None
    retry_after: Optional[int] = None
    should_retry: bool = False
    should_reauth: bool = False
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now(timezone.utc)

class PushErrorHandler:
    """Handles push notification errors with smart retry and recovery logic"""
    
    def __init__(self, db: Session):
        self.db = db
        self.firebase_service = FirebaseService()
        
        # Error categorization rules
        self.error_patterns = {
            PushErrorType.INVALID_TOKEN: [
                "invalid-registration-token",
                "registration-token-not-registered",
                "invalid-token"
            ],
            PushErrorType.TOKEN_EXPIRED: [
                "token-expired",
                "registration-token-expired"
            ],
            PushErrorType.DEVICE_UNREGISTERED: [
                "unregistered",
                "device-unregistered"
            ],
            PushErrorType.NETWORK_ERROR: [
                "network-error",
                "connection-error",
                "timeout"
            ],
            PushErrorType.RATE_LIMIT: [
                "rate-limit",
                "quota-exceeded",
                "too-many-requests"
            ],
            PushErrorType.PAYLOAD_TOO_LARGE: [
                "payload-too-large",
                "message-too-big"
            ]
        }
    
    def categorize_error(self, error_message: str, response_code: Optional[int] = None) -> PushErrorType:
        """Categorize an error based on the message and response code"""
        
        error_lower = error_message.lower()
        
        # Check response codes first
        if response_code:
            if response_code == 400:
                return PushErrorType.INVALID_TOKEN
            elif response_code == 429:
                return PushErrorType.RATE_LIMIT
            elif response_code >= 500:
                return PushErrorType.FIREBASE_ERROR
        
        # Check error message patterns
        for error_type, patterns in self.error_patterns.items():
            if any(pattern in error_lower for pattern in patterns):
                return error_type
        
        return PushErrorType.UNKNOWN_ERROR
    
    def create_push_error(
        self, 
        error_message: str, 
        device_id: Optional[str] = None,
        response_code: Optional[int] = None,
        raw_response: Optional[Dict] = None
    ) -> PushError:
        """Create a structured error object from raw error data"""
        
        error_type = self.categorize_error(error_message, response_code)
        
        # Determine retry and reauth logic based on error type
        should_retry = error_type in [
            PushErrorType.NETWORK_ERROR,
            PushErrorType.FIREBASE_ERROR,
            PushErrorType.RATE_LIMIT
        ]
        
        should_reauth = error_type in [
            PushErrorType.INVALID_TOKEN,
            PushErrorType.TOKEN_EXPIRED,
            PushErrorType.DEVICE_UNREGISTERED
        ]
        
        # Determine retry delay
        retry_after = None
        if error_type == PushErrorType.RATE_LIMIT:
            retry_after = 300  # 5 minutes
        elif error_type == PushErrorType.NETWORK_ERROR:
            retry_after = 60   # 1 minute
        elif error_type == PushErrorType.FIREBASE_ERROR:
            retry_after = 120  # 2 minutes
        
        return PushError(
            error_type=error_type,
            message=error_message,
            device_id=device_id,
            should_retry=should_retry,
            should_reauth=should_reauth,
            retry_after=retry_after
        )
    
    async def handle_push_failure(
        self, 
        device_id: str, 
        error_message: str,
        response_code: Optional[int] = None,
        attempt_count: int = 1
    ) -> Dict[str, Any]:
        """Handle a push notification failure with appropriate recovery actions"""
        
        device = self.db.get(UserDevice, device_id)
        if not device:
            logger.error(f"Device {device_id} not found for error handling")
            return {"success": False, "message": "Device not found"}
        
        # Create structured error
        push_error = self.create_push_error(
            error_message=error_message,
            device_id=device_id,
            response_code=response_code
        )
        
        # Log the error
        logger.warning(
            f"Push notification failed for device {device_id}: {push_error.error_type.value} - {error_message}",
            extra={
                "device_id": device_id,
                "error_type": push_error.error_type.value,
                "attempt_count": attempt_count,
                "should_retry": push_error.should_retry,
                "should_reauth": push_error.should_reauth
            }
        )
        
        # Update device based on error type
        response = await self._update_device_for_error(device, push_error, attempt_count)
        
        # Record failure in device history
        await self._record_error_in_history(device, push_error)
        
        return response
    
    async def _update_device_for_error(
        self, 
        device: UserDevice, 
        error: PushError, 
        attempt_count: int
    ) -> Dict[str, Any]:
        """Update device status based on the error type and attempt count"""
        
        current_time = datetime.now(timezone.utc)
        
        # Increment failure count
        device.push_failures += 1
        device.last_push_failure = current_time
        
        response = {"success": True, "action_taken": None}
        
        if error.should_reauth:
            # Immediate re-auth needed for token-related errors
            device.status = DeviceStatus.NEEDS_REAUTH
            device.needs_permission_prompt = True
            device.push_token = None  # Clear invalid token
            response["action_taken"] = "device_marked_for_reauth"
            response["message"] = "Device marked for re-authorization due to invalid token"
            
        elif error.error_type == PushErrorType.RATE_LIMIT:
            # Handle rate limiting
            if error.retry_after:
                device.last_push_failure = current_time + timedelta(seconds=error.retry_after)
            response["action_taken"] = "rate_limit_backoff"
            response["retry_after"] = error.retry_after
            response["message"] = f"Rate limited, retry after {error.retry_after} seconds"
            
        elif device.push_failures >= 3:
            # Too many failures - mark for re-auth
            device.status = DeviceStatus.NEEDS_REAUTH
            device.needs_permission_prompt = True
            response["action_taken"] = "device_marked_for_reauth"
            response["message"] = f"Device marked for re-authorization after {device.push_failures} failures"
            
        elif error.should_retry and attempt_count < 3:
            # Schedule retry
            response["action_taken"] = "retry_scheduled"
            response["retry_after"] = error.retry_after or 60
            response["message"] = "Retry scheduled for temporary failure"
            
        else:
            # Other errors - just record the failure
            response["action_taken"] = "failure_recorded"
            response["message"] = "Failure recorded, monitoring for patterns"
        
        # Save device changes
        device.updated_at = current_time
        self.db.add(device)
        self.db.commit()
        
        return response
    
    async def _record_error_in_history(self, device: UserDevice, error: PushError) -> None:
        """Record error details in device error history (if you have such a table)"""
        
        # This could store in a separate DeviceErrorHistory table for detailed analytics
        # For now, we'll just log it
        
        logger.info(
            f"Recording error for device {device.id}",
            extra={
                "device_id": str(device.id),
                "user_id": str(device.user_id),
                "error_type": error.error_type.value,
                "error_message": error.message,
                "device_platform": device.platform,
                "device_type": device.device_type,
                "total_failures": device.push_failures
            }
        )
    
    async def retry_failed_notifications(self) -> Dict[str, int]:
        """Retry notifications that failed with temporary errors"""
        
        retry_cutoff = datetime.now(timezone.utc)
        
        # Find devices that are ready for retry
        devices_to_retry = self.db.exec(
            select(UserDevice).where(
                and_(
                    UserDevice.status == DeviceStatus.ACTIVE,
                    UserDevice.push_failures > 0,
                    UserDevice.push_failures < 3,  # Not marked for reauth yet
                    UserDevice.last_push_failure < retry_cutoff,
                    UserDevice.push_token != None
                )
            )
        ).all()
        
        retries_attempted = 0
        retries_successful = 0
        
        for device in devices_to_retry:
            try:
                # Send a test notification to verify the device is working
                success = await self.firebase_service.send_push_notification(
                    token=device.push_token,
                    title="Notification Service Restored",
                    body="Your notifications are working again!",
                    data={"type": "retry_success"},
                    analytics_label="retry_verification"
                )
                
                retries_attempted += 1
                
                if success:
                    # Reset failure count and mark as successful
                    device.push_failures = 0
                    device.last_push_success = datetime.now(timezone.utc)
                    device.updated_at = datetime.now(timezone.utc)
                    self.db.add(device)
                    retries_successful += 1
                    
                    logger.info(f"Successfully retried device {device.id}")
                else:
                    # Still failing - increment failure count
                    await self.handle_push_failure(
                        device_id=str(device.id),
                        error_message="Retry attempt failed",
                        attempt_count=device.push_failures + 1
                    )
                
            except Exception as e:
                logger.error(f"Error during retry for device {device.id}: {e}")
                await self.handle_push_failure(
                    device_id=str(device.id),
                    error_message=f"Retry error: {str(e)}",
                    attempt_count=device.push_failures + 1
                )
        
        self.db.commit()
        
        return {
            "retries_attempted": retries_attempted,
            "retries_successful": retries_successful,
            "devices_checked": len(devices_to_retry)
        }
    
    def get_error_statistics(self, hours: int = 24) -> Dict[str, Any]:
        """Get error statistics for the last N hours"""
        
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        # Get devices with recent failures
        recent_failures = self.db.exec(
            select(UserDevice).where(
                UserDevice.last_push_failure > cutoff
            )
        ).all()
        
        # Categorize errors (this would be more detailed with error history table)
        error_stats = {
            "total_failures": len(recent_failures),
            "devices_needing_reauth": len([d for d in recent_failures if d.status == DeviceStatus.NEEDS_REAUTH]),
            "high_failure_devices": len([d for d in recent_failures if d.push_failures >= 3]),
            "failure_rate": 0.0
        }
        
        # Calculate failure rate
        total_devices = self.db.exec(
            select(UserDevice).where(
                and_(
                    UserDevice.is_active == True,
                    UserDevice.push_token != None
                )
            )
        ).all()
        
        if len(total_devices) > 0:
            error_stats["failure_rate"] = error_stats["total_failures"] / total_devices
        
        return error_stats


# Circuit breaker pattern for Firebase service
class FirebaseCircuitBreaker:
    """Circuit breaker to prevent overwhelming Firebase service during outages"""
    
    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 300):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.is_open = False
    
    async def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker protection"""
        
        # Check if circuit breaker should be closed
        if self.is_open:
            if self.last_failure_time and (datetime.now(timezone.utc) - self.last_failure_time).total_seconds() > self.recovery_timeout:
                self.is_open = False
                self.failure_count = 0
                logger.info("Circuit breaker reset - attempting to resume Firebase calls")
            else:
                raise Exception("Circuit breaker is open - Firebase service unavailable")
        
        try:
            result = await func(*args, **kwargs)
            
            # Success - reset failure count
            if self.failure_count > 0:
                self.failure_count = 0
                logger.info("Firebase service recovered")
            
            return result
            
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = datetime.now(timezone.utc)
            
            if self.failure_count >= self.failure_threshold:
                self.is_open = True
                logger.error(f"Circuit breaker opened after {self.failure_count} failures")
            
            raise e