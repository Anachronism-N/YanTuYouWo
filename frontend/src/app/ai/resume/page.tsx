"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  User, GraduationCap, FlaskConical, BookOpen, Trophy, Briefcase,
  Wrench, Eye, ChevronLeft, ChevronRight, Sparkles, Download,
  FileText, Check, Lightbulb, AlertTriangle, Info, X, Plus, Trash2,
  Settings2, Camera, GripVertical, EyeOff, Languages, Upload,
  Palette, Type, AlignLeft, AlignCenter, AlignRight, Minus, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  ResumeData, ResumeStep, Education, Research, Publication,
  Award, Experience, Skill, Language, AISuggestion, ResumeTemplate,
  LayoutSettings, ModuleConfig,
} from "@/types/resume";
import { DEFAULT_LAYOUT, DEFAULT_MODULES } from "@/types/resume";

/* ================================================================
   步骤配置
   ================================================================ */
const STEPS: { key: ResumeStep; label: string; icon: React.ElementType }[] = [
  { key: "basic", label: "基本信息", icon: User },
  { key: "education", label: "教育经历", icon: GraduationCap },
  { key: "research", label: "科研经历", icon: FlaskConical },
  { key: "publications", label: "论文成果", icon: BookOpen },
  { key: "awards", label: "获奖经历", icon: Trophy },
  { key: "experiences", label: "实习项目", icon: Briefcase },
  { key: "skills", label: "技能语言", icon: Wrench },
  { key: "settings", label: "排版设置", icon: Settings2 },
  { key: "preview", label: "预览导出", icon: Eye },
];

/* ================================================================
   初始数据
   ================================================================ */
const emptyResume: ResumeData = {
  basic: {
    name: "", gender: "", ethnicity: "", birth_date: "",
    phone: "", email: "", wechat: "",
    political_status: "", hometown: "", current_address: "",
    website: "", github: "",
    target_school: "", target_major: "", photo_url: "",
  },
  education: [], research: [], publications: [],
  awards: [], experiences: [], skills: [], languages: [],
  self_evaluation: "",
  layout: { ...DEFAULT_LAYOUT },
  modules: DEFAULT_MODULES.map((m) => ({ ...m })),
};

const sampleResume: ResumeData = {
  basic: {
    name: "陈思远", gender: "男", ethnicity: "汉族", birth_date: "2003-06",
    phone: "138-0013-8000", email: "chensiyuan@bupt.edu.cn", wechat: "siyuan_chen03",
    political_status: "中共预备党员", hometown: "广东省深圳市", current_address: "北京市海淀区西土城路 10 号",
    website: "https://siyuanchen.me", github: "https://github.com/siyuan-chen",
    target_school: "清华大学深圳国际研究生院", target_major: "电子信息（人工智能方向）", photo_url: "",
  },
  education: [
    {
      id: "edu1", school: "北京邮电大学", department: "计算机学院（国家示范性软件学院）",
      major: "计算机科学与技术", degree: "本科" as const, duration: "4",
      start_date: "2021-09", end_date: "2025-06",
      gpa: "3.88", gpa_max: "4.0", rank: "6", total_students: "210",
      courses: "机器学习(97)、深度学习(95)、计算机视觉(93)、数据结构与算法(96)、概率论与数理统计(92)、线性代数(94)、操作系统(91)、计算机网络(90)",
      thesis_title: "基于多模态特征融合的细粒度图像识别方法研究", minor: "",
    },
  ],
  research: [
    {
      id: "res1", title: "面向低资源场景的跨模态检索与生成", project_type: "国家级" as const,
      role: "核心成员（排名 2/5）", advisor: "李明教授",
      lab: "北京邮电大学智能信息处理实验室", start_date: "2023-06", end_date: "2024-12",
      description: "参与国家自然科学基金面上项目，研究低资源条件下的跨模态检索与生成方法。提出基于对比学习的跨模态对齐框架，在图文检索任务上取得显著提升。",
      contribution: "1) 设计并实现了基于动态温度调节的对比学习损失函数，Recall@1 提升 8.3%；2) 构建了包含 5 万对图文数据的低资源基准数据集；3) 撰写并投稿学术论文 1 篇。",
      outcomes: "发表 SCI 二区论文 1 篇；提交发明专利 1 项（实审中）",
      technologies: "PyTorch, Transformers, CLIP, BLIP-2, LoRA, Distributed Training",
    },
    {
      id: "res2", title: "基于图神经网络的社交网络异常检测", project_type: "校级" as const,
      role: "项目负责人", advisor: "王强副教授",
      lab: "北京邮电大学网络智能研究中心", start_date: "2022-09", end_date: "2023-05",
      description: "北京邮电大学大学生创新创业训练计划（URT）国家级立项。针对社交网络中虚假账号和恶意行为检测问题，提出结合时序特征和图结构特征的检测框架。",
      contribution: "1) 独立设计了融合 GAT 与 LSTM 的异常检测模型架构；2) 在 Twitter Bot 数据集上 F1-score 达到 94.2%，超过当时 SOTA 2.1%；3) 项目获评校级优秀结题。",
      outcomes: "大学生创新创业训练计划优秀结题；投稿 CCF-B 会议论文 1 篇",
      technologies: "PyTorch Geometric, DGL, NetworkX, Scikit-learn, Neo4j",
    },
  ],
  publications: [
    {
      id: "pub1", title: "Dynamic Temperature Contrastive Learning for Low-Resource Cross-Modal Retrieval",
      type: "论文" as const, venue: "Pattern Recognition",
      author_order: "第二作者", all_authors: "Ming Li, Siyuan Chen*, Qiang Wang, et al.",
      date: "2024-08", identifier: "DOI: 10.1016/j.patcog.2024.xxxxx",
      status: "已发表" as const, sci_zone: "二区" as const, impact_factor: "8.0",
      ccf_rank: "B" as const, is_corresponding: false,
      abstract_text: "We propose a dynamic temperature contrastive learning framework for cross-modal retrieval under low-resource scenarios, achieving 8.3% improvement on Recall@1.",
    },
    {
      id: "pub2", title: "Temporal-Structural Fusion Graph Network for Social Bot Detection",
      type: "论文" as const, venue: "CIKM 2024",
      author_order: "第一作者", all_authors: "Siyuan Chen, Qiang Wang, et al.",
      date: "2024-03", identifier: "",
      status: "在审" as const, sci_zone: "" as const, impact_factor: "",
      ccf_rank: "B" as const, is_corresponding: false,
      abstract_text: "A novel framework combining temporal user behavior features with graph structural features for social network bot detection.",
    },
  ],
  awards: [
    { id: "aw1", name: "全国大学生数学建模竞赛", level: "国家级" as const, rank: "一等奖" as const, issuer: "中国工业与应用数学学会", date: "2023-11", category: "学科竞赛" as const, note: "队长，负责建模与编程" },
    { id: "aw2", name: "ACM-ICPC 亚洲区域赛（南京站）", level: "国际级" as const, rank: "银奖" as const, issuer: "ACM/ICPC Foundation", date: "2023-10", category: "学科竞赛" as const, note: "三人团队赛，排名 38/320" },
    { id: "aw3", name: "国家奖学金", level: "国家级" as const, rank: "" as const, issuer: "教育部", date: "2023-10", category: "奖学金" as const, note: "2022-2023 学年" },
    { id: "aw4", name: "北京邮电大学优秀学生干部", level: "校级" as const, rank: "" as const, issuer: "北京邮电大学", date: "2023-06", category: "荣誉称号" as const, note: "" },
    { id: "aw5", name: "\"互联网+\"大学生创新创业大赛", level: "省级" as const, rank: "金奖" as const, issuer: "北京市教育委员会", date: "2024-06", category: "科技创新" as const, note: "项目负责人" },
  ],
  experiences: [
    {
      id: "exp1", organization: "腾讯", industry: "互联网/人工智能",
      position: "AI Lab 研究实习生", type: "实习" as const,
      start_date: "2024-06", end_date: "2024-09",
      description: "参与多模态大模型的研发工作，负责视觉-语言模型的数据预处理与模型微调模块。",
      achievements: "1) 优化了训练数据清洗 pipeline，数据质量评分提升 12%；2) 实现基于 QLoRA 的高效微调方案，训练显存占用降低 60%；3) 协助完成内部技术分享 1 次。",
      tools: "PyTorch, DeepSpeed, Transformers, Weights & Biases, Docker",
    },
  ],
  skills: [
    { id: "sk1", category: "编程语言", content: "Python", proficiency: 5 },
    { id: "sk2", category: "编程语言", content: "C/C++", proficiency: 4 },
    { id: "sk3", category: "开发框架", content: "PyTorch / PyTorch Lightning", proficiency: 5 },
    { id: "sk4", category: "开发框架", content: "Hugging Face Transformers", proficiency: 4 },
    { id: "sk5", category: "工具软件", content: "Git / Linux / Docker / LaTeX", proficiency: 4 },
    { id: "sk6", category: "专业技能", content: "机器学习 / 深度学习 / 计算机视觉 / NLP", proficiency: 4 },
    { id: "sk7", category: "数据库", content: "MySQL / Redis / Neo4j", proficiency: 3 },
  ],
  languages: [
    { id: "lg1", name: "英语", test: "CET-6" as const, score: "586", proficiency: "熟练" as const },
    { id: "lg2", name: "英语", test: "雅思" as const, score: "7.0", proficiency: "熟练" as const },
  ],
  self_evaluation: "本科期间系统学习计算机科学核心课程，GPA 3.88/4.0（排名 6/210）。研究方向聚焦多模态学习与图神经网络，以第一/二作者发表/投稿 SCI/CCF 论文 2 篇。具有扎实的编程能力和丰富的科研实践经验，曾获国家奖学金、数学建模国一、ACM-ICPC 银牌等荣誉。在腾讯 AI Lab 实习期间参与多模态大模型研发，积累了工业级项目经验。希望在清华大学深圳国际研究生院继续深耕人工智能领域的研究。",
  layout: { ...DEFAULT_LAYOUT },
  modules: DEFAULT_MODULES.map((m) => ({ ...m })),
};

