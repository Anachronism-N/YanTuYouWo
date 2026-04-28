import axios from "axios";
import { API_BASE_URL } from "./constants";
import type { NoticeListResponse, NoticeDetail, NoticeQueryParams } from "@/types/notice";
import type { SchoolListResponse, SchoolDetail, SchoolQueryParams, DepartmentItem } from "@/types/school";
import type { StatsOverview, SearchResponse } from "@/types/api";
import type { TutorListResponse, TutorDetail, TutorQueryParams } from "@/types/tutor";
import type { UserProfile, FavoriteItem, UserSettings, LoginRequest, RegisterRequest, AuthResponse } from "@/types/user";
import type { ResumeData, AISuggestion } from "@/types/resume";
import type { RecommendInput, RecommendResult } from "@/types/recommend";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        const store = localStorage.getItem("yantu-user-store");
        const skipRedirect = error.config?.headers?.["X-Skip-Auth-Redirect"] === "true";
        if (store && !skipRedirect) {
          localStorage.removeItem("yantu-user-store");
          window.location.href = "/auth/login";
        }
      }
    }
    return Promise.reject(error);
  },
);

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    try {
      const store = JSON.parse(localStorage.getItem("yantu-user-store") || "{}");
      const token = store?.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {}
  }
  return config;
});

// ========== 通知相关 ==========

/** 获取通知列表 */
export async function getNotices(params: NoticeQueryParams): Promise<NoticeListResponse> {
  const { data } = await apiClient.get("/notices", { params });
  return data;
}

/** 获取通知详情 */
export async function getNoticeDetail(id: number): Promise<NoticeDetail> {
  const { data } = await apiClient.get(`/notices/${id}`);
  return data;
}

/** 获取最新通知 */
export async function getLatestNotices(limit = 10): Promise<NoticeListResponse> {
  const { data } = await apiClient.get("/notices/latest", { params: { limit } });
  return data;
}

// ========== 院校相关 ==========

/** 获取院校列表 */
export async function getSchools(params: SchoolQueryParams): Promise<SchoolListResponse> {
  const { data } = await apiClient.get("/schools", { params });
  return data;
}

/** 获取院校详情 */
export async function getSchoolDetail(id: number): Promise<SchoolDetail> {
  const { data } = await apiClient.get(`/schools/${id}`);
  return data;
}

/** 获取院校下的学院列表 */
export async function getSchoolDepartments(schoolId: number): Promise<DepartmentItem[]> {
  const { data } = await apiClient.get(`/schools/${schoolId}/departments`);
  return data;
}

/** 获取院校下的通知列表 */
export async function getSchoolNotices(schoolId: number, params?: { page?: number; size?: number }): Promise<NoticeListResponse> {
  const { data } = await apiClient.get(`/schools/${schoolId}/notices`, { params });
  return data;
}

// ========== 统计相关 ==========

/** 获取首页统计数据 */
export async function getStatsOverview(): Promise<StatsOverview> {
  const { data } = await apiClient.get("/stats/overview");
  return data;
}

// ========== 搜索 ==========

/** 全站搜索 */
export async function search(params: {
  keyword: string;
  type?: "notice" | "school" | "tutor";
  page?: number;
  size?: number;
}): Promise<SearchResponse> {
  const { data } = await apiClient.get("/search", { params });
  return data;
}

// ========== 导师相关 ==========

/** 获取导师列表 */
export async function getTutors(params: TutorQueryParams): Promise<TutorListResponse> {
  const { data } = await apiClient.get("/tutors", { params });
  return data;
}

/** 获取导师详情 */
export async function getTutorDetail(id: number): Promise<TutorDetail> {
  const { data } = await apiClient.get(`/tutors/${id}`);
  return data;
}

/** 导师库统计概览 */
export interface TutorStats {
  total: number;
  tier_distribution: Record<string, number>;
  universities: { name: string; count: number }[];
  provinces: { name: string; count: number }[];
  disciplines: { name: string; count: number }[];
  data_quality: {
    with_email: number;
    with_avatar: number;
    with_h_index: number;
    with_biography: number;
  };
}

export async function getTutorStats(): Promise<TutorStats> {
  const { data } = await apiClient.get(`/tutors/stats`);
  return data;
}

// ========== 用户认证 ==========

/** 登录 */
export async function login(params: LoginRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post("/auth/login", params);
  return data;
}

