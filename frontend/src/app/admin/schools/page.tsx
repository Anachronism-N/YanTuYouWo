"use client";

import { useState } from "react";
import {
  Building2, Plus, Search, Edit3, Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AdminSchool {
  id: number;
  name: string;
  level: "985" | "211" | "双一流";
  province: string;
  departmentCount: number;
  noticeCount: number;
}

const mockSchools: AdminSchool[] = [
  { id: 1, name: "北京大学", level: "985", province: "北京", departmentCount: 12, noticeCount: 87 },
  { id: 2, name: "清华大学", level: "985", province: "北京", departmentCount: 14, noticeCount: 92 },
  { id: 3, name: "浙江大学", level: "985", province: "浙江", departmentCount: 11, noticeCount: 76 },
  { id: 4, name: "南京大学", level: "985", province: "江苏", departmentCount: 9, noticeCount: 63 },
  { id: 5, name: "上海财经大学", level: "211", province: "上海", departmentCount: 6, noticeCount: 34 },
];

const LEVEL_STYLES: Record<string, string> = {
  "985": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "211": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  "双一流": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

export default function AdminSchoolsPage() {
  const [keyword, setKeyword] = useState("");
  const [levelFilter, setLevelFilter] = useState("");

  const filtered = mockSchools.filter((s) => {
    if (keyword && !s.name.includes(keyword) && !s.province.includes(keyword)) return false;
    if (levelFilter && s.level !== levelFilter) return false;
    return true;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">院校管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">管理收录的高校信息及其学院、通知关联</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> 添加院校
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索院校名称、省份..." value={keyword} onChange={(e) => setKeyword(e.target.value)} className="pl-9 h-9 rounded-xl" />
        </div>
        <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="h-9 rounded-xl border bg-background px-3 text-sm">
          <option value="">全部级别</option>
          <option value="985">985</option>
          <option value="211">211</option>
          <option value="双一流">双一流</option>
        </select>
        <Badge variant="secondary" className="text-xs">{filtered.length} 所院校</Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">学校名称</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">级别</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">省份</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">学院数</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">通知数</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground w-28">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-[10px]", LEVEL_STYLES[s.level])}>{s.level}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.province}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.departmentCount}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.noticeCount}</td>
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
