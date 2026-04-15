"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  GraduationCap,
  BookOpen,
  Building2,
  ArrowRight,
  Search,
  TrendingUp,
  Calendar,
  Sparkles,
  Users,
  FileText,
  Target,
  Mic,
  Heart,
  MessageSquare,
  Star,
  Shield,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import InfoCard from "@/components/common/InfoCard";
import SchoolCard from "@/components/common/SchoolCard";
import { mockNotices, mockSchools, mockStats } from "@/lib/mock-data";
import { getStatsOverview, getLatestNotices, getSchools } from "@/lib/api";
import type { StatsOverview } from "@/types/api";
import type { NoticeItem } from "@/types/notice";
import type { SchoolItem } from "@/types/school";
import { SITE_NAME } from "@/lib/constants";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** 动画变体 */
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

export default function HomePage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const router = useRouter();

  // 真实数据状态
  const [stats, setStats] = useState<StatsOverview>(mockStats);
  const [latestNotices, setLatestNotices] = useState<NoticeItem[]>(mockNotices.slice(0, 4));
  const [hotSchools, setHotSchools] = useState<SchoolItem[]>(mockSchools.slice(0, 8));
  const [loading, setLoading] = useState(true);

  // 从后端 API 获取真实数据
  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, noticesRes, schoolsRes] = await Promise.allSettled([
          getStatsOverview(),
          getLatestNotices(4),
          getSchools({ sort: "notice_count", size: 8 }),
        ]);

        if (statsRes.status === "fulfilled") setStats(statsRes.value);
        if (noticesRes.status === "fulfilled") setLatestNotices(noticesRes.value.items);
        if (schoolsRes.status === "fulfilled") setHotSchools(schoolsRes.value.items);
      } catch {
        // API 不可用时保持 mock 数据
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchKeyword.trim()) {
      router.push(`/info/notices?keyword=${encodeURIComponent(searchKeyword.trim())}`);
    }
  };

  return (
    <div className="flex flex-col">
      {/* ========== Hero Section ========== */}
      <section className="relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 dark:from-blue-950/30 via-background to-cyan-50/40 dark:to-cyan-950/20" />
          <div className="absolute left-[10%] top-[5%] h-80 w-80 rounded-full bg-blue-400/15 dark:bg-blue-500/8 blur-3xl" />
          <div className="absolute right-[15%] top-[15%] h-96 w-96 rounded-full bg-cyan-400/12 dark:bg-cyan-500/6 blur-3xl" />
          <div className="absolute left-[40%] bottom-0 h-72 w-72 rounded-full bg-violet-400/10 dark:bg-violet-500/6 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-28 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="mx-auto max-w-3xl text-center"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm backdrop-blur-sm border-primary/30 bg-primary/5 shadow-sm shadow-primary/10">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                全国 {stats.school_count} 所高校信息已收录
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
            >
              研途有我
              <span className="text-foreground">，</span>
              <br className="sm:hidden" />
              <span className="bg-gradient-to-r from-primary via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                前路无忧
              </span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              {SITE_NAME}——一站式保研信息聚合平台，汇集全国高校夏令营、预推免招生信息，
              <br className="hidden sm:block" />
              让你不错过每一个机会。
            </motion.p>

            {/* 搜索框 */}
            <motion.form
              variants={fadeInUp}
              onSubmit={handleSearch}
              className="mx-auto mt-8 flex max-w-xl gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索学校、学院、关键词..."
                  className="h-12 pl-11 text-base rounded-full border-primary/20 bg-background/80 backdrop-blur-sm shadow-sm focus-visible:shadow-primary/10 focus-visible:ring-primary/30"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </div>
              <Button type="submit" size="lg" className="h-12 px-7 rounded-full transition-all hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]">
                搜索
              </Button>
            </motion.form>

            <motion.div variants={fadeInUp} className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground/60">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> 实时更新</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> 全国覆盖</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> 免费使用</span>
            </motion.div>

            {/* 热门搜索 */}
            <motion.div
              variants={fadeInUp}
              className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground"
            >
              <span>热门：</span>
              {["计算机", "人工智能", "金融", "北京大学", "清华大学"].map((kw) => (
              <Link
                  key={kw}
                  href={`/info/notices?keyword=${encodeURIComponent(kw)}`}
                  className="rounded-full border px-3 py-1 transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/30 hover:shadow-sm"
                >
                  {kw}
                </Link>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ========== 数据统计 ========== */}
      <section className="border-y bg-gradient-to-r from-blue-50/50 dark:from-blue-950/20 via-background to-cyan-50/50 dark:to-cyan-950/20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {[
              { label: "收录院校", value: stats.school_count, suffix: "所", icon: Building2 },
              { label: "招生通知", value: stats.notice_count, suffix: "条", icon: BookOpen },
              { label: "覆盖学院", value: stats.department_count, suffix: "个", icon: GraduationCap },
              { label: "收录导师", value: stats.tutor_count, suffix: "位", icon: Users },
            ].map((stat) => (
              <motion.div key={stat.label} variants={fadeInUp}>
                <Card className="border-none bg-transparent shadow-none">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold tabular-nums">
                        <CountUpNumber value={stat.value} />
                        <span className="ml-0.5 text-sm font-normal text-muted-foreground">
                          {stat.suffix}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ========== 功能入口 ========== */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">快速开始</h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              选择你需要的功能，开始你的保研信息之旅
            </p>
          </motion.div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                title: "保研信息聚合",
                description: "夏令营、预推免、宣讲会等招生信息一站式汇总",
                icon: Calendar,
                href: "/info/notices",
                color: "text-blue-600 dark:text-blue-400",
                bg: "bg-blue-50 dark:bg-blue-500/10",
                border: "hover:border-blue-300/50 dark:hover:border-blue-500/30",
              },
              {
                title: "院校库",
                description: "985/211/双一流院校信息，了解目标院校详情",
                icon: Building2,
                href: "/info/schools",
                color: "text-emerald-600 dark:text-emerald-400",
                bg: "bg-emerald-50 dark:bg-emerald-500/10",
                border: "hover:border-emerald-300/50 dark:hover:border-emerald-500/30",
              },
              {
                title: "导师库",
                description: "搜索全国高校导师，了解研究方向与招生情况",
                icon: Users,
                href: "/info/tutors",
                color: "text-purple-600 dark:text-purple-400",
                bg: "bg-purple-50 dark:bg-purple-500/10",
                border: "hover:border-purple-300/50 dark:hover:border-purple-500/30",
              },
            ].map((item) => (
              <motion.div key={item.title} variants={fadeInUp}>
                <Link href={item.href}>
                  <Card className={`group h-full transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 ${item.border}`}>
                    <CardContent className="flex flex-col p-6">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.bg} ${item.color}`}>
                        <item.icon className="h-6 w-6" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold tracking-tight">{item.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
              <div className="mt-4 flex items-center text-sm font-medium text-primary opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1">
                        查看详情
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* AI 辅导入口 */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                title: "AI 简历工坊",
                description: "AI 辅助打造保研简历，分步填写、实时预览、智能优化建议",
                icon: FileText,
                href: "/ai/resume",
                gradient: "from-violet-500/10 to-purple-500/10",
                iconColor: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10",
                badgeColor: "border-violet-200 text-violet-700 dark:border-violet-500/30 dark:text-violet-400",
              },
              {
                title: "AI 择校推荐",
                description: "输入你的背景条件，AI 智能分析并推荐最适合的目标院校",
                icon: Target,
                href: "/ai/recommend",
                gradient: "from-amber-500/10 to-orange-500/10",
                iconColor: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10",
                badgeColor: "border-amber-200 text-amber-700 dark:border-amber-500/30 dark:text-amber-400",
              },
              {
                title: "AI 导师推荐",
                description: "根据研究兴趣和偏好，AI 智能匹配最适合你的导师",
                icon: GraduationCap,
                href: "/ai/tutor-match",
                gradient: "from-emerald-500/10 to-teal-500/10",
                iconColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10",
                badgeColor: "border-emerald-200 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-400",
              },
            ].map((item) => (
              <motion.div key={item.title} variants={fadeInUp}>
                <Link href={item.href}>
                  <Card className={`group h-full transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-1 bg-gradient-to-br ${item.gradient}`}>
                    <CardContent className="flex flex-col p-6">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.iconColor}`}>
                          <item.icon className="h-6 w-6" />
                        </div>
                        <Badge variant="outline" className={`text-xs ${item.badgeColor}`}>
                          <Sparkles className="h-3 w-3 mr-1" /> AI 驱动
                        </Badge>
                      </div>
                      <h3 className="mt-4 text-lg font-semibold tracking-tight">{item.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                      <div className="mt-4 flex items-center text-sm font-medium text-primary opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1">
                        立即体验
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* 更多功能入口 */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "模拟面试", description: "AI 面试官实时提问与评价", icon: Mic, href: "/ai/interview", gradient: "from-blue-500/10 to-cyan-500/10", iconColor: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10" },
              { title: "心理支持", description: "保研路上的温暖陪伴", icon: Heart, href: "/ai/mental", gradient: "from-pink-500/10 to-rose-500/10", iconColor: "text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-500/10" },
              { title: "综合规划", description: "AI 定制保研时间线", icon: Calendar, href: "/ai/plan", gradient: "from-amber-500/10 to-yellow-500/10", iconColor: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10" },
              { title: "保研社群", description: "交流经验、互助答疑", icon: MessageSquare, href: "/community", gradient: "from-orange-500/10 to-red-500/10", iconColor: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10" },
            ].map((item) => (
              <motion.div key={item.title} variants={fadeInUp}>
                <Link href={item.href}>
                  <Card className={`group h-full transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-1 bg-gradient-to-br ${item.gradient}`}>
                    <CardContent className="flex flex-col p-6">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.iconColor}`}>
                        <item.icon className="h-6 w-6" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold tracking-tight">{item.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                      <div className="mt-4 flex items-center text-sm font-medium text-primary opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1">
                        了解更多 <ArrowRight className="ml-1 h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ========== 最新通知 ========== */}
      <section className="bg-gradient-to-b from-background via-blue-50/20 dark:via-blue-950/10 to-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">最新推免动态</h2>
                <p className="mt-2 text-sm text-muted-foreground sm:text-base">实时更新全国高校推免招生信息</p>
              </div>
              <Link href="/info/notices">
                <Button variant="outline" className="hidden sm:flex">
                  查看全部
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>

            <div className="mt-8 space-y-4">
              {latestNotices.map((notice, i) => (
                <motion.div key={notice.id} variants={fadeInUp} custom={i}>
                  <InfoCard notice={notice} />
                </motion.div>
              ))}
            </div>

            <div className="mt-6 text-center sm:hidden">
              <Link href="/info/notices">
                <Button variant="outline">
                  查看全部通知
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========== 热门院校 ========== */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="flex items-center justify-between">
              <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">热门院校</h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">985 重点高校推免信息一览</p>
            </div>
            <Link href="/info/schools">
              <Button variant="outline" className="hidden sm:flex">
                查看全部
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {hotSchools.map((school, i) => (
              <motion.div key={school.id} variants={fadeInUp} custom={i}>
                <SchoolCard school={school} />
              </motion.div>
            ))}
          </div>

          <div className="mt-6 text-center sm:hidden">
            <Link href="/info/schools">
              <Button variant="outline">
                查看全部院校
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ========== 功能亮点 ========== */}
      <section className="border-y bg-gradient-to-r from-violet-50/50 dark:from-violet-950/20 via-background to-blue-50/50 dark:to-blue-950/20">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center mb-10">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">为什么选择研途有我？</h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">六大核心优势，助力你的保研之路</p>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Zap, title: "信息实时更新", desc: "多源爬虫 24 小时监控，第一时间推送最新招生信息", color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10" },
                { icon: Shield, title: "AI 全程陪伴", desc: "从择校到面试，6 大 AI 工具覆盖保研全流程", color: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10" },
                { icon: BookOpen, title: "知识体系完整", desc: "院校百科、面试题库、文书模板、经验精选一应俱全", color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10" },
                { icon: Target, title: "个性化规划", desc: "根据你的背景和目标，AI 定制专属保研时间线", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10" },
                { icon: Users, title: "社群互助", desc: "万人保研社群，经验分享、问答互助、学习打卡", color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10" },
                { icon: CheckCircle2, title: "进度追踪", desc: "任务管理、成果记录、学习打卡，全流程可视化跟进", color: "text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10" },
              ].map((item) => (
                <motion.div key={item.title} variants={fadeInUp}>
                  <Card className="group h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-none bg-card/80 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.color} mb-4`}>
                        <item.icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-base font-semibold mb-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========== 用户评价 ========== */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="text-center mb-10">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">用户好评</h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">来自真实用户的声音</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: "张同学", school: "某 985 高校", avatar: "🧑‍🎓", content: "研途有我帮我整理了所有夏令营信息，再也不用一个个翻学校官网了！", rating: 5 },
              { name: "李同学", school: "某 211 高校", avatar: "👩‍🎓", content: "AI 模拟面试功能太棒了，面试前练了好几轮，真正面试时自信了很多。", rating: 5 },
              { name: "王同学", school: "某双一流高校", avatar: "🧑‍💻", content: "综合规划功能帮我制定了详细的保研时间线，每一步都很清晰！", rating: 5 },
            ].map((t) => (
              <motion.div key={t.name} variants={fadeInUp}>
                <Card className="h-full hover:shadow-lg hover:-translate-y-1 transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-violet-500/10 text-xl">
                        {t.avatar}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">{t.name}</h4>
                        <p className="text-xs text-muted-foreground">{t.school}</p>
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
          </div>
        </motion.div>
      </section>

      {/* ========== 底部 CTA ========== */}
      <section className="bg-gradient-to-br from-primary/5 via-violet-500/5 to-cyan-500/5 border-t">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-white mb-6 shadow-lg shadow-primary/25">
              <GraduationCap className="h-8 w-8" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">准备好开始了吗？</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              加入研途有我，让保研之路不再孤单
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/register">
                <Button size="lg" className="gap-2 shadow-md shadow-primary/20 w-full sm:w-auto">
                  <Sparkles className="h-4 w-4" /> 免费注册
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                  了解更多 <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

function CountUpNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const dur = 1200;
        const step = (now: number) => {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(Math.floor(eased * value));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);

  return <span ref={ref}>{display.toLocaleString()}</span>;
}
