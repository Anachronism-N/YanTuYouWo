"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileQuestion, Search, Star, Heart, MessageSquare,
  ChevronDown, ChevronUp, Filter, BookOpen,
  GraduationCap, Lightbulb, ThumbsUp, X, SlidersHorizontal,
  Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ================================================================
   筛选维度
   ================================================================ */

const CATEGORY_OPTIONS = ["全部", "专业课", "综合面试", "英语口语", "政治", "开放性问题"];
const SCHOOL_OPTIONS = ["全部学校", "清华大学", "北京大学", "浙江大学", "上海交通大学", "南京大学", "复旦大学", "中国科学技术大学", "中国人民大学"];
const DIFFICULTY_OPTIONS = [
  { value: 0, label: "全部难度" },
  { value: 1, label: "⭐ 简单" },
  { value: 2, label: "⭐⭐ 较易" },
  { value: 3, label: "⭐⭐⭐ 中等" },
  { value: 4, label: "⭐⭐⭐⭐ 较难" },
  { value: 5, label: "⭐⭐⭐⭐⭐ 困难" },
];
const YEAR_OPTIONS = ["全部年份", "2025", "2024", "2023"];
const DIFFICULTY_LABELS = ["", "简单", "较易", "中等", "较难", "困难"];

const MOCK_QUESTIONS = [
  {
    id: 1, question: "请介绍一下你最熟悉的机器学习算法，并说明其优缺点",
    reference_answer: "以随机森林为例，它是一种集成学习方法，通过构建多棵决策树并取平均来提高预测精度。优点：不容易过拟合、可处理高维数据、可评估特征重要性。缺点：训练时间较长、对噪声数据敏感。",
    university: "清华大学", department: "计算机系", discipline: "人工智能",
    type: "专业课" as const, difficulty: 4, year: 2025,
    source: "用户贡献" as const, like_count: 234, favorite_count: 189, tags: ["机器学习", "算法"],
  },
  {
    id: 2, question: "Why do you want to pursue a master's degree? Please answer in English.",
    reference_answer: "I want to pursue a master's degree because I'm passionate about research in AI and want to deepen my understanding of the field...",
    university: "北京大学", department: "信息科学技术学院", discipline: "计算机科学",
    type: "英语口语" as const, difficulty: 3, year: 2025,
    source: "用户贡献" as const, like_count: 198, favorite_count: 156, tags: ["英语", "自我介绍"],
  },
  {
    id: 3, question: "请谈谈你对当前人工智能发展的看法，以及你认为未来的发展方向是什么？",
    reference_answer: "当前人工智能正处于从弱AI向通用AI过渡的阶段，大语言模型的突破标志着重要进展...",
    university: "浙江大学", department: "计算机学院", discipline: "人工智能",
    type: "开放性问题" as const, difficulty: 3, year: 2025,
    source: "整理" as const, like_count: 167, favorite_count: 134, tags: ["AI", "前沿"],
  },
  {
    id: 4, question: "请解释 TCP 三次握手的过程，以及为什么需要三次而不是两次？",
    reference_answer: "TCP三次握手：1. 客户端发送SYN 2. 服务端回复SYN+ACK 3. 客户端发送ACK。需要三次是为了确保双方都能确认对方的收发能力。",
    university: "上海交通大学", department: "电院", discipline: "计算机网络",
    type: "专业课" as const, difficulty: 2, year: 2025,
    source: "用户贡献" as const, like_count: 312, favorite_count: 267, tags: ["网络", "TCP"],
  },
  {
    id: 5, question: "你在本科期间参与过哪些科研项目？请详细介绍一个你最有成就感的项目",
    university: "南京大学", department: "计算机系", discipline: "综合",
    type: "综合面试" as const, difficulty: 3, year: 2025,
    source: "整理" as const, like_count: 145, favorite_count: 112, tags: ["科研", "项目经历"],
  },
  {
    id: 6, question: "请谈谈你对马克思主义中国化的理解",
    university: "中国人民大学", department: "信息学院", discipline: "政治",
    type: "政治" as const, difficulty: 2, year: 2025,
    source: "官方" as const, like_count: 89, favorite_count: 67, tags: ["政治", "马克思主义"],
  },
  {
    id: 7, question: "请用英语描述你的一个科研项目或课程设计",
    university: "复旦大学", department: "计算机学院", discipline: "综合",
    type: "英语口语" as const, difficulty: 4, year: 2024,
    source: "用户贡献" as const, like_count: 178, favorite_count: 145, tags: ["英语", "科研描述"],
  },
  {
    id: 8, question: "请解释什么是 Transformer 架构，以及它相比 RNN 的优势是什么？",
    reference_answer: "Transformer是一种基于自注意力机制的神经网络架构，核心是Multi-Head Attention。相比RNN：1.可并行计算 2.长距离依赖建模更好 3.训练效率更高。",
    university: "中国科学技术大学", department: "计算机学院", discipline: "深度学习",
    type: "专业课" as const, difficulty: 4, year: 2024,
    source: "用户贡献" as const, like_count: 256, favorite_count: 210, tags: ["深度学习", "Transformer"],
  },
];

