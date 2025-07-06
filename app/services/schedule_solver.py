from typing import List, Sequence, Any, Tuple, Dict
from uuid import UUID

AwayTuple = Tuple[UUID, int, int]  # (staff_id, day, shift)

def generate_weekly_schedule(
    staff: Sequence[Any],
    *,
    unavailability: Sequence[AwayTuple] | None = None,
    days: int = 7,
    shifts_per_day: int = 3,
    hours_per_shift: int = 8,
) -> List[Dict]:
    if not staff:
        raise RuntimeError("No staff supplied")

    unavailability = set(unavailability or [])
    roster: list[dict] = []
    idx = 0
    staff_cycle = list(staff)

    for d in range(days):
        for s in range(shifts_per_day):
            attempts = 0
            while attempts < len(staff_cycle):
                candidate = staff_cycle[idx % len(staff_cycle)]
                idx += 1
                attempts += 1
                if (candidate.id, d, s) in unavailability:
                    continue
                if any(r["day"] == d and r["staff_id"] == candidate.id for r in roster):
                    continue
                roster.append({"day": d, "shift": s, "staff_id": candidate.id})
                break
            else:
                raise RuntimeError("No feasible schedule found")

    return roster