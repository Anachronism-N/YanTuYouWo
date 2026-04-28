"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Search, Download, Star, Eye,
  File, ExternalLink, Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TEMPLATE_TYPES = ["全部", "个人陈述", "推荐信", "研究计划", "简历模板", "自荐信"];

const MOCK_TEMPLATES = [
  {
    id: 1, title: "个人陈述模板（理工科通用版）", description: "适用于理工科保研的个人陈述模板，结构清晰，重点突出科研经历",
    type: "个人陈述", discipline: "理工科", format: "DOCX" as const,
    download_count: 3420, rating: 4.8, rating_count: 234, author: "保研成功的小明",
    tags: ["理工科", "通用", "科研导向"],
  },
  {
    id: 2, title: "导师推荐信模板（学术型）", description: "学术型推荐信模板，突出学生的科研能力和学术潜力",
    type: "推荐信", discipline: "通用", format: "DOCX" as const,
    download_count: 2890, rating: 4.7, rating_count: 189, author: "张教授",
    tags: ["推荐信", "学术型"],
  },
  {
    id: 3, title: "研究计划书模板（计算机方向）", description: "计算机方向的研究计划书模板，含研究背景、方法、预期成果等",
    type: "研究计划", discipline: "计算机", format: "PDF" as const,
    download_count: 1560, rating: 4.9, rating_count: 98, author: "CS学长",
    tags: ["计算机", "研究计划"],
  },
  {
    id: 4, title: "保研简历模板（LaTeX 版）", description: "精美的 LaTeX 简历模板，适合有科研经历的同学",
    type: "简历模板", discipline: "通用", format: "PDF" as const,
    download_count: 4560, rating: 4.9, rating_count: 312, author: "LaTeX爱好者",
    tags: ["LaTeX", "精美", "科研"],
  },
  {
    id: 5, title: "个人陈述模板（经管类）", description: "适用于经济管理类保研的个人陈述，突出实习和竞赛经历",
    type: "个人陈述", discipline: "经管类", format: "DOCX" as const,
    download_count: 1890, rating: 4.6, rating_count: 145, author: "金融小王",
    tags: ["经管", "实习导向"],
  },
  {
    id: 6, title: "自荐信模板（跨专业版）", description: "适用于跨专业保研的自荐信，如何展示跨学科优势",
    type: "自荐信", discipline: "跨专业", format: "DOCX" as const,
    download_count: 1230, rating: 4.5, rating_count: 87, author: "跨保达人",
    tags: ["跨专业", "自荐信"],
  },
];

const formatIcon = (format: string) => {
  switch (format) {
    case "PDF": return <div className="text-red-500"><FileText className="h-5 w-5" /></div>;
    case "DOCX": return <div className="text-blue-500"><File className="h-5 w-5" /></div>;
    default: return <div className="text-gray-500"><FileText className="h-5 w-5" /></div>;
  }
};

export default function TemplatesPage() {
  const [type, setType] = useState("全部");
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<"downloads" | "rating" | "latest">("downloads");

  const filtered = MOCK_TEMPLATES
    .filter((t) => type === "全部" || t.type === type)
    .filter((t) => !keyword || t.title.includes(keyword) || t.description.includes(keyword))
    .sort((a, b) => {
      if (sort === "downloads") return b.download_count - a.download_count;
      if (sort === "rating") return b.rating - a.rating;
      return 0;
    });

  return (
    <div className="space-y-5">
      {/* 搜索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={keyword} onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索模板..." className="pl-10 h-10 rounded-xl" />
      </div>

      {/* 筛选 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
          {TEMPLATE_TYPES.map((t) => (
            <button key={t} onClick={() => setType(t)}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all",
                type === t ? "bg-emerald-500 text-white shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-1 shrink-0 ml-3">
          {([
            { id: "downloads" as const, label: "下载量" },
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

      {/* 模板列表 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AnimatePresence>
          {filtered.map((tpl, i) => (
            <motion.div key={tpl.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}>
              <Card className="shadow-sm hover:shadow-lg transition-all group cursor-pointer h-full hover:border-primary/20">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/5">
                      {formatIcon(tpl.format)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge variant="outline" className="text-xs">{tpl.type}</Badge>
                        <Badge variant="secondary" className="text-xs">{tpl.format}</Badge>
                      </div>
                      <h3 className="font-bold text-sm group-hover:text-emerald-600 transition-colors line-clamp-1">{tpl.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tpl.description}</p>

                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                          <Star className="h-3 w-3 fill-amber-500" /> {tpl.rating}
                          <span className="text-muted-foreground font-normal">({tpl.rating_count})</span>
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Download className="h-3 w-3" /> {tpl.download_count >= 1000 ? `${(tpl.download_count / 1000).toFixed(1)}k` : tpl.download_count}
                        </span>
                      </div>

                      <div className="flex gap-1.5 mt-2">
                        {tpl.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs h-8">
                      <Eye className="h-3 w-3" /> 预览
                    </Button>
                    <Button size="sm" className="flex-1 gap-1.5 text-xs h-8 bg-emerald-500 hover:bg-emerald-600">
                      <Download className="h-3 w-3" /> 下载
                    </Button>
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
