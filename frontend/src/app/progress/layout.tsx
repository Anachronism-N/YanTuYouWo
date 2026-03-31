"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, ClipboardList, CheckSquare, Trophy,
  Calendar, Target, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const progressNav = [
  { title: "进度总览", href: "/progress", icon: BarChart3, exact: true },
  { title: "我的规划", href: "/progress/plan", icon: ClipboardList },
  { title: "任务追踪", href: "/progress/tasks", icon: CheckSquare },
  { title: "成果记录", href: "/progress/achievements", icon: Trophy },
  { title: "学习打卡", href: "/progress/checkin", icon: Calendar },
];

export default function ProgressLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 顶部标题 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 text-emerald-600">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">进度中心</h1>
              <p className="text-sm text-muted-foreground">规划 · 追踪 · 记录 · 成长</p>
            </div>
          </div>
          <Link href="/ai/plan"
            className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors">
            🤖 AI 综合规划 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* 横向标签导航 */}
      <div className="mb-6 border-b">
        <div className="flex gap-1 overflow-x-auto scrollbar-thin pb-px">
          {progressNav.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href) && !item.exact;
            return (
              <Link key={item.href} href={item.href}
                className={cn("flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all",
                  isActive
                    ? "border-emerald-500 text-emerald-700 dark:text-emerald-400"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30")}>
                <Icon className="h-4 w-4 shrink-0" />
                {item.title}
              </Link>
            );
          })}
        </div>
      </div>

      {/* 主内容区 */}
      <main>
        {children}
      </main>
    </div>
  );
}
