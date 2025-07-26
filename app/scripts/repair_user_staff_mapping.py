# app/scripts/repair_user_staff_mapping.py
# This script repairs existing inconsistencies between User and Staff records,
# such as creating missing User accounts and deactivating orphaned User accounts.

from sqlmodel import Session, exists, select, func
from app.models import Staff, User, Facility
from app.deps import engine  
from app.core.security import hash_password 
from datetime import datetime
import json

def repair_user_staff_mapping():
    """Repair existing user-staff mapping issues"""
    
    with Session(engine) as session:
        print("🔧 REPAIRING USER-STAFF MAPPING...")
        print("=" * 50)
        
        repair_results = {
            'created_users': 0,
            'deactivated_users': 0,
            'normalized_emails': 0,
            'errors': []
        }
        
        try:
            # 1. Create missing User accounts for Staff records
            print("\n📋 Step 1: Creating missing User accounts for Staff...")
            
            # Get staff without users using proper join to get tenant_id
            staff_without_users = session.exec(
                select(Staff, Facility)
                .join(Facility, Staff.facility_id == Facility.id)
                .where(
                    Staff.is_active == True,
                    ~exists().where(func.lower(User.email) == func.lower(Staff.email))
                )
            ).all()
            
            if staff_without_users:
                print(f"   Found {len(staff_without_users)} staff members without User accounts")
                
                for staff, facility in staff_without_users:
                    try:
                        # Create User account for staff member
                        new_user = User(
                            email=staff.email.strip(),  # Clean email
                            hashed_password=hash_password("staff123"),  # Default password
                            is_manager=False,
                            is_active=True,
                            tenant_id=facility.tenant_id  #  Get from joined facility
                        )
                        session.add(new_user)
                        repair_results['created_users'] += 1
                        print(f"  Created User account for {staff.full_name} ({staff.email})")
                        
                    except Exception as e:
                        error_msg = f"Failed to create user for {staff.full_name} ({staff.email}): {str(e)}"
                        print(f"    {error_msg}")
                        repair_results['errors'].append(error_msg)
                
                # Commit user creations
                try:
                    session.commit()
                    print(f"   Successfully created {repair_results['created_users']} User accounts")
                except Exception as e:
                    session.rollback()
                    error_msg = f"Failed to commit user creations: {str(e)}"
                    print(f"    {error_msg}")
                    repair_results['errors'].append(error_msg)
                    return repair_results
            else:
                print("   ✅ All active staff already have User accounts")
        
            # 2. Mark orphaned User accounts as inactive (don't delete to preserve history)
            print("\n📋 Step 2: Deactivating orphaned User accounts...")
            
            users_without_staff = session.exec(
                select(User)
                .where(
                    User.is_manager == False,
                    User.is_active == True,
                    ~exists().where(
                        func.lower(Staff.email) == func.lower(User.email),
                        Staff.is_active == True
                    )
                )
            ).all()
            
            if users_without_staff:
                print(f"   Found {len(users_without_staff)} orphaned User accounts")
                
                for user in users_without_staff:
                    try:
                        user.is_active = False
                        user.updated_at = datetime.utcnow()  # Track when deactivated
                        repair_results['deactivated_users'] += 1
                        print(f"   ⚠️  Deactivated orphaned User: {user.email}")
                        
                    except Exception as e:
                        error_msg = f"Failed to deactivate user {user.email}: {str(e)}"
                        print(f"   ❌ {error_msg}")
                        repair_results['errors'].append(error_msg)
                
                # Commit deactivations
                try:
                    session.commit()
                    print(f"   ✅ Successfully deactivated {repair_results['deactivated_users']} orphaned User accounts")
                except Exception as e:
                    session.rollback()
                    error_msg = f"Failed to commit user deactivations: {str(e)}"
                    print(f"   ❌ {error_msg}")
                    repair_results['errors'].append(error_msg)
            else:
                print("   ✅ No orphaned User accounts found")
        
            # 3. Fix email case sensitivity issues
            print("\n📋 Step 3: Normalizing email case sensitivity...")
            
            case_issues = session.exec(
                select(Staff, User)
                .select_from(Staff)
                .join(User, func.lower(Staff.email) == func.lower(User.email))
                .where(
                    Staff.email != User.email,  # Different case
                    Staff.is_active == True,
                    User.is_active == True
                )
            ).all()
            
            if case_issues:
                print(f"   Found {len(case_issues)} email case mismatches")
                
                for staff, user in case_issues:
                    try:
                        # Normalize to lowercase
                        normalized_email = staff.email.lower().strip()
                        
                        print(f"   🔄 Normalizing: Staff='{staff.email}' User='{user.email}' -> '{normalized_email}'")
                        
                        staff.email = normalized_email
                        user.email = normalized_email
                        repair_results['normalized_emails'] += 1
                        
                    except Exception as e:
                        error_msg = f"Failed to normalize emails for {staff.full_name}: {str(e)}"
                        print(f"   ❌ {error_msg}")
                        repair_results['errors'].append(error_msg)
                
                # Commit normalizations
                try:
                    session.commit()
                    print(f"   ✅ Successfully normalized {repair_results['normalized_emails']} email pairs")
                except Exception as e:
                    session.rollback()
                    error_msg = f"Failed to commit email normalizations: {str(e)}"
                    print(f"   ❌ {error_msg}")
                    repair_results['errors'].append(error_msg)
            else:
                print("   ✅ No email case sensitivity issues found")
        
            # 4. Handle duplicate emails in staff table
            print("\n📋 Step 4: Checking for duplicate staff emails...")
            
            duplicate_emails = session.exec(
                select(Staff.email, func.count(Staff.id).label('count'))
                .where(Staff.is_active == True)
                .group_by(Staff.email)
                .having(func.count(Staff.id) > 1)
            ).all()
            
            if duplicate_emails:
                print(f"   ⚠️  Found {len(duplicate_emails)} duplicate email addresses:")
                for email, count in duplicate_emails:
                    print(f"     • {email}: {count} staff records")
                    
                    # Get details of duplicate staff
                    duplicate_staff = session.exec(
                        select(Staff)
                        .where(Staff.email == email, Staff.is_active == True)
                        .order_by(Staff.id)  # Keep oldest record active
                    ).all()
                    
                    # Deactivate all but the first one
                    for i, staff in enumerate(duplicate_staff[1:], 1):
                        try:
                            print(f"       - Deactivating duplicate #{i}: {staff.full_name} (ID: {staff.id})")
                            staff.is_active = False
                            repair_results['deactivated_users'] += 1
                        except Exception as e:
                            error_msg = f"Failed to deactivate duplicate staff {staff.id}: {str(e)}"
                            print(f"       ❌ {error_msg}")
                            repair_results['errors'].append(error_msg)
                
                try:
                    session.commit()
                    print("   ✅ Resolved duplicate email issues")
                except Exception as e:
                    session.rollback()
                    error_msg = f"Failed to resolve duplicates: {str(e)}"
                    print(f"   ❌ {error_msg}")
                    repair_results['errors'].append(error_msg)
            else:
                print("   ✅ No duplicate emails found")
        
            # 5. Final verification
            print("\n📋 Step 5: Final verification...")
            
            # Count remaining issues
            remaining_staff_without_users = session.exec(
                select(func.count(Staff.id))
                .where(
                    Staff.is_active == True,
                    ~exists().where(func.lower(User.email) == func.lower(Staff.email))
                )
            ).scalar()
            
            remaining_users_without_staff = session.exec(
                select(func.count(User.id))
                .where(
                    User.is_manager == False,
                    User.is_active == True,
                    ~exists().where(
                        func.lower(Staff.email) == func.lower(User.email),
                        Staff.is_active == True
                    )
                )
            ).scalar()
            
            print(f"   📊 Verification results:")
            print(f"     • Active staff without users: {remaining_staff_without_users}")
            print(f"     • Active non-manager users without staff: {remaining_users_without_staff}")
            
            if remaining_staff_without_users == 0 and remaining_users_without_staff == 0:
                print("   🎉 All user-staff mappings are now consistent!")
            else:
                print("   ⚠️  Some issues remain - may need manual intervention")
        
        except Exception as e:
            error_msg = f"Repair process failed: {str(e)}"
            print(f"❌ {error_msg}")
            repair_results['errors'].append(error_msg)
            session.rollback()
        
        # Summary
        print(f"\n" + "=" * 50)
        print(f"📊 REPAIR SUMMARY:")
        print(f"   ✅ Created User accounts: {repair_results['created_users']}")
        print(f"   ⚠️  Deactivated orphaned Users: {repair_results['deactivated_users']}")
        print(f"   🔄 Normalized email cases: {repair_results['normalized_emails']}")
        print(f"   ❌ Errors encountered: {len(repair_results['errors'])}")
        
        if repair_results['errors']:
            print(f"\n❌ ERRORS:")
            for error in repair_results['errors']:
                print(f"   • {error}")
        
        # Save repair results
        repair_results['repair_timestamp'] = datetime.utcnow().isoformat()
        with open('user_staff_repair_results.json', 'w') as f:
            json.dump(repair_results, f, indent=2, default=str)
        
        print(f"\n💾 Repair results saved to: user_staff_repair_results.json")
        
        return repair_results

