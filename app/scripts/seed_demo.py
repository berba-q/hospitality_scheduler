import json
from faker import Faker
from sqlmodel import SQLModel, Session, select, create_engine, delete
from app.models import (
    Tenant, Facility, Staff, User, Schedule, ShiftAssignment, 
    ScheduleConfig, StaffUnavailability, SwapRequest, SwapHistory,
    ZoneAssignment, ScheduleTemplate, ScheduleOptimization
)
from app.core.security import hash_password
from app.core.config import get_settings
from random import choice, randint, shuffle
from datetime import date, timedelta

fake = Faker()
settings = get_settings()
engine = create_engine(settings.DATABASE_URL, echo=False)

def reset_database(session):
    """Reset all tables before seeding"""
    print("🗑️  Resetting database...")
    
    # Delete in reverse dependency order to respect foreign keys
    session.execute(delete(SwapHistory))
    session.execute(delete(SwapRequest))
    session.execute(delete(ZoneAssignment))
    session.execute(delete(ScheduleTemplate))
    session.execute(delete(ScheduleOptimization))
    session.execute(delete(ScheduleConfig))
    session.execute(delete(StaffUnavailability))
    session.execute(delete(ShiftAssignment))
    session.execute(delete(Schedule))
    session.execute(delete(Staff))
    session.execute(delete(Facility))
    session.execute(delete(User))
    session.execute(delete(Tenant))
    
    session.commit()
    print("✅ Database reset complete!")

def create_matched_staff_and_users(facilities, tenant_id, session):
    """Create Staff records and matching User accounts with the same emails"""
    
    # Enhanced roles with proper distribution
    hotel_roles = [
        "Receptionist", "Concierge", "Manager", "Assistant Manager",
        "Housekeeping", "Maintenance", "Security", "Bellhop",
        "Guest Services", "Night Auditor", "Valet", "Front Desk Agent",
        "Reservations Agent", "Spa Attendant", "Pool Attendant"
    ]
    
    restaurant_roles = [
        "Chef", "Sous Chef", "Line Cook", "Prep Cook",
        "Waiter", "Waitress", "Host/Hostess", "Bartender", 
        "Busser", "Manager", "Assistant Manager", "Server Assistant",
        "Sommelier", "Dishwasher", "Food Runner", "Kitchen Assistant"
    ]
    
    staff_objs = []
    staff_users = []  # Track created staff users for JSON output
    all_created_accounts = []  # Track all accounts created
    
    # First, create predefined admin/manager accounts
    predefined_accounts = [
        {
            "email": "admin@hospitality.com",
            "password": "admin123",
            "is_manager": True,
            "name": "System Admin",
            "create_staff": False  # Admin doesn't need staff record
        },
        {
            "email": "manager@seaside.com",
            "password": "manager123",
            "is_manager": True,
            "name": "Hotel Manager",
            "create_staff": False  # Manager doesn't need staff record
        },
        {
            "email": "manager@bistro.com", 
            "password": "manager123",
            "is_manager": True,
            "name": "Restaurant Manager",
            "create_staff": False  # Manager doesn't need staff record
        },
    ]
    
    # Create predefined accounts
    for account in predefined_accounts:
        user = User(
            email=account["email"],
            hashed_password=hash_password(account["password"]),
            tenant_id=tenant_id,
            is_manager=account["is_manager"],
            is_active=True
        )
        session.add(user)
        all_created_accounts.append(account)
    
    session.commit()
    print("✅ Created predefined admin/manager accounts")
    
    # Now create staff members and matching user accounts
    for facility in facilities:
        # Determine staff count and roles based on facility type
        if "Hotel" in facility.name or "Lodge" in facility.name or "Resort" in facility.name or "Spa" in facility.name:
            staff_count = randint(18, 28)  # Hotels need more staff
            available_roles = hotel_roles
        else:  # Restaurant
            staff_count = randint(12, 20)  # Restaurants need fewer staff
            available_roles = restaurant_roles
        
        print(f"📋 Creating {staff_count} staff for {facility.name}")
        
        # Ensure we have some managers at each facility
        managers_needed = randint(2, 4)
        
        for i in range(staff_count):
            # Generate realistic fake names and emails
            first_name = fake.first_name()
            last_name = fake.last_name()
            full_name = f"{first_name} {last_name}"
            
            # Create consistent email format for staff
            base_email = f"{first_name.lower()}.{last_name.lower()}"
            facility_short = facility.name.lower().replace(' ', '').replace('&', 'and')
            
            # Use different email formats to avoid duplicates
            email_options = [
                f"{base_email}@{facility_short}.com",
                f"{base_email}@staff.com",
                f"{base_email}@hospitality.com",
                f"{first_name.lower()}{last_name.lower()}@team.com",
                f"{first_name[0].lower()}{last_name.lower()}@{facility_short}.com"
            ]
            
            # Try each email option until we find one that's not taken
            email = None
            for email_option in email_options:
                # Check if this email already exists in our created accounts
                if not any(acc['email'] == email_option for acc in all_created_accounts):
                    email = email_option
                    break
            
            # Fallback with random number if all emails taken
            if not email:
                email = f"{base_email}{randint(100, 999)}@staff.com"
            
            # Determine role and skill level
            if i < managers_needed:
                role = choice(["Manager", "Assistant Manager"])
                skill_level = randint(4, 5)
                is_staff_manager = True  # These are facility managers
            else:
                role = choice([r for r in available_roles if "Manager" not in r])
                is_staff_manager = False
                
                # Assign skill levels based on role hierarchy
                if role in ["Chef", "Sous Chef", "Concierge", "Front Desk Agent", "Sommelier"]:
                    skill_level = randint(3, 5)
                elif role in ["Line Cook", "Waiter", "Waitress", "Bartender", "Security", "Receptionist"]:
                    skill_level = randint(2, 4)
                else:  # Entry level roles
                    skill_level = randint(1, 3)
            
            # Create Staff record
            staff = Staff(
                full_name=full_name,
                email=email,  # 🔑 This email will match the User account
                role=role,
                skill_level=skill_level,
                facility_id=facility.id,
                phone=fake.phone_number(),
                weekly_hours_max=choice([25, 30, 35, 40]),
                is_active=choice([True, True, True, True, False])  # 80% active
            )
            staff_objs.append(staff)
            
            # Create matching User account for this staff member
            password = "staff123"  # Standard password for all staff
            user_account = {
                "email": email,  # 🔑 Same email as Staff record
                "password": password,
                "is_manager": is_staff_manager,  # Facility managers are also User managers
                "name": full_name,
                "role": role,
                "facility": facility.name
            }
            
            # Create User in database
            user = User(
                email=email,
                hashed_password=hash_password(password),
                tenant_id=tenant_id,
                is_manager=is_staff_manager,
                is_active=True
            )
            session.add(user)
            
            # Track for JSON output
            all_created_accounts.append(user_account)
            if not is_staff_manager:  # Only track non-manager staff for staff list
                staff_users.append(user_account)
    
    # Save all staff records to database
    session.add_all(staff_objs)
    session.commit()
    
    print(f"✅ Created {len(staff_objs)} staff members with matching user accounts")
    
    return staff_objs, all_created_accounts, staff_users

