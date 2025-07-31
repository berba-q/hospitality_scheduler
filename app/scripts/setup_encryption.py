# app/scripts/setup_encryption.py
"""
Setup script for configuring encryption in the hospitality scheduler.
Generates encryption keys, verifies setup, and migrates existing data.
"""

import os
import sys
import asyncio
from pathlib import Path
from sqlmodel import Session, select
from typing import Dict, Any

# Add app directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

from app.core.encryption import (
    generate_encryption_key, 
    verify_encryption_setup,
    get_field_encryption
)
from app.core.encryption_db import EncryptionMigration
from app.core.config import get_settings
from app.deps import engine
from app.models import NotificationGlobalSettings

def print_header(title: str):
    """Print a formatted header"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def print_step(step: str, status: str = ""):
    """Print a formatted step"""
    status_symbol = {
        "✅": "✅",
        "❌": "❌", 
        "⚠️": "⚠️",
        "🔧": "🔧",
        "📝": "📝"
    }
    symbol = status_symbol.get(status, "•")
    print(f"{symbol} {step}")

def generate_new_encryption_key():
    """Generate and display a new encryption key"""
    print_header("GENERATE NEW ENCRYPTION KEY")
    
    try:
        new_key = generate_encryption_key()
        
        print_step("New encryption key generated successfully!", "✅")
        print("\n📝 ADD THIS TO YOUR .env FILE:")
        print("-" * 40)
        print(f"ENCRYPTION_KEY={new_key}")
        print("-" * 40)
        
        print("\n💡 IMPORTANT SECURITY NOTES:")
        print("• Store this key securely - if lost, encrypted data cannot be recovered")
        print("• Use different keys for different environments (dev/staging/prod)")
        print("• Consider using a dedicated key management service in production")
        print("• Back up this key in a secure location")
        
        return new_key
        
    except Exception as e:
        print_step(f"Failed to generate encryption key: {e}", "❌")
        return None

def verify_current_setup():
    """Verify the current encryption setup"""
    print_header("VERIFY ENCRYPTION SETUP")
    
    try:
        status = verify_encryption_setup()
        
        if status["encryption_available"]:
            print_step("Encryption system is available", "✅")
        else:
            print_step("Encryption system is NOT available", "❌")
            if status["error"]:
                print(f"   Error: {status['error']}")
            return False
        
        if status["test_passed"]:
            print_step("Encryption test passed", "✅")
        else:
            print_step("Encryption test FAILED", "❌")
            return False
        
        if status["has_dedicated_key"]:
            print_step("Using dedicated ENCRYPTION_KEY", "✅")
        else:
            print_step("Using SECRET_KEY for encryption", "⚠️")
            print("   Consider generating a dedicated ENCRYPTION_KEY for better security")
        
        print_step(f"Key source: {status['key_source']}", "📝")
        
        return True
        
    except Exception as e:
        print_step(f"Setup verification failed: {e}", "❌")
        return False

def check_database_encryption_status():
    """Check encryption status of sensitive data in database"""
    print_header("DATABASE ENCRYPTION STATUS")
    
    try:
        with Session(engine) as session:
            migration = EncryptionMigration(session)
            report = migration.verify_encryption_status()
            
            if "error" in report:
                print_step(f"Failed to check database status: {report['error']}", "❌")
                return False
            
            print_step(f"Overall encryption status: {'ENCRYPTED' if report['overall_encrypted'] else 'NEEDS ATTENTION'}", 
                      "✅" if report['overall_encrypted'] else "⚠️")
            
            print_step(f"Total sensitive fields: {report['total_sensitive_fields']}", "📝")
            print_step(f"Encrypted fields: {report['encrypted_fields']}", "📝")
            
            # Detailed model reports
            for model_name, model_report in report["models"].items():
                print(f"\n   📊 {model_name}:")
                print(f"      Total records: {model_report['total_records']}")
                print(f"      Fully encrypted: {model_report['fully_encrypted_records']}")
                print(f"      Partially encrypted: {model_report['partially_encrypted_records']}")
                print(f"      Unencrypted: {model_report['unencrypted_records']}")
                
                # Field-level details
                for field_name, field_status in model_report["field_status"].items():
                    if field_status["total"] > 0:
                        encrypted_pct = (field_status["encrypted"] / field_status["total"]) * 100
                        status_icon = "✅" if encrypted_pct == 100 else "⚠️" if encrypted_pct > 0 else "❌"
                        print(f"         {status_icon} {field_name}: {field_status['encrypted']}/{field_status['total']} ({encrypted_pct:.1f}%)")
            
            return report['overall_encrypted']
            
    except Exception as e:
        print_step(f"Database check failed: {e}", "❌")
        return False

def migrate_existing_data(dry_run: bool = True):
    """Migrate existing unencrypted data"""
    mode = "DRY RUN" if dry_run else "LIVE MIGRATION"
    print_header(f"DATA MIGRATION - {mode}")
    
    if not dry_run:
        confirm = input("\n⚠️  This will modify data in your database. Are you sure? (type 'YES' to confirm): ")
        if confirm != "YES":
            print_step("Migration cancelled by user", "⚠️")
            return False
    
    try:
        with Session(engine) as session:
            migration = EncryptionMigration(session)
            
            # Migrate notification settings
            print_step("Migrating NotificationGlobalSettings...", "🔧")
            results = migration.migrate_notification_settings(dry_run=dry_run)
            
            print(f"   Total records: {results['total_records']}")
            print(f"   {'Would encrypt' if dry_run else 'Encrypted'}: {results['encrypted_records']}")
            print(f"   Skipped (already encrypted): {results['skipped_records']}")
            
            if results['errors']:
                print(f"   Errors: {len(results['errors'])}")
                for error in results['errors']:
                    print(f"      • {error}")
                return False
            
            if results['encrypted_records'] > 0:
                print_step(f"{'Would migrate' if dry_run else 'Migrated'} {results['encrypted_records']} records", "✅")
            else:
                print_step("No migration needed - all data already encrypted", "✅")
            
            return True
            
    except Exception as e:
        print_step(f"Migration failed: {e}", "❌")
        return False

def interactive_setup():
    """Interactive setup wizard"""
    print_header("ENCRYPTION SETUP WIZARD")
    
    print("Welcome to the Hospitality Scheduler encryption setup!")
    print("This wizard will help you configure encryption for sensitive data.")
    
    # Step 1: Check current setup
    print("\n🔍 Step 1: Checking current setup...")
    setup_ok = verify_current_setup()
    
    if not setup_ok:
        print("\n❌ Encryption setup issues detected!")
        generate_key = input("\nWould you like to generate a new encryption key? (y/N): ")
        
        if generate_key.lower() in ['y', 'yes']:
            new_key = generate_new_encryption_key()
            if new_key:
                print("\n📝 Please add the ENCRYPTION_KEY to your .env file and restart the application.")
                return
        else:
            print("Please fix encryption setup and run this script again.")
            return
    
    # Step 2: Check database status
    print("\n🔍 Step 2: Checking database encryption status...")
    db_encrypted = check_database_encryption_status()
    
    if not db_encrypted:
        print("\n⚠️  Some data in your database is not encrypted!")
        
        # Run dry run first
        print("\n🧪 Running migration dry run...")
        migrate_existing_data(dry_run=True)
        
        migrate = input("\nWould you like to encrypt existing data? (y/N): ")
        if migrate.lower() in ['y', 'yes']:
            print("\n🔧 Starting live migration...")
            success = migrate_existing_data(dry_run=False)
            if success:
                print_step("Data migration completed successfully!", "✅")
            else:
                print_step("Data migration failed!", "❌")
        else:
            print("⚠️  Existing data will remain unencrypted.")
    
    print("\n🎉 Encryption setup complete!")
    print("\n📋 NEXT STEPS:")
    print("• Test your application to ensure everything works correctly")
    print("• Set up regular backups of your encryption key")
    print("• Consider implementing key rotation procedures")
    print("• Monitor audit logs for encryption-related events")

def main():
    """Main setup script entry point"""
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "generate-key":
            generate_new_encryption_key()
        elif command == "verify":
            verify_current_setup()
        elif command == "check-db":
            check_database_encryption_status()
        elif command == "migrate-dry":
            migrate_existing_data(dry_run=True)
        elif command == "migrate":
            migrate_existing_data(dry_run=False)
        else:
            print("Usage: python setup_encryption.py [generate-key|verify|check-db|migrate-dry|migrate]")
            print("       python setup_encryption.py  (for interactive mode)")
    else:
        interactive_setup()

if __name__ == "__main__":
    main()