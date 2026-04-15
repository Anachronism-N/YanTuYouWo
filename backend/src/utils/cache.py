"""简易内存缓存 — 带 TTL 过期"""

from __future__ import annotations

import time
from typing import Any

_store: dict[str, tuple[Any, float]] = {}


def get(key: str) -> Any | None:
    """获取缓存值，过期返回 None"""
    if key in _store:
        value, expires_at = _store[key]
        if time.time() < expires_at:
            return value
        del _store[key]
    return None


def set(key: str, value: Any, ttl: int = 60):
    """设置缓存值，ttl 单位秒"""
    _store[key] = (value, time.time() + ttl)


def invalidate(prefix: str = ""):
    """清除匹配前缀的缓存"""
    keys = [k for k in _store if k.startswith(prefix)]
    for k in keys:
        del _store[k]
