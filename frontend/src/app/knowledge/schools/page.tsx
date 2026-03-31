"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, Search, MapPin, Star, Users,
  TrendingUp, ChevronRight, BarChart3, Filter,
  Building2, BookOpen, Award, Network, List,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import SchoolRelationGraph from "@/components/graph/SchoolRelationGraph";

/* ================================================================
   Mock 数据
   ================================================================ */

const SCHOOL_LEVELS = ["全部", "985", "211", "双一流"];
const REGIONS = ["全部", "华北", "华东", "华南", "华中", "东北", "西南", "西北"];

const MOCK_SCHOOLS = [
  {
    id: 1, university: "清华大学", department: "计算机科学与技术系", level: "985" as const,
    province: "北京", discipline_rating: "A+", tags: ["顶尖", "竞争激烈", "科研强"],
    admission_preference: "偏好 985 本科，科研经历优先",
    stats: { enrolled: 120, applicants: 2400, acceptance_rate: 5 },
    hot_score: 98,
  },
  {
    id: 2, university: "北京大学", department: "信息科学技术学院", level: "985" as const,
    province: "北京", discipline_rating: "A+", tags: ["顶尖", "学术自由", "国际化"],
    admission_preference: "综合素质优先，欢迎跨学科背景",
    stats: { enrolled: 100, applicants: 2000, acceptance_rate: 5 },
    hot_score: 97,
  },
  {
    id: 3, university: "浙江大学", department: "计算机科学与技术学院", level: "985" as const,
    province: "浙江", discipline_rating: "A+", tags: ["工程强", "就业好", "氛围好"],
    admission_preference: "重视项目经历和编程能力",
    stats: { enrolled: 150, applicants: 1800, acceptance_rate: 8.3 },
    hot_score: 95,
  },
  {
    id: 4, university: "上海交通大学", department: "电子信息与电气工程学院", level: "985" as const,
    province: "上海", discipline_rating: "A", tags: ["工科强", "产学研", "国际化"],
    admission_preference: "偏好有竞赛或科研经历的同学",
    stats: { enrolled: 130, applicants: 1600, acceptance_rate: 8.1 },
    hot_score: 94,
  },
  {
    id: 5, university: "南京大学", department: "计算机科学与技术系", level: "985" as const,
    province: "江苏", discipline_rating: "A", tags: ["学术氛围", "导师负责", "性价比高"],
    admission_preference: "重视基础知识和学术潜力",
    stats: { enrolled: 80, applicants: 1200, acceptance_rate: 6.7 },
    hot_score: 92,
  },
  {
    id: 6, university: "中国科学技术大学", department: "计算机科学与技术学院", level: "985" as const,
    province: "安徽", discipline_rating: "A-", tags: ["科研导向", "小而精", "出国率高"],
    admission_preference: "偏好科研型学生，GPA 要求高",
    stats: { enrolled: 60, applicants: 800, acceptance_rate: 7.5 },
    hot_score: 90,
  },
  {
    id: 7, university: "华中科技大学", department: "计算机科学与技术学院", level: "985" as const,
    province: "湖北", discipline_rating: "A", tags: ["工科强", "就业好", "性价比高"],
    admission_preference: "欢迎 211 及以上本科",
    stats: { enrolled: 140, applicants: 1400, acceptance_rate: 10 },
    hot_score: 88,
  },
  {
    id: 8, university: "哈尔滨工业大学", department: "计算机科学与技术学院", level: "985" as const,
    province: "黑龙江", discipline_rating: "A", tags: ["航天特色", "工程实践", "校友资源"],
    admission_preference: "重视动手能力和项目经历",
    stats: { enrolled: 110, applicants: 1100, acceptance_rate: 10 },
    hot_score: 86,
  },
];

/* ================================================================
   页面组件
   ================================================================ */

export default function SchoolsWikiPage() {
  const [level, setLevel] = useState("全部");
  const [region, setRegion] = useState("全部");
  const [keyword, setKeyword] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "graph">("list");

  const filtered = MOCK_SCHOOLS
    .filter((s) => level === "全部" || s.level === level)
    .filter((s) => !keyword || s.university.includes(keyword) || s.department.includes(keyword))
    .sort((a, b) => b.hot_score - a.hot_score);

  return (
    <div className="space-y-5">
      {/* 搜索和筛选 */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索学校或学院..." className="pl-10 h-10 rounded-xl" />
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">层次：</span>
            {SCHOOL_LEVELS.map((l) => (
              <button key={l} onClick={() => setLevel(l)}
                className={cn("rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                  level === l ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">地区：</span>
            {REGIONS.map((r) => (
              <button key={r} onClick={() => setRegion(r)}
                className={cn("rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                  region === r ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 视图切换 */}
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === "list" ? "default" : "outline"}
          size="sm" className="h-7 gap-1 text-xs"
          onClick={() => setViewMode("list")}
        >
          <List className="h-3 w-3" /> 列表
        </Button>
        <Button
          variant={viewMode === "graph" ? "default" : "outline"}
          size="sm" className="h-7 gap-1 text-xs"
          onClick={() => setViewMode("graph")}
        >
          <Network className="h-3 w-3" /> 关系图谱
        </Button>
      </div>

      {/* 图谱视图 */}
      {viewMode === "graph" && <SchoolRelationGraph />}

      {/* 院校列表 */}
      {viewMode === "list" && (
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.map((school, i) => (
            <motion.div key={school.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}>
              <Card className="shadow-sm hover:shadow-md transition-all group cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* 学校图标 */}
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 text-blue-600">
                      <GraduationCap className="h-7 w-7" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* 标题行 */}
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-base group-hover:text-primary transition-colors">{school.university}</h3>
                        <Badge variant="outline" className="text-xs">{school.level}</Badge>
                        {school.discipline_rating && (
                          <Badge className="text-xs bg-amber-500/10 text-amber-700 border-amber-200">
                            学科评估 {school.discipline_rating}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{school.department}</p>

                      {/* 招生偏好 */}
                      <p className="text-xs text-muted-foreground/80 mt-2 flex items-center gap-1">
                        <BookOpen className="h-3 w-3 shrink-0" /> {school.admission_preference}
                      </p>

                      {/* 标签 */}
                      <div className="flex items-center gap-1.5 mt-2">
                        {school.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>

                      {/* 数据统计 */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {school.province}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> 录取 {school.stats.enrolled} 人
                        </span>
                        <span className="flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" /> 录取率 {school.stats.acceptance_rate}%
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-orange-500" /> 热度 {school.hot_score}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary shrink-0 self-center transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      )}

      {/* 结果统计 */}
      {viewMode === "list" && (
      <div className="text-center text-xs text-muted-foreground py-4">
        共找到 {filtered.length} 个院校
      </div>
      )}
    </div>
  );
}