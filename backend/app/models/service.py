import uuid
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector
from app.db.base import Base


class Service(Base):
    __tablename__ = "services"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    canonical_name: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(
        Vector(384), nullable=True)
