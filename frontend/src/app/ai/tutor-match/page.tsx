"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, Sparkles, Search, MapPin, BookOpen, Star,
  Heart, MessageSquare, ExternalLink, ChevronDown, ChevronUp,
  RefreshCw, Filter, Users, Award, Briefcase, Globe, Mail,
  TrendingUp, BarChart3, Zap, CheckCircle2, ArrowRight, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DISCIPLINE_OPTIONS, UNIVERSITY_OPTIONS, REGION_GROUPS } from "@/lib/constants";

/* ================================================================
   类型定义
   ================================================================ */
interface TutorMatchInput {
  research_direction: string;
  target_discipline: string;
  preferred_schools: string[];
  preferred_regions: string[];
  advisor_type: "学术大牛" | "青年教师" | "工业界背景" | "";
  lab_size: "大组" | "小组" | "无偏好" | "";
  degree_type: "硕士" | "博士" | "直博" | "";
  research_keywords: string;
  gpa_level: "前5%" | "前10%" | "前20%" | "前30%" | "前50%" | "";
  paper_count: number;
  care_factors: string[];
}

interface MatchedTutor {
  id: number;
  name: string;
  title: string;
  school: string;
  department: string;
  direction: string[];
  match_score: number;
  match_reasons: string[];
  email: string;
  homepage: string;
  papers_count: number;
  citations: number;
  h_index: number;
  students_count: number;
  recent_papers: { title: string; venue: string; year: number }[];
  research_summary: string;
  tags: string[];
  recruiting: boolean;
  lab_info: {
    name: string;
    size: string;
    atmosphere: string;
    funding: string;
  };
  contact_suggestion: string;
}

/* ================================================================
   Mock 数据
   ================================================================ */
const defaultInput: TutorMatchInput = {
  research_direction: "", target_discipline: "",
  preferred_schools: [], preferred_regions: [],
  advisor_type: "", lab_size: "", degree_type: "",
  research_keywords: "", gpa_level: "", paper_count: 0,
  care_factors: [],
};

const CARE_FACTOR_OPTIONS = [
  { value: "科研指导", icon: "📚", desc: "导师亲自指导频率" },
  { value: "毕业要求", icon: "🎓", desc: "毕业论文/发表要求" },
  { value: "经济待遇", icon: "💰", desc: "补贴和奖学金" },
  { value: "就业资源", icon: "💼", desc: "实习和就业推荐" },
  { value: "出国机会", icon: "🌍", desc: "联合培养/访学" },
  { value: "团队氛围", icon: "🤝", desc: "课题组文化" },
  { value: "研究方向前沿", icon: "🔬", desc: "方向热度和前景" },
  { value: "学术自由度", icon: "🕊️", desc: "选题自主性" },
];