/** 注册 */
export async function register(params: RegisterRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post("/auth/register", params);
  return data;
}

/** 获取当前用户信息 */
export async function getCurrentUser(): Promise<UserProfile> {
  const { data } = await apiClient.get("/user/profile");
  return data;
}

/** 更新用户信息 */
export async function updateProfile(params: Partial<UserProfile>): Promise<UserProfile> {
  const { data } = await apiClient.put("/user/profile", params);
  return data;
}

// ========== 收藏相关 ==========

/** 获取收藏列表 */
export async function getFavorites(params?: { type?: string; page?: number; size?: number }): Promise<{ total: number; items: FavoriteItem[] }> {
  const { data } = await apiClient.get("/user/favorites", { params });
  return data;
}

/** 添加收藏 */
export async function addFavorite(type: string, targetId: number): Promise<void> {
  await apiClient.post("/user/favorites", { type, target_id: targetId });
}

/** 取消收藏 */
export async function removeFavorite(type: string, targetId: number): Promise<void> {
  await apiClient.delete("/user/favorites", { data: { type, target_id: targetId } });
}

/** 检查是否已收藏 */
export async function checkFavorite(type: string, targetId: number): Promise<boolean> {
  const { data } = await apiClient.get("/user/favorites/check", { params: { type, target_id: targetId } });
  return data.is_favorited;
}

// ========== 用户设置 ==========

/** 获取用户设置 */
export async function getUserSettings(): Promise<UserSettings> {
  const { data } = await apiClient.get("/user/settings");
  return data;
}

/** 更新用户设置 */
export async function updateUserSettings(params: Partial<UserSettings>): Promise<UserSettings> {
  const { data } = await apiClient.put("/user/settings", params);
  return data;
}

// ========== AI 简历工坊 ==========

/** 保存简历草稿 */
export async function saveResumeDraft(resume: ResumeData): Promise<{ id: string }> {
  const { data } = await apiClient.post("/ai/resume/draft", resume);
  return data;
}

/** 获取简历草稿 */
export async function getResumeDraft(): Promise<ResumeData | null> {
  const { data } = await apiClient.get("/ai/resume/draft");
  return data;
}

/** AI 优化简历 */
export async function optimizeResume(resume: ResumeData): Promise<AISuggestion[]> {
  const { data } = await apiClient.post("/ai/resume/optimize", resume);
  return data;
}

/** 导出简历 PDF */
export async function exportResumePDF(resume: ResumeData, template: string): Promise<Blob> {
  const { data } = await apiClient.post("/ai/resume/export", { resume, template }, { responseType: "blob" });
  return data;
}

// ========== AI 择校推荐 ==========

/** 获取择校推荐 */
export async function getRecommendation(input: RecommendInput): Promise<RecommendResult> {
  const { data } = await apiClient.post("/ai/recommend", input);
  return data;
}

/** 导出推荐报告 */
export async function exportRecommendReport(input: RecommendInput, result: RecommendResult): Promise<Blob> {
  const { data } = await apiClient.post("/ai/recommend/export", { input, result }, { responseType: "blob" });
  return data;
}

// ========== AI 模拟面试 ==========

/** 开始模拟面试 */
export async function startInterview(config: Record<string, unknown>): Promise<{ session_id: string }> {
  const { data } = await apiClient.post("/ai/interview/start", config);
  return data;
}

/** 发送面试回答 */
export async function sendInterviewAnswer(sessionId: string, answer: string): Promise<{ reply: string; feedback?: Record<string, unknown> }> {
  const { data } = await apiClient.post(`/ai/interview/${sessionId}/answer`, { answer });
  return data;
}

/** 结束面试并获取评估 */
export async function endInterview(sessionId: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post(`/ai/interview/${sessionId}/end`);
  return data;
}

// ========== AI 心理支持 ==========

/** 发送心理支持消息 */
export async function sendMentalMessage(topic: string, message: string): Promise<{ reply: string }> {
  const { data } = await apiClient.post("/ai/mental/chat", { topic, message });
  return data;
}

/** 获取心理评估 */
export async function getMentalAssessment(sessionId: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get(`/ai/mental/assessment/${sessionId}`);
  return data;
}

// ========== 语音 ==========

export interface VoiceAnswerResponse {
  transcribed_text: string;
  reply_text: string;
  feedback?: Record<string, unknown> | null;
  has_audio: boolean;
  reply_audio_base64: string | null;
}

