"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, Sparkles, GraduationCap, MapPin, TrendingUp, Users,
  BookOpen, BarChart3, Star, Shield, Zap, RefreshCw, User,
  FileText, ChevronDown, ChevronUp, Heart, Briefcase, Globe,
  Compass, Calendar, ArrowRight, CheckCircle2, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DISCIPLINE_OPTIONS, REGION_GROUPS } from "@/lib/constants";
import type { RecommendInput, RecommendResult, RecommendSchool } from "@/types/recommend";

/* ================================================================
   初始输入
   ================================================================ */
const defaultInput: RecommendInput = {
  university: "", major: "", school_level: "", gpa: "", gpa_max: "4.0",
  rank_percent: 0, target_discipline: "", target_direction: "",
  research_count: 0, paper_count: 0, high_paper_count: 0,
  award_count: 0, national_award_count: 0,
  english_level: "", english_score: "", has_overseas: false,
  preferred_regions: [], target_degree: "",
  future_plan: "", career_direction: "", academic_goal: "",
  advisor_preference: "", lab_atmosphere: "",
  city_importance: 50, ranking_importance: 70, major_strength_importance: 80,
  employment_importance: 60, research_platform_importance: 70,
  accept_adjustment: false, has_recommendation: false,
  recommendation_source: "", personal_strengths: "", personal_weaknesses: "",
};

/* ================================================================
   Mock 推荐结果
   ================================================================ */
