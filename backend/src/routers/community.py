"""社群 API 路由"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.schemas.common import IdResponse
from src.dependencies import get_current_user
from src.models.user import User
from src.models.community import Post, Comment
from src.schemas.community import (
    PostItem, PostListResponse, PostCreateRequest,
    CommentListResponse, CommentCreateRequest,
    CheckinRequest, CheckinStatsResponse,
)
from src.services import community_service

router = APIRouter(prefix="/community", tags=["社群"])


# ──── 帖子 ────

@router.get("/posts", response_model=PostListResponse)
async def list_posts(
    category: str | None = Query(None),
    keyword: str | None = Query(None),
    sort: str = Query("latest"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取帖子列表（公开）"""
    return await community_service.get_posts(db, category=category, keyword=keyword, sort=sort, page=page, size=size)


@router.get("/posts/{post_id}", response_model=PostItem)
async def get_post(post_id: int, db: AsyncSession = Depends(get_db)):
    """获取帖子详情（公开）"""
    item = await community_service.get_post_detail(db, post_id)
    if not item:
        raise HTTPException(status_code=404, detail="帖子不存在")
    return item


@router.post("/posts", status_code=201, response_model=IdResponse)
async def create_post(
    body: PostCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """发帖（需登录）"""
    post = await community_service.create_post(
        db, current_user.id, title=body.title, content=body.content, category=body.category, tags=body.tags
    )
    return {"id": post.id}


@router.post("/posts/{post_id}/like")
async def like_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """点赞/取消点赞帖子（toggle，需登录）"""
    status = await community_service.like_post(db, post_id, current_user.id)
    if status == "not_found":
        raise HTTPException(status_code=404, detail="帖子不存在")
    return {"detail": "点赞成功" if status == "liked" else "已取消点赞", "status": status}


# ──── 评论 ────

@router.get("/posts/{post_id}/comments", response_model=CommentListResponse)
async def list_comments(
    post_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """获取评论列表（公开）"""
    return await community_service.get_comments(db, post_id, page=page, size=size)


@router.post("/posts/{post_id}/comments", status_code=201, response_model=IdResponse)
async def create_comment(
    post_id: int,
    body: CommentCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """发评论（需登录）"""
    comment = await community_service.create_comment(
        db, post_id, current_user.id, content=body.content, reply_to=body.reply_to
    )
    if not comment:
        raise HTTPException(status_code=404, detail="帖子不存在")
    return {"id": comment.id}


@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除自己的帖子"""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    if post.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="只能删除自己的帖子")
    await db.execute(sa_delete(Comment).where(Comment.post_id == post_id))
    await db.delete(post)
    await db.commit()
    return {"detail": "帖子已删除"}


# ──── 问答（复用帖子，category='问答'） ────

@router.get("/qa", response_model=PostListResponse)
async def list_qa(
    keyword: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取问答列表（公开，实际为 category=择校咨询 的帖子）"""
    return await community_service.get_posts(db, category="择校咨询", keyword=keyword, page=page, size=size)


@router.delete("/posts/{post_id}/comments/{comment_id}")
async def delete_comment(
    post_id: int,
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除自己的评论"""
    result = await db.execute(select(Comment).where(Comment.id == comment_id, Comment.post_id == post_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="评论不存在")
    if comment.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="只能删除自己的评论")

    await db.delete(comment)
    post_r = await db.execute(select(Post).where(Post.id == post_id))
    post = post_r.scalar_one_or_none()
    if post and post.comment_count > 0:
        post.comment_count -= 1
    await db.commit()
    return {"detail": "评论已删除"}


# ──── 打卡 ────

@router.post("/checkin", status_code=201, response_model=IdResponse)
async def checkin(
    body: CheckinRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """学习打卡（需登录）"""
    try:
        record = await community_service.create_checkin(
            db, current_user.id,
            checkin_date=body.date, duration=body.duration, content=body.content, mood=body.mood, tags=body.tags,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"id": record.id}


@router.get("/checkin/stats", response_model=CheckinStatsResponse)
async def checkin_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取打卡统计（需登录）"""
    return await community_service.get_checkin_stats(db, current_user.id)
