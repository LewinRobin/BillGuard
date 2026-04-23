from pydantic import BaseModel
from uuid import UUID


class BenchmarkOut(BaseModel):
    id: UUID
    service_id: UUID
    city: str
    state: str
    avg_price: float
    min_price: float
    max_price: float
    source_type: str

    class Config:
        from_attributes = True