const mockResult: RecommendResult = {
  assessment: {
    overall_score: 78,
    dimensions: [
      { name: "学业成绩", score: 85, max_score: 100, comment: "GPA 排名前 10%，学业基础扎实" },
      { name: "科研能力", score: 72, max_score: 100, comment: "有 2 段科研经历，建议增加论文产出" },
      { name: "竞赛获奖", score: 80, max_score: 100, comment: "国家级竞赛获奖，竞争力较强" },
      { name: "综合素质", score: 75, max_score: 100, comment: "英语六级，有实习经历，综合表现良好" },
    ],
    summary: "综合评估：你的学业成绩优秀，科研经历丰富，具备冲击 985 高校的实力。建议重点关注与你研究方向匹配度高的院校，同时增加论文产出以提升竞争力。",
  },
  schools: [
    { id: 1, name: "北京大学", level: "985", province: "北京", city: "北京", department: "计算机科学与技术学院", major: "计算机科学与技术", match_score: 72, difficulty: 5, category: "冲刺", reasons: ["学科排名全国前 3", "研究方向高度匹配", "导师团队实力强"], admission_info: { quota: 30, applicants: 450, rate: "6.7%" }, related_tutors: [{ name: "张教授", title: "教授/博导", direction: "人工智能" }, { name: "李教授", title: "副教授", direction: "计算机视觉" }], discipline_rank: "A+", overall_rank: 1, tags: ["顶尖学府", "科研资源丰富"] },
    { id: 2, name: "清华大学", level: "985", province: "北京", city: "北京", department: "计算机科学与技术系", major: "计算机科学与技术", match_score: 68, difficulty: 5, category: "冲刺", reasons: ["顶尖学科实力", "科研资源丰富", "就业前景极佳"], admission_info: { quota: 25, applicants: 500, rate: "5.0%" }, related_tutors: [{ name: "王教授", title: "教授/博导", direction: "机器学习" }], discipline_rank: "A+", overall_rank: 2, tags: ["工科第一", "产学研结合"] },
    { id: 3, name: "浙江大学", level: "985", province: "浙江", city: "杭州", department: "计算机科学与技术学院", major: "人工智能", match_score: 85, difficulty: 4, category: "稳妥", reasons: ["学科评估 A+", "地理位置优越", "产学研结合紧密"], admission_info: { quota: 40, applicants: 350, rate: "11.4%" }, related_tutors: [{ name: "陈教授", title: "教授/博导", direction: "自然语言处理" }, { name: "刘教授", title: "教授", direction: "计算机视觉" }], discipline_rank: "A+", overall_rank: 3, tags: ["综合实力强", "杭州互联网生态"] },
    { id: 4, name: "上海交通大学", level: "985", province: "上海", city: "上海", department: "电子信息与电气工程学院", major: "计算机科学与技术", match_score: 82, difficulty: 4, category: "稳妥", reasons: ["综合实力强", "上海地区就业优势", "国际化程度高"], admission_info: { quota: 35, applicants: 300, rate: "11.7%" }, related_tutors: [{ name: "赵教授", title: "教授/博导", direction: "数据挖掘" }], discipline_rank: "A", overall_rank: 4, tags: ["国际化", "就业优势"] },
    { id: 5, name: "南京大学", level: "985", province: "江苏", city: "南京", department: "计算机科学与技术系", major: "软件工程", match_score: 88, difficulty: 3, category: "稳妥", reasons: ["计算机学科传统强校", "学术氛围浓厚", "录取率相对友好"], admission_info: { quota: 45, applicants: 280, rate: "16.1%" }, related_tutors: [{ name: "周教授", title: "教授", direction: "软件工程" }, { name: "吴教授", title: "副教授", direction: "人工智能" }], discipline_rank: "A", overall_rank: 6, tags: ["学术氛围好", "性价比高"] },
    { id: 6, name: "哈尔滨工业大学", level: "985", province: "黑龙江", city: "哈尔滨", department: "计算机科学与技术学院", major: "计算机科学与技术", match_score: 92, difficulty: 3, category: "保底", reasons: ["工科传统强校", "计算机学科 A 类", "录取概率较高", "深圳校区可选"], admission_info: { quota: 50, applicants: 200, rate: "25.0%" }, related_tutors: [{ name: "孙教授", title: "教授/博导", direction: "机器人" }], discipline_rank: "A", overall_rank: 10, tags: ["工科强校", "深圳校区"] },
    { id: 7, name: "武汉大学", level: "985", province: "湖北", city: "武汉", department: "计算机学院", major: "计算机科学与技术", match_score: 90, difficulty: 3, category: "保底", reasons: ["综合性大学", "学科门类齐全", "性价比高"], admission_info: { quota: 55, applicants: 220, rate: "25.0%" }, related_tutors: [{ name: "郑教授", title: "教授", direction: "网络安全" }], discipline_rank: "A-", overall_rank: 8, tags: ["综合性强", "环境优美"] },
  ],
  suggestions: [
    "建议优先关注浙江大学和南京大学，匹配度高且录取概率较大",
    "北大和清华作为冲刺目标，建议提前联系导师，展示科研成果",
    "建议在夏令营阶段广泛投递，至少覆盖 5-8 所院校",
    "论文产出是提升竞争力的关键，建议在投递前争取发表 1 篇论文",
    "英语六级成绩建议刷到 550+ 以增强竞争力",
    "根据你的未来规划偏好，建议重点关注科研平台强的院校",
  ],
  timeline: [
    { month: "3-4月", title: "准备材料", description: "完善简历、整理科研成果、准备推荐信" },
    { month: "5-6月", title: "夏令营投递", description: "重点投递 5-8 所目标院校的夏令营" },
    { month: "7月", title: "参加夏令营", description: "参加入营考核，争取优秀营员" },
    { month: "9月", title: "预推免", description: "未获得 offer 的同学参加预推免" },
    { month: "9-10月", title: "正式推免", description: "在推免系统中完成志愿填报" },
  ],
};

/* ================================================================
   方向选项
   ================================================================ */
