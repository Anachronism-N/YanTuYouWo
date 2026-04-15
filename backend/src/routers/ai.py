"""AI 功能 API 路由"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.dependencies import get_current_user
from src.models.user import User
from src.schemas.ai import (
    RecommendRequest, InterviewStartRequest, InterviewAnswerRequest,
    MentalChatRequest, PlanGenerateRequest, ResumeDraftRequest,
)
from src.services import ai_service

router = APIRouter(prefix="/ai", tags=["AI 功能"])


# ──── 简历工坊 ────

@router.post("/resume/draft")
async def save_resume_draft(
    body: ResumeDraftRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """保存简历草稿"""
    draft = await ai_service.save_resume_draft(db, current_user.id, body.model_dump())
    return {"id": str(draft.id)}


@router.get("/resume/draft")
async def get_resume_draft(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取简历草稿，无草稿返回 null"""
    draft = await ai_service.get_resume_draft(db, current_user.id)
    if not draft or not draft.data:
        return {}
    return draft.data


@router.post("/resume/optimize")
async def optimize_resume(
    body: ResumeDraftRequest,
    current_user: User = Depends(get_current_user),
):
    """AI 优化简历（有 LLM Key 调真实 AI，否则 Mock）"""
    from src.utils.rate_limit import check_rate_limit
    check_rate_limit(f"resume_opt:{current_user.id}", max_requests=5, window_seconds=60)
    suggestions = await ai_service.optimize_resume(body.model_dump())
    return [s.model_dump() for s in suggestions]


@router.post("/resume/export")
async def export_resume(
    body: dict,
    current_user: User = Depends(get_current_user),
):
    """导出简历 PDF（占位 — 返回提示）"""
    return {"detail": "PDF 导出功能即将上线，敬请期待"}


# ──── 择校推荐 ────

@router.post("/recommend")
async def recommend(
    body: RecommendRequest,
    current_user: User = Depends(get_current_user),
):
    """择校推荐（有 LLM Key 调真实 AI，否则 Mock）"""
    from src.utils.rate_limit import check_rate_limit
    check_rate_limit(f"recommend:{current_user.id}", max_requests=5, window_seconds=60)
    result = await ai_service.recommend(body.model_dump())
    return result.model_dump()


@router.post("/recommend/export")
async def export_recommend(
    body: dict,
    current_user: User = Depends(get_current_user),
):
    """导出推荐报告（占位）"""
    return {"detail": "报告导出功能即将上线，敬请期待"}


# ──── 模拟面试 ────

@router.post("/interview/start")
async def interview_start(
    body: InterviewStartRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """开始模拟面试"""
    session = await ai_service.start_interview(db, current_user.id, body.model_dump())
    first_msg = session.messages[0] if session.messages else {}
    return {"session_id": str(session.id), "question": first_msg.get("content", "")}


@router.post("/interview/{session_id}/answer")
async def interview_answer(
    session_id: int,
    body: InterviewAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """发送面试回答"""
    result = await ai_service.answer_interview(db, session_id, current_user.id, body.answer)
    if result is None:
        raise HTTPException(status_code=404, detail="面试会话不存在或已结束")
    return result


@router.post("/interview/{session_id}/end")
async def interview_end(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """结束面试并获取评估报告"""
    report = await ai_service.end_interview(db, session_id, current_user.id)
    if report is None:
        raise HTTPException(status_code=404, detail="面试会话不存在")
    return report


# ──── 心理支持 ────

@router.post("/mental/chat")
async def mental_chat(
    body: MentalChatRequest,
    current_user: User = Depends(get_current_user),
):
    """心理支持对话（有 LLM Key 调真实 AI，否则 Mock）"""
    reply = await ai_service.mental_chat(body.topic, body.message)
    return {"reply": reply}


@router.post("/mental/chat/stream")
async def mental_chat_stream(
    body: MentalChatRequest,
    current_user: User = Depends(get_current_user),
):
    """心理支持对话 — SSE 流式输出（前端用 EventSource 接收）"""
    from src.services.llm_stream import chat_stream
    from src.services.llm import MENTAL_SYSTEM, is_available

    if not is_available():
        reply = await ai_service.mental_chat(body.topic, body.message)
        async def mock_gen():
            yield f"data: {reply}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(mock_gen(), media_type="text/event-stream")

    prompt = f"话题：{body.topic}\n\n学生说：{body.message}"

    async def generate():
        async for token in chat_stream(MENTAL_SYSTEM, prompt, temperature=0.8, max_tokens=800):
            yield f"data: {token}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/mental/assessment/{session_id}")
async def mental_assessment(
    session_id: str,
    current_user: User = Depends(get_current_user),
):
    """获取心理评估（Mock）"""
    return {
        "stress_index": 45,
        "anxiety_index": 38,
        "confidence_index": 72,
        "suggestions": [
            "你的整体心理状态良好，压力水平适中",
            "建议保持规律作息和适当运动",
            "遇到困难时不要独自承受，多和朋友家人交流",
        ],
        "resources": [
            {"type": "article", "title": "保研焦虑应对指南", "url": "#"},
            {"type": "video", "title": "5 分钟呼吸放松练习", "url": "#"},
        ],
    }


# ──── 综合规划 ────

@router.post("/plan/generate")
async def generate_plan(
    body: PlanGenerateRequest,
    current_user: User = Depends(get_current_user),
):
    """生成保研规划（有 LLM Key 调真实 AI，否则 Mock）"""
    from src.utils.rate_limit import check_rate_limit
    check_rate_limit(f"plan_gen:{current_user.id}", max_requests=5, window_seconds=60)
    result = await ai_service.generate_plan(body.model_dump())
    return result
