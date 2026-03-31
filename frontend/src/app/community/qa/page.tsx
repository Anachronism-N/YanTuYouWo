"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle, MessageSquare, CheckCircle2, Eye,
  ThumbsUp, Clock, Tag, Search, Award,
  ChevronRight, Flame, Star, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { QAQuestion } from "@/types/community";

/* ================================================================
   Mock 数据
   ================================================================ */

const MOCK_QUESTIONS: QAQuestion[] = [
  {
    id: 1,
    author: { id: 1, nickname: "迷茫的大三", avatar: "", school: "武汉大学" },
    title: "GPA 排名前 15%，没有科研经历，能保研到什么层次的学校？",
    content: "武大数学系大三，GPA 3.6/4.0，排名前 15%。没有科研经历，六级 520 分。想保研到 985 计算机相关专业，有希望吗？",
    tags: ["择校", "GPA", "跨专业"],
    answer_count: 12,
    view_count: 3450,
    is_resolved: true,
    reward_points: 20,
    created_at: "2026-03-30T14:00:00Z",
  },
  {
    id: 2,
    author: { id: 2, nickname: "科研小白", avatar: "", school: "中山大学" },
    title: "本科生第一次联系导师，邮件应该怎么写？",
    content: "想联系目标院校的导师，但不知道邮件该怎么写。需要附上简历吗？应该写多长？有没有模板可以参考？",
    tags: ["导师", "邮件", "联系"],
    answer_count: 8,
    view_count: 2890,
    is_resolved: false,
    reward_points: 10,
    created_at: "2026-03-31T09:00:00Z",
  },
  {
    id: 3,
    author: { id: 3, nickname: "面试恐惧症", avatar: "", school: "南京大学" },
    title: "保研面试英语口语怎么准备？有什么高效的方法？",
    content: "英语笔试还行，但口语很差。面试时需要英文自我介绍和回答问题，请问有什么高效的准备方法？",
    tags: ["面试", "英语", "口语"],
    answer_count: 15,
    view_count: 5670,
    is_resolved: true,
    reward_points: 30,
    created_at: "2026-03-28T16:00:00Z",
  },
  {
    id: 4,
    author: { id: 4, nickname: "选择困难户", avatar: "", school: "四川大学" },
    title: "拿到多个 offer，应该怎么选择？考虑哪些因素？",
    content: "目前拿到了 3 个 offer：A 校排名高但方向一般，B 校方向很好但排名稍低，C 校导师很强但城市不太好。应该怎么选？",
    tags: ["择校", "offer", "选择"],
    answer_count: 23,
    view_count: 8900,
    is_resolved: false,
    reward_points: 50,
    created_at: "2026-03-29T11:00:00Z",
  },
  {
    id: 5,
    author: { id: 5, nickname: "论文小白", avatar: "", school: "华中科技大学" },
    title: "本科生发论文，投什么级别的期刊/会议比较合适？",
    content: "大三计算机专业，做了一个小项目想发论文。请问本科生一般投什么级别的期刊或会议？SCI/EI/中文核心哪个更容易？",
    tags: ["论文", "发表", "期刊"],
    answer_count: 11,
    view_count: 4230,
    is_resolved: true,
    reward_points: 15,
    created_at: "2026-03-31T10:30:00Z",
  },
];

const TAG_OPTIONS = ["全部", "择校", "面试", "导师", "论文", "英语", "科研", "简历", "竞赛"];

/* ================================================================
   问题卡片
   ================================================================ */

function QuestionCard({ question }: { question: QAQuestion }) {
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "刚刚";
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    return `${days} 天前`;
  };

  return (
    <Card className="group transition-all hover:shadow-md hover:border-primary/20">
      <CardContent className="p-5">
        <div className="flex gap-4">
          {/* 左侧统计 */}
          <div className="hidden sm:flex flex-col items-center gap-2 shrink-0 w-16">
            <div className={cn("flex flex-col items-center rounded-xl p-2 w-full",
              question.is_resolved ? "bg-green-50 dark:bg-green-500/10" : "bg-muted/30")}>
              <span className={cn("text-lg font-bold", question.is_resolved ? "text-green-600" : "text-muted-foreground")}>{question.answer_count}</span>
              <span className="text-xs text-muted-foreground">回答</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-muted-foreground">{question.view_count >= 1000 ? `${(question.view_count / 1000).toFixed(1)}k` : question.view_count}</span>
              <span className="text-xs text-muted-foreground">浏览</span>
            </div>
          </div>

          {/* 右侧内容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-2">
              {question.is_resolved && (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 text-xs gap-1 shrink-0">
                  <CheckCircle2 className="h-3 w-3" /> 已解决
                </Badge>
              )}
              {question.reward_points > 0 && (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 text-xs gap-1 shrink-0">
                  <Award className="h-3 w-3" /> {question.reward_points} 积分
                </Badge>
              )}
            </div>
            <Link href={`/community/post/${question.id}`}>
              <h3 className="font-bold text-base mb-1.5 group-hover:text-primary transition-colors line-clamp-2">{question.title}</h3>
            </Link>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{question.content}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {question.tags.map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{question.author.nickname}</span>
                <span>{question.author.school}</span>
                <span>{timeAgo(question.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ================================================================
   主页面
   ================================================================ */

export default function QAPage() {
  const [selectedTag, setSelectedTag] = useState("全部");
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<"latest" | "hot" | "unanswered">("latest");

  const filtered = MOCK_QUESTIONS
    .filter((q) => selectedTag === "全部" || q.tags.some((t) => t.includes(selectedTag)))
    .filter((q) => !keyword || q.title.includes(keyword) || q.content.includes(keyword))
    .filter((q) => sort !== "unanswered" || !q.is_resolved)
    .sort((a, b) => {
      if (sort === "hot") return b.view_count - a.view_count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div>
      {/* 搜索 + 筛选 */}
      <div className="mb-5 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索问题..." className="pl-10 h-10" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
            {TAG_OPTIONS.map((t) => (
              <button key={t} onClick={() => setSelectedTag(t)}
                className={cn("rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all",
                  selectedTag === t ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-1 shrink-0 ml-3">
            {[
              { id: "latest" as const, label: "最新", icon: <Clock className="h-3.5 w-3.5" /> },
              { id: "hot" as const, label: "热门", icon: <Flame className="h-3.5 w-3.5" /> },
              { id: "unanswered" as const, label: "待回答", icon: <HelpCircle className="h-3.5 w-3.5" /> },
            ].map((s) => (
              <button key={s.id} onClick={() => setSort(s.id)}
                className={cn("flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                  sort === s.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 问题列表 */}
      <div className="space-y-4">
        <AnimatePresence>
          {filtered.map((q, i) => (
            <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}>
              <QuestionCard question={q} />
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <HelpCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">暂无相关问题</p>
          </div>
        )}
      </div>
    </div>
  );
}
