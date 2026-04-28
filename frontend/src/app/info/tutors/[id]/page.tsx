"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  User,
  MapPin,
  Mail,
  Phone,
  Globe,
  Building2,
  BookOpen,
  FlaskConical,
  Award,
  GraduationCap,
  Briefcase,
  Eye,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  XCircle,
  FileText,
  Sparkles,
  TrendingUp,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import FavoriteButton from "@/components/common/FavoriteButton";
import TutorAvatar from "@/components/common/TutorAvatar";
import PapersList from "@/components/tutor/PapersList";
import CoauthorsCard from "@/components/tutor/CoauthorsCard";
import TopicsChart from "@/components/tutor/TopicsChart";
import YearlyTrend from "@/components/tutor/YearlyTrend";
import { getTutorDetail } from "@/lib/api";
import type {
  TutorDetail,
  EducationItem,
  ExperienceItem,
  PublicationItem,
  ProjectItem,
} from "@/types/tutor";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// ────────── 列表项渲染辅助 ──────────

function renderEdu(item: EducationItem | string, i: number) {
  if (typeof item === "string") return <span>{item}</span>;
  const parts = [
    item.year && `[${item.year}]`,
    item.school,
    item.major && `· ${item.major}`,
    item.degree && `· ${item.degree}`,
  ].filter(Boolean);
  return <span>{parts.join(" ")}</span>;
}

function renderExp(item: ExperienceItem | string) {
  if (typeof item === "string") return <span>{item}</span>;
  const parts = [
    item.year && `[${item.year}]`,
    item.organization,
    item.title && `· ${item.title}`,
  ].filter(Boolean);
  return <span>{parts.join(" ")}</span>;
}

function renderPub(item: PublicationItem | string, i: number) {
  if (typeof item === "string") return <span>{item}</span>;
  return (
    <span>
      <span className="font-medium">{item.title}</span>
      {item.venue && (
        <span className="text-primary/70 ml-1">· {item.venue}</span>
      )}
      {item.year && (
        <span className="text-muted-foreground/60 ml-1">({item.year})</span>
      )}
      {typeof item.citations === "number" && item.citations > 0 && (
        <Badge variant="outline" className="ml-2 text-[10px] border-emerald-200 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-400">
          {item.citations} 引
        </Badge>
      )}
    </span>
  );
}

function renderProj(item: ProjectItem | string) {
  if (typeof item === "string") return <span>{item}</span>;
  const parts = [
    item.year && `[${item.year}]`,
    item.title,
    item.funder && `· ${item.funder}`,
    item.role && `· ${item.role}`,
  ].filter(Boolean);
  return <span>{parts.join(" ")}</span>;
}

// ────────── 主组件 ──────────

export default function TutorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [tutor, setTutor] = useState<TutorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTutorDetail(Number(id))
      .then((d) => {
        if (!cancelled) setTutor(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // ────────── 加载状态 ──────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p>加载导师信息中...</p>
      </div>
    );
  }

  if (error || !tutor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <AlertCircle className="h-10 w-10 text-rose-500 mb-3" />
        <p className="text-lg">{error || "导师信息不存在"}</p>
        <Link href="/info/tutors" className="mt-4">
          <Button variant="outline">返回导师库</Button>
        </Link>
      </div>
    );
  }

  // 根据 tier 决定模板
  const tier = tutor.crawl_tier || "tier3";
  const completeness = tutor.profile_completeness || 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 返回按钮 */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
        <Link href="/info/tutors">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            返回导师库
          </Button>
        </Link>
      </motion.div>

      {tier === "tier1" && <Tier1View tutor={tutor} />}
      {tier === "tier2" && <Tier2View tutor={tutor} />}
      {tier === "tier3" && <Tier3View tutor={tutor} />}

      {/* 数据完整度提示（始终展示） */}
      <div className="mt-8 text-center">
        <Badge variant="outline" className="text-xs">
          数据完整度 {completeness}/100
          {tutor.crawl_source && ` · 来源: ${tutor.crawl_source}`}
          {tutor.last_crawled_at && ` · 更新于 ${new Date(tutor.last_crawled_at).toLocaleDateString("zh-CN")}`}
        </Badge>
      </div>
    </div>
  );
}

// ============================================================
// Tier 1：完整画像
// ============================================================

