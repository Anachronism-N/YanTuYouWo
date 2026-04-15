"""
统一 LLM 调用层 — 封装 OpenAI 兼容协议调用 + Prompt 模板

支持 SiliconFlow / DeepSeek / OpenAI / 自部署 vLLM 等任何 OpenAI 兼容平台。
未配置 API Key 时所有调用返回 None，由上层自动降级为 Mock。
"""

from __future__ import annotations

import json
import logging
from openai import AsyncOpenAI

from src.config import get_settings

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None


def get_client() -> AsyncOpenAI | None:
    """获取 OpenAI 客户端，未配置 Key 则返回 None"""
    global _client
    settings = get_settings()
    if not settings.OPENAI_API_KEY:
        return None
    if _client is None:
        _client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
        )
    return _client


def is_available() -> bool:
    """检查 LLM 是否可用（已配置 API Key）"""
    return get_client() is not None


async def chat(
    system: str,
    user_message: str,
    *,
    history: list[dict] | None = None,
    temperature: float = 0.7,
    max_tokens: int = 2000,
    response_json: bool = False,
) -> str | None:
    """
    调用 LLM 进行对话。

    Args:
        system: System prompt
        user_message: 用户消息
        history: 历史对话 [{"role": "user"/"assistant", "content": "..."}]
        temperature: 创造性 (0-1)
        max_tokens: 最大输出 token 数
        response_json: 是否要求 JSON 输出

    Returns:
        LLM 回复文本，或 None（未配置 Key / 调用失败时）
    """
    client = get_client()
    if client is None:
        return None

    settings = get_settings()
    messages = [{"role": "system", "content": system}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    try:
        kwargs = {
            "model": settings.OPENAI_MODEL,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if response_json:
            kwargs["response_format"] = {"type": "json_object"}

        response = await client.chat.completions.create(**kwargs)
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"LLM 调用失败: {e}")
        return None


def parse_json(text: str | None) -> dict | list | None:
    """安全解析 LLM 返回的 JSON，多种策略容错"""
    if not text:
        return None
    text = text.strip()

    # 策略 1：移除 markdown code fence
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines).strip()

    # 策略 2：直接解析
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 策略 3：提取第一个 JSON 对象或数组
    for start_char, end_char in [("{", "}"), ("[", "]")]:
        start = text.find(start_char)
        if start == -1:
            continue
        depth = 0
        for i in range(start, len(text)):
            if text[i] == start_char:
                depth += 1
            elif text[i] == end_char:
                depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[start:i + 1])
                except json.JSONDecodeError:
                    break

    logger.warning(f"JSON 解析失败: {text[:200]}...")
    return None


# ════════════════════════════════════════════════
# Prompt 模板
# ════════════════════════════════════════════════

RESUME_OPTIMIZE_SYSTEM = """你是一位资深的保研简历导师，拥有丰富的高校招生面试经验。
请对以下简历进行逐项审查，给出具体、可操作的优化建议。

输出要求：返回 JSON 数组，每条建议格式为：
{"type": "improvement|warning|tip", "field": "字段名", "message": "具体建议"}

- improvement: 可以做得更好的地方
- warning: 有问题需要修改
- tip: 锦上添花的建议

示例输出：
[
  {"type": "improvement", "field": "research", "message": "建议量化科研成果，如「将模型F1值从82%提升至87.2%」"},
  {"type": "warning", "field": "education", "message": "GPA排名建议具体到百分比，如「前5%(3/60)」"}
]

请给出 5-8 条建议，覆盖不同字段，中文回复。只返回 JSON 数组，不要其他内容。"""


RECOMMEND_SYSTEM = """你是一位经验丰富的保研择校顾问，熟悉中国各985/211高校的招生情况。
请根据学生背景信息，评估其综合竞争力并推荐适合的目标院校。

输出要求：返回 JSON 对象，格式为：
{
  "overall_score": 0-100整数,
  "evaluation": "一段综合评价",
  "schools": [
    {
      "university": "学校名",
      "department": "学院名",
      "match_score": 0-100,
      "difficulty": "reach|match|safety",
      "reason": "推荐理由",
      "discipline_rating": "学科评估等级"
    }
  ],
  "suggestions": ["建议1", "建议2", ...]
}

推荐 5-7 所院校，包含 2 所冲刺(reach)、2-3 所稳妥(match)、1-2 所保底(safety)。
基于真实的中国高校学科评估数据给出建议。只返回 JSON，不要其他内容。"""


INTERVIEW_SYSTEM_TEMPLATE = """你是{target_school}{target_major}方向的研究生面试官。
当前进行的是{interview_type}面试（难度：{difficulty}）。

面试规则：
1. 每次只问一个问题
2. 根据学生的回答质量决定是否追问或换下一题
3. 如果是综合面试：包括自我介绍、研究动机、科研经历、未来规划
4. 如果是专业面试：考察专业基础知识、前沿理解、分析能力
5. 如果是英语面试：全程使用英文

你的回复格式是 JSON：
{{"question": "你的问题", "feedback": {{"score": 0-100, "comment": "对上一个回答的简短评价"}}}}

对第一个问题，feedback 可以为 null。面试进行 4-6 个问题后，最后一条回复中 question 设为 "INTERVIEW_END"。
只返回 JSON，不要其他内容。"""


INTERVIEW_REPORT_SYSTEM = """你是一位面试评估专家，请根据以下面试对话记录生成评估报告。

输出格式为 JSON：
{
  "total_score": 0-100,
  "dimensions": {
    "expression": {"score": 0-100, "label": "表达能力"},
    "knowledge": {"score": 0-100, "label": "专业知识"},
    "adaptability": {"score": 0-100, "label": "应变能力"},
    "overall_quality": {"score": 0-100, "label": "综合素质"}
  },
  "strengths": ["优势1", "优势2", ...],
  "improvements": ["待改进1", "待改进2", ...],
  "overall": "总体评价，2-3句话"
}

请客观公正地评价，给出建设性的反馈。只返回 JSON，不要其他内容。"""


MENTAL_SYSTEM = """你是一位专注于大学生群体的心理咨询师，尤其了解保研学生面临的压力和情绪困扰。

沟通原则：
1. 首先共情和接纳，让学生感到被理解
2. 不做诊断，不开药物建议
3. 给出实用的情绪调节方法
4. 适当时候建议寻求专业心理咨询
5. 语气温暖、平等、非说教
6. 如果感受到严重心理危机信号，引导学生拨打心理援助热线

回复 200-400 字，使用中文，语气亲切温暖。"""


PLAN_SYSTEM = """你是一位保研规划专家，为学生制定个性化的保研准备计划。

输出要求：返回 JSON 对象：
{
  "competitiveness_score": 0-100,
  "evaluation": "一段综合评估",
  "phases": [
    {
      "name": "阶段名",
      "period": "时间段描述",
      "tasks": [
        {"title": "任务标题", "priority": "high|medium|low"}
      ]
    }
  ],
  "suggestions": ["建议1", "建议2", ...]
}

规划 4-5 个阶段，每个阶段 2-4 个任务。结合学生实际情况给出针对性建议。
只返回 JSON，不要其他内容。"""
