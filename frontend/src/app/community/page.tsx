"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageSquare, Bookmark, Eye, Pin, Star,
  Flame, Clock, TrendingUp, Search, Filter,
  ThumbsUp, Share2, MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Post, PostCategory } from "@/types/community";

/* ================================================================
   Mock 数据
   ================================================================ */

const MOCK_POSTS: Post[] = [
  {
    id: 1,
    author: { id: 1, nickname: "保研成功的小明", avatar: "", school: "浙江大学", badge: "保研成功" },
    title: "【经验帖】从双非到 985，我的保研逆袭之路",
    content: "大家好，我是今年成功保研到浙大计算机学院的小明。本科就读于一所普通一本，GPA 排名前 5%，有 2 篇 SCI 论文和 1 个国家级大创项目。今天来分享一下我的保研经验...\n\n首先说说时间线：大二下开始准备，大三上进入实验室...",
    category: "经验分享",
    tags: ["保研经验", "计算机", "逆袭"],
    like_count: 342,
    comment_count: 89,
    favorite_count: 156,
    view_count: 5280,
    is_pinned: true,
    is_featured: true,
    is_liked: false,
    is_favorited: false,
    created_at: "2026-03-30T10:00:00Z",
    updated_at: "2026-03-30T10:00:00Z",
  },
  {
    id: 2,
    author: { id: 2, nickname: "焦虑的大三狗", avatar: "", school: "武汉大学" },
    title: "现在开始准备保研还来得及吗？大三下才开始焦虑",
    content: "如题，我是武大数学系大三的学生，之前一直没有明确的保研目标，现在突然意识到时间不多了。GPA 排名大概前 15%，没有科研经历，英语六级 520 分。请问现在开始准备还来得及吗？应该从哪里入手？",
    category: "择校咨询",
    tags: ["择校", "数学", "大三"],
    like_count: 128,
    comment_count: 45,
    favorite_count: 67,
    view_count: 3120,
    is_pinned: false,
    is_featured: false,
    is_liked: true,
    is_favorited: false,
    created_at: "2026-03-31T08:30:00Z",
    updated_at: "2026-03-31T08:30:00Z",
  },
  {
    id: 3,
    author: { id: 3, nickname: "面试达人", avatar: "", school: "上海交通大学", badge: "学长学姐" },
    title: "保研面试高频问题汇总（附参考答案）",
    content: "整理了 50+ 保研面试高频问题，涵盖自我介绍、科研经历、专业知识、英语口语等方面。每个问题都附有参考答案和回答技巧...",
    category: "面试交流",
    tags: ["面试", "高频问题", "技巧"],
    like_count: 567,
    comment_count: 123,
    favorite_count: 432,
    view_count: 12800,
    is_pinned: true,
    is_featured: true,
    is_liked: false,
    is_favorited: true,
    created_at: "2026-03-28T14:00:00Z",
    updated_at: "2026-03-29T09:00:00Z",
  },
  {
    id: 4,
    author: { id: 4, nickname: "资料搬运工", avatar: "", school: "南京大学" },
    title: "【资料分享】各大高校夏令营面试真题合集（持续更新）",
    content: "收集整理了 2024-2025 年各大 985 高校夏令营面试真题，包括北大、清华、浙大、复旦、上交等。按学校和学科分类，方便大家查找...",
    category: "资料分享",
    tags: ["面试真题", "夏令营", "资料"],
    like_count: 891,
    comment_count: 234,
    favorite_count: 678,
    view_count: 18900,
    is_pinned: false,
    is_featured: true,
    is_liked: true,
    is_favorited: true,
    created_at: "2026-03-25T16:00:00Z",
    updated_at: "2026-03-31T12:00:00Z",
  },
  {
    id: 5,
    author: { id: 5, nickname: "快乐摸鱼人", avatar: "", school: "四川大学" },
    title: "保研人的日常崩溃瞬间，你中了几个？",
    content: "1. 看到别人的简历，觉得自己什么都没有\n2. 导师回复邮件：「名额已满」\n3. 夏令营入营名单没有自己\n4. 面试时大脑一片空白\n5. 同学已经拿到 offer 而自己还在海投...",
    category: "吐槽灌水",
    tags: ["日常", "吐槽", "保研人"],
    like_count: 456,
    comment_count: 178,
    favorite_count: 89,
    view_count: 8900,
    is_pinned: false,
    is_featured: false,
    is_liked: false,
    is_favorited: false,
    created_at: "2026-03-31T11:00:00Z",
    updated_at: "2026-03-31T11:00:00Z",
  },
  {
    id: 6,
    author: { id: 6, nickname: "科研小白", avatar: "", school: "中山大学" },
    title: "本科生如何快速入门科研？求推荐入门路径",
    content: "大二计算机专业，想开始接触科研但不知道从哪里入手。请问各位学长学姐，本科生做科研一般是什么流程？如何找到合适的导师？需要提前学习哪些知识？",
    category: "经验分享",
    tags: ["科研入门", "本科生", "计算机"],
    like_count: 234,
    comment_count: 67,
    favorite_count: 145,
    view_count: 4560,
    is_pinned: false,
    is_featured: false,
    is_liked: false,
    is_favorited: false,
    created_at: "2026-03-31T09:00:00Z",
    updated_at: "2026-03-31T09:00:00Z",
  },
];

