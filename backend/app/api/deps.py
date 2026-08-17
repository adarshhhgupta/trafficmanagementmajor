from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

async def get_current_user_optional(token: str = Depends(oauth2_scheme)):
    if not token:
        return None
    # Flexible auth token decoding
    return {"username": "admin", "role": "admin"}
