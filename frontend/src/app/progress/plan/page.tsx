"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, Calendar, ChevronRight, ChevronDown, Edit3,
  Plus, Clock, Target, CheckCircle2, Circle, Flame,
  Minus, Save, ArrowRight, BarChart3, LayoutGrid, List,
  Trash2, Loader2,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* ================================================================
   与综合规划共享的数据类型和 Mock 数据
   ================================================================ */

interface PlanTask {
  id: string;
  content: string;
  is_completed: boolean;
  priority: "high" | "medium" | "low";
}

interface PlanPhase {
  id: string;
  month: string;
  title: string;
  description: string;
  status: "completed" | "in_progress" | "upcoming";
  tasks: PlanTask[];
}

/** 与综合规划页面完全一致的 Mock 数据（实际项目中应从共享 store 获取） */
const SHARED_TIMELINE: PlanPhase[] = [
  { id: "1", month: "2026-01", title: "基础夯实期", description: "巩固专业基础，开始科研准备", status: "completed",
    tasks: [
      { id: "t1", content: "确定目标院校和专业方向（3-5 所）", is_completed: true, priority: "high" },
      { id: "t2", content: "联系本校导师，争取进入实验室", is_completed: true, priority: "high" },
      { id: "t3", content: "开始准备英语六级/雅思", is_completed: false, priority: "medium" },
      { id: "t4", content: "梳理本科课程知识体系", is_completed: true, priority: "medium" },
      { id: "t5", content: "专业课高分", is_completed: false, priority: "high" },
    ] },
  { id: "2", month: "2026-03", title: "科研深耕期", description: "深入科研项目，积累成果", status: "in_progress",
    tasks: [
      { id: "t6", content: "参与至少 1 个科研项目并承担核心工作", is_completed: false, priority: "high" },
      { id: "t7", content: "开始撰写论文初稿", is_completed: false, priority: "high" },
      { id: "t8", content: "参加 1-2 个学科竞赛", is_completed: false, priority: "medium" },
      { id: "t9", content: "关注目标院校夏令营通知", is_completed: false, priority: "medium" },
    ] },
  { id: "3", month: "2026-05", title: "材料准备期", description: "准备申请材料，投递夏令营", status: "upcoming",
    tasks: [
      { id: "t10", content: "完善个人简历（学术版）", is_completed: false, priority: "high" },
      { id: "t11", content: "准备个人陈述 / 研究计划", is_completed: false, priority: "high" },
      { id: "t12", content: "联系推荐信老师（至少 2 位）", is_completed: false, priority: "high" },
      { id: "t13", content: "投递 3-5 所目标院校夏令营", is_completed: false, priority: "high" },
      { id: "t14", content: "准备成绩单、获奖证书等材料", is_completed: false, priority: "medium" },
    ] },
  { id: "4", month: "2026-07", title: "夏令营冲刺期", description: "参加夏令营，争取优秀营员", status: "upcoming",
    tasks: [
      { id: "t15", content: "准备面试常见问题（中英文）", is_completed: false, priority: "high" },
      { id: "t16", content: "模拟面试练习（至少 3 次）", is_completed: false, priority: "high" },
      { id: "t17", content: "复习专业课核心知识点", is_completed: false, priority: "high" },
      { id: "t18", content: "准备英文自我介绍和研究介绍", is_completed: false, priority: "medium" },
    ] },
  { id: "5", month: "2026-09", title: "预推免阶段", description: "参加预推免，确定最终去向", status: "upcoming",
    tasks: [
      { id: "t19", content: "根据夏令营结果调整策略", is_completed: false, priority: "high" },
      { id: "t20", content: "投递预推免申请", is_completed: false, priority: "high" },
      { id: "t21", content: "参加预推免面试", is_completed: false, priority: "high" },
      { id: "t22", content: "确认录取，完成系统填报", is_completed: false, priority: "high" },
    ] },
];

/* ================================================================
   辅助函数
   ================================================================ */

const priorityColor = (p: string) => p === "high" ? "text-red-500" : p === "medium" ? "text-amber-500" : "text-blue-500";
const priorityLabel = (p: string) => p === "high" ? "高" : p === "medium" ? "中" : "低";
const statusIcon = (s: string) => s === "completed" ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : s === "in_progress" ? <Flame className="h-5 w-5 text-amber-500" /> : <Circle className="h-5 w-5 text-muted-foreground/30" />;
const statusLabel = (s: string) => s === "completed" ? "已完成" : s === "in_progress" ? "进行中" : "即将开始";

/* ================================================================
   甘特图组件
   ================================================================ */

