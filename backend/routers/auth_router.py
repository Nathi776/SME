from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, field_validator, EmailStr
from typing import Optional
from sqlalchemy.orm import Session
from services.auth_service import hash_password, verify_password, create_access_token, get_current_user
from database import get_db
from models.user import User
import re

router = APIRouter(prefix="/auth", tags=["Auth"])

# Request schemas
class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(..., min_length=8)
    email: str

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
    

@router.post("/register")
def register_user(request: RegisterRequest, db: Session = Depends(get_db)):
    existing_username = db.query(User).filter(User.username == request.username).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already exists")

    existing_email = db.query(User).filter(User.email == request.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")

    hashed_pw = hash_password(request.password)
    new_user = User(username=request.username, email=request.email, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User registered successfully", "id": new_user.id, "username": new_user.username}

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
