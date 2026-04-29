from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


Outcome = Literal["booked", "rejected", "no_load", "failed_verification"]
Sentiment = Literal["positive", "neutral", "negative"]


class LoadOut(BaseModel):
    load_id: str
    origin: str
    destination: str
    pickup_datetime: datetime
    delivery_datetime: datetime
    equipment_type: str
    loadboard_rate: int
    notes: str = ""
    weight: float
    commodity_type: str
    num_of_pieces: int
    miles: float
    dimensions: str = ""
    status: str = "available"
    company_name: str | None = None
    mc_number: str | None = None
    agreement_date: datetime | None = None
    agreed_rate: int | None = None

    class Config:
        from_attributes = True


class BookRequest(BaseModel):
    """Body for POST /loads/{id}/book — touches the loads table only.

    Call data (sentiment, duration, negotiation_rounds, notes) is captured
    via POST /calls afterwards.
    """

    mc_number: str
    company_name: str
    final_rate: int


class CarrierVerification(BaseModel):
    mc_number: str
    eligible: bool
    legal_name: str | None = None
    dba_name: str | None = None
    status: str | None = None
    allowed_to_operate: str | None = None
    reason: str | None = None


class CallbackPayload(BaseModel):
    carrier_name: str | None = None
    mc_number: str | None = None
    load_id: str | None = None
    initial_rate: int | None = None
    final_rate: int | None = None
    negotiation_rounds: int = 0
    outcome: Outcome
    sentiment: Sentiment = "neutral"
    duration_seconds: float | None = None
    notes: str | None = None


class CallOut(BaseModel):
    id: int
    created_at: datetime
    carrier_name: str | None
    mc_number: str | None
    load_id: str | None
    initial_rate: int | None
    final_rate: int | None
    negotiation_rounds: int
    outcome: str
    sentiment: str
    duration_seconds: float | None
    notes: str | None

    class Config:
        from_attributes = True


class OutcomeCount(BaseModel):
    outcome: str
    count: int


class SentimentCount(BaseModel):
    sentiment: str
    count: int


class MetricsResponse(BaseModel):
    total_calls: int
    booked_calls: int
    conversion_rate: float
    avg_negotiation_rounds: float
    avg_final_rate: float | None
    avg_loadboard_rate: float | None
    avg_rate_delta: float | None  # final - loadboard, on booked
    avg_call_duration: float | None
    outcomes: list[OutcomeCount]
    sentiments: list[SentimentCount]
    recent_calls: list[CallOut]