def save_accounts_to_json(all_accounts, staff_accounts):
    """Save account information to JSON files for reference"""
    
    # Separate accounts by type for easier reference
    managers = [acc for acc in all_accounts if acc['is_manager']]
    staff = [acc for acc in all_accounts if not acc['is_manager']]
    
    # Create comprehensive account data
    account_data = {
        "generated_at": str(date.today()),
        "total_accounts": len(all_accounts),
        "summary": {
            "total_managers": len(managers),
            "total_staff": len(staff),
            "standard_passwords": {
                "admin": "admin123",
                "managers": "manager123",
                "staff": "staff123"
            }
        },
        "admin_accounts": [acc for acc in managers if "admin" in acc['email']],
        "managers": [acc for acc in managers if "admin" not in acc['email']],
        "staff": staff,
        "quick_test_accounts": {
            "admin": "admin@hospitality.com / admin123",
            "hotel_manager": "manager@seaside.com / manager123", 
            "restaurant_manager": "manager@bistro.com / manager123",
            "sample_staff": staff[:5] if staff else []
        }
    }
    
    # Save to JSON file
    with open('demo_accounts.json', 'w') as f:
        json.dump(account_data, f, indent=2)
    
    # Also save a simple staff-only list for easy testing
    staff_simple = [
        {
            "name": acc['name'],
            "email": acc['email'],
            "password": acc['password'],
            "role": acc['role'],
            "facility": acc['facility']
        }
        for acc in staff
    ]
    
    with open('staff_accounts.json', 'w') as f:
        json.dump(staff_simple, f, indent=2)
    
    print(f"✅ Saved account data to demo_accounts.json and staff_accounts.json")
    return account_data

