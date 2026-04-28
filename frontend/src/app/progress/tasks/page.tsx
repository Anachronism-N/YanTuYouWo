"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckSquare, Plus, Clock, Filter,
  AlertTriangle, CheckCircle2, Circle, Loader2,
  Calendar, Tag, MoreHorizontal, ArrowRight,
  Flame, Search, LayoutGrid, List,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* ================================================================
   与综合规划共享的任务数据（实际项目中应从共享 store 获取）
   ================================================================ */

interface SharedTask {
  id: string;
  content: string;
  is_completed: boolean;
  priority: "high" | "medium" | "low";
  /** 所属阶段 */
  phase_title: string;
  phase_month: string;
  phase_status: "completed" | "in_progress" | "upcoming";
}

/** 从综合规划的时间线中展平出所有任务 */
const SHARED_TASKS: SharedTask[] = [
  // 基础夯实期 (completed)
  { id: "t1", content: "确定目标院校和专业方向（3-5 所）", is_completed: true, priority: "high", phase_title: "基础夯实期", phase_month: "2026-01", phase_status: "completed" },
  { id: "t2", content: "联系本校导师，争取进入实验室", is_completed: true, priority: "high", phase_title: "基础夯实期", phase_month: "2026-01", phase_status: "completed" },
  { id: "t3", content: "开始准备英语六级/雅思", is_completed: false, priority: "medium", phase_title: "基础夯实期", phase_month: "2026-01", phase_status: "completed" },
  { id: "t4", content: "梳理本科课程知识体系", is_completed: true, priority: "medium", phase_title: "基础夯实期", phase_month: "2026-01", phase_status: "completed" },
  { id: "t5", content: "专业课高分", is_completed: false, priority: "high", phase_title: "基础夯实期", phase_month: "2026-01", phase_status: "completed" },
  // 科研深耕期 (in_progress)
  { id: "t6", content: "参与至少 1 个科研项目并承担核心工作", is_completed: false, priority: "high", phase_title: "科研深耕期", phase_month: "2026-03", phase_status: "in_progress" },
  { id: "t7", content: "开始撰写论文初稿", is_completed: false, priority: "high", phase_title: "科研深耕期", phase_month: "2026-03", phase_status: "in_progress" },
  { id: "t8", content: "参加 1-2 个学科竞赛", is_completed: false, priority: "medium", phase_title: "科研深耕期", phase_month: "2026-03", phase_status: "in_progress" },
  { id: "t9", content: "关注目标院校夏令营通知", is_completed: false, priority: "medium", phase_title: "科研深耕期", phase_month: "2026-03", phase_status: "in_progress" },
  // 材料准备期 (upcoming)
  { id: "t10", content: "完善个人简历（学术版）", is_completed: false, priority: "high", phase_title: "材料准备期", phase_month: "2026-05", phase_status: "upcoming" },
  { id: "t11", content: "准备个人陈述 / 研究计划", is_completed: false, priority: "high", phase_title: "材料准备期", phase_month: "2026-05", phase_status: "upcoming" },
  { id: "t12", content: "联系推荐信老师（至少 2 位）", is_completed: false, priority: "high", phase_title: "材料准备期", phase_month: "2026-05", phase_status: "upcoming" },
  { id: "t13", content: "投递 3-5 所目标院校夏令营", is_completed: false, priority: "high", phase_title: "材料准备期", phase_month: "2026-05", phase_status: "upcoming" },
  { id: "t14", content: "准备成绩单、获奖证书等材料", is_completed: false, priority: "medium", phase_title: "材料准备期", phase_month: "2026-05", phase_status: "upcoming" },
  // 夏令营冲刺期 (upcoming)
  { id: "t15", content: "准备面试常见问题（中英文）", is_completed: false, priority: "high", phase_title: "夏令营冲刺期", phase_month: "2026-07", phase_status: "upcoming" },
  { id: "t16", content: "模拟面试练习（至少 3 次）", is_completed: false, priority: "high", phase_title: "夏令营冲刺期", phase_month: "2026-07", phase_status: "upcoming" },
  { id: "t17", content: "复习专业课核心知识点", is_completed: false, priority: "high", phase_title: "夏令营冲刺期", phase_month: "2026-07", phase_status: "upcoming" },
  { id: "t18", content: "准备英文自我介绍和研究介绍", is_completed: false, priority: "medium", phase_title: "夏令营冲刺期", phase_month: "2026-07", phase_status: "upcoming" },
  // 预推免阶段 (upcoming)
  { id: "t19", content: "根据夏令营结果调整策略", is_completed: false, priority: "high", phase_title: "预推免阶段", phase_month: "2026-09", phase_status: "upcoming" },
  { id: "t20", content: "投递预推免申请", is_completed: false, priority: "high", phase_title: "预推免阶段", phase_month: "2026-09", phase_status: "upcoming" },
  { id: "t21", content: "参加预推免面试", is_completed: false, priority: "high", phase_title: "预推免阶段", phase_month: "2026-09", phase_status: "upcoming" },
  { id: "t22", content: "确认录取，完成系统填报", is_completed: false, priority: "high", phase_title: "预推免阶段", phase_month: "2026-09", phase_status: "upcoming" },
];

