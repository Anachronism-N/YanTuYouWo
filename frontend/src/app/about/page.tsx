"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  GraduationCap, Shield, Lock, Server, Brain,
  Users, Heart, Sparkles, ArrowRight, Globe,
  Zap, Eye, BookOpen, Target, Award,
  CheckCircle2, Star, MessageSquare,
  Code2, Database, Bot, Layers, Cpu,
  Calendar, TrendingUp, Rocket,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ProjectMindMap from "@/components/graph/ProjectMindMap";

/* ================================================================
   关于我们页面 — P4 增强版
   新增：发展历程时间线、服务架构图、功能亮点、用户评价
   ================================================================ */

const FEATURES = [
  { icon: BookOpen, title: "保研信息聚合", desc: "全网爬取夏令营、预推免、宣讲会等招生信息，一站式获取", color: "from-blue-500/10 to-cyan-500/10 text-blue-600" },
  { icon: Brain, title: "AI 智能辅导", desc: "简历优化、择校推荐、模拟面试、综合规划，AI 全程陪伴", color: "from-violet-500/10 to-purple-500/10 text-violet-600" },
  { icon: GraduationCap, title: "知识库", desc: "院校百科、面试题库、文书模板、经验精选、信息差速递", color: "from-emerald-500/10 to-green-500/10 text-emerald-600" },
  { icon: Target, title: "进度中心", desc: "规划管理、任务追踪、成果记录、学习打卡，全流程跟进", color: "from-amber-500/10 to-yellow-500/10 text-amber-600" },
  { icon: Users, title: "保研社群", desc: "经验分享、问答互助、学习打卡、资料广场、树洞倾诉", color: "from-rose-500/10 to-pink-500/10 text-rose-600" },
  { icon: Sparkles, title: "个人知识库", desc: "收藏、笔记、标签管理，构建你的专属知识体系", color: "from-orange-500/10 to-red-500/10 text-orange-600" },
];

