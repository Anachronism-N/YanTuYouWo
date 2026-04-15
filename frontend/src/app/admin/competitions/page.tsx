"use client";

import { useState } from "react";
import {
  Trophy, Plus, Search, Edit3, Trash2, Star,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AdminCompetition {
  id: number;
  name: string;
  level: "国家级" | "省部级" | "校级";
  status: "报名中" | "进行中" | "已结束";
  registrationDate: string;
  stars: number;
}

const mockCompetitions: AdminCompetition[] = [
  { id: 1, name: "全国大学生数学建模竞赛", level: "国家级", status: "报名中", registrationDate: "2026-05-01 ~ 2026-06-15", stars: 5 },
  { id: 2, name: "中国互联网+大学生创新创业大赛", level: "国家级", status: "进行中", registrationDate: "2026-03-01 ~ 2026-04-30", stars: 5 },
  { id: 3, name: "全国大学生电子设计竞赛", level: "国家级", status: "报名中", registrationDate: "2026-05-10 ~ 2026-07-01", stars: 4 },
  { id: 4, name: "ACM-ICPC 亚洲区域赛", level: "国家级", status: "已结束", registrationDate: "2025-09-01 ~ 2025-10-15", stars: 5 },
  { id: 5, name: "蓝桥杯全国软件大赛", level: "省部级", status: "进行中", registrationDate: "2026-01-15 ~ 2026-03-20", stars: 3 },
];

const STATUS_STYLES: Record<string, string> = {
  "报名中": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "进行中": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "已结束": "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
};

const LEVEL_STYLES: Record<string, string> = {
  "国家级": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "省部级": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  "校级": "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
};

export default function AdminCompetitionsPage() {
  const [keyword, setKeyword] = useState("");

  const filtered = mockCompetitions.filter((c) => {
    if (keyword && !c.name.includes(keyword)) return false;
    return true;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">竞赛管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">管理保研加分竞赛信息与报名状态</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> 添加竞赛
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索竞赛名称..." value={keyword} onChange={(e) => setKeyword(e.target.value)} className="pl-9 h-9 rounded-xl" />
        </div>
        <Badge variant="secondary" className="text-xs">{filtered.length} 项竞赛</Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">竞赛名称</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">级别</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">状态</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-48">报名时间</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28">含金量</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground w-28">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 shrink-0">
                          <Trophy className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-[10px]", LEVEL_STYLES[c.level])}>{c.level}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-[10px]", STATUS_STYLES[c.status])}>{c.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.registrationDate}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn("h-3.5 w-3.5", i < c.stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                        ))}
                      </div>
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