const mockTutors: MatchedTutor[] = [
  {
    id: 1, name: "张明远", title: "教授/博导", school: "北京大学", department: "计算机科学与技术学院",
    direction: ["自然语言处理", "大语言模型", "知识图谱"], match_score: 95,
    match_reasons: ["研究方向高度匹配", "近年招收硕士名额充足", "课题组氛围好评率高", "有多篇 ACL/EMNLP 顶会论文"],
    email: "zhangmy@pku.edu.cn", homepage: "https://cs.pku.edu.cn/zhangmy",
    papers_count: 156, citations: 8200, h_index: 42, students_count: 12,
    recent_papers: [
      { title: "Large Language Models for Knowledge Graph Completion", venue: "ACL 2025", year: 2025 },
      { title: "Efficient Fine-tuning of LLMs with Adaptive LoRA", venue: "NeurIPS 2024", year: 2024 },
      { title: "Cross-lingual Transfer Learning for Low-resource NLP", venue: "EMNLP 2024", year: 2024 },
    ],
    research_summary: "张教授团队专注于自然语言处理和大语言模型研究，近年在预训练模型高效微调、知识图谱补全、跨语言迁移学习等方向取得了系列成果。团队与多家头部企业有合作项目。",
    tags: ["ACL 常客", "大模型方向", "产学研结合", "招收硕士"],
    recruiting: true,
    lab_info: { name: "智能语言计算实验室", size: "12人（博士5人，硕士7人）", atmosphere: "学术自由，每周组会", funding: "充足，国家重点研发计划" },
    contact_suggestion: "建议通过邮件联系，附上简历和研究兴趣说明。张教授通常在夏令营期间面试，建议提前准备一个研究计划。",
  },
  {
    id: 2, name: "李思涵", title: "副教授/博导", school: "清华大学", department: "计算机科学与技术系",
    direction: ["计算机视觉", "多模态学习", "视觉推理"], match_score: 88,
    match_reasons: ["研究方向相关度高", "青年教师指导细致", "近年成果产出丰富"],
    email: "lish@tsinghua.edu.cn", homepage: "https://cs.tsinghua.edu.cn/lish",
    papers_count: 78, citations: 4500, h_index: 28, students_count: 8,
    recent_papers: [
      { title: "Vision-Language Pre-training with Multi-granularity Alignment", venue: "CVPR 2025", year: 2025 },
      { title: "Reasoning in Visual Question Answering via Chain-of-Thought", venue: "ICCV 2023", year: 2023 },
    ],
    research_summary: "李教授是计算机视觉领域的新锐学者，专注于多模态学习和视觉推理。团队规模适中，导师指导频率高，适合希望获得充分指导的学生。",
    tags: ["青年学者", "CVPR 常客", "指导细致", "小而精"],
    recruiting: true,
    lab_info: { name: "多模态智能实验室", size: "8人（博士3人，硕士5人）", atmosphere: "管理有序，一对一指导", funding: "良好，国家自然科学基金" },
    contact_suggestion: "李教授欢迎有编程基础和数学功底的学生。建议在邮件中展示你的代码能力和对多模态学习的理解。",
  },
  {
    id: 3, name: "王浩然", title: "教授/博导", school: "浙江大学", department: "计算机科学与技术学院",
    direction: ["机器学习", "数据挖掘", "推荐系统"], match_score: 82,
    match_reasons: ["浙大计算机 A+ 学科", "产学研结合紧密", "杭州互联网生态好"],
    email: "wanghr@zju.edu.cn", homepage: "https://cs.zju.edu.cn/wanghr",
    papers_count: 120, citations: 6800, h_index: 36, students_count: 15,
    recent_papers: [
      { title: "Graph Neural Networks for Recommendation Systems", venue: "KDD 2024", year: 2024 },
      { title: "Self-supervised Learning for Sequential Recommendation", venue: "WWW 2024", year: 2024 },
    ],
    research_summary: "王教授团队在推荐系统和图神经网络方面有深厚积累，与阿里巴巴、网易等企业有长期合作。团队规模较大，项目资源丰富。",
    tags: ["KDD 常客", "产业合作多", "大组", "杭州"],
    recruiting: true,
    lab_info: { name: "数据智能实验室", size: "15人（博士6人，硕士9人）", atmosphere: "项目驱动，节奏较快", funding: "充足，企业合作项目多" },
    contact_suggestion: "王教授团队偏好有实际项目经验的学生。建议在联系时展示你的项目经历和编程能力。",
  },
  {
    id: 4, name: "陈雨晴", title: "助理教授", school: "上海交通大学", department: "电子信息与电气工程学院",
    direction: ["AI for Science", "科学计算", "分子生成"], match_score: 76,
    match_reasons: ["新兴交叉方向", "海归背景国际化", "上海就业优势"],
    email: "chenyq@sjtu.edu.cn", homepage: "https://ee.sjtu.edu.cn/chenyq",
    papers_count: 35, citations: 1200, h_index: 15, students_count: 5,
    recent_papers: [
      { title: "Diffusion Models for Molecular Generation", venue: "ICML 2024", year: 2024 },
    ],
    research_summary: "陈教授是 AI for Science 方向的新锐学者，博士毕业于 MIT，研究聚焦于将深度学习应用于科学计算和药物发现。团队刚起步，机会多。",
    tags: ["海归学者", "交叉方向", "MIT 博士", "团队起步期"],
    recruiting: true,
    lab_info: { name: "AI for Science Lab", size: "5人（博士2人，硕士3人）", atmosphere: "学术自由，鼓励探索", funding: "良好，启动基金+企业合作" },
    contact_suggestion: "陈教授欢迎对交叉学科感兴趣的学生，尤其是有化学/生物/物理背景的。建议在邮件中说明你对 AI for Science 的兴趣。",
  },
  {
    id: 5, name: "刘建国", title: "教授/博导", school: "南京大学", department: "计算机科学与技术系",
    direction: ["软件工程", "程序分析", "代码智能"], match_score: 72,
    match_reasons: ["南大软件工程传统强", "学术氛围浓厚", "录取率相对友好"],
    email: "liujg@nju.edu.cn", homepage: "https://cs.nju.edu.cn/liujg",
    papers_count: 95, citations: 3800, h_index: 30, students_count: 10,
    recent_papers: [
      { title: "Code Intelligence with Large Language Models: A Survey", venue: "TSE 2024", year: 2024 },
      { title: "Automated Program Repair via Neural Machine Translation", venue: "ICSE 2024", year: 2024 },
    ],
    research_summary: "刘教授是软件工程领域的资深学者，近年将大语言模型引入代码智能研究，在自动程序修复、代码生成等方向有系列成果。",
    tags: ["ICSE 常客", "软件工程", "学术氛围好", "南京"],
    recruiting: true,
    lab_info: { name: "软件智能实验室", size: "10人（博士4人，硕士6人）", atmosphere: "学术导向，氛围轻松", funding: "良好，国家自然科学基金重点项目" },
    contact_suggestion: "刘教授看重学生的编程能力和逻辑思维。建议准备一些你的代码项目或开源贡献作为展示。",
  },
];

