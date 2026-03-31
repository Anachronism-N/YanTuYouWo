/** 知识库分类 */
export type KnowledgeCategory = "schools" | "courses" | "questions" | "templates" | "experiences" | "tips";

/** 院校百科 */
export interface SchoolWiki {
  id: number;
  /** 学校名称 */
  university: string;
  /** 学院名称 */
  department: string;
  /** 学校层次 */
  level: "985" | "211" | "双一流" | "其他";
  /** 省份 */
  province: string;
  /** 学科评估等级 */
  discipline_rating?: string;
  /** 招生偏好 */
  admission_preference: string;
  /** 历年数据 */
  historical_data: {
    year: number;
    enrolled: number;
    applicants: number;
    acceptance_rate: number;
  }[];
  /** 导师风格 */
  tutor_style: string;
  /** 学生评价 */
  student_reviews: string[];
  /** 标签 */
  tags: string[];
  /** 更新时间 */
  updated_at: string;
}

/** 录播课程 */
export interface Course {
  id: number;
  /** 课程标题 */
  title: string;
  /** 课程描述 */
  description: string;
  /** 讲师 */
  instructor: string;
  /** 讲师学校 */
  instructor_school: string;
  /** 课程分类 */
  category: "面试技巧" | "简历撰写" | "科研入门" | "英语准备" | "心态调整" | "择校策略" | "其他";
  /** 封面图 */
  cover_url: string;
  /** 视频时长（分钟） */
  duration: number;
  /** 课程集数 */
  episodes: number;
  /** 评分 */
  rating: number;
  /** 评分人数 */
  rating_count: number;
  /** 观看人数 */
  view_count: number;
  /** 收藏数 */
  favorite_count: number;
  /** 标签 */
  tags: string[];
  /** 是否免费 */
  is_free: boolean;
  /** 创建时间 */
  created_at: string;
}

/** 面试题目 */
export interface InterviewQuestion {
  id: number;
  /** 题目内容 */
  question: string;
  /** 参考答案 */
  reference_answer?: string;
  /** 学校 */
  university: string;
  /** 学院 */
  department: string;
  /** 学科方向 */
  discipline: string;
  /** 题目类型 */
  type: "专业课" | "综合面试" | "英语口语" | "政治" | "开放性问题";
  /** 难度 1-5 */
  difficulty: number;
  /** 年份 */
  year: number;
  /** 来源 */
  source: "用户贡献" | "官方" | "整理";
  /** 点赞数 */
  like_count: number;
  /** 收藏数 */
  favorite_count: number;
  /** 标签 */
  tags: string[];
  /** 创建时间 */
  created_at: string;
}

/** 文书模板 */
export interface DocumentTemplate {
  id: number;
  /** 模板标题 */
  title: string;
  /** 模板描述 */
  description: string;
  /** 模板类型 */
  type: "个人陈述" | "推荐信" | "研究计划" | "简历模板" | "自荐信" | "其他";
  /** 适用学科 */
  discipline: string;
  /** 文件格式 */
  format: "PDF" | "DOCX" | "在线";
  /** 下载次数 */
  download_count: number;
  /** 评分 */
  rating: number;
  /** 评分人数 */
  rating_count: number;
  /** 作者 */
  author: string;
  /** 预览图 */
  preview_url?: string;
  /** 标签 */
  tags: string[];
  /** 创建时间 */
  created_at: string;
}

/** 经验帖审核状态 */
export type ExperienceStatus = "pending" | "reviewing" | "approved" | "rejected";

/** 经验帖精选 */
export interface ExperiencePost {
  id: number;
  /** 作者 */
  author: {
    id: number;
    nickname: string;
    avatar: string;
    school: string;
    target_school?: string;
    badge?: string;
  };
  /** 标题 */
  title: string;
  /** 内容摘要 */
  summary: string;
  /** 完整内容 */
  content: string;
  /** 分类 */
  category: "夏令营" | "预推免" | "九推" | "综合经验" | "失败经验";
  /** 目标学校 */
  target_university: string;
  /** 目标学院 */
  target_department: string;
  /** 年份 */
  year: number;
  /** 审核状态 */
  status: ExperienceStatus;
  /** 点赞数 */
  like_count: number;
  /** 评论数 */
  comment_count: number;
  /** 收藏数 */
  favorite_count: number;
  /** 浏览数 */
  view_count: number;
  /** 是否精选 */
  is_featured: boolean;
  /** 标签 */
  tags: string[];
  /** 创建时间 */
  created_at: string;
}

/** 信息差速递 */
export interface InfoTip {
  id: number;
  /** 标题 */
  title: string;
  /** 内容 */
  content: string;
  /** 分类 */
  category: "隐性要求" | "导师偏好" | "时间节点" | "政策变动" | "避坑指南" | "其他";
  /** 相关学校 */
  related_universities: string[];
  /** 重要程度 1-5 */
  importance: number;
  /** 浏览数 */
  view_count: number;
  /** 点赞数 */
  like_count: number;
  /** 是否已读 */
  is_read: boolean;
  /** 标签 */
  tags: string[];
  /** 发布时间 */
  created_at: string;
  /** 有效期 */
  expires_at?: string;
}
