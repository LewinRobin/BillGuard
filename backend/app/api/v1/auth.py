from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.dependencies import DB
from app.core.security import (
    generate_otp, create_access_token, create_refresh_token, decode_token
)
from app.models.user import User
from app.schemas.auth import OtpRequest, OtpVerify, TokenResponse, RefreshRequest
from app.services.email import send_otp_email
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/request-otp", status_code=status.HTTP_200_OK)
async def request_otp(payload: OtpRequest, db: DB):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(email=payload.email)
        db.add(user)

    otp = generate_otp()
    user.otp_code = otp
    user.otp_expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.OTP_EXPIRE_MINUTES
    )
    await db.commit()

    # In production, actually send the email. During dev, log it.
    try:
        send_otp_email(payload.email, otp)
    except Exception:
        pass  # Don't fail the request if email fails; log instead

    return {"message": "OTP sent to your email address."}


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(payload: OtpVerify, db: DB):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not user.otp_code or not user.otp_expires_at:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

    now = datetime.now(timezone.utc)
    if user.otp_expires_at < now or user.otp_code != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

    user.otp_code = None
    user.otp_expires_at = None
    await db.commit()

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(payload: RefreshRequest, db: DB):
    from jose import JWTError
    try:
        data = decode_token(payload.refresh_token)
        if data.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type.")
        user_id = data["sub"]
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token.")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )
