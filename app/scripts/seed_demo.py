from faker import Faker
from sqlmodel import SQLModel, Session, select, create_engine
from app.models import Tenant, Facility, Staff, User
from app.core.security import hash_password
from app.core.config import get_settings
from random import choice, randint, shuffle

fake = Faker()
settings = get_settings()
engine = create_engine(settings.DATABASE_URL, echo=False)

def seed():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        # Check if demo data already exists
        existing_tenant = session.exec(select(Tenant).where(Tenant.name == "Demo Hospitality Group")).first()
        if existing_tenant:
            print("Demo data already exists. Skipping seed.")
            return

        # Create tenant
        tenant = Tenant(name="Demo Hospitality Group")
        session.add(tenant)
        session.commit()
        session.refresh(tenant)
        print(f"✅ Created tenant: {tenant.name}")

        # Create more diverse facilities
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
        
        # Create more realistic staff distribution
        staff_objs = []
        
        for facility in facilities:
            # Determine staff count based on facility type
            if "Hotel" in facility.name or "Lodge" in facility.name or "Resort" in facility.name or "Spa" in facility.name:
                staff_count = randint(18, 28)  # Hotels need more staff
                available_roles = hotel_roles
            else:  # Restaurant
                staff_count = randint(12, 20)  # Restaurants need fewer staff
                available_roles = restaurant_roles
            
            print(f"📋 Creating {staff_count} staff for {facility.name}")
            
            # Ensure we have managers
            managers_needed = randint(2, 4)
            
            for i in range(staff_count):
                # Generate realistic fake names and emails
                first_name = fake.first_name()
                last_name = fake.last_name()
                full_name = f"{first_name} {last_name}"
                
                # Create realistic email addresses
                email_formats = [
                    f"{first_name.lower()}.{last_name.lower()}@{facility.name.lower().replace(' ', '').replace('&', 'and')}.com",
                    f"{first_name.lower()}{last_name.lower()}@hospitality.com",
                    f"{first_name[0].lower()}{last_name.lower()}@{facility.name.lower().replace(' ', '')}.com",
                    f"{first_name.lower()}{randint(10, 99)}@company.com"
                ]
                email = choice(email_formats)
                
                if i < managers_needed:
                    role = choice(["Manager", "Assistant Manager"])
                    skill_level = randint(4, 5)
                else:
                    role = choice([r for r in available_roles if "Manager" not in r])
                    
                    # Assign skill levels based on role hierarchy
                    if role in ["Chef", "Sous Chef", "Concierge", "Front Desk Agent", "Sommelier"]:
                        skill_level = randint(3, 5)
                    elif role in ["Line Cook", "Waiter", "Waitress", "Bartender", "Security", "Receptionist"]:
                        skill_level = randint(2, 4)
                    else:  # Entry level roles
                        skill_level = randint(1, 3)
                
                staff = Staff(
                    full_name=full_name,
                    email=email,
                    role=role,
                    skill_level=skill_level,
                    facility_id=facility.id,
                    phone=fake.phone_number(),
                    weekly_hours_max=choice([25, 30, 35, 40]),  # Vary max hours
                    is_active=choice([True, True, True, True, False])  # 80% active
                )
                staff_objs.append(staff)
        
        session.add_all(staff_objs)
        session.commit()
        print(f"✅ Created {len(staff_objs)} staff members with realistic names and emails")

        # Create diverse demo users with easier-to-remember passwords
        demo_users = [
            # Super Admin / Owner
            {
                "email": "admin@hospitality.com",
                "password": "admin123",
                "is_manager": True,
                "name": "System Admin"
            },
            # Facility Managers
            {
                "email": "manager@seaside.com",
                "password": "manager123",
                "is_manager": True,
                "name": "Hotel Manager"
            },
            {
                "email": "manager@bistro.com", 
                "password": "manager123",
                "is_manager": True,
                "name": "Restaurant Manager"
            },
        ]

        # Generate 100+ realistic users using Faker
        print("🎭 Generating 100+ realistic demo users...")
        
        # Manager users (20-25)
        manager_count = 22
        for i in range(manager_count):
            first_name = fake.first_name()
            last_name = fake.last_name()
            job_title = choice([
                "General Manager", "Operations Manager", "Assistant Manager", 
                "Shift Supervisor", "Department Head", "Team Leader",
                "Food & Beverage Manager", "Front Office Manager", "Executive Chef"
            ])
            
            # Create professional email
            email_domain = choice(["hospitality.com", "company.com", "mgmt.com"])
            email = f"{first_name.lower()}.{last_name.lower()}@{email_domain}"
            
            demo_users.append({
                "email": email,
                "password": "manager123",  # Standard password for demo
                "is_manager": True,
                "name": f"{first_name} {last_name}",
                "job_title": job_title
            })

        # Staff users (80-90)
        staff_count = 85
        staff_roles = [
            "Server", "Cook", "Bartender", "Host", "Busser", "Dishwasher",
            "Housekeeper", "Front Desk Agent", "Bellhop", "Valet", "Security",
            "Maintenance", "Guest Services", "Concierge", "Spa Attendant",
            "Kitchen Assistant", "Food Runner", "Prep Cook", "Night Auditor"
        ]
        
        for i in range(staff_count):
            first_name = fake.first_name()
            last_name = fake.last_name()
            role = choice(staff_roles)
            
            # Create email variations
            email_formats = [
                f"{first_name.lower()}.{last_name.lower()}@staff.com",
                f"{first_name.lower()}{last_name.lower()}@hospitality.com",
                f"{first_name[0].lower()}.{last_name.lower()}@company.com",
                f"{first_name.lower()}{randint(1, 999)}@team.com"
            ]
            email = choice(email_formats)
            
            demo_users.append({
                "email": email,
                "password": "staff123",  # Standard password for demo
                "is_manager": False,
                "name": f"{first_name} {last_name}",
                "job_title": role
            })

        # Create all users in database
        created_users = []
        for user_data in demo_users:
            existing_user = session.exec(
                select(User).where(User.email == user_data["email"])
            ).first()
            
            if not existing_user:
                user = User(
                    email=user_data["email"],
                    hashed_password=hash_password(user_data["password"]),
                    tenant_id=tenant.id,
                    is_manager=user_data["is_manager"],
                    is_active=True
                )
                session.add(user)
                created_users.append(user_data)

        session.commit()
        
        # Print comprehensive summary
        print("\n" + "="*80)
        print("🎉 DEMO DATA CREATION COMPLETE")
        print("="*80)
        print(f"🏢 Tenant: {tenant.name}")
        print(f"🏨 Facilities: {len(facilities)}")
        
        for fac in facilities:
            staff_count = len([s for s in staff_objs if s.facility_id == fac.id])
            roles_at_facility = list(set([s.role for s in staff_objs if s.facility_id == fac.id]))
            print(f"   • {fac.name}: {staff_count} staff, {len(roles_at_facility)} different roles")
        
        print(f"\n👥 Total Staff Records: {len(staff_objs)}")
        
        # Show role distribution
        role_counts = {}
        for staff in staff_objs:
            role_counts[staff.role] = role_counts.get(staff.role, 0) + 1
        
        print("\n📊 Role Distribution:")
        for role, count in sorted(role_counts.items()):
            print(f"   • {role}: {count}")
        
        managers = [u for u in created_users if u['is_manager']]
        staff_users_list = [u for u in created_users if not u['is_manager']]
        
        print(f"\n👤 Users Created: {len(created_users)} ({len(managers)} managers, {len(staff_users_list)} staff)")
        
        print("\n🔑 SAMPLE LOGIN CREDENTIALS:")
        print("ADMIN ACCESS:")
        print("   admin@hospitality.com / admin123 (System Admin)")
        print("   manager@seaside.com / manager123 (Hotel Manager)")
        print("   manager@bistro.com / manager123 (Restaurant Manager)")
        
        print("\nSAMPLE MANAGER LOGINS:")
        for i, user_data in enumerate(managers[:5]):  # Show first 5
            print(f"   {user_data['email']} / {user_data['password']} ({user_data['name']})")
        if len(managers) > 5:
            print(f"   ... and {len(managers) - 5} more managers")
        
        print("\nSAMPLE STAFF LOGINS:")
        for i, user_data in enumerate(staff_users_list[:8]):  # Show first 8
            print(f"   {user_data['email']} / {user_data['password']} ({user_data['name']})")
        if len(staff_users_list) > 8:
            print(f"   ... and {len(staff_users_list) - 8} more staff members")
            
        print("\n🚀 QUICK START:")
        print("   • Login as admin: admin@hospitality.com / admin123")
        print("   • API Docs: http://localhost:8000/docs")
        print("   • All manager passwords: manager123")
        print("   • All staff passwords: staff123")
        print("="*80)

if __name__ == "__main__":
    seed()