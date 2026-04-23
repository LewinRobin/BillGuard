from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class BillItemOut(BaseModel):
    id: UUID
    extracted_text: str
    normalized_service_name: str
    category: str
    quantity: int
    unit_price: float
    total_price: float
    avg_regional_price: Optional[float]
    min_regional_price: Optional[float]
    max_regional_price: Optional[float]
    anomaly_flag: bool
    anomaly_score: float
    percent_above_average: Optional[float]

    class Config:
        from_attributes = True


class BillOut(BaseModel):
    id: UUID
    hospital_name: str
    city: str
    state: str
    total_amount: float
    total_flagged_amount: float
    risk_level: str
    status: str
    uploaded_at: datetime
    items: list[BillItemOut] = []

    class Config:
        from_attributes = True


class BillUploadResponse(BaseModel):
    bill_id: UUID
    message: str


class ProcessResponse(BaseModel):
    task_id: str
    message: str


class PaginatedBills(BaseModel):
    items: list[BillOut]
    total: int
    page: int
    limit: int
