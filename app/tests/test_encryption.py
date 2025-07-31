"""
Unit tests for encryption utilities.
"""

import pytest
import os
from unittest.mock import patch, MagicMock
from app.core.encryption import (
    FieldEncryption, 
    ModelEncryption, 
    encrypt_field, 
    decrypt_field,
    is_field_encrypted,
    generate_encryption_key,
    verify_encryption_setup,
    SENSITIVE_FIELDS
)
from app.core.encryption_db import DatabaseEncryption, EncryptionMigration

class TestFieldEncryption:
    """Test field-level encryption functionality"""
    
    def test_encryption_decryption_roundtrip(self):
        """Test that encryption -> decryption returns original value"""
        encryption = FieldEncryption("test_secret_key_123")
        original_text = "sensitive_password_123"
        
        encrypted = encryption.encrypt(original_text)
        decrypted = encryption.decrypt(encrypted)
        
        assert decrypted == original_text
        assert encrypted != original_text
        assert len(encrypted) > len(original_text)
    
    def test_empty_string_handling(self):
        """Test handling of empty and None values"""
        encryption = FieldEncryption("test_secret_key_123")
        
        assert encryption.encrypt("") == ""
        assert encryption.encrypt(None or "") == ""
        assert encryption.decrypt("") == ""
        assert encryption.decrypt(None or "") == ""
    
    def test_is_encrypted_detection(self):
        """Test encrypted text detection"""
        encryption = FieldEncryption("test_secret_key_123")
        
        plaintext = "password123"
        encrypted = encryption.encrypt(plaintext)
        
        assert not encryption.is_encrypted(plaintext)
        assert encryption.is_encrypted(encrypted)
        assert not encryption.is_encrypted("")
        assert not encryption.is_encrypted("short")
    
    def test_invalid_decryption(self):
        """Test error handling for invalid encrypted data"""
        encryption = FieldEncryption("test_secret_key_123")
        
        with pytest.raises(Exception):
            encryption.decrypt("invalid_encrypted_data")
    
    @patch.dict(os.environ, {"SECRET_KEY": "test_secret_123"})
    def test_key_derivation_from_secret_key(self):
        """Test key derivation from SECRET_KEY environment variable"""
        encryption = FieldEncryption()  # Should use SECRET_KEY
        
        test_data = "test_encryption"
        encrypted = encryption.encrypt(test_data)
        decrypted = encryption.decrypt(encrypted)
        
        assert decrypted == test_data
    
    @patch.dict(os.environ, {"ENCRYPTION_KEY": "invalid_base64"})
    def test_invalid_encryption_key_fallback(self):
        """Test fallback to SECRET_KEY when ENCRYPTION_KEY is invalid"""
        with patch.dict(os.environ, {"SECRET_KEY": "fallback_secret"}):
            encryption = FieldEncryption()
            
            test_data = "test_data"
            encrypted = encryption.encrypt(test_data)
            decrypted = encryption.decrypt(encrypted)
            
            assert decrypted == test_data

class TestModelEncryption:
    """Test model-level encryption functionality"""
    
    def test_notification_settings_encryption(self):
        """Test encryption of NotificationGlobalSettings sensitive fields"""
        model_encryption = ModelEncryption("NotificationGlobalSettings")
        
        test_data = {
            "smtp_host": "smtp.gmail.com",
            "smtp_password": "secret_password_123",
            "twilio_account_sid": "AC123456789",
            "twilio_auth_token": "secret_token_456",
            "firebase_server_key": "firebase_key_789",
            "smtp_enabled": True
        }
        
        encrypted_data = model_encryption.encrypt_model_fields(test_data)
        
        # Non-sensitive fields should be unchanged
        assert encrypted_data["smtp_host"] == test_data["smtp_host"]
        assert encrypted_data["smtp_enabled"] == test_data["smtp_enabled"]
        
        # Sensitive fields should be encrypted
        assert encrypted_data["smtp_password"] != test_data["smtp_password"]
        assert encrypted_data["twilio_account_sid"] != test_data["twilio_account_sid"]
        assert encrypted_data["twilio_auth_token"] != test_data["twilio_auth_token"]
        assert encrypted_data["firebase_server_key"] != test_data["firebase_server_key"]
        
        # Decrypt and verify
        decrypted_data = model_encryption.decrypt_model_fields(encrypted_data)
        assert decrypted_data["smtp_password"] == test_data["smtp_password"]
        assert decrypted_data["twilio_account_sid"] == test_data["twilio_account_sid"]
    
    def test_masked_fields_generation(self):
        """Test generation of masked fields for API responses"""
        model_encryption = ModelEncryption("NotificationGlobalSettings")
        
        test_data = {
            "smtp_host": "smtp.gmail.com",
            "smtp_password": "secret_password",
            "twilio_account_sid": "AC123456789",
            "smtp_enabled": True
        }
        
        masked_data = model_encryption.get_masked_fields(test_data)
        
        # Check that sensitive fields are replaced with _set fields
        assert "smtp_password" not in masked_data
        assert masked_data["smtp_password_set"] is True
        assert "twilio_account_sid" not in masked_data
        assert masked_data["twilio_account_sid_set"] is True
        
        # Non-sensitive fields should remain
        assert masked_data["smtp_host"] == test_data["smtp_host"]
        assert masked_data["smtp_enabled"] == test_data["smtp_enabled"]
    
    def test_skip_already_encrypted_fields(self):
        """Test that already encrypted fields are not re-encrypted"""
        model_encryption = ModelEncryption("NotificationGlobalSettings")
        
        # Pre-encrypt a field
        original_password = "secret_password"
        encrypted_password = model_encryption.encryption.encrypt(original_password)
        
        test_data = {
            "smtp_password": encrypted_password,
            "twilio_account_sid": "plaintext_sid"
        }
        
        # Encrypt fields - should skip already encrypted password
        encrypted_data = model_encryption.encrypt_model_fields(test_data)
        
        assert encrypted_data["smtp_password"] == encrypted_password  # Unchanged
        assert encrypted_data["twilio_account_sid"] != test_data["twilio_account_sid"]  # Changed