const genId = () => Math.random().toString(36).slice(2, 10);

/* ================================================================
   多简历管理
   ================================================================ */
interface ResumeEntry {
  id: string;
  name: string;
  template: ResumeTemplate;
  data: ResumeData;
  updatedAt: string;
}

const createNewResume = (name: string, useSample = false): ResumeEntry => ({
  id: genId(),
  name,
  template: "academic",
  data: useSample
    ? { ...sampleResume, layout: { ...DEFAULT_LAYOUT }, modules: DEFAULT_MODULES.map((m) => ({ ...m })) }
    : { ...emptyResume, layout: { ...DEFAULT_LAYOUT }, modules: DEFAULT_MODULES.map((m) => ({ ...m })) },
  updatedAt: new Date().toLocaleDateString("zh-CN"),
});

/* ================================================================
   Mock AI 建议
   ================================================================ */
const mockSuggestions: AISuggestion[] = [
  { id: "s1", section: "basic", type: "tip", title: "完善目标信息", content: "建议填写目标院校和专业，有助于在简历中突出与目标方向的匹配度。", accepted: false },
  { id: "s2", section: "research", type: "improvement", title: "量化科研成果", content: "建议在科研经历描述中加入具体数据指标，如「提升了 15% 的准确率」。", original: "参与了模型优化工作", suggested: "主导模型优化工作，通过改进损失函数和数据增强策略，将模型准确率从 82% 提升至 94%", accepted: false },
  { id: "s3", section: "education", type: "tip", title: "突出核心课程", content: "建议列出与目标方向高度相关的 3-5 门核心课程及成绩。", accepted: false },
  { id: "s4", section: "skills", type: "warning", title: "技能描述过于笼统", content: "「熟悉 Python」缺乏说服力，建议改为具体的应用场景描述。", original: "熟悉 Python", suggested: "熟练使用 Python 进行数据分析与机器学习建模，掌握 PyTorch/TensorFlow 框架", accepted: false },
  { id: "s5", section: "awards", type: "tip", title: "奖项排序建议", content: "建议将奖项按级别从高到低排列（国家级 > 省级 > 校级），突出最有含金量的奖项。", accepted: false },
];

/* ================================================================
   模板配置
   ================================================================ */
const TEMPLATES: { id: ResumeTemplate; name: string; desc: string; gradient: string; features: string[] }[] = [
  { id: "academic", name: "学术经典", desc: "严谨规范，适合学术型保研", gradient: "from-blue-600 to-cyan-500", features: ["双线分隔标题", "时间右对齐", "适合理工科"] },
  { id: "modern", name: "现代双栏", desc: "左侧色带，双栏设计感强", gradient: "from-violet-600 to-purple-500", features: ["左侧信息栏", "技能进度条", "适合创意方向"] },
  { id: "professional", name: "专业商务", desc: "深色标题栏，紧凑信息密度", gradient: "from-slate-700 to-zinc-600", features: ["深色头部", "高信息密度", "适合金融/管理"] },
  { id: "elegant", name: "优雅学院", desc: "衬线标题+精致排版", gradient: "from-amber-600 to-orange-500", features: ["衬线标题", "圆点装饰", "适合文科/社科"] },
  { id: "minimal", name: "极简线条", desc: "最大化留白，一页纸精炼", gradient: "from-emerald-600 to-teal-500", features: ["超简洁", "大量留白", "适合一页纸"] },
  { id: "latex", name: "LaTeX 学术", desc: "仿 LaTeX 排版，衬线字体", gradient: "from-gray-700 to-gray-900", features: ["Computer Modern 风", "严谨排版", "适合学术投稿"] },
];

/* ================================================================
   候选选项
   ================================================================ */
const POLITICAL_OPTIONS = ["中共党员", "中共预备党员", "共青团员", "群众", "民主党派"];
const ETHNICITY_OPTIONS = ["汉族", "满族", "蒙古族", "回族", "藏族", "维吾尔族", "壮族", "苗族", "彝族", "其他"];
const DEGREE_OPTIONS = ["本科", "硕士", "博士", "专科"] as const;
const PROJECT_TYPE_OPTIONS = ["国家级", "省部级", "校级", "企业合作", "导师课题", "自主研究"] as const;
const PUB_STATUS_OPTIONS = ["已发表", "已录用", "在审", "预印本"] as const;
const SCI_ZONE_OPTIONS = ["一区", "二区", "三区", "四区"] as const;
const CCF_RANK_OPTIONS = ["A", "B", "C"] as const;
const AWARD_LEVEL_OPTIONS = ["国际级", "国家级", "省级", "校级", "院级", "其他"] as const;
const AWARD_RANK_OPTIONS = ["特等奖", "一等奖", "二等奖", "三等奖", "优秀奖", "金奖", "银奖", "铜奖"] as const;
const AWARD_CATEGORY_OPTIONS = ["学科竞赛", "科技创新", "奖学金", "荣誉称号", "文体竞赛", "社会实践", "其他"] as const;
const EXP_TYPE_OPTIONS = ["实习", "兼职", "项目", "志愿服务", "学生工作"] as const;
const LANG_TEST_OPTIONS = ["CET-4", "CET-6", "雅思", "托福", "GRE", "GMAT", "日语N1", "日语N2", "其他"] as const;
const LANG_PROF_OPTIONS = ["精通", "熟练", "良好", "一般"] as const;
const SKILL_CATEGORY_OPTIONS = ["编程语言", "开发框架", "数据库", "工具软件", "操作系统", "专业技能", "其他"];
const FONT_OPTIONS = [
  { value: "default", label: "系统默认" },
  { value: "songti", label: "宋体" },
  { value: "kaiti", label: "楷体" },
  { value: "heiti", label: "黑体" },
  { value: "fangsong", label: "仿宋" },
];
const DIVIDER_OPTIONS = [
  { value: "line", label: "单线" },
  { value: "double-line", label: "双线" },
  { value: "dotted", label: "虚线" },
  { value: "none", label: "无" },
];
const THEME_COLORS = ["#2563eb", "#0891b2", "#059669", "#7c3aed", "#dc2626", "#d97706", "#374151", "#0f172a"];

/* ================================================================
   主页面
   ================================================================ */
