import json
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from .models import Call, Load


DATA_DIR = Path(__file__).parent.parent / "data"
LOADS_FILE = DATA_DIR / "loads.json"
CALLS_FILE = DATA_DIR / "calls.json"


def _parse_dt(value: str | None) -> datetime | None:
    return datetime.fromisoformat(value) if value else None


def _seed_loads(db: Session) -> None:
    if db.query(Load).count() > 0 or not LOADS_FILE.exists():
        return
    with LOADS_FILE.open() as f:
        rows = json.load(f)
    for r in rows:
        r["pickup_datetime"] = _parse_dt(r["pickup_datetime"])
        r["delivery_datetime"] = _parse_dt(r["delivery_datetime"])
        r["agreement_date"] = _parse_dt(r.get("agreement_date"))
    db.add_all([Load(**r) for r in rows])
    db.commit()


def _seed_calls(db: Session) -> None:
    if db.query(Call).count() > 0 or not CALLS_FILE.exists():
        return
    with CALLS_FILE.open() as f:
        rows = json.load(f)
    for r in rows:
        r["created_at"] = _parse_dt(r["created_at"])
    db.add_all([Call(**r) for r in rows])
    db.commit()


def seed_loads(db: Session) -> None:
    """Backwards-compatible entrypoint; seeds both loads and calls if needed."""
    _seed_loads(db)
    _seed_calls(db)
