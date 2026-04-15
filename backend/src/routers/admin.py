"""管理员 API 路由 — 仅限 role=admin 的用户访问"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.dependencies import get_admin_user
from src.schemas.ai import RoleUpdateRequest
from src.models.user import User
from src.models.community import Post, Comment
from src.services.user_service import user_to_response

router = APIRouter(prefix="/admin", tags=["管理员"])


# ──── 用户管理 ────

@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    keyword: str | None = Query(None),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """获取用户列表（管理员）"""
    query = select(User)
    if keyword:
        from sqlalchemy import or_
        query = query.where(or_(
            User.username.contains(keyword),
            User.nickname.contains(keyword),
            User.email.contains(keyword),
        ))

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    offset = (page - 1) * size
    query = query.order_by(User.id).offset(offset).limit(size)
    result = await db.execute(query)
    users = result.scalars().all()

    return {
        "total": total,
        "items": [user_to_response(u).model_dump() for u in users],
    }


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    body: RoleUpdateRequest,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """修改用户角色（管理员）"""
    if body.role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="role 必须为 user 或 admin")
    role = body.role

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    user.role = role
    await db.commit()
    return {"detail": f"用户 {user.username} 的角色已更新为 {role}"}


# ──── 帖子管理 ────

@router.delete("/posts/{post_id}")
async def admin_delete_post(
    post_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """删除帖子（管理员）"""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")

    await db.execute(delete(Comment).where(Comment.post_id == post_id))
    await db.delete(post)
    await db.commit()
    return {"detail": "帖子已删除"}


@router.put("/posts/{post_id}/pin")
async def toggle_pin(
    post_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """置顶/取消置顶帖子（管理员）"""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")

    post.is_pinned = not post.is_pinned
    await db.commit()
    return {"is_pinned": post.is_pinned}


@router.put("/posts/{post_id}/feature")
async def toggle_feature(
    post_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """加精/取消加精帖子（管理员）"""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")

    post.is_featured = not post.is_featured
    await db.commit()
    return {"is_featured": post.is_featured}


# ──── 评论管理 ────

@router.delete("/comments/{comment_id}")
async def admin_delete_comment(
    comment_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """删除评论（管理员）"""
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="评论不存在")

    post_id = comment.post_id
    await db.delete(comment)

    post_r = await db.execute(select(Post).where(Post.id == post_id))
    post = post_r.scalar_one_or_none()
    if post and post.comment_count > 0:
        post.comment_count -= 1

    await db.commit()
    return {"detail": "评论已删除"}