/* ================================================================
   页面组件
   ================================================================ */

export default function QuestionsPage() {
  const [category, setCategory] = useState("全部");
  const [school, setSchool] = useState("全部学校");
  const [difficulty, setDifficulty] = useState(0);
  const [year, setYear] = useState("全部年份");
  const [keyword, setKeyword] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sort, setSort] = useState<"likes" | "difficulty" | "latest">("likes");
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = [
    category !== "全部",
    school !== "全部学校",
    difficulty !== 0,
    year !== "全部年份",
  ].filter(Boolean).length;

  const filtered = MOCK_QUESTIONS
    .filter((q) => category === "全部" || q.type === category)
    .filter((q) => school === "全部学校" || q.university === school)
    .filter((q) => difficulty === 0 || q.difficulty === difficulty)
    .filter((q) => year === "全部年份" || q.year === Number(year))
    .filter((q) => !keyword || q.question.includes(keyword) || q.university.includes(keyword) || q.tags.some((t) => t.includes(keyword)))
    .sort((a, b) => {
      if (sort === "likes") return b.like_count - a.like_count;
      if (sort === "difficulty") return b.difficulty - a.difficulty;
      return 0;
    });

  const clearFilters = () => {
    setCategory("全部");
    setSchool("全部学校");
    setDifficulty(0);
    setYear("全部年份");
  };

  return (
    <div className="space-y-5">
      {/* 搜索 */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input value={keyword} onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索题目、学校或标签..." className="pl-10 h-10 rounded-xl" />
      </div>

      {/* 筛选栏 */}
      <div className="space-y-3">
        {/* 第一行：类别 + 排序 + 筛选按钮 */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1 flex-1">
            {CATEGORY_OPTIONS.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={cn("rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all",
                  category === c ? "bg-amber-500 text-white shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
                {c}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 relative"
              onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal className="h-3.5 w-3.5" /> 筛选
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-xs text-white font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            <div className="flex gap-1">
              {([
                { id: "likes" as const, label: "最热" },
                { id: "difficulty" as const, label: "难度" },
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
        </div>

        {/* 展开的筛选面板 */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card className="shadow-sm border-amber-200/50">
                <CardContent className="p-4 space-y-3">
                  {/* 学校筛选 */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">学校</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {SCHOOL_OPTIONS.map((s) => (
                        <button key={s} onClick={() => setSchool(s)}
                          className={cn("flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all border",
                            school === s ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30" : "bg-background text-muted-foreground border-muted hover:bg-muted/50")}>
                          <div className={cn("flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-all",
                            school === s ? "bg-blue-500 border-blue-500" : "border-muted-foreground/30")}>
                            {school === s && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* 难度筛选 */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">难度</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {DIFFICULTY_OPTIONS.map((d) => (
                        <button key={d.value} onClick={() => setDifficulty(d.value)}
                          className={cn("flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all border",
                            difficulty === d.value ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30" : "bg-background text-muted-foreground border-muted hover:bg-muted/50")}>
                          <div className={cn("flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-all",
                            difficulty === d.value ? "bg-amber-500 border-amber-500" : "border-muted-foreground/30")}>
                            {difficulty === d.value && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* 年份筛选 */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">年份</label>
                    <div className="flex gap-1.5">
                      {YEAR_OPTIONS.map((y) => (
                        <button key={y} onClick={() => setYear(y)}
                          className={cn("flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all border",
                            year === y ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30" : "bg-background text-muted-foreground border-muted hover:bg-muted/50")}>
                          <div className={cn("flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-all",
                            year === y ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/30")}>
                            {year === y && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* 清除筛选 */}
                  {activeFilterCount > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-muted-foreground">已选 {activeFilterCount} 个筛选条件</span>
                      <button onClick={clearFilters} className="text-xs text-primary hover:underline flex items-center gap-1">
                        <X className="h-3 w-3" /> 清除全部
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 已激活的筛选标签 */}
        {activeFilterCount > 0 && !showFilters && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">筛选：</span>
            {category !== "全部" && (
              <Badge variant="secondary" className="text-xs gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => setCategory("全部")}>
                类别: {category} <X className="h-2.5 w-2.5" />
              </Badge>
            )}
            {school !== "全部学校" && (
              <Badge variant="secondary" className="text-xs gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => setSchool("全部学校")}>
                学校: {school} <X className="h-2.5 w-2.5" />
              </Badge>
            )}
            {difficulty !== 0 && (
              <Badge variant="secondary" className="text-xs gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => setDifficulty(0)}>
                难度: {DIFFICULTY_LABELS[difficulty]} <X className="h-2.5 w-2.5" />
              </Badge>
            )}
            {year !== "全部年份" && (
              <Badge variant="secondary" className="text-xs gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => setYear("全部年份")}>
                年份: {year} <X className="h-2.5 w-2.5" />
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* 题目列表 */}
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.map((q, i) => (
            <motion.div key={q.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}>
              <Card className="shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 text-amber-600">
                      <FileQuestion className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">{q.type}</Badge>
                        <Badge variant="secondary" className="text-xs">{q.university}</Badge>
                        <Badge variant="outline" className="text-xs text-muted-foreground">{q.department}</Badge>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <div key={idx} className={cn("h-1.5 w-3 rounded-full",
                              idx < q.difficulty ? "bg-amber-500" : "bg-muted")} />
                          ))}
                          <span className="text-xs text-muted-foreground ml-1">{DIFFICULTY_LABELS[q.difficulty]}</span>
                        </div>
                      </div>
                      <p className="text-sm font-medium leading-relaxed">{q.question}</p>

                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{q.discipline}</span>
                        <span>{q.year} 年</span>
                        <span className="flex items-center gap-0.5">
                          <ThumbsUp className="h-3 w-3" /> {q.like_count}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Heart className="h-3 w-3" /> {q.favorite_count}
                        </span>
                        <Badge variant="outline" className="text-xs">{q.source}</Badge>
                      </div>

                      <div className="flex gap-1.5 mt-2">
                        {q.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>

                      {q.reference_answer && (
                        <div className="mt-3">
                          <button onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                            className="flex items-center gap-1 text-xs text-primary hover:underline">
                            <Lightbulb className="h-3 w-3" />
                            {expandedId === q.id ? "收起参考答案" : "查看参考答案"}
                            {expandedId === q.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                          <AnimatePresence>
                            {expandedId === q.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-2 rounded-xl bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200/50 p-3">
                                  <p className="text-xs text-muted-foreground leading-relaxed">{q.reference_answer}</p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">没有找到匹配的题目，试试调整筛选条件</p>
        </div>
      )}

      <div className="text-center text-xs text-muted-foreground py-4">
        共 {filtered.length} 道题目
      </div>
    </div>
  );
}
