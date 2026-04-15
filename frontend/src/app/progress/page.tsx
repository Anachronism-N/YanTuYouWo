"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BarChart3, CheckSquare, Trophy, Calendar,
  ClipboardList, TrendingUp, Flame, Target,
  ArrowRight, Clock, Zap, Award, Network,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import PathGraph from "@/components/graph/PathGraph";

/* ================================================================
   Mock 统计数据
   ================================================================ */

const stats = {
  total_tasks: 24,
  completed_tasks: 16,
  in_progress_tasks: 5,
  overdue_tasks: 3,
  completion_rate: 66.7,
  streak_days: 7,
  total_achievements: 8,
  weekly_completed: 4,
};

const recentTasks = [
  { id: 1, title: "完成个人陈述初稿", status: "in_progress" as const, priority: "high" as const, due_date: "2026-04-05" },
  { id: 2, title: "联系 3 位目标导师", status: "todo" as const, priority: "high" as const, due_date: "2026-04-10" },
  { id: 3, title: "准备英语自我介绍", status: "in_progress" as const, priority: "medium" as const, due_date: "2026-04-08" },
  { id: 4, title: "整理科研项目材料", status: "done" as const, priority: "medium" as const, due_date: "2026-03-30" },
  { id: 5, title: "复习数据结构", status: "overdue" as const, priority: "high" as const, due_date: "2026-03-28" },
];

const recentAchievements = [
  { id: 1, title: "发表 SCI 论文一篇", type: "论文", date: "2026-03-20", importance: 5 },
  { id: 2, title: "获得数学建模国赛二等奖", type: "竞赛", date: "2026-03-15", importance: 4 },
  { id: 3, title: "通过 CET-6（580 分）", type: "英语", date: "2026-03-10", importance: 3 },
];

const statusConfig = {
  todo: { label: "待办", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  in_progress: { label: "进行中", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  done: { label: "已完成", color: "bg-green-100 text-green-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  overdue: { label: "已逾期", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const priorityConfig = {
  high: { label: "高", color: "text-red-500 dark:text-red-400" },
  medium: { label: "中", color: "text-amber-500 dark:text-amber-400" },
  low: { label: "低", color: "text-gray-400 dark:text-gray-500" },
};

/* ================================================================
   页面组件
   ================================================================ */

export default function ProgressPage() {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">进度中心</h1>
            <p className="text-sm text-muted-foreground">规划管理、任务追踪、成果记录</p>
          </div>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "总体完成率", value: `${stats.completion_rate}%`, icon: Target, color: "text-emerald-500 bg-emerald-50", sub: `${stats.completed_tasks}/${stats.total_tasks} 任务` },
          { label: "本周完成", value: `${stats.weekly_completed} 项`, icon: CheckSquare, color: "text-blue-500 bg-blue-50", sub: "继续保持！" },
          { label: "连续打卡", value: `${stats.streak_days} 天`, icon: Flame, color: "text-orange-500 bg-orange-50", sub: "状态很好" },
          { label: "成果记录", value: `${stats.total_achievements} 项`, icon: Trophy, color: "text-amber-500 bg-amber-50", sub: "持续积累中" },
        ].map((stat, i) => (
          <motion.div key={stat.label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}>
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", stat.color)}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-lg font-bold">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground/70 mt-2">{stat.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* 完成进度环形图 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-center gap-5">
            <div className="relative h-20 w-20 shrink-0">
              <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/30" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="97.4" strokeDashoffset={97.4 * (1 - 0.42)} className="text-primary transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold">42%</span>
              </div>
            </div>
            <div>
              <h3 className="font-semibold">总体进度</h3>
              <p className="text-sm text-muted-foreground mt-1">已完成 5/12 个阶段任务</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">比上周提升 8%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-center gap-5">
            <div className="relative h-20 w-20 shrink-0">
              <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/30" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="97.4" strokeDashoffset={97.4 * (1 - 0.75)} className="text-amber-500 transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold">75%</span>
              </div>
            </div>
            <div>
              <h3 className="font-semibold">材料准备</h3>
              <p className="text-sm text-muted-foreground mt-1">简历、推荐信、个人陈述</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">还需完善个人陈述</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 进度条 */}
      <Card className="shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-500" /> 保研进度总览
            </h3>
            <span className="text-sm font-bold text-emerald-600">{stats.completion_rate}%</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.completion_rate}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400"
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>已完成 {stats.completed_tasks} 项</span>
            <span>进行中 {stats.in_progress_tasks} 项</span>
            <span className="text-red-500">逾期 {stats.overdue_tasks} 项</span>
            <span>待办 {stats.total_tasks - stats.completed_tasks - stats.in_progress_tasks - stats.overdue_tasks} 项</span>
          </div>
        </CardContent>
      </Card>

      {/* 个人保研路径图谱 */}
      <PathGraph />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 近期任务 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-blue-500" /> 近期任务
            </h3>
            <Link href="/progress/tasks" className="text-xs text-primary hover:underline flex items-center gap-1">
              查看全部 <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 rounded-xl border p-3 hover:bg-muted/30 transition-colors">
                <div className={cn("h-2 w-2 rounded-full shrink-0", priorityConfig[task.priority].color.replace("text-", "bg-"))} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium truncate", task.status === "done" && "line-through text-muted-foreground")}>{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className={cn("text-xs border-0", statusConfig[task.status].color)}>
                      {statusConfig[task.status].label}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <Clock className="h-3 w-3" /> {task.due_date}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 近期成果 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" /> 近期成果
            </h3>
            <Link href="/progress/achievements" className="text-xs text-primary hover:underline flex items-center gap-1">
              查看全部 <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentAchievements.map((ach) => (
              <div key={ach.id} className="flex items-center gap-3 rounded-xl border p-3 hover:bg-muted/30 transition-colors">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-500/10 text-amber-600">
                  <Award className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ach.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-xs">{ach.type}</Badge>
                    <span className="text-xs text-muted-foreground">{ach.date}</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: ach.importance }).map((_, idx) => (
                        <Zap key={idx} className="h-3 w-3 text-amber-500 fill-amber-500" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { title: "查看规划", href: "/progress/plan", icon: ClipboardList, color: "from-violet-500/10 to-purple-500/10 text-violet-600" },
          { title: "添加任务", href: "/progress/tasks", icon: CheckSquare, color: "from-blue-500/10 to-cyan-500/10 text-blue-600" },
          { title: "记录成果", href: "/progress/achievements", icon: Trophy, color: "from-amber-500/10 to-yellow-500/10 text-amber-600" },
          { title: "今日打卡", href: "/progress/checkin", icon: Calendar, color: "from-emerald-500/10 to-green-500/10 text-emerald-600" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.title} href={item.href}>
              <Card className="shadow-sm hover:shadow-md transition-all group cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br", item.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">{item.title}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary ml-auto transition-colors" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
