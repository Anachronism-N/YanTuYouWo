/** 教育经历 */
export interface Education {
  id: string;
  school: string;
  department: string;
  major: string;
  degree: "本科" | "硕士" | "博士" | "专科";
  /** 学制（年） */
  duration: string;
  start_date: string;
  end_date: string;
  gpa: string;
  gpa_max: string;
  rank: string;
  /** 总人数（用于排名展示） */
  total_students: string;
  courses: string;
  /** 毕业论文/设计题目 */
  thesis_title: string;
  /** 辅修专业 */
  minor: string;
}

/** 科研经历 */
export interface Research {
  id: string;
  title: string;
  /** 项目类型 */
  project_type: "国家级" | "省部级" | "校级" | "企业合作" | "导师课题" | "自主研究" | "";
  role: string;
  advisor: string;
  /** 所属实验室 */
  lab: string;
  start_date: string;
  end_date: string;
  description: string;
  contribution: string;
  /** 项目成果（如论文、专利、软件等） */
  outcomes: string;
  /** 使用的技术/方法 */
  technologies: string;
}

/** 论文/专利 */
export interface Publication {
  id: string;
  title: string;
  type: "论文" | "专利" | "软著" | "专著";
  venue: string;
  author_order: string;
  /** 所有作者列表 */
  all_authors: string;
  date: string;
  identifier: string;
  /** 论文状态 */
  status: "已发表" | "已录用" | "在审" | "预印本" | "";
  /** SCI 分区 */
  sci_zone: "一区" | "二区" | "三区" | "四区" | "";
  /** 影响因子 */
  impact_factor: string;
  /** CCF 等级 */
  ccf_rank: "A" | "B" | "C" | "";
  /** 是否为通讯作者 */
  is_corresponding: boolean;
  /** 摘要 */
  abstract_text: string;
}

/** 获奖经历 */
export interface Award {
  id: string;
  name: string;
  level: "国际级" | "国家级" | "省级" | "校级" | "院级" | "其他";
  /** 获奖等次 */
  rank: "特等奖" | "一等奖" | "二等奖" | "三等奖" | "优秀奖" | "金奖" | "银奖" | "铜奖" | "";
  /** 颁发机构 */
  issuer: string;
  date: string;
  /** 竞赛/奖项类别 */
  category: "学科竞赛" | "科技创新" | "奖学金" | "荣誉称号" | "文体竞赛" | "社会实践" | "其他";
  note: string;
}

/** 实习/项目经历 */
export interface Experience {
  id: string;
  organization: string;
  /** 行业 */
  industry: string;
  position: string;
  /** 经历类型 */
  type: "实习" | "兼职" | "项目" | "志愿服务" | "学生工作" | "";
  start_date: string;
  end_date: string;
  description: string;
  /** 主要成果 */
  achievements: string;
  /** 使用的技术/工具 */
  tools: string;
}

/** 技能项 */
export interface Skill {
  id: string;
  category: string;
  content: string;
  /** 熟练度 1-5 */
  proficiency: number;
}

/** 语言能力 */
export interface Language {
  id: string;
  /** 语言名称 */
  name: string;
  /** 考试类型 */
  test: "CET-4" | "CET-6" | "雅思" | "托福" | "GRE" | "GMAT" | "日语N1" | "日语N2" | "其他" | "";
  /** 成绩 */
  score: string;
  /** 熟练度 */
  proficiency: "精通" | "熟练" | "良好" | "一般" | "";
}

