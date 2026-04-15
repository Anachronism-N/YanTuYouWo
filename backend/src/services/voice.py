"""
语音服务 — TTS (文本转语音) + ASR (语音识别)

通过 SiliconFlow OpenAI 兼容 API 实现。
- TTS: FunAudioLLM/CosyVoice2-0.5B（支持中英文 + 情感控制）
- ASR: FunAudioLLM/SenseVoiceSmall（支持中英日韩）
"""

from __future__ import annotations

import base64
import io
import logging

from openai import AsyncOpenAI

from src.config import get_settings

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI | None:
    """获取或创建单例客户端"""
    global _client
    settings = get_settings()
    if not settings.OPENAI_API_KEY:
        return None
    if _client is None:
        _client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
            timeout=30.0,
        )
    return _client


def is_available() -> bool:
    """检查语音服务是否可用"""
    return _get_client() is not None


# ════════════════════════════════════════
# TTS — 文本转语音
# ════════════════════════════════════════

async def text_to_speech(
    text: str,
    *,
    voice: str = "FunAudioLLM/CosyVoice2-0.5B:alex",
    model: str = "FunAudioLLM/CosyVoice2-0.5B",
    response_format: str = "mp3",
    speed: float = 1.0,
) -> bytes | None:
    """文本转语音，返回音频 bytes"""
    client = _get_client()
    if client is None:
        return None

    if not text or not text.strip():
        return None

    try:
        response = await client.audio.speech.create(
            model=model,
            voice=voice,
            input=text[:1000],  # 限制长度防止超时
            speed=speed,
            response_format=response_format,
        )
        return response.content
    except Exception as e:
        logger.error(f"TTS 调用失败: {e}")
        return None


def audio_to_base64(audio: bytes) -> str:
    """音频 bytes 转 base64 字符串"""
    return base64.b64encode(audio).decode("ascii")


# ════════════════════════════════════════
# ASR — 语音识别
# ════════════════════════════════════════

async def speech_to_text(
    audio_data: bytes,
    *,
    filename: str = "audio.mp3",
    model: str = "FunAudioLLM/SenseVoiceSmall",
) -> str | None:
    """语音识别，返回转写文本"""
    client = _get_client()
    if client is None:
        return None

    if not audio_data or len(audio_data) < 100:
        return None

    try:
        audio_file = io.BytesIO(audio_data)
        audio_file.name = filename
        transcription = await client.audio.transcriptions.create(
            model=model,
            file=audio_file,
        )
        return transcription.text
    except Exception as e:
        logger.error(f"ASR 调用失败: {e}")
        return None


# ════════════════════════════════════════
# 可用语音列表
# ════════════════════════════════════════

TTS_VOICES = [
    {"id": "FunAudioLLM/CosyVoice2-0.5B:alex", "name": "Alex", "gender": "男", "style": "沉稳专业", "lang": "中英", "scene": "面试官"},
    {"id": "FunAudioLLM/CosyVoice2-0.5B:benjamin", "name": "Benjamin", "gender": "男", "style": "温和亲切", "lang": "中英", "scene": "通用"},
    {"id": "FunAudioLLM/CosyVoice2-0.5B:anna", "name": "Anna", "gender": "女", "style": "温柔知性", "lang": "中英", "scene": "通用"},
    {"id": "FunAudioLLM/CosyVoice2-0.5B:bella", "name": "Bella", "gender": "女", "style": "活泼开朗", "lang": "中英", "scene": "通用"},
    {"id": "FunAudioLLM/CosyVoice2-0.5B:claire", "name": "Claire", "gender": "女", "style": "专业温暖", "lang": "中英", "scene": "心理支持"},
    {"id": "FunAudioLLM/CosyVoice2-0.5B:diana", "name": "Diana", "gender": "女", "style": "优雅大方", "lang": "中英", "scene": "面试官"},
]

INTERVIEW_VOICE = "FunAudioLLM/CosyVoice2-0.5B:alex"
MENTAL_VOICE = "FunAudioLLM/CosyVoice2-0.5B:claire"
