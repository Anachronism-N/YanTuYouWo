"use client";

import { useState } from "react";
import {
  BookOpen, Plus, Edit3, Trash2, Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface JournalItem {
  id: number;
  name: string;
  level: string;
  subject: string;
  metric: string;
}

const mockJournals: JournalItem[] = [
  { id: 1, name: "Nature Machine Intelligence", level: "SCI Q1", subject: "计算机科学", metric: "IF 25.898" },
  { id: 2, name: "IEEE TPAMI", level: "SCI Q1", subject: "人工智能", metric: "IF 23.600" },
  { id: 3, name: "计算机学报", level: "CCF A (中文)", subject: "计算机科学", metric: "IF 3.621" },
];

const mockConferences: JournalItem[] = [
  { id: 101, name: "NeurIPS 2026", level: "CCF A", subject: "机器学习", metric: "录用率 ~25%" },
  { id: 102, name: "CVPR 2026", level: "CCF A", subject: "计算机视觉", metric: "录用率 ~26%" },
  { id: 103, name: "ACL 2026", level: "CCF A", subject: "自然语言处理", metric: "录用率 ~22%" },
];

const LEVEL_STYLES: Record<string, string> = {
  "SCI Q1": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "CCF A (中文)": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "CCF A": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

export default function AdminJournalsPage() {
  const [tab, setTab] = useState<"journals" | "conferences">("journals");
  const [keyword, setKeyword] = useState("");

  const data = tab === "journals" ? mockJournals : mockConferences;
  const filtered = data.filter((item) => {
    if (keyword && !item.name.includes(keyword) && !item.subject.includes(keyword)) return false;
    return true;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">期刊会议管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">管理学术期刊与会议信息</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> 添加
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex rounded-xl bg-muted/40 p-1">
          <button onClick={() => { setTab("journals"); setKeyword(""); }} className={cn(
            "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
            tab === "journals" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}>
            期刊
          </button>
          <button onClick={() => { setTab("conferences"); setKeyword(""); }} className={cn(
            "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
            tab === "conferences" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}>
            会议
          </button>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索名称、学科..." value={keyword} onChange={(e) => setKeyword(e.target.value)} className="pl-9 h-9 rounded-xl" />
        </div>

        <Badge variant="secondary" className="text-xs">{filtered.length} 条记录</Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">名称</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28">级别</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28">学科</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28">{tab === "journals" ? "IF" : "录用率"}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground w-28">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-[10px]", LEVEL_STYLES[item.level] || "bg-gray-100 text-gray-600")}>{item.level}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.subject}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{item.metric}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
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
    </div>
  );
}
