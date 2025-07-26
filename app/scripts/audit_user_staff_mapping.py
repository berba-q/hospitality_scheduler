# app/scripts/audit_user_staff_mapping.py
# Audit script to check user-staff mapping issues in the database
# This script identifies inconsistencies between User and Staff records,
# such as missing mappings, duplicate emails, and invalid notifications.

from sqlmodel import Session, exists, select, func
from app.models import User, Staff, Notification, Facility
from app.deps import engine  # ✅ FIXED: Import from correct location
from datetime import datetime, timedelta
import json

def audit_user_staff_mapping():
    """Audit current user-staff mapping issues"""
    
    with Session(engine) as session:
        print("🔍 AUDITING USER-STAFF MAPPING ISSUES...")
        print("=" * 50)
        
        issues_found = 0
        report_data = {}
        
        # 1. Find Staff records without corresponding User accounts
        print("\n📋 1. STAFF WITHOUT USER ACCOUNTS:")
        staff_without_users = session.exec(
            select(Staff.id, Staff.email, Staff.full_name, Staff.facility_id, Staff.is_active)
            .where(
                Staff.is_active == True,  # Only check active staff
                ~exists().where(func.lower(User.email) == func.lower(Staff.email))
            )
        ).all()
        
        report_data['staff_without_users'] = len(staff_without_users)
        if staff_without_users:
            issues_found += len(staff_without_users)
            print(f" Found {len(staff_without_users)} active staff without user accounts:")
            for staff in staff_without_users:
                # Get facility name for better reporting
                facility = session.get(Facility, staff.facility_id)
                facility_name = facility.name if facility else "Unknown Facility"
                print(f"   • Staff ID {staff.id}: {staff.full_name} ({staff.email}) at {facility_name}")
        else:
            print("✅ All active staff have user accounts")
        
        # 2. Find User accounts without Staff records (non-managers)
        print("\n 2. NON-MANAGER USERS WITHOUT STAFF RECORDS:")
        users_without_staff = session.exec(
            select(User.id, User.email, User.is_manager, User.is_active)
            .where(
                User.is_manager == False,
                User.is_active == True,  # Only check active users
                ~exists().where(func.lower(Staff.email) == func.lower(User.email))
            )
        ).all()
        
        report_data['users_without_staff'] = len(users_without_staff)
        if users_without_staff:
            issues_found += len(users_without_staff)
            print(f" Found {len(users_without_staff)} non-manager users without staff records:")
            for user in users_without_staff:
                status = "ACTIVE" if user.is_active else "INACTIVE"
                print(f"   • User ID {user.id}: {user.email} ({status})")
        else:
            print(" All non-manager users have staff records")
        
        # 3. Find duplicate email patterns
        print("\n📋 3. DUPLICATE STAFF EMAILS:")
        duplicate_emails = session.exec(
            select(Staff.email, func.count(Staff.id).label('staff_count'))
            .where(Staff.is_active == True)  # Only active staff
            .group_by(Staff.email)
            .having(func.count(Staff.id) > 1)
        ).all()
        
        report_data['duplicate_emails'] = len(duplicate_emails)
        if duplicate_emails:
            issues_found += len(duplicate_emails)
            print(f"⚠️  Found {len(duplicate_emails)} duplicate emails in active staff:")
            for email, count in duplicate_emails:
                print(f"   • {email}: {count} staff records")
                
                # Show details of duplicate staff
                duplicate_staff = session.exec(
                    select(Staff.id, Staff.full_name, Staff.facility_id)
                    .where(Staff.email == email, Staff.is_active == True)
                ).all()
                
                for staff in duplicate_staff:
                    facility = session.get(Facility, staff.facility_id)
                    facility_name = facility.name if facility else "Unknown"
                    print(f"     - ID {staff.id}: {staff.full_name} at {facility_name}")
        else:
            print("✅ No duplicate emails in staff table")
        
        # 4. Find recent notifications with potential wrong recipient_user_id
        print("\n📋 4. RECENT NOTIFICATIONS WITH INVALID RECIPIENTS:")
        cutoff_date = datetime.utcnow() - timedelta(days=7)  # Last 7 days
        
        recent_notifications = session.exec(
            select(Notification)
            .where(Notification.created_at >= cutoff_date)
            .order_by(Notification.created_at.desc())
            .limit(100)  # Check last 100 notifications
        ).all()
        
        mismatched_notifications = []
        for notif in recent_notifications:
            # Check if recipient_user_id actually exists and is active
            user = session.get(User, notif.recipient_user_id)
            if not user or not user.is_active:
                mismatched_notifications.append({
                    'notification_id': str(notif.id),
                    'recipient_user_id': str(notif.recipient_user_id),
                    'notification_type': str(notif.notification_type),
                    'title': notif.title,
                    'created_at': notif.created_at.isoformat(),
                    'user_exists': user is not None,
                    'user_active': user.is_active if user else False
                })
        
        report_data['invalid_notifications'] = len(mismatched_notifications)
        if mismatched_notifications:
            issues_found += len(mismatched_notifications)
            print(f"❌ Found {len(mismatched_notifications)} recent notifications with invalid recipients:")
            for notif in mismatched_notifications:
                user_status = "exists but inactive" if notif['user_exists'] and not notif['user_active'] else "does not exist"
                print(f"   • {notif['created_at'][:19]}: '{notif['title']}' -> user {notif['recipient_user_id']} ({user_status})")
        else:
            print("✅ All recent notifications have valid active recipients")
        
        # 5. Check for email case sensitivity issues
        print("\n📋 5. EMAIL CASE SENSITIVITY ISSUES:")
        case_issues = session.exec(
            select(Staff.email.label('staff_email'), User.email.label('user_email'), 
                   Staff.full_name, Staff.id.label('staff_id'), User.id.label('user_id'))
            .select_from(Staff)
            .join(User, func.lower(Staff.email) == func.lower(User.email))
            .where(
                Staff.email != User.email,  # Different case
                Staff.is_active == True,
                User.is_active == True
            )
        ).all()
        
        report_data['case_sensitivity_issues'] = len(case_issues)
        if case_issues:
            issues_found += len(case_issues)
            print(f"⚠️  Found {len(case_issues)} email case mismatches:")
            for issue in case_issues:
                print(f"   • {issue.full_name}: Staff='{issue.staff_email}' vs User='{issue.user_email}'")
        else:
            print("✅ No email case sensitivity issues found")
        
        # 6. Check notification delivery success rate
        print("\n📋 6. NOTIFICATION DELIVERY SUCCESS RATE:")
        if recent_notifications:
            total_recent = len(recent_notifications)
            delivered_count = sum(1 for n in recent_notifications if n.is_delivered)
            success_rate = (delivered_count / total_recent) * 100 if total_recent > 0 else 0
            
            print(f"📊 Last {total_recent} notifications:")
            print(f"   • Delivered: {delivered_count}")
            print(f"   • Success rate: {success_rate:.1f}%")
            
            if success_rate < 80:
                print("⚠️  Low delivery success rate - may indicate user mapping issues")
                issues_found += 1
            else:
                print("✅ Good delivery success rate")
            
            report_data['delivery_success_rate'] = success_rate
        else:
            print("📊 No recent notifications to analyze")
            report_data['delivery_success_rate'] = 0
        
        # 7. Summary and recommendations
        print(f"\n" + "=" * 50)
        print(f"📊 AUDIT SUMMARY:")
        print(f"   Total Issues Found: {issues_found}")
        report_data['total_issues'] = issues_found
        
        if issues_found == 0:
            print("🎉 NO ISSUES FOUND!")
            print("   Your user-staff mapping is clean.")
            print("   You can still add protective constraints for future safety.")
        else:
            print(f"⚠️  {issues_found} issues detected that need attention:")
            
            recommendations = []
            if report_data['staff_without_users'] > 0:
                recommendations.append("Create User accounts for Staff without them")
            if report_data['users_without_staff'] > 0:
                recommendations.append("Deactivate or link orphaned User accounts")
            if report_data['duplicate_emails'] > 0:
                recommendations.append("Resolve duplicate email addresses")
            if report_data['invalid_notifications'] > 0:
                recommendations.append("Fix notifications sent to invalid users")
            if report_data['case_sensitivity_issues'] > 0:
                recommendations.append("Normalize email case consistency")
            
            print("\n🔧 RECOMMENDED ACTIONS:")
            for i, rec in enumerate(recommendations, 1):
                print(f"   {i}. {rec}")
        
        # Save detailed report
        report_data.update({
            'audit_timestamp': datetime.utcnow().isoformat(),
            'total_staff': session.scalar(select(func.count(Staff.id)).where(Staff.is_active == True)),
            'total_users': session.scalar(select(func.count(User.id)).where(User.is_active == True)),
            'total_notifications_checked': len(recent_notifications)
        })
        
        # Save to JSON file
        with open('user_staff_audit_report.json', 'w') as f:
            json.dump(report_data, f, indent=2, default=str)
        
        print(f"\n💾 Detailed report saved to: user_staff_audit_report.json")
        
        return report_data

if __name__ == "__main__":
    try:
        results = audit_user_staff_mapping()
        
        if results['total_issues'] > 0:
            print(f"\n⚡ NEXT STEPS:")
            print(f"   1. Run: python app/scripts/repair_user_staff_mapping.py")
            print(f"   2. Apply database constraints migration")
            print(f"   3. Test notification system")
        else:
            print(f"\n SYSTEM HEALTHY - Ready for constraint migration")
            
    except Exception as e:
        print(f"❌ Audit failed with error: {e}")
        import traceback
        traceback.print_exc()