def create_test_user_for_staff(staff_email: str, staff_name: str, tenant_id: str):
    """Helper function to create a single test user for a staff member"""
    
    with Session(engine) as session:
        try:
            # Check if user already exists
            existing_user = session.exec(
                select(User).where(func.lower(User.email) == func.lower(staff_email))
            ).first()
            
            if existing_user:
                print(f"✅ User already exists for {staff_email}")
                return existing_user
            
            # Create new user
            new_user = User(
                email=staff_email.strip(),
                hashed_password=hash_password("staff123"),
                is_manager=False,
                is_active=True,
                tenant_id=tenant_id
            )
            
            session.add(new_user)
            session.commit()
            session.refresh(new_user)
            
            print(f"✅ Created User account for {staff_name} ({staff_email})")
            return new_user
            
        except Exception as e:
            print(f"❌ Failed to create user for {staff_email}: {e}")
            session.rollback()
            return None

if __name__ == "__main__":
    try:
        print("🚀 Starting User-Staff Mapping Repair...")
        results = repair_user_staff_mapping()
        
        if len(results['errors']) == 0:
            print(f"\n🎉 REPAIR SUCCESSFUL!")
            print(f"   Your user-staff mapping has been fixed.")
            print(f"   You can now safely apply database constraints.")
            print(f"\n⚡ NEXT STEPS:")
            print(f"   1. Run audit again to verify fixes")
            print(f"   2. Apply database constraint migration")
            print(f"   3. Test notification system")
        else:
            print(f"\n⚠️  REPAIR COMPLETED WITH ERRORS")
            print(f"   Some issues may require manual intervention.")
            print(f"   Check the error log above and repair_results.json")
            
    except Exception as e:
        print(f"❌ Repair script failed: {e}")
        import traceback
        traceback.print_exc()