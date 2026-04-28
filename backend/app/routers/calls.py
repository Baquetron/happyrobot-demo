from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..auth import require_api_key
from ..database import get_db
from ..models import Call
from ..schemas import CallbackPayload, CallOut

router = APIRouter(prefix="/calls", tags=["calls"], dependencies=[Depends(require_api_key)])


@router.post("", response_model=CallOut)
def create_call(payload: CallbackPayload, db: Session = Depends(get_db)):
    call = Call(**payload.model_dump())
    db.add(call)
    db.commit()
    db.refresh(call)
    return call


@router.get("", response_model=list[CallOut])
def list_calls(limit: int = Query(50, ge=1, le=500), db: Session = Depends(get_db)):
    return db.query(Call).order_by(Call.created_at.desc()).limit(limit).all()
