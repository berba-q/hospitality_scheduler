# app/api/endpoints/analytics.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from uuid import UUID

from ...deps import get_db, get_current_user
from ...models import Staff, Facility, SwapRequest, SwapHistory
from ...schemas import StaffRead

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/staff/{staff_id}/reliability-stats")
def get_staff_reliability_stats(
    staff_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    days: int = Query(30, description="Number of days to analyze")
):
    """Get reliability statistics for gamification"""
    
    # Verify staff access
    staff = db.get(Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    facility = db.get(Facility, staff.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Date range for analysis
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get swap requests where this staff was the target
    requests_for_me = db.exec(
        select(SwapRequest).where(
            SwapRequest.target_staff_id == staff_id,
            SwapRequest.created_at >= start_date
        )
    ).all()
    
    # Calculate acceptance rate
    total_requests = len(requests_for_me)
    accepted_requests = len([r for r in requests_for_me if r.target_staff_accepted == True])
    acceptance_rate = (accepted_requests / total_requests * 100) if total_requests > 0 else 0
    
    # Get swap requests where this staff helped others (auto-assigned)
    helped_others = db.exec(
        select(SwapRequest).where(
            SwapRequest.assigned_staff_id == staff_id,
            SwapRequest.created_at >= start_date,
            SwapRequest.status.in_(["executed", "assigned"])
        )
    ).all()
    
    # Calculate helpfulness score
    total_opportunities = db.exec(
        select(func.count(SwapRequest.id)).where(
            SwapRequest.swap_type == "auto",
            SwapRequest.created_at >= start_date
        )
    ).one()
    
    helpfulness_score = (len(helped_others) / total_opportunities * 100) if total_opportunities > 0 else 0
    
    # Calculate current streak
    recent_requests = sorted(requests_for_me, key=lambda x: x.created_at, reverse=True)[:10]
    current_streak = 0
    for request in recent_requests:
        if request.target_staff_accepted == True:
            current_streak += 1
        elif request.target_staff_accepted == False:
            break
    
    # Calculate average response time
    responded_requests = [r for r in requests_for_me if r.target_staff_accepted is not None]
    avg_response_time = "N/A"
    if responded_requests:
        total_response_time = sum([
            (r.updated_at - r.created_at).total_seconds() / 3600 
            for r in responded_requests if r.updated_at
        ])
        avg_hours = total_response_time / len(responded_requests)
        if avg_hours < 1:
            avg_response_time = f"{int(avg_hours * 60)} minutes"
        elif avg_hours < 24:
            avg_response_time = f"{avg_hours:.1f} hours"
        else:
            avg_response_time = f"{int(avg_hours / 24)} days"
    
    # Calculate team rating (based on recent performance)
    team_rating = min(95, (acceptance_rate * 0.6) + (helpfulness_score * 0.4))
    
    return {
        "staff_id": str(staff_id),
        "period_days": days,
        "acceptance_rate": round(acceptance_rate, 1),
        "helpfulness_score": round(helpfulness_score, 1),
        "current_streak": current_streak,
        "total_helped": len(helped_others),
        "total_requests": total_requests,
        "avg_response_time": avg_response_time,
        "team_rating": round(team_rating, 1)
    }

@router.get("/facilities/{facility_id}/team-insights")
def get_team_insights(
    facility_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    days: int = Query(30, description="Number of days to analyze")
):
    """Get team insights for gamification dashboard"""
    
    # Verify facility access
    facility = db.get(Facility, facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get all swap requests for this facility
    swap_requests = db.exec(
        select(SwapRequest).join(Staff).where(
            Staff.facility_id == facility_id,
            SwapRequest.created_at >= start_date
        )
    ).all()
    
    # Analyze patterns
    day_counts = {}
    shift_counts = {}
    
    for swap in swap_requests:
        # Count by day of week
        day_name = swap.created_at.strftime('%A')
        day_counts[day_name] = day_counts.get(day_name, 0) + 1
        
        # Count by shift (would need shift mapping)
        shift_name = ["Morning", "Afternoon", "Evening"][swap.original_shift] if swap.original_shift < 3 else "Unknown"
        shift_counts[shift_name] = shift_counts.get(shift_name, 0) + 1
    
    # Find busy days (top 3)
    busy_days = sorted(day_counts.items(), key=lambda x: x[1], reverse=True)[:3]
    busy_days = [day for day, count in busy_days]
    
    # Find needy shifts (top 2)
    needy_shifts = sorted(shift_counts.items(), key=lambda x: x[1], reverse=True)[:2]
    needy_shifts = [shift for shift, count in needy_shifts]
    
    # Calculate team coverage (percentage of requests fulfilled)
    total_requests = len(swap_requests)
    fulfilled_requests = len([r for r in swap_requests if r.status in ["executed", "assigned"]])
    team_coverage = (fulfilled_requests / total_requests * 100) if total_requests > 0 else 100
    
    # Calculate current user's contribution (if staff user)
    your_contribution = 0
    if not current_user.is_manager:
        user_staff = db.exec(
            select(Staff).where(
                Staff.email == current_user.email,
                Staff.facility_id == facility_id
            )
        ).first()
        
        if user_staff:
            your_helped = len([r for r in swap_requests if r.assigned_staff_id == user_staff.id])
            your_contribution = (your_helped / total_requests * 100) if total_requests > 0 else 0
    
    # Generate trend message
    recent_coverage = team_coverage  # Would compare to previous period
    if recent_coverage >= 80:
        trend_message = "Team coverage is strong this month! 💪"
    elif recent_coverage >= 60:
        trend_message = "Team is working well together"
    else:
        trend_message = "Team could use more mutual support"
    
    return {
        "facility_id": str(facility_id),
        "period_days": days,
        "busy_days": busy_days,
        "needy_shifts": needy_shifts,
        "team_coverage": round(team_coverage, 1),
        "your_contribution": round(your_contribution, 1),
        "recent_trends": trend_message,
        "total_requests": total_requests,
        "fulfilled_requests": fulfilled_requests
    }

@router.get("/staff/{staff_id}/swap-analytics")
def get_swap_analytics(
    staff_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    period: str = Query("30d", description="Period: 7d, 30d, 90d")
):
    """Get detailed swap analytics for a staff member"""
    
    # Parse period
    period_map = {"7d": 7, "30d": 30, "90d": 90}
    days = period_map.get(period, 30)
    
    # Verify staff access
    staff = db.get(Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    facility = db.get(Facility, staff.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get all swap activity for this staff member
    my_requests = db.exec(
        select(SwapRequest).where(
            SwapRequest.requesting_staff_id == staff_id,
            SwapRequest.created_at >= start_date
        )
    ).all()
    
    requests_for_me = db.exec(
        select(SwapRequest).where(
            SwapRequest.target_staff_id == staff_id,
            SwapRequest.created_at >= start_date
        )
    ).all()
    
    helped_others = db.exec(
        select(SwapRequest).where(
            SwapRequest.assigned_staff_id == staff_id,
            SwapRequest.created_at >= start_date
        )
    ).all()
    
    # Time-based analytics
    weekly_activity = {}
    for request in my_requests + requests_for_me + helped_others:
        week_key = request.created_at.strftime('%Y-W%U')
        if week_key not in weekly_activity:
            weekly_activity[week_key] = {"requested": 0, "helped": 0, "received": 0}
        
        if request.requesting_staff_id == staff_id:
            weekly_activity[week_key]["requested"] += 1
        elif request.target_staff_id == staff_id:
            weekly_activity[week_key]["received"] += 1
        elif request.assigned_staff_id == staff_id:
            weekly_activity[week_key]["helped"] += 1
    
    return {
        "staff_id": str(staff_id),
        "period": period,
        "summary": {
            "total_requested": len(my_requests),
            "total_received": len(requests_for_me),
            "total_helped": len(helped_others),
            "success_rate": len([r for r in my_requests if r.status == "executed"]) / len(my_requests) * 100 if my_requests else 0
        },
        "weekly_activity": weekly_activity,
        "recent_requests": [
            {
                "id": str(r.id),
                "type": "requested" if r.requesting_staff_id == staff_id else "received" if r.target_staff_id == staff_id else "helped",
                "status": r.status,
                "created_at": r.created_at.isoformat(),
                "urgency": r.urgency
            }
            for r in sorted(my_requests + requests_for_me + helped_others, key=lambda x: x.created_at, reverse=True)[:10]
        ]
    }