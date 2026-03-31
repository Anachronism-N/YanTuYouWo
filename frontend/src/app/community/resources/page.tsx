"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Download, Eye, Heart, Star,
  Search, Filter, BookOpen, Video, File,
  Link2, ExternalLink, Clock, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const RESOURCE_TYPES = ["全部", "文档", "模板", "题库", "视频", "工具"];

const MOCK_RESOURCES = [
  { id: 1, title: "2025-2026 各大高校夏令营面试真题合集", type: "题库", author: "面试达人", school: "上海交通大学", downloads: 2340, likes: 567, description: "收集整理了 50+ 所 985 高校夏令营面试真题", tags: ["面试真题", "夏令营"], date: "2026-03-28", format: "PDF" },
  { id: 2, title: "保研个人陈述模板（10 个方向）", type: "模板", author: "资料搬运工", school: "南京大学", downloads: 1890, likes: 432, description: "涵盖理工、文史、经管等 10 个学科方向的个人陈述模板", tags: ["个人陈述", "模板"], date: "2026-03-25", format: "DOCX" },
  { id: 3, title: "保研面试英语口语 100 句", type: "文档", author: "英语小能手", school: "北京外国语大学", downloads: 3120, likes: 891, description: "面试中最常用的 100 个英语表达，附音频", tags: ["英语", "口语"], date: "2026-03-20", format: "PDF" },
  { id: 4, title: "推荐信撰写指南 + 模板", type: "模板", author: "保研成功的小明", school: "浙江大学", downloads: 1560, likes: 345, description: "如何请老师写推荐信，附 3 个不同风格的模板", tags: ["推荐信", "模板"], date: "2026-03-15", format: "PDF" },
  { id: 5, title: "保研时间线规划视频课", type: "视频", author: "学长带你飞", school: "清华大学", downloads: 890, likes: 234, description: "从大一到大四的保研准备全流程视频讲解", tags: ["时间线", "规划"], date: "2026-03-10", format: "MP4" },
  { id: 6, title: "GPA 计算器 + 排名预估工具", type: "工具", author: "技术宅", school: "华中科技大学", downloads: 4560, likes: 1023, description: "在线计算 GPA，预估保研排名，支持多种算法", tags: ["GPA", "工具"], date: "2026-03-05", format: "在线" },
];

const formatIcon = (format: string) => {
  switch (format) {
    case "PDF": return <FileText className="h-5 w-5 text-red-500" />;
    case "DOCX": return <File className="h-5 w-5 text-blue-500" />;
    case "MP4": return <Video className="h-5 w-5 text-violet-500" />;
    case "在线": return <Link2 className="h-5 w-5 text-emerald-500" />;
    default: return <FileText className="h-5 w-5 text-gray-500" />;
  }
};

export default function ResourcesPage() {
  const [type, setType] = useState("全部");
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<"downloads" | "latest" | "likes">("downloads");

  const filtered = MOCK_RESOURCES
    .filter((r) => type === "全部" || r.type === type)
    .filter((r) => !keyword || r.title.includes(keyword) || r.description.includes(keyword))
    .sort((a, b) => {
      if (sort === "downloads") return b.downloads - a.downloads;
      if (sort === "likes") return b.likes - a.likes;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  return (
    <div>
      <div className="mb-5 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索资料..." className="pl-10 h-10" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
            {RESOURCE_TYPES.map((t) => (
              <button key={t} onClick={() => setType(t)}
                className={cn("rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all",
                  type === t ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-1 shrink-0 ml-3">
            {[
              { id: "downloads" as const, label: "最多下载" },
              { id: "latest" as const, label: "最新" },
              { id: "likes" as const, label: "最多点赞" },
            ].map((s) => (
              <button key={s.id} onClick={() => setSort(s.id)}
                className={cn("rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                  sort === s.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {filtered.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="shadow-sm hover:shadow-md transition-all group">
                <CardContent className="p-5 flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted/50">
                    {formatIcon(r.format)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{r.type}</Badge>
                      <Badge variant="outline" className="text-xs">{r.format}</Badge>
                    </div>
                    <h3 className="font-bold text-sm group-hover:text-primary transition-colors line-clamp-1">{r.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" /> {r.author} · {r.school}</span>
                      <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {r.downloads >= 1000 ? `${(r.downloads / 1000).toFixed(1)}k` : r.downloads}</span>
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {r.likes}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {r.date}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0 self-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Download className="h-3.5 w-3.5" /> 下载
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
