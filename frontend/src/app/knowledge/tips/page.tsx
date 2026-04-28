"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb, Search, AlertTriangle, Clock,
  Eye, ThumbsUp, Bell, CheckCircle2,
  GraduationCap, Zap, Shield, TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CATEGORIES = ["全部", "隐性要求", "导师偏好", "时间节点", "政策变动", "避坑指南"];

const IMPORTANCE_CONFIG = [
  { color: "bg-gray-200", label: "" },
  { color: "bg-blue-400", label: "了解" },
  { color: "bg-green-400", label: "有用" },
  { color: "bg-amber-400", label: "重要" },
  { color: "bg-orange-500", label: "很重要" },
  { color: "bg-red-500", label: "必看" },
];

const MOCK_TIPS = [
  {
    id: 1, title: "清华计算机系夏令营：GPA 不是唯一标准",
    content: "很多同学以为清华计算机系只看 GPA，但实际上科研经历和竞赛成绩同样重要。近两年有多位 GPA 排名 10% 以外但有顶会论文的同学被录取。建议提前联系导师，展示你的科研潜力。",
    category: "隐性要求" as const, related_universities: ["清华大学"],
    importance: 5, view_count: 3420, like_count: 567,
    is_read: false, tags: ["清华", "计算机", "科研"], created_at: "2026-03-28",
  },
  {
    id: 2, title: "北大信科夏令营报名：推荐信的隐藏权重",
    content: "北大信科的夏令营审核中，推荐信的权重比大多数人想象的要高。特别是如果推荐人是北大的校友或者与目标导师有合作关系，会有明显加分。",
    category: "导师偏好" as const, related_universities: ["北京大学"],
    importance: 4, view_count: 2890, like_count: 432,
    is_read: false, tags: ["北大", "推荐信"], created_at: "2026-03-25",
  },
  {
    id: 3, title: "2026 年夏令营时间线提前：3 月就要开始准备",
    content: "根据往年趋势，2026 年多所 985 高校的夏令营报名时间较往年提前了 2-3 周。建议从 3 月开始准备材料，4 月初就要关注各校通知。",
    category: "时间节点" as const, related_universities: ["多所985"],
    importance: 5, view_count: 4560, like_count: 789,
    is_read: true, tags: ["时间线", "夏令营", "提前准备"], created_at: "2026-03-20",
  },
  {
    id: 4, title: "教育部新规：推免生可同时接受多个 offer",
    content: "2026 年起，推免生在系统确认前可以同时持有多个预录取 offer，但最终只能确认一个。这意味着你可以更大胆地申请多所学校。",
    category: "政策变动" as const, related_universities: [],
    importance: 5, view_count: 5670, like_count: 1023,
    is_read: false, tags: ["政策", "推免系统"], created_at: "2026-03-15",
  },
  {
    id: 5, title: "避坑：不要在面试中说「贵校是我的保底」",
    content: "这看起来是常识，但每年都有同学在面试中无意间透露出类似的意思。即使你确实有更好的选择，也要表现出对目标院校的诚意和热情。",
    category: "避坑指南" as const, related_universities: [],
    importance: 4, view_count: 3210, like_count: 654,
    is_read: true, tags: ["面试", "避坑", "态度"], created_at: "2026-03-10",
  },
  {
    id: 6, title: "浙大 CAD&CG 实验室：偏好有图形学基础的学生",
    content: "浙大 CAD&CG 国家重点实验室在招收推免生时，特别看重学生是否有计算机图形学、可视化或者 HCI 方面的基础。如果你有相关课程项目或竞赛经历，会有很大优势。",
    category: "导师偏好" as const, related_universities: ["浙江大学"],
    importance: 3, view_count: 1890, like_count: 321,
    is_read: false, tags: ["浙大", "图形学", "实验室"], created_at: "2026-03-05",
  },
];

const categoryIcon = (cat: string) => {
  switch (cat) {
    case "隐性要求": return <Shield className="h-4 w-4" />;
    case "导师偏好": return <GraduationCap className="h-4 w-4" />;
    case "时间节点": return <Clock className="h-4 w-4" />;
    case "政策变动": return <AlertTriangle className="h-4 w-4" />;
    case "避坑指南": return <Zap className="h-4 w-4" />;
    default: return <Lightbulb className="h-4 w-4" />;
  }
};

export default function TipsPage() {
  const [category, setCategory] = useState("全部");
  const [keyword, setKeyword] = useState("");

  const filtered = MOCK_TIPS
    .filter((t) => category === "全部" || t.category === category)
    .filter((t) => !keyword || t.title.includes(keyword) || t.content.includes(keyword))
    .sort((a, b) => b.importance - a.importance || b.like_count - a.like_count);

  return (
    <div className="space-y-5">
      {/* 搜索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={keyword} onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索信息差..." className="pl-10 h-10 rounded-xl" />
      </div>

      {/* 分类筛选 */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c)}
            className={cn("rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all",
              category === c ? "bg-yellow-500 text-white shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
            {c}
          </button>
        ))}
      </div>

      {/* 信息差列表 */}
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.map((tip, i) => (
            <motion.div key={tip.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}>
              <Card className={cn("shadow-sm hover:shadow-md transition-all group cursor-pointer",
                !tip.is_read && "border-l-4 border-l-amber-500")}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* 分类图标 */}
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500/10 to-amber-500/10 text-amber-600">
                      {categoryIcon(tip.category)}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* 头部 */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">{tip.category}</Badge>
                        <Badge className={cn("text-xs text-white border-0", IMPORTANCE_CONFIG[tip.importance].color)}>
                          {IMPORTANCE_CONFIG[tip.importance].label}
                        </Badge>
                        {tip.related_universities.length > 0 && tip.related_universities.map((u) => (
                          <Badge key={u} variant="secondary" className="text-xs">{u}</Badge>
                        ))}
                        {!tip.is_read && (
                          <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                        )}
                      </div>

                      {/* 标题 */}
                      <h3 className="text-base font-semibold group-hover:text-amber-600 transition-colors">{tip.title}</h3>

                      {/* 内容 */}
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-3">{tip.content}</p>

                      {/* 标签 */}
                      <div className="flex gap-1.5 mt-2">
                        {tip.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>

                      {/* 底部数据 */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {tip.view_count >= 1000 ? `${(tip.view_count / 1000).toFixed(1)}k` : tip.view_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" /> {tip.like_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {tip.created_at}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="text-center text-xs text-muted-foreground py-4">
        共 {filtered.length} 条信息差
      </div>
    </div>
  );
}
