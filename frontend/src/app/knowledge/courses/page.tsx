"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video, Play, Clock, Star, Users, Heart,
  Search, Filter, BookmarkPlus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CATEGORIES = ["全部", "面试技巧", "简历撰写", "科研入门", "英语准备", "心态调整", "择校策略"];

const MOCK_COURSES = [
  {
    id: 1, title: "保研面试全攻略：从准备到上岸", description: "系统讲解保研面试的各个环节，包括自我介绍、专业问题、英语口语等",
    instructor: "张老师", instructor_school: "清华大学", category: "面试技巧",
    duration: 360, episodes: 12, rating: 4.9, rating_count: 234, view_count: 5600,
    favorite_count: 890, tags: ["面试", "全流程"], is_free: false,
  },
  {
    id: 2, title: "保研简历撰写指南", description: "手把手教你写出一份让导师眼前一亮的保研简历",
    instructor: "李学姐", instructor_school: "北京大学", category: "简历撰写",
    duration: 180, episodes: 6, rating: 4.8, rating_count: 189, view_count: 4200,
    favorite_count: 670, tags: ["简历", "模板"], is_free: true,
  },
  {
    id: 3, title: "科研入门：如何找到第一个科研项目", description: "从零开始的科研入门指南，帮你迈出科研第一步",
    instructor: "王教授", instructor_school: "浙江大学", category: "科研入门",
    duration: 240, episodes: 8, rating: 4.7, rating_count: 156, view_count: 3800,
    favorite_count: 520, tags: ["科研", "入门"], is_free: true,
  },
  {
    id: 4, title: "保研英语面试口语特训", description: "针对保研面试的英语口语专项训练，含常见问题模板",
    instructor: "Emily", instructor_school: "上海外国语大学", category: "英语准备",
    duration: 300, episodes: 10, rating: 4.8, rating_count: 210, view_count: 4800,
    favorite_count: 760, tags: ["英语", "口语"], is_free: false,
  },
  {
    id: 5, title: "保研心态管理与压力调节", description: "保研路上的心理建设，帮你保持最佳状态",
    instructor: "心理咨询师小陈", instructor_school: "北京师范大学", category: "心态调整",
    duration: 120, episodes: 4, rating: 4.6, rating_count: 98, view_count: 2100,
    favorite_count: 340, tags: ["心态", "减压"], is_free: true,
  },
  {
    id: 6, title: "择校策略：如何科学选择目标院校", description: "数据驱动的择校方法论，帮你找到最适合的院校",
    instructor: "数据分析师老赵", instructor_school: "中国人民大学", category: "择校策略",
    duration: 210, episodes: 7, rating: 4.7, rating_count: 145, view_count: 3200,
    favorite_count: 480, tags: ["择校", "数据分析"], is_free: false,
  },
];

const formatDuration = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? (m > 0 ? `${h}h${m}min` : `${h}h`) : `${m}min`;
};

export default function CoursesPage() {
  const [category, setCategory] = useState("全部");
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<"rating" | "latest" | "popular">("popular");

  const filtered = MOCK_COURSES
    .filter((c) => category === "全部" || c.category === category)
    .filter((c) => !keyword || c.title.includes(keyword) || c.description.includes(keyword))
    .sort((a, b) => {
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "popular") return b.view_count - a.view_count;
      return 0;
    });

  return (
    <div className="space-y-5">
      {/* 搜索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={keyword} onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索课程..." className="pl-10 h-10 rounded-xl" />
      </div>

      {/* 分类筛选 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all",
                category === c ? "bg-violet-500 text-white shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-1 shrink-0 ml-3">
          {([
            { id: "popular" as const, label: "最热" },
            { id: "rating" as const, label: "评分" },
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

      {/* 课程列表 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AnimatePresence>
          {filtered.map((course, i) => (
            <motion.div key={course.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}>
              <Card className="shadow-sm hover:shadow-lg transition-all group cursor-pointer h-full overflow-hidden">
                <CardContent className="p-0">
                  {/* 封面区域 */}
                  <div className="relative h-36 bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/80 shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="h-6 w-6 text-violet-600 ml-0.5" />
                    </div>
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      {course.is_free ? (
                        <Badge className="bg-green-500 text-white text-xs">免费</Badge>
                      ) : (
                        <Badge className="bg-amber-500 text-white text-xs">付费</Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">{course.episodes} 集</Badge>
                    </div>
                    <div className="absolute bottom-3 right-3">
                      <Badge variant="secondary" className="text-xs bg-black/50 text-white border-0">
                        <Clock className="h-3 w-3 mr-0.5" /> {formatDuration(course.duration)}
                      </Badge>
                    </div>
                  </div>

                  {/* 信息区域 */}
                  <div className="p-4">
                    <h3 className="font-bold text-sm group-hover:text-violet-600 transition-colors line-clamp-1">{course.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{course.description}</p>

                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                      <span>{course.instructor}</span>
                      <span>·</span>
                      <span>{course.instructor_school}</span>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                          <Star className="h-3 w-3 fill-amber-500" /> {course.rating}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Users className="h-3 w-3" /> {course.view_count >= 1000 ? `${(course.view_count / 1000).toFixed(1)}k` : course.view_count}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Heart className="h-3 w-3" /> {course.favorite_count}
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
    </div>
  );
}