const DIRECTION_MAP: Record<string, string[]> = {
  "工学": ["自然语言处理", "计算机视觉", "机器学习", "数据挖掘", "推荐系统", "软件工程", "网络安全", "机器人", "AI for Science", "代码智能"],
  "理学": ["基础数学", "应用数学", "理论物理", "量子计算", "计算化学"],
  "经济学": ["金融科技", "计量经济学", "行为经济学"],
  "管理学": ["商业分析", "运营管理", "信息系统"],
};

/* ================================================================
   主页面
   ================================================================ */
export default function TutorMatchPage() {
  const [input, setInput] = useState<TutorMatchInput>(defaultInput);
  const [results, setResults] = useState<MatchedTutor[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [pageStep, setPageStep] = useState<"input" | "result">("input");

  const updateInput = useCallback((f: string, v: unknown) => {
    setInput((p) => ({ ...p, [f]: v }));
  }, []);

  const toggleSchool = useCallback((s: string) => {
    setInput((p) => {
      const schools = p.preferred_schools.includes(s) ? p.preferred_schools.filter((x) => x !== s) : [...p.preferred_schools, s];
      return { ...p, preferred_schools: schools };
    });
  }, []);

  const toggleRegion = useCallback((r: string) => {
    setInput((p) => {
      const regions = p.preferred_regions.includes(r) ? p.preferred_regions.filter((x) => x !== r) : [...p.preferred_regions, r];
      return { ...p, preferred_regions: regions };
    });
  }, []);

  const toggleFactor = useCallback((f: string) => {
    setInput((p) => {
      const factors = p.care_factors.includes(f) ? p.care_factors.filter((x) => x !== f) : [...p.care_factors, f];
      return { ...p, care_factors: factors };
    });
  }, []);

  const handleSearch = useCallback(() => {
    setIsSearching(true);
    setTimeout(() => { setResults(mockTutors); setIsSearching(false); setPageStep("result"); }, 2000);
  }, []);

  const handleReset = useCallback(() => { setPageStep("input"); setResults(null); }, []);

  const directions = useMemo(() => DIRECTION_MAP[input.target_discipline] || [], [input.target_discipline]);
  const canSubmit = input.target_discipline || input.research_keywords;

  return (
    <AnimatePresence mode="wait">
      {pageStep === "input" ? (
        <motion.div key="input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 引导 */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-5 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-4">
                <GraduationCap className="h-4 w-4" /> AI 智能匹配
              </div>
              <h2 className="text-2xl font-bold mb-2">找到最适合你的导师</h2>
              <p className="text-muted-foreground">输入你的研究兴趣和偏好，AI 将为你推荐最匹配的导师</p>
            </div>

            {/* 研究方向 */}
            <Card className="shadow-sm">
              <CardContent className="p-6 sm:p-8">
                <h3 className="text-lg font-bold mb-5 flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> 研究方向</h3>
                <div className="space-y-5">
                  <div>
                    <label className="text-sm font-medium mb-2 block">目标学科</label>
                    <div className="flex flex-wrap gap-2">
                      {DISCIPLINE_OPTIONS.slice(0, 6).map((d) => (
                        <button key={d} onClick={() => { updateInput("target_discipline", d); updateInput("research_direction", ""); }}
                          className={cn("rounded-lg px-4 py-2 text-sm font-medium transition-all",
                            input.target_discipline === d ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  {directions.length > 0 && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">具体方向</label>
                      <div className="flex flex-wrap gap-2">
                        {directions.map((d) => (
                          <button key={d} onClick={() => updateInput("research_direction", d)}
                            className={cn("rounded-lg px-3 py-1.5 text-sm transition-all",
                              input.research_direction === d ? "bg-emerald-100 text-emerald-700 font-medium" : "bg-muted/30 text-muted-foreground hover:bg-muted/50")}>
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">研究关键词</label>
                    <Input value={input.research_keywords} onChange={(e) => updateInput("research_keywords", e.target.value)}
                      placeholder="输入你感兴趣的研究关键词，如：大语言模型、图神经网络、强化学习" className="h-11" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 导师偏好 */}
            <Card className="shadow-sm">
              <CardContent className="p-6 sm:p-8">
                <h3 className="text-lg font-bold mb-5 flex items-center gap-2"><Heart className="h-5 w-5 text-primary" /> 导师偏好</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="text-sm font-medium mb-2 block">导师类型</label>
                    <div className="space-y-2">
                      {[
                        { value: "学术大牛", label: "🏆 学术大牛", desc: "院士/长江/杰青" },
                        { value: "青年教师", label: "🌱 青年教师", desc: "指导更细致" },
                        { value: "工业界背景", label: "🏢 工业界背景", desc: "项目实战多" },
                      ].map((o) => (
                        <button key={o.value} onClick={() => updateInput("advisor_type", o.value)}
                          className={cn("w-full rounded-lg border p-3 text-left transition-all",
                            input.advisor_type === o.value ? "border-primary bg-primary/5" : "border-muted hover:bg-muted/30")}>
                          <p className="text-sm font-medium">{o.label}</p>
                          <p className="text-xs text-muted-foreground">{o.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">课题组规模</label>
                    <div className="space-y-2">
                      {[
                        { value: "大组", label: "👥 大组（10人+）", desc: "资源多、项目多" },
                        { value: "小组", label: "👤 小组（5人以下）", desc: "指导多、自由度高" },
                        { value: "无偏好", label: "🤷 无偏好", desc: "都可以" },
                      ].map((o) => (
                        <button key={o.value} onClick={() => updateInput("lab_size", o.value)}
                          className={cn("w-full rounded-lg border p-3 text-left transition-all",
                            input.lab_size === o.value ? "border-primary bg-primary/5" : "border-muted hover:bg-muted/30")}>
                          <p className="text-sm font-medium">{o.label}</p>
                          <p className="text-xs text-muted-foreground">{o.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">攻读学位</label>
                    <div className="space-y-2">
                      {["硕士", "博士", "直博"].map((o) => (
                        <button key={o} onClick={() => updateInput("degree_type", o)}
                          className={cn("w-full rounded-lg border p-3 text-left transition-all text-sm font-medium",
                            input.degree_type === o ? "border-primary bg-primary/5" : "border-muted hover:bg-muted/30")}>
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 你最关心的 */}
            <Card className="shadow-sm">
              <CardContent className="p-6 sm:p-8">
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Star className="h-5 w-5 text-primary" /> 你最关心的因素</h3>
                <p className="text-sm text-muted-foreground mb-5">选择对你最重要的因素（可多选），帮助 AI 更精准地匹配</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {CARE_FACTOR_OPTIONS.map((o) => (
                    <button key={o.value} onClick={() => toggleFactor(o.value)}
                      className={cn("rounded-xl border-2 p-4 text-left transition-all",
                        input.care_factors.includes(o.value) ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-muted/30 hover:bg-muted/50")}>
                      <span className="text-xl">{o.icon}</span>
                      <p className="text-sm font-medium mt-1.5">{o.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{o.desc}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 个人背景 */}
            <Card className="shadow-sm">
              <CardContent className="p-6 sm:p-8">
                <h3 className="text-lg font-bold mb-5 flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> 你的背景（可选）</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">GPA 水平</label>
                    <select className="w-full h-11 rounded-lg border bg-background px-3 text-sm" value={input.gpa_level} onChange={(e) => updateInput("gpa_level", e.target.value)}>
                      <option value="">请选择</option>
                      {["前5%", "前10%", "前20%", "前30%", "前50%"].map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">论文数量</label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border rounded-lg overflow-hidden h-11">
                        <button onClick={() => updateInput("paper_count", Math.max(0, input.paper_count - 1))} className="h-full w-11 flex items-center justify-center text-lg text-muted-foreground hover:bg-muted">−</button>
                        <span className="w-12 text-center font-semibold">{input.paper_count}</span>
                        <button onClick={() => updateInput("paper_count", input.paper_count + 1)} className="h-full w-11 flex items-center justify-center text-lg text-muted-foreground hover:bg-muted">+</button>
                      </div>
                      <span className="text-sm text-muted-foreground">篇</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 目标院校 */}
            <Card className="shadow-sm">
              <CardContent className="p-6 sm:p-8">
                <h3 className="text-lg font-bold mb-5 flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> 目标院校与地区</h3>
                <div className="space-y-5">
                  <div>
                    <label className="text-sm font-medium mb-2 block">偏好院校（可多选）</label>
                    <div className="flex flex-wrap gap-2">
                      {UNIVERSITY_OPTIONS.slice(0, 16).map((s) => (
                        <button key={s} onClick={() => toggleSchool(s)}
                          className={cn("rounded-lg px-3 py-1.5 text-sm transition-all",
                            input.preferred_schools.includes(s) ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/30 text-muted-foreground hover:bg-muted/50")}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">偏好地区（可多选）</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(REGION_GROUPS).map((r) => (
                        <button key={r} onClick={() => toggleRegion(r)}
                          className={cn("rounded-lg px-4 py-2 text-sm font-medium transition-all",
                            input.preferred_regions.includes(r) ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 提交 */}
            <div className="flex justify-center pt-6 pb-4">
              <Button size="lg" onClick={handleSearch} disabled={!canSubmit || isSearching}
                className="gap-2.5 px-10 h-14 text-lg shadow-lg shadow-primary/20 rounded-xl">
                {isSearching ? <><RefreshCw className="h-5 w-5 animate-spin" /> AI 匹配中...</> : <><Sparkles className="h-5 w-5" /> 开始智能匹配</>}
              </Button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
          {results && <ResultView tutors={results} input={input} onReset={handleReset} />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================================================================
   结果展示
   ================================================================ */
function ResultView({ tutors, input, onReset }: { tutors: MatchedTutor[]; input: TutorMatchInput; onReset: () => void }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 结果概览 */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-2xl p-6 sm:p-8">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2"><GraduationCap className="h-5 w-5 text-emerald-600" /> 导师推荐结果</h2>
            <p className="text-muted-foreground mt-1">
              {input.research_direction || input.target_discipline || "全方向"} 方向
              {input.research_keywords && ` · 关键词：${input.research_keywords}`}
            </p>
          </div>
          <Badge variant="secondary" className="text-base px-4 py-1.5">共 {tutors.length} 位</Badge>
        </div>
      </div>

      {/* 导师卡片列表 */}
      <div className="space-y-4">
        {tutors.map((tutor) => (
          <Card key={tutor.id} className={cn("transition-all hover:shadow-md hover:-translate-y-0.5", expandedId === tutor.id && "shadow-md ring-1 ring-primary/20")}>
            <CardContent className="p-0">
              <button onClick={() => setExpandedId(expandedId === tutor.id ? null : tutor.id)} className="w-full p-5 sm:p-6 text-left">
                <div className="flex items-start gap-5">
                  {/* 匹配度 */}
                  <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10">
                    <span className="text-xl font-bold text-emerald-600">{tutor.match_score}</span>
                    <span className="text-[11px] text-muted-foreground">匹配</span>
                  </div>

                  {/* 导师信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-lg font-bold">{tutor.name}</h4>
                      <Badge variant="outline" className="text-xs">{tutor.title}</Badge>
                      {tutor.recruiting && <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">招生中</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{tutor.school} · {tutor.department}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tutor.direction.map((d) => <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>)}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-2.5 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{tutor.papers_count} 篇论文</span>
                      <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />{tutor.citations} 引用</span>
                      <span className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" />H-index {tutor.h_index}</span>
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{tutor.students_count} 名学生</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tutor.tags.map((t) => <span key={t} className="text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-0.5">{t}</span>)}
                    </div>
                  </div>

                  {expandedId === tutor.id ? <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0 mt-1" /> : <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />}
                </div>
              </button>

              {/* 展开详情 */}
              <AnimatePresence>
                {expandedId === tutor.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-5 sm:px-6 pb-6 border-t">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
                        {/* 匹配理由 */}
                        <div>
                          <h5 className="text-sm font-bold mb-3 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> 匹配理由</h5>
                          <ul className="space-y-2">
                            {tutor.match_reasons.map((r, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span>{r}</li>
                            ))}
                          </ul>
                        </div>

                        {/* 课题组信息 */}
                        <div>
                          <h5 className="text-sm font-bold mb-3 flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" /> 课题组信息</h5>
                          <div className="space-y-2 text-sm">
                            <p><span className="font-medium">实验室：</span><span className="text-muted-foreground">{tutor.lab_info.name}</span></p>
                            <p><span className="font-medium">规模：</span><span className="text-muted-foreground">{tutor.lab_info.size}</span></p>
                            <p><span className="font-medium">氛围：</span><span className="text-muted-foreground">{tutor.lab_info.atmosphere}</span></p>
                            <p><span className="font-medium">经费：</span><span className="text-muted-foreground">{tutor.lab_info.funding}</span></p>
                          </div>
                        </div>
                      </div>

                      {/* 研究概述 */}
                      <div className="mt-5">
                        <h5 className="text-sm font-bold mb-2">研究概述</h5>
                        <p className="text-sm text-muted-foreground leading-relaxed">{tutor.research_summary}</p>
                      </div>

                      {/* 近期论文 */}
                      <div className="mt-5">
                        <h5 className="text-sm font-bold mb-3 flex items-center gap-1.5"><BookOpen className="h-4 w-4 text-primary" /> 近期代表论文</h5>
                        <div className="space-y-2">
                          {tutor.recent_papers.map((p, i) => (
                            <div key={i} className="text-sm flex items-start gap-2">
                              <span className="text-muted-foreground shrink-0">[{i + 1}]</span>
                              <span><span className="font-medium">{p.title}</span> <span className="text-muted-foreground">· {p.venue} · {p.year}</span></span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 联系建议 */}
                      <div className="mt-5 bg-amber-50 dark:bg-amber-500/5 rounded-xl p-4">
                        <h5 className="text-sm font-bold mb-2 flex items-center gap-1.5"><MessageSquare className="h-4 w-4 text-amber-600" /> 联系建议</h5>
                        <p className="text-sm text-muted-foreground leading-relaxed">{tutor.contact_suggestion}</p>
                      </div>

                      {/* 操作按钮 */}
                      <div className="mt-5 flex flex-wrap gap-3">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open(`mailto:${tutor.email}`)}>
                          <Mail className="h-4 w-4" /> 发送邮件
                        </Button>
                        {tutor.homepage && (
                          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open(tutor.homepage)}>
                            <ExternalLink className="h-4 w-4" /> 个人主页
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <Heart className="h-4 w-4" /> 收藏导师
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 操作 */}
      <div className="flex justify-center gap-4 pt-4 pb-8">
        <Button variant="outline" size="lg" onClick={onReset} className="gap-2"><RefreshCw className="h-4 w-4" /> 重新匹配</Button>
        <Button size="lg" className="gap-2"><FileText className="h-4 w-4" /> 导出推荐列表</Button>
      </div>
    </div>
  );
}
