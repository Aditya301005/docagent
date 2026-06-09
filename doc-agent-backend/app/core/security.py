from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from app.core.config import settings
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.core.database import get_db
from app.models.user import User

# bcrypt can fail in some local environments due backend compatibility issues.
# Use pbkdf2_sha256 for stable cross-platform hashing.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict) -> str:
    """Create JWT. data should have 'sub' = user_id string."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> dict | None:
    """Returns payload dict or None if invalid/expired."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    """FastAPI dependency — extracts user from Bearer token.
    
    Handles JWTs from BOTH:
      - FastAPI's own auth (payload.sub = user_id)
      - Node auth backend (payload.id = user_id, payload.email = email)
    
    If the user doesn't yet exist in the FastAPI users table (first call
    after registering via the Node auth backend), a shadow record is
    created automatically so documents can be linked to them.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
    
    # Node auth backend puts user_id in "id"; FastAPI auth uses "sub"
    user_id: str = payload.get("sub") or payload.get("id")
    if user_id is None:
        raise credentials_exception
        
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if user is None:
        # Auto-create a shadow user record so documents can be linked.
        # This happens on the first authenticated request from a user
        # who registered via the Node auth backend.
        email = payload.get("email")
        if not email:
            raise credentials_exception
        user = User(
            id=user_id,
            email=email,
            hashed_password="node-auth-managed",  # password is managed by Node backend
            full_name=email.split("@")[0],
        )
        db.add(user)
        try:
            await db.commit()
        except IntegrityError:
            # User was created by a concurrent request
            await db.rollback()
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if not user:
                raise credentials_exception
        
    return user

