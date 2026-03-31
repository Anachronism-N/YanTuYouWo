/** 面试模式 */
export type InterviewMode = "text" | "video";

/** 简历来源 */
export type ResumeSource = "platform" | "upload" | "none";

/** 面试类型 */
export type InterviewType = "综合面试" | "专业面试" | "英语面试";

/** 面试难度 */
export type InterviewDifficulty = "基础" | "中等" | "困难";

/** 面试消息 */
export interface InterviewMessage {
  id: string;
  role: "interviewer" | "user" | "system";
  content: string;
  timestamp: string;
  /** 面试官评价（仅面试官消息后可能有） */
  feedback?: {
    score: number; // 1-10
    comment: string;
    suggestions: string[];
  };
}

/** 面试配置 */
export interface InterviewConfig {
  /** 面试模式：文字 / 视频 */
  mode: InterviewMode;
  /** 面试类型 */
  type: InterviewType;
  /** 难度 */
  difficulty: InterviewDifficulty;
  /** 目标学校 */
  target_school: string;
  /** 目标专业 */
  target_major: string;
  /** 面试时长（分钟） */
  duration: number;
  /** 是否开启实时评价 */
  realtime_feedback: boolean;
  /** 简历来源 */
  resume_source: ResumeSource;
  /** 上传的简历文件名 */
  resume_filename?: string;
}

/** 面试结果 */
export interface InterviewResult {
  /** 总分 */
  overall_score: number;
  /** 各维度评分 */
  dimensions: {
    name: string;
    score: number;
    max_score: number;
    comment: string;
  }[];
  /** 优势 */
  strengths: string[];
  /** 待改进 */
  improvements: string[];
  /** 总体评价 */
  summary: string;
  /** 推荐练习题目 */
  recommended_questions: string[];
  /** 面试时长（秒） */
  duration: number;
  /** 回答问题数 */
  question_count: number;
}

/** 面试历史记录 */
export interface InterviewHistory {
  id: string;
  config: InterviewConfig;
  result: InterviewResult;
  messages: InterviewMessage[];
  created_at: string;
}

/** 个人题库题目 */
export interface QuestionBankItem {
  id: string;
  /** 问题 */
  question: string;
  /** 分类（系统分类） */
  category: string;
  /** 自定义标签（如项目名称、简历相关等） */
  custom_tags: string[];
  /** 参考回答思路 */
  answer_outline: string;
  /** 是否由 AI 生成 */
  is_ai_generated: boolean;
  /** AI 生成的题目是否已被用户确认 */
  is_confirmed: boolean;
  /** 难度 */
  difficulty: InterviewDifficulty;
  /** 来源标签（如"基于简历"、"高频问题"、"项目相关"） */
  source_tag?: string;
  /** 关联的简历项目名称 */
  related_project?: string;
  /** 练习次数 */
  practice_count: number;
  /** 最近练习时间 */
  last_practiced?: string;
  /** 掌握程度 1-5 */
  mastery_level: number;
  created_at: string;
  updated_at: string;
}

/** 心理支持交互模式 */
export type MentalMode = "text" | "voice";

/** 心理支持消息 */
export interface MentalMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: string;
  /** 情绪标签 */
  emotion_tag?: string;
  /** 语音消息时长（秒） */
  voice_duration?: number;
}

/** 心理支持话题 */
export type MentalTopic = "考研焦虑" | "面试紧张" | "选择困难" | "人际关系" | "时间管理" | "自我怀疑" | "其他";

/** 解压小游戏类型 */
export type MiniGameType = "breathing" | "word_relay" | "knowledge_quiz" | "affirmation";

/** 解压小游戏 */
export interface MiniGame {
  id: string;
  type: MiniGameType;
  title: string;
  description: string;
  /** 预计时长（分钟） */
  duration: number;
  /** 图标 emoji */
  icon: string;
}

/** 心理评估 */
export interface MentalAssessment {
  /** 压力指数 1-10 */
  stress_level: number;
  /** 焦虑指数 1-10 */
  anxiety_level: number;
  /** 信心指数 1-10 */
  confidence_level: number;
  /** 建议 */
  suggestions: string[];
  /** 推荐资源 */
  resources: {
    title: string;
    type: "文章" | "视频" | "音频" | "练习";
    url: string;
  }[];
}

/** 综合规划 - 时间线节点 */
export interface PlanTimelineNode {
  id: string;
  /** 月份 YYYY-MM */
  month: string;
  /** 标题 */
  title: string;
  /** 描述 */
  description: string;
  /** 任务列表 */
  tasks: {
    id: string;
    content: string;
    is_completed: boolean;
    priority: "high" | "medium" | "low";
  }[];
  /** 状态 */
  status: "completed" | "in_progress" | "upcoming";
}

/** 综合规划输入 */
export interface PlanInput {
  /** 当前年级 */
  grade: string;
  /** 目标学校层次 */
  target_level: string;
  /** 目标学科 */
  target_discipline: string;
  /** 当前 GPA 排名 */
  gpa_rank: string;
  /** 已有科研经历数 */
  research_count: number;
  /** 已有论文数 */
  paper_count: number;
  /** 已有竞赛获奖数 */
  award_count: number;
  /** 英语水平 */
  english_level: string;
  /** 薄弱环节 */
  weaknesses: string[];
}

/** 综合规划结果 */
export interface PlanResult {
  /** 整体评估 */
  assessment: string;
  /** 竞争力评分 */
  competitiveness_score: number;
  /** 时间线 */
  timeline: PlanTimelineNode[];
  /** 重点建议 */
  key_suggestions: {
    category: string;
    content: string;
    priority: "high" | "medium" | "low";
  }[];
  /** 推荐资源 */
  resources: {
    title: string;
    description: string;
    url: string;
    type: string;
  }[];
}

/** 规划视图模式 */
export type PlanViewMode = "timeline" | "gantt" | "progress" | "kanban";

/** 规划保存记录 */
export interface SavedPlan {
  id: string;
  /** 规划版本号 */
  version: number;
  /** 规划输入 */
  input: PlanInput;
  /** 规划结果 */
  result: PlanResult;
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at: string;
  /** 变更说明 */
  change_note?: string;
}

/** 成果记录 */
export interface AchievementRecord {
  id: string;
  /** 类型 */
  type: "科研" | "论文" | "竞赛" | "英语" | "面试" | "其他";
  /** 标题 */
  title: string;
  /** 描述 */
  description: string;
  /** 日期 */
  date: string;
  /** 重要程度 */
  importance: "high" | "medium" | "low";
  created_at: string;
}
