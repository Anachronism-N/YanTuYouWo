"use client";

import { use } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import FavoriteButton from "@/components/common/FavoriteButton";
import { mockTutorDetail, mockTutors } from "@/lib/mock-data";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function TutorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  // Mock：根据 ID 获取导师详情，这里简化处理
  const tutor = Number(id) === 1 ? mockTutorDetail : {
    ...mockTutorDetail,
    ...mockTutors.find((t) => t.id === Number(id)),
    biography: `该导师是${mockTutors.find((t) => t.id === Number(id))?.university_name || "某高校"}的优秀教师，在相关领域有丰富的研究经验和教学成果。`,
    education: ["博士学位", "硕士学位"],
    experience: ["现任教于相关院校"],
    publications: ["代表性论文若干"],
    projects: ["主持科研项目若干"],
    awards: ["获得学术奖励若干"],
    recruiting_requirements: mockTutors.find((t) => t.id === Number(id))?.recruiting_info || null,
    phone: null,
    office_address: null,
    source_url: "#",
    created_at: "2026-03-15T10:00:00Z",
  };

  if (!tutor) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">导师信息不存在</p>
      </div>
    );
  }

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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* ========== 左侧：导师信息卡片 ========== */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="lg:col-span-1"
        >
          <div className="lg:sticky lg:top-24 space-y-6">
            {/* 基本信息卡片 */}
            <Card>
              <CardContent className="p-6">
                {/* 头像 + 姓名 */}
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-blue-500/10 text-primary mb-4">
                    {tutor.avatar_url ? (
                      <img
                        src={tutor.avatar_url}
                        alt={tutor.name}
                        className="h-24 w-24 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-12 w-12" />
                    )}
                  </div>
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
                    {tutor.is_recruiting ? (
                      <><CheckCircle2 className="mr-1 h-3 w-3" />正在招生</>
                    ) : (
                      <><XCircle className="mr-1 h-3 w-3" />暂不招生</>
                    )}
                  </Badge>
                </div>

                <Separator className="my-4" />

                {/* 详细信息 */}
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span>{tutor.university_name} · {tutor.department_name}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{tutor.province} · {tutor.city}</span>
                  </div>
                  {tutor.email && (
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <Mail className="h-4 w-4 shrink-0" />
                      <a href={`mailto:${tutor.email}`} className="text-primary hover:underline truncate">
                        {tutor.email}
                      </a>
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
                      <a
                        href={tutor.homepage_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate flex items-center gap-1"
                      >
                        个人主页
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                {/* 统计 */}
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

                {/* 操作按钮 */}
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

            {/* 研究方向 */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  研究方向
                </h3>
                <div className="flex flex-wrap gap-2">
                  {tutor.research_areas.map((area, i) => {
                    const colorSets = [
                      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
                      "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30",
                      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
                      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
                      "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
                      "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30",
                    ];
                    return (
                      <Badge
                        key={area}
                        variant="outline"
                        className={`text-sm px-3 py-1 font-medium border ${colorSets[i % colorSets.length]} transition-transform hover:scale-105`}
                      >
                        {area}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* ========== 右侧：详细内容 ========== */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
          className="lg:col-span-2 space-y-6"
        >
          {/* 个人简介 */}
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

          {/* 招生信息 */}
          {tutor.recruiting_requirements && (
            <motion.div variants={fadeInUp}>
              <Card className="border-green-200/50 bg-green-50/30">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-green-600" />
                    招生要求
                  </h2>
                  <p className="text-sm leading-7 text-muted-foreground whitespace-pre-line">
                    {tutor.recruiting_requirements}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 教育经历 */}
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
                      <span>{edu}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 工作经历 */}
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
                      <span>{exp}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 代表性论文 */}
          <motion.div variants={fadeInUp}>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  代表性论文
                </h2>
                <div className="space-y-3">
                  {tutor.publications.map((pub, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="shrink-0 text-xs font-medium text-primary/60 mt-0.5">
                        [{i + 1}]
                      </span>
                      <span className="leading-relaxed">{pub}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 科研项目 */}
          <motion.div variants={fadeInUp}>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-primary" />
                  科研项目
                </h2>
                <div className="space-y-2">
                  {tutor.projects.map((proj, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-primary/40 shrink-0" />
                      <span>{proj}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 获奖情况 */}
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
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    数据来源：
                    <a
                      href={tutor.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline ml-1"
                    >
                      {tutor.university_name}官网
                    </a>
                  </span>
                  <span>
                    更新时间：{new Date(tutor.created_at).toLocaleDateString("zh-CN")}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
