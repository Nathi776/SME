import smtplib
import logging
import secrets
import time
from email.message import EmailMessage

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, field_validator, EmailStr
from typing import Literal
from typing import Optional
from sqlalchemy.orm import Session
from config import get_settings
from services.auth_service import hash_password, verify_password, create_access_token, get_current_user
from database import get_db
from models.user import User
import re

router = APIRouter(prefix="/auth", tags=["Auth"])
logger = logging.getLogger(__name__)

VERIFICATION_CODE_TTL_SECONDS = 10 * 60
VERIFICATION_CODES: dict[str, dict[str, dict[str, object]]] = {}


class VerificationTargetRequest(BaseModel):
    user_id: Optional[int] = None
    email: Optional[EmailStr] = None


class SendVerificationRequest(VerificationTargetRequest):
    channels: list[str] = Field(default_factory=lambda: ["email"])


class ResendVerificationRequest(VerificationTargetRequest):
    channel: str


class VerifyRequest(VerificationTargetRequest):
    channel: str
    code: str = Field(..., min_length=4, max_length=12)

# Request schemas
class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(..., min_length=8)
    email: str
    role: Literal["sme", "lender"] = "sme"

    @field_validator("password")
    @classmethod
    def password_strength(cls, value):
        if not re.search(r"[A-Z]", value) or not re.search(r"[0-9]", value):
            raise ValueError("Password must contain uppercase letter and number")
        return value

class LoginRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


def _generate_verification_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _resolve_user(request: VerificationTargetRequest, db: Session) -> User:
    if request.user_id is not None:
        user = db.query(User).filter(User.id == request.user_id).first()
    elif request.email:
        user = db.query(User).filter(User.email == request.email).first()
    else:
        raise HTTPException(status_code=400, detail="user_id or email is required")

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


def _verification_key(user: User) -> str:
    return f"user:{user.id}"


def _store_verification_code(user: User, channel: str, code: str) -> None:
    key = _verification_key(user)
    channel_key = channel.lower().strip()
    user_codes = VERIFICATION_CODES.setdefault(key, {})
    user_codes[channel_key] = {
        "code": code,
        "expires_at": time.time() + VERIFICATION_CODE_TTL_SECONDS,
    }


def _get_verification_entry(user: User, channel: str) -> dict[str, object]:
    key = _verification_key(user)
    channel_key = channel.lower().strip()
    user_codes = VERIFICATION_CODES.get(key, {})
    entry = user_codes.get(channel_key)

    if not entry:
        raise HTTPException(status_code=404, detail=f"No verification code found for {channel_key}")

    expires_at = float(entry.get("expires_at", 0))
    if expires_at < time.time():
        user_codes.pop(channel_key, None)
        raise HTTPException(status_code=400, detail=f"Verification code for {channel_key} has expired")

    return entry


def _send_verification_code(user: User, channel: str, code: str) -> None:
    if channel != "email":
        raise HTTPException(status_code=501, detail="SMS verification is not implemented yet")

    settings = get_settings()
    if not user.email:
        raise HTTPException(status_code=400, detail="User does not have an email address")
    if not settings.smtp_host:
        raise HTTPException(status_code=503, detail="SMTP is not configured")

    from_email = settings.smtp_from_email or settings.smtp_username
    if not from_email:
        raise HTTPException(status_code=503, detail="SMTP sender address is not configured")

    message = EmailMessage()
    message["Subject"] = "Your SME Finance verification code"
    message["From"] = from_email
    message["To"] = user.email
    message.set_content(
        """Your SME Finance verification code is: {code}

This code expires in 10 minutes.

If you did not request this code, you can ignore this email.
""".format(code=code)
    )

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()

            if settings.smtp_username and settings.smtp_password:
                smtp.login(settings.smtp_username, settings.smtp_password)

            smtp.send_message(message)
    except Exception as exc:
        logger.exception("Failed to send verification email for user_id=%s", user.id)
        raise HTTPException(status_code=503, detail="Unable to send verification email") from exc


@router.post("/register")
def register_user(request: RegisterRequest, db: Session = Depends(get_db)):
    existing_username = db.query(User).filter(User.username == request.username).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already exists")

    existing_email = db.query(User).filter(User.email == request.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")

    hashed_pw = hash_password(request.password)
    new_user = User(username=request.username, email=request.email, hashed_password=hashed_pw, role=request.role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User registered successfully", "id": new_user.id, "username": new_user.username, "role": new_user.role}


@router.post("/send-verification")
def send_verification(request: SendVerificationRequest, db: Session = Depends(get_db)):
    user = _resolve_user(request, db)
    sent_channels: list[str] = []

    for channel in request.channels:
        normalized_channel = channel.lower().strip()
        if not normalized_channel:
            raise HTTPException(status_code=400, detail="Verification channel cannot be empty")

        code = _generate_verification_code()
        _store_verification_code(user, normalized_channel, code)
        _send_verification_code(user, normalized_channel, code)
        sent_channels.append(normalized_channel)

    return {
        "message": "Verification codes generated successfully",
        "user_id": user.id,
        "channels": sent_channels,
        "expires_in": VERIFICATION_CODE_TTL_SECONDS,
        "sent_to": user.email,
    }


@router.post("/resend-verification")
def resend_verification(request: ResendVerificationRequest, db: Session = Depends(get_db)):
    user = _resolve_user(request, db)
    channel = request.channel.lower().strip()

    if not channel:
        raise HTTPException(status_code=400, detail="Verification channel cannot be empty")

    if channel != "email":
        raise HTTPException(status_code=501, detail="SMS verification is not implemented yet")

    code = _generate_verification_code()
    _store_verification_code(user, channel, code)
    _send_verification_code(user, channel, code)

    return {
        "message": "Verification code resent successfully",
        "user_id": user.id,
        "channel": channel,
        "expires_in": VERIFICATION_CODE_TTL_SECONDS,
        "sent_to": user.email,
    }


@router.post("/verify")
def verify_code(request: VerifyRequest, db: Session = Depends(get_db)):
    user = _resolve_user(request, db)
    channel = request.channel.lower().strip()

    if not channel:
        raise HTTPException(status_code=400, detail="Verification channel cannot be empty")

    if channel != "email":
        raise HTTPException(status_code=501, detail="SMS verification is not implemented yet")

    entry = _get_verification_entry(user, channel)
    expected_code = str(entry.get("code", ""))

    if request.code.strip() != expected_code:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    user_codes = VERIFICATION_CODES.get(_verification_key(user), {})
    user_codes.pop(channel, None)

    return {
        "message": f"{channel.capitalize()} verified successfully",
        "user_id": user.id,
        "channel": channel,
        "verified": True,
    }


@router.post("/login")
def login_user(request: LoginRequest, db: Session = Depends(get_db)):
    # Allow login via username or email. Prefer username when provided.
    user = None
    if request.username:
        user = db.query(User).filter(User.username == request.username).first()
    elif request.email:
        user = db.query(User).filter(User.email == request.email).first()
    else:
        raise HTTPException(status_code=400, detail="username or email is required")

    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Token subject should be the username to keep downstream assumptions consistent
    access_token = create_access_token({"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

@router.post("/change-password")
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change password for the authenticated user."""
    # Verify current password
    if not verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    # Update password
    current_user.hashed_password = hash_password(request.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}
