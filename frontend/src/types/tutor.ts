import { SchoolLevel } from "./notice";

/** 数据完整度分级 */
export type TutorCrawlTier = "tier1" | "tier2" | "tier3";

/** 爬取来源 */
export type TutorCrawlSource = "official" | "aminer" | "baidu_scholar" | "openalex" | "manual";

/** 教育/经历条目（结构化） */
export interface EducationItem {
  year?: string;
  degree?: string;
  school?: string;
  major?: string;
}
export interface ExperienceItem {
  year?: string;
  title?: string;
  organization?: string;
}
export interface PublicationItem {
  title: string;
  venue?: string | null;
  authors?: string | null;
  year?: number | null;
  citations?: number;
  url?: string | null;
  abstract?: string | null;
  doi?: string | null;
  type?: string | null;
}

export interface CoauthorItem {
  name: string;
  openalex_id?: string | null;
  works_together_count: number;
  last_year?: number | null;
}

export interface TopicItem {
  name: string;
  /** 'topic' = OpenAlex topics, 'concept' = OpenAlex x_concepts */
  kind?: "topic" | "concept";
  works_count?: number;
  subfield?: string | null;
  level?: number;
  score?: number;
}

export interface YearlyStatsItem {
  year: number;
  works_count: number;
  cited_by_count: number;
}
export interface ProjectItem {
  title: string;
  funder?: string;
  role?: string;
  year?: string;
}

/** 外部学者 ID */
export interface TutorExternalIds {
  aminer_id?: string;
  baidu_scholar_id?: string;
  orcid?: string;
  dblp_pid?: string;
  openalex_id?: string;
}

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
  /** 数据完整度分级 */
  crawl_tier?: TutorCrawlTier;
  /** 数据完整度 0-100 */
  profile_completeness?: number;
  /** h 指数（外部补充） */
  h_index?: number | null;
  /** i10 指数 */
  i10_index?: number | null;
  /** 总被引数（外部补充） */
  citation_count?: number | null;
}

/** 导师详情
 *
 * 为兼容爬虫结构化输出 + 旧 Mock 字符串格式，
 * 列表类字段统一为 `Item | string` 联合类型。
 */
export interface TutorDetail extends TutorItem {
  /** 个人简介 */
  biography: string;
  /** 教育经历 */
  education: Array<EducationItem | string>;
  /** 工作经历 */
  experience: Array<ExperienceItem | string>;
  /** 代表性论文 */
  publications: Array<PublicationItem | string>;
  /** 科研项目 */
  projects: Array<ProjectItem | string>;
  /** 获奖情况 */
  awards: string[];
  /** 近期论文（保留向后兼容） */
  recent_papers?: PublicationItem[];
  /** 完整论文列表（最多 50 篇，按被引数倒序） */
  papers?: PublicationItem[];
  /** 主要合作者 */
  coauthors?: CoauthorItem[];
  /** 研究主题分布 */
  topics?: TopicItem[];
  /** 年度发文 / 引用统计 */
  yearly_stats?: YearlyStatsItem[];
  /** 招生要求 */
  recruiting_requirements: string | null;
  /** 联系方式（电话） */
  phone: string | null;
  /** 办公地址 */
  office_address: string | null;
  /** 数据来源 URL */
  source_url: string;
  /** 数据来源类型 */
  crawl_source?: TutorCrawlSource | null;
  /** 外部学者 ID */
  external_ids?: TutorExternalIds | null;
  /** 最近爬取时间 */
  last_crawled_at?: string | null;
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
