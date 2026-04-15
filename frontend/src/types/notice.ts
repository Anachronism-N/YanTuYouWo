/** 通知类型 */
export type NoticeType =
  | "summer_camp"
  | "pre_admission"
  | "admission_guide"
  | "admission_list"
  | "offer_list"
  | "direct_phd"
  | "combined_degree"
  | "seminar"
  | "all";

/** 通知类型中文映射 */
export const NOTICE_TYPE_LABELS: Record<string, string> = {
  summer_camp: "夏令营",
  pre_admission: "预推免",
  admission_guide: "招生简章",
  admission_list: "入营名单",
  offer_list: "拟录取",
  direct_phd: "直博",
  combined_degree: "硕博连读",
  seminar: "招生宣讲",
};

/** 通知状态 */
export type NoticeStatus = "registering" | "in_progress" | "not_started" | "ended";

/** 通知状态中文映射 */
export const NOTICE_STATUS_LABELS: Record<NoticeStatus, string> = {
  registering: "报名中",
  in_progress: "进行中",
  not_started: "未开始",
  ended: "已结束",
};

/** 学校层次 */
export type SchoolLevel = "985" | "211" | "double_first_class" | "other";

/** 目标学位 */
export type TargetDegree = "硕士" | "博士" | "硕博";

/** 申请规则 */
export type ApplicationRule = "可兼报" | "不可兼报" | "未知";

/** 通知列表项 */
export interface NoticeItem {
  id: number;
  title: string;
  university_name: string;
  department_name: string;
  school_level: SchoolLevel;
  program_type: string;
  program_type_key: NoticeType;
  target_degree: TargetDegree;
  disciplines: string[];
  quota: string | null;
  registration_start: string | null;
  registration_end: string | null;
  camp_start: string | null;
  camp_end: string | null;
  publish_date: string;
  status: NoticeStatus;
  summary: string;
  province: string;
  city?: string;
  /** 标签（如年份、地点等） */
  tags: string[];
  /** 浏览量 */
  view_count: number;
  /** 意向申请人数 */
  intent_count: number;
  /** 申请规则 */
  application_rule: ApplicationRule;
}

/** 通知详情 */
export interface NoticeDetail extends NoticeItem {
  requirements: string | null;
  registration_url: string | null;
  official_url: string | null;
  contact: string | null;
  raw_content: string;
  source_url: string;
  created_at: string;
  /** 往届招生人数 */
  prev_year_quota: string | null;
}

/** 通知列表响应 */
export interface NoticeListResponse {
  total: number;
  items: NoticeItem[];
  filters: {
    provinces: string[];
    disciplines: string[];
    universities: string[];
  };
}

/** 通知查询参数 */
export interface NoticeQueryParams {
  type?: NoticeType;
  school_level?: SchoolLevel;
  province?: string;
  university?: string;
  discipline?: string;
  major?: string;
  status?: NoticeStatus;
  keyword?: string;
  sort?: "latest" | "deadline" | "hot";
  page?: number;
  size?: number;
}
