"""
AI 功能业务逻辑 — LLM 调用 + Mock 降级

每个功能：先尝试 LLM 调用 → 失败或未配置 Key 时自动降级为 Mock。
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.ai import ResumeDraft, InterviewSession
from src.schemas.ai import (
    AISuggestion, RecommendSchool, RecommendResponse,
)
from src.services import llm
from src.services.llm import (
    RESUME_OPTIMIZE_SYSTEM, RECOMMEND_SYSTEM,
    INTERVIEW_SYSTEM_TEMPLATE, INTERVIEW_REPORT_SYSTEM,
    MENTAL_SYSTEM, PLAN_SYSTEM,
)

logger = logging.getLogger(__name__)


# ════════════════════════════════════════
# 简历
# ════════════════════════════════════════

async def save_resume_draft(db: AsyncSession, user_id: int, data: dict) -> ResumeDraft:
    """保存简历草稿（upsert）"""
    result = await db.execute(select(ResumeDraft).where(ResumeDraft.user_id == user_id))
    draft = result.scalar_one_or_none()
    if draft:
        draft.data = data
        draft.updated_at = datetime.now()
    else:
        draft = ResumeDraft(user_id=user_id, data=data)
        db.add(draft)
    await db.commit()
    await db.refresh(draft)
    return draft


async def get_resume_draft(db: AsyncSession, user_id: int) -> ResumeDraft | None:
    """获取用户简历草稿"""
    result = await db.execute(select(ResumeDraft).where(ResumeDraft.user_id == user_id))
    return result.scalar_one_or_none()


async def optimize_resume(data: dict) -> list[AISuggestion]:
    """AI 优化简历：LLM → Mock 降级"""
    raw = await llm.chat(
        RESUME_OPTIMIZE_SYSTEM,
        f"请审查以下简历并给出优化建议：\n{json.dumps(data, ensure_ascii=False, indent=2)}",
        response_json=True,
        temperature=0.5,
    )
    parsed = llm.parse_json(raw)
    if isinstance(parsed, list) and len(parsed) > 0:
        return [
            AISuggestion(
                type=item.get("type", "tip"),
                field=item.get("field", "general"),
                message=item.get("message", ""),
            )
            for item in parsed
            if isinstance(item, dict) and "message" in item
        ]

    logger.info("简历优化：LLM 不可用或解析失败，使用 Mock")
    return _mock_optimize_resume()


def _mock_optimize_resume() -> list[AISuggestion]:
    return [
        AISuggestion(type="improvement", field="research", message="建议量化科研成果，例如「提升模型 F1 值 5.2%」比「提升了模型性能」更有说服力"),
        AISuggestion(type="improvement", field="education", message="建议补充核心课程成绩，如数据结构 95 分、机器学习 92 分等"),
        AISuggestion(type="warning", field="skills", message="技能描述建议使用熟练度层级，如「精通 Python、熟悉 C++、了解 Java」"),
        AISuggestion(type="tip", field="awards", message="获奖经历建议按含金量从高到低排列，国家级 > 省级 > 校级"),
        AISuggestion(type="tip", field="general", message="整体简历建议控制在 1 页 A4 纸内，重点突出与目标方向相关的经历"),
    ]


# ════════════════════════════════════════
# 择校推荐
# ════════════════════════════════════════

async def _get_school_context() -> str:
    """从数据库获取真实院校数据作为 RAG 上下文"""
    try:
        from src.database import async_session
        from src.models.university import University
        from sqlalchemy import select, func
        from src.models.notice import AdmissionNotice

        async with async_session() as db:
            result = await db.execute(
                select(
                    University.name, University.level, University.province,
                    func.count(AdmissionNotice.id).label("notice_count"),
                )
                .outerjoin(AdmissionNotice, University.id == AdmissionNotice.university_id)
                .group_by(University.id)
                .order_by(University.name)
            )
            rows = result.all()
            if not rows:
                return ""
            lines = ["以下是平台收录的真实高校数据（共 {} 所）：".format(len(rows))]
            for name, level, province, count in rows[:50]:
                lines.append(f"- {name}（{level}，{province}，{count} 条通知）")
            return "\n".join(lines)
    except Exception:
        return ""


async def recommend(data: dict) -> RecommendResponse:
    """择校推荐：LLM + RAG → Mock 降级"""
    user_msg = "请根据以下学生背景推荐目标院校：\n"
    for k, v in data.items():
        if v:
            user_msg += f"- {k}: {v}\n"

    school_ctx = await _get_school_context()
    if school_ctx:
        user_msg += f"\n{school_ctx}\n"

    raw = await llm.chat(
        RECOMMEND_SYSTEM,
        user_msg,
        response_json=True,
        temperature=0.5,
        max_tokens=3000,
    )
    parsed = llm.parse_json(raw)
    if isinstance(parsed, dict) and "schools" in parsed:
        try:
            schools = [
                RecommendSchool(**s) for s in parsed["schools"]
                if isinstance(s, dict) and "university" in s
            ]
            if schools:
                return RecommendResponse(
                    overall_score=parsed.get("overall_score", 70),
                    evaluation=parsed.get("evaluation", ""),
                    schools=schools,
                    suggestions=parsed.get("suggestions", []),
                )
        except Exception as e:
            logger.warning(f"择校推荐结果解析失败: {e}")

    logger.info("择校推荐：LLM 不可用或输出不完整，使用 Mock")
    return _mock_recommend()


def _mock_recommend() -> RecommendResponse:
    return RecommendResponse(
        overall_score=78,
        evaluation="综合竞争力较强。GPA 优秀，有论文发表经历，建议冲刺 Top 院校的同时准备稳妥选项。",
        schools=[
            RecommendSchool(university="清华大学", department="计算机科学与技术系", match_score=72, difficulty="reach",
                            reason="顶级学科实力，竞争激烈，但你的论文发表经历是加分项", discipline_rating="A+"),
            RecommendSchool(university="浙江大学", department="计算机科学与技术学院", match_score=85, difficulty="match",
                            reason="学科评估 A+，录取率相对较高，性价比极高", discipline_rating="A+"),
            RecommendSchool(university="哈尔滨工业大学", department="计算机学院", match_score=92, difficulty="safety",
                            reason="工科传统强校，保底选择可靠", discipline_rating="A"),
        ],
        suggestions=["建议同时投递 2-3 所冲刺和 2-3 所稳妥院校", "联系导师时突出论文发表经历", "面试重点准备专业基础和科研深挖"],
    )


# ════════════════════════════════════════
# 面试
# ════════════════════════════════════════

MOCK_QUESTIONS = {
    "综合": [
        "请做一个简短的自我介绍。",
        "你为什么选择我们学校/专业？",
        "请介绍一下你最有代表性的科研/项目经历。",
        "你认为自己最大的优势和不足分别是什么？",
        "你对未来的研究方向有什么规划？",
    ],
    "专业": [
        "请简要解释一下梯度下降算法的原理。",
        "Transformer 架构的核心创新点是什么？",
        "请解释 Attention 机制的计算过程。",
        "过拟合的常见解决方法有哪些？",
        "请比较 CNN 和 RNN 各自的适用场景。",
    ],
    "英语": [
        "Please introduce yourself briefly in English.",
        "Why are you interested in this research field?",
        "Can you describe your most significant research experience?",
        "What are your strengths and weaknesses as a researcher?",
        "Where do you see yourself in five years?",
    ],
}


async def start_interview(db: AsyncSession, user_id: int, config: dict) -> InterviewSession:
    """开始面试：LLM 生成首问 → Mock 降级"""
    itype = config.get("type", "综合")
    target_school = config.get("target_school", "某985高校")
    target_major = config.get("target_major", "计算机科学")
    difficulty = config.get("difficulty", "中等")

    first_question = None

    if llm.is_available():
        system = INTERVIEW_SYSTEM_TEMPLATE.format(
            target_school=target_school,
            target_major=target_major,
            interview_type=itype,
            difficulty=difficulty,
        )
        raw = await llm.chat(
            system,
            "面试开始，请提出第一个问题。",
            response_json=True,
            temperature=0.7,
        )
        parsed = llm.parse_json(raw)
        if isinstance(parsed, dict) and "question" in parsed:
            first_question = parsed["question"]

    if not first_question:
        questions = MOCK_QUESTIONS.get(itype, MOCK_QUESTIONS["综合"])
        first_question = questions[0]

    session = InterviewSession(
        user_id=user_id,
        config=config,
        messages=[{"role": "interviewer", "content": first_question}],
        status="active",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def answer_interview(db: AsyncSession, session_id: int, user_id: int, answer: str) -> dict | None:
    """面试回答：LLM 生成下一问 + 反馈 → Mock 降级"""
    result = await db.execute(
        select(InterviewSession).where(InterviewSession.id == session_id, InterviewSession.user_id == user_id)
    )
    session = result.scalar_one_or_none()
    if not session or session.status != "active":
        return None

    messages = session.messages or []
    messages.append({"role": "candidate", "content": answer})

    config = session.config or {}
    itype = config.get("type", "综合")
    reply = None
    feedback = None

    if llm.is_available():
        system = INTERVIEW_SYSTEM_TEMPLATE.format(
            target_school=config.get("target_school", "某985高校"),
            target_major=config.get("target_major", "计算机科学"),
            interview_type=itype,
            difficulty=config.get("difficulty", "中等"),
        )
        # 构建对话历史
        history = []
        for m in messages:
            role = "assistant" if m["role"] == "interviewer" else "user"
            history.append({"role": role, "content": m["content"]})

        raw = await llm.chat(
            system,
            "请根据学生的回答，给出反馈并提出下一个问题。",
            history=history,
            response_json=True,
            temperature=0.7,
        )
        parsed = llm.parse_json(raw)
        if isinstance(parsed, dict) and "question" in parsed:
            q = parsed["question"]
            feedback = parsed.get("feedback") or {"score": 80, "comment": "回答良好"}
            if q == "INTERVIEW_END":
                reply = "面试结束，感谢你的回答！请点击「结束面试」查看评估报告。"
            else:
                reply = q

    # Mock 降级
    if not reply:
        questions = MOCK_QUESTIONS.get(itype, MOCK_QUESTIONS["综合"])
        q_idx = len([m for m in messages if m["role"] == "interviewer"])
        if q_idx < len(questions):
            reply = questions[q_idx]
        else:
            reply = "面试结束，感谢你的回答！请点击「结束面试」查看评估报告。"
    if not feedback:
        feedback = {"score": 80, "comment": "回答完整"}

    messages.append({"role": "interviewer", "content": reply})
    session.messages = messages
    await db.commit()

    return {"reply": reply, "feedback": feedback}


async def end_interview(db: AsyncSession, session_id: int, user_id: int) -> dict | None:
    """结束面试并生成评估报告：LLM → Mock 降级"""
    result = await db.execute(
        select(InterviewSession).where(InterviewSession.id == session_id, InterviewSession.user_id == user_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        return None

    report = None

    if llm.is_available() and session.messages:
        dialogue = "\n".join(
            f"{'面试官' if m['role'] == 'interviewer' else '考生'}: {m['content']}"
            for m in session.messages
        )
        raw = await llm.chat(
            INTERVIEW_REPORT_SYSTEM,
            f"以下是面试对话记录：\n\n{dialogue}",
            response_json=True,
            temperature=0.3,
            max_tokens=2000,
        )
        parsed = llm.parse_json(raw)
        if isinstance(parsed, dict) and "total_score" in parsed:
            report = parsed

    if not report:
        report = {
            "total_score": 82,
            "dimensions": {
                "expression": {"score": 85, "label": "表达能力"},
                "knowledge": {"score": 80, "label": "专业知识"},
                "adaptability": {"score": 78, "label": "应变能力"},
                "overall_quality": {"score": 84, "label": "综合素质"},
            },
            "strengths": ["表达清晰流畅", "科研经历描述具体", "对研究方向有清晰规划"],
            "improvements": ["部分专业概念可以更深入", "英文表达可以更自信", "建议准备更多具体案例"],
            "overall": "总体表现良好，展现了扎实的专业基础和清晰的研究规划。",
        }

    report["questions_count"] = len([m for m in (session.messages or []) if m["role"] == "interviewer"])
    session.status = "ended"
    session.report = report
    await db.commit()

    return report


# ════════════════════════════════════════
# 心理支持
# ════════════════════════════════════════

MENTAL_MOCK_REPLIES = {
    "考研焦虑": "保研确实是一段压力很大的旅程，你的焦虑是完全正常的。\n\n试试这些方法：\n1. 把大目标拆分成小任务\n2. 适当运动和休息\n3. 和信任的人聊聊\n\n记住：你已经走到了这一步，说明你很优秀。",
    "面试紧张": "面试紧张很常见，适度紧张其实有助于表现。\n\n实用技巧：\n1. 深呼吸 3 次\n2. 提前充分准备\n3. 把面试当交流\n4. 准备好「不会」的回答\n\n练习越多越自信。",
    "default": "谢谢你愿意分享。保研路上的每一种情绪都是正常的。\n\n如果你愿意告诉我更多，我会尽力给你建议和支持。记住，无论结果如何，你的努力和成长都是有价值的。",
}


async def mental_chat(topic: str, message: str) -> str:
    """心理支持对话：LLM → Mock 降级"""
    raw = await llm.chat(
        MENTAL_SYSTEM,
        f"话题：{topic}\n\n学生说：{message}",
        temperature=0.8,
        max_tokens=800,
    )
    if raw and len(raw) > 20:
        return raw

    logger.info("心理支持：LLM 不可用，使用 Mock")
    return MENTAL_MOCK_REPLIES.get(topic, MENTAL_MOCK_REPLIES["default"])


# ════════════════════════════════════════
# 综合规划
# ════════════════════════════════════════

async def generate_plan(data: dict) -> dict:
    """生成保研规划：LLM → Mock 降级"""
    user_msg = "请为以下学生制定保研规划：\n"
    for k, v in data.items():
        if v:
            user_msg += f"- {k}: {v}\n"

    raw = await llm.chat(
        PLAN_SYSTEM,
        user_msg,
        response_json=True,
        temperature=0.5,
        max_tokens=3000,
    )
    parsed = llm.parse_json(raw)
    if isinstance(parsed, dict) and "phases" in parsed:
        return parsed

    logger.info("综合规划：LLM 不可用或解析失败，使用 Mock")
    return _mock_generate_plan()


def _mock_generate_plan() -> dict:
    return {
        "competitiveness_score": 76,
        "evaluation": "综合竞争力中上，GPA 优秀，建议补强科研和竞赛经历。",
        "phases": [
            {"name": "基础夯实期", "period": "大三上学期", "tasks": [
                {"title": "提升 GPA", "priority": "high"},
                {"title": "联系意向导师", "priority": "medium"},
            ]},
            {"name": "科研深耕期", "period": "大三下学期", "tasks": [
                {"title": "参与科研项目", "priority": "high"},
                {"title": "争取发表论文", "priority": "high"},
            ]},
            {"name": "材料准备期", "period": "大三暑假前", "tasks": [
                {"title": "完善个人简历", "priority": "high"},
                {"title": "准备推荐信", "priority": "medium"},
            ]},
            {"name": "夏令营冲刺期", "period": "暑假", "tasks": [
                {"title": "投递夏令营", "priority": "high"},
                {"title": "准备面试", "priority": "high"},
            ]},
            {"name": "预推免收尾", "period": "9月", "tasks": [
                {"title": "投递预推免", "priority": "high"},
                {"title": "确认录取", "priority": "high"},
            ]},
        ],
        "suggestions": ["保持 GPA", "尽早参与科研", "英语六级 550+ 是门槛", "多做模拟面试"],
    }