/** 排版设置 */
export interface LayoutSettings {
  /** 字体 */
  fontFamily: "default" | "songti" | "kaiti" | "heiti" | "fangsong";
  /** 正文字号 (px) */
  fontSize: number;
  /** 姓名字号 (px) */
  nameFontSize: number;
  /** 模块标题字号 (px) */
  sectionFontSize: number;
  /** 行间距 (倍数) */
  lineHeight: number;
  /** 页边距 (px) */
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  /** 模块间距 (px) */
  sectionGap: number;
  /** 条目间距 (px) */
  itemGap: number;
  /** 分隔符样式 */
  dividerStyle: "line" | "double-line" | "dotted" | "none";
  /** 标题行数 */
  titleRows: 1 | 2;
  /** 基本信息位置 */
  basicInfoAlign: "left" | "center" | "right";
  /** 基本信息展示方式 */
  basicInfoStyle: "text" | "icon" | "hidden";
  /** 是否显示照片 */
  showPhoto: boolean;
  /** 照片位置 */
  photoPosition: "top-right" | "top-left" | "header-right";
  /** 主题色 */
  themeColor: string;
  /** 是否自动一页 */
  autoOnePage: boolean;
}

/** 模块配置 */
export interface ModuleConfig {
  key: string;
  label: string;
  visible: boolean;
  order: number;
}

/** 完整简历数据 */
export interface ResumeData {
  basic: {
    name: string;
    gender: "男" | "女" | "";
    /** 民族 */
    ethnicity: string;
    /** 出生日期 */
    birth_date: string;
    phone: string;
    email: string;
    /** 微信号 */
    wechat: string;
    political_status: string;
    hometown: string;
    /** 现居住地 */
    current_address: string;
    /** 个人网站/主页 */
    website: string;
    /** GitHub */
    github: string;
    target_school: string;
    target_major: string;
    photo_url: string;
  };
  education: Education[];
  research: Research[];
  publications: Publication[];
  awards: Award[];
  experiences: Experience[];
  skills: Skill[];
  /** 语言能力 */
  languages: Language[];
  self_evaluation: string;
  /** 排版设置 */
  layout: LayoutSettings;
  /** 模块配置（排序 + 显隐） */
  modules: ModuleConfig[];
}

/** 简历分步表单步骤 */
export type ResumeStep =
  | "basic"
  | "education"
  | "research"
  | "publications"
  | "awards"
  | "experiences"
  | "skills"
  | "settings"
  | "preview";

/** AI 优化建议 */
export interface AISuggestion {
  id: string;
  section: ResumeStep;
  type: "improvement" | "warning" | "tip";
  title: string;
  content: string;
  original?: string;
  suggested?: string;
  accepted: boolean;
}

/** 简历模板 */
export type ResumeTemplate = "academic" | "modern" | "professional" | "elegant" | "minimal" | "latex";

/** 简历模板信息 */
export interface ResumeTemplateInfo {
  id: ResumeTemplate;
  name: string;
  description: string;
  preview_image: string;
}

/** 默认排版设置 */
export const DEFAULT_LAYOUT: LayoutSettings = {
  fontFamily: "default",
  fontSize: 13,
  nameFontSize: 22,
  sectionFontSize: 14,
  lineHeight: 1.6,
  marginTop: 32,
  marginBottom: 32,
  marginLeft: 40,
  marginRight: 40,
  sectionGap: 16,
  itemGap: 8,
  dividerStyle: "line",
  titleRows: 1,
  basicInfoAlign: "center",
  basicInfoStyle: "icon",
  showPhoto: false,
  photoPosition: "top-right",
  themeColor: "#2563eb",
  autoOnePage: false,
};

/** 默认模块配置 */
export const DEFAULT_MODULES: ModuleConfig[] = [
  { key: "education", label: "教育经历", visible: true, order: 0 },
  { key: "research", label: "科研经历", visible: true, order: 1 },
  { key: "publications", label: "论文成果", visible: true, order: 2 },
  { key: "awards", label: "获奖经历", visible: true, order: 3 },
  { key: "experiences", label: "实习项目", visible: true, order: 4 },
  { key: "skills", label: "技能特长", visible: true, order: 5 },
  { key: "languages", label: "语言能力", visible: true, order: 6 },
  { key: "self_evaluation", label: "自我评价", visible: true, order: 7 },
];
