from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


class OtpRequest(BaseModel):
    email: EmailStr


class OtpVerify(BaseModel):
    email: EmailStr
    otp: str


class TokenResponse(BaseModel):
    access_token: str = Field(alias="accessToken")
    refresh_token: str = Field(alias="refreshToken")
    token_type: str = "bearer"

    class Config:
        populate_by_name = True


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: str
    email: str
    created_at: str = Field(alias="createdAt")

    class Config:
        from_attributes = True
        populate_by_name = True


class ApiResponse(BaseModel):
    data: dict
    message: str = "OK"
    success: bool = True