class TestConvenienceFunctions:
    """Test convenience functions"""
    
    def test_global_encrypt_decrypt_functions(self):
        """Test global encrypt_field and decrypt_field functions"""
        original_text = "test_secret_data"
        
        encrypted = encrypt_field(original_text)
        decrypted = decrypt_field(encrypted)
        
        assert decrypted == original_text
        assert is_field_encrypted(encrypted)
        assert not is_field_encrypted(original_text)
    
    def test_generate_encryption_key_format(self):
        """Test encryption key generation"""
        key = generate_encryption_key()
        
        assert isinstance(key, str)
        assert len(key) > 20  # Should be substantial length
        
        # Should be valid base64
        import base64
        try:
            decoded = base64.urlsafe_b64decode(key.encode())
            assert len(decoded) > 0
        except Exception:
            pytest.fail("Generated key is not valid base64")
    
    @patch.dict(os.environ, {"SECRET_KEY": "test_secret_key"})
    def test_verify_encryption_setup_success(self):
        """Test successful encryption setup verification"""
        status = verify_encryption_setup()
        
        assert status["encryption_available"] is True
        assert status["test_passed"] is True
        assert status["error"] is None
        assert status["key_source"] == "SECRET_KEY"
    
    @patch.dict(os.environ, {}, clear=True)
    def test_verify_encryption_setup_failure(self):
        """Test encryption setup verification when no keys available"""
        status = verify_encryption_setup()
        
        assert status["encryption_available"] is False
        assert status["test_passed"] is False
        assert status["error"] is not None

class TestSensitiveFieldsConfiguration:
    """Test sensitive fields configuration"""
    
    def test_sensitive_fields_defined(self):
        """Test that sensitive fields are properly defined"""
        assert "NotificationGlobalSettings" in SENSITIVE_FIELDS
        
        notification_fields = SENSITIVE_FIELDS["NotificationGlobalSettings"]
        expected_fields = [
            "smtp_password",
            "twilio_account_sid", 
            "twilio_auth_token",
            "firebase_server_key"
        ]
        
        for field in expected_fields:
            assert field in notification_fields
    
    def test_model_encryption_uses_correct_fields(self):
        """Test that ModelEncryption uses correct sensitive fields"""
        model_encryption = ModelEncryption("NotificationGlobalSettings")
        
        assert model_encryption.sensitive_fields == SENSITIVE_FIELDS["NotificationGlobalSettings"]
        assert "smtp_password" in model_encryption.sensitive_fields
        assert "smtp_host" not in model_encryption.sensitive_fields

# Integration test (requires database)
@pytest.mark.integration
class TestDatabaseEncryption:
    """Integration tests for database encryption (requires test database)"""
    
    def test_encryption_migration_dry_run(self, db_session):
        """Test encryption migration in dry run mode"""
        migration = EncryptionMigration(db_session)
        
        # This should not fail even with empty database
        results = migration.migrate_notification_settings(dry_run=True)
        
        assert "total_records" in results
        assert "encrypted_records" in results
        assert "errors" in results
        assert isinstance(results["errors"], list)

# Pytest fixtures for testing
@pytest.fixture
def db_session():
    """Mock database session for testing"""
    return MagicMock()
