/** 目标院校 */
export interface TargetUniversity {
  /** 学校名称 */
  university: string;
  /** 感兴趣的学院列表 */
  departments: string[];
}

/** 用户信息 */
export interface UserProfile {
  id: number;
  /** 用户名 */
  username: string;
  /** 邮箱 */
  email: string;
  /** 头像 URL */
  avatar_url: string | null;
  /** 昵称 */
  nickname: string;
  /** 学校（本科就读） */
  university: string | null;
  /** 专业（本科就读） */
  major: string | null;
  /** 年级 */
  grade: string | null;
  /** 个人简介 */
  bio: string | null;
  /** GPA 排名（如 "前10%"） */
  gpa_rank: string | null;
  /** 目标院校列表 */
  target_universities: TargetUniversity[];
  /** 感兴趣的研究方向 */
  research_interests: string[];
  /** 是否已完成引导填写 */
  is_onboarded: boolean;
  /** 注册时间 */
  created_at: string;
}

/** 收藏项类型 */
export type FavoriteType = "notice" | "school" | "tutor";

/** 收藏项 */
export interface FavoriteItem {
  id: number;
  /** 收藏类型 */
  type: FavoriteType;
  /** 目标 ID */
  target_id: number;
  /** 标题 */
  title: string;
  /** 描述 */
  description: string;
  /** 收藏时间 */
  created_at: string;
  /** 额外信息（如学校名、导师名等） */
  extra: Record<string, string>;
}

/** 用户设置 */
export interface UserSettings {
  /** 邮件通知 */
  email_notification: boolean;
  /** 收藏更新提醒 */
  favorite_update_notification: boolean;
  /** 截止日期提醒（提前天数） */
  deadline_reminder_days: number;
  /** 关注的学科 */
  interested_disciplines: string[];
  /** 关注的学校 */
  interested_universities: string[];
}

/** 登录请求 */
export interface LoginRequest {
  email: string;
  password: string;
}

/** 注册请求 */
export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  nickname?: string;
}

/** 认证响应 */
export interface AuthResponse {
  token: string;
  user: UserProfile;
}
