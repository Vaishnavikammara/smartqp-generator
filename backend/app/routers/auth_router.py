from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import (
    UserCreate, UserLogin, UserOut, TokenResponse,
    ForgotPasswordRequest, ApiKeyUpdateRequest
)
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user
from app.services.gemini_client import GeminiClient
import os

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this institute email already exists. Please login."
        )

    user = User(
        email=user_in.email.lower(),
        full_name=user_in.full_name.strip(),
        institute_name=user_in.institute_name.strip(),
        department=user_in.department.strip() if user_in.department else None,
        hashed_password=get_password_hash(user_in.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": str(user.id), "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/login", response_model=TokenResponse)
def login(creds: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == creds.email.lower()).first()
    if not user or not verify_password(creds.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password. Please verify your credentials."
        )

    token = create_access_token(data={"sub": str(user.id), "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account registered with this email address."
        )

    user.hashed_password = get_password_hash(req.new_password)
    db.commit()
    return {"message": "Password reset successfully. You can now login with your new password."}


@router.get("/me", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/api-key")
def update_api_key(req: ApiKeyUpdateRequest, current_user: User = Depends(get_current_user)):
    """Set or test Gemini API key dynamically."""
    os.environ["GEMINI_API_KEY"] = req.gemini_api_key
    if req.gemini_model:
        os.environ["GEMINI_MODEL"] = req.gemini_model

    client = GeminiClient(api_key=req.gemini_api_key, model_name=req.gemini_model)
    verification = client.verify_connection()
    return verification


@router.get("/api-key/status")
def get_api_key_status(current_user: User = Depends(get_current_user)):
    client = GeminiClient()
    return client.verify_connection()
