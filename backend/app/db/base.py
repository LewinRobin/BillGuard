from sqlalchemy.orm import DeclarativeBase
import uuid
from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID


class Base(DeclarativeBase):
    pass


from app.models import bill, benchmark, service, user  # noqa: E402,F401
