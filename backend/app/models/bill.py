import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Integer, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from app.db.base import Base


class BillStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class RiskLevel(str, enum.Enum):
    none = "none"
    low = "low"
    medium = "medium"
    high = "high"


class Bill(Base):
    __tablename__ = "bills"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey(
        "users.id", ondelete="CASCADE"), nullable=False, index=True)
    hospital_name: Mapped[str] = mapped_column(
        String(255), nullable=False, default="Unknown Hospital")
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    total_flagged_amount: Mapped[float] = mapped_column(Float, default=0.0)
    risk_level: Mapped[RiskLevel] = mapped_column(default=RiskLevel.none)
    status: Mapped[BillStatus] = mapped_column(default=BillStatus.pending)
    s3_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    items: Mapped[list["BillItem"]] = relationship(
        "BillItem", back_populates="bill", cascade="all, delete-orphan")


class BillItem(Base):
    __tablename__ = "bill_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bill_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey(
        "bills.id", ondelete="CASCADE"), nullable=False, index=True)
    extracted_text: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_service_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("services.id"), nullable=True)
    normalized_service_name: Mapped[str] = mapped_column(
        String(255), default="")
    category: Mapped[str] = mapped_column(String(50), default="other")
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Float, default=0.0)
    total_price: Mapped[float] = mapped_column(Float, default=0.0)
    avg_regional_price: Mapped[float | None] = mapped_column(
        Float, nullable=True)
    min_regional_price: Mapped[float | None] = mapped_column(
        Float, nullable=True)
    max_regional_price: Mapped[float | None] = mapped_column(
        Float, nullable=True)
    anomaly_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    anomaly_score: Mapped[float] = mapped_column(Float, default=0.0)
    percent_above_average: Mapped[float |
                                  None] = mapped_column(Float, nullable=True)

    bill: Mapped["Bill"] = relationship("Bill", back_populates="items")
