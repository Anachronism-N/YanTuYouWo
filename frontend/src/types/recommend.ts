/** 择校推荐 - 用户输入条件 */
export interface RecommendInput {
  /** 本科学校 */
  university: string;
  /** 本科专业 */
  major: string;
  /** 学校层次 */
  school_level: "985" | "211" | "双一流" | "普通一本" | "二本" | "";
  /** GPA */
  gpa: string;
  /** GPA 满分 */
  gpa_max: string;
  /** GPA 排名百分比（如 10 表示前 10%） */
  rank_percent: number;
  /** 目标学科 */
  target_discipline: string;
  /** 目标专业方向 */
  target_direction: string;
  /** 科研经历数量 */
  research_count: number;
  /** 论文数量 */
  paper_count: number;
  /** 其中 SCI/EI 论文数量 */
  high_paper_count: number;
  /** 竞赛获奖数量 */
  award_count: number;
  /** 其中国家级获奖数量 */
  national_award_count: number;
  /** 英语水平 */
  english_level: "四级" | "六级" | "雅思" | "托福" | "GRE" | "";
  /** 英语成绩 */
  english_score: string;
  /** 是否有海外交流经历 */
  has_overseas: boolean;
  /** 偏好地区 */
  preferred_regions: string[];
  /** 期望学位 */
  target_degree: "硕士" | "博士" | "直博" | "";

  // ===== 新增偏好字段 =====
  /** 未来规划 */
  future_plan: "学术深造" | "就业工作" | "创业" | "未确定" | "";
  /** 就业方向偏好（当 future_plan 为就业时） */
  career_direction: "互联网大厂" | "国企央企" | "外企" | "公务员" | "科研院所" | "高校教职" | "自由职业" | "";
  /** 学术深造方向（当 future_plan 为学术深造时） */
  academic_goal: "国内读博" | "出国读博" | "硕士毕业" | "";
  /** 对导师的偏好 */
  advisor_preference: "学术大牛" | "青年教师" | "工业界背景" | "无偏好" | "";
  /** 对课题组氛围的偏好 */
  lab_atmosphere: "学术自由" | "管理严格" | "项目驱动" | "无偏好" | "";
  /** 对城市生活的重视程度 (0-100) */
  city_importance: number;
  /** 对学校排名的重视程度 (0-100) */
  ranking_importance: number;
  /** 对专业实力的重视程度 (0-100) */
  major_strength_importance: number;
  /** 对就业前景的重视程度 (0-100) */
  employment_importance: number;
  /** 对科研平台的重视程度 (0-100) */
  research_platform_importance: number;
  /** 是否接受调剂 */
  accept_adjustment: boolean;
  /** 是否有推荐信 */
  has_recommendation: boolean;
  /** 推荐信来源 */
  recommendation_source: string;
  /** 个人优势自述 */
  personal_strengths: string;
  /** 个人短板自述 */
  personal_weaknesses: string;
}

/** 推荐院校结果 */
export interface RecommendSchool {
  id: number;
  name: string;
  level: "985" | "211" | "双一流";
  province: string;
  city: string;
  department: string;
  major: string;
  match_score: number;
  difficulty: number;
  reasons: string[];
  category: "冲刺" | "稳妥" | "保底";
  admission_info: {
    quota: number;
    applicants: number;
    rate: string;
  };
  related_tutors: {
    name: string;
    title: string;
    direction: string;
  }[];
  /** 学科评估等级 */
  discipline_rank: string;
  /** 学校综合排名 */
  overall_rank: number;
  /** 优势标签 */
  tags: string[];
}

/** 推荐结果 */
export interface RecommendResult {
  /** 综合评估 */
  assessment: {
    /** 综合竞争力评分（0-100） */
    overall_score: number;
    /** 各维度评分 */
    dimensions: {
      name: string;
      score: number;
      max_score: number;
      comment: string;
    }[];
    /** 总体评价 */
    summary: string;
  };
  /** 推荐院校列表 */
  schools: RecommendSchool[];
  /** AI 建议 */
  suggestions: string[];
  /** 时间线建议 */
  timeline: {
    month: string;
    title: string;
    description: string;
  }[];
}
