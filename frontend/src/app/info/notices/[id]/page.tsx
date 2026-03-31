import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  GraduationCap,
  Users,
  MapPin,
  ExternalLink,
  Share2,
  Clock,
  Mail,
  Eye,
  Star,
  PlayCircle,
  FileText,
  AlertCircle,
  ChevronRight,
  BookmarkPlus,
} from "lucide-react";
import { mockNoticeDetail } from "@/lib/mock-data";
import type { NoticeStatus } from "@/types/notice";

/** 状态配色 */
const statusConfig: Record<NoticeStatus, { bg: string; text: string; label: string; dot: string }> = {
  registering: { bg: "bg-blue-50", text: "text-blue-700", label: "报名中", dot: "bg-blue-500" },
  in_progress: { bg: "bg-emerald-50", text: "text-emerald-700", label: "进行中", dot: "bg-emerald-500" },
  not_started: { bg: "bg-slate-50", text: "text-slate-600", label: "未开始", dot: "bg-slate-400" },
  ended: { bg: "bg-gray-50", text: "text-gray-500", label: "已结束", dot: "bg-gray-400" },
};

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const notice = { ...mockNoticeDetail, id: Number(id) };
  const statusInfo = statusConfig[notice.status] || statusConfig.registering;

  const daysLeft = notice.registration_end
    ? Math.max(0, Math.ceil((new Date(notice.registration_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 面包屑 */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">首页</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/info/notices">保研信息</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{notice.university_name} · {notice.department_name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* ========== 顶部信息卡片 ========== */}
      <Card className="mt-6 overflow-hidden border-0 shadow-lg shadow-black/[0.04]">
        {/* 顶部彩色条 */}
        <div className="h-1.5 bg-gradient-to-r from-primary via-blue-400 to-cyan-400" />
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* 左侧：核心信息 */}
            <div className="flex-1 min-w-0">
              {/* 标题 */}
              <h1 className="text-xl font-bold leading-snug tracking-tight sm:text-2xl">
                【{notice.university_name}】——{notice.department_name}
              </h1>

              {/* 时间信息 */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-muted-foreground">
                {notice.registration_start && notice.registration_end && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 shrink-0 text-primary/70" />
                    <span>报名：{notice.registration_start} ~ {notice.registration_end}</span>
                  </div>
                )}
                {notice.camp_start && notice.camp_end && (
                  <div className="flex items-center gap-1.5">
                    <PlayCircle className="h-4 w-4 shrink-0 text-primary/70" />
                    <span>活动：{notice.camp_start} ~ {notice.camp_end}</span>
                  </div>
                )}
              </div>

              {/* 标签行 */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {/* 状态标签 */}
                <Badge className={`${statusInfo.bg} ${statusInfo.text} border-0 px-3`}>
                  <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${statusInfo.dot} inline-block animate-pulse`} />
                  {statusInfo.label}
                </Badge>

                {notice.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs font-normal">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* 统计信息 */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  <span>{notice.view_count} 次浏览</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5" />
                  <span>{notice.intent_count} 人意向申请</span>
                </div>
                {notice.application_rule !== "未知" && (
                  <div className="flex items-center gap-1.5">
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span>{notice.application_rule}</span>
                  </div>
                )}
              </div>

              {/* 快捷链接 + 操作按钮 */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {notice.registration_url && (
                  <a href={notice.registration_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" />
                      点击报名
                    </Button>
                  </a>
                )}
                {notice.official_url && (
                  <a href={notice.official_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" />
                      官方页面
                    </Button>
                  </a>
                )}
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                  <BookmarkPlus className="h-3.5 w-3.5" />
                  收藏
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                  <Share2 className="h-3.5 w-3.5" />
                  分享
                </Button>
              </div>
            </div>

            {/* 右侧：倒计时 + 往届数据 */}
            <div className="flex flex-row lg:flex-col items-stretch gap-3 shrink-0 lg:w-[150px]">
              {/* 倒计时卡片 */}
              {daysLeft !== null && notice.status === "registering" && (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-blue-200 bg-gradient-to-b from-blue-50 to-white px-5 py-5 flex-1 lg:flex-initial shadow-sm">
                  <div className="text-xs text-blue-500 font-semibold tracking-wide">距报名截止</div>
                  <div className="text-4xl font-bold text-blue-600 leading-tight mt-1.5 tabular-nums">
                    {daysLeft}
                  </div>
                  <div className="text-sm text-blue-500 font-medium">天</div>
                </div>
              )}

              {/* 往届招生数据 */}
              {notice.prev_year_quota && (
                <div className="flex flex-col items-center justify-center rounded-xl border bg-muted/30 px-5 py-4 flex-1 lg:flex-initial">
                  <div className="text-xs text-muted-foreground">往届招生</div>
                  <div className="text-2xl font-bold text-foreground leading-tight mt-1">
                    {notice.prev_year_quota}
                  </div>
                  <div className="text-sm text-muted-foreground">人</div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 提示 */}
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <AlertCircle className="h-3.5 w-3.5" />
        <span>具体时间以官方通知为准</span>
      </div>

      {/* ========== 详细内容区 ========== */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* 左侧：信息摘要卡片 (sticky) */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <div className="sticky top-24 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-1 w-4 rounded-full bg-primary" />
                  通知概要
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3.5 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">院校</div>
                      <div className="text-muted-foreground">{notice.university_name} · {notice.province}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">目标学位</div>
                      <div className="text-muted-foreground">{notice.target_degree}</div>
                    </div>
                  </div>

                  {notice.quota && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">招生名额</div>
                        <div className="text-muted-foreground">{notice.quota} 人</div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">学科方向</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {notice.disciplines.map((d) => (
                          <Badge key={d} variant="secondary" className="text-xs font-normal">
                            {d}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {notice.contact && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">联系方式</div>
                        <div className="text-muted-foreground whitespace-pre-line text-xs mt-0.5">
                          {notice.contact}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex gap-2">
                  {notice.registration_url && (
                    <a
                      href={notice.registration_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button className="w-full" size="sm">
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        立即报名
                      </Button>
                    </a>
                  )}
                  {notice.official_url && (
                    <a
                      href={notice.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button variant="outline" className="w-full" size="sm">
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        官方页面
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 右侧：详细内容 */}
        <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
          {/* 通知标题 */}
          <div>
          <h2 className="text-xl font-bold leading-tight tracking-tight sm:text-2xl">
              {notice.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              发布于 {notice.publish_date}
            </p>
          </div>

          {/* 摘要 */}
          <Card className="border-l-4 border-l-primary/30 bg-gradient-to-r from-primary/[0.03] to-transparent">
            <CardContent className="p-5">
              <p className="text-muted-foreground leading-relaxed text-[0.9375rem]">{notice.summary}</p>
            </CardContent>
          </Card>

          {/* 申请条件 */}
          {notice.requirements && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  申请条件
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-line text-sm leading-7">
                  {notice.requirements}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 原文内容 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                通知原文
              </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="whitespace-pre-line text-sm leading-7">
                  {notice.raw_content}
                </div>
            </CardContent>
          </Card>

          {/* 来源信息 */}
          <Card className="bg-muted/20 border-dashed">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 shrink-0" />
                <span>原文链接：</span>
                <a
                  href={notice.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate max-w-xs"
                >
                  {notice.source_url}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                <span>收录时间：{new Date(notice.created_at).toLocaleString("zh-CN")}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
