"""简易内存限流 — 防止 AI 端点被滥用"""

from __future__ import annotations

import time
from collections import defaultdict
from fastapi import HTTPException


_requests: dict[str, list[float]] = defaultdict(list)


def check_rate_limit(key: str, max_requests: int = 10, window_seconds: int = 60):
    """
    简易滑动窗口限流。

    Args:
        key: 限流键（通常是 user_id + endpoint）
        max_requests: 窗口内最大请求数
        window_seconds: 窗口时长（秒）

    Raises:
        HTTPException 429 如果超过限制
    """
    now = time.time()
    cutoff = now - window_seconds

    times = _requests[key]
    _requests[key] = [t for t in times if t > cutoff]

    if len(_requests[key]) >= max_requests:
        raise HTTPException(
            status_code=429,
            detail=f"请求过于频繁，请 {window_seconds} 秒后再试",
        )

    _requests[key].append(now)
