"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Send, Settings2, Play, Square, RotateCcw,
  Clock, MessageSquare, ChevronRight, Star, AlertTriangle,
  CheckCircle2, Lightbulb, Trophy, BarChart3, Volume2,
  User, Bot, Sparkles, ArrowRight, History, Trash2,
  Video, FileText, Upload, BookOpen, PenLine, Eye,
  ChevronDown, Camera, CameraOff, Monitor, Bookmark,
  Brain, Target, GraduationCap, Plus, Edit3, Search, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  InterviewType, InterviewDifficulty, InterviewConfig,
  InterviewMessage, InterviewResult, InterviewMode,
  ResumeSource, QuestionBankItem,
} from "@/types/ai-tools";
import VoiceChat from "@/components/ai/VoiceChat";
import { startInterview, endInterview } from "@/lib/api";
import { toast } from "sonner";

/* ================================================================
   Mock 数据
   ================================================================ */

const MOCK_QUESTIONS: Record<InterviewType, string[]> = {
  "综合面试": [
    "请简单介绍一下你自己，包括你的学术背景和研究兴趣。",
    "你为什么选择我们学校和这个专业方向？",
    "请介绍一下你参与过的最有成就感的科研项目。",
    "你在本科阶段遇到过最大的挑战是什么？你是如何克服的？",
    "你对未来的研究方向有什么规划？",
    "你认为自己最大的优势和不足分别是什么？",
  ],
  "专业面试": [
    "请解释一下机器学习中过拟合的概念，以及常见的解决方法。",
    "请简述 Transformer 架构的核心思想和自注意力机制。",
    "请解释一下梯度下降算法的原理，以及 SGD、Adam 等优化器的区别。",
    "请介绍一下你了解的深度学习框架，以及它们各自的特点。",
    "请解释一下卷积神经网络的工作原理。",
  ],
  "英语面试": [
    "Please introduce yourself briefly, including your academic background.",
    "Why did you choose this research direction?",
    "Can you describe a research project you have participated in?",
    "What are your strengths and weaknesses?",
    "Where do you see yourself in five years?",
  ],
};

const MOCK_FEEDBACK = [
  { score: 8, comment: "回答条理清晰，内容充实", suggestions: ["可以增加更多具体数据支撑", "注意控制回答时长"] },
  { score: 7, comment: "表达流畅，但可以更深入", suggestions: ["建议结合个人经历举例", "可以提及相关文献"] },
  { score: 9, comment: "非常优秀的回答，逻辑严密", suggestions: ["继续保持这种回答风格"] },
  { score: 6, comment: "回答基本正确，但不够深入", suggestions: ["建议补充更多技术细节", "可以对比不同方法的优劣"] },
];

const MOCK_QUESTION_BANK: QuestionBankItem[] = [
  { id: "q1", question: "请介绍一下你的科研经历，你在项目中承担了什么角色？", category: "科研", custom_tags: ["基于简历-目标检测项目"], answer_outline: "1. 项目背景和目标\n2. 个人负责的具体工作\n3. 遇到的挑战和解决方案\n4. 取得的成果和收获", is_ai_generated: true, is_confirmed: true, difficulty: "中等", source_tag: "基于简历", related_project: "基于深度学习的目标检测系统", practice_count: 3, mastery_level: 4, created_at: "2026-03-28", updated_at: "2026-03-30" },
  { id: "q2", question: "你的 GPA 排名如何？有没有挂科或者成绩不理想的科目？", category: "综合", custom_tags: [], answer_outline: "1. 如实说明排名\n2. 如有不理想科目，解释原因\n3. 强调后续改进和整体上升趋势\n4. 突出核心课程的优异表现", is_ai_generated: true, is_confirmed: true, difficulty: "基础", source_tag: "高频问题", practice_count: 1, mastery_level: 3, created_at: "2026-03-28", updated_at: "2026-03-28" },
  { id: "q3", question: "请用英文介绍一下你最近阅读的一篇论文。", category: "英语", custom_tags: ["基于简历-论文阅读"], answer_outline: "1. Paper title and authors\n2. Main contribution / novelty\n3. Methodology overview\n4. Key results and your thoughts", is_ai_generated: true, is_confirmed: true, difficulty: "困难", source_tag: "基于简历", related_project: "Transformer 相关论文阅读", practice_count: 0, mastery_level: 1, created_at: "2026-03-29", updated_at: "2026-03-29" },
  { id: "q4", question: "你为什么选择保研而不是考研或就业？", category: "综合", custom_tags: [], answer_outline: "1. 对学术研究的热情\n2. 本科阶段的积累和优势\n3. 对目标方向的深入了解\n4. 长期职业规划", is_ai_generated: false, is_confirmed: true, difficulty: "基础", source_tag: "高频问题", practice_count: 5, mastery_level: 5, created_at: "2026-03-25", updated_at: "2026-03-31" },
  { id: "q5", question: "请解释一下你论文中使用的核心算法原理。", category: "专业", custom_tags: ["基于简历-目标检测项目"], answer_outline: "1. 算法的基本思想\n2. 数学公式推导（简化版）\n3. 与其他方法的对比优势\n4. 在你项目中的具体应用", is_ai_generated: true, is_confirmed: true, difficulty: "困难", source_tag: "基于简历", related_project: "基于深度学习的目标检测系统", practice_count: 2, mastery_level: 3, created_at: "2026-03-29", updated_at: "2026-03-30" },
  { id: "q6", question: "你的目标检测项目中，如何处理小目标检测的问题？", category: "专业", custom_tags: ["基于简历-目标检测项目"], answer_outline: "1. 小目标检测的挑战\n2. 使用的技术方案（如FPN、数据增强）\n3. 实验结果对比\n4. 改进空间", is_ai_generated: true, is_confirmed: false, difficulty: "困难", source_tag: "AI推荐", related_project: "基于深度学习的目标检测系统", practice_count: 0, mastery_level: 1, created_at: "2026-03-31", updated_at: "2026-03-31" },
  { id: "q7", question: "你在数学建模竞赛中使用了哪些方法？遇到了什么困难？", category: "科研", custom_tags: ["基于简历-数学建模"], answer_outline: "1. 竞赛题目概述\n2. 选用的建模方法\n3. 遇到的困难和解决过程\n4. 最终成果", is_ai_generated: true, is_confirmed: false, difficulty: "中等", source_tag: "AI推荐", related_project: "数学建模国赛", practice_count: 0, mastery_level: 1, created_at: "2026-03-31", updated_at: "2026-03-31" },
];

