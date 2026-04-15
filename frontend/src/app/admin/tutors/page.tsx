"use client";

import { useState } from "react";
import {
  Users, Plus, Search, Edit3, Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AdminTutor {
  id: number;
  name: string;
  school: string;
  department: string;
  title: string;
  research: string;
  enrolling: boolean;
}

const mockTutors: AdminTutor[] = [
  { id: 1, name: "张三", school: "北京大学", department: "计算机科学与技术学院", title: "教授/博导", research: "人工智能、自然语言处理", enrolling: true },
  { id: 2, name: "李四", school: "清华大学", department: "电子工程系", title: "副教授/硕导", research: "计算机视觉、深度学习", enrolling: true },
  { id: 3, name: "王五", school: "浙江大学", department: "控制科学与工程学院", title: "教授/博导", research: "机器人学、强化学习", enrolling: false },
  { id: 4, name: "赵六", school: "复旦大学", department: "计算机科学技术学院", title: "副教授/博导", research: "数据挖掘、知识图谱", enrolling: true },
  { id: 5, name: "刘七", school: "南京大学", department: "人工智能学院", title: "教授/博导", research: "机器学习、因果推理", enrolling: false },
];

export default function AdminTutorsPage() {
  const [keyword, setKeyword] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");

  const schools = [...new Set(mockTutors.map((t) => t.school))];

  const filtered = mockTutors.filter((t) => {
    if (keyword && !t.name.includes(keyword) && !t.research.includes(keyword)) return false;
    if (schoolFilter && t.school !== schoolFilter) return false;
    return true;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">导师管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">管理导师信息库，维护招生状态与研究方向</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> 添加导师
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索姓名、研究方向..." value={keyword} onChange={(e) => setKeyword(e.target.value)} className="pl-9 h-9 rounded-xl" />
        </div>
        <select value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)} className="h-9 rounded-xl border bg-background px-3 text-sm">
          <option value="">全部学校</option>
          {schools.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <Badge variant="secondary" className="text-xs">{filtered.length} 位导师</Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">姓名</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">学校</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">学院</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28">职称</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">研究方向</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-24">招生状态</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground w-28">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                          {t.name[0]}
                        </div>
                        <span className="font-medium">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.school}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{t.department}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{t.title}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{t.research}</td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-[10px]", t.enrolling
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400"
                      )}>
                        {t.enrolling ? "招生中" : "暂停招生"}
                      </Badge>
                    </td>
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
