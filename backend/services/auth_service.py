from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jwt import PyJWTError

from database import get_db
from models.user import User
from services.user_service import get_user_by_username
from config import get_settings


from passlib.context import CryptContext
from datetime import datetime, timedelta
from core.time_utils import utc_now
import jwt
from passlib.exc import UnknownHashError

# Security settings
settings = get_settings()
SECRET_KEY = settings.secret_key
ALGORITHM = settings.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def normalize_email(email: str | None) -> str | None:
    """Emails are stored lowercase and trimmed so Name@x.com and name@x.com are one account."""
    return email.strip().lower() if email else email


def find_user_by_email(db: Session, email: str | None) -> User | None:
    """Case-insensitive lookup, so accounts created before normalisation (e.g. 'Name@x.com') still match."""
    from sqlalchemy import func

    if not email:
        return None
    return db.query(User).filter(func.lower(User.email) == email.strip().lower()).first()

def hash_password(password: str) -> str:
    """Hash user password before storing."""
    return pwd_context.hash(password)

# Verified against when the account does not exist, so a failed login takes
# about as long whether or not the username is registered.
_DUMMY_HASH = pwd_context.hash("timing-equalisation-only")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check a password against its bcrypt hash. Never accepts plaintext rows."""
    if not hashed_password:
        return False

    try:
        return pwd_context.verify(plain_password, hashed_password)
    except (UnknownHashError, ValueError, TypeError):
        return False


def burn_password_check(plain_password: str) -> None:
    """Spend the same time as a real check (used for unknown accounts)."""
    verify_password(plain_password, _DUMMY_HASH)


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    """Generate JWT token for authentication."""
    to_encode = data.copy()
    expire = utc_now() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")

        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            )

    except PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )

    user = get_user_by_username(db, username)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user

