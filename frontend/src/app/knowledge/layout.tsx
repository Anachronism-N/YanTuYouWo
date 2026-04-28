"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen, GraduationCap, Video, FileQuestion,
  FileText, Star, Lightbulb, Search, TrendingUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const knowledgeNav = [
  { title: "知识库首页", href: "/knowledge", icon: BookOpen, exact: true },
  { title: "院校百科", href: "/knowledge/schools", icon: GraduationCap },
  { title: "录播课程", href: "/knowledge/courses", icon: Video },
  { title: "面试题库", href: "/knowledge/questions", icon: FileQuestion },
  { title: "文书模板", href: "/knowledge/templates", icon: FileText },
  { title: "经验精选", href: "/knowledge/experiences", icon: Star },
  { title: "信息差速递", href: "/knowledge/tips", icon: Lightbulb },
];

const hotSearches = ["夏令营面试", "个人陈述", "推荐信", "英语口语", "计算机保研"];

export default function KnowledgeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 顶部标题 + 搜索 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 text-violet-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">保研知识库</h1>
              <p className="text-sm text-muted-foreground">院校百科 · 面试题库 · 文书模板 · 经验精选</p>
            </div>
          </div>
        </div>
        {/* 搜索栏 */}
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 h-11 rounded-xl border border-input bg-transparent px-3.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 transition-colors">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="搜索知识库内容..."
              className="flex-1 h-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">热门搜索：</span>
            {hotSearches.map((s) => (
              <button key={s} className="text-xs text-primary/70 hover:text-primary transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* 左侧导航 */}
        <aside className="hidden lg:block w-56 shrink-0">
          <Card className="sticky top-20 shadow-sm">
            <nav className="p-2 space-y-1">
              {knowledgeNav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}
                    className={cn("flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                      (item.exact ? pathname === item.href : pathname.startsWith(item.href) && !item.exact)
                        ? "bg-violet-500/10 text-violet-700 dark:text-violet-400"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}>
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </Card>
        </aside>

        {/* 移动端导航 */}
        <div className="lg:hidden mb-4 w-full">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-2">
            {knowledgeNav.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href) && !item.exact;
              return (
                <Link key={item.href} href={item.href}
                  className={cn("flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-all",
                    isActive ? "bg-violet-500/10 text-violet-700" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {item.title}
                </Link>
              );
            })}
          </div>
        </div>

        {/* 主内容区 */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