/* ================================================================
   辅助
   ================================================================ */

const STATUS_FILTERS = ["全部", "待办", "进行中", "已完成"];
const PRIORITY_FILTERS = ["全部优先级", "高", "中", "低"];
const PHASE_FILTERS = ["全部阶段", "基础夯实期", "科研深耕期", "材料准备期", "夏令营冲刺期", "预推免阶段"];

const statusConfig: Record<string, { label: string; color: string; icon: typeof Circle }> = {
  todo: { label: "待办", color: "bg-gray-100 text-gray-700", icon: Circle },
  in_progress: { label: "进行中", color: "bg-blue-100 text-blue-700", icon: Loader2 },
  done: { label: "已完成", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
};

const priorityConfig: Record<string, { label: string; dotColor: string }> = {
  high: { label: "高", dotColor: "bg-red-500" },
  medium: { label: "中", dotColor: "bg-amber-500" },
  low: { label: "低", dotColor: "bg-gray-400" },
};

function getTaskStatus(task: SharedTask): "todo" | "in_progress" | "done" {
  if (task.is_completed) return "done";
  if (task.phase_status === "in_progress") return "in_progress";
  return "todo";
}

const statusMap: Record<string, string> = { "待办": "todo", "进行中": "in_progress", "已完成": "done" };
const priorityMap: Record<string, string> = { "高": "high", "中": "medium", "低": "low" };

/* ================================================================
   页面组件
   ================================================================ */

export default function TasksPage() {
  const [tasks, setTasks] = useState(SHARED_TASKS);
  const [statusFilter, setStatusFilter] = useState("全部");
  const [priorityFilter, setPriorityFilter] = useState("全部优先级");
  const [phaseFilter, setPhaseFilter] = useState("全部阶段");
  const [keyword, setKeyword] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

  const filtered = useMemo(() => tasks
    .filter((t) => statusFilter === "全部" || getTaskStatus(t) === statusMap[statusFilter])
    .filter((t) => priorityFilter === "全部优先级" || t.priority === priorityMap[priorityFilter])
    .filter((t) => phaseFilter === "全部阶段" || t.phase_title === phaseFilter)
    .filter((t) => !keyword || t.content.includes(keyword) || t.phase_title.includes(keyword)),
  [tasks, statusFilter, priorityFilter, phaseFilter, keyword]);

  const toggleTask = (taskId: string) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, is_completed: !t.is_completed } : t));
  };

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.is_completed).length;
    const inProgress = tasks.filter((t) => !t.is_completed && t.phase_status === "in_progress").length;
    const highPriority = tasks.filter((t) => t.priority === "high" && !t.is_completed).length;
    return { total, done, inProgress, highPriority };
  }, [tasks]);

  const groupedByStatus = {
    in_progress: filtered.filter((t) => getTaskStatus(t) === "in_progress"),
    todo: filtered.filter((t) => getTaskStatus(t) === "todo"),
    done: filtered.filter((t) => getTaskStatus(t) === "done"),
  };

  return (
    <div className="space-y-5">
      {/* 同步提示 */}
      <div className="rounded-xl bg-blue-50/50 dark:bg-blue-500/5 border border-blue-200/50 p-3 flex items-center justify-between">
        <p className="text-xs text-blue-700 dark:text-blue-400">
          📊 任务数据与「AI 综合规划」完全同步，在任一处修改都会实时反映
        </p>
        <Link href="/ai/plan" className="text-xs text-blue-600 hover:underline flex items-center gap-1 shrink-0">
          前往 AI 规划 <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "总任务", value: stats.total, icon: CheckSquare, color: "text-blue-600 bg-blue-50" },
          { label: "已完成", value: stats.done, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
          { label: "进行中", value: stats.inProgress, icon: Loader2, color: "text-amber-600 bg-amber-50" },
          { label: "高优先级待办", value: stats.highPriority, icon: Flame, color: "text-red-600 bg-red-50" },
        ].map((stat) => (
          <Card key={stat.label} className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索任务..." className="pl-10 h-10 rounded-xl" />
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
            <button onClick={() => setViewMode("list")}
              className={cn("rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
                viewMode === "list" ? "bg-background shadow-sm" : "text-muted-foreground")}>
              <List className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setViewMode("kanban")}
              className={cn("rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
                viewMode === "kanban" ? "bg-background shadow-sm" : "text-muted-foreground")}>
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn("rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {PRIORITY_FILTERS.map((p) => (
            <button key={p} onClick={() => setPriorityFilter(p)}
              className={cn("rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                priorityFilter === p ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {PHASE_FILTERS.map((ph) => (
            <button key={ph} onClick={() => setPhaseFilter(ph)}
              className={cn("rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-all",
                phaseFilter === ph ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
              {ph}
            </button>
          ))}
        </div>
      </div>

      {/* 看板视图 */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {([
            { id: "in_progress", title: "进行中", color: "border-t-amber-400", tasks: groupedByStatus.in_progress },
            { id: "todo", title: "待办", color: "border-t-gray-400", tasks: groupedByStatus.todo },
            { id: "done", title: "已完成", color: "border-t-green-400", tasks: groupedByStatus.done },
          ]).map((col) => (
            <div key={col.id} className={cn("rounded-xl border border-border/50 border-t-4 bg-muted/20 p-4", col.color)}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-sm">{col.title}</h4>
                <Badge variant="outline" className="text-xs">{col.tasks.length}</Badge>
              </div>
              <div className="space-y-2">
                {col.tasks.map((task) => (
                  <Card key={task.id} className="shadow-sm hover:shadow-md transition-all">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <button onClick={() => toggleTask(task.id)} className="shrink-0 mt-0.5">
                          {task.is_completed ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4 text-muted-foreground/30 hover:text-primary/50 transition-colors" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-xs leading-relaxed", task.is_completed && "line-through text-muted-foreground")}>{task.content}</p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Badge variant="outline" className="text-[9px]">{task.phase_title}</Badge>
                            <div className={cn("h-2 w-2 rounded-full", priorityConfig[task.priority].dotColor)} />
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
      )}

      {/* 列表视图（按状态分组） */}
      {viewMode === "list" && Object.entries(groupedByStatus).map(([status, statusTasks]) => {
        if (statusTasks.length === 0) return null;
        const config = statusConfig[status];
        const StatusIcon = config.icon;
        return (
          <div key={status}>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <StatusIcon className="h-4 w-4" />
              {config.label}
              <span className="text-xs text-muted-foreground font-normal">({statusTasks.length})</span>
            </h3>
            <div className="space-y-2">
              <AnimatePresence>
                {statusTasks.map((task, i) => (
                  <motion.div key={task.id}
                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}>
                    <Card className="shadow-sm hover:shadow-md transition-all group">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={cn("h-2.5 w-2.5 rounded-full shrink-0 mt-1.5", priorityConfig[task.priority].dotColor)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <button onClick={() => toggleTask(task.id)} className="shrink-0">
                                {task.is_completed ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4 text-muted-foreground/30 hover:text-primary/50 transition-colors" />}
                              </button>
                              <h4 className={cn("text-sm font-medium", task.is_completed && "line-through text-muted-foreground")}>
                                {task.content}
                              </h4>
                              <Badge className={cn("text-xs border-0", config.color)}>{config.label}</Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground ml-6">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> {task.phase_month}
                              </span>
                              <span className="flex items-center gap-1">
                                <Tag className="h-3 w-3" /> {task.phase_title}
                              </span>
                              <Badge variant="outline" className={cn("text-xs", task.priority === "high" ? "text-red-500" : task.priority === "medium" ? "text-amber-500" : "text-blue-500")}>
                                {priorityConfig[task.priority].label}优先级
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        );
      })}

      <div className="text-center text-xs text-muted-foreground py-4">
        共 {filtered.length} 个任务
      </div>
    </div>
  );
}
