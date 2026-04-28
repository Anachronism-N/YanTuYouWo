"""管理员 API 路由 — 仅限 role=admin 的用户访问"""

from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, delete, desc
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.dependencies import get_admin_user
from src.schemas.ai import RoleUpdateRequest
from src.models.user import User
from src.models.community import Post, Comment, Checkin, PostLike
from src.models.notice import AdmissionNotice
from src.models.university import University, Department
from src.models.ai import InterviewSession
from src.services.user_service import user_to_response

router = APIRouter(prefix="/admin", tags=["管理员"])


# ════════════════════════════════════════
# 仪表盘
# ════════════════════════════════════════

@router.get("/dashboard")
async def dashboard(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """管理仪表盘：核心指标 + 最近活动"""
    today = datetime.now().date()
    week_ago = today - timedelta(days=7)

    user_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
    post_count = (await db.execute(select(func.count(Post.id)))).scalar() or 0
    notice_count = (await db.execute(select(func.count(AdmissionNotice.id)))).scalar() or 0
    school_count = (await db.execute(select(func.count(University.id)))).scalar() or 0

    new_users_week = (await db.execute(
        select(func.count(User.id)).where(User.created_at >= datetime.combine(week_ago, datetime.min.time()))
    )).scalar() or 0

    new_posts_week = (await db.execute(
        select(func.count(Post.id)).where(Post.created_at >= datetime.combine(week_ago, datetime.min.time()))
    )).scalar() or 0

    # 最近注册用户
    recent_users_r = await db.execute(
        select(User).order_by(desc(User.created_at)).limit(5)
    )
    recent_users = [
        {"id": u.id, "username": u.username, "nickname": u.nickname, "email": u.email,
         "created_at": u.created_at.isoformat() if u.created_at else ""}
        for u in recent_users_r.scalars().all()
    ]

    # 最近帖子
    recent_posts_r = await db.execute(
        select(Post, User).join(User, Post.user_id == User.id).order_by(desc(Post.created_at)).limit(5)
    )
    recent_posts = [
        {"id": p.id, "title": p.title, "author": u.nickname, "category": p.category,
         "created_at": p.created_at.isoformat() if p.created_at else ""}
        for p, u in recent_posts_r.all()
    ]

    return {
        "stats": {
            "user_count": user_count,
            "post_count": post_count,
            "notice_count": notice_count,
            "school_count": school_count,
            "new_users_week": new_users_week,
            "new_posts_week": new_posts_week,
        },
        "recent_users": recent_users,
        "recent_posts": recent_posts,
    }


# ════════════════════════════════════════
# 数据统计
# ════════════════════════════════════════

@router.get("/analytics")
async def analytics(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """数据统计：内容分布 + 用户活跃度"""
    notice_count = (await db.execute(select(func.count(AdmissionNotice.id)))).scalar() or 0
    school_count = (await db.execute(select(func.count(University.id)))).scalar() or 0
    dept_count = (await db.execute(select(func.count(Department.id)))).scalar() or 0
    post_count = (await db.execute(select(func.count(Post.id)))).scalar() or 0
    user_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
    checkin_count = (await db.execute(select(func.count(Checkin.id)))).scalar() or 0
    interview_count = (await db.execute(select(func.count(InterviewSession.id)))).scalar() or 0

    # 各分类帖子数
    cat_r = await db.execute(
        select(Post.category, func.count(Post.id)).group_by(Post.category)
    )
    post_by_category = {row[0]: row[1] for row in cat_r.all()}

    # 通知类型分布
    type_r = await db.execute(
        select(AdmissionNotice.program_type, func.count(AdmissionNotice.id))
        .group_by(AdmissionNotice.program_type)
    )
    notice_by_type = {(row[0] or "其他"): row[1] for row in type_r.all()}

    return {
        "content": {
            "notices": notice_count,
            "schools": school_count,
            "departments": dept_count,
            "posts": post_count,
            "checkins": checkin_count,
            "interviews": interview_count,
        },
        "users": {
            "total": user_count,
        },
        "post_by_category": post_by_category,
        "notice_by_type": notice_by_type,
    }


# ════════════════════════════════════════
# 用户管理
# ════════════════════════════════════════

@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    keyword: str | None = Query(None),
    role: str | None = Query(None),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """获取用户列表（支持搜索 + 角色筛选）"""
    from sqlalchemy import or_
    query = select(User)
    if keyword:
        query = query.where(or_(
            User.username.contains(keyword),
            User.nickname.contains(keyword),
            User.email.contains(keyword),
        ))
    if role:
        query = query.where(User.role == role)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    offset = (page - 1) * size
    users = (await db.execute(query.order_by(User.id).offset(offset).limit(size))).scalars().all()

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
    """修改用户角色"""
    if body.role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="role 必须为 user 或 admin")
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    user.role = body.role
    await db.commit()
    return {"detail": f"用户 {user.username} 的角色已更新为 {body.role}"}


@router.put("/users/{user_id}/disable")
async def disable_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """禁用/启用用户（toggle）"""
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="不能禁用自己")
    user.role = "disabled" if user.role != "disabled" else "user"
    await db.commit()
    return {"detail": f"用户已{'禁用' if user.role == 'disabled' else '启用'}", "role": user.role}


