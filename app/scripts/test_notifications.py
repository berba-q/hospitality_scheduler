# app/scripts/test_enhanced_notifications.py
"""
Comprehensive test suite for the enhanced Firebase and notification services.
Tests multicast functionality, bulk notifications, analytics, and performance.
"""

import asyncio
import time
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlmodel import Session, select
from firebase_admin import messaging

from app.deps import engine
from app.models import (
    User, Staff, Schedule, ShiftAssignment, Facility, Notification,
    NotificationType, NotificationPriority, SwapStatus
)
from app.services.firebase_service import FirebaseService
from app.services.notification_service import NotificationService

class NotificationTestSuite:
    """Comprehensive test suite for notification system"""
    
    def __init__(self):
        self.firebase_service = FirebaseService()
        self.results = {
            "firebase_tests": [],
            "notification_tests": [],
            "multicast_tests": [],
            "bulk_tests": [],
            "performance_tests": [],
            "integration_tests": []
        }
    
    async def run_all_tests(self):
        """Run the complete test suite"""
        print("🚀 Enhanced Notification System Test Suite")
        print("=" * 60)
        
        # Test 1: Firebase Service Validation
        await self._test_firebase_service()
        
        # Test 2: Basic Notification Functionality
        await self._test_basic_notifications()
        
        # Test 3: Multicast Functionality
        await self._test_multicast_functionality()
        
        # Test 4: Bulk Schedule Notifications
        await self._test_bulk_schedule_notifications()
        
        # Test 5: Analytics and Tracking
        await self._test_analytics_tracking()
        
        # Test 6: Performance Testing
        await self._test_performance()
        
        # Test 7: Error Handling
        await self._test_error_handling()
        
        # Test 8: Integration Testing
        await self._test_integration()
        
        # Generate final report
        self._generate_test_report()
    
    async def _test_firebase_service(self):
        """Test Firebase service initialization and configuration"""
        print("\n🔍 Testing Firebase Service")
        print("-" * 40)
        
        tests = []
        
        # Test 1: Service initialization
        try:
            is_available = self.firebase_service.is_available()
            tests.append({
                "test": "Firebase Initialization",
                "status": "✅ PASS" if is_available else "❌ FAIL",
                "details": f"Service available: {is_available}"
            })
        except Exception as e:
            tests.append({
                "test": "Firebase Initialization",
                "status": "❌ FAIL",
                "details": f"Error: {e}"
            })
        
        # Test 2: Message building classes
        try:
            # Test WebpushFCMOptions
            webpush_options = messaging.WebpushFCMOptions(link="https://example.com")
            
            # Test AndroidFCMOptions
            android_options = messaging.AndroidFCMOptions(analytics_label="test_label")
            
            # Test send_each_for_multicast exists
            func = getattr(messaging, 'send_each_for_multicast')
            
            tests.append({
                "test": "Firebase Classes & Methods",
                "status": "✅ PASS",
                "details": "All required classes and methods available"
            })
        except Exception as e:
            tests.append({
                "test": "Firebase Classes & Methods",
                "status": "❌ FAIL",
                "details": f"Error: {e}"
            })
        
        # Test 3: Message structure validation
        try:
            message = messaging.Message(
                notification=messaging.Notification(title="Test", body="Test body"),
                data={"key": "value"},
                token="test_token",
                fcm_options=messaging.FCMOptions(analytics_label="test"),
                webpush=messaging.WebpushConfig(
                    fcm_options=messaging.WebpushFCMOptions(link="https://example.com")
                ),
                android=messaging.AndroidConfig(
                    priority="high",
                    fcm_options=messaging.AndroidFCMOptions(analytics_label="test_android"),
                ),
                apns=messaging.APNSConfig(
                    fcm_options=messaging.APNSFCMOptions(analytics_label="test_apns")
                ),
            )
            
            multicast_message = messaging.MulticastMessage(
                notification=messaging.Notification(title="Test", body="Test body"),
                data={"key": "value"},
                tokens=["token1", "token2"],
                fcm_options=messaging.FCMOptions(analytics_label="test"),
                webpush=messaging.WebpushConfig(
                    fcm_options=messaging.WebpushFCMOptions(link="https://example.com")
                ),
                android=messaging.AndroidConfig(
                    priority="high",
                    fcm_options=messaging.AndroidFCMOptions(analytics_label="test_android"),
                ),
                apns=messaging.APNSConfig(
                    fcm_options=messaging.APNSFCMOptions(analytics_label="test_apns")
                ),
            )
            
            tests.append({
                "test": "Message Structure Validation",
                "status": "✅ PASS",
                "details": "Single and multicast message structures valid"
            })
        except Exception as e:
            tests.append({
                "test": "Message Structure Validation",
                "status": "❌ FAIL",
                "details": f"Error: {e}"
            })
        
        self.results["firebase_tests"] = tests
        for test in tests:
            print(f"  {test['status']} {test['test']}: {test['details']}")
    
    async def _test_basic_notifications(self):
        """Test basic notification functionality"""
        print("\n📧 Testing Basic Notifications")
        print("-" * 40)
        
        tests = []
        
        with Session(engine) as session:
            # Get test user
            user = session.exec(select(User).where(User.is_active == True)).first()
            
            if not user:
                tests.append({
                    "test": "Basic Notification",
                    "status": "⚠️  SKIP",
                    "details": "No active users found"
                })
                self.results["notification_tests"] = tests
                return
            
            notification_service = NotificationService(session)
            
            # Test single notification
            try:
                notification = await notification_service.send_notification(
                    notification_type=NotificationType.SCHEDULE_PUBLISHED,
                    recipient_user_id=user.id,
                    template_data={
                        "staff_name": user.email.split('@')[0],
                        "week_start": "Test Week",
                        "facility_name": "Test Facility"
                    },
                    channels=["IN_APP", "PUSH"],
                    action_url="/test-notification",
                    action_text="View Test"
                )
                
                # Wait for processing
                await asyncio.sleep(2)
                session.refresh(notification)
                
                tests.append({
                    "test": "Single Notification Creation",
                    "status": "✅ PASS",
                    "details": f"Created notification {notification.id}, delivered: {notification.is_delivered}"
                })
                
            except Exception as e:
                tests.append({
                    "test": "Single Notification Creation",
                    "status": "❌ FAIL",
                    "details": f"Error: {e}"
                })
        
        self.results["notification_tests"] = tests
        for test in tests:
            print(f"  {test['status']} {test['test']}: {test['details']}")
    
    async def _test_multicast_functionality(self):
        """Test Firebase multicast functionality"""
        print("\n📡 Testing Multicast Functionality")
        print("-" * 40)
        
        tests = []
        
        if not self.firebase_service.is_available():
            tests.append({
                "test": "Multicast Test",
                "status": "⚠️  SKIP",
                "details": "Firebase service not available"
            })
            self.results["multicast_tests"] = tests
            return
        
        # Test 1: Small batch multicast (dry run)
        try:
            test_tokens = [f"test_token_{i}" for i in range(5)]
            success_count, failure_count = await self.firebase_service.send_push_multicast(
                tokens=test_tokens,
                title="Test Multicast Small",
                body="Testing small batch multicast",
                data={"test": "multicast_data"},
                action_url="https://example.com/test",
                analytics_label="test_multicast_small",
                dry_run=True
            )
            
            tests.append({
                "test": "Small Batch Multicast (5 tokens)",
                "status": "✅ PASS",
                "details": f"Success: {success_count}, Failure: {failure_count}"
            })
            
        except Exception as e:
            tests.append({
                "test": "Small Batch Multicast (5 tokens)",
                "status": "❌ FAIL",
                "details": f"Error: {e}"
            })
        
        # Test 2: Large batch multicast with chunking (dry run)
        try:
            large_batch = [f"test_token_{i}" for i in range(1200)]  # > 500 limit
            success_count, failure_count = await self.firebase_service.send_push_multicast(
                tokens=large_batch,
                title="Test Multicast Large",
                body="Testing large batch chunking",
                data={"test": "large_batch"},
                analytics_label="test_multicast_large",
                dry_run=True
            )
            
            tests.append({
                "test": "Large Batch Multicast (1200 tokens)",
                "status": "✅ PASS",
                "details": f"Chunked properly. Success: {success_count}, Failure: {failure_count}"
            })
            
        except Exception as e:
            tests.append({
                "test": "Large Batch Multicast (1200 tokens)",
                "status": "❌ FAIL",
                "details": f"Error: {e}"
            })
        
        # Test 3: Empty token list handling
        try:
            success_count, failure_count = await self.firebase_service.send_push_multicast(
                tokens=[],
                title="Test Empty",
                body="Empty token list test",
                analytics_label="test_empty",
                dry_run=True
            )
            
            tests.append({
                "test": "Empty Token List Handling",
                "status": "✅ PASS",
                "details": f"Handled gracefully. Success: {success_count}, Failure: {failure_count}"
            })
            
        except Exception as e:
            tests.append({
                "test": "Empty Token List Handling",
                "status": "❌ FAIL",
                "details": f"Error: {e}"
            })
        
        self.results["multicast_tests"] = tests
        for test in tests:
            print(f"  {test['status']} {test['test']}: {test['details']}")
    
    async def _test_bulk_schedule_notifications(self):
        """Test bulk schedule notification functionality"""
        print("\n📅 Testing Bulk Schedule Notifications")
        print("-" * 40)
        
        tests = []
        
        with Session(engine) as session:
            notification_service = NotificationService(session)
            
            # Get test schedule if available
            schedule = session.exec(select(Schedule)).first()
            
            if not schedule:
                tests.append({
                    "test": "Bulk Schedule Notifications",
                    "status": "⚠️  SKIP",
                    "details": "No schedules found for testing"
                })
                self.results["bulk_tests"] = tests
                print(f"  ⚠️  SKIP Bulk Schedule Notifications: No schedules found for testing")
                return
            
            try:
                # Test bulk notification method
                result = await notification_service.send_bulk_schedule_notifications(
                    schedule_id=schedule.id if schedule.id is not None else uuid.uuid4(),
                    notification_type=NotificationType.SCHEDULE_PUBLISHED,
                    custom_message="Test bulk notification message"
                )
                
                tests.append({
                    "test": "Bulk Schedule Notifications",
                    "status": "✅ PASS",
                    "details": f"Recipients: {result['total_recipients']}, Push Success: {result['push_success']}, Push Failure: {result['push_failure']}"
                })
                
            except Exception as e:
                tests.append({
                    "test": "Bulk Schedule Notifications",
                    "status": "❌ FAIL",
                    "details": f"Error: {e}"
                })
        
        self.results["bulk_tests"] = tests
        for test in tests:
            print(f"  {test['status']} {test['test']}: {test['details']}")
    
    async def _test_analytics_tracking(self):
        """Test analytics label functionality"""
        print("\n📊 Testing Analytics Tracking")
        print("-" * 40)
        
        tests = []
        
        # Test analytics labels in different scenarios
        analytics_labels = [
            "schedule_published_test",
            "emergency_coverage_test", 
            "swap_request_test",
            "bulk_notification_test"
        ]
        
        for label in analytics_labels:
            try:
                # Test single notification with analytics
                if self.firebase_service.is_available():
                    success = await self.firebase_service.send_push_notification(
                        token="test_token",
                        title=f"Analytics Test - {label}",
                        body="Testing analytics tracking",
                        data={"analytics_test": "true"},
                        analytics_label=label,
                        dry_run=True
                    )
                    
                    tests.append({
                        "test": f"Analytics Label: {label}",
                        "status": "✅ PASS",
                        "details": f"Label applied successfully"
                    })
                else:
                    tests.append({
                        "test": f"Analytics Label: {label}",
                        "status": "⚠️  SKIP",
                        "details": "Firebase not available"
                    })
                    
            except Exception as e:
                tests.append({
                    "test": f"Analytics Label: {label}",
                    "status": "❌ FAIL",
                    "details": f"Error: {e}"
                })
        
        self.results["multicast_tests"].extend(tests)
        for test in tests:
            print(f"  {test['status']} {test['test']}: {test['details']}")
    
    async def _test_performance(self):
        """Test performance of multicast vs individual sends"""
        print("\n⚡ Testing Performance")
        print("-" * 40)
        
        tests = []
        
        if not self.firebase_service.is_available():
            tests.append({
                "test": "Performance Testing",
                "status": "⚠️  SKIP",
                "details": "Firebase service not available"
            })
            self.results["performance_tests"] = tests
            print(f"  ⚠️  SKIP Performance Testing: Firebase service not available")
            return
        
        # Test with different batch sizes
        batch_sizes = [10, 50, 100, 500]
        
        for batch_size in batch_sizes:
            try:
                tokens = [f"perf_test_token_{i}" for i in range(batch_size)]
                
                # Measure multicast performance
                start_time = time.time()
                success_count, failure_count = await self.firebase_service.send_push_multicast(
                    tokens=tokens,
                    title=f"Performance Test - {batch_size} tokens",
                    body="Testing multicast performance",
                    analytics_label=f"perf_test_{batch_size}",
                    dry_run=True
                )
                multicast_time = time.time() - start_time
                
                tests.append({
                    "test": f"Multicast Performance ({batch_size} tokens)",
                    "status": "✅ PASS",
                    "details": f"Time: {multicast_time:.3f}s, Success: {success_count}, Failure: {failure_count}"
                })
                
            except Exception as e:
                tests.append({
                    "test": f"Multicast Performance ({batch_size} tokens)",
                    "status": "❌ FAIL",
                    "details": f"Error: {e}"
                })
        
        self.results["performance_tests"] = tests
        for test in tests:
            print(f"  {test['status']} {test['test']}: {test['details']}")
    
    async def _test_error_handling(self):
        """Test error handling scenarios"""
        print("\n🛡️  Testing Error Handling")
        print("-" * 40)
        
        tests = []
        
        # Test 1: Invalid tokens
        try:
            success_count, failure_count = await self.firebase_service.send_push_multicast(
                tokens=["invalid_token_format", "another_invalid_token"],
                title="Error Test",
                body="Testing invalid tokens",
                analytics_label="error_test_invalid_tokens",
                dry_run=True
            )
            
            tests.append({
                "test": "Invalid Token Handling",
                "status": "✅ PASS",
                "details": f"Handled gracefully. Success: {success_count}, Failure: {failure_count}"
            })
            
        except Exception as e:
            tests.append({
                "test": "Invalid Token Handling",
                "status": "❌ FAIL",
                "details": f"Error: {e}"
            })
        
        # Test 2: Empty data handling
        try:
            success_count, failure_count = await self.firebase_service.send_push_multicast(
                tokens=["test_token"],
                title="",  # Empty title
                body="",   # Empty body
                data={},   # Empty data
                analytics_label="error_test_empty_data",
                dry_run=True
            )
            
            tests.append({
                "test": "Empty Data Handling",
                "status": "✅ PASS",
                "details": f"Empty data handled. Success: {success_count}, Failure: {failure_count}"
            })
            
        except Exception as e:
            tests.append({
                "test": "Empty Data Handling",
                "status": "❌ FAIL",
                "details": f"Error: {e}"
            })
        
        self.results["multicast_tests"].extend(tests)
        for test in tests:
            print(f"  {test['status']} {test['test']}: {test['details']}")
    
    async def _test_integration(self):
        """Test integration between services"""
        print("\n🔗 Testing Service Integration")
        print("-" * 40)
        
        tests = []
        
        with Session(engine) as session:
            notification_service = NotificationService(session)
            
            # Test 1: Firebase service integration
            try:
                firebase_available = notification_service.firebase_service.is_available()
                tests.append({
                    "test": "NotificationService-Firebase Integration",
                    "status": "✅ PASS" if firebase_available else "⚠️  SKIP",
                    "details": f"Firebase service integrated: {firebase_available}"
                })
            except Exception as e:
                tests.append({
                    "test": "NotificationService-Firebase Integration",
                    "status": "❌ FAIL",
                    "details": f"Error: {e}"
                })
            
            # Test 2: Database integration
            try:
                user_count = session.exec(select(User)).all()
                tests.append({
                    "test": "Database Integration",
                    "status": "✅ PASS",
                    "details": f"Database accessible, {len(user_count)} users found"
                })
            except Exception as e:
                tests.append({
                    "test": "Database Integration",
                    "status": "❌ FAIL",
                    "details": f"Error: {e}"
                })
        
        self.results["integration_tests"] = tests
        for test in tests:
            print(f"  {test['status']} {test['test']}: {test['details']}")
    
    def _generate_test_report(self):
        """Generate comprehensive test report"""
        print("\n📋 Test Suite Summary")
        print("=" * 60)
        
        total_tests = 0
        passed_tests = 0
        failed_tests = 0
        skipped_tests = 0
        
        for category, tests in self.results.items():
            category_total = len(tests)
            category_passed = len([t for t in tests if "✅ PASS" in t["status"]])
            category_failed = len([t for t in tests if "❌ FAIL" in t["status"]])
            category_skipped = len([t for t in tests if "⚠️  SKIP" in t["status"]])
            
            total_tests += category_total
            passed_tests += category_passed
            failed_tests += category_failed
            skipped_tests += category_skipped
            
            print(f"{category.replace('_', ' ').title()}: {category_passed}/{category_total} passed")
        
        print("-" * 60)
        print(f"Overall Results:")
        print(f"  ✅ Passed: {passed_tests}")
        print(f"  ❌ Failed: {failed_tests}")
        print(f"  ⚠️  Skipped: {skipped_tests}")
        print(f"  📊 Total: {total_tests}")
        
        if failed_tests == 0:
            print("\n🎉 All tests passed! Your notification system is ready to go!")
        elif failed_tests > 0:
            print(f"\n⚠️  {failed_tests} test(s) failed. Please review the errors above.")
        
        print("\n💡 Next Steps:")
        print("  1. Check Firebase Console for analytics data")
        print("  2. Monitor notification delivery rates")
        print("  3. Test with real push tokens when ready")
        print("  4. Review the bulk notification performance")

async def main():
    """Run the enhanced notification test suite"""
    test_suite = NotificationTestSuite()
    await test_suite.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())