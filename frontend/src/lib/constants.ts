/** 站点基本信息 */
export const SITE_NAME = "研途有我";
export const SITE_DESCRIPTION = "一站式保研信息聚合平台，汇集全国高校夏令营、预推免招生信息";
export const SITE_URL = "https://yantu.com";

/** API 基础路径 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

/** 学校层次选项 */
export const SCHOOL_LEVEL_OPTIONS = [
  { value: "985", label: "985" },
  { value: "211", label: "211" },
  { value: "double_first_class", label: "双一流" },
  { value: "other", label: "其他" },
] as const;

/** 通知类型选项（合并页面用） */
export const NOTICE_TYPE_OPTIONS = [
  { value: "all", label: "全部类型" },
  { value: "summer_camp", label: "夏令营" },
  { value: "pre_admission", label: "预推免" },
  { value: "seminar", label: "宣讲会" },
  { value: "admission_list", label: "入营名单" },
] as const;

/** 通知状态选项 */
export const NOTICE_STATUS_OPTIONS = [
  { value: "registering", label: "报名中" },
  { value: "in_progress", label: "进行中" },
  { value: "not_started", label: "未开始" },
  { value: "ended", label: "已结束" },
] as const;

/** 排序选项 */
export const NOTICE_SORT_OPTIONS = [
  { value: "latest", label: "最新发布" },
  { value: "deadline", label: "即将截止" },
  { value: "hot", label: "热度" },
] as const;

/** 学科门类 */
export const DISCIPLINE_OPTIONS = [
  "工学", "理学", "文学", "经济学", "管理学",
  "法学", "教育学", "医学", "农学", "艺术学",
  "哲学", "历史学", "军事学",
] as const;

/** 热门专业 */
export const MAJOR_OPTIONS = [
  "计算机科学与技术", "软件工程", "人工智能", "电子信息",
  "金融学", "经济学", "会计学", "工商管理",
  "法学", "新闻传播学", "英语语言文学",
  "数学", "物理学", "化学", "生物学",
  "机械工程", "材料科学与工程", "土木工程",
  "临床医学", "基础医学", "药学",
] as const;

/** 热门学校（用于筛选下拉） */
export const UNIVERSITY_OPTIONS = [
  "北京大学", "清华大学", "浙江大学", "复旦大学",
  "上海交通大学", "南京大学", "中国科学技术大学",
  "哈尔滨工业大学", "武汉大学", "中山大学",
  "四川大学", "西安交通大学", "华中科技大学",
  "中国人民大学", "南开大学", "天津大学",
  "北京航空航天大学", "北京理工大学", "同济大学",
  "东南大学", "厦门大学", "山东大学",
  "中南大学", "湖南大学", "大连理工大学",
  "吉林大学", "电子科技大学", "重庆大学",
  "华南理工大学", "兰州大学", "西北工业大学",
] as const;

/** 省份列表 */
export const PROVINCE_OPTIONS = [
  "北京", "天津", "上海", "重庆",
  "河北", "山西", "辽宁", "吉林", "黑龙江",
  "江苏", "浙江", "安徽", "福建", "江西", "山东",
  "河南", "湖北", "湖南", "广东", "海南",
  "四川", "贵州", "云南", "陕西", "甘肃",
  "青海", "台湾", "内蒙古", "广西", "西藏",
  "宁夏", "新疆", "香港", "澳门",
] as const;

/** 大区分组 */
export const REGION_GROUPS = {
  "华北": ["北京", "天津", "河北", "山西", "内蒙古"],
  "东北": ["辽宁", "吉林", "黑龙江"],
  "华东": ["上海", "江苏", "浙江", "安徽", "福建", "江西", "山东"],
  "华中": ["河南", "湖北", "湖南"],
  "华南": ["广东", "广西", "海南"],
  "西南": ["重庆", "四川", "贵州", "云南", "西藏"],
  "西北": ["陕西", "甘肃", "青海", "宁夏", "新疆"],
} as const;

/** 每页默认条数 */
export const DEFAULT_PAGE_SIZE = 20;

/** 导航菜单配置 */
export const NAV_ITEMS = [
  {
    title: "保研信息",
    items: [
      { title: "信息聚合", href: "/info/notices", description: "夏令营、预推免、宣讲会等招生信息汇总" },
      { title: "院校库", href: "/info/schools", description: "985/211/双一流院校信息" },
      { title: "导师库", href: "/info/tutors", description: "按学校/方向/关键词搜索导师" },
    ],
  },
  {
    title: "AI 辅导",
    items: [
      { title: "简历工坊", href: "/ai/resume", description: "AI 辅助打造保研简历" },
      { title: "择校推荐", href: "/ai/recommend", description: "智能匹配目标院校" },
      { title: "导师推荐", href: "/ai/tutor-match", description: "AI 匹配心仪导师" },
      { title: "模拟面试", href: "/ai/interview", description: "AI 模拟面试练习" },
      { title: "心理支持", href: "/ai/mental", description: "保研路上的温暖陪伴" },
      { title: "综合规划", href: "/ai/plan", description: "AI 定制保研时间线" },
    ],
  },
  {
    title: "知识库",
    items: [
      { title: "院校百科", href: "/knowledge/schools", description: "各校各学院详细情况与招生偏好" },
      { title: "录播课程", href: "/knowledge/courses", description: "保研相关视频课程" },
      { title: "面试题库", href: "/knowledge/questions", description: "按学校/学科分类的面试真题" },
      { title: "文书模板", href: "/knowledge/templates", description: "个人陈述、推荐信等模板" },
      { title: "经验精选", href: "/knowledge/experiences", description: "审核通过的高质量经验帖" },
      { title: "信息差速递", href: "/knowledge/tips", description: "保研过程中的信息差知识" },
      { title: "个人知识库", href: "/user/knowledge", description: "我的收藏、笔记与标签管理" },
    ],
  },
  {
    title: "进度中心",
    href: "/progress",
  },
  {
    title: "社群",
    href: "/community",
  },
  {
    title: "关于我们",
    href: "/about",
  },
] as const;