const MOCK_HISTORY = [
  { id: "h1", type: "综合面试" as InterviewType, difficulty: "中等" as InterviewDifficulty, score: 78, date: "2026-03-30", duration: 15, questions: 5 },
  { id: "h2", type: "专业面试" as InterviewType, difficulty: "困难" as InterviewDifficulty, score: 65, date: "2026-03-28", duration: 20, questions: 5 },
  { id: "h3", type: "英语面试" as InterviewType, difficulty: "基础" as InterviewDifficulty, score: 82, date: "2026-03-25", duration: 10, questions: 5 },
];

const genId = () => Math.random().toString(36).slice(2, 10);

/* ================================================================
   面试配置面板（增强版）
   ================================================================ */

function ConfigPanel({ config, onChange, onStart, onSwitchTab, starting }: {
  config: InterviewConfig;
  onChange: (c: Partial<InterviewConfig>) => void;
  onStart: () => void;
  onSwitchTab: (tab: string) => void;
  starting?: boolean;
}) {
  const types: InterviewType[] = ["综合面试", "专业面试", "英语面试"];
  const difficulties: InterviewDifficulty[] = ["基础", "中等", "困难"];
  const durations = [10, 15, 20, 30];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 mb-4">
          <Mic className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold">AI 模拟面试</h2>
        <p className="text-muted-foreground mt-2">模拟真实保研面试场景，AI 面试官实时提问与评价</p>
      </div>

      <div className="space-y-5">
        {/* 面试模式选择 */}
        <Card className="shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
          <CardContent className="p-6">
            <label className="text-sm font-semibold mb-3 block">面试模式</label>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => onChange({ mode: "text" })}
                className={cn("relative rounded-xl border-2 p-4 text-left transition-all",
                  config.mode === "text" ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-muted/30 hover:bg-muted/50")}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <MessageSquare className="h-4.5 w-4.5" />
                  </div>
                  <p className="font-semibold text-sm">文字面试</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">通过文字问答，可以反复打磨回答内容</p>
                {config.mode === "text" && <div className="absolute top-2.5 right-2.5"><CheckCircle2 className="h-4 w-4 text-primary" /></div>}
              </button>
              <button onClick={() => onChange({ mode: "voice" })}
                className={cn("relative rounded-xl border-2 p-4 text-left transition-all",
                  config.mode === "voice" ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-muted/30 hover:bg-muted/50")}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600">
                    <Volume2 className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">语音面试</p>
                    <Badge className="text-xs bg-emerald-100 text-emerald-700 mt-0.5">已上线</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">声波形象面试官，真实语音交互</p>
                {config.mode === "voice" && <div className="absolute top-2.5 right-2.5"><CheckCircle2 className="h-4 w-4 text-primary" /></div>}
              </button>
              <button onClick={() => onChange({ mode: "video" })}
                className={cn("relative rounded-xl border-2 p-4 text-left transition-all opacity-75",
                  config.mode === "video" ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-muted/30 hover:bg-muted/50")}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                    <Video className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">视频面试</p>
                    <Badge className="text-xs bg-amber-100 text-amber-700 mt-0.5">即将上线</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">数字人形象 + 唇形同步（开发中）</p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* 简历导入 */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <label className="text-sm font-semibold mb-3 block flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> 导入简历 <span className="text-xs font-normal text-muted-foreground">（AI 将基于简历内容提问）</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => onChange({ resume_source: "platform" })}
                className={cn("rounded-xl border-2 p-4 text-center transition-all",
                  config.resume_source === "platform" ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-muted/30 hover:bg-muted/50")}>
                <GraduationCap className="h-6 w-6 mx-auto mb-1.5 text-primary" />
                <p className="font-medium text-xs">平台简历</p>
                <p className="text-xs text-muted-foreground mt-0.5">使用简历工坊</p>
              </button>
              <button onClick={() => onChange({ resume_source: "upload" })}
                className={cn("rounded-xl border-2 p-4 text-center transition-all",
                  config.resume_source === "upload" ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-muted/30 hover:bg-muted/50")}>
                <Upload className="h-6 w-6 mx-auto mb-1.5 text-emerald-600" />
                <p className="font-medium text-xs">上传文件</p>
                <p className="text-xs text-muted-foreground mt-0.5">PDF / PPT</p>
              </button>
              <button onClick={() => onChange({ resume_source: "none" })}
                className={cn("rounded-xl border-2 p-4 text-center transition-all",
                  config.resume_source === "none" ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-muted/30 hover:bg-muted/50")}>
                <Target className="h-6 w-6 mx-auto mb-1.5 text-amber-600" />
                <p className="font-medium text-xs">不导入</p>
                <p className="text-xs text-muted-foreground mt-0.5">通用题目</p>
              </button>
            </div>
            {config.resume_source === "upload" && (
              <div className="mt-3 rounded-xl border-2 border-dashed p-6 text-center hover:bg-muted/20 transition-colors cursor-pointer">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">点击上传简历或面试 PPT</p>
                <p className="text-xs text-muted-foreground mt-1">支持 PDF、PPT、PPTX 格式，最大 10MB</p>
              </div>
            )}
            {config.resume_source === "platform" && (
              <div className="mt-3 rounded-xl bg-primary/5 border border-primary/20 p-4 flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">我的保研简历</p>
                  <p className="text-xs text-muted-foreground">来自简历工坊 · 最后更新 2026-03-30</p>
                </div>
                <Badge variant="outline" className="text-xs text-green-600 border-green-200">已关联</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 面试类型 + 难度 + 时长 */}
        <Card className="shadow-sm">
          <CardContent className="p-6 space-y-5">
            <div>
              <label className="text-sm font-semibold mb-3 block">面试类型</label>
              <div className="grid grid-cols-3 gap-3">
                {types.map((t) => (
                  <button key={t} onClick={() => onChange({ type: t })}
                    className={cn("rounded-xl border-2 p-4 text-center transition-all",
                      config.type === t ? "border-primary bg-primary/5 shadow-sm" : "border-border/40 bg-muted/30 hover:bg-muted/50")}>
                    <div className="text-2xl mb-1">{t === "综合面试" ? "💬" : t === "专业面试" ? "🔬" : "🌍"}</div>
                    <p className="font-medium text-sm">{t}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold mb-3 block">难度等级</label>
                <div className="flex gap-2">
                  {difficulties.map((d) => (
                    <button key={d} onClick={() => onChange({ difficulty: d })}
                      className={cn("flex-1 rounded-xl border-2 py-2.5 text-sm font-medium transition-all",
                        config.difficulty === d ? "border-primary bg-primary/5" : "border-border/40 bg-muted/30 hover:bg-muted/50")}>
                      {d === "基础" ? "⭐" : d === "中等" ? "⭐⭐" : "⭐⭐⭐"} {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold mb-3 block">面试时长</label>
                <div className="flex gap-2">
                  {durations.map((d) => (
                    <button key={d} onClick={() => onChange({ duration: d })}
                      className={cn("flex-1 rounded-xl border-2 py-2.5 text-sm font-medium transition-all",
                        config.duration === d ? "border-primary bg-primary/5" : "border-border/40 bg-muted/30 hover:bg-muted/50")}>
                      {d}min
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold mb-1.5 block">目标学校</label>
                <Input value={config.target_school} onChange={(e) => onChange({ target_school: e.target.value })} placeholder="如：北京大学" className="h-10" />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">目标专业</label>
                <Input value={config.target_major} onChange={(e) => onChange({ target_major: e.target.value })} placeholder="如：计算机科学" className="h-10" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-muted/30 p-4">
              <div>
                <p className="font-medium text-sm">实时评价反馈</p>
                <p className="text-xs text-muted-foreground mt-0.5">每次回答后显示 AI 评分和建议</p>
              </div>
              <button onClick={() => onChange({ realtime_feedback: !config.realtime_feedback })}
                className={cn("relative h-6 w-11 rounded-full transition-colors",
                  config.realtime_feedback ? "bg-primary" : "bg-muted-foreground/20")}>
                <div className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  config.realtime_feedback ? "translate-x-5.5" : "translate-x-0.5")} />
              </button>
            </div>
          </CardContent>
        </Card>

        <Button onClick={onStart} size="lg" className="w-full h-12 text-base gap-2" disabled={config.mode === "video" || starting}>
          {config.mode === "video" ? (
            <>🔜 视频面试即将上线</>
          ) : starting ? (
            <>正在建立会话…</>
          ) : config.mode === "voice" ? (
            <><Volume2 className="h-5 w-5" /> 开始语音面试</>
          ) : (
            <><Play className="h-5 w-5" /> 开始面试</>
          )}
        </Button>
      </div>
    </div>
  );
}

/* ================================================================
   个人题库
   ================================================================ */

function QuestionBank() {
  const [questions, setQuestions] = useState(MOCK_QUESTION_BANK);
  const [filter, setFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newCategory, setNewCategory] = useState("综合");
  const [newDifficulty, setNewDifficulty] = useState<InterviewDifficulty>("中等");
  const [newOutline, setNewOutline] = useState("");
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "project">("list");

  const systemCategories = ["all", "综合", "专业", "英语", "科研"];
  // 从题目中提取项目分类
  const projectCategories = Array.from(new Set(questions.filter((q) => q.related_project).map((q) => q.related_project!)));
  const pendingCount = questions.filter((q) => q.is_ai_generated && !q.is_confirmed).length;

  const filtered = questions
    .filter((q) => filter === "all" || q.category === filter)
    .filter((q) => projectFilter === "all" || q.related_project === projectFilter)
    .filter((q) => !showPendingOnly || (q.is_ai_generated && !q.is_confirmed))
    .filter((q) => !searchKeyword || q.question.includes(searchKeyword) || q.answer_outline.includes(searchKeyword));

  const masteryColor = (level: number) => {
    if (level >= 4) return "text-green-600 bg-green-50";
    if (level >= 2) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const masteryLabel = (level: number) => {
    if (level >= 4) return "熟练";
    if (level >= 2) return "一般";
    return "生疏";
  };

  const confirmQuestion = (id: string) => {
    setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, is_confirmed: true } : q));
  };

  const rejectQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const confirmAll = () => {
    setQuestions((prev) => prev.map((q) => ({ ...q, is_confirmed: true })));
  };

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    const q: QuestionBankItem = {
      id: `q_${Date.now()}`, question: newQuestion.trim(), category: newCategory,
      custom_tags: [], answer_outline: newOutline || "待补充回答思路",
      is_ai_generated: false, is_confirmed: true, difficulty: newDifficulty,
      source_tag: "用户添加", practice_count: 0, mastery_level: 1,
      created_at: new Date().toISOString().split("T")[0],
      updated_at: new Date().toISOString().split("T")[0],
    };
    setQuestions((prev) => [q, ...prev]);
    setNewQuestion(""); setNewOutline(""); setShowAddForm(false);
  };

  const deleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // 按项目分组
  const groupedByProject = projectCategories.map((proj) => ({
    project: proj,
    questions: filtered.filter((q) => q.related_project === proj),
  }));
  const noProjectQuestions = filtered.filter((q) => !q.related_project);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 mb-4">
          <Brain className="h-8 w-8 text-violet-600" />
        </div>
        <h2 className="text-2xl font-bold">个人专属题库</h2>
        <p className="text-muted-foreground mt-2">AI 根据你的简历和背景生成面试题目，你可以审核、编辑和自行添加</p>
      </div>

      {/* AI 待审核提示 */}
      {pendingCount > 0 && (
        <div className="mb-5 rounded-xl bg-amber-50/80 dark:bg-amber-500/5 border border-amber-200/50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">AI 推荐了 {pendingCount} 道新题目</p>
              <p className="text-xs text-amber-600/70">基于你的简历和面试目标生成，请审核确认</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setShowPendingOnly(!showPendingOnly)}>
              {showPendingOnly ? "查看全部" : "查看待审核"}
            </Button>
            <Button size="sm" className="text-xs h-8 bg-amber-500 hover:bg-amber-600" onClick={confirmAll}>
              全部接受
            </Button>
          </div>
        </div>
      )}

      {/* 搜索 + 筛选 */}
      <div className="mb-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="搜索题目..." className="pl-10 h-10" />
        </div>

        {/* 视图切换 + 操作 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 视图模式 */}
            <div className="flex gap-1 bg-muted/50 backdrop-blur-sm shadow-sm rounded-lg p-0.5">
              <button onClick={() => setViewMode("list")}
                className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                  viewMode === "list" ? "bg-background shadow-sm" : "text-muted-foreground hover:bg-background/50")}>
                列表视图
              </button>
              <button onClick={() => setViewMode("project")}
                className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                  viewMode === "project" ? "bg-background shadow-sm" : "text-muted-foreground hover:bg-background/50")}>
                项目分组
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="h-3.5 w-3.5" /> 手动添加
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
              <Sparkles className="h-3.5 w-3.5" /> AI 生成更多
            </Button>
          </div>
        </div>

        {/* 系统分类筛选 */}
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium self-center mr-1">类别：</span>
          {systemCategories.map((c) => (
            <button key={c} onClick={() => setFilter(c)}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                filter === c ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
              {c === "all" ? "全部" : c}
            </button>
          ))}
        </div>

        {/* 项目分类筛选 */}
        {projectCategories.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium self-center mr-1">项目：</span>
            <button onClick={() => setProjectFilter("all")}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                projectFilter === "all" ? "bg-violet-500 text-white shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
              全部项目
            </button>
            {projectCategories.map((p) => (
              <button key={p} onClick={() => setProjectFilter(p)}
                className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  projectFilter === p ? "bg-violet-500 text-white shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
                📁 {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 手动添加表单 */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-5">
            <Card className="shadow-sm border-dashed border-2 border-primary/30">
              <CardContent className="p-5 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> 添加自定义题目</h4>
                <textarea value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="输入面试题目..."
                  className="w-full rounded-xl border bg-background px-4 py-3 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-primary/20" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">分类</label>
                    <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                      {systemCategories.filter((c) => c !== "all").map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">难度</label>
                    <select value={newDifficulty} onChange={(e) => setNewDifficulty(e.target.value as InterviewDifficulty)}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                      <option value="基础">基础</option>
                      <option value="中等">中等</option>
                      <option value="困难">困难</option>
                    </select>
                  </div>
                </div>
                <textarea value={newOutline} onChange={(e) => setNewOutline(e.target.value)}
                  placeholder="回答思路（可选）..."
                  className="w-full rounded-xl border bg-background px-4 py-3 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-primary/20" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={addQuestion} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> 添加</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>取消</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 题目列表 */}
      {viewMode === "list" ? (
        <div className="space-y-3">
          {filtered.map((q) => (
            <QuestionCard key={q.id} q={q}
              editingId={editingId} editContent={editContent}
              setEditingId={setEditingId} setEditContent={setEditContent}
              setQuestions={setQuestions} confirmQuestion={confirmQuestion}
              rejectQuestion={rejectQuestion} deleteQuestion={deleteQuestion}
              masteryColor={masteryColor} masteryLabel={masteryLabel} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByProject.map(({ project, questions: pqs }) => (
            pqs.length > 0 && (
              <div key={project}>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-100 text-violet-600 text-xs">📁</span>
                  {project}
                  <Badge variant="secondary" className="text-xs">{pqs.length} 题</Badge>
                </h3>
                <div className="space-y-3 pl-2 border-l-2 border-violet-200/50">
                  {pqs.map((q) => (
                    <QuestionCard key={q.id} q={q}
                      editingId={editingId} editContent={editContent}
                      setEditingId={setEditingId} setEditContent={setEditContent}
                      setQuestions={setQuestions} confirmQuestion={confirmQuestion}
                      rejectQuestion={rejectQuestion} deleteQuestion={deleteQuestion}
                      masteryColor={masteryColor} masteryLabel={masteryLabel} />
                  ))}
                </div>
              </div>
            )
          ))}
          {noProjectQuestions.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 text-gray-600 text-xs">📋</span>
                通用题目
                <Badge variant="secondary" className="text-xs">{noProjectQuestions.length} 题</Badge>
              </h3>
              <div className="space-y-3 pl-2 border-l-2 border-gray-200/50">
                {noProjectQuestions.map((q) => (
                  <QuestionCard key={q.id} q={q}
                    editingId={editingId} editContent={editContent}
                    setEditingId={setEditingId} setEditContent={setEditContent}
                    setQuestions={setQuestions} confirmQuestion={confirmQuestion}
                    rejectQuestion={rejectQuestion} deleteQuestion={deleteQuestion}
                    masteryColor={masteryColor} masteryLabel={masteryLabel} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">暂无匹配的题目</p>
        </div>
      )}

      <div className="text-center text-xs text-muted-foreground py-4">
        共 {filtered.length} 道题目 · {questions.filter((q) => q.is_ai_generated).length} 道 AI 生成 · {questions.filter((q) => !q.is_ai_generated).length} 道手动添加
      </div>
    </div>
  );
}

/* 题目卡片子组件 */
function QuestionCard({ q, editingId, editContent, setEditingId, setEditContent, setQuestions, confirmQuestion, rejectQuestion, deleteQuestion, masteryColor, masteryLabel }: {
  q: QuestionBankItem;
  editingId: string | null;
  editContent: string;
  setEditingId: (id: string | null) => void;
  setEditContent: (c: string) => void;
  setQuestions: React.Dispatch<React.SetStateAction<QuestionBankItem[]>>;
  confirmQuestion: (id: string) => void;
  rejectQuestion: (id: string) => void;
  deleteQuestion: (id: string) => void;
  masteryColor: (l: number) => string;
  masteryLabel: (l: number) => string;
}) {
  const isPending = q.is_ai_generated && !q.is_confirmed;

  return (
    <Card className={cn("shadow-sm hover:shadow-md transition-all", isPending && "border-amber-300/50 bg-amber-50/20 dark:bg-amber-500/5")}>
      <CardContent className="p-5">
        {/* 待审核标记 */}
        {isPending && (
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-amber-200/50">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-semibold text-amber-700">AI 推荐 · 待审核</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50" onClick={() => rejectQuestion(q.id)}>
                <X className="h-3 w-3" /> 移除
              </Button>
              <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-500 hover:bg-emerald-600" onClick={() => confirmQuestion(q.id)}>
                <CheckCircle2 className="h-3 w-3" /> 接受
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge variant="outline" className="text-xs">{q.category}</Badge>
              <Badge variant="outline" className="text-xs">{q.difficulty}</Badge>
              {q.source_tag && <Badge className="text-xs bg-blue-100 text-blue-700">{q.source_tag}</Badge>}
              {q.is_ai_generated && q.is_confirmed && <Badge className="text-xs bg-violet-100 text-violet-700"><Sparkles className="h-2.5 w-2.5 mr-0.5" /> AI</Badge>}
              {!q.is_ai_generated && <Badge className="text-xs bg-emerald-100 text-emerald-700">手动添加</Badge>}
              {q.related_project && <Badge variant="secondary" className="text-xs">📁 {q.related_project}</Badge>}
            </div>
            <h4 className="font-semibold text-sm leading-relaxed">{q.question}</h4>
          </div>
          {q.is_confirmed && (
            <div className={cn("flex flex-col items-center rounded-lg px-2.5 py-1.5 shrink-0", masteryColor(q.mastery_level))}>
              <span className="text-lg font-bold">{q.mastery_level}</span>
              <span className="text-xs">{masteryLabel(q.mastery_level)}</span>
            </div>
          )}
        </div>

        {/* 回答思路 */}
        <div className="rounded-xl bg-muted/30 p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Lightbulb className="h-3.5 w-3.5" /> 回答思路</p>
            <button onClick={() => { setEditingId(editingId === q.id ? null : q.id); setEditContent(q.answer_outline); }}
              className="text-xs text-primary hover:underline flex items-center gap-1">
              <Edit3 className="h-3 w-3" /> {editingId === q.id ? "取消" : "编辑"}
            </button>
          </div>
          {editingId === q.id ? (
            <div>
              <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-primary/20" />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={() => {
                  setQuestions((prev) => prev.map((item) => item.id === q.id ? { ...item, answer_outline: editContent, updated_at: new Date().toISOString() } : item));
                  setEditingId(null);
                }}>保存</Button>
                <Button size="sm" variant="outline" className="gap-1"><Sparkles className="h-3 w-3" /> AI 优化</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{q.answer_outline}</p>
          )}
        </div>

        {/* 底部信息 */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>练习 {q.practice_count} 次</span>
            {q.last_practiced && <span>最近：{q.last_practiced}</span>}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteQuestion(q.id)}>
              <Trash2 className="h-3 w-3" /> 删除
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"><Play className="h-3 w-3" /> 练习</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ================================================================
   面试历史
   ================================================================ */

function InterviewHistoryPanel({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 mb-4">
          <History className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold">面试记录</h2>
        <p className="text-muted-foreground mt-2">回顾历次面试表现，追踪进步轨迹</p>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="shadow-sm"><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-primary">{MOCK_HISTORY.length}</div>
          <p className="text-xs text-muted-foreground mt-1">总面试次数</p>
        </CardContent></Card>
        <Card className="shadow-sm"><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{Math.round(MOCK_HISTORY.reduce((s, h) => s + h.score, 0) / MOCK_HISTORY.length)}</div>
          <p className="text-xs text-muted-foreground mt-1">平均分</p>
        </CardContent></Card>
        <Card className="shadow-sm"><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{Math.max(...MOCK_HISTORY.map((h) => h.score))}</div>
          <p className="text-xs text-muted-foreground mt-1">最高分</p>
        </CardContent></Card>
      </div>

      {/* 历史列表 */}
      <div className="space-y-3">
        {MOCK_HISTORY.map((h) => (
          <Card key={h.id} className="shadow-sm hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-xl font-bold",
                h.score >= 80 ? "bg-green-50 text-green-600" : h.score >= 60 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600")}>
                {h.score}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{h.type}</h4>
                  <Badge variant="outline" className="text-xs">{h.difficulty}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {h.duration} 分钟</span>
                  <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {h.questions} 道题</span>
                  <span>{h.date}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="h-3 w-3" /> 复盘
                </Button>
                <Button variant="ghost" size="sm" className="gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  <RotateCcw className="h-3 w-3" /> 重做
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   面试对话界面（保持原有逻辑）
   ================================================================ */

function InterviewRoom({ config, onEnd }: {
  config: InterviewConfig;
  onEnd: (messages: InterviewMessage[]) => void;
}) {
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const questions = MOCK_QUESTIONS[config.type];
    const resumeNote = config.resume_source !== "none" ? "\n📄 已加载你的简历，面试问题将结合你的个人背景。" : "";
    const greeting: InterviewMessage = {
      id: genId(), role: "system",
      content: `欢迎参加${config.type}模拟面试。本次面试时长 ${config.duration} 分钟，难度为「${config.difficulty}」。${config.target_school ? `目标院校：${config.target_school}` : ""}${config.target_major ? `，目标专业：${config.target_major}` : ""}。${resumeNote}\n\n准备好后，面试官将开始提问。`,
      timestamp: new Date().toISOString(),
    };
    const firstQ: InterviewMessage = {
      id: genId(), role: "interviewer", content: questions[0], timestamp: new Date().toISOString(),
    };
    setTimeout(() => setMessages([greeting]), 300);
    setTimeout(() => { setMessages((p) => [...p, firstQ]); setQuestionIndex(1); }, 1500);
  }, [config]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isThinking) return;
    const userMsg: InterviewMessage = { id: genId(), role: "user", content: input.trim(), timestamp: new Date().toISOString() };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setIsThinking(true);

    const questions = MOCK_QUESTIONS[config.type];
    setTimeout(() => {
      if (config.realtime_feedback) {
        const fb = MOCK_FEEDBACK[Math.floor(Math.random() * MOCK_FEEDBACK.length)];
        setMessages((p) => [...p, { id: genId(), role: "system", content: `📊 评分：${fb.score}/10 — ${fb.comment}\n💡 建议：${fb.suggestions.join("；")}`, timestamp: new Date().toISOString() }]);
      }
      setTimeout(() => {
        if (questionIndex < questions.length) {
          setMessages((p) => [...p, { id: genId(), role: "interviewer", content: questions[questionIndex], timestamp: new Date().toISOString() }]);
          setQuestionIndex((p) => p + 1);
        } else {
          setMessages((p) => [...p, { id: genId(), role: "system", content: "面试结束！感谢你的参与。点击「结束面试」查看详细评估报告。", timestamp: new Date().toISOString() }]);
        }
        setIsThinking(false);
      }, 800);
    }, 1200);
  }, [input, isThinking, config, questionIndex]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const questions = MOCK_QUESTIONS[config.type];
  const progress = Math.min(questionIndex / questions.length * 100, 100);

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
      <div className="flex items-center justify-between rounded-xl bg-muted/30 px-5 py-3 mb-4">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="gap-1.5"><div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> 面试中</Badge>
          <span className="text-sm text-muted-foreground">{config.type} · {config.difficulty}</span>
          {config.resume_source !== "none" && <Badge className="text-xs bg-blue-100 text-blue-700"><FileText className="h-3 w-3 mr-0.5" /> 简历已加载</Badge>}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Clock className="h-4 w-4" /> <span className="font-mono tabular-nums text-foreground font-semibold">{formatTime(elapsed)}</span></div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><MessageSquare className="h-4 w-4" /> {questionIndex}/{questions.length}</div>
        </div>
      </div>

      <div className="h-1 rounded-full bg-muted/50 mb-4 overflow-hidden">
        <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
      </div>

      <div ref={chatRef} className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
              {msg.role !== "user" && (
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  msg.role === "interviewer" ? "bg-blue-100 text-blue-600" : "bg-muted text-muted-foreground")}>
                  {msg.role === "interviewer" ? <Bot className="h-4.5 w-4.5" /> : <Sparkles className="h-4 w-4" />}
                </div>
              )}
              {msg.role === "user" && <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><User className="h-4.5 w-4.5" /></div>}
              <div className={cn("max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                msg.role === "user" ? "bg-primary text-primary-foreground" :
                msg.role === "interviewer" ? "bg-blue-50 dark:bg-blue-500/10 text-foreground" :
                "bg-muted/50 text-muted-foreground italic")}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isThinking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600"><Bot className="h-4.5 w-4.5" /></div>
            <div className="rounded-2xl bg-blue-50 dark:bg-blue-500/10 px-4 py-3">
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <Input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="输入你的回答..." className="h-12 text-sm" disabled={isThinking} />
        <Button onClick={handleSend} disabled={!input.trim() || isThinking} size="lg" className="h-12 px-5 gap-2"><Send className="h-4 w-4" /> 发送</Button>
        <Button onClick={() => { clearInterval(timerRef.current); onEnd(messages); }} variant="outline" size="lg" className="h-12 px-5 gap-2"><Square className="h-4 w-4" /> 结束</Button>
      </div>
    </div>
  );
}

/* ================================================================
   面试结果（保持原有逻辑）
   ================================================================ */

function ResultPanel({ result, onRetry }: { result: InterviewResult; onRetry: () => void }) {
  const scoreColor = result.overall_score >= 80 ? "text-green-600" : result.overall_score >= 60 ? "text-amber-600" : "text-red-600";
  const scoreLabel = result.overall_score >= 80 ? "优秀" : result.overall_score >= 60 ? "良好" : "需加强";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className="shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-500" />
        <CardContent className="p-8 text-center">
          <h2 className="text-xl font-bold mb-4">面试评估报告</h2>
          <div className={cn("text-6xl font-bold mb-2", scoreColor)}>{result.overall_score}</div>
          <Badge className={cn("text-sm", result.overall_score >= 80 ? "bg-green-100 text-green-700" : result.overall_score >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>{scoreLabel}</Badge>
          <div className="flex justify-center gap-8 mt-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {Math.floor(result.duration / 60)} 分钟</span>
            <span className="flex items-center gap-1.5"><MessageSquare className="h-4 w-4" /> {result.question_count} 道题</span>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm"><CardContent className="p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> 各维度评分</h3>
        <div className="space-y-4">
          {result.dimensions.map((d) => (
            <div key={d.name}>
              <div className="flex justify-between text-sm mb-1.5"><span className="font-medium">{d.name}</span><span className="text-muted-foreground">{d.score}/{d.max_score}</span></div>
              <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-primary to-blue-400" initial={{ width: 0 }} animate={{ width: `${(d.score / d.max_score) * 100}%` }} transition={{ duration: 0.8, delay: 0.2 }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{d.comment}</p>
            </div>
          ))}
        </div>
      </CardContent></Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="shadow-sm"><CardContent className="p-6">
          <h3 className="font-bold mb-3 flex items-center gap-2 text-green-600"><CheckCircle2 className="h-5 w-5" /> 你的优势</h3>
          <ul className="space-y-2">{result.strengths.map((s, i) => (<li key={i} className="flex items-start gap-2 text-sm"><Star className="h-4 w-4 text-green-500 shrink-0 mt-0.5" /> {s}</li>))}</ul>
        </CardContent></Card>
        <Card className="shadow-sm"><CardContent className="p-6">
          <h3 className="font-bold mb-3 flex items-center gap-2 text-amber-600"><AlertTriangle className="h-5 w-5" /> 待改进</h3>
          <ul className="space-y-2">{result.improvements.map((s, i) => (<li key={i} className="flex items-start gap-2 text-sm"><Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" /> {s}</li>))}</ul>
        </CardContent></Card>
      </div>

      <Card className="shadow-sm"><CardContent className="p-6">
        <h3 className="font-bold mb-3">总体评价</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
      </CardContent></Card>

      <Card className="shadow-sm"><CardContent className="p-6">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> 推荐练习题目</h3>
        <ul className="space-y-2">{result.recommended_questions.map((q, i) => (<li key={i} className="flex items-start gap-2 text-sm"><ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {q}</li>))}</ul>
      </CardContent></Card>

      <div className="flex gap-3 justify-center">
        <Button onClick={onRetry} size="lg" className="gap-2"><RotateCcw className="h-4 w-4" /> 再来一次</Button>
      </div>
    </div>
  );
}

/* ================================================================
   主页面（增强版 - 多 Tab）
   ================================================================ */

const MOCK_RESULT: InterviewResult = {
  overall_score: 78,
  dimensions: [
    { name: "表达能力", score: 82, max_score: 100, comment: "语言组织清晰，逻辑性强" },
    { name: "专业知识", score: 75, max_score: 100, comment: "基础扎实，但部分前沿知识需加强" },
    { name: "应变能力", score: 70, max_score: 100, comment: "面对追问时略有紧张，建议多练习" },
    { name: "综合素质", score: 85, max_score: 100, comment: "态度积极，展现了良好的学术热情" },
  ],
  strengths: ["回答条理清晰，善于使用结构化表达", "科研经历描述详实，突出了个人贡献", "对目标方向有较深入的了解"],
  improvements: ["部分专业问题回答不够深入，建议加强基础理论学习", "英语表达可以更加流畅自然", "面对压力问题时可以更加从容"],
  summary: "整体表现良好，展现了扎实的学术基础和积极的科研态度。建议在专业知识深度和英语口语方面继续加强，同时多进行模拟面试练习以提升应变能力。",
  recommended_questions: ["请详细解释 Attention 机制的数学原理", "如何评价一个机器学习模型的泛化能力？", "请用英语描述你最近阅读的一篇论文", "如果导师的研究方向和你的兴趣不完全一致，你会怎么做？"],
  duration: 720, question_count: 5,
};

const TABS = [
  { id: "interview", label: "模拟面试", icon: Mic },
  { id: "question-bank", label: "个人题库", icon: Brain },
  { id: "history", label: "面试记录", icon: History },
];

export default function InterviewPage() {
  const [activeTab, setActiveTab] = useState("interview");
  const [phase, setPhase] = useState<"config" | "interview" | "result">("config");
  const [config, setConfig] = useState<InterviewConfig>({
    mode: "text", type: "综合面试", difficulty: "中等",
    target_school: "", target_major: "", duration: 15,
    realtime_feedback: true, resume_source: "none",
  });
  const [voiceSessionId, setVoiceSessionId] = useState<string | null>(null);
  const [voiceReport, setVoiceReport] = useState<InterviewResult | null>(null);
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    if (config.mode !== "voice") {
      setPhase("interview");
      return;
    }
    // 语音面试：先调后端创建 session
    setStarting(true);
    try {
      const typeMap: Record<InterviewType, string> = { "综合面试": "综合", "专业面试": "专业", "英语面试": "英语" };
      const res = await startInterview({
        type: typeMap[config.type],
        difficulty: config.difficulty,
        target_school: config.target_school || undefined,
        target_major: config.target_major || undefined,
        duration_minutes: config.duration,
      });
      setVoiceSessionId(String(res.session_id));
      setPhase("interview");
    } catch (err) {
      console.error(err);
      toast.error("开始语音面试失败，请先登录或检查网络");
    } finally {
      setStarting(false);
    }
  };

  const handleEnd = () => setPhase("result");
  const handleRetry = () => {
    setVoiceSessionId(null);
    setVoiceReport(null);
    setPhase("config");
  };

  const handleVoiceExit = async () => {
    if (!voiceSessionId) { setPhase("result"); return; }
    try {
      const rawReport = await endInterview(voiceSessionId);
      // 把后端 report 结构映射为前端 InterviewResult
      const dims = (rawReport.dimensions ?? {}) as Record<string, { score?: number; label?: string }>;
      const mapped: InterviewResult = {
        overall_score: Number(rawReport.total_score) || 0,
        dimensions: Object.entries(dims).map(([, v]) => ({
          name: v?.label ?? "",
          score: Number(v?.score) || 0,
          max_score: 100,
          comment: "",
        })),
        strengths: (rawReport.strengths as string[]) ?? [],
        improvements: (rawReport.improvements as string[]) ?? [],
        summary: (rawReport.overall as string) ?? "",
        recommended_questions: [],
        duration: 0,
        question_count: Number(rawReport.questions_count) || 0,
      };
      setVoiceReport(mapped);
    } catch (err) {
      console.error(err);
      toast.error("获取评估报告失败，展示默认结果");
    }
    setPhase("result");
  };

  return (
    <div>
      {/* 顶部 Tab 切换（仅在非面试中显示） */}
      {phase === "config" && (
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-xl bg-muted/50 backdrop-blur-sm shadow-sm p-1 gap-1">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  activeTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50")}>
                <tab.icon className="h-4 w-4" /> {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === "interview" && phase === "config" && (
          <motion.div key="config" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <ConfigPanel config={config} onChange={(c) => setConfig((p) => ({ ...p, ...c }))} onStart={handleStart} onSwitchTab={setActiveTab} starting={starting} />
          </motion.div>
        )}
        {activeTab === "interview" && phase === "interview" && config.mode !== "voice" && (
          <motion.div key="interview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <InterviewRoom config={config} onEnd={handleEnd} />
          </motion.div>
        )}
        {activeTab === "interview" && phase === "interview" && config.mode === "voice" && voiceSessionId && (
          <motion.div key="voice-interview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <VoiceChat
              mode={{ kind: "interview", sessionId: voiceSessionId, autoPlayFirstQuestion: true }}
              title={`${config.type} · 语音模式`}
              subtitle={`${config.difficulty}难度 · ${config.target_school || "通用院校"} ${config.target_major || ""}`.trim()}
              onExit={handleVoiceExit}
            />
          </motion.div>
        )}
        {activeTab === "interview" && phase === "result" && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <ResultPanel result={voiceReport ?? MOCK_RESULT} onRetry={handleRetry} />
          </motion.div>
        )}
        {activeTab === "question-bank" && (
          <motion.div key="qb" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <QuestionBank />
          </motion.div>
        )}
        {activeTab === "history" && (
          <motion.div key="history" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <InterviewHistoryPanel onBack={() => setActiveTab("interview")} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
