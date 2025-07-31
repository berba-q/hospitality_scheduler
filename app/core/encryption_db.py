"""
Database utilities for encryption operations.
Handles automatic encryption/decryption and data migration.
"""

import logging
from typing import Any, Dict, List, Optional, Type
from sqlmodel import Session, select
from sqlalchemy import text
from datetime import datetime

from .encryption import ModelEncryption, get_field_encryption, SENSITIVE_FIELDS
from ..models import NotificationGlobalSettings, SystemSettings, AuditLog

logger = logging.getLogger(__name__)

class DatabaseEncryption:
    """
    Database-level encryption operations for models with sensitive fields.
    Handles automatic encryption/decryption during CRUD operations.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.encryption = get_field_encryption()
    
    def save_with_encryption(self, model_instance: Any) -> Any:
        """
        Save model instance with automatic encryption of sensitive fields.
        Returns the saved instance with encrypted fields.
        """
        model_name = type(model_instance).__name__
        model_encryption = ModelEncryption(model_name)
        
        # Get model data as dict
        model_data = model_instance.dict() if hasattr(model_instance, 'dict') else model_instance.__dict__
        
        # Encrypt sensitive fields
        encrypted_data = model_encryption.encrypt_model_fields(model_data)
        
        # Update model instance with encrypted data
        for field_name, encrypted_value in encrypted_data.items():
            if hasattr(model_instance, field_name):
                setattr(model_instance, field_name, encrypted_value)
        
        # Save to database
        self.db.add(model_instance)
        self.db.commit()
        self.db.refresh(model_instance)
        
        logger.info(f"Saved {model_name} with encrypted sensitive fields")
        return model_instance
    
    def load_with_decryption(self, model_class: Type, model_id: Any, 
                           decrypt_fields: bool = True) -> Optional[Any]:
        """
        Load model instance with automatic decryption of sensitive fields.
        Set decrypt_fields=False to skip decryption (useful for API responses).
        """
        instance = self.db.get(model_class, model_id)
        if not instance:
            return None
        
        if decrypt_fields:
            model_name = model_class.__name__
            model_encryption = ModelEncryption(model_name)
            
            # Get model data as dict
            model_data = instance.dict() if hasattr(instance, 'dict') else instance.__dict__
            
            # Decrypt sensitive fields
            decrypted_data = model_encryption.decrypt_model_fields(model_data)
            
            # Update instance with decrypted data
            for field_name, decrypted_value in decrypted_data.items():
                if hasattr(instance, field_name):
                    setattr(instance, field_name, decrypted_value)
        
        return instance
    
    def update_with_encryption(self, model_instance: Any, update_data: Dict[str, Any]) -> Any:
        """
        Update model instance with automatic encryption of sensitive fields.
        """
        model_name = type(model_instance).__name__
        model_encryption = ModelEncryption(model_name)
        
        # Encrypt any sensitive fields in update data
        encrypted_update_data = model_encryption.encrypt_model_fields(update_data)
        
        # Update instance
        for field_name, value in encrypted_update_data.items():
            if hasattr(model_instance, field_name):
                setattr(model_instance, field_name, value)
        
        # Set updated timestamp if available
        if hasattr(model_instance, 'updated_at'):
            model_instance.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(model_instance)
        
        logger.info(f"Updated {model_name} with encrypted sensitive fields")
        return model_instance

class EncryptionMigration:
    """
    Utilities for migrating existing unencrypted data to encrypted format.
    Use these utilities when adding encryption to existing deployments.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.encryption = get_field_encryption()
    
    def migrate_notification_settings(self, dry_run: bool = True) -> Dict[str, Any]:
        """
        Migrate existing NotificationGlobalSettings to encrypt sensitive fields.
        Set dry_run=False to actually perform the migration.
        """
        results = {
            "total_records": 0,
            "encrypted_records": 0,
            "skipped_records": 0,
            "errors": []
        }
        
        try:
            # Get all notification settings
            settings_list = self.db.exec(select(NotificationGlobalSettings)).all()
            results["total_records"] = len(settings_list)
            
            model_encryption = ModelEncryption("NotificationGlobalSettings")
            
            for settings in settings_list:
                try:
                    needs_encryption = False
                    
                    # Check each sensitive field
                    for field_name in model_encryption.sensitive_fields:
                        if hasattr(settings, field_name):
                            value = getattr(settings, field_name)
                            if value and not self.encryption.is_encrypted(value):
                                needs_encryption = True
                                break
                    
                    if needs_encryption:
                        if not dry_run:
                            # Get settings as dict
                            settings_dict = settings.__dict__.copy()
                            
                            # Encrypt sensitive fields
                            encrypted_dict = model_encryption.encrypt_model_fields(settings_dict)
                            
                            # Update settings object
                            for field_name, encrypted_value in encrypted_dict.items():
                                if hasattr(settings, field_name):
                                    setattr(settings, field_name, encrypted_value)
                            
                            settings.updated_at = datetime.utcnow()
                            self.db.commit()
                        
                        results["encrypted_records"] += 1
                        logger.info(f"{'Would encrypt' if dry_run else 'Encrypted'} settings for tenant {settings.tenant_id}")
                    else:
                        results["skipped_records"] += 1
                        
                except Exception as e:
                    error_msg = f"Failed to migrate settings {settings.id}: {str(e)}"
                    results["errors"].append(error_msg)
                    logger.error(error_msg)
            
            if dry_run:
                self.db.rollback()  # Rollback any changes made during dry run
            
        except Exception as e:
            error_msg = f"Migration failed: {str(e)}"
            results["errors"].append(error_msg)
            logger.error(error_msg)
            if not dry_run:
                self.db.rollback()
        
        return results
    
    def verify_encryption_status(self) -> Dict[str, Any]:
        """
        Verify encryption status across all models with sensitive fields.
        Returns detailed report of encryption coverage.
        """
        report = {
            "models": {},
            "overall_encrypted": True,
            "total_sensitive_fields": 0,
            "encrypted_fields": 0
        }
        
        # Check NotificationGlobalSettings
        try:
            settings_list = self.db.exec(select(NotificationGlobalSettings)).all()
            model_encryption = ModelEncryption("NotificationGlobalSettings")
            
            model_report = {
                "total_records": len(settings_list),
                "fully_encrypted_records": 0,
                "partially_encrypted_records": 0,
                "unencrypted_records": 0,
                "field_status": {}
            }
            
            for field_name in model_encryption.sensitive_fields:
                model_report["field_status"][field_name] = {
                    "total": 0,
                    "encrypted": 0,
                    "unencrypted": 0
                }
            
            for settings in settings_list:
                encrypted_fields = 0
                total_fields = 0
                
                for field_name in model_encryption.sensitive_fields:
                    if hasattr(settings, field_name):
                        value = getattr(settings, field_name)
                        if value:  # Only count non-empty fields
                            total_fields += 1
                            model_report["field_status"][field_name]["total"] += 1
                            
                            if self.encryption.is_encrypted(value):
                                encrypted_fields += 1
                                model_report["field_status"][field_name]["encrypted"] += 1
                            else:
                                model_report["field_status"][field_name]["unencrypted"] += 1
                
                # Classify record encryption status
                if total_fields == 0:
                    continue  # Skip records with no sensitive data
                elif encrypted_fields == total_fields:
                    model_report["fully_encrypted_records"] += 1
                elif encrypted_fields > 0:
                    model_report["partially_encrypted_records"] += 1
                else:
                    model_report["unencrypted_records"] += 1
            
            report["models"]["NotificationGlobalSettings"] = model_report
            
            # Update overall status
            if model_report["unencrypted_records"] > 0 or model_report["partially_encrypted_records"] > 0:
                report["overall_encrypted"] = False
            
            # Count totals
            for field_status in model_report["field_status"].values():
                report["total_sensitive_fields"] += field_status["total"]
                report["encrypted_fields"] += field_status["encrypted"]
                
        except Exception as e:
            logger.error(f"Failed to verify encryption status: {e}")
            report["error"] = str(e)
        
        return report