function Tier1View({ tutor }: { tutor: TutorDetail }) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* 左侧 sticky 信息卡 */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        className="lg:col-span-1"
      >
        <div className="lg:sticky lg:top-24 space-y-6">
          <SidebarCard tutor={tutor} />
          {tutor.research_areas.length > 0 && (
            <ResearchAreasCard tutor={tutor} />
          )}
        </div>
      </motion.div>

      {/* 右侧主内容 */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
        className="lg:col-span-2 space-y-6"
      >
        {/* 学术指标条（OpenAlex 数据） */}
        {(typeof tutor.h_index === "number" || typeof tutor.citation_count === "number") && (
          <motion.div variants={fadeInUp}>
            <Card className="bg-gradient-to-br from-emerald-50/50 to-blue-50/50 dark:from-emerald-500/5 dark:to-blue-500/5">
              <CardContent className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                {typeof tutor.h_index === "number" && (
                  <div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{tutor.h_index}</div>
                    <div className="text-xs text-muted-foreground">h-指数</div>
                  </div>
                )}
                {typeof tutor.i10_index === "number" && tutor.i10_index > 0 && (
                  <div>
                    <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{tutor.i10_index}</div>
                    <div className="text-xs text-muted-foreground">i10-指数</div>
                  </div>
                )}
                {typeof tutor.citation_count === "number" && (
                  <div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {tutor.citation_count >= 1000 ? `${(tutor.citation_count / 1000).toFixed(1)}k` : tutor.citation_count}
                    </div>
                    <div className="text-xs text-muted-foreground">总被引</div>
                  </div>
                )}
                <div>
                  <div className="text-2xl font-bold">{tutor.paper_count}</div>
                  <div className="text-xs text-muted-foreground">论文数</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {tutor.biography && (
          <motion.div variants={fadeInUp}>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  个人简介
                </h2>
                <p className="text-sm leading-7 text-muted-foreground whitespace-pre-line">
                  {tutor.biography}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {(tutor.recruiting_info || tutor.recruiting_requirements) && (
          <motion.div variants={fadeInUp}>
            <Card className="border-green-200/50 bg-green-50/30 dark:border-green-500/30 dark:bg-green-500/5">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-green-600 dark:text-green-400" />
                  招生信息
                </h2>
                {tutor.recruiting_info && (
                  <p className="text-sm leading-7 text-muted-foreground whitespace-pre-line mb-3">
                    {tutor.recruiting_info}
                  </p>
                )}
                {tutor.recruiting_requirements && (
                  <div className="rounded-lg bg-white/50 dark:bg-black/20 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">招生要求</p>
                    <p className="text-sm leading-7 text-muted-foreground whitespace-pre-line">
                      {tutor.recruiting_requirements}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 研究主题 + 年度趋势（2 列） */}
        {(() => {
          const hasTopics = (tutor.topics?.length || 0) > 0;
          const hasYearly = (tutor.yearly_stats?.length || 0) > 0;
          if (!hasTopics && !hasYearly) return null;
          return (
            <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {hasTopics && <TopicsChart topics={tutor.topics!} />}
              {hasYearly && <YearlyTrend stats={tutor.yearly_stats!} />}
            </motion.div>
          );
        })()}

        {/* 论文列表（AMiner 风格） */}
        {(() => {
          // 优先：完整论文列表（C 阶段 OpenAlex）→ LLM 抽取的 publications → recent_papers（兼容）
          const fullPapers = tutor.papers || [];
          const llmPapers = tutor.publications || [];
          const recentPapers = tutor.recent_papers || [];
          // 选最长的列表
          let displayPapers: any[] = [];
          let source = "";
          if (fullPapers.length >= llmPapers.length && fullPapers.length > 0) {
            displayPapers = fullPapers;
            source = "OpenAlex";
          } else if (llmPapers.length > 0) {
            displayPapers = llmPapers;
            source = "教师主页";
          } else if (recentPapers.length > 0) {
            displayPapers = recentPapers;
            source = "OpenAlex";
          }
          if (displayPapers.length === 0) return null;
          return (
            <motion.div variants={fadeInUp}>
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    论文成果
                    {source && <Badge variant="outline" className="text-[10px]">来自 {source}</Badge>}
                  </h2>
                  <PapersList papers={displayPapers} initialDisplay={10} />
                </CardContent>
              </Card>
            </motion.div>
          );
        })()}

        {/* 主要合作者 */}
        {tutor.coauthors && tutor.coauthors.length > 0 && (
          <motion.div variants={fadeInUp}>
            <CoauthorsCard coauthors={tutor.coauthors} />
          </motion.div>
        )}

        {tutor.education.length > 0 && (
          <motion.div variants={fadeInUp}>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  教育经历
                </h2>
                <div className="space-y-2">
                  {tutor.education.map((edu, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-primary/40 shrink-0" />
                      {renderEdu(edu, i)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {tutor.experience.length > 0 && (
          <motion.div variants={fadeInUp}>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  工作经历
                </h2>
                <div className="space-y-2">
                  {tutor.experience.map((exp, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-primary/40 shrink-0" />
                      {renderExp(exp)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {tutor.projects.length > 0 && (
          <motion.div variants={fadeInUp}>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-primary" />
                  科研项目 <span className="text-sm font-normal text-muted-foreground">({tutor.projects.length})</span>
                </h2>
                <div className="space-y-2">
                  {tutor.projects.map((proj, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-primary/40 shrink-0" />
                      {renderProj(proj)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {tutor.awards.length > 0 && (
          <motion.div variants={fadeInUp}>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  获奖情况
                </h2>
                <div className="space-y-2">
                  {tutor.awards.map((award, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                      <span>{award}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 来源信息 */}
        <motion.div variants={fadeInUp}>
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                {tutor.source_url && tutor.source_url !== "#" && (
                  <span>
                    数据来源：
                    <a href={tutor.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                      {tutor.university_name}官网 <ExternalLink className="inline h-3 w-3" />
                    </a>
                  </span>
                )}
                {tutor.external_ids?.openalex_id && (
                  <span>
                    OpenAlex:
                    <a
                      href={`https://openalex.org/${tutor.external_ids.openalex_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline ml-1"
                    >
                      {tutor.external_ids.openalex_id} <ExternalLink className="inline h-3 w-3" />
                    </a>
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ============================================================
// Tier 2：基础卡片 + 凸显外链
// ============================================================

function Tier2View({ tutor }: { tutor: TutorDetail }) {
  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardContent className="p-8">
          {/* 头部 */}
          <div className="flex items-start gap-6 mb-6">
            <TutorAvatar
              src={tutor.avatar_url}
              alt={tutor.name}
              size={80}
              className="ring-2 ring-primary/20 ring-offset-2"
            />
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{tutor.name}</h1>
              <p className="mt-1 text-muted-foreground">{tutor.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {tutor.university_name} · {tutor.department_name}
              </p>
              <div className="mt-2 flex gap-2">
                <Badge
                  variant="outline"
                  className={
                    tutor.is_recruiting
                      ? "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400"
                      : "border-gray-200 bg-gray-50 text-gray-500"
                  }
                >
                  {tutor.is_recruiting ? <><CheckCircle2 className="mr-1 h-3 w-3" />招生中</> : <><XCircle className="mr-1 h-3 w-3" />暂不招生</>}
                </Badge>
                <FavoriteButton
                  type="tutor"
                  targetId={tutor.id}
                  title={tutor.name}
                  description={`${tutor.university_name} · ${tutor.department_name} · ${tutor.title}`}
                  size="sm"
                />
              </div>
            </div>
          </div>

          {/* 研究方向 */}
          {tutor.research_areas.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-medium text-muted-foreground mb-2">研究方向</p>
              <div className="flex flex-wrap gap-1.5">
                {tutor.research_areas.map((a, i) => (
                  <Badge key={i} variant="secondary" className="text-sm font-normal">{a}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* 联系方式 */}
          <div className="space-y-2 mb-5 text-sm">
            {tutor.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <a href={`mailto:${tutor.email}`} className="text-primary hover:underline">{tutor.email}</a>
              </div>
            )}
            {tutor.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                <span>{tutor.phone}</span>
              </div>
            )}
            {tutor.office_address && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4 shrink-0" />
                <span>{tutor.office_address}</span>
              </div>
            )}
          </div>

          {/* 提示 */}
          <div className="rounded-lg border-l-4 border-blue-400 bg-blue-50 dark:bg-blue-500/10 p-4 text-sm text-muted-foreground mb-5">
            <p className="font-medium text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              当前为基础信息卡片
            </p>
            <p>完整学术成果、招生要求等详细内容请访问导师个人主页。</p>
          </div>

          {/* 外链按钮 */}
          {tutor.homepage_url && (
            <a href={tutor.homepage_url} target="_blank" rel="noopener noreferrer" className="block">
              <Button size="lg" className="w-full gap-2 h-14 text-base">
                <Globe className="h-5 w-5" />
                访问 {tutor.name} 教师个人主页
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          )}

          {/* 数据来源 */}
          <p className="mt-4 text-xs text-muted-foreground text-center">
            数据来源：{tutor.university_name}{tutor.department_name}师资页
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Tier 3：占位 + 跳转院校官网
// ============================================================

function Tier3View({ tutor }: { tutor: TutorDetail }) {
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
            <User className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold">
            {tutor.name}
            <span className="ml-2 text-sm font-normal text-muted-foreground">（信息待完善）</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            {tutor.university_name} · {tutor.department_name}
          </p>
          {tutor.title && (
            <p className="mt-1 text-sm text-muted-foreground">{tutor.title}</p>
          )}

          <Separator className="my-6" />

          <p className="text-sm text-muted-foreground mb-4">
            🔗 暂未收录该导师的详细信息
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            我们会持续补充导师数据。或前往「AI 导师推荐」探索方向匹配的其他老师。
          </p>

          <div className="flex flex-col gap-3">
            {tutor.homepage_url && (
              <a href={tutor.homepage_url} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="w-full gap-2">
                  <Globe className="h-5 w-5" />
                  访问 {tutor.university_name}{tutor.department_name}师资页
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            )}
            <Link href="/ai/tutor-match">
              <Button variant="outline" size="lg" className="w-full gap-2">
                <Sparkles className="h-5 w-5" />
                AI 导师推荐
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Sidebar Card（Tier 1 用）
// ============================================================

function SidebarCard({ tutor }: { tutor: TutorDetail }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center">
          <TutorAvatar
            src={tutor.avatar_url}
            alt={tutor.name}
            size={96}
            className="ring-2 ring-primary/20 ring-offset-2 ring-offset-card shadow-md mb-4"
          />
          <h1 className="text-2xl font-bold">{tutor.name}</h1>
          <p className="mt-1 text-muted-foreground">{tutor.title}</p>
          <Badge
            className={`mt-2 ${
              tutor.is_recruiting
                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400"
                : "border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-500/30 dark:bg-gray-500/10 dark:text-gray-400"
            }`}
            variant="outline"
          >
            {tutor.is_recruiting ? <><CheckCircle2 className="mr-1 h-3 w-3" />正在招生</> : <><XCircle className="mr-1 h-3 w-3" />暂不招生</>}
          </Badge>
        </div>

        <Separator className="my-4" />

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate">{tutor.university_name} · {tutor.department_name}</span>
          </div>
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{tutor.province}{tutor.city && ` · ${tutor.city}`}</span>
          </div>
          {tutor.email && (
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              <a href={`mailto:${tutor.email}`} className="text-primary hover:underline truncate">{tutor.email}</a>
            </div>
          )}
          {tutor.phone && (
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" />
              <span>{tutor.phone}</span>
            </div>
          )}
          {tutor.office_address && (
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Building2 className="h-4 w-4 shrink-0" />
              <span>{tutor.office_address}</span>
            </div>
          )}
          {tutor.homepage_url && (
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Globe className="h-4 w-4 shrink-0" />
              <a href={tutor.homepage_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex items-center gap-1">
                个人主页
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold">{tutor.paper_count}</div>
            <div className="text-xs text-muted-foreground">论文</div>
          </div>
          <div>
            <div className="text-lg font-bold">{tutor.project_count}</div>
            <div className="text-xs text-muted-foreground">项目</div>
          </div>
          <div>
            <div className="text-lg font-bold">{tutor.view_count}</div>
            <div className="text-xs text-muted-foreground">浏览</div>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex gap-2">
          <FavoriteButton
            type="tutor"
            targetId={tutor.id}
            title={tutor.name}
            description={`${tutor.university_name} · ${tutor.department_name} · ${tutor.title}`}
            extra={{ university: tutor.university_name }}
            showText
            className="flex-1"
          />
          {tutor.email && (
            <a href={`mailto:${tutor.email}`} className="flex-1">
              <Button variant="outline" className="w-full gap-1.5">
                <Mail className="h-4 w-4" />
                发邮件
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Research Areas Card
// ============================================================

function ResearchAreasCard({ tutor }: { tutor: TutorDetail }) {
  const colorSets = [
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
    "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30",
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
    "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
    "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30",
  ];
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" />
          研究方向
        </h3>
        <div className="flex flex-wrap gap-2">
          {tutor.research_areas.map((area, i) => (
            <Badge
              key={area}
              variant="outline"
              className={`text-sm px-3 py-1 font-medium border ${colorSets[i % colorSets.length]} transition-transform hover:scale-105`}
            >
              {area}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
