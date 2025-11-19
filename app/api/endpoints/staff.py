import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, or_, select, func
from typing import List, Optional
from datetime import datetime, timedelta, date, timezone
from uuid import UUID

from ...deps import get_db, get_current_user
from ...models import (
    Staff,
    Facility,
    Schedule,
    ShiftAssignment,
    StaffInvitation,
    StaffUnavailability,
    SwapRequest,
    SwapStatus,
    User,
    ZoneAssignment,        
)
from ...schemas import StaffCreate, StaffDeleteResponse, StaffDeleteValidation, StaffDuplicateCheck, StaffRead, StaffUpdate

router = APIRouter(prefix="/staff", tags=["staff"])

# Add timezone utility functions similar to swap endpoint
def ensure_timezone_aware(dt):
    """Ensure datetime is timezone-aware, assuming UTC for naive datetimes"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

def get_current_utc_datetime():
    """Get current UTC datetime - replaces datetime.utcnow()"""
    return datetime.now(timezone.utc)

def get_current_utc_date():
    """Get current UTC date"""
    return datetime.now(timezone.utc).date()

def parse_date_input(date_str: str, user_timezone: str = "UTC") -> date:
    """Parse date string with timezone awareness"""
    try:
        # Parse the ISO date string
        parsed_dt = datetime.fromisoformat(date_str)
        
        # If no timezone info, assume user's timezone (default UTC)
        if parsed_dt.tzinfo is None:
            # For date-only inputs, we typically want to use the user's timezone
            # You might want to get this from user preferences
            parsed_dt = parsed_dt.replace(tzinfo=timezone.utc)
        
        return parsed_dt.date()
    except ValueError:
        # Fallback for simple date formats
        return datetime.strptime(date_str, "%Y-%m-%d").date()

def check_for_duplicates(
    db: Session, 
    staff_in: StaffCreate, 
    current_user, 
    check_email: bool = True,
    check_name_similarity: bool = True
) -> dict:
    """
    Comprehensive duplicate checking for staff members.
    Returns dict with duplicate information and suggestions.
    """
    duplicates = {
        "exact_email_match": None,
        "name_similarity_matches": [],
        "phone_matches": [],
        "has_any_duplicates": False,
        "severity": "none"  # none, warning, error
    }
    
    # Verify facility belongs to tenant
    facility = db.get(Facility, staff_in.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        return duplicates
    
    # 1. Check for exact email duplicates (most critical)
    if check_email and staff_in.email:
        exact_email_match = db.exec(
            select(Staff).join(Facility).where(
                func.lower(Staff.email) == staff_in.email.lower().strip(),
                Facility.tenant_id == current_user.tenant_id,
                Staff.is_active == True
            )
        ).first()
        
        if exact_email_match:
            duplicates["exact_email_match"] = {
                "id": str(exact_email_match.id),
                "full_name": exact_email_match.full_name,
                "facility_name": facility.name if facility else "Unknown",
                "email": exact_email_match.email
            }
            duplicates["has_any_duplicates"] = True
            duplicates["severity"] = "error"  # Email duplicates should block creation
    
    # 2. Check for name similarity within the same facility
    if check_name_similarity and staff_in.full_name:
        # Use fuzzy matching - check if names are very similar
        name_parts = staff_in.full_name.lower().split()
        
        similar_names = db.exec(
            select(Staff).where(
                Staff.facility_id == staff_in.facility_id,
                Staff.is_active == True,
                # Check for names that contain similar parts
                or_(
                    *[Staff.full_name.ilike(f"%{part}%") for part in name_parts if len(part) > 2] # type: ignore
                )
            )
        ).all()
        
        for similar_staff in similar_names:
            # Calculate similarity score (simple approach)
            similarity_score = len(set(name_parts) & set(similar_staff.full_name.lower().split()))
            if similarity_score >= 2 or similar_staff.full_name.lower() == staff_in.full_name.lower():
                duplicates["name_similarity_matches"].append({
                    "id": str(similar_staff.id),
                    "full_name": similar_staff.full_name,
                    "email": similar_staff.email,
                    "similarity_score": similarity_score
                })
                duplicates["has_any_duplicates"] = True
                if duplicates["severity"] == "none":
                    duplicates["severity"] = "warning"
    
    # 3. Check for phone number duplicates
    if staff_in.phone:
        # Normalize phone number for comparison
        normalized_phone = ''.join(filter(str.isdigit, staff_in.phone))
        if len(normalized_phone) >= 10:  # Only check substantial phone numbers
            phone_matches = db.exec(
                select(Staff).join(Facility).where(
                    Staff.phone.like(f"%{normalized_phone[-10:]}%"),  # Check last 10 digits # type: ignore
                    Facility.tenant_id == current_user.tenant_id,
                    Staff.is_active == True
                )
            ).all()
            
            for phone_staff in phone_matches:
                duplicates["phone_matches"].append({
                    "id": str(phone_staff.id),
                    "full_name": phone_staff.full_name,
                    "phone": phone_staff.phone,
                    "facility_name": facility.name if facility else "Unknown"
                })
                duplicates["has_any_duplicates"] = True
                if duplicates["severity"] == "none":
                    duplicates["severity"] = "warning"
    
    return duplicates


@router.post("/", response_model=StaffRead, status_code=201)
def create_staff(
    staff_in: StaffCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    force_create: bool = Query(False, description="Force creation even if duplicates are found"),
    skip_duplicate_check: bool = Query(False, description="Skip all duplicate validation")
):
    """Create a staff member with comprehensive duplicate checking"""

    # Verify facility access
    facility = db.get(Facility, staff_in.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid facility")

    # Perform duplicate checking unless explicitly skipped
    if not skip_duplicate_check:
        duplicates = check_for_duplicates(db, staff_in, current_user)

        # Block creation if exact email duplicate found and not forced
        if duplicates["exact_email_match"] and not force_create:
            existing_staff = duplicates["exact_email_match"]
            raise HTTPException(
                status_code=409,  # Conflict
                detail={
                    "error": "duplicate_email",
                    "message": f"Staff member with email '{staff_in.email}' already exists",
                    "existing_staff": existing_staff,
                    "duplicates": duplicates,
                    "suggestions": [
                        "Check if this person is already in the system",
                        "Update the existing staff member instead",
                        "Use force_create=true to create anyway (not recommended)"
                    ]
                }
            )

        # Warn about potential duplicates but allow creation
        if duplicates["severity"] == "warning" and not force_create:
            # For API consistency, we'll still create but include warnings in response
            # Frontend can handle this by showing warnings to user
            pass

    # Create the staff member
    staff = Staff(**staff_in.model_dump())
    db.add(staff)
    db.commit()
    db.refresh(staff)

    # Include duplicate warnings in response if any were found
    response_data = staff.model_dump()
    if not skip_duplicate_check and 'duplicates' in locals():
        response_data["_duplicate_warnings"] = duplicates if duplicates["has_any_duplicates"] else None # type: ignore

    return staff

@router.post("/validate-before-create")
def validate_staff_before_create(
    staff_in: StaffCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Validate staff data and check for duplicates before creation (for frontend preview)"""
    
    # Verify facility access
    facility = db.get(Facility, staff_in.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid facility")
    
    # Check for duplicates
    duplicates = check_for_duplicates(db, staff_in, current_user)
    
    # Validate required fields
    validation_errors = []
    if not staff_in.full_name or len(staff_in.full_name.strip()) < 2:
        validation_errors.append("Full name must be at least 2 characters long")
    
    if staff_in.email and "@" not in staff_in.email:
        validation_errors.append("Email format is invalid")
    
    if not staff_in.role or len(staff_in.role.strip()) < 2:
        validation_errors.append("Role is required")
    
    if staff_in.skill_level and (staff_in.skill_level < 1 or staff_in.skill_level > 5):
        validation_errors.append("Skill level must be between 1 and 5")
    
    # Return validation result
    can_create = len(validation_errors) == 0 and duplicates["severity"] != "error"
    
    return {
        "can_create": can_create,
        "validation_errors": validation_errors,
        "duplicates": duplicates,
        "recommendations": [
            "Review potential duplicates before creating",
            "Consider updating existing staff instead",
            "Use different email if this is a different person"
        ] if duplicates["has_any_duplicates"] else []
    }

@router.get("/", response_model=list[StaffRead])
def list_staff(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    statement = (
        select(Staff)
        .join(Facility)
        .where(Facility.tenant_id == current_user.tenant_id)
    )
    return db.exec(statement).all()

@router.put("/{staff_id}", response_model=StaffRead)
def update_staff(
    staff_id: str,
    staff_update: StaffUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Update a staff member"""
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    staff = db.get(Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    # Verify staff belongs to user's tenant
    facility = db.get(Facility, staff.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check for email duplicates if email is being updated
    if staff_update.email and staff_update.email != staff.email:
        existing_email_staff = db.exec(
            select(Staff).join(Facility).where(
                func.lower(Staff.email) == staff_update.email.lower().strip(),
                Staff.id != staff.id,  # Exclude current staff
                Facility.tenant_id == current_user.tenant_id,
                Staff.is_active == True
            )
        ).first()
        
        if existing_email_staff:
            raise HTTPException(
                status_code=409,
                detail=f"Email '{staff_update.email}' is already used by another staff member: {existing_email_staff.full_name}"
            )
    
    # Update staff fields
    update_data = staff_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(staff, field, value)
    
    # Set updated_at timestamp
    staff.updated_at = get_current_utc_datetime()
    
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff

#============= Staff registration ==============================
@router.get("/registration-status")
async def get_staff_registration_status(
    facility_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get registration status for all staff members"""
    
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    # Build staff query
    staff_query = select(Staff).where(Staff.is_active == True)
    if facility_id:
        staff_query = staff_query.where(Staff.facility_id == facility_id)
        
    staff_members = db.exec(staff_query).all()
    
    results = []
    
    for staff in staff_members:
        # Check for user account
        user = db.exec(
            select(User).where(func.lower(User.email) == func.lower(staff.email))
        ).first()
        
        # Check for invitation
        invitation = db.exec(
            select(StaffInvitation)
            .where(StaffInvitation.staff_id == staff.id)
            .order_by(StaffInvitation.created_at.desc())
        ).first()
        
        # Determine status
        if user and user.is_active:
            status = "registered"
            notification_capable = True
            action_needed = None
        elif invitation and invitation.expires_at > datetime.now(timezone.utc) and not invitation.accepted_at:
            status = "invitation_pending"
            notification_capable = False
            action_needed = "Wait for staff to accept invitation"
        elif invitation and invitation.expires_at < datetime.now(timezone.utc):
            status = "invitation_expired" 
            notification_capable = False
            action_needed = "Resend invitation"
        else:
            status = "no_invitation"
            notification_capable = False
            action_needed = "Send invitation"
        
        results.append({
            "staff_id": str(staff.id),
            "staff_name": staff.full_name,
            "email": staff.email,
            "role": staff.role,
            "status": status,
            "notification_capable": notification_capable,
            "action_needed": action_needed,
            "user_account_exists": user is not None,
            "user_account_active": user.is_active if user else False,
            "invitation_status": invitation.status if invitation else None,
            "invitation_sent": invitation.sent_at.isoformat() if invitation and invitation.sent_at else None,
            "invitation_expires": invitation.expires_at.isoformat() if invitation else None,
            "facility_id": str(staff.facility_id)
        })
    
    # Summary stats
    summary = {
        "total_staff": len(results),
        "registered": len([r for r in results if r["status"] == "registered"]),
        "pending_invitations": len([r for r in results if r["status"] == "invitation_pending"]),
        "expired_invitations": len([r for r in results if r["status"] == "invitation_expired"]), 
        "no_invitations": len([r for r in results if r["status"] == "no_invitation"]),
        "notification_ready": len([r for r in results if r["notification_capable"]])
    }
    
    return {
        "summary": summary,
        "staff_details": results
    }

# Endpoint to specifically check a staff member by name (for debugging)
@router.get("/check-staff/{staff_name}")
async def check_specific_staff_status(
    staff_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check registration status for a specific staff member by name"""
    
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    # Find staff member (case insensitive)
    staff = db.exec(
        select(Staff).where(
            func.lower(Staff.full_name).like(f"%{staff_name.lower()}%")
        )
    ).all()
    
    if not staff:
        raise HTTPException(status_code=404, detail=f"No staff found matching '{staff_name}'")
    
    results = []
    for member in staff:
        # Get detailed status (same logic as above)
        user = db.exec(
            select(User).where(func.lower(User.email) == func.lower(member.email))
        ).first()
        
        invitations = db.exec(
            select(StaffInvitation)
            .where(StaffInvitation.staff_id == member.id)
            .order_by(StaffInvitation.created_at.desc())
        ).all()
        
        results.append({
            "staff": {
                "id": str(member.id),
                "full_name": member.full_name,
                "email": member.email,
                "role": member.role,
                "is_active": member.is_active
            },
            "user_account": {
                "exists": user is not None,
                "id": str(user.id) if user else None,
                "email": user.email if user else None,
                "is_active": user.is_active if user else False,
                "created_at": user.created_at.isoformat() if user else None
            },
            "invitations": [
                {
                    "id": str(inv.id),
                    "status": inv.status,
                    "sent_at": inv.sent_at.isoformat() if inv.sent_at else None,
                    "accepted_at": inv.accepted_at.isoformat() if inv.accepted_at else None,
                    "expires_at": inv.expires_at.isoformat(),
                    "is_expired": inv.expires_at < datetime.now(timezone.utc),
                    "token": inv.token[:8] + "..." if inv.token else None  # Partial token for debugging
                }
                for inv in invitations
            ],
            "notification_diagnosis": {
                "can_receive_notifications": user is not None and user.is_active,
                "reason": (
                    "User account active" if user and user.is_active else
                    "User account inactive" if user and not user.is_active else
                    "Invitation pending - no user account yet" if invitations and any(not inv.accepted_at for inv in invitations) else
                    "No user account and no invitations sent"
                )
            }
        })
    
    return results
#============== Delete staff ====================================
@router.delete("/{staff_id}/validate", response_model=StaffDeleteValidation)
def validate_staff_deletion(
    staff_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Validate if a staff member can be deleted and show impact"""
    if not current_user.is_manager:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager access required")
    
    # Convert string ID to UUID
    try:
        staff_uuid = uuid.UUID(staff_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid staff ID format")
    
    staff = db.get(Staff, staff_uuid)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    # Verify staff belongs to user's tenant
    facility = db.get(Facility, staff.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    errors = []
    warnings = []
    blocking_entities = []
    today = date.today()
    now = datetime.now()
    
    pending_invitations = db.exec(
        select(func.count(StaffInvitation.id))
        .where(StaffInvitation.staff_id == staff_uuid)
        .where(StaffInvitation.accepted_at.is_(None))
        .where(StaffInvitation.cancelled_at.is_(None))
        .where(StaffInvitation.expires_at > datetime.now(timezone.utc))
    ).first() or 0
    
    if pending_invitations > 0:
        warnings.append(f"Staff member has {pending_invitations} pending invitation(s) that will be cancelled")
    
    total_invitations = db.exec(
        select(func.count(StaffInvitation.id))
        .where(StaffInvitation.staff_id == staff_uuid)
    ).first() or 0
    
    if total_invitations > 0:
        warnings.append(f"Staff member has {total_invitations} invitation record(s) that will be deleted")
    
    # Check for future shift assignments
    today = date.today()
    future_assignments_count = db.exec(
        select(func.count(ShiftAssignment.id))
        .join(Schedule, ShiftAssignment.schedule_id == Schedule.id)
        .where(ShiftAssignment.staff_id == staff_uuid)
        .where(Schedule.week_start >= today)
    ).first() or 0
    
    if future_assignments_count > 0:
        errors.append(f"Staff member has {future_assignments_count} future shift assignments")
        
        # Get specific schedules for blocking entities
        future_schedules = db.exec(
            select(Schedule)
            .join(ShiftAssignment, ShiftAssignment.schedule_id == Schedule.id)
            .where(ShiftAssignment.staff_id == staff_uuid)
            .where(Schedule.week_start >= today)
            .distinct()
        ).all()
        
        for schedule in future_schedules:
            blocking_entities.append({
                "type": "schedule",
                "id": str(schedule.id),
                "name": f"Schedule for week {schedule.week_start}",
                "facility_id": str(schedule.facility_id)
            })
    
    # Check for pending swap requests (both as requester and target)
    pending_swap_requests_count = db.exec(
        select(func.count(SwapRequest.id))
        .where(
            or_(
                SwapRequest.requesting_staff_id == staff_uuid,
                SwapRequest.target_staff_id == staff_uuid,
                SwapRequest.assigned_staff_id == staff_uuid
            )
        )
        .where(SwapRequest.status.in_([
            SwapStatus.PENDING,
            SwapStatus.MANAGER_APPROVED, 
            SwapStatus.POTENTIAL_ASSIGNMENT,
            SwapStatus.STAFF_ACCEPTED,
            SwapStatus.MANAGER_FINAL_APPROVAL
        ]))
    ).first() or 0
    
    if pending_swap_requests_count > 0:
        warnings.append(f"Staff member has {pending_swap_requests_count} pending swap requests")
    
    # Check if staff is a manager (assuming role indicates manager status)
    is_manager = staff.role and ('manager' in staff.role.lower() or 'supervisor' in staff.role.lower())
    
    if is_manager:
        # Check if this is the only manager in the facility
        other_managers_count = db.exec(
            select(func.count(Staff.id))
            .where(Staff.facility_id == staff.facility_id)
            .where(Staff.is_active == True)
            .where(Staff.id != staff_uuid)
            .where(
                or_(
                    Staff.role.contains('manager'),
                    Staff.role.contains('supervisor')
                )
            )
        ).first() or 0
        
        if other_managers_count == 0:
            warnings.append("This is the only manager/supervisor for this facility")
    
    # Check for unique role/skill combination
    has_unique_skills = False
    
    # Check if this is the only person with this specific role
    other_staff_with_role = db.exec(
        select(func.count(Staff.id))
        .where(Staff.facility_id == staff.facility_id)
        .where(Staff.is_active == True)
        .where(Staff.id != staff_uuid)
        .where(Staff.role == staff.role)
    ).first() or 0
    
    if other_staff_with_role == 0:
        has_unique_skills = True
        warnings.append(f"Staff member is the only one with role: {staff.role}")
    
    # Check if this is the only person with this role AND skill level combination
    other_staff_with_role_skill = db.exec(
        select(func.count(Staff.id))
        .where(Staff.facility_id == staff.facility_id)
        .where(Staff.is_active == True)
        .where(Staff.id != staff_uuid)
        .where(Staff.role == staff.role)
        .where(Staff.skill_level == staff.skill_level)
    ).first() or 0
    
    if other_staff_with_role_skill == 0 and staff.skill_level and staff.skill_level > 3:
        warnings.append(f"Staff member is the only {staff.role} with skill level {staff.skill_level}")
    
    # Check for upcoming unavailability records
    upcoming_unavailability = db.exec(
        select(func.count(StaffUnavailability.id))
        .where(StaffUnavailability.staff_id == staff_uuid)
        .where(StaffUnavailability.end >= datetime.now())
    ).first() or 0
    
    if upcoming_unavailability > 0:
        warnings.append(f"Staff member has {upcoming_unavailability} future unavailability records")
    
    # Check for zone assignments
    zone_assignments = db.exec(
        select(func.count(ZoneAssignment.id))
        .where(ZoneAssignment.staff_id == staff_uuid)
    ).first() or 0
    
    if zone_assignments > 0:
        warnings.append(f"Staff member has {zone_assignments} zone assignments")
    
    return StaffDeleteValidation(
        can_delete=len(errors) == 0,
        future_assignments_count=future_assignments_count,
        pending_swap_requests_count=pending_swap_requests_count,
        is_manager=is_manager,
        has_unique_skills=has_unique_skills,
        errors=errors,
        warnings=warnings,
        blocking_entities=blocking_entities
    )


@router.delete("/{staff_id}", response_model=StaffDeleteResponse)
def delete_staff(
    staff_id: str,
    force: bool = Query(False, description="Force delete even with dependencies"),
    soft_delete: bool = Query(True, description="Soft delete (deactivate) instead of hard delete"),
    cascade_assignments: bool = Query(False, description="Also delete related assignments"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Delete a staff member with proper dependency handling"""
    if not current_user.is_manager:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager access required")
    
    # Convert string ID to UUID
    try:
        staff_uuid = uuid.UUID(staff_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid staff ID format")
    
    staff = db.get(Staff, staff_uuid)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    # Verify staff belongs to user's tenant
    facility = db.get(Facility, staff.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Validate deletion unless forced
    if not force:
        validation = validate_staff_deletion(staff_id, db, current_user)
        if not validation.can_delete:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete staff member: {'; '.join(validation.errors)}. Use force=true to override or handle dependencies first."
            )
    
    # Count what will be affected for response
    reassigned_schedules_count = 0
    cancelled_swaps_count = 0
    cancelled_invitations_count = 0
    
    pending_invitations = db.exec(
            select(StaffInvitation)
            .where(StaffInvitation.staff_id == staff_uuid)
            .where(StaffInvitation.accepted_at.is_(None))
            .where(StaffInvitation.cancelled_at.is_(None))
        ).all()
        
    for invitation in pending_invitations:
            invitation.cancelled_at = datetime.now(timezone.utc)
            cancelled_invitations_count += 1
        
        # For hard deletion, delete all invitation records
    if not soft_delete:
            all_invitations = db.exec(
                select(StaffInvitation)
                .where(StaffInvitation.staff_id == staff_uuid)
            ).all()
            
            for invitation in all_invitations:
                db.delete(invitation)
    
    try:
        # Handle dependencies based on options
        if cascade_assignments or force:
            # Cancel pending swap requests
            pending_swaps = db.exec(
                select(SwapRequest)
                .where(
                    or_(
                        SwapRequest.requesting_staff_id == staff_uuid,
                        SwapRequest.target_staff_id == staff_uuid,
                        SwapRequest.assigned_staff_id == staff_uuid
                    )
                )
                .where(SwapRequest.status.in_([
                    SwapStatus.PENDING,
                    SwapStatus.MANAGER_APPROVED, 
                    SwapStatus.POTENTIAL_ASSIGNMENT,
                    SwapStatus.STAFF_ACCEPTED,
                    SwapStatus.MANAGER_FINAL_APPROVAL
                ]))
            ).all()
            
            for swap in pending_swaps:
                swap.status = SwapStatus.CANCELLED
                swap.manager_notes = f"Cancelled due to staff deletion by {current_user.email}"
                cancelled_swaps_count += 1
            
            if cascade_assignments:
                # Remove future shift assignments
                future_assignments = db.exec(
                    select(ShiftAssignment)
                    .join(Schedule, ShiftAssignment.schedule_id == Schedule.id)
                    .where(ShiftAssignment.staff_id == staff_uuid)
                    .where(Schedule.week_start >= date.today())
                ).all()
                
                schedules_affected = set()
                for assignment in future_assignments:
                    schedules_affected.add(assignment.schedule_id)
                    db.delete(assignment)
                
                reassigned_schedules_count = len(schedules_affected)
            
            # Clean up other dependencies
            # Remove zone assignments
            zone_assignments = db.exec(
                select(ZoneAssignment)
                .where(ZoneAssignment.staff_id == staff_uuid)
            ).all()
            for assignment in zone_assignments:
                db.delete(assignment)
            
            # Remove future unavailability records
            future_unavailability = db.exec(
                select(StaffUnavailability)
                .where(StaffUnavailability.staff_id == staff_uuid)
                .where(StaffUnavailability.end >= datetime.now())
            ).all()
            for unavail in future_unavailability:
                db.delete(unavail)
        
        # Handle associated User record
        associated_user = None
        if staff.email:
            associated_user = db.exec(
                select(User).where(
                    func.lower(User.email) == func.lower(staff.email),
                    User.tenant_id == current_user.tenant_id
                )
            ).first()

        # Delete or deactivate the staff member
        if soft_delete:
            # Soft delete - mark as inactive
            staff.is_active = False
            staff.updated_at = datetime.now()

            # Also deactivate associated user account
            if associated_user:
                associated_user.is_active = False

            db.commit()
            message = f"Staff member '{staff.full_name}' deactivated successfully"
            if associated_user:
                message += " (user account deactivated)"
            if cancelled_invitations_count > 0:
                message += f" ({cancelled_invitations_count} pending invitation(s) cancelled)"
        else:
            # Hard delete - delete both staff and user records
            if associated_user:
                db.delete(associated_user)
            db.delete(staff)
            db.commit()
            message = f"Staff member '{staff.full_name}' deleted successfully"
            if associated_user:
                message += " (user account deleted)"
            if cancelled_invitations_count > 0:
                message += f" ({cancelled_invitations_count} invitation record(s) removed)"
        
        return StaffDeleteResponse(
            success=True,
            message=message,
            deleted_id=staff_uuid,
            entity_type="staff",
            reassigned_schedules_count=reassigned_schedules_count,
            cancelled_swaps_count=cancelled_swaps_count
        )
        
    except Exception as e:
        db.rollback()
        # Handle the specific foreign key constraint error
        if "ForeignKeyViolation" in str(e) or "violates foreign key constraint" in str(e):
            raise HTTPException(
                status_code=400, 
                detail="Cannot delete staff member due to existing assignments. Use cascade_assignments=true or soft_delete=true to handle dependencies, or remove assignments manually first."
            )
        else:
            raise HTTPException(status_code=500, detail=f"Failed to delete staff member: {str(e)}")

@router.post("/check-duplicate")
def check_staff_duplicate(
    check_data: StaffDuplicateCheck,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Check if staff member already exists (legacy endpoint - use validate-before-create instead)"""
    
    existing = db.exec(
        select(Staff).join(Facility).where(
            Staff.full_name.ilike(f"%{check_data.full_name}%"), # type: ignore
            Staff.facility_id == check_data.facility_id,
            Facility.tenant_id == current_user.tenant_id,
            Staff.is_active == True
        )
    ).first()
    
    return {
        "exists": existing is not None,
        "existing_staff": {
            "id": str(existing.id),
            "full_name": existing.full_name,
            "email": existing.email,
            "role": existing.role
        } if existing else None
    }

#================== STAFF PROFILING ===============================================
@router.get("/me", response_model=StaffRead)
def get_my_staff_profile(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get current user's staff profile"""
    if current_user.is_manager:
        raise HTTPException(status_code=403, detail="This endpoint is for staff only")
    
    # Find staff record by email match
    staff = db.exec(
        select(Staff).join(Facility).where(
            Staff.email == current_user.email,
            Facility.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff profile not found")
    
    return staff

@router.get("/me/schedule")
def get_my_schedule(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get current staff member's schedule for a date range"""
    if current_user.is_manager:
        raise HTTPException(status_code=403, detail="This endpoint is for staff only")
    
    # Find staff record
    staff = db.exec(
        select(Staff).join(Facility).where(
            Staff.email == current_user.email,
            Facility.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff profile not found")
    
    # Parse dates with timezone awareness
    start = parse_date_input(start_date)
    end = parse_date_input(end_date)
    
    # Get all schedules for this facility in date range
    schedules = db.exec(
        select(Schedule).where(
            Schedule.facility_id == staff.facility_id,
            Schedule.week_start >= start - timedelta(days=7),  # Include overlapping weeks
            Schedule.week_start <= end
        )
    ).all()
    
    my_assignments = []
    for schedule in schedules:
        assignments = db.exec(
            select(ShiftAssignment).where(
                ShiftAssignment.schedule_id == schedule.id,
                ShiftAssignment.staff_id == staff.id
            )
        ).all()
        
        for assignment in assignments:
            assignment_date = schedule.week_start + timedelta(days=assignment.day)
            
            # Only include assignments in requested date range
            if start <= assignment_date <= end:
                my_assignments.append({
                    "date": assignment_date.isoformat(),
                    "day_of_week": assignment.day,
                    "shift": assignment.shift,
                    "schedule_id": str(schedule.id),
                    "assignment_id": str(assignment.id)
                })
    
    return {
        "staff_id": str(staff.id),
        "staff_name": staff.full_name,
        "facility_id": str(staff.facility_id),
        "assignments": my_assignments
    }


@router.get("/me/dashboard-stats")
def get_my_dashboard_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get enhanced dashboard statistics for current staff member"""
    if current_user.is_manager:
        raise HTTPException(status_code=403, detail="This endpoint is for staff only")
    
    # Find staff record
    staff = db.exec(
        select(Staff).join(Facility).where(
            Staff.email == current_user.email,
            Facility.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff profile not found")
    
    # Get current UTC time and date
    now_utc = get_current_utc_datetime()
    today_utc = get_current_utc_date()
    
    # Get current week boundaries (in UTC)
    days_since_monday = today_utc.weekday()
    week_start = today_utc - timedelta(days=days_since_monday)
    week_end = week_start + timedelta(days=6)
    
    # Get next week
    next_week_start = week_start + timedelta(days=7)
    next_week_end = next_week_start + timedelta(days=6)
    
    # Get schedules for current and next week
    schedules = db.exec(
        select(Schedule).where(
            Schedule.facility_id == staff.facility_id,
            Schedule.week_start.in_([week_start, next_week_start]) # type: ignore
        )
    ).all()
    
    # Count assignments and calculate hours
    current_week_hours = 0
    next_week_hours = 0
    upcoming_shifts = []
    
    for schedule in schedules:
        assignments = db.exec(
            select(ShiftAssignment).where(
                ShiftAssignment.schedule_id == schedule.id,
                ShiftAssignment.staff_id == staff.id
            )
        ).all()
        
        for assignment in assignments:
            assignment_date = schedule.week_start + timedelta(days=assignment.day)
            
            # Estimate 8 hours per shift (could be made configurable)
            shift_hours = 8
            
            if week_start <= assignment_date <= week_end:
                current_week_hours += shift_hours
            elif next_week_start <= assignment_date <= next_week_end:
                next_week_hours += shift_hours
            
            # Add to upcoming shifts if within next 7 days
            if assignment_date >= today_utc and assignment_date <= (today_utc + timedelta(days=7)):
                shift_names = ["Morning", "Afternoon", "Evening"]
                shift_times = ["6:00 AM - 2:00 PM", "2:00 PM - 10:00 PM", "10:00 PM - 6:00 AM"]
                day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
                
                upcoming_shifts.append({
                    "day": assignment.day,
                    "shift": assignment.shift,
                    "date": assignment_date.strftime("%Y-%m-%d"),
                    "day_name": day_names[assignment.day] if assignment.day < 7 else "Unknown",
                    "shift_name": shift_names[assignment.shift] if assignment.shift < 3 else "Unknown",
                    "shift_time": shift_times[assignment.shift] if assignment.shift < 3 else "Unknown",
                    "is_today": assignment_date == today_utc,
                    "is_tomorrow": assignment_date == (today_utc + timedelta(days=1)),
                    "assignment_id": str(assignment.id),
                    "schedule_id": str(schedule.id)
                })
    
    # Sort upcoming shifts by date
    upcoming_shifts.sort(key=lambda x: x["date"])
    
    # Get pending swap requests
    pending_swaps = db.exec(
        select(SwapRequest).where(
            SwapRequest.requesting_staff_id == staff.id,
            SwapRequest.status == "pending"
        )
    ).all()
    
    # Get recent swap activity for gamification stats (last 30 days)
    recent_date = now_utc - timedelta(days=30)
    
    # Requests where I was the target
    requests_for_me = db.exec(
        select(SwapRequest).where(
            SwapRequest.target_staff_id == staff.id,
            SwapRequest.created_at >= recent_date
        )
    ).all()
    
    # Requests where I helped others (auto-assigned)
    helped_others = db.exec(
        select(SwapRequest).where(
            SwapRequest.assigned_staff_id == staff.id,
            SwapRequest.created_at >= recent_date,
            SwapRequest.status.in_([SwapStatus.EXECUTED, SwapStatus.STAFF_ACCEPTED]) # type: ignore
        )
    ).all()
    
    # Calculate acceptance rate
    total_requests_for_me = len(requests_for_me)
    accepted_requests = len([r for r in requests_for_me if r.target_staff_accepted == True])
    acceptance_rate = (accepted_requests / total_requests_for_me * 100) if total_requests_for_me > 0 else 0
    
    # Calculate helpfulness score
    total_auto_requests = db.exec(
        select(func.count(SwapRequest.id)).where(
            SwapRequest.swap_type == "auto",
            SwapRequest.created_at >= recent_date
        )
    ).one()
    
    helpfulness_score = (len(helped_others) / total_auto_requests * 100) if total_auto_requests > 0 else 0
    
    # Calculate current streak
    recent_requests = sorted(requests_for_me, key=lambda x: x.created_at, reverse=True)[:10]
    current_streak = 0
    for request in recent_requests:
        if request.target_staff_accepted == True:
            current_streak += 1
        elif request.target_staff_accepted == False:
            break
    
    # Calculate average response time with timezone awareness
    responded_requests = [r for r in requests_for_me if r.target_staff_accepted is not None and r.updated_at]
    avg_response_time = "N/A"
    
    if responded_requests:
        total_response_time = 0
        for request in responded_requests:
            created_at = ensure_timezone_aware(request.created_at)
            updated_at = ensure_timezone_aware(request.updated_at)
            if created_at and updated_at:
                total_response_time += (updated_at - created_at).total_seconds() / 3600
        
        if total_response_time > 0:
            avg_hours = total_response_time / len(responded_requests)
            
            if avg_hours < 1:
                avg_response_time = f"{int(avg_hours * 60)} minutes"
            elif avg_hours < 24:
                avg_response_time = f"{avg_hours:.1f} hours"
            else:
                avg_response_time = f"{int(avg_hours / 24)} days"
    
    return {
        "staff_id": str(staff.id),
        "thisWeekHours": current_week_hours,
        "nextWeekHours": next_week_hours,
        "upcomingShifts": upcoming_shifts,
        "pendingSwaps": len(pending_swaps),
        "acceptanceRate": round(acceptance_rate, 1),
        "helpfulnessScore": round(helpfulness_score, 1),
        "currentStreak": current_streak,
        "totalHelped": len(helped_others),
        "avgResponseTime": avg_response_time,
        "teamRating": min(95, round((acceptance_rate * 0.6) + (helpfulness_score * 0.4), 1))
    }

@router.get("/me/swap-requests", response_model=List[dict])
def get_my_swap_requests(
    status: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get swap requests for current staff member"""
    if current_user.is_manager:
        raise HTTPException(status_code=403, detail="This endpoint is for staff only")
    
    # Find staff record
    staff = db.exec(
        select(Staff).join(Facility).where(
            Staff.email == current_user.email,
            Facility.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff profile not found")
    
    # Properly specify the join condition between SwapRequest and Schedule
    query = select(SwapRequest).join(
        Schedule, 
        SwapRequest.schedule_id == Schedule.id
    ).where(
        Schedule.facility_id == staff.facility_id,
        or_(
            SwapRequest.requesting_staff_id == staff.id,
            SwapRequest.target_staff_id == staff.id,
            SwapRequest.assigned_staff_id == staff.id
        )
    )
    
    if status:
        query = query.where(SwapRequest.status == status)
    
    swap_requests = db.exec(query.order_by(SwapRequest.created_at.desc()).limit(limit)).all()
    
    # Format results with additional context
    result = []
    for swap in swap_requests:
        requesting_staff = db.get(Staff, swap.requesting_staff_id)
        target_staff = db.get(Staff, swap.target_staff_id) if swap.target_staff_id else None
        assigned_staff = db.get(Staff, swap.assigned_staff_id) if swap.assigned_staff_id else None
        
        # Determine user's role in this swap
        user_role = "unknown"
        if swap.requesting_staff_id == staff.id:
            user_role = "requester"
        elif swap.target_staff_id == staff.id:
            user_role = "target"
        elif swap.assigned_staff_id == staff.id:
            user_role = "assigned"
        
        result.append({
            **swap.model_dump(),
            "user_role": user_role,
            "requesting_staff": requesting_staff.model_dump() if requesting_staff else None,
            "target_staff": target_staff.model_dump() if target_staff else None,
            "assigned_staff": assigned_staff.model_dump() if assigned_staff else None,
            "can_respond": user_role in ["target", "assigned"] and swap.status == SwapStatus.POTENTIAL_ASSIGNMENT
        })

    return result


@router.post("/bulk-status")
def get_bulk_staff_status(
    staff_ids: List[str],
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Get status information for multiple staff members in a single request.
    Returns user account status and invitation status for each staff member.
    """
    if not staff_ids:
        return []

    # Fetch all staff members
    staff_members = db.exec(
        select(Staff)
        .join(Facility)
        .where(
            Staff.id.in_([UUID(sid) for sid in staff_ids]),
            Facility.tenant_id == current_user.tenant_id
        )
    ).all()

    # Create a map for quick lookup
    staff_map = {str(staff.id): staff for staff in staff_members}

    # Get all emails
    emails = [staff.email for staff in staff_members if staff.email]

    # Batch check for user accounts
    users = db.exec(
        select(User)
        .where(
            User.email.in_(emails),
            User.tenant_id == current_user.tenant_id
        )
    ).all()
    user_by_email = {user.email.lower(): user for user in users}

    # Batch check for invitations
    invitations = db.exec(
        select(StaffInvitation)
        .where(
            StaffInvitation.staff_id.in_([UUID(sid) for sid in staff_ids]),
            StaffInvitation.status.in_(['pending', 'sent'])
        )
    ).all()
    invitation_by_staff_id = {str(inv.staff_id): inv for inv in invitations}

    # Build response
    results = []
    for staff_id in staff_ids:
        staff = staff_map.get(staff_id)
        if not staff:
            continue

        staff_email_lower = staff.email.lower() if staff.email else None
        user = user_by_email.get(staff_email_lower) if staff_email_lower else None
        invitation = invitation_by_staff_id.get(staff_id)

        if user:
            status = 'registered'
            user_active = user.is_active
            invitation_id = None
        elif invitation:
            status = 'invited'
            user_active = None
            invitation_id = str(invitation.id)
        else:
            status = 'no_account'
            user_active = None
            invitation_id = None

        results.append({
            'staff_id': staff_id,
            'email': staff.email,
            'full_name': staff.full_name,
            'status': status,
            'user_active': user_active,
            'invitation_id': invitation_id
        })

    return results