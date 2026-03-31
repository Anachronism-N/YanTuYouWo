/** 帖子分类 */
export type PostCategory = "经验分享" | "择校咨询" | "面试交流" | "资料分享" | "吐槽灌水" | "官方公告";

/** 帖子 */
export interface Post {
  id: number;
  /** 作者 */
  author: {
    id: number;
    nickname: string;
    avatar: string;
    school?: string;
    badge?: string; // 如"保研成功"、"学长学姐"
  };
  /** 标题 */
  title: string;
  /** 内容（Markdown） */
  content: string;
  /** 分类 */
  category: PostCategory;
  /** 标签 */
  tags: string[];
  /** 点赞数 */
  like_count: number;
  /** 评论数 */
  comment_count: number;
  /** 收藏数 */
  favorite_count: number;
  /** 浏览数 */
  view_count: number;
  /** 是否置顶 */
  is_pinned: boolean;
  /** 是否精华 */
  is_featured: boolean;
  /** 是否已点赞 */
  is_liked: boolean;
  /** 是否已收藏 */
  is_favorited: boolean;
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at: string;
  /** 封面图（可选） */
  cover_image?: string;
}

/** 评论 */
export interface Comment {
  id: number;
  post_id: number;
  author: {
    id: number;
    nickname: string;
    avatar: string;
    school?: string;
  };
  content: string;
  like_count: number;
  is_liked: boolean;
  /** 回复的评论 ID */
  reply_to?: number;
  /** 回复的用户昵称 */
  reply_to_nickname?: string;
  created_at: string;
}

/** 打卡记录 */
export interface CheckinRecord {
  id: number;
  user_id: number;
  /** 打卡日期 YYYY-MM-DD */
  date: string;
  /** 学习时长（分钟） */
  duration: number;
  /** 学习内容 */
  content: string;
  /** 心情 */
  mood: "😊" | "😐" | "😫" | "🔥" | "💪";
  /** 标签 */
  tags: string[];
}

/** 打卡统计 */
export interface CheckinStats {
  /** 总打卡天数 */
  total_days: number;
  /** 连续打卡天数 */
  streak_days: number;
  /** 本月打卡天数 */
  month_days: number;
  /** 总学习时长（分钟） */
  total_duration: number;
  /** 本月学习时长（分钟） */
  month_duration: number;
  /** 排名 */
  rank: number;
  /** 打卡日历（本月） */
  calendar: string[];
}

/** 问答 */
export interface QAQuestion {
  id: number;
  author: {
    id: number;
    nickname: string;
    avatar: string;
    school?: string;
  };
  title: string;
  content: string;
  tags: string[];
  answer_count: number;
  view_count: number;
  is_resolved: boolean;
  /** 悬赏积分 */
  reward_points: number;
  created_at: string;
}

/** 问答回答 */
export interface QAAnswer {
  id: number;
  question_id: number;
  author: {
    id: number;
    nickname: string;
    avatar: string;
    school?: string;
    badge?: string;
  };
  content: string;
  like_count: number;
  is_liked: boolean;
  /** 是否被采纳 */
  is_accepted: boolean;
  created_at: string;
}

/** 社群查询参数 */
export interface CommunityQueryParams {
  category?: PostCategory;
  tag?: string;
  keyword?: string;
  sort?: "latest" | "hot" | "featured";
  page?: number;
  size?: number;
}
