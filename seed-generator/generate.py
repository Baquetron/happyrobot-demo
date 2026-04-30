"""Generate sample data for the HappyRobot demo backend.

Outputs:
  backend/data/loads.json  300 loads (250 available + 50 booked)
  backend/data/calls.json  ~80 calls (50 booked + ~10 prior-failed-attempts
                           on later-booked loads + ~30 pure failures)

Constraints baked in:
  - Pickup datetimes spread across May 2026
  - Origin distribution weighted toward freight hubs (multiple loads
    per popular origin)
  - 8 chained pairs where load B's origin = load A's destination, with
    a 4-24h gap (lets the agent pitch a "consecutive shipment" discount)
  - Equipment <-> commodity pairings respected (Reefer ↔ Frozen/Produce/...)
  - Booked loads are spread across origins, not clustered
  - 4 real-world MC numbers (Swift, Schneider, JBH, Werner) + 8 fictional
    smaller carriers in the carrier pool
  - failed_verification calls use plausible-looking but fake MC numbers

Deterministic via random.seed(42). Re-run any time to regenerate.

Usage:
  python seed-generator/generate.py
"""

from __future__ import annotations

import csv
import json
import random
from datetime import datetime, timedelta, timezone
from math import asin, cos, radians, sin, sqrt
from pathlib import Path

SEED = 42
random.seed(SEED)

# Anchor for "recent" call dates. All seed calls (and the agreement_date
# on booked loads) land in the 30 days BEFORE this anchor, so that when
# the agent makes a real test call its created_at is the most recent and
# bubbles to the top of the recent-calls feed.
NOW = datetime.now(timezone.utc).replace(microsecond=0)

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_LOADS = REPO_ROOT / "backend" / "data" / "loads.json"
OUT_CALLS = REPO_ROOT / "backend" / "data" / "calls.json"
OUT_LOADS_CSV = REPO_ROOT / "backend" / "data" / "loads.csv"
OUT_CALLS_CSV = REPO_ROOT / "backend" / "data" / "calls.csv"


# --- Reference data -----------------------------------------------------

CITY_COORDS: dict[str, tuple[float, float]] = {
    "Dallas, TX": (32.78, -96.80), "Houston, TX": (29.76, -95.37),
    "San Antonio, TX": (29.42, -98.49), "El Paso, TX": (31.76, -106.49),
    "Los Angeles, CA": (34.05, -118.24), "Sacramento, CA": (38.58, -121.49),
    "Las Vegas, NV": (36.17, -115.14), "Phoenix, AZ": (33.45, -112.07),
    "Albuquerque, NM": (35.08, -106.65), "Denver, CO": (39.74, -104.99),
    "Salt Lake City, UT": (40.76, -111.89), "Seattle, WA": (47.61, -122.33),
    "Portland, OR": (45.52, -122.68), "Chicago, IL": (41.88, -87.63),
    "Indianapolis, IN": (39.77, -86.16), "Detroit, MI": (42.33, -83.05),
    "Cleveland, OH": (41.50, -81.69), "Columbus, OH": (39.96, -82.99),
    "Pittsburgh, PA": (40.44, -79.99), "Memphis, TN": (35.15, -90.05),
    "Nashville, TN": (36.16, -86.78), "Atlanta, GA": (33.75, -84.39),
    "Jacksonville, FL": (30.33, -81.66), "Tampa, FL": (27.95, -82.46),
    "Miami, FL": (25.76, -80.19), "New Orleans, LA": (29.95, -90.07),
    "Birmingham, AL": (33.52, -86.80), "Charlotte, NC": (35.23, -80.84),
    "Richmond, VA": (37.54, -77.43), "Baltimore, MD": (39.29, -76.61),
    "Philadelphia, PA": (39.95, -75.16), "Newark, NJ": (40.74, -74.17),
    "Boston, MA": (42.36, -71.06), "Minneapolis, MN": (44.98, -93.27),
    "St. Louis, MO": (38.63, -90.20), "Kansas City, MO": (39.10, -94.58),
    "Oklahoma City, OK": (35.47, -97.52),
}
CITIES = list(CITY_COORDS.keys())

# Higher weights = more loads originate from these freight hubs
ORIGIN_WEIGHTS: dict[str, int] = {
    "Dallas, TX": 5, "Houston, TX": 4, "Los Angeles, CA": 5, "Chicago, IL": 5,
    "Atlanta, GA": 4, "Memphis, TN": 4, "Newark, NJ": 3, "Phoenix, AZ": 3,
}  # all others default to 1

