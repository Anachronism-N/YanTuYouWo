"""语音 API 路由 — TTS / ASR / 语音面试 / 语音心理支持"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.dependencies import get_current_user
from src.models.user import User
from src.services import voice, ai_service
from src.schemas.ai import VoiceAnswerResponse, TtsRequest

router = APIRouter(prefix="/voice", tags=["语音"])


@router.get("/voices")
async def list_voices():
    """获取可用语音列表（无需登录）"""
    return voice.TTS_VOICES


@router.post("/tts")
async def text_to_speech(
    body: TtsRequest,
    current_user: User = Depends(get_current_user),
):
    """文本转语音 → 返回 audio/mpeg"""
    voice_id = body.voice
    audio = await voice.text_to_speech(body.text, voice=voice_id)

    if audio is None:
        raise HTTPException(status_code=503, detail="TTS 服务不可用")

    return Response(content=audio, media_type="audio/mpeg")


@router.post("/asr")
async def speech_to_text(
    file: UploadFile = File(..., description="音频文件 (mp3/wav/webm)"),
    current_user: User = Depends(get_current_user),
):
    """语音识别 → 返回文本"""
    audio_data = await file.read()
    if len(audio_data) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="文件不能超过 50MB")

    text = await voice.speech_to_text(audio_data, filename=file.filename or "audio.mp3")

    if text is None:
        raise HTTPException(status_code=503, detail="ASR 服务不可用")

    return {"text": text}


# ════════════════════════════════════════
# 语音面试
# ════════════════════════════════════════

@router.post("/interview/{session_id}/voice-start")
async def voice_interview_start(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取面试首问的语音版本（面试创建后调用）"""
    from sqlalchemy import select
    from src.models.ai import InterviewSession

    result = await db.execute(
        select(InterviewSession).where(
            InterviewSession.id == session_id,
            InterviewSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="面试会话不存在")

    first_q = ""
    if session.messages:
        first_q = session.messages[0].get("content", "")

    audio = await voice.text_to_speech(first_q, voice=voice.INTERVIEW_VOICE) if first_q else None

    return {
        "question": first_q,
        "has_audio": audio is not None,
        "audio_base64": voice.audio_to_base64(audio) if audio else None,
    }


@router.post("/interview/{session_id}/voice-answer", response_model=VoiceAnswerResponse)
async def voice_interview_answer(
    session_id: int,
    file: UploadFile = File(..., description="语音回答"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """语音面试回答 — ASR → AI → TTS 一站式"""
    audio_data = await file.read()
    transcribed = await voice.speech_to_text(audio_data, filename=file.filename or "audio.mp3")

    if not transcribed:
        raise HTTPException(status_code=503, detail="语音识别失败")

    result = await ai_service.answer_interview(db, session_id, current_user.id, transcribed)
    if result is None:
        raise HTTPException(status_code=404, detail="面试会话不存在或已结束")

    reply_text = result.get("reply", "")
    reply_audio = await voice.text_to_speech(reply_text, voice=voice.INTERVIEW_VOICE)

    return {
        "transcribed_text": transcribed,
        "reply_text": reply_text,
        "feedback": result.get("feedback"),
        "has_audio": reply_audio is not None,
        "reply_audio_base64": voice.audio_to_base64(reply_audio) if reply_audio else None,
    }


@router.post("/interview/{session_id}/voice-end")
async def voice_interview_end(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """结束语音面试 → 评估报告 + 总评语音"""
    report = await ai_service.end_interview(db, session_id, current_user.id)
    if report is None:
        raise HTTPException(status_code=404, detail="面试会话不存在")

    overall_text = report.get("overall", "")
    if overall_text:
        audio = await voice.text_to_speech(overall_text, voice=voice.INTERVIEW_VOICE)
        if audio:
            report["overall_audio_base64"] = voice.audio_to_base64(audio)

    return report


# ════════════════════════════════════════
# 语音心理支持
# ════════════════════════════════════════

@router.post("/mental/voice-chat", response_model=VoiceAnswerResponse)
async def voice_mental_chat(
    file: UploadFile = File(..., description="语音消息"),
    topic: str = "其他",
    current_user: User = Depends(get_current_user),
):
    """
    语音心理支持对话 — ASR → AI 心理咨询师 → TTS

    上传语音消息，返回识别文本 + AI 回复文本 + 回复语音
    """
    audio_data = await file.read()
    transcribed = await voice.speech_to_text(audio_data, filename=file.filename or "audio.mp3")

    if not transcribed:
        raise HTTPException(status_code=503, detail="语音识别失败")

    reply_text = await ai_service.mental_chat(topic, transcribed)

    reply_audio = await voice.text_to_speech(reply_text, voice=voice.MENTAL_VOICE)

    return {
        "transcribed_text": transcribed,
        "reply_text": reply_text,
        "has_audio": reply_audio is not None,
        "reply_audio_base64": voice.audio_to_base64(reply_audio) if reply_audio else None,
    }
