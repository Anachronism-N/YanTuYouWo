"""社群业务逻辑"""

from __future__ import annotations

from datetime import date, timedelta
from sqlalchemy import select, func, or_, desc, asc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.community import Post, Comment, Checkin, PostLike
from src.models.user import User
from src.schemas.community import (
    AuthorInfo, PostItem, PostListResponse,
    CommentItem, CommentListResponse,
    CheckinStatsResponse,
)


def _user_to_author(user: User, badge: str | None = None) -> AuthorInfo:
    return AuthorInfo(
        id=user.id,
        nickname=user.nickname,
        avatar=user.avatar_url,
        school=user.university,
        badge=badge,
    )


def _post_to_item(post: Post, author: User) -> PostItem:
    return PostItem(
        id=post.id,
        author=_user_to_author(author),
        title=post.title,
        content=post.content,
        category=post.category,
        tags=post.tags or [],
        like_count=post.like_count,
        comment_count=post.comment_count,
        favorite_count=post.favorite_count,
        view_count=post.view_count,
        is_pinned=post.is_pinned,
        is_featured=post.is_featured,
        is_liked=False,
        is_favorited=False,
        created_at=post.created_at.isoformat() if post.created_at else "",
        updated_at=post.updated_at.isoformat() if post.updated_at else "",
    )


# ──── 帖子 ────

async def get_posts(
    db: AsyncSession,
    *,
    category: str | None = None,
    keyword: str | None = None,
    sort: str = "latest",
    page: int = 1,
    size: int = 20,
) -> PostListResponse:
    """获取帖子列表（支持分类/关键词/排序筛选）"""
    query = select(Post, User).join(User, Post.user_id == User.id)

    if category:
        query = query.where(Post.category == category)
    if keyword:
        query = query.where(or_(Post.title.contains(keyword), Post.content.contains(keyword)))
    if sort == "featured":
        query = query.where(Post.is_featured == True)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    if sort == "hot":
        query = query.order_by(desc(Post.like_count), desc(Post.id))
    elif sort == "featured":
        query = query.order_by(desc(Post.created_at))
    else:
        query = query.order_by(desc(Post.is_pinned), desc(Post.created_at))

    offset = (page - 1) * size
    query = query.offset(offset).limit(size)
    rows = (await db.execute(query)).all()

    items = [_post_to_item(post, user) for post, user in rows]
    return PostListResponse(total=total, items=items)


async def get_post_detail(db: AsyncSession, post_id: int) -> PostItem | None:
    """获取帖子详情（自动+1浏览量）"""
    result = await db.execute(
        select(Post, User).join(User, Post.user_id == User.id).where(Post.id == post_id)
    )
    row = result.first()
    if not row:
        return None
    post, user = row
    # 浏览量 +1
    post.view_count += 1
    await db.commit()
    return _post_to_item(post, user)


async def create_post(db: AsyncSession, user_id: int, *, title: str, content: str, category: str, tags: list[str]) -> Post:
    """创建帖子"""
    post = Post(user_id=user_id, title=title, content=content, category=category, tags=tags)
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return post


async def like_post(db: AsyncSession, post_id: int, user_id: int) -> str:
    """点赞/取消点赞（toggle），返回 'liked' / 'unliked' / 'not_found'"""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        return "not_found"

    existing = await db.execute(
        select(PostLike).where(and_(PostLike.user_id == user_id, PostLike.post_id == post_id))
    )
    like = existing.scalar_one_or_none()

    if like:
        await db.delete(like)
        post.like_count = max(0, post.like_count - 1)
        await db.commit()
        return "unliked"
    else:
        db.add(PostLike(user_id=user_id, post_id=post_id))
        post.like_count += 1
        await db.commit()
        return "liked"


# ──── 评论 ────

