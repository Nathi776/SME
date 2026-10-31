import hashlib
import hmac
import smtplib
import logging
import secrets
from datetime import timedelta
from email.message import EmailMessage

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field, field_validator, EmailStr
from typing import Literal
from typing import Optional
from sqlalchemy.orm import Session
from config import get_settings
from core.time_utils import utc_now
from limiter import limiter
from models.email_verification import EmailVerificationCode
from services.consent_service import PURPOSE_MODEL_IMPROVEMENT, record_consent
from services.auth_service import (
    burn_password_check,
    create_access_token,
    find_user_by_email,
    get_current_user,
    hash_password,
    normalize_email,
    verify_password,
)
from database import get_db
from models.user import User
import re

router = APIRouter(prefix="/auth", tags=["Auth"])
logger = logging.getLogger(__name__)

VERIFICATION_CODE_TTL_SECONDS = 10 * 60
VERIFICATION_MAX_ATTEMPTS = 5          # wrong guesses before the code is burned
VERIFICATION_RESEND_COOLDOWN_SECONDS = 60
SUPPORTED_CHANNELS = {"email"}
GENERIC_SEND_MESSAGE = "If an account exists for this identifier, a verification code has been sent."


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
    # Optional, never pre-selected. None = not asked (no record); True/False =
    # the user's explicit choice, recorded with the policy version they saw.
    consent_model_improvement: Optional[bool] = None

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

def _check_password_strength(value: str) -> str:
    if len(value) < 8:
        raise ValueError("Password must be at least 8 characters")
    if not re.search(r"[A-Z]", value) or not re.search(r"[0-9]", value):
        raise ValueError("Password must contain uppercase letter and number")
    return value


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def new_password_strength(cls, value):
        return _check_password_strength(value)


def _generate_verification_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _find_user(request: VerificationTargetRequest, db: Session) -> User | None:
    """Look the account up; callers must not reveal whether it exists."""
    if request.user_id is not None:
        return db.query(User).filter(User.id == request.user_id).first()
    if request.email:
        return find_user_by_email(db, request.email)
    raise HTTPException(status_code=400, detail="user_id or email is required")


def _normalize_channel(channel: str) -> str:
    channel = (channel or "").lower().strip()
    if not channel:
        raise HTTPException(status_code=400, detail="Verification channel cannot be empty")
    if channel not in SUPPORTED_CHANNELS:
        raise HTTPException(status_code=501, detail="SMS verification is not implemented yet")
    return channel


def _hash_code(user_id: int, code: str) -> str:
    """Keyed hash so a database leak does not reveal live codes."""
    key = get_settings().secret_key.encode()
    return hmac.new(key, f"{user_id}:{code}".encode(), hashlib.sha256).hexdigest()


def _mask_email(email: str | None) -> str | None:
    if not email or "@" not in email:
        return None
    local, domain = email.split("@", 1)
    return f"{local[:1]}***@{domain}"


def _in_resend_cooldown(db: Session, user: User, channel: str) -> bool:
    row = (
        db.query(EmailVerificationCode)
        .filter_by(user_id=user.id, channel=channel)
        .first()
    )
    return bool(
        row
        and row.created_at
        and utc_now() - row.created_at < timedelta(seconds=VERIFICATION_RESEND_COOLDOWN_SECONDS)
    )


def _store_verification_code(db: Session, user: User, channel: str, code: str) -> None:
    now = utc_now()
    row = (
        db.query(EmailVerificationCode)
        .filter_by(user_id=user.id, channel=channel)
        .first()
    )
    if row is None:
        row = EmailVerificationCode(user_id=user.id, channel=channel)
        db.add(row)
    row.code_hash = _hash_code(user.id, code)
    row.expires_at = now + timedelta(seconds=VERIFICATION_CODE_TTL_SECONDS)
    row.attempts = 0
    row.created_at = now
    db.commit()


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
@limiter.limit("10/minute")
def register_user(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)):
    existing_username = db.query(User).filter(User.username == payload.username).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already exists")

    existing_email = find_user_by_email(db, payload.email)
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")

    hashed_pw = hash_password(payload.password)
    new_user = User(username=payload.username, email=payload.email, hashed_password=hashed_pw, role=payload.role)
    new_user.email = normalize_email(payload.email)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if payload.consent_model_improvement is not None:
        record_consent(
            db, new_user.id, PURPOSE_MODEL_IMPROVEMENT,
            payload.consent_model_improvement, source="registration",
        )
    return {"message": "User registered successfully", "id": new_user.id, "username": new_user.username, "role": new_user.role}