const VOICE_HEADERS = { "X-Skip-Auth-Redirect": "true" };

export interface TtsVoice {
  id: string;
  name: string;
  gender: string;
  style: string;
  lang: string;
  scene: string;
}

/** 获取可用 TTS 语音列表（无需登录） */
export async function getAvailableVoices(): Promise<TtsVoice[]> {
  const { data } = await apiClient.get(`/voice/voices`);
  return data;
}

/** 语音心理对话（ASR → AI → TTS 一体） */
export async function voiceMentalChat(audio: Blob, topic: string, voiceId?: string): Promise<VoiceAnswerResponse> {
  const form = new FormData();
  form.append("file", audio, "message.webm");
  const params: Record<string, string> = { topic };
  if (voiceId) params.voice_id = voiceId;
  const { data } = await apiClient.post(`/voice/mental/voice-chat`, form, {
    params,
    headers: { "Content-Type": "multipart/form-data", ...VOICE_HEADERS },
    timeout: 60000,
  });
  return data;
}

/** 语音面试首问（获取首题的 TTS 语音） */
export async function voiceInterviewStart(sessionId: string, voiceId?: string): Promise<{ question: string; has_audio: boolean; audio_base64: string | null }> {
  const { data } = await apiClient.post(`/voice/interview/${sessionId}/voice-start`, undefined, {
    params: voiceId ? { voice_id: voiceId } : undefined,
    headers: VOICE_HEADERS,
  });
  return data;
}

/** 语音面试回答 */
export async function voiceInterviewAnswer(sessionId: string, audio: Blob, voiceId?: string): Promise<VoiceAnswerResponse> {
  const form = new FormData();
  form.append("file", audio, "answer.webm");
  const { data } = await apiClient.post(`/voice/interview/${sessionId}/voice-answer`, form, {
    params: voiceId ? { voice_id: voiceId } : undefined,
    headers: { "Content-Type": "multipart/form-data", ...VOICE_HEADERS },
    timeout: 60000,
  });
  return data;
}

/** 文本转语音（返回 audio/mpeg Blob） */
export async function textToSpeech(text: string, voiceId?: string): Promise<Blob> {
  const { data } = await apiClient.post(`/voice/tts`, { text, voice: voiceId ?? "FunAudioLLM/CosyVoice2-0.5B:alex" }, { responseType: "blob" });
  return data;
}

// ========== AI 综合规划 ==========

/** 生成保研规划 */
export async function generatePlan(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post("/ai/plan/generate", input);
  return data;
}

// ========== 社群 ==========

/** 获取帖子列表 */
export async function getPosts(params?: Record<string, unknown>): Promise<{ total: number; items: Record<string, unknown>[] }> {
  const { data } = await apiClient.get("/community/posts", { params });
  return data;
}

/** 获取帖子详情 */
export async function getPostDetail(id: number): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get(`/community/posts/${id}`);
  return data;
}

/** 创建帖子 */
export async function createPost(post: Record<string, unknown>): Promise<{ id: number }> {
  const { data } = await apiClient.post("/community/posts", post);
  return data;
}

/** 点赞帖子 */
export async function likePost(id: number): Promise<void> {
  await apiClient.post(`/community/posts/${id}/like`);
}

/** 获取评论列表 */
export async function getComments(postId: number, params?: Record<string, unknown>): Promise<{ total: number; items: Record<string, unknown>[] }> {
  const { data } = await apiClient.get(`/community/posts/${postId}/comments`, { params });
  return data;
}

/** 创建评论 */
export async function createComment(postId: number, content: string, replyTo?: number): Promise<{ id: number }> {
  const { data } = await apiClient.post(`/community/posts/${postId}/comments`, { content, reply_to: replyTo });
  return data;
}

/** 学习打卡 */
export async function checkin(record: Record<string, unknown>): Promise<{ id: number }> {
  const { data } = await apiClient.post("/community/checkin", record);
  return data;
}

/** 获取打卡统计 */
export async function getCheckinStats(): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get("/community/checkin/stats");
  return data;
}

/** 获取问答列表 */
export async function getQuestions(params?: Record<string, unknown>): Promise<{ total: number; items: Record<string, unknown>[] }> {
  const { data } = await apiClient.get("/community/qa", { params });
  return data;
}

export default apiClient;
