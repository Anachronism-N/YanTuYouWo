"use client";

import { useState } from "react";
import {
  LayoutDashboard, FileText, Building2, Users, Trophy, BookOpen,
  MessageSquare, TrendingUp, Clock, AlertCircle, CheckCircle2,
  ArrowUpRight, Upload, Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const stats = [
  { label: "推免通知", value: "916", change: "+23 本周", icon: FileText, color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10", href: "/admin/notices" },
  { label: "收录院校", value: "39", change: "985 高校", icon: Building2, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10", href: "/admin/schools" },
  { label: "注册用户", value: "1,280", change: "+56 本周", icon: Users, color: "text-violet-600 bg-violet-50 dark:bg-violet-500/10", href: "/admin/analytics" },
  { label: "社群帖子", value: "326", change: "+18 今日", icon: MessageSquare, color: "text-amber-600 bg-amber-50 dark:bg-amber-500/10", href: "/admin/community" },
];

const recentActions = [
  { action: "爬虫系统抓取新通知 23 条", time: "10 分钟前", type: "success" as const },
  { action: "用户 @学长很靠谱 发布新帖", time: "25 分钟前", type: "info" as const },
  { action: "竞赛信息「数学建模」状态更新为报名中", time: "1 小时前", type: "info" as const },
  { action: "系统检测到 2 条通知链接失效", time: "2 小时前", type: "warning" as const },
  { action: "用户 @小明 举报了一条评论", time: "3 小时前", type: "warning" as const },
  { action: "每日数据备份完成", time: "6 小时前", type: "success" as const },
];

const quickActions = [
  { label: "发布通知", href: "/admin/notices", icon: FileText, desc: "手动添加推免通知" },
  { label: "上传内容", href: "/admin/upload", icon: Upload, desc: "上传课程/模板/资料" },
  { label: "查看数据", href: "/admin/analytics", icon: TrendingUp, desc: "用户与访问统计" },
  { label: "审核内容", href: "/admin/community", icon: Eye, desc: "社群帖子审核" },
];

export default function AdminDashboard() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">管理后台</h1>
        <p className="text-sm text-muted-foreground mt-1">欢迎回来，这里是系统运行概览</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.color}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <Badge variant="secondary" className="text-[10px]">{s.change}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 快捷操作 */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold mb-3">快捷操作</h2>
          <div className="space-y-2">
            {quickActions.map((a) => (
              <Link key={a.label} href={a.href}>
                <Card className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <a.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{a.label}</p>
                      <p className="text-xs text-muted-foreground">{a.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* 最近动态 */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-3">最近动态</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentActions.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                    {a.type === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />}
                    {a.type === "info" && <FileText className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />}
                    {a.type === "warning" && <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{a.action}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {a.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
