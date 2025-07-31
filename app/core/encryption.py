# app/core/encryption.py
"""
Security utilities for encrypting sensitive fields in the database.
Supports field-level encryption for passwords, tokens, and API keys.
"""

import os
import base64
import logging
from typing import Optional, Any, Dict
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from functools import lru_cache

logger = logging.getLogger(__name__)

class EncryptionError(Exception):
    """Custom exception for encryption-related errors"""
    pass

class FieldEncryption:
    """
    Field-level encryption utility using Fernet (symmetric encryption).
    Derives encryption keys from environment variables for security.
    """
    
    def __init__(self, encryption_key: Optional[str] = None):
        """
        Initialize encryption with optional custom key.
        If no key provided, derives from SECRET_KEY environment variable.
        """
        self._encryption_key = encryption_key
        self._fernet = None
        
    @property
    def fernet(self) -> Fernet:
        """Lazy-load Fernet instance with derived key"""
        if self._fernet is None:
            key = self._get_or_derive_key()
            self._fernet = Fernet(key)
        return self._fernet
    
    def _get_or_derive_key(self) -> bytes:
        """
        Get encryption key from environment or derive from SECRET_KEY.
        Uses PBKDF2 for key derivation with a static salt for consistency.
        """
        # Check for dedicated encryption key first
        encryption_key = os.getenv("ENCRYPTION_KEY")
        if encryption_key:
            try:
                return base64.urlsafe_b64decode(encryption_key.encode())
            except Exception as e:
                logger.warning(f"Invalid ENCRYPTION_KEY format: {e}")
        
        # Fallback to deriving from SECRET_KEY
        secret_key = self._encryption_key or os.getenv("SECRET_KEY")
        if not secret_key:
            raise EncryptionError(
                "No encryption key available. Set ENCRYPTION_KEY or SECRET_KEY environment variable."
            )
        
        # Use static salt for consistency (in production, consider per-tenant salts)
        salt = b"hospitality_scheduler_salt_v1"
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,  # NIST recommended minimum
        )
        key = base64.urlsafe_b64encode(kdf.derive(secret_key.encode()))
        return key
    
    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt plaintext string and return base64-encoded result.
        Returns empty string if plaintext is None or empty.
        """
        if not plaintext:
            return ""
        
        try:
            encrypted_bytes = self.fernet.encrypt(plaintext.encode('utf-8'))
            return base64.urlsafe_b64encode(encrypted_bytes).decode('utf-8')
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise EncryptionError(f"Failed to encrypt data: {str(e)}")
    
    def decrypt(self, encrypted_text: str) -> str:
        """
        Decrypt base64-encoded encrypted text and return plaintext.
        Returns empty string if encrypted_text is None or empty.
        """
        if not encrypted_text:
            return ""
        
        try:
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_text.encode('utf-8'))
            decrypted_bytes = self.fernet.decrypt(encrypted_bytes)
            return decrypted_bytes.decode('utf-8')
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise EncryptionError(f"Failed to decrypt data: {str(e)}")
    
    def is_encrypted(self, text: str) -> bool:
        """
        Check if text appears to be encrypted (basic heuristic).
        Encrypted text should be base64 and longer than typical plaintext.
        """
        if not text or len(text) < 20:  # Encrypted data is typically longer
            return False
        
        try:
            # Try to decode as base64
            base64.urlsafe_b64decode(text.encode('utf-8'))
            # If it decodes, it might be encrypted (heuristic check)
            return True
        except Exception:
            return False

# Global encryption instance
@lru_cache(maxsize=1)
def get_field_encryption() -> FieldEncryption:
    """Get singleton field encryption instance"""
    return FieldEncryption()

# Convenience functions
def encrypt_field(plaintext: str) -> str:
    """Encrypt a field value"""
    return get_field_encryption().encrypt(plaintext)

def decrypt_field(encrypted_text: str) -> str:
    """Decrypt a field value"""
    return get_field_encryption().decrypt(encrypted_text)

def is_field_encrypted(text: str) -> bool:
    """Check if field appears to be encrypted"""
    return get_field_encryption().is_encrypted(text)

# Sensitive field mapping for different models
SENSITIVE_FIELDS = {
    "NotificationGlobalSettings": [
        "smtp_password",
        "twilio_account_sid", 
        "twilio_auth_token",
        "firebase_server_key"
    ],
    "SystemSettings": [
        # Add any sensitive system settings here
    ],
    "UserProfile": [
        # Add any sensitive profile fields here
    ]
}

class ModelEncryption:
    """
    Model-level encryption helper for automatically encrypting/decrypting
    sensitive fields when saving/loading from database.
    """
    
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.sensitive_fields = SENSITIVE_FIELDS.get(model_name, [])
        self.encryption = get_field_encryption()
    
    def encrypt_model_fields(self, model_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Encrypt sensitive fields in a model dictionary.
        Returns new dictionary with encrypted fields.
        """
        encrypted_dict = model_dict.copy()
        
        for field_name in self.sensitive_fields:
            if field_name in encrypted_dict and encrypted_dict[field_name]:
                # Only encrypt if not already encrypted
                value = encrypted_dict[field_name]
                if isinstance(value, str) and not self.encryption.is_encrypted(value):
                    encrypted_dict[field_name] = self.encryption.encrypt(value)
                    logger.debug(f"Encrypted field: {field_name}")
        
        return encrypted_dict
    
    def decrypt_model_fields(self, model_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Decrypt sensitive fields in a model dictionary.
        Returns new dictionary with decrypted fields.
        """
        decrypted_dict = model_dict.copy()
        
        for field_name in self.sensitive_fields:
            if field_name in decrypted_dict and decrypted_dict[field_name]:
                value = decrypted_dict[field_name]
                if isinstance(value, str) and self.encryption.is_encrypted(value):
                    try:
                        decrypted_dict[field_name] = self.encryption.decrypt(value)
                        logger.debug(f"Decrypted field: {field_name}")
                    except EncryptionError:
                        logger.warning(f"Failed to decrypt {field_name}, leaving as-is")
        
        return decrypted_dict
    
    def get_masked_fields(self, model_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Return dictionary with sensitive fields masked for API responses.
        Useful for read operations where you don't want to expose decrypted values.
        """
        masked_dict = model_dict.copy()
        
        for field_name in self.sensitive_fields:
            if field_name in masked_dict and masked_dict[field_name]:
                # Replace with boolean indicating if field is set
                masked_dict[f"{field_name}_set"] = bool(masked_dict[field_name])
                # Remove the actual sensitive field
                del masked_dict[field_name]
        
        return masked_dict

# Utility functions for common operations
def encrypt_notification_settings(settings_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Encrypt sensitive fields in notification settings"""
    encryption = ModelEncryption("NotificationGlobalSettings")
    return encryption.encrypt_model_fields(settings_dict)

def decrypt_notification_settings(settings_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Decrypt sensitive fields in notification settings"""
    encryption = ModelEncryption("NotificationGlobalSettings")
    return encryption.decrypt_model_fields(settings_dict)

def mask_notification_settings(settings_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Mask sensitive fields in notification settings for API responses"""
    encryption = ModelEncryption("NotificationGlobalSettings")
    return encryption.get_masked_fields(settings_dict)

# Key rotation utilities
class KeyRotation:
    """
    Utilities for rotating encryption keys and re-encrypting existing data.
    Use with caution in production environments.
    """
    
    def __init__(self, old_key: str, new_key: str):
        self.old_encryption = FieldEncryption(old_key)
        self.new_encryption = FieldEncryption(new_key)
    
    def rotate_field(self, encrypted_value: str) -> str:
        """
        Rotate a single encrypted field from old key to new key.
        """
        if not encrypted_value:
            return encrypted_value
        
        try:
            # Decrypt with old key
            plaintext = self.old_encryption.decrypt(encrypted_value)
            # Encrypt with new key
            return self.new_encryption.encrypt(plaintext)
        except EncryptionError as e:
            logger.error(f"Key rotation failed: {e}")
            raise
    
    def needs_rotation(self, encrypted_value: str) -> bool:
        """
        Check if a field needs key rotation by attempting decryption with new key.
        """
        if not encrypted_value:
            return False
        
        try:
            self.new_encryption.decrypt(encrypted_value)
            return False  # Already uses new key
        except EncryptionError:
            try:
                self.old_encryption.decrypt(encrypted_value)
                return True  # Uses old key, needs rotation
            except EncryptionError:
                logger.warning(f"Field not encrypted with either key")
                return False

# Environment setup helper
def generate_encryption_key() -> str:
    """
    Generate a new Fernet encryption key for use in ENCRYPTION_KEY environment variable.
    Use this to create a dedicated encryption key separate from SECRET_KEY.
    """
    key = Fernet.generate_key()
    return base64.urlsafe_b64encode(key).decode('utf-8')

def verify_encryption_setup() -> Dict[str, Any]:
    """
    Verify encryption setup and return status information.
    Useful for health checks and setup validation.
    """
    try:
        encryption = get_field_encryption()
        
        # Test encryption/decryption
        test_data = "test_encryption_123"
        encrypted = encryption.encrypt(test_data)
        decrypted = encryption.decrypt(encrypted)
        
        success = decrypted == test_data
        
        return {
            "encryption_available": True,
            "test_passed": success,
            "has_dedicated_key": bool(os.getenv("ENCRYPTION_KEY")),
            "key_source": "ENCRYPTION_KEY" if os.getenv("ENCRYPTION_KEY") else "SECRET_KEY",
            "error": None
        }
    except Exception as e:
        return {
            "encryption_available": False,
            "test_passed": False,
            "has_dedicated_key": False,
            "key_source": None,
            "error": str(e)
        }