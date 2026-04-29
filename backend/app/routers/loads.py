from datetime import date, datetime, time, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BeforeValidator
from sqlalchemy.orm import Session

from ..auth import require_api_key
from ..database import get_db
from ..models import Call, Load
from ..schemas import BookRequest, LoadOut

router = APIRouter(prefix="/loads", tags=["loads"], dependencies=[Depends(require_api_key)])


def _empty_to_none(v):
    """Treat empty strings as 'not provided'.

    HappyRobot's webhook node sends every configured param even when unset,
    serializing them as "". Without this coercion, Pydantic rejects "" as an
    invalid date/int/bool. Run before parsing.
    """
    return None if v == "" else v


EmptyAsNone = BeforeValidator(_empty_to_none)


@router.get("/search", response_model=list[LoadOut])
def search_loads(
    origin: Annotated[str | None, EmptyAsNone] = None,
    destination: Annotated[str | None, EmptyAsNone] = None,
    equipment_type: Annotated[str | None, EmptyAsNone] = None,
    pickup_date: Annotated[
        str | None,
        EmptyAsNone,
    ] = Query(
        default=None,
        description="Match loads with pickup_datetime on this calendar day (YYYY-MM-DD).",
    ),
    pickup_after: Annotated[datetime | None, EmptyAsNone] = None,
    pickup_before: Annotated[datetime | None, EmptyAsNone] = None,
    min_rate: Annotated[float | None, EmptyAsNone] = None,
    max_rate: Annotated[float | None, EmptyAsNone] = None,
    include_booked: Annotated[bool | None, EmptyAsNone] = False,
    limit: Annotated[int | None, EmptyAsNone] = Query(10, ge=1, le=100),
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
    if pickup_date is not None:
        try:
            d = date.fromisoformat(pickup_date)
        except ValueError:
            raise HTTPException(400, "pickup_date must be YYYY-MM-DD")
        day_start = datetime.combine(d, time.min, tzinfo=timezone.utc)
        day_end = datetime.combine(d, time.max, tzinfo=timezone.utc)
        q = q.filter(Load.pickup_datetime >= day_start, Load.pickup_datetime <= day_end)
    if pickup_after:
        q = q.filter(Load.pickup_datetime >= pickup_after)
    if pickup_before:
        q = q.filter(Load.pickup_datetime <= pickup_before)
    if min_rate is not None:
        q = q.filter(Load.loadboard_rate >= min_rate)
    if max_rate is not None:
        q = q.filter(Load.loadboard_rate <= max_rate)
    return q.order_by(Load.pickup_datetime).limit(limit or 10).all()


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
    load.mc_number = body.mc_number
    load.agreement_date = datetime.utcnow()
    load.agreed_rate = body.final_rate

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
