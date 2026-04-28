from datetime import datetime

from sqlalchemy import String, Integer, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Load(Base):
    __tablename__ = "loads"

    load_id: Mapped[str] = mapped_column(String, primary_key=True)
    origin: Mapped[str] = mapped_column(String, index=True)
    destination: Mapped[str] = mapped_column(String, index=True)
    pickup_datetime: Mapped[datetime] = mapped_column(DateTime)
    delivery_datetime: Mapped[datetime] = mapped_column(DateTime)
    equipment_type: Mapped[str] = mapped_column(String, index=True)
    loadboard_rate: Mapped[float] = mapped_column(Float)
    notes: Mapped[str] = mapped_column(Text, default="")
    weight: Mapped[float] = mapped_column(Float)
    commodity_type: Mapped[str] = mapped_column(String)
    num_of_pieces: Mapped[int] = mapped_column(Integer)
    miles: Mapped[float] = mapped_column(Float)
    dimensions: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String, default="available", index=True)
    company_name: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    agreement_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Call(Base):
    __tablename__ = "calls"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    carrier_name: Mapped[str | None] = mapped_column(String, nullable=True)
    mc_number: Mapped[str | None] = mapped_column(String, index=True, nullable=True)
    load_id: Mapped[str | None] = mapped_column(ForeignKey("loads.load_id"), nullable=True)
    initial_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    final_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    negotiation_rounds: Mapped[int] = mapped_column(Integer, default=0)
    outcome: Mapped[str] = mapped_column(String, index=True)  # booked|rejected|no_load|failed_verification
    sentiment: Mapped[str] = mapped_column(String, index=True)  # positive|neutral|negative
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    load: Mapped["Load | None"] = relationship("Load")
