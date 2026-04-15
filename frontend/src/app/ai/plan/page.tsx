"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Target, BookOpen, Trophy, GraduationCap,
  ChevronRight, ChevronDown, Sparkles, BarChart3,
  CheckCircle2, Circle, Clock, Star, Lightbulb,
  ArrowRight, RotateCcw, Flame, Zap, TrendingUp,
  AlertTriangle, ExternalLink, Minus, Plus,
  Save, History, Edit3, Award, FileText,
  LayoutGrid, List, GanttChart, Kanban,
  RefreshCw, PenLine, Trash2, Eye, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PlanInput, PlanResult, PlanTimelineNode, PlanViewMode, AchievementRecord } from "@/types/ai-tools";

/* ================================================================
   常量
   ================================================================ */

const GRADE_OPTIONS = ["大一", "大二", "大三", "大四"];
const LEVEL_OPTIONS = ["顶尖 985", "中上 985", "末流 985 / 顶尖 211", "211", "双一流", "普通一本"];
const ENGLISH_OPTIONS = ["六级 600+", "六级 550+", "六级 500+", "六级 425+", "四级通过", "尚未通过四级"];
const WEAKNESS_OPTIONS = ["科研经历不足", "论文发表较少", "竞赛获奖不够", "英语水平偏低", "GPA 排名靠后", "面试经验不足", "缺乏推荐信", "目标不够明确"];

const PLAN_TABS = [
  { id: "plan", label: "我的规划", icon: Calendar },
  { id: "versions", label: "规划历史", icon: History },
];

const VIEW_MODES: { id: PlanViewMode; label: string; icon: React.ReactNode }[] = [
  { id: "timeline", label: "时间线", icon: <List className="h-4 w-4" /> },
  { id: "progress", label: "进度条", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "kanban", label: "看板", icon: <LayoutGrid className="h-4 w-4" /> },
];

/* ================================================================
   Mock 数据
   ================================================================ */

const MOCK_RESULT: PlanResult = {
  assessment: "根据你目前的背景分析，你的综合竞争力处于中上水平。GPA 排名和科研经历是你的优势，但论文发表和竞赛获奖方面还有提升空间。建议在接下来的时间里重点加强这两个方面，同时保持 GPA 的稳定。",
  competitiveness_score: 72,
  timeline: [
    { id: "1", month: "2026-01", title: "基础夯实期", description: "巩固专业基础，开始科研准备", status: "completed",
      tasks: [
        { id: "t1", content: "确定目标院校和专业方向（3-5 所）", is_completed: true, priority: "high" },
        { id: "t2", content: "联系本校导师，争取进入实验室", is_completed: true, priority: "high" },
        { id: "t3", content: "开始准备英语六级/雅思", is_completed: false, priority: "medium" },
        { id: "t4", content: "梳理本科课程知识体系", is_completed: true, priority: "medium" },
      ] },
    { id: "2", month: "2026-03", title: "科研深耕期", description: "深入科研项目，积累成果", status: "in_progress",
      tasks: [
        { id: "t5", content: "参与至少 1 个科研项目并承担核心工作", is_completed: false, priority: "high" },
        { id: "t6", content: "开始撰写论文初稿", is_completed: false, priority: "high" },
        { id: "t7", content: "参加 1-2 个学科竞赛", is_completed: false, priority: "medium" },
        { id: "t8", content: "关注目标院校夏令营通知", is_completed: false, priority: "medium" },
      ] },
    { id: "3", month: "2026-05", title: "材料准备期", description: "准备申请材料，投递夏令营", status: "upcoming",
      tasks: [
        { id: "t9", content: "完善个人简历（学术版）", is_completed: false, priority: "high" },
        { id: "t10", content: "准备个人陈述 / 研究计划", is_completed: false, priority: "high" },
        { id: "t11", content: "联系推荐信老师（至少 2 位）", is_completed: false, priority: "high" },
        { id: "t12", content: "投递 3-5 所目标院校夏令营", is_completed: false, priority: "high" },
        { id: "t13", content: "准备成绩单、获奖证书等材料", is_completed: false, priority: "medium" },
      ] },
    { id: "4", month: "2026-07", title: "夏令营冲刺期", description: "参加夏令营，争取优秀营员", status: "upcoming",
      tasks: [
        { id: "t14", content: "准备面试常见问题（中英文）", is_completed: false, priority: "high" },
        { id: "t15", content: "模拟面试练习（至少 3 次）", is_completed: false, priority: "high" },
        { id: "t16", content: "复习专业课核心知识点", is_completed: false, priority: "high" },
        { id: "t17", content: "准备英文自我介绍和研究介绍", is_completed: false, priority: "medium" },
      ] },
    { id: "5", month: "2026-09", title: "预推免阶段", description: "参加预推免，确定最终去向", status: "upcoming",
      tasks: [
        { id: "t18", content: "根据夏令营结果调整策略", is_completed: false, priority: "high" },
        { id: "t19", content: "投递预推免申请", is_completed: false, priority: "high" },
        { id: "t20", content: "参加预推免面试", is_completed: false, priority: "high" },
        { id: "t21", content: "确认录取，完成系统填报", is_completed: false, priority: "high" },
      ] },
  ],
  key_suggestions: [
    { category: "科研", content: "尽快确定一个明确的研究方向，并在该方向上深耕。", priority: "high" },
    { category: "论文", content: "争取在投递夏令营前有至少 1 篇论文投稿记录。", priority: "high" },
    { category: "竞赛", content: "选择 1-2 个含金量高的竞赛参加。", priority: "medium" },
    { category: "英语", content: "六级成绩建议尽早刷到 550+ 分。", priority: "medium" },
    { category: "人脉", content: "提前联系目标导师，拓展学术人脉。", priority: "low" },
  ],
  resources: [
    { title: "保研时间线完整攻略", description: "从大一到大四的保研准备全流程", url: "#", type: "攻略" },
    { title: "夏令营申请材料模板", description: "个人陈述、研究计划等模板下载", url: "#", type: "模板" },
    { title: "面试高频问题汇总", description: "100+ 保研面试真题及参考答案", url: "#", type: "题库" },
    { title: "推荐信撰写指南", description: "如何请老师写推荐信及注意事项", url: "#", type: "指南" },
  ],
};

