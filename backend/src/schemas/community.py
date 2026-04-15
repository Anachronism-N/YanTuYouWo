"""社群相关 Pydantic 模型 — 对齐前端 TypeScript 类型"""

from __future__ import annotations


from pydantic import BaseModel, Field


# ──── 帖子 ────

class AuthorInfo(BaseModel):
    id: int
    nickname: str
    avatar: str | None = None
    school: str | None = None
    badge: str | None = None


class PostItem(BaseModel):
    id: int
    author: AuthorInfo
    title: str
    content: str
    category: str
    tags: list[str] = []
    like_count: int = 0
    comment_count: int = 0
    favorite_count: int = 0
    view_count: int = 0
    is_pinned: bool = False
    is_featured: bool = False
    is_liked: bool = False
    is_favorited: bool = False
    created_at: str = ""
    updated_at: str = ""


class PostListResponse(BaseModel):
    total: int
    items: list[PostItem]


class PostCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)
    category: str = Field(min_length=1)
    tags: list[str] = []


# ──── 评论 ────

class CommentItem(BaseModel):
    id: int
    post_id: int
    author: AuthorInfo
    content: str
    like_count: int = 0
    is_liked: bool = False
    reply_to: int | None = None
    reply_to_nickname: str | None = None
    created_at: str = ""


class CommentListResponse(BaseModel):
    total: int
    items: list[CommentItem]


class CommentCreateRequest(BaseModel):
    content: str = Field(min_length=1)
    reply_to: int | None = None


# ──── 打卡 ────

class CheckinRequest(BaseModel):
    date: str
    duration: int = Field(ge=0)
    content: str = ""
    mood: str = "😊"
    tags: list[str] = []


class CheckinItem(BaseModel):
    id: int
    user_id: int
    date: str
    duration: int
    content: str
    mood: str
    tags: list[str] = []


class CheckinStatsResponse(BaseModel):
    total_days: int = 0
    streak_days: int = 0
    month_days: int = 0
    total_duration: int = 0
    month_duration: int = 0
    rank: int = 0
    calendar: list[str] = []