def _issue_code(db: Session, request: VerificationTargetRequest, channel: str) -> None:
    """Send a fresh code if the account exists and is not in cooldown. Silent otherwise."""
    user = _find_user(request, db)
    if user is None or _in_resend_cooldown(db, user, channel):
        return
    code = _generate_verification_code()
    _send_verification_code(user, channel, code)   # raises 503 on SMTP trouble
    _store_verification_code(db, user, channel, code)


@router.post("/send-verification")
@limiter.limit("5/minute")
def send_verification(
    request: Request,
    payload: SendVerificationRequest,
    db: Session = Depends(get_db),
):
    channels = [_normalize_channel(c) for c in payload.channels]
    for channel in dict.fromkeys(channels):
        _issue_code(db, payload, channel)

    return {
        "message": GENERIC_SEND_MESSAGE,
        "channels": channels,
        "expires_in": VERIFICATION_CODE_TTL_SECONDS,
    }


@router.post("/resend-verification")
@limiter.limit("5/minute")
def resend_verification(
    request: Request,
    payload: ResendVerificationRequest,
    db: Session = Depends(get_db),
):
    channel = _normalize_channel(payload.channel)
    _issue_code(db, payload, channel)

    return {
        "message": GENERIC_SEND_MESSAGE,
        "channel": channel,
        "expires_in": VERIFICATION_CODE_TTL_SECONDS,
    }


@router.post("/verify")
@limiter.limit("10/minute")
def verify_code(
    request: Request,
    payload: VerifyRequest,
    db: Session = Depends(get_db),
):
    channel = _normalize_channel(payload.channel)
    invalid = HTTPException(status_code=400, detail="Invalid or expired verification code")

    user = _find_user(payload, db)
    if user is None:
        raise invalid

    row = (
        db.query(EmailVerificationCode)
        .filter_by(user_id=user.id, channel=channel)
        .first()
    )
    if row is None or row.expires_at < utc_now():
        if row is not None:
            db.delete(row)
            db.commit()
        raise invalid

    if row.attempts >= VERIFICATION_MAX_ATTEMPTS:
        db.delete(row)
        db.commit()
        raise invalid

    if not hmac.compare_digest(row.code_hash, _hash_code(user.id, payload.code.strip())):
        row.attempts += 1
        if row.attempts >= VERIFICATION_MAX_ATTEMPTS:
            db.delete(row)
        db.commit()
        raise invalid

    db.delete(row)
    user.email_verified_at = utc_now()
    db.commit()

    return {
        "message": f"{channel.capitalize()} verified successfully",
        "user_id": user.id,
        "channel": channel,
        "verified": True,
    }


@router.post("/login")
@limiter.limit("10/minute")
def login_user(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    # Allow login via username or email. Prefer username when provided.
    user = None
    if payload.username:
        user = db.query(User).filter(User.username == payload.username).first()
    elif payload.email:
        user = find_user_by_email(db, payload.email)
    else:
        raise HTTPException(status_code=400, detail="username or email is required")

    if user is None:
        burn_password_check(payload.password)  # keep timing similar to a real check
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(payload.password, user.hashed_password):
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
    
    if request.new_password == request.current_password:
        raise HTTPException(status_code=400, detail="New password must differ from the current password")

    # Update password
    current_user.hashed_password = hash_password(request.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}