const DIRECTION_MAP: Record<string, string[]> = {
  "工学": ["人工智能", "计算机视觉", "自然语言处理", "机器学习", "数据挖掘", "软件工程", "网络安全", "嵌入式系统", "机器人", "集成电路"],
  "理学": ["基础数学", "应用数学", "理论物理", "凝聚态物理", "有机化学", "分析化学", "分子生物学", "生态学"],
  "经济学": ["金融学", "国际经济", "计量经济学", "产业经济学", "区域经济学"],
  "管理学": ["企业管理", "会计学", "市场营销", "信息管理", "公共管理"],
  "法学": ["民商法", "刑法", "国际法", "知识产权法", "环境法"],
  "医学": ["临床医学", "基础医学", "药学", "公共卫生", "口腔医学"],
};

const SCHOOL_LEVEL_OPTIONS = ["985", "211", "双一流", "普通一本", "二本"];
const FUTURE_PLAN_OPTIONS = [
  { value: "学术深造", label: "🎓 继续学术深造", desc: "读博 / 科研" },
  { value: "就业工作", label: "💼 毕业后就业", desc: "进入行业工作" },
  { value: "创业", label: "🚀 自主创业", desc: "创办公司 / 项目" },
  { value: "未确定", label: "🤔 暂未确定", desc: "还在探索中" },
];
const CAREER_OPTIONS = ["互联网大厂", "国企央企", "外企", "公务员", "科研院所", "高校教职", "自由职业"];
const ACADEMIC_GOAL_OPTIONS = ["国内读博", "出国读博", "硕士毕业"];
const ADVISOR_PREF_OPTIONS = [
  { value: "学术大牛", label: "🏆 学术大牛", desc: "院士/长江/杰青" },
  { value: "青年教师", label: "🌱 青年教师", desc: "指导更细致" },
  { value: "工业界背景", label: "🏢 工业界背景", desc: "项目实战多" },
  { value: "无偏好", label: "🤷 无偏好", desc: "都可以" },
];
const LAB_ATMOSPHERE_OPTIONS = [
  { value: "学术自由", label: "📚 学术自由型" },
  { value: "管理严格", label: "📋 管理严格型" },
  { value: "项目驱动", label: "🔧 项目驱动型" },
  { value: "无偏好", label: "🤷 无偏好" },
];

/* ================================================================
   主页面
   ================================================================ */