function GanttChart({ phases }: { phases: PlanPhase[] }) {
  const startDate = new Date("2026-01-01");
  const endDate = new Date("2026-10-01");
  const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  const today = new Date();
  const todayOffset = ((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;
  const months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月"];

  const phaseColors: Record<string, string> = { "completed": "bg-green-500", "in_progress": "bg-amber-500", "upcoming": "bg-blue-400" };

  // 根据 month 字段推算起止日期
  const getPhaseRange = (phase: PlanPhase, idx: number, all: PlanPhase[]) => {
    const [y, m] = phase.month.split("-").map(Number);
    const phaseStart = new Date(y, m - 1, 1);
    const nextPhase = all[idx + 1];
    const phaseEnd = nextPhase ? new Date(Number(nextPhase.month.split("-")[0]), Number(nextPhase.month.split("-")[1]) - 1, 1) : new Date(y, m + 1, 0);
    return { phaseStart, phaseEnd };
  };

  return (
    <div className="relative">
      <div className="flex mb-2">
        {months.map((m) => (
          <div key={m} className="flex-1 text-center text-xs text-muted-foreground">{m}</div>
        ))}
      </div>
      <div className="space-y-2 relative">
        <div className="absolute top-0 bottom-0 w-px bg-red-500 z-10"
          style={{ left: `${Math.min(Math.max(todayOffset, 0), 100)}%` }}>
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-red-500 font-medium whitespace-nowrap">今天</div>
        </div>
        {phases.map((phase, idx) => {
          const { phaseStart, phaseEnd } = getPhaseRange(phase, idx, phases);
          const completed = phase.tasks.filter((t) => t.is_completed).length;
          const progress = phase.tasks.length > 0 ? completed / phase.tasks.length : 0;
          const left = ((phaseStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;
          const width = ((phaseEnd.getTime() - phaseStart.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;
          return (
            <div key={phase.id} className="flex items-center gap-3 h-10">
              <div className="w-28 shrink-0 text-xs font-medium truncate">{phase.title}</div>
              <div className="flex-1 relative h-7 bg-muted/30 rounded-lg overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${width}%` }} transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className={cn("absolute h-full rounded-lg opacity-20", phaseColors[phase.status])} style={{ left: `${left}%` }} />
                <motion.div initial={{ width: 0 }} animate={{ width: `${width * progress}%` }} transition={{ duration: 0.8, delay: idx * 0.1 }}
                  className={cn("absolute h-full rounded-lg", phaseColors[phase.status])} style={{ left: `${left}%` }} />
                <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                  {Math.round(progress * 100)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================
   页面组件
   ================================================================ */

export default function ProgressPlanPage() {
  const [phases, setPhases] = useState<PlanPhase[]>(SHARED_TIMELINE);
  const [view, setView] = useState<"timeline" | "gantt">("timeline");
  const [expandedNodes, setExpandedNodes] = useState<string[]>(phases.filter((n) => n.status === "in_progress").map((n) => n.id));
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [addingTaskNodeId, setAddingTaskNodeId] = useState<string | null>(null);
  const [newTaskContent, setNewTaskContent] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const [saved, setSaved] = useState(false);

  const totalTasks = phases.reduce((s, n) => s + n.tasks.length, 0);
  const completedTasks = phases.reduce((s, n) => s + n.tasks.filter((t) => t.is_completed).length, 0);
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const toggleNode = (id: string) => setExpandedNodes((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const toggleTask = (nodeId: string, taskId: string) => {
    setPhases((prev) => prev.map((n) => n.id === nodeId ? { ...n, tasks: n.tasks.map((t) => t.id === taskId ? { ...t, is_completed: !t.is_completed } : t) } : n));
  };

  const startEditNode = (node: PlanPhase) => { setEditingNodeId(node.id); setEditTitle(node.title); setEditDesc(node.description); };
  const saveEditNode = () => {
    if (!editingNodeId) return;
    setPhases((prev) => prev.map((n) => n.id === editingNodeId ? { ...n, title: editTitle, description: editDesc } : n));
    setEditingNodeId(null);
  };

  const deleteTask = (nodeId: string, taskId: string) => {
    setPhases((prev) => prev.map((n) => n.id === nodeId ? { ...n, tasks: n.tasks.filter((t) => t.id !== taskId) } : n));
  };

  const addTask = (nodeId: string) => {
    if (!newTaskContent.trim()) return;
    const newTask: PlanTask = { id: `t_new_${Date.now()}`, content: newTaskContent.trim(), is_completed: false, priority: newTaskPriority };
    setPhases((prev) => prev.map((n) => n.id === nodeId ? { ...n, tasks: [...n.tasks, newTask] } : n));
    setNewTaskContent(""); setAddingTaskNodeId(null);
  };

  const deleteNode = (nodeId: string) => { setPhases((prev) => prev.filter((n) => n.id !== nodeId)); };

  const addNewPhase = () => {
    const newNode: PlanPhase = {
      id: `phase_${Date.now()}`, month: new Date().toISOString().slice(0, 7),
      title: "新阶段", description: "点击编辑按钮修改阶段信息", status: "upcoming", tasks: [],
    };
    setPhases((prev) => [...prev, newNode]);
  };

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="space-y-6">
      {/* 同步提示 */}
      <div className="rounded-xl bg-blue-50/50 dark:bg-blue-500/5 border border-blue-200/50 p-3 flex items-center justify-between">
        <p className="text-xs text-blue-700 dark:text-blue-400">
          📊 规划数据与「AI 综合规划」完全同步，在任一处修改都会实时反映到另一处
        </p>
        <Link href="/ai/plan" className="text-xs text-blue-600 hover:underline flex items-center gap-1 shrink-0">
          前往 AI 规划 <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* 总体进度 */}
      <Card className="shadow-sm overflow-hidden">
        <div className="h-1.5 bg-muted">
          <motion.div className="h-full bg-gradient-to-r from-emerald-500 to-green-400" initial={{ width: 0 }} animate={{ width: `${overallProgress}%` }} transition={{ duration: 1 }} />
        </div>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">总体进度</h3>
              <p className="text-sm text-muted-foreground">已完成 {completedTasks}/{totalTasks} 项任务</p>
            </div>
            <span className="text-3xl font-bold text-emerald-600">{overallProgress}%</span>
          </div>
        </CardContent>
      </Card>

      {/* 视图切换 + 操作 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
          {([
            { id: "timeline" as const, label: "时间线", icon: <List className="h-3.5 w-3.5" /> },
            { id: "gantt" as const, label: "甘特图", icon: <BarChart3 className="h-3.5 w-3.5" /> },
          ]).map((v) => (
            <button key={v.id} onClick={() => setView(v.id)}
              className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                view === v.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addNewPhase} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> 添加阶段
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} className="gap-1.5 text-xs">
            {saved ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> 已保存</> : <><Save className="h-3.5 w-3.5" /> 保存</>}
          </Button>
        </div>
      </div>

      {/* 甘特图 */}
      {view === "gantt" && (
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <GanttChart phases={phases} />
          </CardContent>
        </Card>
      )}

      {/* 时间线视图 */}
      {view === "timeline" && (
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-muted" />
          <div className="space-y-1">
            {phases.map((node) => {
              const isExpanded = expandedNodes.includes(node.id);
              const completedCount = node.tasks.filter((t) => t.is_completed).length;
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
                          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onClick={(e) => e.stopPropagation()}
                            className="font-semibold text-sm bg-background border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        ) : (
                          <h4 className="font-semibold text-sm">{node.title}</h4>
                        )}
                        <Badge className={cn("text-xs", node.status === "completed" ? "bg-green-100 text-green-700" : node.status === "in_progress" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground")}>{statusLabel(node.status)}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isEditing && (
                          <button onClick={(e) => { e.stopPropagation(); startEditNode(node); }}
                            className="h-6 w-6 rounded-md flex items-center justify-center opacity-0 group-hover/node:opacity-100 transition-opacity hover:bg-muted">
                            <Edit3 className="h-3 w-3 text-muted-foreground" />
                          </button>
                        )}
                        {isEditing && (
                          <button onClick={(e) => { e.stopPropagation(); saveEditNode(); }}
                            className="h-6 px-2 rounded-md flex items-center gap-1 bg-primary text-primary-foreground text-xs">
                            <CheckCircle2 className="h-3 w-3" /> 保存
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                          className="h-6 w-6 rounded-md flex items-center justify-center opacity-0 group-hover/node:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs text-muted-foreground">{completedCount}/{node.tasks.length}</span>
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                    {isEditing ? (
                      <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} onClick={(e) => e.stopPropagation()}
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
                                <button onClick={(e) => { e.stopPropagation(); toggleTask(node.id, task.id); }} className="shrink-0 mt-0.5">
                                  {task.is_completed ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4 text-muted-foreground/30 group-hover/task:text-primary/50 transition-colors" />}
                                </button>
                                <span className={cn("text-sm flex-1", task.is_completed && "line-through text-muted-foreground")}>{task.content}</span>
                                <Badge variant="outline" className={cn("text-xs shrink-0", priorityColor(task.priority))}>{priorityLabel(task.priority)}</Badge>
                                <button onClick={(e) => { e.stopPropagation(); deleteTask(node.id, task.id); }}
                                  className="h-5 w-5 rounded flex items-center justify-center opacity-0 group-hover/task:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500 shrink-0">
                                  <Minus className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                            {addingTaskNodeId === node.id ? (
                              <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                                <input value={newTaskContent} onChange={(e) => setNewTaskContent(e.target.value)}
                                  placeholder="输入任务内容..." className="flex-1 text-sm bg-background border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  onKeyDown={(e) => { if (e.key === "Enter") addTask(node.id); }} />
                                <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value as "high" | "medium" | "low")}
                                  className="text-xs border rounded-lg px-2 py-1.5 bg-background">
                                  <option value="high">高</option>
                                  <option value="medium">中</option>
                                  <option value="low">低</option>
                                </select>
                                <button onClick={() => addTask(node.id)} className="text-xs text-primary font-medium hover:underline">添加</button>
                                <button onClick={() => setAddingTaskNodeId(null)} className="text-xs text-muted-foreground hover:underline">取消</button>
                              </div>
                            ) : (
                              <button onClick={(e) => { e.stopPropagation(); setAddingTaskNodeId(node.id); }}
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
      )}
    </div>
  );
}