def seed():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        # Reset database first
        reset_database(session)
        
        # Create tenant
        tenant = Tenant(name="Demo Hospitality Group")
        session.add(tenant)
        session.commit()
        session.refresh(tenant)
        print(f"✅ Created tenant: {tenant.name}")

        # Create facilities
        facilities_data = [
            {"name": "Seaside Hotel", "location": "123 Ocean Drive, Miami Beach", "type": "hotel"},
            {"name": "Downtown Bistro", "location": "456 Main St, Downtown", "type": "restaurant"},
            {"name": "Mountain Lodge", "location": "789 Pine Ridge, Aspen", "type": "hotel"},
            {"name": "Rooftop Restaurant", "location": "100 High St, Manhattan", "type": "restaurant"},
            {"name": "Beach Resort", "location": "555 Paradise Blvd, Malibu", "type": "hotel"},
            {"name": "City Cafe", "location": "789 Urban Ave, Chicago", "type": "restaurant"},
            {"name": "Luxury Spa Hotel", "location": "321 Wellness Way, Napa", "type": "hotel"},
            {"name": "Sports Bar & Grill", "location": "888 Stadium Dr, Denver", "type": "restaurant"},
        ]
        
        facilities = []
        for fac_data in facilities_data:
            facility = Facility(
                name=fac_data["name"],
                location=fac_data["location"],
                tenant_id=tenant.id
            )
            facilities.append(facility)
        
        session.add_all(facilities)
        session.commit()
        print(f"✅ Created {len(facilities)} facilities")

        # 🔑 CREATE MATCHING STAFF AND USER ACCOUNTS
        staff_objs, all_accounts, staff_accounts = create_matched_staff_and_users(
            facilities, tenant.id, session
        )
        
        # 📄 SAVE ACCOUNTS TO JSON
        account_data = save_accounts_to_json(all_accounts, staff_accounts)
        
        # 📅 CREATE SAMPLE SCHEDULES
        print("📅 Creating sample schedules...")
        
        base_date = date.today()
        demo_facilities = facilities[:2]  # Use first 2 facilities for demo schedules
        
        for facility in demo_facilities:
            facility_staff = [s for s in staff_objs if s.facility_id == facility.id and s.is_active]
            active_staff = facility_staff[:15]  # Use first 15 active staff
            
            # Create 4 weeks of schedules (2 past, 2 future)
            for week_offset in range(-2, 3):
                week_start = base_date + timedelta(weeks=week_offset)
                # Ensure it's a Monday
                week_start = week_start - timedelta(days=week_start.weekday())
                
                schedule = Schedule(
                    facility_id=facility.id,
                    week_start=week_start
                )
                session.add(schedule)
                session.flush()  # Get the ID
                
                # Create realistic shift assignments
                assignments = []
                
                for day in range(7):  # Monday to Sunday
                    for shift in range(3):  # Morning, Afternoon, Evening
                        # Determine how many staff needed per shift
                        if "Hotel" in facility.name:
                            staff_needed = randint(2, 4)
                        else:  # Restaurant
                            staff_needed = randint(2, 3)
                        
                        # Randomly assign staff to shifts
                        shift_staff = choice(active_staff) if active_staff else None
                        for _ in range(staff_needed):
                            if shift_staff and len(active_staff) > 0:
                                assignment = ShiftAssignment(
                                    schedule_id=schedule.id,
                                    day=day,
                                    shift=shift,
                                    staff_id=shift_staff.id
                                )
                                assignments.append(assignment)
                                
                                # Rotate to next staff member
                                current_index = active_staff.index(shift_staff)
                                shift_staff = active_staff[(current_index + 1) % len(active_staff)]
                
                session.add_all(assignments)
                print(f"   📋 Created schedule for {facility.name}, week of {week_start} ({len(assignments)} assignments)")
        
        session.commit()
        
        # 🔄 CREATE SAMPLE SWAP REQUESTS
        print("🔄 Creating sample swap requests...")
        
        recent_schedules = session.exec(
            select(Schedule).where(Schedule.week_start >= base_date)
        ).all()
        
        swap_reasons = [
            "Family emergency - need someone to cover",
            "Doctor appointment that I can't reschedule", 
            "Personal matter - willing to trade shifts",
            "Childcare conflict, need coverage",
            "Previously scheduled vacation",
            "Medical appointment",
            "Family commitment that came up",
            "School event for my child",
            "Transportation issues on this day",
            "Requested time off for personal reasons"
        ]
        
        urgency_levels = ["low", "normal", "high", "emergency"]
        swap_statuses = [
                        "pending", 
                        "manager_approved", 
                        "staff_accepted", 
                        "staff_declined", 
                        "assigned", 
                        "assignment_failed", 
                        "executed", 
                        "declined"
                        ]
        
        created_swaps = 0
        for schedule in recent_schedules[:3]:  # Create swaps for first 3 schedules
            assignments = session.exec(
                select(ShiftAssignment).where(ShiftAssignment.schedule_id == schedule.id)
            ).all()
            
            if len(assignments) < 2:
                continue
                
            # Create 3-5 swap requests per schedule
            for _ in range(randint(3, 5)):
                requesting_assignment = choice(assignments)
                
                # 60% chance of specific swap, 40% chance of auto swap
                if randint(1, 10) <= 6:
                    # Specific swap
                    target_assignment = choice([a for a in assignments if a.id != requesting_assignment.id])
                    
                    swap_request = SwapRequest(
                        schedule_id=schedule.id,
                        requesting_staff_id=requesting_assignment.staff_id,
                        original_day=requesting_assignment.day,
                        original_shift=requesting_assignment.shift,
                        swap_type="specific",
                        target_staff_id=target_assignment.staff_id,
                        target_day=target_assignment.day,
                        target_shift=target_assignment.shift,
                        reason=choice(swap_reasons),
                        urgency=choice(urgency_levels),
                        status=choice(swap_statuses),
                        target_staff_accepted=choice([True, False, None]),
                        manager_approved=choice([True, False, None])
                    )
                else:
                    # Auto swap
                    swap_request = SwapRequest(
                        schedule_id=schedule.id,
                        requesting_staff_id=requesting_assignment.staff_id,
                        original_day=requesting_assignment.day,
                        original_shift=requesting_assignment.shift,
                        swap_type="auto",
                        reason=choice(swap_reasons),
                        urgency=choice(urgency_levels),
                        status=choice(swap_statuses),
                        manager_approved=choice([True, False, None])
                    )
                    
                    # If approved, maybe assign someone
                    if swap_request.status in ["manager_approved", "executed"] and randint(1, 10) <= 7:
                        facility_staff = [s for s in staff_objs if s.facility_id == schedule.facility_id and s.id != requesting_assignment.staff_id]
                        if facility_staff:
                            swap_request.assigned_staff_id = choice(facility_staff).id
                
                session.add(swap_request)
                created_swaps += 1
        
        session.commit()
        print(f"✅ Created {created_swaps} sample swap requests")
        
        # 📊 PRINT COMPREHENSIVE SUMMARY
        print("\n" + "="*80)
        print("🎉 DEMO DATA CREATION COMPLETE")
        print("="*80)
        print(f"🏢 Tenant: {tenant.name}")
        print(f"🏨 Facilities: {len(facilities)}")
        
        for fac in facilities:
            staff_count = len([s for s in staff_objs if s.facility_id == fac.id])
            print(f"   • {fac.name}: {staff_count} staff")
        
        print(f"\n👥 Total Staff Records: {len(staff_objs)}")
        print(f"👤 Total User Accounts: {len(all_accounts)}")
        print(f"📅 Sample Schedules: {len(recent_schedules)}")
        print(f"🔄 Sample Swap Requests: {created_swaps}")
        
        print(f"\n📁 Account Files Generated:")
        print(f"   • demo_accounts.json - Complete account list")
        print(f"   • staff_accounts.json - Staff-only accounts for testing")
        
        print("\n🔑 QUICK TEST CREDENTIALS:")
        print("ADMIN & MANAGERS:")
        print("   admin@hospitality.com / admin123")
        print("   manager@seaside.com / manager123")
        print("   manager@bistro.com / manager123")
        
        print("\nSAMPLE STAFF ACCOUNTS (with matching Staff records):")
        staff_sample = account_data['staff'][:5]
        for staff_acc in staff_sample:
            print(f"   {staff_acc['email']} / {staff_acc['password']} ({staff_acc['name']} - {staff_acc['role']})")
        
        if len(account_data['staff']) > 5:
            print(f"   ... and {len(account_data['staff']) - 5} more staff accounts in staff_accounts.json")
        
        print(f"\n🚀 TESTING NOTES:")
        print(f"   • All staff emails now match User accounts!")
        print(f"   • Staff password: staff123")
        print(f"   • Manager password: manager123") 
        print(f"   • Check JSON files for complete account lists")
        print(f"   • Test staff dashboard with any staff account above")
        print("="*80)

if __name__ == "__main__":
    seed()