export default function ResumePage() {
  /* ---- 多简历管理 ---- */
  const [resumeList, setResumeList] = useState<ResumeEntry[]>([
    { ...createNewResume("我的第一份简历", true), updatedAt: "2026-03-31" },
  ]);
  const [activeResumeId, setActiveResumeId] = useState<string | null>(resumeList[0]?.id || null);
  const [showManager, setShowManager] = useState(false);
  const [newResumeName, setNewResumeName] = useState("");

  /* ---- 编辑状态 ---- */
  const [step, setStep] = useState(0);
  const activeEntry = resumeList.find((r) => r.id === activeResumeId);
  const [resume, setResume] = useState<ResumeData>(activeEntry?.data || emptyResume);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>(mockSuggestions);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplate>(activeEntry?.template || "academic");
  const [isGenerating, setIsGenerating] = useState(false);

  const stepKey = STEPS[step].key;

  /* ---- 简历管理操作 ---- */
  const handleCreateResume = useCallback(() => {
    const name = newResumeName.trim() || `简历 ${resumeList.length + 1}`;
    const entry = createNewResume(name);
    setResumeList((p) => [...p, entry]);
    setActiveResumeId(entry.id);
    setResume(entry.data);
    setSelectedTemplate(entry.template);
    setStep(0);
    setNewResumeName("");
  }, [newResumeName, resumeList.length]);

  const handleSwitchResume = useCallback((id: string) => {
    // 保存当前简历
    if (activeResumeId) {
      setResumeList((p) => p.map((r) => r.id === activeResumeId ? { ...r, data: resume, template: selectedTemplate, updatedAt: new Date().toLocaleDateString("zh-CN") } : r));
    }
    const target = resumeList.find((r) => r.id === id);
    if (target) {
      setActiveResumeId(id);
      setResume(target.data);
      setSelectedTemplate(target.template);
      setStep(0);
      setShowManager(false);
    }
  }, [activeResumeId, resume, selectedTemplate, resumeList]);

  const handleDeleteResume = useCallback((id: string) => {
    if (resumeList.length <= 1) return;
    setResumeList((p) => p.filter((r) => r.id !== id));
    if (activeResumeId === id) {
      const remaining = resumeList.filter((r) => r.id !== id);
      if (remaining.length > 0) handleSwitchResume(remaining[0].id);
    }
  }, [resumeList, activeResumeId, handleSwitchResume]);

  const handleDuplicateResume = useCallback((id: string) => {
    const source = resumeList.find((r) => r.id === id);
    if (!source) return;
    const entry: ResumeEntry = {
      id: genId(),
      name: source.name + " (副本)",
      template: source.template,
      data: JSON.parse(JSON.stringify(source.data)),
      updatedAt: new Date().toLocaleDateString("zh-CN"),
    };
    setResumeList((p) => [...p, entry]);
  }, [resumeList]);

  /* ---- 更新函数 ---- */
  const updateBasic = useCallback((f: string, v: string) => {
    setResume((p) => ({ ...p, basic: { ...p.basic, [f]: v } }));
  }, []);

  const addItem = useCallback(<T extends { id: string }>(key: keyof ResumeData, item: T) => {
    setResume((p) => ({ ...p, [key]: [...(p[key] as unknown as T[]), item] }));
  }, []);

  const removeItem = useCallback((key: keyof ResumeData, id: string) => {
    setResume((p) => ({ ...p, [key]: (p[key] as unknown as { id: string }[]).filter((i) => i.id !== id) }));
  }, []);

  const updateItem = useCallback(<T extends { id: string }>(key: keyof ResumeData, id: string, u: Partial<T>) => {
    setResume((p) => ({ ...p, [key]: (p[key] as unknown as T[]).map((i) => (i.id === id ? { ...i, ...u } : i)) }));
  }, []);

  const updateLayout = useCallback((u: Partial<LayoutSettings>) => {
    setResume((p) => ({ ...p, layout: { ...p.layout, ...u } }));
  }, []);

  const setModules = useCallback((mods: ModuleConfig[]) => {
    setResume((p) => ({ ...p, modules: mods }));
  }, []);

  const toggleModule = useCallback((key: string) => {
    setResume((p) => ({
      ...p,
      modules: p.modules.map((m) => (m.key === key ? { ...m, visible: !m.visible } : m)),
    }));
  }, []);

  /* ---- AI 优化 ---- */
  const handleAIOptimize = useCallback(() => {
    setIsGenerating(true);
    setTimeout(() => { setIsGenerating(false); setShowSuggestions(true); }, 1500);
  }, []);

  const acceptSuggestion = useCallback((id: string) => {
    setSuggestions((p) => p.map((s) => (s.id === id ? { ...s, accepted: true } : s)));
  }, []);

  const handleExportPDF = useCallback(() => {
    alert("PDF 导出功能将在后端 API 就绪后启用。当前为演示模式。");
  }, []);

  const getStepDone = useCallback((s: ResumeStep): boolean => {
    switch (s) {
      case "basic": return !!(resume.basic.name && resume.basic.email);
      case "education": return resume.education.length > 0;
      case "research": return resume.research.length > 0;
      case "publications": return resume.publications.length > 0;
      case "awards": return resume.awards.length > 0;
      case "experiences": return resume.experiences.length > 0;
      case "skills": return resume.skills.length > 0 || resume.languages.length > 0;
      case "settings": return true;
      default: return false;
    }
  }, [resume]);

  /* ---- 简历管理界面 ---- */
  if (showManager || !activeResumeId) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">我的简历</h2>
            <p className="text-muted-foreground mt-1">管理你的所有简历，点击编辑或创建新简历</p>
          </div>
          {activeResumeId && (
            <Button variant="outline" onClick={() => setShowManager(false)} className="gap-2">
              <ChevronLeft className="h-4 w-4" /> 返回编辑
            </Button>
          )}
        </div>

        {/* 创建新简历 */}
        <Card className="mb-6 border-dashed border-2 hover:border-primary/40 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <Input value={newResumeName} onChange={(e) => setNewResumeName(e.target.value)} placeholder="输入简历名称（可选）" className="h-11 mb-2" />
              </div>
              <Button onClick={handleCreateResume} className="gap-2 h-11 px-6">
                <Plus className="h-4 w-4" /> 创建简历
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 简历列表 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resumeList.map((entry) => {
            const tpl = TEMPLATES.find((t) => t.id === entry.template);
            const hasContent = entry.data.basic.name || entry.data.education.length > 0;
            const sectionCount = [entry.data.education.length, entry.data.research.length, entry.data.publications.length, entry.data.awards.length, entry.data.experiences.length, entry.data.skills.length].filter((n) => n > 0).length;
            return (
              <Card key={entry.id} className={cn("group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1", activeResumeId === entry.id && "ring-2 ring-primary")}>
                <CardContent className="p-0">
                  {/* 模板色带预览 */}
                  <div className={cn("h-3 rounded-t-xl bg-gradient-to-r", tpl?.gradient || "from-blue-600 to-cyan-500")} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-base">{entry.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">更新于 {entry.updatedAt}</p>
                      </div>
                      {activeResumeId === entry.id && <Badge className="text-xs">当前编辑</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1 mb-4">
                      {hasContent ? (
                        <>
                          {entry.data.basic.name && <p>👤 {entry.data.basic.name}</p>}
                          <p>📝 已填写 {sectionCount} 个模块</p>
                          <p>🎨 {tpl?.name || "学术经典"} 模板</p>
                        </>
                      ) : (
                        <p className="text-muted-foreground/50 italic">尚未填写内容</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => handleSwitchResume(entry.id)} className="flex-1 gap-1.5">
                        <FileText className="h-3.5 w-3.5" /> 编辑
                      </Button>
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleDuplicateResume(entry.id); }} title="复制">
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      {resumeList.length > 1 && (
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleDeleteResume(entry.id); }} className="text-red-500 hover:text-red-600 hover:bg-red-50" title="删除">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* 左侧 */}
      <div className="flex-1 min-w-0">
        {/* 简历名称 + 管理入口 */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => { setResumeList((p) => p.map((r) => r.id === activeResumeId ? { ...r, data: resume, template: selectedTemplate, updatedAt: new Date().toLocaleDateString("zh-CN") } : r)); setShowManager(true); }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
              <ChevronLeft className="h-4 w-4" /> 我的简历
            </button>
            <span className="text-muted-foreground/30">|</span>
            <span className="text-sm font-semibold">{activeEntry?.name || "未命名简历"}</span>
          </div>
        </div>

        {/* 步骤条 */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done = getStepDone(s.key);
            return (
              <button key={s.key} onClick={() => setStep(i)}
                className={cn("flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-all",
                  active ? "bg-primary text-primary-foreground shadow-sm" :
                  done ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" :
                  "text-muted-foreground hover:bg-muted")}>
                {done && !active ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mb-4 h-1 rounded-full bg-muted/50 overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        {/* 表单 */}
        <AnimatePresence mode="wait">
          <motion.div key={stepKey} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            <Card className="shadow-sm">
              <CardContent className="p-6 sm:p-8">
                {stepKey === "basic" && <BasicInfoForm data={resume.basic} onChange={updateBasic} />}
                {stepKey === "education" && <EducationSection items={resume.education} onAdd={() => addItem("education", { id: genId(), school: "", department: "", major: "", degree: "本科", duration: "4", start_date: "", end_date: "", gpa: "", gpa_max: "4.0", rank: "", total_students: "", courses: "", thesis_title: "", minor: "" })} onRemove={(id) => removeItem("education", id)} onUpdate={(id, u) => updateItem("education", id, u)} />}
                {stepKey === "research" && <ResearchSection items={resume.research} onAdd={() => addItem("research", { id: genId(), title: "", project_type: "", role: "", advisor: "", lab: "", start_date: "", end_date: "", description: "", contribution: "", outcomes: "", technologies: "" })} onRemove={(id) => removeItem("research", id)} onUpdate={(id, u) => updateItem("research", id, u)} />}
                {stepKey === "publications" && <PublicationSection items={resume.publications} onAdd={() => addItem("publications", { id: genId(), title: "", type: "论文", venue: "", author_order: "", all_authors: "", date: "", identifier: "", status: "", sci_zone: "", impact_factor: "", ccf_rank: "", is_corresponding: false, abstract_text: "" })} onRemove={(id) => removeItem("publications", id)} onUpdate={(id, u) => updateItem("publications", id, u)} />}
                {stepKey === "awards" && <AwardSection items={resume.awards} onAdd={() => addItem("awards", { id: genId(), name: "", level: "校级", rank: "", issuer: "", date: "", category: "学科竞赛", note: "" })} onRemove={(id) => removeItem("awards", id)} onUpdate={(id, u) => updateItem("awards", id, u)} />}
                {stepKey === "experiences" && <ExperienceSection items={resume.experiences} onAdd={() => addItem("experiences", { id: genId(), organization: "", industry: "", position: "", type: "", start_date: "", end_date: "", description: "", achievements: "", tools: "" })} onRemove={(id) => removeItem("experiences", id)} onUpdate={(id, u) => updateItem("experiences", id, u)} />}
                {stepKey === "skills" && <SkillsLanguagesSection skills={resume.skills} languages={resume.languages} selfEval={resume.self_evaluation} onAddSkill={() => addItem("skills", { id: genId(), category: "", content: "", proficiency: 3 })} onRemoveSkill={(id) => removeItem("skills", id)} onUpdateSkill={(id, u) => updateItem("skills", id, u)} onAddLang={() => addItem("languages", { id: genId(), name: "", test: "", score: "", proficiency: "" })} onRemoveLang={(id) => removeItem("languages", id)} onUpdateLang={(id, u) => updateItem("languages", id, u)} onSelfEvalChange={(v) => setResume((p) => ({ ...p, self_evaluation: v }))} />}
                {stepKey === "settings" && <SettingsSection layout={resume.layout} modules={resume.modules} onLayoutChange={updateLayout} onModulesChange={setModules} onToggleModule={toggleModule} />}
                {stepKey === "preview" && <PreviewSection resume={resume} template={selectedTemplate} onTemplateChange={setSelectedTemplate} onExport={handleExportPDF} />}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* 底部导航 */}
        <div className="mt-5 flex items-center justify-between">
          <Button variant="outline" size="lg" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="gap-2">
            <ChevronLeft className="h-4 w-4" /> 上一步
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="lg" onClick={handleAIOptimize} disabled={isGenerating}
              className="gap-2 border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-500/30 dark:text-violet-400">
              <Sparkles className={cn("h-4 w-4", isGenerating && "animate-spin")} />
              {isGenerating ? "分析中..." : "AI 优化"}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button size="lg" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} className="gap-2">
                下一步 <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="lg" onClick={handleExportPDF} className="gap-2">
                <Download className="h-4 w-4" /> 导出 PDF
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 右侧 AI 建议 */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 340 }} exit={{ opacity: 0, width: 0 }} className="shrink-0 hidden lg:block">
            <Card className="sticky top-24 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-600" /><h3 className="font-semibold">AI 优化建议</h3></div>
                  <button onClick={() => setShowSuggestions(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
                <div className="space-y-3">
                  {suggestions.map((s) => <SuggestionCard key={s.id} suggestion={s} onAccept={() => acceptSuggestion(s.id)} />)}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================
   通用组件
   ================================================================ */
function Field({ label, value, onChange, placeholder, required, multiline, type, className }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; multiline?: boolean; type?: "text" | "date" | "month" | "email" | "tel" | "url" | "number"; className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-sm font-medium mb-1.5 block">{label} {required && <span className="text-red-500">*</span>}</label>
      {multiline ? (
        <textarea className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm min-h-[90px] resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <Input type={type || "text"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-10" />
      )}
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder, className }: {
  label: string; value: string; onChange: (v: string) => void;
  options: readonly string[] | { value: string; label: string }[];
  placeholder?: string; className?: string;
}) {
  const opts = typeof options[0] === "string"
    ? (options as readonly string[]).map((o) => ({ value: o, label: o }))
    : (options as { value: string; label: string }[]);
  return (
    <div className={className}>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      <select className="w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder || "请选择"}</option>
        {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, count, onAdd }: { icon: React.ElementType; title: string; count?: number; onAdd?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-lg font-bold flex items-center gap-2.5">
        <Icon className="h-5 w-5 text-primary" /> {title}
        {count !== undefined && <Badge variant="secondary" className="text-xs ml-1">{count}</Badge>}
      </h2>
      {onAdd && <Button variant="outline" size="sm" onClick={onAdd} className="gap-1.5 h-9"><Plus className="h-4 w-4" /> 添加</Button>}
    </div>
  );
}

function ItemCard({ index, title, onRemove, defaultCollapsed, children }: { index: number; title?: string; onRemove: () => void; defaultCollapsed?: boolean; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed || false);
  return (
    <div className="relative rounded-xl border group hover:border-primary/20 transition-colors">
      <div className="flex items-center justify-between px-5 py-3 cursor-pointer select-none" onClick={() => setCollapsed(!collapsed)}>
        <div className="flex items-center gap-2.5">
          <Badge variant="secondary" className="shrink-0">#{index + 1}</Badge>
          {title && <span className="text-sm font-medium truncate max-w-[300px]">{title}</span>}
          {!title && <span className="text-sm text-muted-foreground italic">未填写</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
          {collapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-[-90deg]" />}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-5 pb-5 pt-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyHint({ text, onAdd }: { text: string; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
      <FileText className="h-12 w-12 mb-3 opacity-20" />
      <p className="text-sm mb-4">{text}</p>
      <Button variant="outline" onClick={onAdd} className="gap-1.5"><Plus className="h-4 w-4" /> 添加一条</Button>
    </div>
  );
}

/* ================================================================
   基本信息（含照片上传）
   ================================================================ */
function BasicInfoForm({ data, onChange }: { data: ResumeData["basic"]; onChange: (f: string, v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => onChange("photo_url", reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>
      <SectionHeader icon={User} title="基本信息" />

      {/* 照片上传 */}
      <div className="flex items-start gap-6 mb-6">
        <div className="shrink-0">
          <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
            <div className={cn("w-28 h-36 rounded-xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all",
              data.photo_url ? "border-primary/30" : "border-muted-foreground/20 hover:border-primary/40")}>
              {data.photo_url ? (
                <img src={data.photo_url} alt="证件照" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Camera className="h-6 w-6 text-muted-foreground/40 mb-1.5" />
                  <span className="text-xs text-muted-foreground/60">上传照片</span>
                </>
              )}
            </div>
            {data.photo_url && (
              <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload className="h-5 w-5 text-white" />
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          <p className="text-[11px] text-muted-foreground mt-1.5 text-center">证件照（可选）</p>
          {data.photo_url && (
            <button onClick={() => onChange("photo_url", "")} className="text-[11px] text-red-400 hover:text-red-500 mt-0.5 block mx-auto">移除照片</button>
          )}
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="姓名" required value={data.name} onChange={(v) => onChange("name", v)} placeholder="请输入姓名" />
          <SelectField label="性别" value={data.gender} onChange={(v) => onChange("gender", v)} options={["男", "女"]} />
          <SelectField label="民族" value={data.ethnicity} onChange={(v) => onChange("ethnicity", v)} options={ETHNICITY_OPTIONS} />
          <Field label="出生日期" value={data.birth_date} onChange={(v) => onChange("birth_date", v)} type="month" placeholder="" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="手机号" value={data.phone} onChange={(v) => onChange("phone", v)} placeholder="请输入手机号" type="tel" />
        <Field label="邮箱" required value={data.email} onChange={(v) => onChange("email", v)} placeholder="请输入邮箱" type="email" />
        <Field label="微信号" value={data.wechat} onChange={(v) => onChange("wechat", v)} placeholder="请输入微信号" />
        <SelectField label="政治面貌" value={data.political_status} onChange={(v) => onChange("political_status", v)} options={POLITICAL_OPTIONS} />
        <Field label="籍贯" value={data.hometown} onChange={(v) => onChange("hometown", v)} placeholder="如：浙江杭州" />
        <Field label="现居住地" value={data.current_address} onChange={(v) => onChange("current_address", v)} placeholder="如：北京市海淀区" />
        <Field label="个人主页" value={data.website} onChange={(v) => onChange("website", v)} placeholder="如：https://yoursite.com" type="url" />
        <Field label="GitHub" value={data.github} onChange={(v) => onChange("github", v)} placeholder="如：https://github.com/xxx" type="url" />
        <Field label="目标院校" value={data.target_school} onChange={(v) => onChange("target_school", v)} placeholder="如：北京大学" />
        <Field label="目标专业" value={data.target_major} onChange={(v) => onChange("target_major", v)} placeholder="如：计算机科学与技术" />
      </div>
    </div>
  );
}

/* ================================================================
   教育经历
   ================================================================ */
function EducationSection({ items, onAdd, onRemove, onUpdate }: { items: Education[]; onAdd: () => void; onRemove: (id: string) => void; onUpdate: (id: string, u: Partial<Education>) => void }) {
  return (
    <div>
      <SectionHeader icon={GraduationCap} title="教育经历" count={items.length} onAdd={onAdd} />
      {items.length === 0 ? <EmptyHint text="添加你的教育经历，如本科就读信息" onAdd={onAdd} /> : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <ItemCard key={item.id} index={i} title={item.school ? `${item.school}${item.major ? ` · ${item.major}` : ""}` : undefined} onRemove={() => onRemove(item.id)} defaultCollapsed={i < items.length - 1}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="学校" required value={item.school} onChange={(v) => onUpdate(item.id, { school: v })} placeholder="如：北京大学" />
                <Field label="学院" value={item.department} onChange={(v) => onUpdate(item.id, { department: v })} placeholder="如：信息科学技术学院" />
                <Field label="专业" value={item.major} onChange={(v) => onUpdate(item.id, { major: v })} placeholder="如：计算机科学与技术" />
                <SelectField label="学位" value={item.degree} onChange={(v) => onUpdate(item.id, { degree: v as Education["degree"] })} options={DEGREE_OPTIONS} />
                <Field label="学制" value={item.duration} onChange={(v) => onUpdate(item.id, { duration: v })} placeholder="如：4 年" />
                <Field label="辅修专业" value={item.minor} onChange={(v) => onUpdate(item.id, { minor: v })} placeholder="如：数学" />
                <Field label="入学时间" value={item.start_date} onChange={(v) => onUpdate(item.id, { start_date: v })} type="month" placeholder="" />
                <Field label="毕业时间" value={item.end_date} onChange={(v) => onUpdate(item.id, { end_date: v })} type="month" placeholder="" />
                <Field label="GPA" value={item.gpa} onChange={(v) => onUpdate(item.id, { gpa: v })} placeholder="如：3.85" />
                <Field label="GPA 满分" value={item.gpa_max} onChange={(v) => onUpdate(item.id, { gpa_max: v })} placeholder="如：4.0" />
                <Field label="排名" value={item.rank} onChange={(v) => onUpdate(item.id, { rank: v })} placeholder="如：3" />
                <Field label="总人数" value={item.total_students} onChange={(v) => onUpdate(item.id, { total_students: v })} placeholder="如：120" />
                <Field label="主修课程" value={item.courses} onChange={(v) => onUpdate(item.id, { courses: v })} placeholder="列出核心课程及成绩" multiline className="sm:col-span-2 lg:col-span-3" />
                <Field label="毕业论文/设计" value={item.thesis_title} onChange={(v) => onUpdate(item.id, { thesis_title: v })} placeholder="如：基于 Transformer 的文本分类研究" className="sm:col-span-2 lg:col-span-3" />
              </div>
            </ItemCard>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   科研经历
   ================================================================ */
function ResearchSection({ items, onAdd, onRemove, onUpdate }: { items: Research[]; onAdd: () => void; onRemove: (id: string) => void; onUpdate: (id: string, u: Partial<Research>) => void }) {
  return (
    <div>
      <SectionHeader icon={FlaskConical} title="科研经历" count={items.length} onAdd={onAdd} />
      {items.length === 0 ? <EmptyHint text="添加你参与的科研项目" onAdd={onAdd} /> : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <ItemCard key={item.id} index={i} title={item.title || undefined} onRemove={() => onRemove(item.id)} defaultCollapsed={i < items.length - 1}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="项目名称" required value={item.title} onChange={(v) => onUpdate(item.id, { title: v })} placeholder="如：基于深度学习的图像分割研究" className="sm:col-span-2 lg:col-span-3" />
                <SelectField label="项目类型" value={item.project_type} onChange={(v) => onUpdate(item.id, { project_type: v as Research["project_type"] })} options={PROJECT_TYPE_OPTIONS} />
                <Field label="角色" value={item.role} onChange={(v) => onUpdate(item.id, { role: v })} placeholder="如：核心成员 / 项目负责人" />
                <Field label="指导老师" value={item.advisor} onChange={(v) => onUpdate(item.id, { advisor: v })} placeholder="如：张教授" />
                <Field label="所属实验室" value={item.lab} onChange={(v) => onUpdate(item.id, { lab: v })} placeholder="如：智能计算实验室" />
                <Field label="开始时间" value={item.start_date} onChange={(v) => onUpdate(item.id, { start_date: v })} type="month" placeholder="" />
                <Field label="结束时间" value={item.end_date} onChange={(v) => onUpdate(item.id, { end_date: v })} type="month" placeholder="" />
                <Field label="使用技术/方法" value={item.technologies} onChange={(v) => onUpdate(item.id, { technologies: v })} placeholder="如：PyTorch, Transformer, GAN" className="sm:col-span-2 lg:col-span-3" />
                <Field label="项目描述" value={item.description} onChange={(v) => onUpdate(item.id, { description: v })} placeholder="简要描述项目背景、目标和方法（用 **文字** 加粗）" multiline className="sm:col-span-2 lg:col-span-3" />
                <Field label="个人贡献" value={item.contribution} onChange={(v) => onUpdate(item.id, { contribution: v })} placeholder="描述你的具体贡献和成果（用 **文字** 加粗）" multiline className="sm:col-span-2 lg:col-span-3" />
                <Field label="项目成果" value={item.outcomes} onChange={(v) => onUpdate(item.id, { outcomes: v })} placeholder="如：发表论文 1 篇、申请专利 1 项" className="sm:col-span-2 lg:col-span-3" />
              </div>
            </ItemCard>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   论文成果
   ================================================================ */
function PublicationSection({ items, onAdd, onRemove, onUpdate }: { items: Publication[]; onAdd: () => void; onRemove: (id: string) => void; onUpdate: (id: string, u: Partial<Publication>) => void }) {
  return (
    <div>
      <SectionHeader icon={BookOpen} title="论文 / 专利 / 软著" count={items.length} onAdd={onAdd} />
      {items.length === 0 ? <EmptyHint text="添加你的论文、专利或软著" onAdd={onAdd} /> : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <ItemCard key={item.id} index={i} title={item.title || undefined} onRemove={() => onRemove(item.id)} defaultCollapsed={i < items.length - 1}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="标题" required value={item.title} onChange={(v) => onUpdate(item.id, { title: v })} placeholder="论文/专利标题" className="sm:col-span-2 lg:col-span-3" />
                <SelectField label="类型" value={item.type} onChange={(v) => onUpdate(item.id, { type: v as Publication["type"] })} options={["论文", "专利", "软著", "专著"]} />
                <SelectField label="状态" value={item.status} onChange={(v) => onUpdate(item.id, { status: v as Publication["status"] })} options={PUB_STATUS_OPTIONS} />
                <SelectField label="作者排序" value={item.author_order} onChange={(v) => onUpdate(item.id, { author_order: v })} options={["第一作者", "第二作者", "第三作者", "通讯作者", "其他"]} />
                <Field label="所有作者" value={item.all_authors} onChange={(v) => onUpdate(item.id, { all_authors: v })} placeholder="如：张三, 李四, 王五" className="sm:col-span-2" />
                <Field label="发表期刊/会议" value={item.venue} onChange={(v) => onUpdate(item.id, { venue: v })} placeholder="如：IEEE CVPR 2025" className="sm:col-span-2" />
                <Field label="发表时间" value={item.date} onChange={(v) => onUpdate(item.id, { date: v })} type="month" placeholder="" />
                <SelectField label="SCI 分区" value={item.sci_zone} onChange={(v) => onUpdate(item.id, { sci_zone: v as Publication["sci_zone"] })} options={SCI_ZONE_OPTIONS} />
                <Field label="影响因子" value={item.impact_factor} onChange={(v) => onUpdate(item.id, { impact_factor: v })} placeholder="如：5.2" />
                <SelectField label="CCF 等级" value={item.ccf_rank} onChange={(v) => onUpdate(item.id, { ccf_rank: v as Publication["ccf_rank"] })} options={CCF_RANK_OPTIONS} />
                <Field label="DOI / 专利号" value={item.identifier} onChange={(v) => onUpdate(item.id, { identifier: v })} placeholder="如：10.1109/CVPR.2025.xxxxx" className="sm:col-span-2 lg:col-span-3" />
                <Field label="摘要" value={item.abstract_text} onChange={(v) => onUpdate(item.id, { abstract_text: v })} placeholder="论文摘要（可选）" multiline className="sm:col-span-2 lg:col-span-3" />
              </div>
            </ItemCard>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   获奖经历
   ================================================================ */
function AwardSection({ items, onAdd, onRemove, onUpdate }: { items: Award[]; onAdd: () => void; onRemove: (id: string) => void; onUpdate: (id: string, u: Partial<Award>) => void }) {
  return (
    <div>
      <SectionHeader icon={Trophy} title="获奖经历" count={items.length} onAdd={onAdd} />
      {items.length === 0 ? <EmptyHint text="添加你的竞赛获奖、奖学金等" onAdd={onAdd} /> : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <ItemCard key={item.id} index={i} title={item.name ? `${item.name}${item.rank ? ` · ${item.rank}` : ""}` : undefined} onRemove={() => onRemove(item.id)} defaultCollapsed={i < items.length - 1}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="奖项名称" required value={item.name} onChange={(v) => onUpdate(item.id, { name: v })} placeholder="如：全国大学生数学建模竞赛" className="sm:col-span-2" />
                <SelectField label="奖项类别" value={item.category} onChange={(v) => onUpdate(item.id, { category: v as Award["category"] })} options={AWARD_CATEGORY_OPTIONS} />
                <SelectField label="获奖等级" value={item.level} onChange={(v) => onUpdate(item.id, { level: v as Award["level"] })} options={AWARD_LEVEL_OPTIONS} />
                <SelectField label="获奖等次" value={item.rank} onChange={(v) => onUpdate(item.id, { rank: v as Award["rank"] })} options={AWARD_RANK_OPTIONS} />
                <Field label="颁发机构" value={item.issuer} onChange={(v) => onUpdate(item.id, { issuer: v })} placeholder="如：教育部 / 中国数学会" />
                <Field label="获奖时间" value={item.date} onChange={(v) => onUpdate(item.id, { date: v })} type="month" placeholder="" />
                <Field label="备注" value={item.note} onChange={(v) => onUpdate(item.id, { note: v })} placeholder="补充说明" className="sm:col-span-2" />
              </div>
            </ItemCard>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   实习/项目经历
   ================================================================ */
function ExperienceSection({ items, onAdd, onRemove, onUpdate }: { items: Experience[]; onAdd: () => void; onRemove: (id: string) => void; onUpdate: (id: string, u: Partial<Experience>) => void }) {
  return (
    <div>
      <SectionHeader icon={Briefcase} title="实习 / 项目经历" count={items.length} onAdd={onAdd} />
      {items.length === 0 ? <EmptyHint text="添加你的实习或项目经历" onAdd={onAdd} /> : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <ItemCard key={item.id} index={i} title={item.organization ? `${item.organization}${item.position ? ` · ${item.position}` : ""}` : undefined} onRemove={() => onRemove(item.id)} defaultCollapsed={i < items.length - 1}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="单位/项目" required value={item.organization} onChange={(v) => onUpdate(item.id, { organization: v })} placeholder="如：腾讯科技" />
                <Field label="行业" value={item.industry} onChange={(v) => onUpdate(item.id, { industry: v })} placeholder="如：互联网 / 金融" />
                <SelectField label="经历类型" value={item.type} onChange={(v) => onUpdate(item.id, { type: v as Experience["type"] })} options={EXP_TYPE_OPTIONS} />
                <Field label="职位/角色" value={item.position} onChange={(v) => onUpdate(item.id, { position: v })} placeholder="如：算法实习生" />
                <Field label="开始时间" value={item.start_date} onChange={(v) => onUpdate(item.id, { start_date: v })} type="month" placeholder="" />
                <Field label="结束时间" value={item.end_date} onChange={(v) => onUpdate(item.id, { end_date: v })} type="month" placeholder="" />
                <Field label="使用工具/技术" value={item.tools} onChange={(v) => onUpdate(item.id, { tools: v })} placeholder="如：Python, TensorFlow, Docker" className="sm:col-span-2 lg:col-span-3" />
                <Field label="工作描述" value={item.description} onChange={(v) => onUpdate(item.id, { description: v })} placeholder="描述你的工作内容（用 **文字** 加粗）" multiline className="sm:col-span-2 lg:col-span-3" />
                <Field label="主要成果" value={item.achievements} onChange={(v) => onUpdate(item.id, { achievements: v })} placeholder="描述你取得的成果和业绩（用 **文字** 加粗）" multiline className="sm:col-span-2 lg:col-span-3" />
              </div>
            </ItemCard>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   技能 + 语言 + 自我评价
   ================================================================ */
function SkillsLanguagesSection({ skills, languages, selfEval, onAddSkill, onRemoveSkill, onUpdateSkill, onAddLang, onRemoveLang, onUpdateLang, onSelfEvalChange }: {
  skills: Skill[]; languages: Language[]; selfEval: string;
  onAddSkill: () => void; onRemoveSkill: (id: string) => void; onUpdateSkill: (id: string, u: Partial<Skill>) => void;
  onAddLang: () => void; onRemoveLang: (id: string) => void; onUpdateLang: (id: string, u: Partial<Language>) => void;
  onSelfEvalChange: (v: string) => void;
}) {
  return (
    <div className="space-y-8">
      {/* 技能 */}
      <div>
        <SectionHeader icon={Wrench} title="技能特长" count={skills.length} onAdd={onAddSkill} />
        {skills.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm mb-3">添加你的技能，如编程语言、工具、专业技能等</p>
            <Button variant="outline" onClick={onAddSkill} className="gap-1.5"><Plus className="h-4 w-4" /> 添加技能</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {skills.map((s) => (
              <div key={s.id} className="flex items-center gap-3 group">
                <SelectField label="" value={s.category} onChange={(v) => onUpdateSkill(s.id, { category: v })} options={SKILL_CATEGORY_OPTIONS} className="w-[140px] shrink-0 [&>label]:hidden" />
                <div className="flex-1"><Input value={s.content} onChange={(e) => onUpdateSkill(s.id, { content: e.target.value })} placeholder="具体内容" className="h-10" /></div>
                <div className="flex items-center gap-1 shrink-0">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => onUpdateSkill(s.id, { proficiency: n })}
                      className={cn("w-5 h-5 rounded-full border-2 transition-all", n <= s.proficiency ? "bg-primary border-primary" : "border-muted-foreground/30")}>
                    </button>
                  ))}
                </div>
                <button onClick={() => onRemoveSkill(s.id)} className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 语言能力 */}
      <div>
        <SectionHeader icon={Languages} title="语言能力" count={languages.length} onAdd={onAddLang} />
        {languages.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm mb-3">添加你的语言能力和考试成绩</p>
            <Button variant="outline" onClick={onAddLang} className="gap-1.5"><Plus className="h-4 w-4" /> 添加语言</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {languages.map((l) => (
              <div key={l.id} className="flex items-center gap-3 group">
                <Input value={l.name} onChange={(e) => onUpdateLang(l.id, { name: e.target.value })} placeholder="语言" className="h-10 w-[100px] shrink-0" />
                <SelectField label="" value={l.test} onChange={(v) => onUpdateLang(l.id, { test: v as Language["test"] })} options={LANG_TEST_OPTIONS} className="w-[120px] shrink-0 [&>label]:hidden" />
                <Input value={l.score} onChange={(e) => onUpdateLang(l.id, { score: e.target.value })} placeholder="成绩" className="h-10 w-[80px] shrink-0" />
                <SelectField label="" value={l.proficiency} onChange={(v) => onUpdateLang(l.id, { proficiency: v as Language["proficiency"] })} options={LANG_PROF_OPTIONS} className="w-[100px] shrink-0 [&>label]:hidden" />
                <button onClick={() => onRemoveLang(l.id)} className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 自我评价 */}
      <div>
        <h3 className="text-base font-semibold mb-3">自我评价</h3>
        <textarea className="w-full rounded-lg border bg-background px-4 py-3 text-sm min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-primary/20" value={selfEval} onChange={(e) => onSelfEvalChange(e.target.value)} placeholder="简要描述你的个人特质、学术追求和职业规划（建议 100-200 字）" />
      </div>
    </div>
  );
}

/* ================================================================
   排版设置（模块排序 + 显隐 + 间距 + 字体 + 主题色）
   ================================================================ */
function SettingsSection({ layout, modules, onLayoutChange, onModulesChange, onToggleModule }: {
  layout: LayoutSettings; modules: ModuleConfig[];
  onLayoutChange: (u: Partial<LayoutSettings>) => void;
  onModulesChange: (m: ModuleConfig[]) => void;
  onToggleModule: (key: string) => void;
}) {
  const sorted = [...modules].sort((a, b) => a.order - b.order);

  const moveModule = (idx: number, dir: -1 | 1) => {
    const arr = [...sorted];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    onModulesChange(arr.map((m, i) => ({ ...m, order: i })));
  };

  return (
    <div className="space-y-8">
      <SectionHeader icon={Settings2} title="排版设置" />

      {/* 模块排序与显隐 */}
      <div>
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" /> 模块管理
        </h3>
        <p className="text-sm text-muted-foreground mb-4">拖动调整模块顺序，点击眼睛图标控制显示/隐藏</p>
        <div className="space-y-2">
          {sorted.map((mod, idx) => (
            <div key={mod.key} className="flex items-center gap-3 rounded-lg border px-4 py-3 bg-background hover:bg-muted/30 transition-colors">
              <div className="flex gap-1">
                <button onClick={() => moveModule(idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => moveModule(idx, 1)} disabled={idx === sorted.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
              </div>
              <span className="text-sm font-medium flex-1">{mod.label}</span>
              <button onClick={() => onToggleModule(mod.key)} className={cn("transition-colors", mod.visible ? "text-primary" : "text-muted-foreground/40")}>
                {mod.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 字体与字号 */}
      <div>
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2"><Type className="h-4 w-4 text-muted-foreground" /> 字体与字号</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SelectField label="字体" value={layout.fontFamily} onChange={(v) => onLayoutChange({ fontFamily: v as LayoutSettings["fontFamily"] })} options={FONT_OPTIONS} />
          <SliderField label="正文字号" value={layout.fontSize} min={10} max={16} step={0.5} unit="px" onChange={(v) => onLayoutChange({ fontSize: v })} />
          <SliderField label="姓名字号" value={layout.nameFontSize} min={18} max={30} step={1} unit="px" onChange={(v) => onLayoutChange({ nameFontSize: v })} />
          <SliderField label="标题字号" value={layout.sectionFontSize} min={12} max={20} step={0.5} unit="px" onChange={(v) => onLayoutChange({ sectionFontSize: v })} />
          <SliderField label="行间距" value={layout.lineHeight} min={1.2} max={2.2} step={0.1} unit="倍" onChange={(v) => onLayoutChange({ lineHeight: v })} />
        </div>
      </div>

      {/* 间距 */}
      <div>
        <h3 className="text-base font-semibold mb-3">间距设置</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SliderField label="上边距" value={layout.marginTop} min={16} max={60} step={2} unit="px" onChange={(v) => onLayoutChange({ marginTop: v })} />
          <SliderField label="下边距" value={layout.marginBottom} min={16} max={60} step={2} unit="px" onChange={(v) => onLayoutChange({ marginBottom: v })} />
          <SliderField label="左边距" value={layout.marginLeft} min={20} max={60} step={2} unit="px" onChange={(v) => onLayoutChange({ marginLeft: v })} />
          <SliderField label="右边距" value={layout.marginRight} min={20} max={60} step={2} unit="px" onChange={(v) => onLayoutChange({ marginRight: v })} />
          <SliderField label="模块间距" value={layout.sectionGap} min={8} max={32} step={2} unit="px" onChange={(v) => onLayoutChange({ sectionGap: v })} />
          <SliderField label="条目间距" value={layout.itemGap} min={4} max={16} step={2} unit="px" onChange={(v) => onLayoutChange({ itemGap: v })} />
        </div>
      </div>

      {/* 样式 */}
      <div>
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2"><Palette className="h-4 w-4 text-muted-foreground" /> 样式设置</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label="分隔符样式" value={layout.dividerStyle} onChange={(v) => onLayoutChange({ dividerStyle: v as LayoutSettings["dividerStyle"] })} options={DIVIDER_OPTIONS} />
          <div>
            <label className="text-sm font-medium mb-1.5 block">基本信息位置</label>
            <div className="flex gap-2">
              {([["left", AlignLeft, "居左"], ["center", AlignCenter, "居中"], ["right", AlignRight, "居右"]] as const).map(([val, Icon, label]) => (
                <button key={val} onClick={() => onLayoutChange({ basicInfoAlign: val })}
                  className={cn("flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-all border",
                    layout.basicInfoAlign === val ? "bg-primary text-primary-foreground border-primary" : "border-muted hover:bg-muted")}>
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">基本信息展示</label>
            <div className="flex gap-2">
              {([["text", "文字"], ["icon", "图标"], ["hidden", "隐藏"]] as const).map(([val, label]) => (
                <button key={val} onClick={() => onLayoutChange({ basicInfoStyle: val as LayoutSettings["basicInfoStyle"] })}
                  className={cn("rounded-lg px-3 py-2 text-sm transition-all border",
                    layout.basicInfoStyle === val ? "bg-primary text-primary-foreground border-primary" : "border-muted hover:bg-muted")}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">照片设置</label>
            <div className="flex items-center gap-3">
              <button onClick={() => onLayoutChange({ showPhoto: !layout.showPhoto })}
                className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", layout.showPhoto ? "bg-primary" : "bg-muted")}>
                <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform", layout.showPhoto ? "translate-x-6" : "translate-x-1")} />
              </button>
              <span className="text-sm">{layout.showPhoto ? "显示照片" : "不显示照片"}</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">主题色</label>
            <div className="flex gap-2">
              {THEME_COLORS.map((c) => (
                <button key={c} onClick={() => onLayoutChange({ themeColor: c })}
                  className={cn("w-8 h-8 rounded-full border-2 transition-all", layout.themeColor === c ? "border-foreground scale-110 shadow-md" : "border-transparent")}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 滑块字段 */
function SliderField({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-sm text-muted-foreground font-mono">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary" />
    </div>
  );
}

/* ================================================================
   预览与导出
   ================================================================ */
function PreviewSection({ resume, template, onTemplateChange, onExport }: {
  resume: ResumeData; template: ResumeTemplate; onTemplateChange: (t: ResumeTemplate) => void; onExport: () => void;
}) {
  return (
    <div>
      <SectionHeader icon={Eye} title="预览与导出" />

      {/* 模板选择 */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3">选择模板</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TEMPLATES.map((t) => (
            <button key={t.id} onClick={() => onTemplateChange(t.id)}
              className={cn("rounded-xl border-2 p-5 text-left transition-all",
                template === t.id ? "border-primary bg-primary/5 shadow-md" : "border-transparent bg-muted/30 hover:bg-muted/50")}>
              <div className={cn("h-2.5 w-16 rounded-full bg-gradient-to-r mb-3", t.gradient)} />
              <p className="font-semibold">{t.name}</p>
              <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {t.features.map((f) => <span key={f} className="text-xs bg-muted/50 rounded px-1.5 py-0.5 text-muted-foreground">{f}</span>)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 预览 */}
      <div className="rounded-xl border bg-white dark:bg-zinc-950 shadow-inner overflow-hidden" style={{ padding: `${resume.layout.marginTop}px ${resume.layout.marginRight}px ${resume.layout.marginBottom}px ${resume.layout.marginLeft}px` }}>
        <ResumePreview resume={resume} template={template} />
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <Button variant="outline" size="lg" className="gap-2"><FileText className="h-4 w-4" /> 保存草稿</Button>
        <Button size="lg" onClick={onExport} className="gap-2"><Download className="h-4 w-4" /> 导出 PDF</Button>
      </div>
    </div>
  );
}

/* ================================================================
   简历预览
   ================================================================ */
function ResumePreview({ resume, template }: { resume: ResumeData; template: ResumeTemplate }) {
  const { layout, modules } = resume;
  const hasContent = resume.basic.name || resume.education.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <FileText className="h-14 w-14 mb-4 opacity-15" />
        <p>请先填写简历内容，这里将实时显示预览</p>
      </div>
    );
  }

  const TC: Record<string, string> = { academic: "#1e40af", modern: "#7c3aed", professional: "#334155", elegant: "#b45309", minimal: "#059669", latex: "#1a1a1a" };
  const tc = TC[template] || "#1e40af";
  const fontMap: Record<string, string> = { default: "inherit", songti: "'SimSun', serif", kaiti: "'KaiTi', serif", heiti: "'SimHei', sans-serif", fangsong: "'FangSong', serif" };
  const ff = fontMap[layout.fontFamily] || "inherit";
  const visibleModules = [...modules].filter((m) => m.visible).sort((a, b) => a.order - b.order);

  const renderBasicInfo = () => {
    const items = [
      resume.basic.gender, resume.basic.birth_date && `${resume.basic.birth_date}`,
      resume.basic.phone, resume.basic.email, resume.basic.hometown,
      resume.basic.political_status, resume.basic.github,
    ].filter(Boolean);
    return items;
  };

  const renderBold = (text: string) => {
    if (!text.includes("**")) return text;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : part
    );
  };

  const renderModuleContent = (key: string) => {
    switch (key) {
      case "education": return resume.education.length > 0 && resume.education.map((e) => (
        <div key={e.id} className="mb-2.5">
          <div className="flex justify-between items-baseline"><span className="font-bold text-gray-900">{e.school}{e.department && ` · ${e.department}`}</span><span className="text-gray-500 text-xs">{e.start_date} — {e.end_date}</span></div>
          <div className="flex flex-wrap gap-x-4 text-gray-600 text-xs mt-0.5">{e.major && <span>{e.major}</span>}{e.degree && <span>{e.degree}</span>}{e.gpa && <span>GPA: {e.gpa}/{e.gpa_max}</span>}{e.rank && <span>排名: {e.rank}{e.total_students && `/${e.total_students}`}</span>}</div>
          {e.courses && <p className="text-gray-500 text-xs mt-1">核心课程：{e.courses}</p>}
          {e.thesis_title && <p className="text-gray-500 text-xs mt-0.5">毕业论文：{e.thesis_title}</p>}
        </div>
      ));
      case "research": return resume.research.length > 0 && resume.research.map((r) => (
        <div key={r.id} className="mb-2.5">
          <div className="flex justify-between items-baseline"><span className="font-bold text-gray-900">{r.title}</span><span className="text-gray-500 text-xs">{r.start_date} — {r.end_date}</span></div>
          <div className="flex flex-wrap gap-x-3 text-gray-600 text-xs mt-0.5">{r.role && <span>{r.role}</span>}{r.advisor && <span>导师：{r.advisor}</span>}{r.lab && <span>{r.lab}</span>}{r.project_type && <span className="font-medium" style={{color:tc}}>[{r.project_type}]</span>}</div>
          {r.description && <p className="text-gray-700 text-xs mt-1 leading-relaxed">{renderBold(r.description)}</p>}
          {r.contribution && <p className="text-xs mt-0.5 leading-relaxed" style={{color:tc}}>贡献：{renderBold(r.contribution)}</p>}
          {r.technologies && <p className="text-gray-500 text-xs mt-0.5">技术栈：{r.technologies}</p>}
        </div>
      ));
      case "publications": return resume.publications.length > 0 && resume.publications.map((p, i) => (
        <div key={p.id} className="mb-1.5 text-xs leading-relaxed">
          <span className="text-gray-400">[{i+1}] </span><span className="font-medium text-gray-900">{p.title}</span>
          {p.all_authors && <span className="text-gray-600"> · {p.all_authors}</span>}
          {p.venue && <span className="text-gray-600 italic"> · {p.venue}</span>}
          {p.date && <span className="text-gray-500"> · {p.date}</span>}
          {(p.sci_zone || p.ccf_rank || p.impact_factor) && <span className="font-medium" style={{color:tc}}> ({[p.sci_zone && `SCI ${p.sci_zone}`, p.ccf_rank && `CCF-${p.ccf_rank}`, p.impact_factor && `IF: ${p.impact_factor}`].filter(Boolean).join(", ")})</span>}
          {p.status && p.status !== "已发表" && <span className="ml-1 text-[10px] border rounded px-1 py-0.5 text-gray-500">{p.status}</span>}
        </div>
      ));
      case "awards": return resume.awards.length > 0 && resume.awards.map((a) => (
        <div key={a.id} className="flex justify-between items-baseline mb-1.5 text-xs">
          <span><span className="font-medium text-gray-900">{a.name}</span>{a.rank && <span className="font-medium" style={{color:tc}}> · {a.rank}</span>}{a.issuer && <span className="text-gray-500"> · {a.issuer}</span>}</span>
          <span className="text-gray-500 shrink-0 ml-3"><span className="text-[10px] border rounded px-1 py-0.5 mr-1">{a.level}</span>{a.date}</span>
        </div>
      ));
      case "experiences": return resume.experiences.length > 0 && resume.experiences.map((e) => (
        <div key={e.id} className="mb-2.5">
          <div className="flex justify-between items-baseline"><span className="font-bold text-gray-900">{e.organization}{e.position && ` · ${e.position}`}</span><span className="text-gray-500 text-xs">{e.start_date} — {e.end_date}</span></div>
          {e.description && <p className="text-gray-700 text-xs mt-1 leading-relaxed">{renderBold(e.description)}</p>}
          {e.achievements && <p className="text-xs mt-0.5 leading-relaxed" style={{color:tc}}>成果：{renderBold(e.achievements)}</p>}
        </div>
      ));
      case "skills": return resume.skills.length > 0 && (
        <div className="text-xs space-y-0.5">{resume.skills.map((s) => <div key={s.id}>{s.category && <span className="font-medium text-gray-900">{s.category}：</span>}<span className="text-gray-700">{s.content}</span></div>)}</div>
      );
      case "languages": return resume.languages.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-700">{resume.languages.map((l) => <span key={l.id}>{l.name}{l.test && ` (${l.test}`}{l.score && `: ${l.score}`}{l.test && ")"}{l.proficiency && ` — ${l.proficiency}`}</span>)}</div>
      );
      case "self_evaluation": return resume.self_evaluation && <p className="text-xs text-gray-700 leading-relaxed">{renderBold(resume.self_evaluation)}</p>;
      default: return null;
    }
  };

  const sectionTitles: Record<string, string> = { education: "教育经历", research: "科研经历", publications: "论文 / 专利", awards: "获奖经历", experiences: "实习 / 项目经历", skills: "技能特长", languages: "语言能力", self_evaluation: "自我评价" };

  /* ========== 学术经典模板 ========== */
  if (template === "academic") {
    return (
      <div style={{ fontFamily: ff, fontSize: 12.5, lineHeight: 1.6, color: "#1a1a1a" }} className="max-w-[720px] mx-auto">
        {/* 姓名居中 */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold tracking-wide mb-2" style={{ color: tc }}>{resume.basic.name}</h1>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-gray-600">
            {renderBasicInfo().map((item, i) => <span key={i}>{item}</span>)}
          </div>
          {(resume.basic.target_school || resume.basic.target_major) && (
            <p className="text-xs text-gray-500 mt-1.5">目标院校：{resume.basic.target_school} · {resume.basic.target_major}</p>
          )}
          <div className="mt-3 h-px" style={{ background: `linear-gradient(90deg, transparent 5%, ${tc} 50%, transparent 95%)` }} />
        </div>
        {visibleModules.map((mod) => {
          const content = renderModuleContent(mod.key);
          if (!content) return null;
          return (
            <div key={mod.key} className="mb-3.5">
              <h2 className="text-[13px] font-bold mb-2 pb-1" style={{ color: tc, borderBottom: `1px solid ${tc}30` }}>{sectionTitles[mod.key] || mod.key}</h2>
              {content}
            </div>
          );
        })}
      </div>
    );
  }

  /* ========== 优雅学院模板 ========== */
  if (template === "elegant") {
    return (
      <div style={{ fontFamily: "'Georgia', 'STSong', 'SimSun', serif", fontSize: 12.5, lineHeight: 1.7, color: "#292524" }} className="max-w-[720px] mx-auto">
        {/* 名字 + 装饰线 */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${tc})` }} />
            <h1 className="text-2xl tracking-[0.15em] shrink-0" style={{ color: tc, fontWeight: 600 }}>{resume.basic.name}</h1>
            <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${tc}, transparent)` }} />
          </div>
          <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 text-xs text-stone-500">
            {renderBasicInfo().map((item, i) => (
              <span key={i} className="flex items-center gap-1">{i > 0 && <span style={{ color: tc, fontSize: 8 }}>◆</span>}{item}</span>
            ))}
          </div>
          {(resume.basic.target_school || resume.basic.target_major) && (
            <p className="text-xs text-stone-400 mt-1.5 italic tracking-wide">申请方向：{resume.basic.target_school} · {resume.basic.target_major}</p>
          )}
        </div>
        {visibleModules.map((mod) => {
          const content = renderModuleContent(mod.key);
          if (!content) return null;
          return (
            <div key={mod.key} className="mb-4">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-1.5 h-1.5 rotate-45" style={{ backgroundColor: tc }} />
                <h2 className="text-[13px] font-semibold tracking-wider" style={{ color: tc }}>{sectionTitles[mod.key]}</h2>
                <div className="flex-1 border-b border-dotted" style={{ borderColor: `${tc}40` }} />
              </div>
              <div className="pl-1">{content}</div>
            </div>
          );
        })}
      </div>
    );
  }

  /* ========== 极简线条模板 ========== */
  if (template === "minimal") {
    return (
      <div style={{ fontFamily: ff, fontSize: 12, lineHeight: 1.6, color: "#1a1a1a" }} className="max-w-[720px] mx-auto">
        <div className="mb-4">
          <h1 className="text-xl font-bold mb-1">{resume.basic.name}</h1>
          <div className="flex flex-wrap gap-x-3 text-xs text-gray-500">{renderBasicInfo().map((item, i) => <span key={i}>{item}</span>)}</div>
          {(resume.basic.target_school || resume.basic.target_major) && <p className="text-xs text-gray-400 mt-1">{resume.basic.target_school} · {resume.basic.target_major}</p>}
        </div>
        {visibleModules.map((mod) => {
          const content = renderModuleContent(mod.key);
          if (!content) return null;
          return (
            <div key={mod.key} className="mb-3">
              <h2 className="text-xs font-bold mb-1.5 pb-0.5 border-b border-gray-200">{sectionTitles[mod.key]}</h2>
              {content}
            </div>
          );
        })}
      </div>
    );
  }

  /* ========== LaTeX 学术模板 ========== */
  if (template === "latex") {
    return (
      <div style={{ fontFamily: "'Georgia', 'CMU Serif', 'Times New Roman', serif", fontSize: 12.5, lineHeight: 1.65, color: "#000" }} className="max-w-[720px] mx-auto">
        <div className="text-center mb-4">
          <h1 className="text-xl mb-1" style={{ fontFamily: "'Georgia', serif", fontWeight: 400, letterSpacing: "0.05em" }}>{resume.basic.name}</h1>
          <div className="flex flex-wrap justify-center gap-x-2 text-xs text-gray-700" style={{ fontFamily: "'Georgia', serif" }}>
            {renderBasicInfo().map((item, i) => <span key={i}>{i > 0 && " · "}{item}</span>)}
          </div>
          {(resume.basic.target_school || resume.basic.target_major) && (
            <p className="text-xs text-gray-500 mt-1 italic">Applying to: {resume.basic.target_school} — {resume.basic.target_major}</p>
          )}
          <div className="mt-2 border-t border-black" />
        </div>
        {visibleModules.map((mod) => {
          const content = renderModuleContent(mod.key);
          if (!content) return null;
          return (
            <div key={mod.key} className="mb-3">
              <h2 className="text-[13px] font-normal uppercase tracking-[0.15em] mb-1.5 pb-0.5 border-b border-black" style={{ fontFamily: "'Georgia', serif" }}>{sectionTitles[mod.key]}</h2>
              {content}
            </div>
          );
        })}
      </div>
    );
  }

  /* ========== 现代创意模板 ========== */
  if (template === "modern") {
    return (
      <div style={{ fontFamily: ff, fontSize: 12.5, lineHeight: 1.6, color: "#1a1a1a" }} className="max-w-[720px] mx-auto flex gap-5">
        <div className="w-[200px] shrink-0 rounded-xl p-4 text-white" style={{ background: `linear-gradient(180deg, ${tc} 0%, ${tc}cc 100%)` }}>
          <h1 className="text-lg font-bold mb-3">{resume.basic.name}</h1>
          <div className="space-y-1.5 text-xs opacity-90">
            {resume.basic.phone && <p>📱 {resume.basic.phone}</p>}
            {resume.basic.email && <p>✉️ {resume.basic.email}</p>}
            {resume.basic.hometown && <p>📍 {resume.basic.hometown}</p>}
            {resume.basic.political_status && <p>🏛️ {resume.basic.political_status}</p>}
            {resume.basic.github && <p>💻 GitHub</p>}
          </div>
          {(resume.basic.target_school || resume.basic.target_major) && (
            <div className="mt-4 pt-3 border-t border-white/20">
              <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">目标院校</p>
              <p className="text-xs font-medium">{resume.basic.target_school}</p>
              <p className="text-xs opacity-80">{resume.basic.target_major}</p>
            </div>
          )}
          {resume.skills.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/20">
              <p className="text-[10px] uppercase tracking-wider opacity-70 mb-2">技能</p>
              {resume.skills.map((s) => (
                <div key={s.id} className="mb-1.5">
                  <p className="text-xs font-medium">{s.content}</p>
                  <div className="flex gap-0.5 mt-0.5">{Array.from({length: 5}, (_, i) => <div key={i} className="h-1 flex-1 rounded-full" style={{ backgroundColor: i < s.proficiency ? "rgba(255,255,255,.8)" : "rgba(255,255,255,.2)" }} />)}</div>
                </div>
              ))}
            </div>
          )}
          {resume.languages.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/20">
              <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">语言</p>
              {resume.languages.map((l) => <p key={l.id} className="text-xs">{l.name} {l.test && `${l.test} ${l.score}`}</p>)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {visibleModules.filter(m => m.key !== "skills" && m.key !== "languages").map((mod) => {
            const content = renderModuleContent(mod.key);
            if (!content) return null;
            return (
              <div key={mod.key} className="mb-4 relative pl-3">
                <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full" style={{ backgroundColor: tc }} />
                <div className="inline-block px-2 py-0.5 rounded text-white text-xs font-bold mb-2" style={{ backgroundColor: tc }}>{sectionTitles[mod.key] || mod.key}</div>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ========== 专业商务模板 ========== */
  return (
    <div style={{ fontFamily: ff, fontSize: 12, lineHeight: 1.55, color: "#1a1a1a" }} className="max-w-[720px] mx-auto">
      {/* 深色头部 */}
      <div className="rounded-lg px-5 py-4 mb-4 text-white" style={{ background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)" }}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-wide mb-1">{resume.basic.name}</h1>
            {(resume.basic.target_school || resume.basic.target_major) && (
              <p className="text-xs opacity-80 mb-2">申请：{resume.basic.target_school} · {resume.basic.target_major}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-80 mt-1">
          {resume.basic.phone && <span>📱 {resume.basic.phone}</span>}
          {resume.basic.email && <span>✉️ {resume.basic.email}</span>}
          {resume.basic.hometown && <span>📍 {resume.basic.hometown}</span>}
          {resume.basic.political_status && <span>{resume.basic.political_status}</span>}
          {resume.basic.github && <span>GitHub: {resume.basic.github}</span>}
        </div>
      </div>
      {/* 内容区 — 高密度紧凑排版 */}
      {visibleModules.map((mod) => {
        const content = renderModuleContent(mod.key);
        if (!content) return null;
        return (
          <div key={mod.key} className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-5 w-1 rounded-full" style={{ backgroundColor: tc }} />
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: tc }}>{sectionTitles[mod.key] || mod.key}</h2>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            {content}
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================
   AI 建议卡片
   ================================================================ */
function SuggestionCard({ suggestion, onAccept }: { suggestion: AISuggestion; onAccept: () => void }) {
  const iconMap = { improvement: <Lightbulb className="h-4 w-4 text-amber-500" />, warning: <AlertTriangle className="h-4 w-4 text-orange-500" />, tip: <Info className="h-4 w-4 text-blue-500" /> };
  const bgMap = { improvement: "bg-amber-50 border-amber-200 dark:bg-amber-500/5 dark:border-amber-500/20", warning: "bg-orange-50 border-orange-200 dark:bg-orange-500/5 dark:border-orange-500/20", tip: "bg-blue-50 border-blue-200 dark:bg-blue-500/5 dark:border-blue-500/20" };

  return (
    <div className={cn("rounded-lg border p-3.5", bgMap[suggestion.type], suggestion.accepted && "opacity-50")}>
      <div className="flex items-start gap-2.5">
        {iconMap[suggestion.type]}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm mb-1">{suggestion.title}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{suggestion.content}</p>
          {suggestion.original && suggestion.suggested && (
            <div className="mt-2 space-y-1 text-sm">
              <p className="line-through text-red-400">{suggestion.original}</p>
              <p className="text-emerald-600 font-medium">{suggestion.suggested}</p>
            </div>
          )}
          {!suggestion.accepted ? (
            <Button size="sm" variant="outline" onClick={onAccept} className="mt-2.5 h-8 text-sm gap-1"><Check className="h-3.5 w-3.5" /> 采纳</Button>
          ) : (
            <Badge variant="secondary" className="mt-2 text-xs">✓ 已采纳</Badge>
          )}
        </div>
      </div>
    </div>
  );
}
