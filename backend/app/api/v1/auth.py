from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.dependencies import DB
from app.core.security import (
    generate_otp, create_access_token, create_refresh_token, decode_token
)
from app.models.user import User
from app.schemas.auth import (
    OtpRequest, OtpVerify, TokenResponse, RefreshRequest, UserOut, ApiResponse
)
from app.services.email import send_otp_email
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/request-otp")
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

    try:
        send_otp_email(payload.email, otp)
    except Exception:
        pass

    return ApiResponse(data={"message": "OTP sent to your email address."})


@router.post("/verify-otp")
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

    tokens = TokenResponse(
        accessToken=create_access_token(str(user.id)),
        refreshToken=create_refresh_token(str(user.id)),
    )
    user_out = UserOut(
        id=str(user.id),
        email=user.email,
        createdAt=user.created_at.isoformat() if user.created_at else datetime.now(timezone.utc).isoformat(),
    )

    return ApiResponse(data={
        "user": user_out.model_dump(by_alias=True),
        "accessToken": tokens.access_token,
        "refreshToken": tokens.refresh_token,
    })


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
        accessToken=create_access_token(str(user.id)),
        refreshToken=create_refresh_token(str(user.id)),
    )
