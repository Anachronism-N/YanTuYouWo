"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare, Flame, BookOpen, HelpCircle,
  PenSquare, Calendar, Users, TrendingUp,
  Award, Star, Megaphone, Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";

const communityNav = [
  { title: "热门帖子", href: "/community", icon: Flame, exact: true },
  { title: "经验分享", href: "/community/experience", icon: BookOpen },
  { title: "问答专区", href: "/community/qa", icon: HelpCircle },
  { title: "学习打卡", href: "/progress/checkin", icon: Calendar },
  { title: "资料广场", href: "/community/resources", icon: Award },
  { title: "树洞", href: "/community/confessions", icon: Heart },
];

const hotTags = [
  { name: "夏令营经验", count: 128 },
  { name: "面试技巧", count: 96 },
  { name: "择校建议", count: 85 },
  { name: "科研入门", count: 72 },
  { name: "英语准备", count: 64 },
  { name: "简历优化", count: 58 },
  { name: "导师选择", count: 52 },
  { name: "心态调整", count: 45 },
];

const communityStats = {
  members: "12.8k",
  posts: "3.2k",
  todayActive: 256,
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 顶部标题 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 text-orange-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">保研社群</h1>
              <p className="text-sm text-muted-foreground">交流经验、互助答疑、共同成长</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 社群统计 */}
            <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground mr-2">
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {communityStats.members} 成员</span>
              <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {communityStats.posts} 帖子</span>
              <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-orange-500" /> {communityStats.todayActive} 今日活跃</span>
            </div>
            <Link href="/community/create"
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
              <PenSquare className="h-4 w-4" /> 发帖
            </Link>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* 左侧导航 - 统一 sticky 容器 */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-20 space-y-6 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin pb-4">
            {/* 导航菜单 */}
            <nav className="space-y-1">
              {communityNav.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}
                    className={cn("flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}>
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>

            {/* 热门标签 */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 px-2">
                <TrendingUp className="h-4 w-4 text-primary" /> 热门话题
              </h3>
              <div className="space-y-0.5">
                {hotTags.map((tag, i) => {
                  const rankColor = i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-700 dark:text-amber-600" : "text-muted-foreground/50";
                  return (
                    <Link key={tag.name} href={`/community?tag=${encodeURIComponent(tag.name)}`}
                      className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-primary/5 hover:text-foreground transition-all hover:translate-x-0.5">
                      <span className="flex items-center gap-2">
                        <span className={cn("text-xs font-bold w-4 shrink-0", rankColor)}>{i + 1}</span>
                        <span className="truncate"># {tag.name}</span>
                      </span>
                      <span className="text-xs shrink-0 ml-2">{tag.count}</span>
                    </Link>
                  );
                })}
              </div>
              {/* 话题热度云 */}
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-xs font-semibold text-muted-foreground mb-3">话题热度</h4>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "保研经验", size: "text-sm", weight: "font-semibold", color: "text-primary" },
                    { label: "择校", size: "text-xs", weight: "font-medium", color: "text-blue-600 dark:text-blue-400" },
                    { label: "面试", size: "text-base", weight: "font-bold", color: "text-primary" },
                    { label: "导师", size: "text-xs", weight: "font-normal", color: "text-muted-foreground" },
                    { label: "夏令营", size: "text-sm", weight: "font-semibold", color: "text-violet-600 dark:text-violet-400" },
                    { label: "GPA", size: "text-xs", weight: "font-medium", color: "text-emerald-600 dark:text-emerald-400" },
                    { label: "简历", size: "text-sm", weight: "font-medium", color: "text-amber-600 dark:text-amber-400" },
                    { label: "预推免", size: "text-base", weight: "font-bold", color: "text-rose-600 dark:text-rose-400" },
                    { label: "英语", size: "text-xs", weight: "font-normal", color: "text-muted-foreground" },
                    { label: "科研", size: "text-sm", weight: "font-semibold", color: "text-cyan-600 dark:text-cyan-400" },
                  ].map((t) => (
                    <span key={t.label} className={`${t.size} ${t.weight} ${t.color} hover:opacity-70 cursor-pointer transition-opacity`}>
                      {t.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 公告 */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 px-2">
                <Megaphone className="h-4 w-4 text-amber-500" /> 社群公告
              </h3>
              <div className="rounded-xl border bg-amber-50/50 dark:bg-amber-500/5 p-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  📢 2026 年夏令营信息汇总帖已更新，欢迎补充！
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">2026-03-31</p>
              </div>
            </div>
          </div>
        </aside>

        {/* 移动端导航 */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t px-2 py-2 flex justify-around safe-area-bottom">
          {communityNav.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={cn("flex flex-col items-center gap-0.5 py-1 px-2 text-xs rounded-lg transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground")}>
                <Icon className="h-5 w-5" />
                {item.title}
              </Link>
            );
          })}
        </div>

        {/* 主内容区 - 移动端底部留出导航空间 */}
        <main className="flex-1 min-w-0 pb-16 lg:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
