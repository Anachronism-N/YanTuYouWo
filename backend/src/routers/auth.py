"""认证 API 路由"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.schemas.auth import LoginRequest, RegisterRequest, AuthResponse
from src.services import auth_service
from src.services.user_service import user_to_response

router = APIRouter(prefix="/auth", tags=["认证"])


@router.post("/register", response_model=AuthResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """用户注册"""
    try:
        user, token = await auth_service.register(
            db,
            email=body.email,
            password=body.password,
            username=body.username,
            nickname=body.nickname,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return {"token": token, "user": user_to_response(user).model_dump()}


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """用户登录"""
    try:
        user, token = await auth_service.login(
            db,
            email=body.email,
            password=body.password,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

    return {"token": token, "user": user_to_response(user).model_dump()}
