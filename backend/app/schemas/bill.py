import uuid
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class BillItemOut(BaseModel):
    id: UUID
    extracted_text: str = Field(alias="extractedText")
    normalized_service_name: str = Field(alias="normalizedServiceName")
    category: str
    quantity: int
    unit_price: float = Field(alias="unitPrice")
    total_price: float = Field(alias="totalPrice")
    avg_regional_price: Optional[float] = Field(alias="avgRegionalPrice", default=None)
    min_regional_price: Optional[float] = Field(alias="minRegionalPrice", default=None)
    max_regional_price: Optional[float] = Field(alias="maxRegionalPrice", default=None)
    anomaly_flag: bool = Field(alias="anomalyFlag")
    anomaly_score: float = Field(alias="anomalyScore")
    percent_above_average: Optional[float] = Field(alias="percentAboveAverage", default=None)

    class Config:
        from_attributes = True
        populate_by_name = True


class BillOut(BaseModel):
    id: UUID
    hospital_name: str = Field(alias="hospitalName")
    city: str
    state: str
    total_amount: float = Field(alias="totalAmount")
    total_flagged_amount: float = Field(alias="totalFlaggedAmount")
    risk_level: str = Field(alias="riskLevel")
    status: str
    uploaded_at: datetime = Field(alias="uploadedAt")
    items: list[BillItemOut] = []

    class Config:
        from_attributes = True
        populate_by_name = True


class BillUploadResponse(BaseModel):
    bill_id: UUID = Field(alias="billId")
    message: str

    class Config:
        populate_by_name = True


class ProcessResponse(BaseModel):
    task_id: str = Field(alias="taskId")
    message: str

    class Config:
        populate_by_name = True


class PaginatedBills(BaseModel):
    items: list[BillOut]
    total: int
    page: int
    limit: int


class ProcessBillRequest(BaseModel):
    bill_id: uuid.UUID = Field(alias="billId")

    class Config:
        populate_by_name = True


class CorrectItemRequest(BaseModel):
    service_id: Optional[UUID] = Field(alias="serviceId", default=None)
    custom_name: Optional[str] = Field(alias="customName", default=None)

    class Config:
        populate_by_name = True


class ServiceOut(BaseModel):
    id: UUID
    canonical_name: str = Field(alias="canonicalName")
    category: str

    class Config:
        from_attributes = True
        populate_by_name = True


class ApiResponse(BaseModel):
    data: dict
    message: str = "OK"
    success: bool = True
