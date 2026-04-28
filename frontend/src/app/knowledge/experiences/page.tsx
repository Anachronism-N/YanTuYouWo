"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, Search, Heart, MessageSquare, Eye,
  Award, ArrowRight, Filter, ThumbsUp,
  GraduationCap, Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CATEGORIES = ["全部", "夏令营", "预推免", "九推", "综合经验", "失败经验"];

const MOCK_EXPERIENCES = [
  {
    id: 1, title: "从双非到北大信科：我的保研逆袭之路",
    summary: "分享我从一所双非院校成功保研到北京大学信息科学技术学院的全过程，包括如何弥补本科背景的不足...",
    author: { nickname: "逆袭小王", school: "某双非大学", target_school: "北京大学", badge: "保研成功" },
    category: "夏令营" as const, target_university: "北京大学", target_department: "信息科学技术学院",
    year: 2025, like_count: 1234, comment_count: 89, favorite_count: 567, view_count: 8900,
    is_featured: true, tags: ["逆袭", "双非", "计算机"], created_at: "2026-03-28",
  },
  {
    id: 2, title: "清华计算机系夏令营面试经验分享",
    summary: "详细记录了清华计算机系夏令营的笔试和面试过程，包括题目类型、面试问题和准备建议...",
    author: { nickname: "CS小李", school: "武汉大学", target_school: "清华大学", badge: "保研成功" },
    category: "夏令营" as const, target_university: "清华大学", target_department: "计算机系",
    year: 2025, like_count: 987, comment_count: 67, favorite_count: 432, view_count: 7200,
    is_featured: true, tags: ["清华", "面试", "计算机"], created_at: "2026-03-25",
  },
  {
    id: 3, title: "浙大控制学院预推免全流程记录",
    summary: "从报名到最终录取，完整记录浙大控制学院预推免的每一个环节...",
    author: { nickname: "自动化小张", school: "东南大学", target_school: "浙江大学" },
    category: "预推免" as const, target_university: "浙江大学", target_department: "控制学院",
    year: 2025, like_count: 654, comment_count: 45, favorite_count: 321, view_count: 5400,
    is_featured: true, tags: ["浙大", "预推免", "自动化"], created_at: "2026-03-20",
  },
  {
    id: 4, title: "跨专业保研到复旦金融：从工科到商科的转变",
    summary: "作为一个工科生，我是如何成功跨专业保研到复旦金融的，分享跨保的准备策略...",
    author: { nickname: "跨保达人", school: "中南大学", target_school: "复旦大学", badge: "保研成功" },
    category: "综合经验" as const, target_university: "复旦大学", target_department: "经济学院",
    year: 2025, like_count: 543, comment_count: 38, favorite_count: 267, view_count: 4300,
    is_featured: false, tags: ["跨专业", "金融", "工转商"], created_at: "2026-03-15",
  },
  {
    id: 5, title: "保研失败后的反思：我踩过的那些坑",
    summary: "虽然最终没有保研成功，但我想分享一下我在准备过程中犯的错误，希望后来人能避免...",
    author: { nickname: "反思者小陈", school: "某211大学" },
    category: "失败经验" as const, target_university: "多所985", target_department: "计算机相关",
    year: 2025, like_count: 876, comment_count: 123, favorite_count: 456, view_count: 6700,
    is_featured: true, tags: ["失败经验", "反思", "避坑"], created_at: "2026-03-10",
  },
  {
    id: 6, title: "九推上岸中科大：最后的机会也能把握住",
    summary: "在夏令营和预推免都没有理想结果后，我通过九推成功上岸中科大...",
    author: { nickname: "九推战士", school: "合肥工业大学", target_school: "中国科学技术大学", badge: "保研成功" },
    category: "九推" as const, target_university: "中国科学技术大学", target_department: "计算机学院",
    year: 2025, like_count: 432, comment_count: 34, favorite_count: 198, view_count: 3800,
    is_featured: false, tags: ["九推", "中科大", "逆袭"], created_at: "2026-03-05",
  },
];

export default function ExperiencesPage() {
  const [category, setCategory] = useState("全部");
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<"likes" | "views" | "latest">("likes");

  const filtered = MOCK_EXPERIENCES
    .filter((e) => category === "全部" || e.category === category)
    .filter((e) => !keyword || e.title.includes(keyword) || e.summary.includes(keyword) || e.tags.some((t) => t.includes(keyword)))
    .sort((a, b) => {
      if (sort === "likes") return b.like_count - a.like_count;
      if (sort === "views") return b.view_count - a.view_count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="space-y-5">
      {/* 搜索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={keyword} onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索经验帖..." className="pl-10 h-10 rounded-xl" />
      </div>

      {/* 筛选 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all",
                category === c ? "bg-rose-500 text-white shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-1 shrink-0 ml-3">
          {([
            { id: "likes" as const, label: "最热" },
            { id: "views" as const, label: "浏览" },
            { id: "latest" as const, label: "最新" },
          ]).map((s) => (
            <button key={s.id} onClick={() => setSort(s.id)}
              className={cn("rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                sort === s.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 经验帖列表 */}
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.map((exp, i) => (
            <motion.div key={exp.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}>
              <Card className="shadow-sm hover:shadow-md transition-all group cursor-pointer hover:border-rose-200/50 dark:hover:border-rose-500/20 hover:-translate-y-0.5">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* 作者头像 */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/10 to-pink-500/10 text-rose-600 text-lg font-bold">
                      {exp.author.nickname.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* 作者信息 */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{exp.author.nickname}</span>
                        <span className="text-xs text-muted-foreground">{exp.author.school}</span>
                        {exp.author.badge && (
                          <Badge className="text-xs bg-green-500/10 text-green-700 border-green-200">
                            {exp.author.badge}
                          </Badge>
                        )}
                        {exp.is_featured && (
                          <Badge className="text-xs bg-amber-500/10 text-amber-700 border-amber-200">
                            <Award className="h-3 w-3 mr-0.5" /> 精选
                          </Badge>
                        )}
                      </div>

                      {/* 标题 */}
                      <h3 className="font-bold text-base group-hover:text-rose-600 transition-colors line-clamp-1">{exp.title}</h3>

                      {/* 摘要 */}
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{exp.summary}</p>

                      {/* 目标信息 */}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <GraduationCap className="h-3 w-3" />
                        <span>{exp.author.school} → {exp.target_university} · {exp.target_department}</span>
                        <span>· {exp.year} 年</span>
                      </div>

                      {/* 标签 */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <Badge variant="secondary" className="text-xs">{exp.category}</Badge>
                        {exp.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>

                      {/* 互动数据 */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" /> {exp.like_count >= 1000 ? `${(exp.like_count / 1000).toFixed(1)}k` : exp.like_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" /> {exp.comment_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" /> {exp.favorite_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {exp.view_count >= 1000 ? `${(exp.view_count / 1000).toFixed(1)}k` : exp.view_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {exp.created_at}
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
        共 {filtered.length} 篇经验帖
      </div>
    </div>
  );
}