# ════════════════════════════════════════
# 通知管理
# ════════════════════════════════════════

@router.get("/notices")
async def list_notices(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None, description="pending/published/rejected"),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """管理通知列表（含审核状态）"""
    query = select(AdmissionNotice, University).join(University, AdmissionNotice.university_id == University.id)
    if status:
        query = query.where(AdmissionNotice.status == status)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    offset = (page - 1) * size
    rows = (await db.execute(query.order_by(desc(AdmissionNotice.created_at)).offset(offset).limit(size))).all()

    items = [
        {
            "id": n.id, "title": n.title, "university": u.name,
            "program_type": n.program_type or "其他",
            "status": n.status, "publish_date": n.publish_date.isoformat() if n.publish_date else "",
            "created_at": n.created_at.isoformat() if n.created_at else "",
        }
        for n, u in rows
    ]
    return {"total": total, "items": items}


@router.put("/notices/{notice_id}/status")
async def update_notice_status(
    notice_id: int,
    body: dict,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """更新通知审核状态"""
    new_status = body.get("status")
    if new_status not in ("pending", "published", "rejected"):
        raise HTTPException(status_code=400, detail="status 必须为 pending/published/rejected")
    notice = (await db.execute(select(AdmissionNotice).where(AdmissionNotice.id == notice_id))).scalar_one_or_none()
    if not notice:
        raise HTTPException(status_code=404, detail="通知不存在")
    notice.status = new_status
    await db.commit()
    return {"detail": f"通知状态已更新为 {new_status}"}


# ════════════════════════════════════════
# 帖子管理
# ════════════════════════════════════════

@router.get("/posts")
async def list_posts(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """管理帖子列表"""
    query = select(Post, User).join(User, Post.user_id == User.id)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    offset = (page - 1) * size
    rows = (await db.execute(query.order_by(desc(Post.created_at)).offset(offset).limit(size))).all()
    items = [
        {"id": p.id, "title": p.title, "author": u.nickname, "category": p.category,
         "like_count": p.like_count, "comment_count": p.comment_count,
         "is_pinned": p.is_pinned, "is_featured": p.is_featured,
         "created_at": p.created_at.isoformat() if p.created_at else ""}
        for p, u in rows
    ]
    return {"total": total, "items": items}


@router.delete("/posts/{post_id}")
async def admin_delete_post(
    post_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """删除帖子"""
    post = (await db.execute(select(Post).where(Post.id == post_id))).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    await db.execute(delete(Comment).where(Comment.post_id == post_id))
    await db.execute(delete(PostLike).where(PostLike.post_id == post_id))
    await db.delete(post)
    await db.commit()
    return {"detail": "帖子已删除"}


@router.put("/posts/{post_id}/pin")
async def toggle_pin(post_id: int, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    """置顶/取消置顶"""
    post = (await db.execute(select(Post).where(Post.id == post_id))).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    post.is_pinned = not post.is_pinned
    await db.commit()
    return {"is_pinned": post.is_pinned}


@router.put("/posts/{post_id}/feature")
async def toggle_feature(post_id: int, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    """加精/取消加精"""
    post = (await db.execute(select(Post).where(Post.id == post_id))).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    post.is_featured = not post.is_featured
    await db.commit()
    return {"is_featured": post.is_featured}


# ════════════════════════════════════════
# 评论管理
# ════════════════════════════════════════

@router.delete("/comments/{comment_id}")
async def admin_delete_comment(comment_id: int, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    """删除评论"""
    comment = (await db.execute(select(Comment).where(Comment.id == comment_id))).scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="评论不存在")
    post_id = comment.post_id
    await db.delete(comment)
    post = (await db.execute(select(Post).where(Post.id == post_id))).scalar_one_or_none()
    if post and post.comment_count > 0:
        post.comment_count -= 1
    await db.commit()
    return {"detail": "评论已删除"}