const MOCK_ACHIEVEMENTS: AchievementRecord[] = [
  { id: "a1", type: "科研", title: "加入 XX 实验室", description: "成功加入导师实验室，参与 NLP 方向研究项目", date: "2026-01-15", importance: "high", created_at: "2026-01-15" },
  { id: "a2", type: "英语", title: "六级 560 分", description: "12 月六级考试取得 560 分", date: "2026-02-20", importance: "medium", created_at: "2026-02-20" },
  { id: "a3", type: "竞赛", title: "数学建模省一等奖", description: "全国大学生数学建模竞赛获省级一等奖", date: "2026-03-10", importance: "high", created_at: "2026-03-10" },
  { id: "a4", type: "论文", title: "论文初稿完成", description: "完成第一篇论文初稿，准备投稿 ACL Workshop", date: "2026-03-25", importance: "high", created_at: "2026-03-25" },
];

const MOCK_VERSIONS = [
  { id: "v1", version: 1, date: "2026-01-10", score: 58, note: "初始规划" },
  { id: "v2", version: 2, date: "2026-02-15", score: 65, note: "更新：加入实验室后调整科研计划" },
  { id: "v3", version: 3, date: "2026-03-20", score: 72, note: "更新：竞赛获奖后重新评估竞争力" },
];

/* ================================================================
   辅助函数
   ================================================================ */

const priorityColor = (p: string) => p === "high" ? "text-red-500" : p === "medium" ? "text-amber-500" : "text-blue-500";
const priorityLabel = (p: string) => p === "high" ? "高" : p === "medium" ? "中" : "低";
const statusIcon = (s: string) => s === "completed" ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : s === "in_progress" ? <Flame className="h-5 w-5 text-amber-500" /> : <Circle className="h-5 w-5 text-muted-foreground/30" />;
const statusLabel = (s: string) => s === "completed" ? "已完成" : s === "in_progress" ? "进行中" : "即将开始";

/* ================================================================
   输入表单（保持原有逻辑）
   ================================================================ */