const CATEGORIES: { id: PostCategory | "all"; label: string; icon: React.ReactNode }[] = [
  { id: "all", label: "全部", icon: <Flame className="h-4 w-4" /> },
  { id: "经验分享", label: "经验分享", icon: <Star className="h-4 w-4" /> },
  { id: "择校咨询", label: "择校咨询", icon: <Search className="h-4 w-4" /> },
  { id: "面试交流", label: "面试交流", icon: <MessageSquare className="h-4 w-4" /> },
  { id: "资料分享", label: "资料分享", icon: <Bookmark className="h-4 w-4" /> },
  { id: "吐槽灌水", label: "吐槽灌水", icon: <Heart className="h-4 w-4" /> },
];

const SORT_OPTIONS = [
  { id: "hot", label: "热门", icon: <Flame className="h-3.5 w-3.5" /> },
  { id: "latest", label: "最新", icon: <Clock className="h-3.5 w-3.5" /> },
  { id: "featured", label: "精华", icon: <Star className="h-3.5 w-3.5" /> },
];

/* ================================================================
   帖子卡片
   ================================================================ */

function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(post.is_liked);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [favorited, setFavorited] = useState(post.is_favorited);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "刚刚";
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} 天前`;
    return new Date(dateStr).toLocaleDateString("zh-CN");
  };

  const formatCount = (n: number) => n >= 10000 ? `${(n / 10000).toFixed(1)}w` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  const categoryColor: Record<string, string> = {
    "经验分享": "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
    "择校咨询": "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
    "面试交流": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
    "资料分享": "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
    "吐槽灌水": "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400",
    "官方公告": "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  };

  return (
    <Card className="group transition-all hover:shadow-md hover:border-primary/20">
      <CardContent className="p-5">
        {/* 作者信息 */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm font-bold">
            {post.author.nickname[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{post.author.nickname}</span>
              {post.author.badge && (
                <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">{post.author.badge}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {post.author.school && <span>{post.author.school}</span>}
              <span>·</span>
              <span>{timeAgo(post.created_at)}</span>
            </div>
          </div>
          {post.is_pinned && <Badge variant="outline" className="text-xs gap-1 text-red-500 border-red-200"><Pin className="h-3 w-3" /> 置顶</Badge>}
          {post.is_featured && <Badge variant="outline" className="text-xs gap-1 text-amber-500 border-amber-200"><Star className="h-3 w-3" /> 精华</Badge>}
        </div>

        {/* 标题和内容 */}
        <Link href={`/community/post/${post.id}`} className="block">
          <h3 className="font-bold text-base mb-2 group-hover:text-primary transition-colors line-clamp-2">{post.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{post.content}</p>
        </Link>

        {/* 标签 */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Badge className={cn("text-xs", categoryColor[post.category])}>{post.category}</Badge>
          {post.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
          ))}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center gap-5 mt-4 pt-3 border-t">
          <button onClick={() => { setLiked(!liked); setLikeCount((p) => liked ? p - 1 : p + 1); }}
            className={cn("flex items-center gap-1.5 text-xs transition-colors",
              liked ? "text-red-500" : "text-muted-foreground hover:text-red-500")}>
            <Heart className={cn("h-4 w-4", liked && "fill-current")} /> {formatCount(likeCount)}
          </button>
          <Link href={`/community/post/${post.id}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
            <MessageSquare className="h-4 w-4" /> {formatCount(post.comment_count)}
          </Link>
          <button onClick={() => setFavorited(!favorited)}
            className={cn("flex items-center gap-1.5 text-xs transition-colors",
              favorited ? "text-amber-500" : "text-muted-foreground hover:text-amber-500")}>
            <Bookmark className={cn("h-4 w-4", favorited && "fill-current")} /> {formatCount(post.favorite_count)}
          </button>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
            <Eye className="h-4 w-4" /> {formatCount(post.view_count)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ================================================================
   主页面
   ================================================================ */

export default function CommunityPage() {
  const [category, setCategory] = useState<PostCategory | "all">("all");
  const [sort, setSort] = useState("hot");
  const [keyword, setKeyword] = useState("");

  const filteredPosts = MOCK_POSTS
    .filter((p) => category === "all" || p.category === category)
    .filter((p) => !keyword || p.title.includes(keyword) || p.content.includes(keyword) || p.tags.some((t) => t.includes(keyword)))
    .sort((a, b) => {
      if (sort === "hot") return b.like_count + b.comment_count - (a.like_count + a.comment_count);
      if (sort === "latest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "featured") return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
      return 0;
    });

  // 置顶帖排在最前
  const pinnedPosts = filteredPosts.filter((p) => p.is_pinned);
  const normalPosts = filteredPosts.filter((p) => !p.is_pinned);
  const sortedPosts = [...pinnedPosts, ...normalPosts];

  return (
    <div>
      {/* 搜索 + 分类 */}
      <div className="mb-5">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索帖子..." className="pl-10 h-10" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
            {CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setCategory(c.id)}
                className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all",
                  category === c.id ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 shrink-0 ml-3">
            {SORT_OPTIONS.map((s) => (
              <button key={s.id} onClick={() => setSort(s.id)}
                className={cn("flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                  sort === s.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 帖子列表 */}
      <div className="space-y-4">
        <AnimatePresence>
          {sortedPosts.map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}>
              <PostCard post={post} />
            </motion.div>
          ))}
        </AnimatePresence>
        {sortedPosts.length === 0 && (
          <div className="text-center py-16">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">暂无相关帖子</p>
          </div>
        )}
      </div>
    </div>
  );
}
