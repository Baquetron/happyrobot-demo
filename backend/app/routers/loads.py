from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..auth import require_api_key
from ..database import get_db
from ..models import Call, Load
from ..schemas import BookRequest, LoadOut

router = APIRouter(prefix="/loads", tags=["loads"], dependencies=[Depends(require_api_key)])


@router.get("/search", response_model=list[LoadOut])
def search_loads(
    origin: str | None = None,
    destination: str | None = None,
    equipment_type: str | None = None,
    pickup_after: datetime | None = None,
    pickup_before: datetime | None = None,
    min_rate: float | None = None,
    max_rate: float | None = None,
    include_booked: bool = False,
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(Load)
    if not include_booked:
        q = q.filter(Load.status == "available")
    if origin:
        q = q.filter(Load.origin.ilike(f"%{origin}%"))
    if destination:
        q = q.filter(Load.destination.ilike(f"%{destination}%"))
    if equipment_type:
        q = q.filter(Load.equipment_type.ilike(equipment_type))
    if pickup_after:
        q = q.filter(Load.pickup_datetime >= pickup_after)
    if pickup_before:
        q = q.filter(Load.pickup_datetime <= pickup_before)
    if min_rate is not None:
        q = q.filter(Load.loadboard_rate >= min_rate)
    if max_rate is not None:
        q = q.filter(Load.loadboard_rate <= max_rate)
    return q.order_by(Load.pickup_datetime).limit(limit).all()


@router.get("/{load_id}", response_model=LoadOut)
def get_load(load_id: str, db: Session = Depends(get_db)):
    load = db.get(Load, load_id)
    if not load:
        raise HTTPException(404, "Load not found")
    return load


@router.post("/{load_id}/book", response_model=LoadOut)
def book_load(load_id: str, body: BookRequest, db: Session = Depends(get_db)):
    load = db.get(Load, load_id)
    if not load:
        raise HTTPException(404, "Load not found")
    if load.status == "booked":
        raise HTTPException(409, "Load already booked")

    load.status = "booked"
    load.company_name = body.company_name
    load.agreement_date = datetime.utcnow()

    call = Call(
        carrier_name=body.carrier_name or body.company_name,
        mc_number=body.mc_number,
        load_id=load_id,
        initial_rate=load.loadboard_rate,
        final_rate=body.final_rate,
        negotiation_rounds=body.negotiation_rounds,
        outcome="booked",
        sentiment=body.sentiment,
        duration_seconds=body.duration_seconds,
        notes=body.notes,
    )
    db.add(call)
    db.commit()
    db.refresh(load)
    return load
