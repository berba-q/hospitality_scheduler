#!/usr/bin/env python3
"""
Sync WhatsApp numbers from Staff.phone to User.whatsapp_number for existing users
This is a one-time migration script to fix existing accounts
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlmodel import Session, select
from app.deps import engine
from app.models import User, Staff


def sync_whatsapp_numbers():
    """Sync WhatsApp numbers from staff phone to user whatsapp_number"""

    with Session(engine) as session:
        print("🔄 Starting WhatsApp number sync...")

        # Get all users
        users = session.exec(select(User)).all()

        updated = 0
        skipped_no_staff = 0
        skipped_no_phone = 0
        skipped_already_set = 0

        for user in users:
            # Skip if user already has WhatsApp number
            if user.whatsapp_number:
                skipped_already_set += 1
                continue

            # Find corresponding staff member by email
            staff = session.exec(
                select(Staff).where(Staff.email == user.email)
            ).first()

            if not staff:
                print(f"⚠️  No staff found for user: {user.email}")
                skipped_no_staff += 1
                continue

            if not staff.phone:
                print(f"⚠️  No phone number for staff: {staff.full_name} ({staff.email})")
                skipped_no_phone += 1
                continue

            # Update user with staff phone number
            user.whatsapp_number = staff.phone
            session.add(user)
            updated += 1
            print(f"✅ Updated {user.email}: {staff.phone}")

        # Commit all changes
        session.commit()

        print(f"\n📊 Sync Summary:")
        print(f"   ✅ Updated: {updated}")
        print(f"   ⏭️  Already set: {skipped_already_set}")
        print(f"   ⚠️  No staff record: {skipped_no_staff}")
        print(f"   ⚠️  No phone number: {skipped_no_phone}")
        print(f"\n✨ Total users processed: {len(users)}")


if __name__ == "__main__":
    try:
        sync_whatsapp_numbers()
        print("\n✅ WhatsApp number sync completed successfully!")
    except Exception as e:
        print(f"\n❌ Error during sync: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
