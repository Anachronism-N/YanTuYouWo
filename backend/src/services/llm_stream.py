"""LLM 流式调用 — 用于 SSE 实时输出"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator

from src.config import get_settings
from src.services.llm import get_client

logger = logging.getLogger(__name__)


async def chat_stream(
    system: str,
    user_message: str,
    *,
    history: list[dict] | None = None,
    temperature: float = 0.7,
    max_tokens: int = 2000,
) -> AsyncIterator[str]:
    """
    流式调用 LLM，逐 token 返回。

    用于 SSE (Server-Sent Events) 实时输出。
    未配置 Key 时不产出任何内容（调用方需降级）。
    """
    client = get_client()
    if client is None:
        return

    settings = get_settings()
    messages = [{"role": "system", "content": system}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    try:
        stream = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                yield delta.content
    except Exception as e:
        logger.error(f"LLM stream 失败: {e}")
