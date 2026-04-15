"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Plus, Calendar, Zap, Upload,
  Award, BookOpen, Code, Globe, Briefcase,
  Heart, Star, MoreHorizontal, Image,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACHIEVEMENT_TYPES = ["全部", "科研", "论文", "竞赛", "英语", "面试", "实习", "其他"];

const typeConfig: Record<string, { icon: typeof BookOpen; color: string }> = {
  "科研": { icon: BookOpen, color: "from-blue-500/10 to-cyan-500/10 text-blue-600" },
  "论文": { icon: Code, color: "from-violet-500/10 to-purple-500/10 text-violet-600" },
  "竞赛": { icon: Trophy, color: "from-amber-500/10 to-yellow-500/10 text-amber-600" },
  "英语": { icon: Globe, color: "from-emerald-500/10 to-green-500/10 text-emerald-600" },
  "面试": { icon: Star, color: "from-rose-500/10 to-pink-500/10 text-rose-600" },
  "实习": { icon: Briefcase, color: "from-orange-500/10 to-red-500/10 text-orange-600" },
  "其他": { icon: Heart, color: "from-gray-500/10 to-slate-500/10 text-gray-600 dark:text-gray-300" },
};

const MOCK_ACHIEVEMENTS = [
  {
    id: 1, title: "发表 SCI 论文一篇", description: "在 IEEE TPAMI 上发表了关于目标检测的论文，第二作者",
    type: "论文" as const, date: "2026-03-20", importance: 5, tags: ["SCI", "计算机视觉", "TPAMI"],
    proof_urls: ["paper.pdf"],
  },
  {
    id: 2, title: "获得数学建模国赛二等奖", description: "2025 年全国大学生数学建模竞赛获得国家级二等奖",
    type: "竞赛" as const, date: "2026-03-15", importance: 4, tags: ["数学建模", "国赛"],
    proof_urls: ["certificate.jpg"],
  },
  {
    id: 3, title: "通过 CET-6（580 分）", description: "大学英语六级考试取得 580 分",
    type: "英语" as const, date: "2026-03-10", importance: 3, tags: ["CET-6", "英语"],
    proof_urls: [],
  },
  {
    id: 4, title: "完成导师科研项目", description: "参与导师的国家自然科学基金项目，负责数据处理和模型训练",
    type: "科研" as const, date: "2026-02-28", importance: 4, tags: ["科研", "国自然"],
    proof_urls: [],
  },
  {
    id: 5, title: "获得校级优秀学生奖学金", description: "2024-2025 学年获得校级一等奖学金",
    type: "其他" as const, date: "2026-01-15", importance: 3, tags: ["奖学金", "荣誉"],
    proof_urls: ["scholarship.jpg"],
  },
  {
    id: 6, title: "字节跳动暑期实习", description: "在字节跳动 AI Lab 完成了为期两个月的暑期实习",
    type: "实习" as const, date: "2025-09-01", importance: 4, tags: ["实习", "字节跳动", "AI"],
    proof_urls: [],
  },
];

export default function AchievementsPage() {
  const [type, setType] = useState("全部");
  const [showForm, setShowForm] = useState(false);

  const filtered = MOCK_ACHIEVEMENTS
    .filter((a) => type === "全部" || a.type === type)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-5">
      {/* 筛选和操作 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
          {ACHIEVEMENT_TYPES.map((t) => (
            <button key={t} onClick={() => setType(t)}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all",
                type === t ? "bg-amber-500 text-white shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
              {t}
            </button>
          ))}
        </div>
        <Button size="sm" className="gap-1.5 text-xs shrink-0 ml-3" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3.5 w-3.5" /> 记录成果
        </Button>
      </div>

      {/* 添加成果表单（简化版） */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <Card className="shadow-sm border-dashed border-2 border-amber-300 dark:border-amber-700/50">
              <CardContent className="p-5">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" /> 记录新成果
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input placeholder="成果标题" className="rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <select className="rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {ACHIEVEMENT_TYPES.filter((t) => t !== "全部").map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <textarea placeholder="成果描述..." className="w-full mt-3 rounded-xl border bg-background px-4 py-3 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-primary/20" />
                <div className="flex items-center gap-3 mt-3">
                  <Button size="sm" className="gap-1.5 text-xs bg-amber-500 hover:bg-amber-600">
                    <Trophy className="h-3.5 w-3.5" /> 保存
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                    <Upload className="h-3.5 w-3.5" /> 上传证明
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs" onClick={() => setShowForm(false)}>取消</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 成果时间线 */}
      <div className="relative">
        {/* 时间线 */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-4">
          <AnimatePresence>
            {filtered.map((ach, i) => {
              const config = typeConfig[ach.type] || typeConfig["其他"];
              const Icon = config.icon;

              return (
                <motion.div key={ach.id}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative pl-14">
                  {/* 时间线节点 */}
                  <div className={cn("absolute left-3 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br border-2 border-background z-10", config.color)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>

                  <Card className="shadow-sm hover:shadow-md transition-all group">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">{ach.type}</Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {ach.date}
                            </span>
                            <div className="flex gap-0.5">
                              {Array.from({ length: ach.importance }).map((_, idx) => (
                                <Zap key={idx} className="h-3 w-3 text-amber-500 fill-amber-500" />
                              ))}
                            </div>
                          </div>
                          <h3 className="font-bold text-sm">{ach.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1">{ach.description}</p>
                          <div className="flex gap-1.5 mt-2">
                            {ach.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                          {ach.proof_urls.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                              <Image className="h-3 w-3" /> {ach.proof_urls.length} 个证明材料
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground py-4">
        共 {filtered.length} 项成果
      </div>
    </div>
  );
}
