from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import require_api_key
from ..database import get_db
from ..models import Call, Load
from ..schemas import CallOut, MetricsResponse, OutcomeCount, SentimentCount

router = APIRouter(prefix="/metrics", tags=["metrics"], dependencies=[Depends(require_api_key)])


@router.get("", response_model=MetricsResponse)
def get_metrics(db: Session = Depends(get_db)):
    total = db.query(Call).count()
    booked = db.query(Call).filter(Call.outcome == "booked").count()

    avg_rounds = db.query(func.avg(Call.negotiation_rounds)).scalar() or 0.0
    avg_final = db.query(func.avg(Call.final_rate)).filter(Call.outcome == "booked").scalar()
    avg_loadboard = (
        db.query(func.avg(Load.loadboard_rate))
        .join(Call, Call.load_id == Load.load_id)
        .filter(Call.outcome == "booked")
        .scalar()
    )
    avg_delta = None
    if avg_final is not None and avg_loadboard is not None:
        avg_delta = float(avg_final) - float(avg_loadboard)
    avg_duration = db.query(func.avg(Call.duration_seconds)).scalar()

    outcomes = db.query(Call.outcome, func.count(Call.id)).group_by(Call.outcome).all()
    sentiments = db.query(Call.sentiment, func.count(Call.id)).group_by(Call.sentiment).all()
    recent = db.query(Call).order_by(Call.created_at.desc()).limit(10).all()

    return MetricsResponse(
        total_calls=total,
        booked_calls=booked,
        conversion_rate=(booked / total) if total else 0.0,
        avg_negotiation_rounds=float(avg_rounds),
        avg_final_rate=float(avg_final) if avg_final is not None else None,
        avg_loadboard_rate=float(avg_loadboard) if avg_loadboard is not None else None,
        avg_rate_delta=avg_delta,
        avg_call_duration=float(avg_duration) if avg_duration is not None else None,
        outcomes=[OutcomeCount(outcome=o, count=c) for o, c in outcomes],
        sentiments=[SentimentCount(sentiment=s, count=c) for s, c in sentiments],
        recent_calls=[CallOut.model_validate(c) for c in recent],
    )
