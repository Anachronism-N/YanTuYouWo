"use client";

import { useState } from "react";
import {
  FileText, Plus, Search, Edit3, Trash2, Eye, ExternalLink,
  Filter, X, ChevronDown, Upload, MoreHorizontal,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AdminNotice {
  id: number;
  title: string;
  school: string;
  department: string;
  type: string;
  status: "published" | "draft" | "archived";
  source: "crawler" | "manual";
  createdAt: string;
  viewCount: number;
}

const mockNotices: AdminNotice[] = [
  { id: 1, title: "2026年推免夏令营招生通知", school: "北京大学", department: "计算机科学与技术学院", type: "夏令营", status: "published", source: "crawler", createdAt: "2026-04-13", viewCount: 1234 },
  { id: 2, title: "2026年推荐免试研究生预报名通知", school: "清华大学", department: "电子工程系", type: "预推免", status: "published", source: "crawler", createdAt: "2026-04-12", viewCount: 987 },
  { id: 3, title: "2026年优秀大学生夏令营", school: "浙江大学", department: "计算机科学与技术学院", type: "夏令营", status: "published", source: "manual", createdAt: "2026-04-11", viewCount: 756 },
  { id: 4, title: "招收推免研究生宣讲会", school: "复旦大学", department: "信息科学与工程学院", type: "宣讲会", status: "draft", source: "manual", createdAt: "2026-04-10", viewCount: 0 },
  { id: 5, title: "入营名单公示", school: "上海交通大学", department: "电子信息与电气工程学院", type: "入营名单", status: "archived", source: "crawler", createdAt: "2026-04-09", viewCount: 543 },
];

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  published: { label: "已发布", class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  draft: { label: "草稿", class: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  archived: { label: "已归档", class: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400" },
};

export default function AdminNoticesPage() {
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const filtered = mockNotices.filter((n) => {
    if (keyword && !n.title.includes(keyword) && !n.school.includes(keyword)) return false;
    if (statusFilter && n.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">通知管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">管理推免通知，支持手动添加和编辑爬虫抓取的内容</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> 添加通知
        </Button>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索标题、学校..." value={keyword} onChange={(e) => setKeyword(e.target.value)} className="pl-9 rounded-xl" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-xl border bg-background px-3 text-sm">
          <option value="">全部状态</option>
          <option value="published">已发布</option>
          <option value="draft">草稿</option>
          <option value="archived">已归档</option>
        </select>
        <Badge variant="secondary" className="text-xs">{filtered.length} 条记录</Badge>
      </div>

      {/* 通知列表 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">通知信息</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-24">类型</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">状态</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">来源</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-24">浏览量</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground w-28">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((n) => (
                  <tr key={n.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.school} · {n.department} · {n.createdAt}</p>
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{n.type}</Badge></td>
                    <td className="px-4 py-3"><Badge className={cn("text-[10px]", STATUS_MAP[n.status].class)}>{STATUS_MAP[n.status].label}</Badge></td>
                    <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{n.source === "crawler" ? "🤖 爬虫" : "✍️ 手动"}</span></td>
                    <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{n.viewCount.toLocaleString()}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Edit3 className="h-3.5 w-3.5" /></Button>
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

      {/* 创建/编辑对话框 — 简化版 */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <Card className="w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-bold">添加通知</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium block mb-1.5">学校</label><Input placeholder="如：北京大学" /></div>
                <div><label className="text-sm font-medium block mb-1.5">学院</label><Input placeholder="如：计算机学院" /></div>
              </div>
              <div><label className="text-sm font-medium block mb-1.5">通知标题</label><Input placeholder="通知完整标题" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5">类型</label>
                  <select className="w-full h-9 rounded-lg border bg-background px-3 text-sm"><option>夏令营</option><option>预推免</option><option>宣讲会</option><option>入营名单</option></select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">状态</label>
                  <select className="w-full h-9 rounded-lg border bg-background px-3 text-sm"><option>已发布</option><option>草稿</option></select>
                </div>
              </div>
              <div><label className="text-sm font-medium block mb-1.5">通知原文内容</label><textarea className="w-full rounded-lg border bg-background px-4 py-3 text-sm min-h-[120px] resize-y" placeholder="支持 Markdown 格式" /></div>
              <div><label className="text-sm font-medium block mb-1.5">原文链接</label><Input placeholder="https://..." /></div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
                <Button onClick={() => setShowCreate(false)}>发布</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