async def get_comments(db: AsyncSession, post_id: int, *, page: int = 1, size: int = 50) -> CommentListResponse:
    """获取评论列表（支持楼中楼回复昵称）"""
    query = select(Comment, User).join(User, Comment.user_id == User.id).where(Comment.post_id == post_id)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    offset = (page - 1) * size
    query = query.order_by(asc(Comment.created_at)).offset(offset).limit(size)
    rows = (await db.execute(query)).all()

    # 查回复目标昵称
    reply_ids = [c.reply_to_id for c, _ in rows if c.reply_to_id]
    reply_nicknames: dict[int, str] = {}
    if reply_ids:
        reply_q = (
            select(Comment.id, User.nickname)
            .join(User, Comment.user_id == User.id)
            .where(Comment.id.in_(reply_ids))
        )
        for cid, nick in (await db.execute(reply_q)).all():
            reply_nicknames[cid] = nick

    items = [
        CommentItem(
            id=c.id,
            post_id=c.post_id,
            author=_user_to_author(u),
            content=c.content,
            like_count=c.like_count,
            is_liked=False,
            reply_to=c.reply_to_id,
            reply_to_nickname=reply_nicknames.get(c.reply_to_id) if c.reply_to_id else None,
            created_at=c.created_at.isoformat() if c.created_at else "",
        )
        for c, u in rows
    ]
    return CommentListResponse(total=total, items=items)


async def create_comment(db: AsyncSession, post_id: int, user_id: int, *, content: str, reply_to: int | None = None) -> Comment | None:
    """创建评论（验证帖子存在）"""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        return None

    comment = Comment(post_id=post_id, user_id=user_id, content=content, reply_to_id=reply_to)
    db.add(comment)
    post.comment_count += 1

    await db.commit()
    await db.refresh(comment)
    return comment


# ──── 打卡 ────

async def create_checkin(
    db: AsyncSession, user_id: int, *, checkin_date: str, duration: int, content: str, mood: str, tags: list[str]
) -> Checkin:
    """学习打卡"""
    try:
        d = date.fromisoformat(checkin_date)
    except ValueError:
        raise ValueError(f"日期格式错误: {checkin_date}，应为 YYYY-MM-DD")
    checkin = Checkin(user_id=user_id, date=d, duration_minutes=duration, content=content, mood=mood, tags=tags)
    db.add(checkin)
    await db.commit()
    await db.refresh(checkin)
    return checkin


async def get_checkin_stats(db: AsyncSession, user_id: int) -> CheckinStatsResponse:
    """获取打卡统计（连续天数+本月日历）"""
    today = date.today()
    first_of_month = today.replace(day=1)

    # 总天数
    total_result = await db.execute(
        select(func.count(func.distinct(Checkin.date))).where(Checkin.user_id == user_id)
    )
    total_days = total_result.scalar() or 0

    # 总时长
    dur_result = await db.execute(
        select(func.coalesce(func.sum(Checkin.duration_minutes), 0)).where(Checkin.user_id == user_id)
    )
    total_duration = dur_result.scalar() or 0

    # 本月天数和时长
    month_days_r = await db.execute(
        select(func.count(func.distinct(Checkin.date))).where(
            and_(Checkin.user_id == user_id, Checkin.date >= first_of_month)
        )
    )
    month_days = month_days_r.scalar() or 0

    month_dur_r = await db.execute(
        select(func.coalesce(func.sum(Checkin.duration_minutes), 0)).where(
            and_(Checkin.user_id == user_id, Checkin.date >= first_of_month)
        )
    )
    month_duration = month_dur_r.scalar() or 0

    # 连续打卡天数
    dates_r = await db.execute(
        select(func.distinct(Checkin.date))
        .where(Checkin.user_id == user_id)
        .order_by(desc(Checkin.date))
    )
    raw_dates = [row[0] for row in dates_r.all()]
    # SQLite may return strings; ensure they are date objects
    all_dates = sorted(
        [d if isinstance(d, date) else date.fromisoformat(str(d)) for d in raw_dates],
        reverse=True,
    )
    streak = 0
    check = today
    for d in all_dates:
        if d == check:
            streak += 1
            check -= timedelta(days=1)
        elif d < check:
            break
    # 也算昨天开始的连续
    if streak == 0 and all_dates and all_dates[0] == today - timedelta(days=1):
        check = today - timedelta(days=1)
        for d in all_dates:
            if d == check:
                streak += 1
                check -= timedelta(days=1)
            elif d < check:
                break

    # 本月日历
    cal_r = await db.execute(
        select(func.distinct(Checkin.date)).where(
            and_(Checkin.user_id == user_id, Checkin.date >= first_of_month)
        )
    )
    calendar = [
        (row[0] if isinstance(row[0], date) else date.fromisoformat(str(row[0]))).isoformat()
        for row in cal_r.all()
    ]

    return CheckinStatsResponse(
        total_days=total_days,
        streak_days=streak,
        month_days=month_days,
        total_duration=total_duration,
        month_duration=month_duration,
        rank=1,
        calendar=calendar,
    )
