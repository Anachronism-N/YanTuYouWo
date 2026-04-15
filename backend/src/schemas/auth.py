"""认证相关 Pydantic 模型"""

from __future__ import annotations

from pydantic import BaseModel, Field
from src.schemas.user import UserProfileResponse


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=6)
    username: str = Field(min_length=2, max_length=50)
    nickname: str = ""


class AuthResponse(BaseModel):
    """登录/注册统一响应"""
    token: str
    user: UserProfileResponse
