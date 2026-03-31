"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  GraduationCap, Video, FileQuestion, FileText,
  Star, Lightbulb, ArrowRight, TrendingUp,
  BookOpen, Users, Download, Eye, Network,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import KnowledgeSystemGraph from "@/components/graph/KnowledgeSystemGraph";

/* ================================================================
   知识库模块入口
   ================================================================ */

const modules = [
  {
    title: "院校百科",
    description: "各校各学院详细情况，招生偏好、历年数据、导师风格等",
    href: "/knowledge/schools",
    icon: GraduationCap,
    color: "from-blue-500/10 to-cyan-500/10 text-blue-600",
    stats: "收录 200+ 院校",
  },
  {
    title: "录播课程",
    description: "保研相关视频课程，面试技巧、简历撰写、科研入门等",
    href: "/knowledge/courses",
    icon: Video,
    color: "from-violet-500/10 to-purple-500/10 text-violet-600",
    stats: "32 门课程",
  },
  {
    title: "面试题库",
    description: "按学校/学科/题型分类的面试真题，支持用户贡献",
    href: "/knowledge/questions",
    icon: FileQuestion,
    color: "from-amber-500/10 to-orange-500/10 text-amber-600",
    stats: "1200+ 道真题",
  },
  {
    title: "文书模板",
    description: "个人陈述、推荐信、研究计划等模板，支持在线预览",
    href: "/knowledge/templates",
    icon: FileText,
    color: "from-emerald-500/10 to-green-500/10 text-emerald-600",
    stats: "86 个模板",
  },
  {
    title: "经验精选",
    description: "经过审核的高质量保研经验帖，来自成功上岸的学长学姐",
    href: "/knowledge/experiences",
    icon: Star,
    color: "from-rose-500/10 to-pink-500/10 text-rose-600",
    stats: "450+ 篇精选",
  },
  {
    title: "信息差速递",
    description: "保研过程中的「信息差」知识，隐性要求、导师偏好等",
    href: "/knowledge/tips",
    icon: Lightbulb,
    color: "from-yellow-500/10 to-amber-500/10 text-yellow-600",
    stats: "每周更新",
  },
];

/* ================================================================
   热门内容
   ================================================================ */

const hotContent = [
  { id: 1, title: "2026 年清华大学计算机系夏令营面试真题", type: "面试题库", views: 3420, href: "/knowledge/questions" },
  { id: 2, title: "从双非到 985，我的保研逆袭之路", type: "经验精选", views: 2890, href: "/knowledge/experiences" },
  { id: 3, title: "个人陈述万能模板（理工科版）", type: "文书模板", views: 2340, href: "/knowledge/templates" },
  { id: 4, title: "保研面试英语口语速成课", type: "录播课程", views: 1980, href: "/knowledge/courses" },
  { id: 5, title: "各校推免生接收条件隐性要求汇总", type: "信息差", views: 1760, href: "/knowledge/tips" },
];

const recentExperiences = [
  {
    id: 1,
    title: "北大信科夏令营经验分享",
    author: "CS小王",
    school: "武汉大学",
    target: "北京大学",
    category: "夏令营",
    likes: 234,
    date: "2 天前",
  },
  {
    id: 2,
    title: "浙大控制学院预推免面经",
    author: "自动化小李",
    school: "东南大学",
    target: "浙江大学",
    category: "预推免",
    likes: 189,
    date: "3 天前",
  },
  {
    id: 3,
    title: "跨专业保研到复旦金融的经验",
    author: "转行达人",
    school: "中南大学",
    target: "复旦大学",
    category: "综合经验",
    likes: 156,
    date: "5 天前",
  },
];

/* ================================================================
   页面组件
   ================================================================ */

export default function KnowledgePage() {
  return (
    <div className="space-y-8">
      {/* 模块入口网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((mod, i) => {
          const Icon = mod.icon;
          return (
            <motion.div
              key={mod.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={mod.href}>
                <Card className="group h-full transition-all hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${mod.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="font-bold text-sm mb-1">{mod.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{mod.description}</p>
                    <Badge variant="secondary" className="text-xs">{mod.stats}</Badge>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* 热门内容 + 最新经验 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 热门内容 */}
        <div className="lg:col-span-2">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> 热门内容
          </h2>
          <div className="space-y-2">
            {hotContent.map((item, i) => (
              <Link key={item.id} href={item.href}>
                <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/50 transition-colors group">
                  <span className={`text-sm font-bold w-5 shrink-0 ${i < 3 ? "text-orange-500" : "text-muted-foreground/40"}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs h-4">{item.type}</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Eye className="h-3 w-3" /> {item.views >= 1000 ? `${(item.views / 1000).toFixed(1)}k` : item.views}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 最新经验精选 */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" /> 最新经验精选
            </h2>
            <Link href="/knowledge/experiences" className="text-xs text-primary hover:underline flex items-center gap-1">
              查看全部 <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentExperiences.map((exp) => (
              <Card key={exp.id} className="shadow-sm hover:shadow-md transition-all group">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/10 to-pink-500/10 text-rose-600 text-sm font-bold">
                      {exp.author.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold group-hover:text-primary transition-colors truncate">{exp.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{exp.author}</span>
                        <span>·</span>
                        <span>{exp.school} → {exp.target}</span>
                        <span>·</span>
                        <span>{exp.date}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">{exp.category}</Badge>
                        <span className="text-xs text-muted-foreground">❤️ {exp.likes}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* 保研知识体系图谱 */}
      <KnowledgeSystemGraph />

      {/* 数据统计 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "收录院校", value: "200+", icon: GraduationCap, color: "text-blue-500 bg-blue-50" },
          { label: "面试真题", value: "1,200+", icon: FileQuestion, color: "text-amber-500 bg-amber-50" },
          { label: "经验帖", value: "450+", icon: Star, color: "text-rose-500 bg-rose-50" },
          { label: "用户贡献", value: "2,800+", icon: Users, color: "text-emerald-500 bg-emerald-50" },
        ].map((stat) => (
          <Card key={stat.label} className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