const TECH_STACK = [
  { category: "前端", icon: Code2, items: ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS", "shadcn/ui", "Framer Motion"], color: "text-blue-600 bg-blue-50" },
  { category: "后端", icon: Server, items: ["Python", "FastAPI", "PostgreSQL", "Redis", "Celery"], color: "text-emerald-600 bg-emerald-50" },
  { category: "AI", icon: Bot, items: ["大语言模型", "RAG 检索增强", "向量数据库", "Prompt Engineering"], color: "text-violet-600 bg-violet-50" },
  { category: "数据", icon: Database, items: ["多源爬虫", "微信公众号", "知乎", "小红书", "高校官网"], color: "text-amber-600 bg-amber-50" },
  { category: "部署", icon: Layers, items: ["Docker", "Nginx", "CI/CD", "云服务器"], color: "text-rose-600 bg-rose-50" },
];

const PRIVACY_ITEMS = [
  { icon: Lock, title: "数据加密", desc: "所有用户数据采用 AES-256 加密存储，传输使用 TLS 1.3 协议" },
  { icon: Shield, title: "隐私保护", desc: "严格遵守个人信息保护法，不会向第三方出售或共享你的数据" },
  { icon: Eye, title: "透明可控", desc: "你可以随时查看、导出或删除你的个人数据，完全掌控自己的信息" },
  { icon: Server, title: "安全架构", desc: "采用微服务架构，数据隔离存储，定期安全审计和漏洞扫描" },
];

const TEAM_VALUES = [
  { emoji: "🎯", title: "使命", desc: "让每一位有保研梦想的同学都能获得公平、高效的信息和指导" },
  { emoji: "💡", title: "愿景", desc: "成为中国最受信赖的保研一站式服务平台" },
  { emoji: "❤️", title: "价值观", desc: "以用户为中心，用技术消除信息差，让保研不再是少数人的游戏" },
];

/** 发展历程时间线 */
const MILESTONES = [
  { date: "2025.09", title: "项目启动", desc: "确定产品方向，组建核心团队", icon: Rocket, color: "bg-blue-500" },
  { date: "2025.12", title: "MVP 上线", desc: "信息聚合模块上线，覆盖 200+ 高校", icon: Zap, color: "bg-emerald-500" },
  { date: "2026.01", title: "AI 模块上线", desc: "简历工坊、择校推荐、模拟面试等 AI 功能发布", icon: Brain, color: "bg-violet-500" },
  { date: "2026.02", title: "社群与知识库", desc: "保研社群、知识库、进度中心全面上线", icon: Users, color: "bg-amber-500" },
  { date: "2026.03", title: "体验升级", desc: "多主题、动态背景、AI 助手悬浮球等体验增强", icon: Sparkles, color: "bg-rose-500" },
  { date: "2026.Q2", title: "知识图谱", desc: "知识图谱可视化，院校关系网络，个人保研路径图", icon: TrendingUp, color: "bg-cyan-500" },
];

/** 用户评价 */
const TESTIMONIALS = [
  { name: "张同学", school: "某 985 高校", avatar: "🧑‍🎓", content: "研途有我帮我整理了所有夏令营信息，再也不用一个个翻学校官网了，省了好多时间！", rating: 5 },
  { name: "李同学", school: "某 211 高校", avatar: "👩‍🎓", content: "AI 模拟面试功能太棒了，面试前练了好几轮，真正面试时自信了很多。", rating: 5 },
  { name: "王同学", school: "某双一流高校", avatar: "🧑‍💻", content: "综合规划功能帮我制定了详细的保研时间线，每一步都很清晰，强烈推荐！", rating: 5 },
  { name: "赵同学", school: "某 985 高校", avatar: "👩‍💻", content: "简历工坊的模板很专业，AI 给的优化建议也很到位，简历质量提升了一个档次。", rating: 5 },
];

/** 服务架构数据流 */
const ARCH_LAYERS = [
  { label: "用户端", items: ["Web 应用", "移动端适配", "AI 悬浮助手"], color: "bg-blue-500/10 border-blue-500/20 text-blue-700" },
  { label: "应用层", items: ["Next.js SSR/SSG", "API 路由", "实时通信"], color: "bg-violet-500/10 border-violet-500/20 text-violet-700" },
  { label: "服务层", items: ["FastAPI 后端", "AI 推理服务", "爬虫调度"], color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700" },
  { label: "数据层", items: ["PostgreSQL", "Redis 缓存", "向量数据库"], color: "bg-amber-500/10 border-amber-500/20 text-amber-700" },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {/* ===== Hero ===== */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative text-center mb-20">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none">
          <div className="absolute top-0 left-0 h-48 w-48 rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute top-10 right-0 h-56 w-56 rounded-full bg-violet-500/8 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-cyan-500/8 blur-3xl" />
        </div>
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/10 to-violet-500/10 mb-6 shadow-lg shadow-primary/10"
        >
          <GraduationCap className="h-10 w-10 text-primary" />
        </motion.div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
          研途有我
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          一站式保研信息聚合与 AI 辅导平台
          <br />
          <span className="text-primary font-medium">用技术消除信息差，让保研之路不再孤单</span>
        </p>
        <div className="flex justify-center gap-3 mt-8">
          <Link href="/info/notices">
            <Button size="lg" className="gap-2 shadow-md shadow-primary/20">
              <Sparkles className="h-4 w-4" /> 开始探索
            </Button>
          </Link>
          <Link href="/ai/plan">
            <Button size="lg" variant="outline" className="gap-2">
              <Brain className="h-4 w-4" /> AI 规划
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* ===== 使命愿景 ===== */}
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-20">
        {TEAM_VALUES.map((v, i) => (
          <motion.div key={v.title} variants={fadeInUp}>
            <Card className="shadow-sm h-full text-center hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="text-4xl mb-3">{v.emoji}</div>
                <h3 className="font-bold text-lg mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ===== 发展历程时间线 ===== */}
      <div className="mb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <h2 className="text-2xl font-bold sm:text-3xl">发展历程</h2>
          <p className="text-sm text-muted-foreground mt-2">从构想到落地，一步一个脚印</p>
        </motion.div>
        <div className="relative">
          {/* 中轴线 */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2 hidden sm:block" />
          <div className="space-y-8 sm:space-y-0">
            {MILESTONES.map((m, i) => {
              const Icon = m.icon;
              const isLeft = i % 2 === 0;
              return (
                <motion.div
                  key={m.date}
                  initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    "relative sm:flex sm:items-center sm:gap-8 sm:py-6",
                    isLeft ? "sm:flex-row" : "sm:flex-row-reverse",
                  )}
                >
                  {/* 内容卡片 */}
                  <div className={cn("sm:w-[calc(50%-2rem)] sm:flex-shrink-0", isLeft ? "sm:text-right" : "sm:text-left")}>
                    <Card className="shadow-sm hover:shadow-md transition-shadow inline-block w-full">
                      <CardContent className="p-5">
                        <Badge variant="outline" className="mb-2 text-xs">{m.date}</Badge>
                        <h3 className="font-bold text-base mb-1">{m.title}</h3>
                        <p className="text-sm text-muted-foreground">{m.desc}</p>
                      </CardContent>
                    </Card>
                  </div>
                  {/* 中间节点 */}
                  <div className="hidden sm:flex items-center justify-center shrink-0">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md", m.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  {/* 占位 */}
                  <div className="hidden sm:block sm:w-[calc(50%-2rem)] sm:flex-shrink-0" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== 功能与服务全景脑图 ===== */}
      <ProjectMindMap />

      {/* ===== 核心功能 ===== */}
      <div className="mb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
          <h2 className="text-2xl font-bold sm:text-3xl">核心功能</h2>
          <p className="text-base text-muted-foreground mt-2">六大模块，覆盖保研全流程</p>
        </motion.div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title} variants={fadeInUp}>
                <Card className="shadow-sm h-full hover:shadow-md transition-all group hover:-translate-y-0.5">
                  <CardContent className="p-5">
                    <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br mb-3 transition-transform group-hover:scale-110", f.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-base mb-1.5">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* ===== 服务架构 ===== */}
      <div className="mb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
          <h2 className="text-2xl font-bold sm:text-3xl">服务架构</h2>
          <p className="text-base text-muted-foreground mt-2">四层架构，稳定可靠</p>
        </motion.div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
          <div className="space-y-3">
            {ARCH_LAYERS.map((layer, i) => (
              <motion.div key={layer.label} variants={fadeInUp}>
                <div className={cn("rounded-xl border-2 p-4 transition-all hover:shadow-md", layer.color)}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 shadow-sm text-sm font-bold">
                      L{i + 1}
                    </div>
                    <h4 className="font-bold text-sm">{layer.label}</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {layer.items.map((item) => (
                      <Badge key={item} variant="secondary" className="text-xs bg-white/60">{item}</Badge>
                    ))}
                  </div>
                </div>
                {i < ARCH_LAYERS.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="h-4 w-px bg-border" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ===== 技术栈 ===== */}
      <div className="mb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
          <h2 className="text-2xl font-bold sm:text-3xl">技术栈</h2>
          <p className="text-base text-muted-foreground mt-2">业界领先的技术选型，确保平台稳定性和用户体验</p>
        </motion.div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {TECH_STACK.map((stack) => {
              const Icon = stack.icon;
              return (
                <motion.div key={stack.category} variants={fadeInUp}>
                  <Card className="shadow-sm h-full hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", stack.color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <h4 className="font-bold text-sm">{stack.category}</h4>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {stack.items.map((item) => (
                          <Badge key={item} variant="secondary" className="text-xs">{item}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ===== 数据来源 ===== */}
      <div className="mb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
          <h2 className="text-2xl font-bold sm:text-3xl">数据来源</h2>
          <p className="text-base text-muted-foreground mt-2">多渠道数据采集，确保信息的全面性和时效性</p>
        </motion.div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Globe, label: "高校官网", desc: "200+ 所高校", color: "text-blue-500 bg-blue-50" },
            { icon: MessageSquare, label: "微信公众号", desc: "50+ 个公众号", color: "text-green-500 bg-green-50" },
            { icon: BookOpen, label: "知乎/小红书", desc: "实时监控", color: "text-red-500 bg-red-50" },
            { icon: Users, label: "用户贡献", desc: "社区共建", color: "text-violet-500 bg-violet-50" },
          ].map((src) => (
            <motion.div key={src.label} variants={fadeInUp}>
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <div className={cn("flex h-10 w-10 mx-auto items-center justify-center rounded-xl mb-2", src.color)}>
                    <src.icon className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-sm">{src.label}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{src.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ===== 用户评价 ===== */}
      <div className="mb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
          <h2 className="text-2xl font-bold sm:text-3xl">用户评价</h2>
          <p className="text-base text-muted-foreground mt-2">来自真实用户的声音</p>
        </motion.div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TESTIMONIALS.map((t) => (
            <motion.div key={t.name} variants={fadeInUp}>
              <Card className="shadow-sm h-full hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-violet-500/10 text-xl">
                      {t.avatar}
                    </div>
                    <div>
                      <h4 className="font-bold text-base">{t.name}</h4>
                      <p className="text-sm text-muted-foreground">{t.school}</p>
                    </div>
                    <div className="ml-auto flex gap-0.5">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">&ldquo;{t.content}&rdquo;</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ===== 隐私与安全 ===== */}
      <div className="mb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
          <h2 className="text-2xl font-bold sm:text-3xl">隐私与安全</h2>
          <p className="text-base text-muted-foreground mt-2">你的数据安全是我们的首要责任</p>
        </motion.div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PRIVACY_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div key={item.title} variants={fadeInUp}>
                <Card className="shadow-sm h-full hover:shadow-md transition-shadow">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* ===== 底部 CTA ===== */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
        <Card className="shadow-lg bg-gradient-to-br from-primary/5 via-violet-500/5 to-cyan-500/5 border-primary/20">
          <CardContent className="p-10 sm:p-14">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-white mb-6 shadow-lg shadow-primary/25">
              <GraduationCap className="h-8 w-8" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">开始你的保研之旅</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed">
              无论你是刚开始准备保研，还是已经在冲刺阶段，
              <br className="hidden sm:block" />
              研途有我都能为你提供最专业的支持
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/info/notices">
                <Button size="lg" className="gap-2 shadow-md shadow-primary/20 w-full sm:w-auto">
                  <Sparkles className="h-4 w-4" /> 开始探索
                </Button>
              </Link>
              <Link href="/ai/plan">
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                  <Brain className="h-4 w-4" /> AI 规划
                </Button>
              </Link>
              <Link href="/community">
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                  <Users className="h-4 w-4" /> 加入社群
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
