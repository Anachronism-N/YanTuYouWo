"use client";

import { useState } from "react";
import {
  MessageSquare, Search, Eye, EyeOff, Trash2, CheckCircle2,
  FileText, Clock, Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CommunityPost {
  id: number;
  title: string;
  author: string;
  category: string;
  status: "published" | "pending" | "hidden";
  createdAt: string;
}

const mockPosts: CommunityPost[] = [
  { id: 1, title: "北大计算机保研经验分享：从准备到上岸全记录", author: "学长很靠谱", category: "经验分享", status: "published", createdAt: "2026-04-13 14:30" },
  { id: 2, title: "有没有人了解浙大 CS 夏令营的笔试难度？", author: "迷茫大三人", category: "问答互助", status: "published", createdAt: "2026-04-13 10:15" },
  { id: 3, title: "求推荐好的推免信息渠道", author: "保研小白", category: "问答互助", status: "pending", createdAt: "2026-04-12 22:40" },
  { id: 4, title: "面试被刷后的心路历程", author: "匿名用户", category: "树洞", status: "pending", createdAt: "2026-04-12 18:20" },
  { id: 5, title: "分享一些可白嫖的竞赛资料", author: "竞赛选手", category: "资料分享", status: "hidden", createdAt: "2026-04-11 09:00" },
];

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  published: { label: "已发布", class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  pending: { label: "待审核", class: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  hidden: { label: "已隐藏", class: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400" },
};

const statsCards = [
  { label: "总帖子数", value: "326", icon: FileText, color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10" },
  { label: "待审核", value: "12", icon: Clock, color: "text-amber-600 bg-amber-50 dark:bg-amber-500/10" },
  { label: "今日新增", value: "18", icon: Users, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" },
];

export default function AdminCommunityPage() {
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = mockPosts.filter((p) => {
    if (keyword && !p.title.includes(keyword) && !p.author.includes(keyword)) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">社群管理</h1>
        <p className="text-sm text-muted-foreground mt-0.5">审核帖子内容，维护社群秩序</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statsCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shrink-0", s.color)}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索帖子标题、作者..." value={keyword} onChange={(e) => setKeyword(e.target.value)} className="pl-9 h-9 rounded-xl" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-xl border bg-background px-3 text-sm">
          <option value="">全部状态</option>
          <option value="published">已发布</option>
          <option value="pending">待审核</option>
          <option value="hidden">已隐藏</option>
        </select>
        <Badge variant="secondary" className="text-xs">{filtered.length} 条记录</Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">帖子标题</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-24">作者</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-24">分类</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">状态</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-36">发布时间</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground w-32">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        <span className="font-medium truncate max-w-xs">{p.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{p.author}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{p.category}</Badge></td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-[10px]", STATUS_MAP[p.status].class)}>{STATUS_MAP[p.status].label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.createdAt}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {p.status === "pending" && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /></Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          {p.status === "hidden" ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