EQUIPMENT_COMMODITY: dict[str, list[str]] = {
    "Dry Van": ["Consumer Goods", "Auto Parts", "Retail Goods", "Electronics",
                "Apparel", "Packaged Food", "Beverages", "Paper Products"],
    "Reefer": ["Frozen Food", "Frozen Seafood", "Produce", "Dairy", "Meat",
               "Pharmaceuticals"],
    "Flatbed": ["Steel", "Building Materials", "Lumber", "Concrete Products"],
    "Step Deck": ["Heavy Machinery", "Construction Equipment", "Oversized Cargo"],
}
EQUIPMENT_DIST = (
    ["Dry Van"] * 60 + ["Reefer"] * 22 + ["Flatbed"] * 13 + ["Step Deck"] * 5
)

# (carrier_name, mc_number) — first 4 are real active MCs; rest are fictional
CARRIERS: list[tuple[str, str]] = [
    ("SWIFT TRANSPORTATION CO OF ARIZONA LLC", "244265"),
    ("SCHNEIDER NATIONAL CARRIERS INC", "87413"),
    ("J.B. HUNT TRANSPORT INC", "184320"),
    ("WERNER ENTERPRISES INC", "118273"),
    ("Lonestar Logistics LLC", "885214"),
    ("Pine Ridge Trucking", "672041"),
    ("Cascadia Freight Co", "541938"),
    ("Heartland Hauling", "339476"),
    ("Gulf Coast Carriers", "721594"),
    ("Big Sky Motor Lines", "456813"),
    ("Continental Trans LLC", "918275"),
    ("Summit Cargo Solutions", "203684"),
]
INVALID_MCS = ["10204", "55621", "73849", "98123", "44712", "67234", "12387", "85019"]


# --- Helpers ------------------------------------------------------------

def haversine_miles(c1: str, c2: str) -> int:
    lat1, lon1 = CITY_COORDS[c1]
    lat2, lon2 = CITY_COORDS[c2]
    r1, l1, r2, l2 = map(radians, (lat1, lon1, lat2, lon2))
    dlat, dlon = r2 - r1, l2 - l1
    a = sin(dlat / 2) ** 2 + cos(r1) * cos(r2) * sin(dlon / 2) ** 2
    c = 2 * asin(sqrt(a))
    return max(50, int(c * 3958.8))


def weighted_origin() -> str:
    pool: list[str] = []
    for city in CITIES:
        pool.extend([city] * ORIGIN_WEIGHTS.get(city, 1))
    return random.choice(pool)


def random_pickup() -> datetime:
    day = random.randint(1, 31)
    hour = random.choice([5, 6, 7, 8, 9, 10, 11, 13, 14, 15])
    minute = random.choice([0, 15, 30, 45])
    return datetime(2026, 5, day, hour, minute, tzinfo=timezone.utc)


