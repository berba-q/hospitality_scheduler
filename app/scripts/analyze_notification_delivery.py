# app/scripts/analyze_notification_delivery.py
# Detailed report of who notifications were sent to and if they're correct

from sqlmodel import Session, select, text
from app.models import Notification, User, Staff, SwapRequest, Schedule, Facility
from app.deps import engine
from datetime import datetime, timedelta
import json
from typing import Dict, Any, List

def analyze_recent_notifications(hours_back: int = 24, limit: int = 50):
    """Analyze recent notifications to check for user ID mismatches"""
    
    with Session(engine) as session:
        print("🔍 ANALYZING NOTIFICATION DELIVERY")
        print("=" * 60)
        
        # Get recent notifications
        cutoff_time = datetime.utcnow() - timedelta(hours=hours_back)
        
        recent_notifications = session.exec(
            select(Notification)
            .where(Notification.created_at >= cutoff_time)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        ).all()
        
        if not recent_notifications:
            print(f"❌ No notifications found in the last {hours_back} hours")
            return
        
        print(f"📊 Found {len(recent_notifications)} notifications in the last {hours_back} hours")
        print(f"📅 Time range: {cutoff_time.strftime('%Y-%m-%d %H:%M')} to {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}")
        
        analysis_results = []
        issues_found = 0
        
        for i, notif in enumerate(recent_notifications, 1):
            print(f"\n📧 NOTIFICATION #{i} - {notif.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"   ID: {notif.id}")
            print(f"   Type: {notif.notification_type}")
            print(f"   Title: {notif.title}")
            
            # Get recipient user info
            recipient_user = session.get(User, notif.recipient_user_id)
            
            analysis = {
                'notification_id': str(notif.id),
                'created_at': notif.created_at.isoformat(),
                'type': str(notif.notification_type),
                'title': notif.title,
                'message': notif.message,
                'recipient_user_id': str(notif.recipient_user_id),
                'recipient_exists': recipient_user is not None,
                'recipient_email': recipient_user.email if recipient_user else "USER NOT FOUND",
                'recipient_is_active': recipient_user.is_active if recipient_user else False,
                'recipient_is_manager': recipient_user.is_manager if recipient_user else False,
                'channels': notif.channels,
                'delivered': notif.is_delivered,
                'read': notif.is_read,
                'issues': [],
                'context': {}
            }
            
            # Check recipient validity
            if not recipient_user:
                analysis['issues'].append("CRITICAL: Recipient user does not exist")
                issues_found += 1
                print(f"   ❌ RECIPIENT: User ID {notif.recipient_user_id} NOT FOUND")
            elif not recipient_user.is_active:
                analysis['issues'].append("WARNING: Recipient user is inactive")
                issues_found += 1
                print(f"   ⚠️  RECIPIENT: {recipient_user.email} (INACTIVE)")
            else:
                print(f"   ✅ RECIPIENT: {recipient_user.email} ({'Manager' if recipient_user.is_manager else 'Staff'})")
            
            # Analyze notification context based on type
            context_analysis = analyze_notification_context(session, notif, recipient_user)
            analysis['context'] = context_analysis
            
            if context_analysis.get('issues'):
                analysis['issues'].extend(context_analysis['issues'])
                issues_found += len(context_analysis['issues'])
            
            # Print context analysis
            if context_analysis.get('expected_recipient'):
                print(f"   📋 CONTEXT: {context_analysis['description']}")
                print(f"   🎯 EXPECTED: {context_analysis['expected_recipient']}")
                
                if context_analysis.get('recipient_correct'):
                    print(f"   ✅ ROUTING: Correct recipient")
                else:
                    print(f"   ❌ ROUTING: Wrong recipient!")
                    analysis['issues'].append("CRITICAL: Notification sent to wrong recipient")
                    issues_found += 1
            
            # Check delivery status
            print(f"   📤 DELIVERY: {'✅ Delivered' if notif.is_delivered else '❌ Failed'}")
            print(f"   👁️  READ: {'✅ Read' if notif.is_read else '📬 Unread'}")
            
            if notif.delivery_status:
                for channel, status in notif.delivery_status.items():
                    channel_status = status.get('status', 'unknown')
                    print(f"      {channel}: {channel_status}")
            
            analysis_results.append(analysis)
        
        # Summary analysis
        print(f"\n" + "=" * 60)
        print(f"📊 SUMMARY ANALYSIS:")
        print(f"   Total notifications analyzed: {len(recent_notifications)}")
        print(f"   Issues found: {issues_found}")
        
        # Categorize issues
        critical_issues = [n for n in analysis_results if any('CRITICAL' in issue for issue in n['issues'])]
        warning_issues = [n for n in analysis_results if any('WARNING' in issue for issue in n['issues'])]
        
        print(f"   Critical issues: {len(critical_issues)}")
        print(f"   Warning issues: {len(warning_issues)}")
        
        # Delivery rate analysis
        delivered_count = sum(1 for n in recent_notifications if n.is_delivered)
        read_count = sum(1 for n in recent_notifications if n.is_read)
        
        delivery_rate = (delivered_count / len(recent_notifications)) * 100
        read_rate = (read_count / len(recent_notifications)) * 100
        
        print(f"   Delivery rate: {delivery_rate:.1f}%")
        print(f"   Read rate: {read_rate:.1f}%")
        
        # Notification type breakdown
        type_counts = {}
        for notif in recent_notifications:
            notif_type = str(notif.notification_type)
            type_counts[notif_type] = type_counts.get(notif_type, 0) + 1
        
        print(f"\n📊 NOTIFICATION TYPES:")
        for notif_type, count in sorted(type_counts.items()):
            print(f"   {notif_type}: {count}")
        
        # Critical issues details
        if critical_issues:
            print(f"\n🚨 CRITICAL ISSUES FOUND:")
            for issue in critical_issues:
                print(f"   • {issue['created_at'][:19]}: {issue['type']} -> {issue['recipient_email']}")
                for problem in issue['issues']:
                    if 'CRITICAL' in problem:
                        print(f"     ❌ {problem}")
        
        # Save detailed report
        report_data = {
            'analysis_timestamp': datetime.utcnow().isoformat(),
            'hours_analyzed': hours_back,
            'total_notifications': len(recent_notifications),
            'issues_found': issues_found,
            'critical_issues': len(critical_issues),
            'warning_issues': len(warning_issues),
            'delivery_rate': delivery_rate,
            'read_rate': read_rate,
            'type_breakdown': type_counts,
            'detailed_analysis': analysis_results
        }
        
        with open('notification_delivery_analysis.json', 'w') as f:
            json.dump(report_data, f, indent=2, default=str)
        
        print(f"\n💾 Detailed report saved to: notification_delivery_analysis.json")
        
        return report_data

def analyze_notification_context(session: Session, notification: Notification, recipient_user: User) -> Dict[str, Any]:
    """Analyze the context of a notification to determine if it was sent to the right person"""
    
    context = {
        'description': 'Unknown context',
        'expected_recipient': 'Unknown',
        'recipient_correct': None,
        'issues': []
    }
    
    try:
        notif_type = str(notification.notification_type)
        
        # Analyze swap-related notifications
        if 'SWAP' in notif_type or 'ASSIGNMENT' in notif_type:
            context.update(analyze_swap_notification_context(session, notification, recipient_user))
        
        # Analyze schedule notifications
        elif 'SCHEDULE' in notif_type:
            context.update(analyze_schedule_notification_context(session, notification, recipient_user))
        
        # Analyze emergency notifications
        elif 'EMERGENCY' in notif_type:
            context.update(analyze_emergency_notification_context(session, notification, recipient_user))
    
    except Exception as e:
        context['issues'].append(f"ERROR: Failed to analyze context - {str(e)}")
    
    return context

def analyze_swap_notification_context(session: Session, notification: Notification, recipient_user: User) -> Dict[str, Any]:
    """Analyze swap-related notification context"""
    
    context = {}
    
    # Try to find related swap request from notification data
    swap_id = None
    if notification.action_url and '/swaps/' in notification.action_url:
        try:
            swap_id = notification.action_url.split('/swaps/')[1].split('/')[0]
        except:
            pass
    
    if not swap_id and notification.data:
        swap_id = notification.data.get('swap_id')
    
    if swap_id:
        try:
            swap_request = session.get(SwapRequest, swap_id)
            if swap_request:
                context.update(analyze_swap_request_routing(session, notification, swap_request, recipient_user))
            else:
                context['description'] = f"Swap notification (swap not found: {swap_id})"
                context['issues'] = ["WARNING: Referenced swap request not found"]
        except Exception as e:
            context['description'] = f"Swap notification (error loading swap: {str(e)})"
            context['issues'] = [f"ERROR: {str(e)}"]
    else:
        context['description'] = "Swap notification (no swap ID found)"
        context['issues'] = ["WARNING: Cannot validate routing - no swap ID"]
    
    return context

def analyze_swap_request_routing(session: Session, notification: Notification, swap_request: SwapRequest, recipient_user: User) -> Dict[str, Any]:
    """Analyze if a swap notification was sent to the correct person"""
    
    notif_type = str(notification.notification_type)
    
    # Get staff involved in the swap
    requesting_staff = session.get(Staff, swap_request.requesting_staff_id) if swap_request.requesting_staff_id else None
    target_staff = session.get(Staff, swap_request.target_staff_id) if swap_request.target_staff_id else None
    assigned_staff = session.get(Staff, swap_request.assigned_staff_id) if swap_request.assigned_staff_id else None
    
    # Get facility managers
    schedule = session.get(Schedule, swap_request.schedule_id)
    facility = session.get(Facility, schedule.facility_id) if schedule else None
    
    context = {
        'description': f"{notif_type} for swap {swap_request.id}",
        'swap_type': swap_request.swap_type,
        'swap_status': str(swap_request.status),
        'requesting_staff': requesting_staff.full_name if requesting_staff else "Unknown",
        'target_staff': target_staff.full_name if target_staff else None,
        'assigned_staff': assigned_staff.full_name if assigned_staff else None,
        'facility': facility.name if facility else "Unknown"
    }
    
    # Determine who should receive this notification type
    expected_recipients = []
    
    if notif_type == 'NotificationType.SWAP_REQUEST':
        if swap_request.swap_type == 'specific' and target_staff:
            expected_recipients.append(f"{target_staff.full_name} (target staff)")
        expected_recipients.append("Facility managers")
    
    elif notif_type == 'NotificationType.SWAP_ASSIGNMENT':
        if assigned_staff:
            expected_recipients.append(f"{assigned_staff.full_name} (assigned staff)")
    
    elif notif_type == 'NotificationType.SWAP_APPROVED':
        if requesting_staff:
            expected_recipients.append(f"{requesting_staff.full_name} (requesting staff)")
    
    elif notif_type == 'NotificationType.SWAP_DENIED':
        if requesting_staff:
            expected_recipients.append(f"{requesting_staff.full_name} (requesting staff)")
    
    elif notif_type == 'NotificationType.EMERGENCY_COVERAGE':
        expected_recipients.append("Facility managers")
    
    context['expected_recipients'] = expected_recipients
    
    # Check if current recipient is correct
    recipient_correct = False
    recipient_role = "Unknown"
    
    if recipient_user:
        if recipient_user.is_manager:
            recipient_role = "Manager"
            # Managers should receive most swap notifications
            if any("manager" in exp.lower() for exp in expected_recipients):
                recipient_correct = True
        else:
            # Check if recipient matches expected staff
            recipient_staff = session.exec(
                select(Staff).where(Staff.email == recipient_user.email)
            ).first()
            
            if recipient_staff:
                recipient_role = f"Staff ({recipient_staff.full_name})"
                
                # Check if this staff member should receive this notification
                for expected in expected_recipients:
                    if recipient_staff.full_name in expected:
                        recipient_correct = True
                        break
    
    context['recipient_role'] = recipient_role
    context['recipient_correct'] = recipient_correct
    context['expected_recipient'] = ", ".join(expected_recipients) if expected_recipients else "Unknown"
    
    if not recipient_correct and expected_recipients:
        context['issues'] = [f"CRITICAL: Should go to {context['expected_recipient']} but sent to {recipient_role}"]
    
    return context

def analyze_schedule_notification_context(session: Session, notification: Notification, recipient_user: User) -> Dict[str, Any]:
    """Analyze schedule-related notification context"""
    
    return {
        'description': f"Schedule notification",
        'expected_recipient': "Staff members or managers",
        'recipient_correct': True,  # Schedule notifications are generally broadcast
    }

def analyze_emergency_notification_context(session: Session, notification: Notification, recipient_user: User) -> Dict[str, Any]:
    """Analyze emergency notification context"""
    
    return {
        'description': "Emergency coverage notification",
        'expected_recipient': "Facility managers",
        'recipient_correct': recipient_user.is_manager if recipient_user else False,
        'issues': [] if (recipient_user and recipient_user.is_manager) else ["CRITICAL: Emergency notification sent to non-manager"]
    }

def check_pending_final_approvals():
    """Specifically check for final approval notifications that might be missing"""
    
    with Session(engine) as session:
        print("\n🔍 CHECKING FINAL APPROVAL NOTIFICATIONS")
        print("=" * 50)
        
        # Find swaps that need final approval
        final_approval_swaps = session.exec(
            select(SwapRequest)
            .where(SwapRequest.status == 'manager_final_approval')
        ).all()
        
        print(f"📊 Found {len(final_approval_swaps)} swaps needing final approval")
        
        for swap in final_approval_swaps:
            print(f"\n🎯 SWAP {swap.id} - Needs Final Approval")
            print(f"   Created: {swap.created_at}")
            print(f"   Type: {swap.swap_type}")
            print(f"   Status: {swap.status}")
            
            # Check if final approval notifications were sent
            final_approval_notifications = session.exec(
                select(Notification)
                .where(
                    Notification.action_url.like(f"%/swaps/{swap.id}%"),
                    Notification.created_at >= swap.created_at
                )
            ).all()
            
            print(f"   📧 Related notifications: {len(final_approval_notifications)}")
            
            if not final_approval_notifications:
                print(f"   ❌ NO NOTIFICATIONS FOUND for final approval!")
            else:
                for notif in final_approval_notifications:
                    recipient = session.get(User, notif.recipient_user_id)
                    print(f"      • {notif.notification_type} -> {recipient.email if recipient else 'UNKNOWN USER'}")

if __name__ == "__main__":
    import sys
    
    hours = 24
    if len(sys.argv) > 1:
        try:
            hours = int(sys.argv[1])
        except ValueError:
            print("Usage: python analyze_notification_delivery.py [hours_back]")
            sys.exit(1)
    
    try:
        print(f"🚀 Analyzing notifications from the last {hours} hours...")
        results = analyze_recent_notifications(hours_back=hours)
        
        # Also check specific final approval issues
        check_pending_final_approvals()
        
        if results and results['critical_issues'] > 0:
            print(f"\n🚨 ATTENTION: {results['critical_issues']} critical notification routing issues found!")
            print(f"   This confirms user ID mismatches are still occurring.")
            print(f"   Check the detailed report for specific problems.")
        elif results:
            print(f"\n✅ Analysis complete - {results['issues_found']} total issues found")
        
    except Exception as e:
        print(f"❌ Analysis failed: {e}")
        import traceback
        traceback.print_exc()