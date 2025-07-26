# app/scripts/quick_notification_check.py
# Quick check for the last few notifications to see routing issues

from sqlmodel import Session, select
from app.models import Notification, User, Staff, SwapRequest
from app.deps import engine
from datetime import datetime, timedelta

def quick_notification_check():
    """Quick check of the last 10 notifications to see who they went to"""
    
    with Session(engine) as session:
        print("🔍 QUICK NOTIFICATION CHECK - Last 10 Notifications")
        print("=" * 60)
        
        # Get last 10 notifications
        recent_notifications = session.exec(
            select(Notification)
            .order_by(Notification.created_at.desc())
            .limit(10)
        ).all()
        
        if not recent_notifications:
            print("❌ No notifications found")
            return
        
        print(f"📧 Found {len(recent_notifications)} recent notifications:\n")
        
        for i, notif in enumerate(recent_notifications, 1):
            print(f"#{i} - {notif.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"    Type: {notif.notification_type}")
            print(f"    Title: {notif.title}")
            
            # Check recipient
            recipient = session.get(User, notif.recipient_user_id)
            if recipient:
                role = "Manager" if recipient.is_manager else "Staff"
                status = "Active" if recipient.is_active else "INACTIVE"
                print(f"    Sent to: {recipient.email} ({role}, {status})")
                
                # If it's a staff member, show their staff details
                if not recipient.is_manager:
                    staff = session.exec(
                        select(Staff).where(Staff.email == recipient.email)
                    ).first()
                    if staff:
                        print(f"    Staff: {staff.full_name}")
                    else:
                        print(f"    ⚠️  No staff record found for this user!")
            else:
                print(f"    ❌ SENT TO NON-EXISTENT USER: {notif.recipient_user_id}")
            
            # Check if it's a swap notification
            if 'SWAP' in str(notif.notification_type):
                swap_id = None
                if notif.action_url and '/swaps/' in notif.action_url:
                    try:
                        swap_id = notif.action_url.split('/swaps/')[1].split('/')[0]
                        swap = session.get(SwapRequest, swap_id)
                        if swap:
                            requesting_staff = session.get(Staff, swap.requesting_staff_id)
                            print(f"    Swap: {swap.swap_type} by {requesting_staff.full_name if requesting_staff else 'Unknown'}")
                            
                            if swap.target_staff_id:
                                target_staff = session.get(Staff, swap.target_staff_id)
                                print(f"    Target: {target_staff.full_name if target_staff else 'Unknown'}")
                            
                            if swap.assigned_staff_id:
                                assigned_staff = session.get(Staff, swap.assigned_staff_id)
                                print(f"    Assigned: {assigned_staff.full_name if assigned_staff else 'Unknown'}")
                    except:
                        print(f"    ⚠️  Could not parse swap ID from action URL")
            
            print(f"    Delivered: {'✅' if notif.is_delivered else '❌'}")
            print(f"    Read: {'✅' if notif.is_read else '📬'}")
            print()

def check_final_approval_notifications():
    """Check specifically for final approval notifications"""
    
    with Session(engine) as session:
        print("🎯 CHECKING FINAL APPROVAL NOTIFICATIONS")
        print("=" * 40)
        
        # Find swaps awaiting final approval
        final_approval_swaps = session.exec(
            select(SwapRequest)
            .where(SwapRequest.status == 'manager_final_approval')
        ).all()
        
        print(f"Found {len(final_approval_swaps)} swaps needing final approval:")
        
        for swap in final_approval_swaps:
            print(f"\n📋 Swap {swap.id} - {swap.swap_type}")
            print(f"   Status: {swap.status}")
            print(f"   Created: {swap.created_at}")
            
            # Look for related notifications
            related_notifications = session.exec(
                select(Notification)
                .where(Notification.action_url.contains(str(swap.id)))
                .order_by(Notification.created_at.desc())
            ).all()
            
            print(f"   📧 Related notifications: {len(related_notifications)}")
            
            if related_notifications:
                for notif in related_notifications[-3:]:  # Show last 3
                    recipient = session.get(User, notif.recipient_user_id)
                    recipient_email = recipient.email if recipient else "UNKNOWN USER"
                    print(f"      • {notif.created_at.strftime('%m-%d %H:%M')} - {notif.notification_type} -> {recipient_email}")
            else:
                print(f"      ❌ NO NOTIFICATIONS FOUND!")

def check_manager_notifications():
    """Check what notifications managers are actually receiving"""
    
    with Session(engine) as session:
        print("👔 CHECKING MANAGER NOTIFICATIONS")
        print("=" * 35)
        
        # Get all managers
        managers = session.exec(
            select(User).where(User.is_manager == True, User.is_active == True)
        ).all()
        
        print(f"Found {len(managers)} active managers:")
        
        for manager in managers:
            # Get their recent notifications
            recent_notifications = session.exec(
                select(Notification)
                .where(Notification.recipient_user_id == manager.id)
                .order_by(Notification.created_at.desc())
                .limit(5)
            ).all()
            
            print(f"\n📧 {manager.email}:")
            print(f"   Recent notifications: {len(recent_notifications)}")
            
            if recent_notifications:
                for notif in recent_notifications:
                    print(f"      • {notif.created_at.strftime('%m-%d %H:%M')} - {notif.notification_type}")
            else:
                print(f"      ❌ No recent notifications!")

if __name__ == "__main__":
    try:
        quick_notification_check()
        print("\n" + "="*60)
        check_final_approval_notifications()
        print("\n" + "="*60)
        check_manager_notifications()
        
    except Exception as e:
        print(f"❌ Check failed: {e}")
        import traceback
        traceback.print_exc()