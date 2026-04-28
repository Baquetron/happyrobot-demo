import json
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from .models import Load


SEED_FILE = Path(__file__).parent.parent / "data" / "loads.json"


def seed_loads(db: Session) -> None:
    if db.query(Load).count() > 0:
        return
    if not SEED_FILE.exists():
        return
    with SEED_FILE.open() as f:
        rows = json.load(f)
    for r in rows:
        r["pickup_datetime"] = datetime.fromisoformat(r["pickup_datetime"])
        r["delivery_datetime"] = datetime.fromisoformat(r["delivery_datetime"])
    db.add_all([Load(**r) for r in rows])
    db.commit()
