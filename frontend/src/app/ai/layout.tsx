"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, FileText, Target, GraduationCap, Mic, Heart, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const aiNavItems = [
  { title: "简历工坊", href: "/ai/resume", icon: FileText, description: "AI 辅助打造保研简历" },
  { title: "择校推荐", href: "/ai/recommend", icon: Target, description: "智能匹配目标院校" },
  { title: "导师推荐", href: "/ai/tutor-match", icon: GraduationCap, description: "AI 匹配心仪导师" },
  { title: "模拟面试", href: "/ai/interview", icon: Mic, description: "AI 模拟面试练习" },
  { title: "心理支持", href: "/ai/mental", icon: Heart, description: "保研路上的温暖陪伴" },
  { title: "综合规划", href: "/ai/plan", icon: Calendar, description: "AI 定制保研时间线" },
];

export default function AILayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 顶部标题区 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 text-violet-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">AI 辅导</h1>
        </div>
        <p className="text-muted-foreground">AI 驱动的保研辅助工具，助你高效准备</p>
      </div>

      {/* 功能导航 Tab */}
      <div className="mb-6 flex gap-3">
        {aiNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </div>

      {/* 内容区 */}
      {children}
    </div>
  );
}