function PlanForm({ onSubmit }: { onSubmit: (input: PlanInput) => void }) {
  const [input, setInput] = useState<PlanInput>({
    grade: "大三", target_level: "中上 985", target_discipline: "工学",
    gpa_rank: "前 10%", research_count: 1, paper_count: 0, award_count: 1,
    english_level: "六级 550+", weaknesses: [],
  });
  const update = (k: keyof PlanInput, v: unknown) => setInput((p) => ({ ...p, [k]: v }));
  const toggleWeakness = (w: string) => setInput((p) => ({ ...p, weaknesses: p.weaknesses.includes(w) ? p.weaknesses.filter((x) => x !== w) : [...p.weaknesses, w] }));
  const Counter = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      <div className="flex items-center gap-3">
        <button onClick={() => onChange(Math.max(0, value - 1))} className="flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-muted/50 transition-colors focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none"><Minus className="h-4 w-4" /></button>
        <span className="text-lg font-bold w-8 text-center">{value}</span>
        <button onClick={() => onChange(value + 1)} className="flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-muted/50 transition-colors focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none"><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 mb-4"><Calendar className="h-8 w-8 text-amber-600" /></div>
        <h2 className="text-2xl font-bold">综合规划</h2>
        <p className="text-muted-foreground mt-2">AI 为你量身定制保研时间线和行动计划</p>
      </div>
      <div className="space-y-6">
        <Card className="shadow-sm"><CardContent className="p-6 space-y-5">
          <h3 className="font-bold flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /> 基本信息</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">当前年级</label>
              <div className="flex gap-2">{GRADE_OPTIONS.map((g) => (<button key={g} onClick={() => update("grade", g)} className={cn("flex-1 rounded-lg border py-2 text-sm font-medium transition-all", input.grade === g ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted/50")}>{g}</button>))}</div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">GPA 排名</label>
              <select value={input.gpa_rank} onChange={(e) => update("gpa_rank", e.target.value)} className="w-full h-10 rounded-lg border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none">
                {["前 1%", "前 5%", "前 10%", "前 20%", "前 30%", "前 50%", "50% 以后"].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">目标院校层次</label>
              <select value={input.target_level} onChange={(e) => update("target_level", e.target.value)} className="w-full h-10 rounded-lg border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none">
                {LEVEL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">目标学科</label>
              <Input value={input.target_discipline} onChange={(e) => update("target_discipline", e.target.value)} placeholder="如：计算机科学" className="h-10" />
            </div>
          </div>
        </CardContent></Card>
        <Card className="shadow-sm"><CardContent className="p-6 space-y-5">
          <h3 className="font-bold flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> 学术背景</h3>
          <div className="grid grid-cols-3 gap-6">
            <Counter label="科研项目数" value={input.research_count} onChange={(v) => update("research_count", v)} />
            <Counter label="论文数量" value={input.paper_count} onChange={(v) => update("paper_count", v)} />
            <Counter label="竞赛获奖数" value={input.award_count} onChange={(v) => update("award_count", v)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">英语水平</label>
            <div className="flex flex-wrap gap-2">{ENGLISH_OPTIONS.map((o) => (<button key={o} onClick={() => update("english_level", o)} className={cn("rounded-lg border px-3 py-1.5 text-sm transition-all", input.english_level === o ? "border-primary bg-primary/5 text-primary font-medium" : "hover:bg-muted/50")}>{o}</button>))}</div>
          </div>
        </CardContent></Card>
        <Card className="shadow-sm"><CardContent className="p-6 space-y-4">
          <h3 className="font-bold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> 薄弱环节 <span className="text-xs font-normal text-muted-foreground">（可多选）</span></h3>
          <div className="flex flex-wrap gap-2">{WEAKNESS_OPTIONS.map((w) => (<button key={w} onClick={() => toggleWeakness(w)} className={cn("rounded-lg border px-3 py-2 text-sm transition-all", input.weaknesses.includes(w) ? "border-amber-400 bg-amber-50 text-amber-700 font-medium dark:bg-amber-500/10 dark:text-amber-400" : "hover:bg-muted/50")}>{w}</button>))}</div>
        </CardContent></Card>
        <Button onClick={() => onSubmit(input)} size="lg" className="w-full h-12 text-base gap-2"><Sparkles className="h-5 w-5" /> 生成保研规划</Button>
      </div>
    </div>
  );
}

/* ================================================================
   时间线视图
   ================================================================ */

function TimelineView({ timeline, onToggleTask, onEditNode, onDeleteNode, onDeleteTask, onAddTask, editingNodeId, editTitle, editDesc, setEditTitle, setEditDesc, onSaveEditNode, addingTaskNodeId, setAddingTaskNodeId, newTaskContent, setNewTaskContent, newTaskPriority, setNewTaskPriority, onAddTaskSubmit }: {
  timeline: PlanTimelineNode[];
  onToggleTask: (nodeId: string, taskId: string) => void;
  onEditNode?: (node: PlanTimelineNode) => void;
  onDeleteNode?: (nodeId: string) => void;
  onDeleteTask?: (nodeId: string, taskId: string) => void;
  onAddTask?: (nodeId: string) => void;
  editingNodeId?: string | null;
  editTitle?: string;
  editDesc?: string;
  setEditTitle?: (v: string) => void;
  setEditDesc?: (v: string) => void;
  onSaveEditNode?: () => void;
  addingTaskNodeId?: string | null;
  setAddingTaskNodeId?: (v: string | null) => void;
  newTaskContent?: string;
  setNewTaskContent?: (v: string) => void;
  newTaskPriority?: "high" | "medium" | "low";
  setNewTaskPriority?: (v: "high" | "medium" | "low") => void;
  onAddTaskSubmit?: (nodeId: string) => void;
}) {
  const [expandedNodes, setExpandedNodes] = useState<string[]>(timeline.filter((n) => n.status === "in_progress").map((n) => n.id));
  const toggleNode = (id: string) => setExpandedNodes((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  return (
    <div className="relative">
      <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-muted" />
      <div className="space-y-1">
        {timeline.map((node) => {
          const isExpanded = expandedNodes.includes(node.id);
          const completedTasks = node.tasks.filter((t) => t.is_completed).length;
          const isEditing = editingNodeId === node.id;
          return (
            <div key={node.id} className="relative pl-12">
              <div className="absolute left-[10px] top-3">{statusIcon(node.status)}</div>
              <div className={cn("rounded-xl border p-4 transition-all cursor-pointer hover:bg-muted/20 group/node",
                node.status === "in_progress" && "border-amber-200 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/5")}
                onClick={() => toggleNode(node.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">{node.month}</Badge>
                    {isEditing ? (
                      <input value={editTitle} onChange={(e) => setEditTitle?.(e.target.value)} onClick={(e) => e.stopPropagation()}
                        className="font-semibold text-sm bg-background border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    ) : (
                      <h4 className="font-semibold text-sm">{node.title}</h4>
                    )}
                    <Badge className={cn("text-xs", node.status === "completed" ? "bg-green-100 text-green-700" : node.status === "in_progress" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground")}>{statusLabel(node.status)}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* 编辑/删除按钮 */}
                    {onEditNode && !isEditing && (
                      <button onClick={(e) => { e.stopPropagation(); onEditNode(node); }}
                        className="h-6 w-6 rounded-md flex items-center justify-center opacity-0 group-hover/node:opacity-100 transition-opacity hover:bg-muted">
                        <Edit3 className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                    {isEditing && (
                      <button onClick={(e) => { e.stopPropagation(); onSaveEditNode?.(); }}
                        className="h-6 px-2 rounded-md flex items-center gap-1 bg-primary text-primary-foreground text-xs">
                        <CheckCircle2 className="h-3 w-3" /> 保存
                      </button>
                    )}
                    {onDeleteNode && (
                      <button onClick={(e) => { e.stopPropagation(); onDeleteNode(node.id); }}
                        className="h-6 w-6 rounded-md flex items-center justify-center opacity-0 group-hover/node:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500">
                        <Minus className="h-3 w-3" />
                      </button>
                    )}
                    <span className="text-xs text-muted-foreground">{completedTasks}/{node.tasks.length}</span>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
                {isEditing ? (
                  <input value={editDesc} onChange={(e) => setEditDesc?.(e.target.value)} onClick={(e) => e.stopPropagation()}
                    className="text-xs text-muted-foreground mt-1 w-full bg-background border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">{node.description}</p>
                )}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="mt-4 space-y-2 border-t pt-3">
                        {node.tasks.map((task) => (
                          <div key={task.id} className="flex items-start gap-2.5 group/task">
                            <button onClick={(e) => { e.stopPropagation(); onToggleTask(node.id, task.id); }} className="shrink-0 mt-0.5">
                              {task.is_completed ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4 text-muted-foreground/30 group-hover/task:text-primary/50 transition-colors" />}
                            </button>
                            <span className={cn("text-sm flex-1", task.is_completed && "line-through text-muted-foreground")}>{task.content}</span>
                            <Badge variant="outline" className={cn("text-xs shrink-0", priorityColor(task.priority))}>{priorityLabel(task.priority)}</Badge>
                            {onDeleteTask && (
                              <button onClick={(e) => { e.stopPropagation(); onDeleteTask(node.id, task.id); }}
                                className="h-5 w-5 rounded flex items-center justify-center opacity-0 group-hover/task:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500 shrink-0">
                                <Minus className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        {/* 添加任务 */}
                        {addingTaskNodeId === node.id ? (
                          <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                            <input value={newTaskContent} onChange={(e) => setNewTaskContent?.(e.target.value)}
                              placeholder="输入任务内容..."
                              className="flex-1 text-sm bg-background border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
                              onKeyDown={(e) => { if (e.key === "Enter") onAddTaskSubmit?.(node.id); }} />
                            <select value={newTaskPriority} onChange={(e) => setNewTaskPriority?.(e.target.value as "high" | "medium" | "low")}
                              className="text-xs border rounded-lg px-2 py-1.5 bg-background">
                              <option value="high">高</option>
                              <option value="medium">中</option>
                              <option value="low">低</option>
                            </select>
                            <button onClick={() => onAddTaskSubmit?.(node.id)} className="text-xs text-primary font-medium hover:underline">添加</button>
                            <button onClick={() => setAddingTaskNodeId?.(null)} className="text-xs text-muted-foreground hover:underline">取消</button>
                          </div>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); setAddingTaskNodeId?.(node.id); }}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mt-1">
                            <Plus className="h-3 w-3" /> 添加任务
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================
   进度条视图
   ================================================================ */

function ProgressView({ timeline }: { timeline: PlanTimelineNode[] }) {
  const totalTasks = timeline.reduce((s, n) => s + n.tasks.length, 0);
  const completedTasks = timeline.reduce((s, n) => s + n.tasks.filter((t) => t.is_completed).length, 0);
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* 总体进度 */}
      <Card className="shadow-sm overflow-hidden">
        <div className="h-1.5 bg-muted"><motion.div className="h-full bg-gradient-to-r from-primary to-blue-400" initial={{ width: 0 }} animate={{ width: `${overallProgress}%` }} transition={{ duration: 1 }} /></div>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg">总体进度</h3>
            <span className="text-2xl font-bold text-primary">{overallProgress}%</span>
          </div>
          <p className="text-sm text-muted-foreground">已完成 {completedTasks}/{totalTasks} 项任务</p>
          <div className="mt-4 text-sm">
            {overallProgress >= 80 ? "🎉 太棒了！你的进度非常出色，继续保持！" :
             overallProgress >= 50 ? "💪 进展顺利，已经过半了，加油！" :
             overallProgress >= 20 ? "🌱 良好的开始，一步一步来！" :
             "🚀 刚刚起步，制定好计划就开始行动吧！"}
          </div>
        </CardContent>
      </Card>

      {/* 各阶段进度 */}
      <div className="space-y-4">
        {timeline.map((node) => {
          const completed = node.tasks.filter((t) => t.is_completed).length;
          const progress = node.tasks.length > 0 ? Math.round((completed / node.tasks.length) * 100) : 0;
          return (
            <Card key={node.id} className="shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {statusIcon(node.status)}
                    <div>
                      <h4 className="font-semibold text-sm">{node.title}</h4>
                      <p className="text-xs text-muted-foreground">{node.month} · {node.description}</p>
                    </div>
                  </div>
                  <span className={cn("text-lg font-bold", progress === 100 ? "text-green-600" : progress > 0 ? "text-amber-600" : "text-muted-foreground")}>{progress}%</span>
                </div>
                <div className="h-3 rounded-full bg-muted/50 overflow-hidden">
                  <motion.div className={cn("h-full rounded-full", progress === 100 ? "bg-green-500" : "bg-gradient-to-r from-amber-400 to-amber-500")}
                    initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8 }} />
                </div>
                <p className="text-xs text-muted-foreground mt-2">{completed}/{node.tasks.length} 项任务已完成</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================
   看板视图
   ================================================================ */

function KanbanView({ timeline, onToggleTask, onSetTaskStatus }: { timeline: PlanTimelineNode[]; onToggleTask: (nodeId: string, taskId: string) => void; onSetTaskStatus?: (nodeId: string, taskId: string, status: "todo" | "in_progress" | "done") => void }) {
  /** 每个任务额外维护一个 kanban 状态（基于 node.status + task.is_completed 推断） */
  type KanbanItem = { nodeId: string; task: PlanTimelineNode["tasks"][0]; nodeTitle: string; kanbanStatus: "todo" | "doing" | "done" };
  const columns = [
    { id: "todo" as const, title: "待开始", color: "border-t-gray-400", tasks: [] as KanbanItem[] },
    { id: "doing" as const, title: "进行中", color: "border-t-amber-400", tasks: [] as KanbanItem[] },
    { id: "done" as const, title: "已完成", color: "border-t-green-400", tasks: [] as KanbanItem[] },
  ];

  timeline.forEach((node) => {
    node.tasks.forEach((task) => {
      const item: KanbanItem = { nodeId: node.id, task, nodeTitle: node.title, kanbanStatus: "todo" };
      if (task.is_completed) { item.kanbanStatus = "done"; columns[2].tasks.push(item); }
      else if (node.status === "in_progress") { item.kanbanStatus = "doing"; columns[1].tasks.push(item); }
      else { item.kanbanStatus = "todo"; columns[0].tasks.push(item); }
    });
  });

  /** 将任务向右移动一个阶段：待开始→进行中→已完成 */
  const advanceTask = (item: KanbanItem) => {
    if (item.kanbanStatus === "done") return;
    if (item.kanbanStatus === "todo" && onSetTaskStatus) {
      onSetTaskStatus(item.nodeId, item.task.id, "in_progress");
    } else if (item.kanbanStatus === "doing") {
      onToggleTask(item.nodeId, item.task.id);
    }
  };

  const statusIcons = {
    todo: <Circle className="h-4 w-4 text-muted-foreground/30 hover:text-amber-500 transition-colors" />,
    doing: <Loader2 className="h-4 w-4 text-amber-500 hover:text-green-500 transition-colors" />,
    done: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {columns.map((col) => (
        <div key={col.id} className={cn("rounded-xl border-t-4 bg-muted/20 p-4", col.color)}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-sm">{col.title}</h4>
            <Badge variant="outline" className="text-xs">{col.tasks.length}</Badge>
          </div>
          <div className="space-y-2">
            {col.tasks.map((item) => (
              <Card key={item.task.id} className="shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <button onClick={() => advanceTask(item)} className="shrink-0 mt-0.5" title={item.kanbanStatus === "todo" ? "移至进行中" : item.kanbanStatus === "doing" ? "标记完成" : "已完成"}>
                      {statusIcons[item.kanbanStatus]}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs leading-relaxed", item.task.is_completed && "line-through text-muted-foreground")}>{item.task.content}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Badge variant="outline" className="text-[9px]">{item.nodeTitle}</Badge>
                        <Badge variant="outline" className={cn("text-[9px]", priorityColor(item.task.priority))}>{priorityLabel(item.task.priority)}</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {col.tasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">暂无任务</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   进度跟踪面板
   ================================================================ */

/* ================================================================
   成果记录（已迁移到进度中心 /progress/achievements）
   ================================================================ */

/* ================================================================
   规划版本历史
   ================================================================ */

function VersionHistory({ onReplan }: { onReplan: () => void }) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">规划历史</h2>
          <p className="text-muted-foreground mt-1 text-sm">查看规划的演变过程，追踪竞争力变化</p>
        </div>
        <Button onClick={onReplan} className="gap-2"><RefreshCw className="h-4 w-4" /> 更新规划</Button>
      </div>

      {/* 竞争力趋势 */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> 竞争力趋势</h3>
          <div className="flex items-end gap-4 h-32">
            {MOCK_VERSIONS.map((v, i) => (
              <div key={v.id} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-sm font-bold text-primary">{v.score}</span>
                <motion.div className="w-full rounded-t-lg bg-gradient-to-t from-primary to-blue-400"
                  initial={{ height: 0 }} animate={{ height: `${(v.score / 100) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.2 }} />
                <span className="text-xs text-muted-foreground">V{v.version}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 版本列表 */}
      <div className="space-y-3">
        {[...MOCK_VERSIONS].reverse().map((v) => (
          <Card key={v.id} className={cn("shadow-sm", v.version === MOCK_VERSIONS.length && "border-primary/30")}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">V{v.version}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{v.note}</h4>
                  {v.version === MOCK_VERSIONS.length && <Badge className="text-xs bg-primary/10 text-primary">当前版本</Badge>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{v.date}</span>
                  <span>竞争力评分：{v.score}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1 text-xs"><Eye className="h-3 w-3" /> 查看</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm border-dashed">
        <CardContent className="p-6 text-center">
          <RefreshCw className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="font-bold text-sm mb-1">需要更新规划？</h3>
          <p className="text-xs text-muted-foreground mb-4">当你的成果或情况发生变化时，可以重新生成规划。<br />AI 会参考之前的规划，保持连贯性并做出针对性调整。</p>
          <Button onClick={onReplan} variant="outline" className="gap-2"><Sparkles className="h-4 w-4" /> 基于当前进度更新规划</Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ================================================================
   规划结果视图（增强版）
   ================================================================ */

function PlanResultView({ result, onRetry }: { result: PlanResult; onRetry: () => void }) {
  const [viewMode, setViewMode] = useState<PlanViewMode>("timeline");
  const [timeline, setTimeline] = useState(result.timeline);
  const [saved, setSaved] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [addingTaskNodeId, setAddingTaskNodeId] = useState<string | null>(null);
  const [newTaskContent, setNewTaskContent] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "medium" | "low">("medium");

  const scoreColor = result.competitiveness_score >= 80 ? "text-green-600" : result.competitiveness_score >= 60 ? "text-amber-600" : "text-red-600";

  const toggleTask = (nodeId: string, taskId: string) => {
    setTimeline((prev) => prev.map((n) => n.id === nodeId ? { ...n, tasks: n.tasks.map((t) => t.id === taskId ? { ...t, is_completed: !t.is_completed } : t) } : n));
  };

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const startEditNode = (node: PlanTimelineNode) => {
    setEditingNodeId(node.id);
    setEditTitle(node.title);
    setEditDesc(node.description);
  };

  const saveEditNode = () => {
    if (!editingNodeId) return;
    setTimeline((prev) => prev.map((n) => n.id === editingNodeId ? { ...n, title: editTitle, description: editDesc } : n));
    setEditingNodeId(null);
  };

  const deleteTask = (nodeId: string, taskId: string) => {
    setTimeline((prev) => prev.map((n) => n.id === nodeId ? { ...n, tasks: n.tasks.filter((t) => t.id !== taskId) } : n));
  };

  const addTask = (nodeId: string) => {
    if (!newTaskContent.trim()) return;
    const newTask = { id: `t_new_${Date.now()}`, content: newTaskContent.trim(), is_completed: false, priority: newTaskPriority };
    setTimeline((prev) => prev.map((n) => n.id === nodeId ? { ...n, tasks: [...n.tasks, newTask] } : n));
    setNewTaskContent("");
    setAddingTaskNodeId(null);
  };

  const deleteNode = (nodeId: string) => {
    setTimeline((prev) => prev.filter((n) => n.id !== nodeId));
  };

  /** 看板中将任务移动到指定状态 */
  const setTaskStatus = (nodeId: string, taskId: string, status: "todo" | "in_progress" | "done") => {
    setTimeline((prev) => prev.map((n) => {
      if (n.id !== nodeId) return n;
      // 如果目标状态是 in_progress，确保节点状态也是 in_progress
      const newNodeStatus = status === "in_progress" && n.status !== "in_progress" ? "in_progress" : n.status;
      return {
        ...n,
        status: newNodeStatus as PlanTimelineNode["status"],
        tasks: n.tasks.map((t) => t.id === taskId ? { ...t, is_completed: status === "done" } : t),
      };
    }));
  };

  const addNewPhase = () => {
    const newNode: PlanTimelineNode = {
      id: `phase_${Date.now()}`,
      month: new Date().toISOString().slice(0, 7),
      title: "新阶段",
      description: "点击编辑按钮修改阶段信息",
      status: "upcoming",
      tasks: [],
    };
    setTimeline((prev) => [...prev, newNode]);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 竞争力评分 */}
      <Card className="shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-500" />
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="text-center"><div className={cn("text-5xl font-bold", scoreColor)}>{result.competitiveness_score}</div><p className="text-sm text-muted-foreground mt-1">竞争力评分</p></div>
            <div className="flex-1"><h3 className="font-bold mb-2">整体评估</h3><p className="text-sm text-muted-foreground leading-relaxed">{result.assessment}</p></div>
          </div>
        </CardContent>
      </Card>

      {/* 进度中心入口提示 */}
      <div className="rounded-xl bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-200/50 p-3 flex items-center justify-between">
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          📊 进度跟踪、成果记录和学习打卡已集成到「进度中心」，规划数据已自动同步
        </p>
        <a href="/progress" className="text-xs text-emerald-600 hover:underline flex items-center gap-1 shrink-0">
          前往进度中心 <ArrowRight className="h-3 w-3" />
        </a>
      </div>

      {/* 视图切换 + 操作按钮 */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-xl bg-muted/50 backdrop-blur-sm shadow-sm p-1 gap-1">
          {VIEW_MODES.map((m) => (
            <button key={m.id} onClick={() => setViewMode(m.id)}
              className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                viewMode === m.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50")}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addNewPhase} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> 添加阶段
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} className="gap-1.5">
            {saved ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> 已保存</> : <><Save className="h-3.5 w-3.5" /> 保存规划</>}
          </Button>
        </div>
      </div>

      {/* 规划内容（多视图） */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <h3 className="font-bold mb-6 flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> 保研时间线</h3>
          {viewMode === "timeline" && <TimelineView timeline={timeline} onToggleTask={toggleTask}
            onEditNode={startEditNode} onDeleteNode={deleteNode} onDeleteTask={deleteTask}
            editingNodeId={editingNodeId} editTitle={editTitle} editDesc={editDesc}
            setEditTitle={setEditTitle} setEditDesc={setEditDesc} onSaveEditNode={saveEditNode}
            addingTaskNodeId={addingTaskNodeId} setAddingTaskNodeId={setAddingTaskNodeId}
            newTaskContent={newTaskContent} setNewTaskContent={setNewTaskContent}
            newTaskPriority={newTaskPriority} setNewTaskPriority={setNewTaskPriority}
            onAddTaskSubmit={addTask} />}
          {viewMode === "progress" && <ProgressView timeline={timeline} />}
          {viewMode === "kanban" && <KanbanView timeline={timeline} onToggleTask={toggleTask} onSetTaskStatus={setTaskStatus} />}
        </CardContent>
      </Card>

      {/* 重点建议 */}
      <Card className="shadow-sm"><CardContent className="p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-500" /> 重点建议</h3>
        <div className="space-y-4">
          {result.key_suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <Badge variant="outline" className={cn("shrink-0 mt-0.5", priorityColor(s.priority))}>{s.category}</Badge>
              <p className="text-sm leading-relaxed">{s.content}</p>
            </div>
          ))}
        </div>
      </CardContent></Card>

      {/* 推荐资源 */}
      <Card className="shadow-sm"><CardContent className="p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> 推荐资源</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {result.resources.map((r, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border p-4 hover:bg-muted/30 transition-colors cursor-pointer">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><BookOpen className="h-5 w-5" /></div>
              <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{r.title}</p><p className="text-xs text-muted-foreground truncate">{r.description}</p></div>
              <Badge variant="outline" className="text-xs shrink-0">{r.type}</Badge>
            </div>
          ))}
        </div>
      </CardContent></Card>

      <div className="flex gap-3 justify-center">
        <Button onClick={onRetry} size="lg" className="gap-2"><RotateCcw className="h-4 w-4" /> 重新规划</Button>
      </div>
    </div>
  );
}

/* ================================================================
   主页面（增强版 - 多 Tab）
   ================================================================ */

export default function PlanPage() {
  const [activeTab, setActiveTab] = useState("plan");
  const [phase, setPhase] = useState<"input" | "generating" | "result">("result"); // 默认显示结果（Mock 已有规划）
  const [hasPlan, setHasPlan] = useState(true); // Mock: 已有规划

  const handleSubmit = useCallback(() => {
    setPhase("generating");
    setTimeout(() => { setPhase("result"); setHasPlan(true); }, 2000);
  }, []);

  return (
    <div>
      {/* 顶部 Tab */}
      {phase !== "generating" && (
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-xl bg-muted/50 backdrop-blur-sm shadow-sm p-1 gap-1">
            {PLAN_TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  activeTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50")}>
                <tab.icon className="h-4 w-4" /> {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "generating" && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center"><Sparkles className="h-8 w-8 text-amber-600 animate-pulse" /></div>
          <h3 className="mt-6 text-lg font-bold">AI 正在为你生成保研规划...</h3>
          <p className="text-sm text-muted-foreground mt-2">分析你的背景条件，制定个性化时间线</p>
          <div className="mt-6 flex gap-1">{[0, 1, 2].map((i) => <div key={i} className="h-2 w-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}</div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === "plan" && phase === "input" && (
          <motion.div key="input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <PlanForm onSubmit={handleSubmit} />
          </motion.div>
        )}
        {activeTab === "plan" && phase === "result" && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <PlanResultView result={MOCK_RESULT} onRetry={() => setPhase("input")} />
          </motion.div>
        )}
        {activeTab === "versions" && (
          <motion.div key="versions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <VersionHistory onReplan={() => { setActiveTab("plan"); setPhase("input"); }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
