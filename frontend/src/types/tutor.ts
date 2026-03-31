import { SchoolLevel } from "./notice";

/** 导师列表项 */
export interface TutorItem {
  id: number;
  /** 导师姓名 */
  name: string;
  /** 所属学校 */
  university_name: string;
  /** 所属学院 */
  department_name: string;
  /** 学校层次 */
  school_level: SchoolLevel;
  /** 职称 */
  title: string;
  /** 研究方向（多个） */
  research_areas: string[];
  /** 个人主页 */
  homepage_url: string | null;
  /** 邮箱 */
  email: string | null;
  /** 头像 URL */
  avatar_url: string | null;
  /** 省份 */
  province: string;
  /** 城市 */
  city: string;
  /** 学科门类 */
  discipline: string;
  /** 是否招生 */
  is_recruiting: boolean;
  /** 招生方向描述 */
  recruiting_info: string | null;
  /** 论文数量 */
  paper_count: number;
  /** 项目数量 */
  project_count: number;
  /** 浏览量 */
  view_count: number;
}

/** 导师详情 */
export interface TutorDetail extends TutorItem {
  /** 个人简介 */
  biography: string;
  /** 教育经历 */
  education: string[];
  /** 工作经历 */
  experience: string[];
  /** 代表性论文 */
  publications: string[];
  /** 科研项目 */
  projects: string[];
  /** 获奖情况 */
  awards: string[];
  /** 招生要求 */
  recruiting_requirements: string | null;
  /** 联系方式（电话） */
  phone: string | null;
  /** 办公地址 */
  office_address: string | null;
  /** 数据来源 URL */
  source_url: string;
  /** 数据抓取时间 */
  created_at: string;
}

/** 导师查询参数 */
export interface TutorQueryParams {
  university?: string;
  discipline?: string;
  research_area?: string;
  keyword?: string;
  is_recruiting?: boolean;
  province?: string;
  sort?: "name" | "paper_count" | "view_count";
  page?: number;
  size?: number;
}

/** 导师列表响应 */
export interface TutorListResponse {
  total: number;
  items: TutorItem[];
}