def estimate_delivery(pickup: datetime, miles: int) -> datetime:
    drive_hours = miles / 50  # ~50 mph average including stops
    rest_hours = (drive_hours // 11) * 10  # one 10h rest per 11h drive cycle
    total = drive_hours + rest_hours + random.uniform(2, 6)
    return pickup + timedelta(hours=total)


def rate_for(miles: int, equipment: str) -> int:
    """Loadboard rate as an integer multiple of 10."""
    base = {"Dry Van": 1.85, "Reefer": 2.30, "Flatbed": 2.50, "Step Deck": 2.80}[equipment]
    raw = miles * base * random.uniform(0.92, 1.12)
    return max(50, int(round(raw / 10) * 10))


def equipment_and_commodity() -> tuple[str, str]:
    eq = random.choice(EQUIPMENT_DIST)
    return eq, random.choice(EQUIPMENT_COMMODITY[eq])


def random_dimensions(equipment: str) -> str:
    if equipment == "Flatbed":
        return f"{random.choice([240, 300, 360, 420, 480])}x96x{random.randint(36, 96)} in"
    if equipment == "Step Deck":
        return f"{random.choice([240, 300, 360])}x102x{random.randint(96, 144)} in"
    return f"48x40x{random.choice([48, 50, 55, 60, 65, 70])} in pallets"


def random_load_notes(equipment: str) -> str:
    pool = [
        "Drop and hook at both ends.",
        "Live unload. Lumper fee reimbursed with receipt.",
        "Inside delivery. Driver assist required.",
        "Appointment required at delivery.",
        "FCFS pickup window.",
        "No-touch freight.",
        "Detention paid after 2 hours.",
        "TWIC card required at port pickup.",
        "Multi-stop pickup at two locations.",
    ]
    if equipment == "Reefer":
        pool += ["Maintain 34F throughout transit.",
                 "Pre-cool trailer 1 hour before loading.",
                 "Continuous run mode required."]
    if equipment == "Flatbed":
        pool += ["Tarps and chains required.",
                 "Coil racks required.",
                 "Oversized load permit included."]
    return random.choice(pool)


def random_recent_dt() -> datetime:
    """Random datetime in the past 30 days, relative to NOW. Used for call
    timestamps so seed data stays older than any real test call."""
    days_ago = random.uniform(0.1, 30)
    return NOW - timedelta(days=days_ago)


# --- Load generation ----------------------------------------------------

def generate_loads(n: int = 300) -> list[dict]:
    loads: list[dict] = []
    for i in range(1, n + 1):
        origin = weighted_origin()
        destination = random.choice([c for c in CITIES if c != origin])
        equipment, commodity = equipment_and_commodity()
        pickup = random_pickup()
        miles = haversine_miles(origin, destination)
        delivery = estimate_delivery(pickup, miles)
        weight = random.choice([22000, 28000, 32000, 36000, 38000, 41000, 43000, 46000])
        loads.append({
            "load_id": f"L-{2000 + i:04d}",
            "origin": origin,
            "destination": destination,
            "pickup_datetime": pickup.isoformat(),
            "delivery_datetime": delivery.isoformat(),
            "equipment_type": equipment,
            "loadboard_rate": rate_for(miles, equipment),
            "notes": random_load_notes(equipment),
            "weight": weight,
            "commodity_type": commodity,
            "num_of_pieces": random.randint(6, 32),
            "miles": miles,
            "dimensions": random_dimensions(equipment),
            "status": "available",
            "company_name": None,
            "mc_number": None,
            "agreement_date": None,
            "agreed_rate": None,
        })
    return loads


def inject_chains(loads: list[dict], num_chains: int = 8) -> int:
    """Mutate ~num_chains pairs so load B.origin == load A.destination
    with B.pickup ~4-24h after A.delivery. Returns number actually made."""
    indices = list(range(len(loads)))
    random.shuffle(indices)
    used: set[int] = set()
    made = 0
    for idx_a in indices:
        if made >= num_chains or idx_a in used:
            continue
        a = loads[idx_a]
        a_delivery = datetime.fromisoformat(a["delivery_datetime"])
        for idx_b in indices:
            if idx_b in used or idx_b == idx_a:
                continue
            b = loads[idx_b]
            if b["origin"] != a["destination"]:
                continue
            new_pickup = a_delivery + timedelta(hours=random.randint(4, 24))
            new_delivery = estimate_delivery(new_pickup, b["miles"])
            if new_pickup.month != 5 or new_delivery.month != 5:
                continue
            b["pickup_datetime"] = new_pickup.isoformat()
            b["delivery_datetime"] = new_delivery.isoformat()
            b["notes"] = (
                "Chains nicely from a delivery in this city — "
                "repeat-lane discount possible. " + b["notes"]
            )
            used.update({idx_a, idx_b})
            made += 1
            break
    return made


def mark_booked(loads: list[dict], n_booked: int = 50) -> list[int]:
    """Mark n loads as booked, distributed across origins. Returns booked indices."""
    # bucket loads by origin to ensure distribution
    by_origin: dict[str, list[int]] = {}
    for i, l in enumerate(loads):
        by_origin.setdefault(l["origin"], []).append(i)
    booked: list[int] = []
    # round-robin across origins until we hit n_booked
    origins = list(by_origin.keys())
    random.shuffle(origins)
    while len(booked) < n_booked:
        progress = False
        for origin in origins:
            if not by_origin[origin]:
                continue
            booked.append(by_origin[origin].pop())
            progress = True
            if len(booked) >= n_booked:
                break
        if not progress:
            break
    for i in booked:
        load = loads[i]
        carrier = random.choice(CARRIERS)
        # Agreement happens in the past 30 days; pickup_datetime stays in
        # May (the load's scheduled pickup). Carriers book ahead — realistic.
        agreement = random_recent_dt()
        # Negotiation rounds drive the final price per the agent's policy:
        # rounds 1-2 close at the original; round 3 closes at +5%.
        rounds = random.choices([1, 2, 3], weights=[5, 3, 2])[0]
        if rounds < 3:
            agreed = load["loadboard_rate"]
        else:
            agreed = int(round(load["loadboard_rate"] * 1.05))
        load["status"] = "booked"
        load["company_name"] = carrier[0]
        load["mc_number"] = carrier[1]
        load["agreement_date"] = agreement.isoformat()
        load["agreed_rate"] = agreed
        load["_winning_rounds"] = rounds  # consumed by gen_winning_call, stripped before write
    return booked


# --- Calls generation ---------------------------------------------------

POSITIVE_NOTES = [
    "Smooth call — carrier accepted original rate.",
    "Quick deal, agreed in under 90 seconds.",
    "Repeat carrier, knew the lane well.",
    "Carrier accepted +5% on round 2 without pushback.",
    "Friendly call, carrier interested in chained next-leg load.",
]
NEUTRAL_BOOKED_NOTES = [
    "Held firm at +5%, carrier reluctantly accepted.",
    "Booked after extended back-and-forth.",
    "Carrier asked clarifying questions on commodity; deal closed.",
]
NEGATIVE_BOOKED_NOTES = [
    "Carrier grumbled but accepted at +10% final.",
    "Tough negotiation, sentiment soured but deal closed.",
]
REJECTED_NOTES = [
    "Carrier wanted +15% — outside ceiling. Walked.",
    "Held firm at original; carrier walked after round 2.",
    "Negotiation reached round 3, carrier rejected final offer.",
    "Carrier insisted on premium for hazmat surcharge; declined.",
]
NO_LOAD_NOTES = [
    "Carrier wanted Reefer on lane with no available loads.",
    "No matching equipment for requested origin/date.",
    "Caller looking for flatbed; none available on requested date.",
    "No loads in requested origin window.",
]
FAILED_VERIF_NOTES = [
    "MC inactive per FMCSA; informed carrier and ended call.",
    "Carrier MC not authorized to operate.",
    "Carrier flagged out of service; ended call politely.",
    "FMCSA returned status code != A; declined.",
]


def gen_winning_call(load: dict) -> dict:
    rounds = load["_winning_rounds"]
    sentiment = random.choices(
        ["positive", "neutral", "negative"], weights=[35, 12, 3]
    )[0]
    if sentiment == "positive":
        note = random.choice(POSITIVE_NOTES)
    elif sentiment == "neutral":
        note = random.choice(NEUTRAL_BOOKED_NOTES)
    else:
        note = random.choice(NEGATIVE_BOOKED_NOTES)
    agreement = datetime.fromisoformat(load["agreement_date"])
    return {
        "created_at": agreement.isoformat(),
        "carrier_name": load["company_name"],
        "mc_number": load["mc_number"],
        "load_id": load["load_id"],
        "initial_rate": load["loadboard_rate"],
        "final_rate": load["agreed_rate"],
        "negotiation_rounds": rounds,
        "outcome": "booked",
        "sentiment": sentiment,
        "duration_seconds": round(random.uniform(75, 290), 1),
        "notes": note,
    }


def gen_lost_attempt_on_booked_load(load: dict) -> dict:
    """A failed prior call on a load that was later booked by someone else."""
    other_pool = [c for c in CARRIERS if c[1] != load["mc_number"]]
    name, mc = random.choice(other_pool)
    rounds = random.choices([2, 3], weights=[1, 2])[0]
    sentiment = random.choices(["neutral", "negative"], weights=[1, 2])[0]
    final_rate = int(round(load["loadboard_rate"] * random.uniform(1.10, 1.20)))
    agreement = datetime.fromisoformat(load["agreement_date"])
    created_at = agreement - timedelta(hours=random.randint(2, 36))
    return {
        "created_at": created_at.isoformat(),
        "carrier_name": name,
        "mc_number": mc,
        "load_id": load["load_id"],
        "initial_rate": load["loadboard_rate"],
        "final_rate": final_rate,
        "negotiation_rounds": rounds,
        "outcome": "rejected",
        "sentiment": sentiment,
        "duration_seconds": round(random.uniform(120, 320), 1),
        "notes": random.choice(REJECTED_NOTES),
    }


def gen_pure_failure(loads: list[dict], outcome: str) -> dict:
    if outcome == "rejected":
        avail = [l for l in loads if l["status"] == "available"]
        load = random.choice(avail)
        name, mc = random.choice(CARRIERS)
        return {
            "created_at": random_recent_dt().isoformat(),
            "carrier_name": name,
            "mc_number": mc,
            "load_id": load["load_id"],
            "initial_rate": load["loadboard_rate"],
            "final_rate": int(round(load["loadboard_rate"] * random.uniform(1.10, 1.20))),
            "negotiation_rounds": random.choices([2, 3], weights=[1, 2])[0],
            "outcome": "rejected",
            "sentiment": random.choices(["neutral", "negative"], weights=[1, 2])[0],
            "duration_seconds": round(random.uniform(120, 320), 1),
            "notes": random.choice(REJECTED_NOTES),
        }
    if outcome == "no_load":
        name, mc = random.choice(CARRIERS)
        return {
            "created_at": random_recent_dt().isoformat(),
            "carrier_name": name,
            "mc_number": mc,
            "load_id": None,
            "initial_rate": None,
            "final_rate": None,
            "negotiation_rounds": 0,
            "outcome": "no_load",
            "sentiment": random.choices(["neutral", "negative"], weights=[2, 1])[0],
            "duration_seconds": round(random.uniform(40, 140), 1),
            "notes": random.choice(NO_LOAD_NOTES),
        }
    if outcome == "failed_verification":
        bad_mc = random.choice(INVALID_MCS)
        return {
            "created_at": random_recent_dt().isoformat(),
            "carrier_name": f"Unknown carrier (MC-{bad_mc})",
            "mc_number": bad_mc,
            "load_id": None,
            "initial_rate": None,
            "final_rate": None,
            "negotiation_rounds": 0,
            "outcome": "failed_verification",
            "sentiment": random.choices(["neutral", "positive"], weights=[2, 1])[0],
            "duration_seconds": round(random.uniform(30, 120), 1),
            "notes": random.choice(FAILED_VERIF_NOTES),
        }
    raise ValueError(outcome)


def generate_calls(loads: list[dict], booked_idx: list[int]) -> list[dict]:
    calls: list[dict] = []
    # 50 winning calls — one per booked load
    for i in booked_idx:
        calls.append(gen_winning_call(loads[i]))
    # 10 prior-failed-attempts on booked loads (realism)
    sample = random.sample(booked_idx, min(10, len(booked_idx)))
    for i in sample:
        calls.append(gen_lost_attempt_on_booked_load(loads[i]))
    # Pure failures, sized so totals land at ~80 calls with the 12/10/8
    # failure mix (where the 12 rejected = 10 prior-attempts + 2 pure):
    for _ in range(2):
        calls.append(gen_pure_failure(loads, "rejected"))
    for _ in range(10):
        calls.append(gen_pure_failure(loads, "no_load"))
    for _ in range(8):
        calls.append(gen_pure_failure(loads, "failed_verification"))
    calls.sort(key=lambda c: c["created_at"])
    return calls


def _write_csv(path: Path, rows: list[dict]) -> None:
    if not rows:
        return
    fieldnames = list(rows[0].keys())
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow({k: ("" if v is None else v) for k, v in r.items()})


# --- Main ---------------------------------------------------------------

def main() -> None:
    loads = generate_loads(300)
    chains = inject_chains(loads, num_chains=8)
    booked_idx = mark_booked(loads, n_booked=50)
    calls = generate_calls(loads, booked_idx)

    # Strip internal-only field before persisting
    for l in loads:
        l.pop("_winning_rounds", None)

    OUT_LOADS.parent.mkdir(parents=True, exist_ok=True)
    OUT_CALLS.parent.mkdir(parents=True, exist_ok=True)
    with OUT_LOADS.open("w") as f:
        json.dump(loads, f, indent=2)
    with OUT_CALLS.open("w") as f:
        json.dump(calls, f, indent=2)
    _write_csv(OUT_LOADS_CSV, loads)
    _write_csv(OUT_CALLS_CSV, calls)

    booked = sum(1 for l in loads if l["status"] == "booked")
    by_outcome: dict[str, int] = {}
    for c in calls:
        by_outcome[c["outcome"]] = by_outcome.get(c["outcome"], 0) + 1

    print(f"Generated {len(loads)} loads "
          f"({booked} booked, {len(loads) - booked} available, {chains} chains)")
    print(f"Generated {len(calls)} calls — outcome counts: {by_outcome}")
    print(f"Wrote {OUT_LOADS.relative_to(REPO_ROOT)}")
    print(f"Wrote {OUT_CALLS.relative_to(REPO_ROOT)}")
    print(f"Wrote {OUT_LOADS_CSV.relative_to(REPO_ROOT)}")
    print(f"Wrote {OUT_CALLS_CSV.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