def create_audit_log_entry(db: Session, user_id: Any, tenant_id: Any, 
                          action: str, resource_type: str, resource_id: Any = None,
                          changes: Dict[str, Any] = {}, ip_address: Optional[str] = None,
                          user_agent: Optional[str] = None) -> AuditLog:
    """
    Create an audit log entry for encryption-related operations.
    """
    audit_entry = AuditLog(
        tenant_id=tenant_id,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        changes=changes or {},
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    
    return audit_entry

# Convenience functions for common operations
def encrypt_and_save_notification_settings(db: Session, settings: NotificationGlobalSettings) -> NotificationGlobalSettings:
    """Save notification settings with automatic encryption"""
    db_encryption = DatabaseEncryption(db)
    return db_encryption.save_with_encryption(settings)

def load_and_decrypt_notification_settings(db: Session, settings_id: Any) -> Optional[NotificationGlobalSettings]:
    """Load notification settings with automatic decryption"""
    db_encryption = DatabaseEncryption(db)
    return db_encryption.load_with_decryption(NotificationGlobalSettings, settings_id)

def get_masked_notification_settings(db: Session, settings_id: Any) -> Optional[Dict[str, Any]]:
    """Load notification settings with sensitive fields masked for API responses"""
    settings = db.get(NotificationGlobalSettings, settings_id)
    if not settings:
        return None
    
    model_encryption = ModelEncryption("NotificationGlobalSettings")
    settings_dict = settings.__dict__.copy()
    return model_encryption.get_masked_fields(settings_dict)