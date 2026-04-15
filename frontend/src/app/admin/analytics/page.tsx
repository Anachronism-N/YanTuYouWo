"use client";

import {
  BarChart3, Users, Activity, Database, TrendingUp, Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const topStats = [
  { label: "今日访问", value: "2,345", icon: Activity, color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10", change: "+12%" },
  { label: "本周注册", value: "56", icon: Users, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10", change: "+8%" },
  { label: "月活用户", value: "1,280", icon: TrendingUp, color: "text-violet-600 bg-violet-50 dark:bg-violet-500/10", change: "+15%" },
  { label: "总数据量", value: "2,548", icon: Database, color: "text-amber-600 bg-amber-50 dark:bg-amber-500/10", change: "通知+院校+导师" },
];

const weeklyVisits = [
  { day: "周一", value: 320 },
  { day: "周二", value: 450 },
  { day: "周三", value: 380 },
  { day: "周四", value: 520 },
  { day: "周五", value: 490 },
  { day: "周六", value: 280 },
  { day: "周日", value: 345 },
];
const maxVisit = Math.max(...weeklyVisits.map((d) => d.value));

const contentDistribution = [
  { label: "通知", count: "916条", percent: 75, color: "bg-blue-500" },
  { label: "院校", count: "39所", percent: 95, color: "bg-emerald-500" },
  { label: "导师", count: "1280位", percent: 60, color: "bg-violet-500" },
  { label: "帖子", count: "326条", percent: 45, color: "bg-amber-500" },
];

const hotKeywords = [
  { text: "夏令营", size: "text-lg" },
  { text: "推免", size: "text-xl" },
  { text: "北大", size: "text-base" },
  { text: "清华", size: "text-base" },
  { text: "计算机", size: "text-lg" },
  { text: "预推免", size: "text-sm" },
  { text: "面试经验", size: "text-base" },
  { text: "入营通知", size: "text-sm" },
  { text: "985高校", size: "text-lg" },
  { text: "个人陈述", size: "text-sm" },
];

export default function AdminAnalyticsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">数据统计</h1>
        <p className="text-sm text-muted-foreground mt-0.5">平台运营数据概览与趋势分析</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topStats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", s.color)}>
                  <s.icon className="h-5 w-5" />
                </div>
                <Badge variant="secondary" className="text-[10px]">{s.change}</Badge>
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 访问趋势 */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">访问趋势</h2>
              <span className="text-xs text-muted-foreground ml-auto">最近 7 天</span>
            </div>
            <div className="flex items-end justify-between gap-2 h-40">
              {weeklyVisits.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-medium">{d.value}</span>
                  <div
                    className="w-full rounded-t-md bg-primary/80 hover:bg-primary transition-colors min-h-[4px]"
                    style={{ height: `${(d.value / maxVisit) * 100}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{d.day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 内容分布 */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <Database className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">内容分布</h2>
            </div>
            <div className="space-y-4">
              {contentDistribution.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground text-xs">{item.count} · {item.percent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", item.color)} style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 热门搜索词 */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <Search className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">热门搜索词</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {hotKeywords.map((kw) => (
              <span key={kw.text} className={cn(
                "inline-block rounded-xl bg-muted/50 px-3 py-1.5 font-medium text-foreground/80 hover:bg-primary/10 hover:text-primary transition-colors cursor-default",
                kw.size,
              )}>
                {kw.text}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
