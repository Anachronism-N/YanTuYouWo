"""AI 功能 Pydantic 模型"""

from __future__ import annotations


from pydantic import BaseModel, Field


# ──── 简历 ────

class ResumeDraftResponse(BaseModel):
    id: int
    data: dict | None = None
    updated_at: str = ""


class AISuggestion(BaseModel):
    type: str  # improvement / warning / tip
    field: str
    message: str


# ──── 择校推荐 ────

class RecommendRequest(BaseModel):
    university: str | None = None
    major: str | None = None
    gpa_rank: str | None = None
    research_interests: list[str] = []
    target_degree: str = "硕士"
    preferred_regions: list[str] = []
    publications: int = 0
    awards: int = 0
    english_level: str | None = None


class RecommendSchool(BaseModel):
    university: str
    department: str
    match_score: int
    difficulty: str  # reach / match / safety
    reason: str
    discipline_rating: str | None = None


class RecommendResponse(BaseModel):
    overall_score: int
    evaluation: str
    schools: list[RecommendSchool]
    suggestions: list[str]


# ──── 面试 ────

class InterviewStartRequest(BaseModel):
    type: str = "综合"  # 综合/专业/英语
    difficulty: str = "中等"
    target_school: str | None = None
    target_major: str | None = None
    duration_minutes: int = 15


class InterviewAnswerRequest(BaseModel):
    answer: str


class InterviewMessage(BaseModel):
    role: str  # interviewer / candidate
    content: str
    feedback: dict | None = None


class InterviewReport(BaseModel):
    total_score: int
    dimensions: dict
    strengths: list[str]
    improvements: list[str]
    overall: str
    questions_count: int


# ──── 心理支持 ────

class MentalChatRequest(BaseModel):
    topic: str
    message: str


# ──── 综合规划 ────

class PlanGenerateRequest(BaseModel):
    grade: str | None = None
    gpa_rank: str | None = None
    target_level: str | None = None
    target_discipline: str | None = None
    publications: int = 0
    awards: int = 0
    english_level: str | None = None
    weaknesses: list[str] = []


# ──── 语音响应 ────

class VoiceAnswerResponse(BaseModel):
    """语音面试/心理对话统一响应"""
    transcribed_text: str
    reply_text: str
    feedback: dict | None = None
    has_audio: bool = False
    reply_audio_base64: str | None = None


class VoiceLikeResponse(BaseModel):
    detail: str
    status: str


# ──── 简历/导出请求 ────

class ResumeDraftRequest(BaseModel):
    """简历草稿保存请求（任意 JSON 结构）"""
    basic: dict | None = None
    education: list | None = None
    research: list | None = None
    publications: list | None = None
    awards: list | None = None
    skills: list | None = None
    self_evaluation: str | None = None

    model_config = {"extra": "allow"}


class TtsRequest(BaseModel):
    """TTS 请求"""
    text: str = Field(min_length=1)
    voice: str = "FunAudioLLM/CosyVoice2-0.5B:alex"


class RoleUpdateRequest(BaseModel):
    """角色更新请求"""
    role: str