export default function RecommendPage() {
  const [input, setInput] = useState<RecommendInput>(defaultInput);
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pageStep, setPageStep] = useState<"input" | "result">("input");

  const updateInput = useCallback((f: string, v: unknown) => {
    setInput((p) => ({ ...p, [f]: v }));
  }, []);

  const toggleRegion = useCallback((r: string) => {
    setInput((p) => {
      const regions = p.preferred_regions.includes(r) ? p.preferred_regions.filter((x) => x !== r) : [...p.preferred_regions, r];
      return { ...p, preferred_regions: regions };
    });
  }, []);

  const handleAnalyze = useCallback(() => {
    setIsAnalyzing(true);
    setTimeout(() => { setResult(mockResult); setIsAnalyzing(false); setPageStep("result"); }, 2000);
  }, []);

  const handleReset = useCallback(() => { setPageStep("input"); setResult(null); }, []);

  const directions = useMemo(() => DIRECTION_MAP[input.target_discipline] || [], [input.target_discipline]);
  const canSubmit = input.university && input.major && input.rank_percent > 0 && input.target_discipline;

  return (
    <AnimatePresence mode="wait">
      {pageStep === "input" ? (
        <motion.div key="input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
          <InputForm input={input} directions={directions} onUpdate={updateInput} onToggleRegion={toggleRegion} onSubmit={handleAnalyze} isAnalyzing={isAnalyzing} canSubmit={!!canSubmit} />
        </motion.div>
      ) : (
        <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
          {result && <ResultView result={result} input={input} onReset={handleReset} />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================================================================
   输入表单
   ================================================================ */
function InputForm({ input, directions, onUpdate, onToggleRegion, onSubmit, isAnalyzing, canSubmit }: {
  input: RecommendInput; directions: string[];
  onUpdate: (f: string, v: unknown) => void; onToggleRegion: (r: string) => void;
  onSubmit: () => void; isAnalyzing: boolean; canSubmit: boolean;
}) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 引导 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 dark:bg-violet-500/10 px-5 py-2 text-sm font-medium text-violet-700 dark:text-violet-400 mb-4">
          <Sparkles className="h-4 w-4" /> AI 智能分析
        </div>
        <h2 className="text-2xl font-bold mb-2">填写你的基本情况，获取个性化择校建议</h2>
        <p className="text-muted-foreground">我们将根据你的背景和偏好综合分析，推荐最适合的目标院校</p>
      </div>

      {/* 基本信息 */}
      <Card className="shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <h3 className="text-lg font-bold mb-5 flex items-center gap-2"><User className="h-5 w-5 text-primary" /> 基本信息</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="text-sm font-medium mb-1.5 block">本科学校 <span className="text-red-500">*</span></label>
              <Input value={input.university} onChange={(e) => onUpdate("university", e.target.value)} placeholder="如：武汉大学" className="h-11" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">学校层次</label>
              <select className="w-full h-11 rounded-lg border bg-background px-3 text-sm" value={input.school_level} onChange={(e) => onUpdate("school_level", e.target.value)}>
                <option value="">请选择</option>
                {SCHOOL_LEVEL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">本科专业 <span className="text-red-500">*</span></label>
              <Input value={input.major} onChange={(e) => onUpdate("major", e.target.value)} placeholder="如：计算机科学与技术" className="h-11" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">GPA</label>
              <div className="flex items-center gap-2">
                <Input value={input.gpa} onChange={(e) => onUpdate("gpa", e.target.value)} placeholder="3.85" className="h-11 flex-1" />
                <span className="text-muted-foreground">/</span>
                <Input value={input.gpa_max} onChange={(e) => onUpdate("gpa_max", e.target.value)} placeholder="4.0" className="h-11 w-20" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">GPA 排名 <span className="text-red-500">*</span></label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">前</span>
                  <span className="text-lg font-bold text-primary w-12 text-center">{input.rank_percent || 0}%</span>
                </div>
                <input type="range" min={1} max={100} value={input.rank_percent || 1} onChange={(e) => onUpdate("rank_percent", Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary" />
                <div className="flex justify-between text-xs text-muted-foreground"><span>前 1%</span><span>前 50%</span><span>前 100%</span></div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">期望学位</label>
              <select className="w-full h-11 rounded-lg border bg-background px-3 text-sm" value={input.target_degree} onChange={(e) => onUpdate("target_degree", e.target.value)}>
                <option value="">请选择</option>
                <option value="硕士">硕士</option>
                <option value="博士">博士</option>
                <option value="直博">直博</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 目标方向 */}
      <Card className="shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <h3 className="text-lg font-bold mb-5 flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> 目标方向</h3>
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-2 block">目标学科 <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap gap-2">
                {DISCIPLINE_OPTIONS.slice(0, 8).map((d) => (
                  <button key={d} onClick={() => { onUpdate("target_discipline", d); onUpdate("target_direction", ""); }}
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
                <div className="flex flex-wrap gap-2 mb-3">
                  {directions.map((d) => (
                    <button key={d} onClick={() => onUpdate("target_direction", d)}
                      className={cn("rounded-lg px-3 py-1.5 text-sm transition-all",
                        input.target_direction === d ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400 font-medium" : "bg-muted/30 text-muted-foreground hover:bg-muted/50")}>
                      {d}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">或自定义：</span>
                  <Input
                    value={directions.includes(input.target_direction) ? "" : input.target_direction}
                    onChange={(e) => onUpdate("target_direction", e.target.value)}
                    placeholder="输入你的具体研究方向，如：联邦学习、量子机器学习"
                    className="h-9 text-sm flex-1"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 学术背景 */}
      <Card className="shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <h3 className="text-lg font-bold mb-5 flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> 学术背景</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <CounterField label="科研经历" value={input.research_count} onChange={(v) => onUpdate("research_count", v)} suffix="段" />
            <CounterField label="论文数量" value={input.paper_count} onChange={(v) => onUpdate("paper_count", v)} suffix="篇" />
            <CounterField label="其中 SCI/EI" value={input.high_paper_count} onChange={(v) => onUpdate("high_paper_count", v)} suffix="篇" />
            <CounterField label="竞赛获奖" value={input.award_count} onChange={(v) => onUpdate("award_count", v)} suffix="项" />
            <CounterField label="其中国家级" value={input.national_award_count} onChange={(v) => onUpdate("national_award_count", v)} suffix="项" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
            <div>
              <label className="text-sm font-medium mb-1.5 block">英语水平</label>
              <select className="w-full h-11 rounded-lg border bg-background px-3 text-sm" value={input.english_level} onChange={(e) => onUpdate("english_level", e.target.value)}>
                <option value="">请选择</option>
                {["四级", "六级", "雅思", "托福", "GRE"].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">英语成绩</label>
              <Input value={input.english_score} onChange={(e) => onUpdate("english_score", e.target.value)} placeholder="如：550" className="h-11" />
            </div>
          </div>
          <div className="flex flex-wrap gap-6 mt-5">
            <ToggleSwitch label="海外交流经历" value={input.has_overseas} onChange={(v) => onUpdate("has_overseas", v)} />
            <ToggleSwitch label="有推荐信" value={input.has_recommendation} onChange={(v) => onUpdate("has_recommendation", v)} />
            <ToggleSwitch label="接受调剂" value={input.accept_adjustment} onChange={(v) => onUpdate("accept_adjustment", v)} />
          </div>
          {input.has_recommendation && (
            <div className="mt-4">
              <label className="text-sm font-medium mb-1.5 block">推荐信来源</label>
              <Input value={input.recommendation_source} onChange={(e) => onUpdate("recommendation_source", e.target.value)} placeholder="如：本校教授 / 实习导师" className="h-11" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 未来规划 */}
      <Card className="shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <h3 className="text-lg font-bold mb-5 flex items-center gap-2"><Compass className="h-5 w-5 text-primary" /> 未来规划</h3>
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-2 block">毕业后的规划</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {FUTURE_PLAN_OPTIONS.map((o) => (
                  <button key={o.value} onClick={() => onUpdate("future_plan", o.value)}
                    className={cn("rounded-xl border-2 p-4 text-left transition-all",
                      input.future_plan === o.value ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-muted/30 hover:bg-muted/50")}>
                    <p className="font-medium text-sm">{o.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{o.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {input.future_plan === "就业工作" && (
              <div>
                <label className="text-sm font-medium mb-2 block">就业方向偏好</label>
                <div className="flex flex-wrap gap-2">
                  {CAREER_OPTIONS.map((o) => (
                    <button key={o} onClick={() => onUpdate("career_direction", o)}
                      className={cn("rounded-lg px-3 py-2 text-sm transition-all",
                        input.career_direction === o ? "bg-amber-100 text-amber-700 font-medium" : "bg-muted/30 text-muted-foreground hover:bg-muted/50")}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {input.future_plan === "学术深造" && (
              <div>
                <label className="text-sm font-medium mb-2 block">学术深造方向</label>
                <div className="flex flex-wrap gap-2">
                  {ACADEMIC_GOAL_OPTIONS.map((o) => (
                    <button key={o} onClick={() => onUpdate("academic_goal", o)}
                      className={cn("rounded-lg px-3 py-2 text-sm transition-all",
                        input.academic_goal === o ? "bg-blue-100 text-blue-700 font-medium" : "bg-muted/30 text-muted-foreground hover:bg-muted/50")}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">导师偏好</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ADVISOR_PREF_OPTIONS.map((o) => (
                  <button key={o.value} onClick={() => onUpdate("advisor_preference", o.value)}
                    className={cn("rounded-xl border p-3 text-left transition-all",
                      input.advisor_preference === o.value ? "border-primary bg-primary/5" : "border-muted hover:bg-muted/30")}>
                    <p className="text-sm font-medium">{o.label}</p>
                    <p className="text-xs text-muted-foreground">{o.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">课题组氛围偏好</label>
              <div className="flex flex-wrap gap-2">
                {LAB_ATMOSPHERE_OPTIONS.map((o) => (
                  <button key={o.value} onClick={() => onUpdate("lab_atmosphere", o.value)}
                    className={cn("rounded-lg px-4 py-2 text-sm transition-all",
                      input.lab_atmosphere === o.value ? "bg-emerald-100 text-emerald-700 font-medium" : "bg-muted/30 text-muted-foreground hover:bg-muted/50")}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 重要性偏好 */}
      <Card className="shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Heart className="h-5 w-5 text-primary" /> 择校偏好权重</h3>
          <p className="text-sm text-muted-foreground mb-5">拖动滑块调整各因素对你的重要程度</p>
          <div className="space-y-5">
            <ImportanceSlider label="🏫 学校排名" value={input.ranking_importance} onChange={(v) => onUpdate("ranking_importance", v)} />
            <ImportanceSlider label="📚 专业实力" value={input.major_strength_importance} onChange={(v) => onUpdate("major_strength_importance", v)} />
            <ImportanceSlider label="🔬 科研平台" value={input.research_platform_importance} onChange={(v) => onUpdate("research_platform_importance", v)} />
            <ImportanceSlider label="💼 就业前景" value={input.employment_importance} onChange={(v) => onUpdate("employment_importance", v)} />
            <ImportanceSlider label="🏙️ 城市生活" value={input.city_importance} onChange={(v) => onUpdate("city_importance", v)} />
          </div>
        </CardContent>
      </Card>

      {/* 地区偏好 */}
      <Card className="shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <h3 className="text-lg font-bold mb-5 flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> 地区偏好（可多选）</h3>
          <div className="flex flex-wrap gap-2">
            {Object.keys(REGION_GROUPS).map((r) => (
              <button key={r} onClick={() => onToggleRegion(r)}
                className={cn("rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                  input.preferred_regions.includes(r) ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
                {r}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 个人自述 */}
      <Card className="shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <h3 className="text-lg font-bold mb-5 flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> 个人自述（可选）</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-medium mb-1.5 block">个人优势</label>
              <textarea className="w-full rounded-lg border bg-background px-4 py-3 text-sm min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={input.personal_strengths} onChange={(e) => onUpdate("personal_strengths", e.target.value)}
                placeholder="描述你的核心竞争力，如科研能力强、编程基础扎实等" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">个人短板</label>
              <textarea className="w-full rounded-lg border bg-background px-4 py-3 text-sm min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={input.personal_weaknesses} onChange={(e) => onUpdate("personal_weaknesses", e.target.value)}
                placeholder="描述你认为需要提升的方面，如论文产出不足等" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 提交 */}
      <div className="flex justify-center pt-6 pb-4">
        <Button size="lg" onClick={onSubmit} disabled={!canSubmit || isAnalyzing}
          className="gap-2.5 px-10 h-14 text-lg shadow-lg shadow-primary/20 rounded-xl">
          {isAnalyzing ? <><RefreshCw className="h-5 w-5 animate-spin" /> AI 分析中...</> : <><Sparkles className="h-5 w-5" /> 开始智能推荐</>}
        </Button>
      </div>
    </div>
  );
}

/* ================================================================
   辅助组件
   ================================================================ */
function CounterField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (v: number) => void; suffix: string }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      <div className="flex items-center gap-2">
        <div className="flex items-center border rounded-lg overflow-hidden h-11">
          <button onClick={() => onChange(Math.max(0, value - 1))} className="h-full w-11 flex items-center justify-center text-lg text-muted-foreground hover:bg-muted transition-colors">−</button>
          <span className="w-12 text-center font-semibold">{value}</span>
          <button onClick={() => onChange(value + 1)} className="h-full w-11 flex items-center justify-center text-lg text-muted-foreground hover:bg-muted transition-colors">+</button>
        </div>
        <span className="text-sm text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}

function ToggleSwitch({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={() => onChange(!value)}
        className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", value ? "bg-primary" : "bg-muted")}>
        <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform", value ? "translate-x-6" : "translate-x-1")} />
      </button>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function ImportanceSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const level = value <= 25 ? "不太重要" : value <= 50 ? "一般" : value <= 75 ? "比较重要" : "非常重要";
  const color = value <= 25 ? "text-muted-foreground" : value <= 50 ? "text-amber-600" : value <= 75 ? "text-blue-600" : "text-primary";
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <span className={cn("text-sm font-medium", color)}>{level} ({value})</span>
      </div>
      <input type="range" min={0} max={100} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary" />
      <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>不重要</span><span>非常重要</span></div>
    </div>
  );
}

/* ================================================================
   结果展示
   ================================================================ */
function ResultView({ result, input, onReset }: { result: RecommendResult; input: RecommendInput; onReset: () => void }) {
  const [expandedSchool, setExpandedSchool] = useState<number | null>(null);

  const categorySchools = useMemo(() => {
    const g: Record<string, RecommendSchool[]> = { "冲刺": [], "稳妥": [], "保底": [] };
    result.schools.forEach((s) => { if (g[s.category]) g[s.category].push(s); });
    return g;
  }, [result.schools]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* 综合评估 */}
      <Card className="overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-blue-500/10 p-6 sm:p-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2"><BarChart3 className="h-5 w-5 text-violet-600" /> 综合评估报告</h2>
              <p className="text-muted-foreground mt-1">{input.university} · {input.major} · 前 {input.rank_percent}%{input.future_plan && ` · ${input.future_plan}`}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-violet-600">{result.assessment.overall_score}</div>
              <div className="text-sm text-muted-foreground">综合竞争力</div>
            </div>
          </div>
        </div>
        <CardContent className="p-6 sm:p-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">
            {result.assessment.dimensions.map((dim) => (
              <div key={dim.name} className="text-center">
                <div className="relative w-20 h-20 mx-auto mb-2">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/20" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="5"
                      strokeDasharray={`${(dim.score / dim.max_score) * 213.6} 213.6`} className="text-primary" strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">{dim.score}</span>
                </div>
                <p className="text-sm font-medium">{dim.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{dim.comment}</p>
              </div>
            ))}
          </div>
          <div className="bg-muted/30 rounded-xl p-5">
            <p className="text-sm leading-relaxed text-muted-foreground">💡 {result.assessment.summary}</p>
          </div>
        </CardContent>
      </Card>

      {/* 推荐院校 */}
      {(["冲刺", "稳妥", "保底"] as const).map((cat) => {
        const schools = categorySchools[cat];
        if (schools.length === 0) return null;
        const cfg = {
          "冲刺": { icon: Zap, color: "text-red-600", bg: "bg-red-50 dark:bg-red-500/10", border: "border-red-200 dark:border-red-500/20", gradient: "from-red-500/5 to-orange-500/5" },
          "稳妥": { icon: Shield, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-500/10", border: "border-blue-200 dark:border-blue-500/20", gradient: "from-blue-500/5 to-cyan-500/5" },
          "保底": { icon: Star, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/20", gradient: "from-emerald-500/5 to-teal-500/5" },
        }[cat];
        const Icon = cfg.icon;
        return (
          <div key={cat}>
            <div className="flex items-center gap-3 mb-4">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", cfg.bg)}><Icon className={cn("h-5 w-5", cfg.color)} /></div>
              <h3 className="text-lg font-bold">{cat}院校</h3>
              <Badge variant="secondary">{schools.length} 所</Badge>
            </div>
            <div className="space-y-3">
              {schools.map((s) => (
                <Card key={s.id} className={cn("transition-all hover:shadow-md", expandedSchool === s.id && "shadow-md")}>
                  <CardContent className="p-0">
                    <button onClick={() => setExpandedSchool(expandedSchool === s.id ? null : s.id)} className="w-full p-5 text-left">
                      <div className="flex items-center gap-5">
                        <div className={cn("flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl", cfg.bg)}>
                          <span className={cn("text-xl font-bold", cfg.color)}>{s.match_score}</span>
                          <span className="text-[11px] text-muted-foreground">匹配</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-bold">{s.name}</h4>
                            <Badge variant="outline" className="text-xs">{s.level}</Badge>
                            {s.discipline_rank && <Badge variant="secondary" className="text-xs">学科 {s.discipline_rank}</Badge>}
                            {s.tags?.map((t) => <Badge key={t} variant="outline" className="text-xs text-muted-foreground">{t}</Badge>)}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{s.department} · {s.major}</p>
                          <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{s.city}</span>
                            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />录取率 {s.admission_info.rate}</span>
                            <span>难度 {"★".repeat(s.difficulty)}{"☆".repeat(5 - s.difficulty)}</span>
                          </div>
                        </div>
                        {expandedSchool === s.id ? <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />}
                      </div>
                    </button>
                    <AnimatePresence>
                      {expandedSchool === s.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="px-5 pb-5 border-t">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
                              <div>
                                <h5 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-primary" /> 推荐理由</h5>
                                <ul className="space-y-1.5">{s.reasons.map((r, i) => <li key={i} className="text-sm text-muted-foreground flex items-start gap-2"><span className="text-primary mt-0.5">•</span>{r}</li>)}</ul>
                              </div>
                              <div>
                                <h5 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><BarChart3 className="h-4 w-4 text-primary" /> 往年数据</h5>
                                <div className="grid grid-cols-3 gap-3">
                                  {[["录取", s.admission_info.quota], ["报名", s.admission_info.applicants], ["录取率", s.admission_info.rate]].map(([l, v]) => (
                                    <div key={l as string} className="rounded-lg bg-muted/30 p-3 text-center">
                                      <p className="text-base font-bold">{v}</p>
                                      <p className="text-xs text-muted-foreground">{l}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            {s.related_tutors.length > 0 && (
                              <div className="mt-5">
                                <h5 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><GraduationCap className="h-4 w-4 text-primary" /> 相关导师</h5>
                                <div className="flex flex-wrap gap-2">
                                  {s.related_tutors.map((t, i) => (
                                    <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
                                      <span className="text-sm font-medium">{t.name}</span>
                                      <span className="text-xs text-muted-foreground">{t.title}</span>
                                      <Badge variant="secondary" className="text-xs">{t.direction}</Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {/* 时间线 */}
      {result.timeline && result.timeline.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <h3 className="text-lg font-bold mb-5 flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> 推荐时间线</h3>
            <div className="relative">
              <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-muted" />
              <div className="space-y-6">
                {result.timeline.map((t, i) => (
                  <div key={i} className="flex gap-4 relative">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary z-10">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-primary">{t.month}</span>
                        <span className="text-sm font-semibold">{t.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{t.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI 建议 */}
      <Card className="shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <h3 className="text-lg font-bold mb-5 flex items-center gap-2"><Sparkles className="h-5 w-5 text-violet-600" /> AI 个性化建议</h3>
          <div className="space-y-4">
            {result.suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 text-sm font-bold dark:bg-violet-500/20 dark:text-violet-400">{i + 1}</span>
                <p className="text-sm text-muted-foreground leading-relaxed pt-1">{s}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 操作 */}
      <div className="flex justify-center gap-4 pt-4 pb-8">
        <Button variant="outline" size="lg" onClick={onReset} className="gap-2"><RefreshCw className="h-4 w-4" /> 重新分析</Button>
        <Button size="lg" className="gap-2"><FileText className="h-4 w-4" /> 导出报告</Button>
      </div>
    </div>
  );
}
