from faker import Faker
from sqlmodel import SQLModel, Session, select, create_engine
from app.models import Tenant, Facility, Staff, User
from app.core.security import hash_password  # Use the main function name
from app.core.config import get_settings
from random import choice, randint

fake = Faker()
settings = get_settings()
engine = create_engine(settings.DATABASE_URL, echo=False)

def seed():
    SQLModel.metadata.create_all(engine)    # ensure tables exist
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
        print(f" Created tenant: {tenant.name}")

        # Create facilities
        facilities_data = [
            {"name": "Seaside Hotel", "location": "123 Ocean Drive, Miami Beach"},
            {"name": "Downtown Bistro", "location": "456 Main St, Downtown"},
            {"name": "Mountain Lodge", "location": "789 Pine Ridge, Aspen"},
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
        print(f" Created {len(facilities)} facilities")

        # Create staff with more realistic data
        roles = [
            "Housekeeping", "Chef", "Front Desk", "Maintenance", 
            "Security", "Concierge", "Waiter", "Bartender", 
            "Manager", "Sous Chef"
        ]
        
        staff_objs = []
        for _ in range(25):  # More staff for better testing
            facility = choice(facilities)
            role = choice(roles)
            
            # Assign skill levels based on role
            if role in ["Manager", "Chef"]:
                skill_level = randint(4, 5)
            elif role in ["Sous Chef", "Concierge"]:
                skill_level = randint(3, 4)
            else:
                skill_level = randint(1, 3)
            
            staff = Staff(
                full_name=fake.name(),
                email=fake.email(),
                role=role,
                skill_level=skill_level,
                facility_id=facility.id,
                phone=fake.phone_number(),
                weekly_hours_max=choice([30, 35, 40]),  # Vary max hours
                is_active=choice([True, True, True, False])  # Mostly active, some inactive
            )
            staff_objs.append(staff)
        
        session.add_all(staff_objs)
        print(f" Created {len(staff_objs)} staff members")

        # Create demo users - 3 managers and 10+ staff
        demo_users = [
            # Managers
            {
                "email": "manager@example.com",
                "password": "changeme",
                "is_manager": True
            },
            {
                "email": "supervisor@example.com", 
                "password": "changeme",
                "is_manager": True
            },
            {
                "email": "director@example.com",
                "password": "changeme", 
                "is_manager": True
            },
            # Staff users
            {
                "email": "alice.staff@example.com",
                "password": "changeme", 
                "is_manager": False
            },
            {
                "email": "bob.staff@example.com",
                "password": "changeme", 
                "is_manager": False
            },
            {
                "email": "carol.staff@example.com",
                "password": "changeme", 
                "is_manager": False
            },
            {
                "email": "david.staff@example.com",
                "password": "changeme", 
                "is_manager": False
            },
            {
                "email": "emma.staff@example.com",
                "password": "changeme", 
                "is_manager": False
            },
            {
                "email": "frank.staff@example.com",
                "password": "changeme", 
                "is_manager": False
            },
            {
                "email": "grace.staff@example.com",
                "password": "changeme", 
                "is_manager": False
            },
            {
                "email": "henry.staff@example.com",
                "password": "changeme", 
                "is_manager": False
            },
            {
                "email": "iris.staff@example.com",
                "password": "changeme", 
                "is_manager": False
            },
            {
                "email": "jack.staff@example.com",
                "password": "changeme", 
                "is_manager": False
            },
            {
                "email": "kate.staff@example.com",
                "password": "changeme", 
                "is_manager": False
            },
            {
                "email": "luke.staff@example.com",
                "password": "changeme", 
                "is_manager": False
            }
        ]

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
                print(f" Created user: {user_data['email']} (manager: {user_data['is_manager']})")

        session.commit()
        
        # Print summary
        print("\n" + "="*50)
        print("DEMO DATA SUMMARY")
        print("="*50)
        print(f"Tenant: {tenant.name}")
        print(f"Facilities: {len(facilities)}")
        for fac in facilities:
            staff_count = len([s for s in staff_objs if s.facility_id == fac.id])
            print(f"  - {fac.name}: {staff_count} staff")
        print(f"Total Staff: {len(staff_objs)}")
        print(f"Users: {len(demo_users)} (3 managers, {len([u for u in demo_users if not u['is_manager']])} staff)")
        print("\nManager login credentials:")
        for user_data in demo_users:
            if user_data['is_manager']:
                print(f"  {user_data['email']} / {user_data['password']}")
        print("\nStaff login credentials:")
        for user_data in demo_users:
            if not user_data['is_manager']:
                print(f"  {user_data['email']} / {user_data['password']}")
        print("="*50)

if __name__ == "__main__":
    seed()