"""认证业务逻辑"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User, UserSettings
from src.utils.security import hash_password, verify_password, create_access_token


async def register(
    db: AsyncSession,
    *,
    email: str,
    password: str,
    username: str,
    nickname: str = "",
) -> tuple[User, str]:
    """注册新用户，返回 (user, token)"""

    # 分别检查邮箱和用户名，避免 OR 查询返回多行导致异常
    email_check = await db.execute(select(User).where(User.email == email))
    if email_check.scalar_one_or_none():
        raise ValueError("该邮箱已被注册")

    username_check = await db.execute(select(User).where(User.username == username))
    if username_check.scalar_one_or_none():
        raise ValueError("该用户名已被占用")

    user = User(
        email=email,
        password_hash=hash_password(password),
        username=username,
        nickname=nickname or username,
        target_universities=[],
        research_interests=[],
    )
    db.add(user)
    await db.flush()

    # 同时创建默认设置
    settings = UserSettings(
        user_id=user.id,
        interested_disciplines=[],
        interested_universities=[],
    )
    db.add(settings)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id)
    return user, token


async def login(
    db: AsyncSession,
    *,
    email: str,
    password: str,
) -> tuple[User, str]:
    """登录，返回 (user, token)"""

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(password, user.password_hash):
        raise ValueError("邮箱或密码错误")

    token = create_access_token(user.id)
    return user, token
