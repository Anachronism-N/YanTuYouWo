import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Eye,
  Star,
  PlayCircle,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import CountdownBadge from "./CountdownBadge";
import type { NoticeItem, NoticeStatus } from "@/types/notice";

interface InfoCardProps {
  notice: NoticeItem;
}

/** 状态配色方案 */
const statusConfig: Record<NoticeStatus, { label: string; gradient: string; textColor: string; iconBg: string }> = {
  registering: { label: "报名中", gradient: "from-blue-500 to-blue-600", textColor: "text-white", iconBg: "bg-blue-400/30" },
  in_progress: { label: "进行中", gradient: "from-emerald-500 to-emerald-600", textColor: "text-white", iconBg: "bg-emerald-400/30" },
  not_started: { label: "未开始", gradient: "from-slate-400 to-slate-500", textColor: "text-white", iconBg: "bg-slate-300/30" },
  ended: { label: "已结束", gradient: "from-gray-300 to-gray-400", textColor: "text-gray-600", iconBg: "bg-gray-200/30" },
};

/** 通知类型配色 */
const typeColors: Record<string, string> = {
  "夏令营": "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30",
  "预推免": "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30",
  "宣讲会": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30",
  "入营名单": "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30",
  "科学营": "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/30",
  "学术论坛": "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30",
};

export default function InfoCard({ notice }: InfoCardProps) {
  const statusInfo = statusConfig[notice.status] || statusConfig.registering;

  return (
    <Link href={`/info/notices/${notice.id}`}>
      <div className="group relative flex rounded-xl border bg-card transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-0.5 overflow-hidden">
        {/* 左侧彩色指示条 */}
        <div className={`w-1 shrink-0 bg-gradient-to-b ${statusInfo.gradient}`} />

        {/* 主内容区 */}
        <div className="flex-1 p-5 pr-3 min-w-0">
          {/* 标题行 */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-bold leading-snug group-hover:text-primary transition-colors duration-200">
              <span className="text-foreground">【{notice.university_name}】</span>
              <span className="mx-1 text-muted-foreground/40">——</span>
              <span className="text-foreground/80">{notice.department_name}</span>
            </h3>
            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground/0 group-hover:text-primary/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 mt-0.5" />
          </div>

          {/* 副标题 */}
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-1">
            {notice.title}
          </p>

          {/* 时间信息 */}
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            {notice.registration_start && notice.registration_end && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                <span>报名：{notice.registration_start} ~ {notice.registration_end}</span>
              </div>
            )}
            {notice.camp_start && notice.camp_end && (
              <div className="flex items-center gap-1.5">
                <PlayCircle className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>活动：{notice.camp_start} ~ {notice.camp_end}</span>
              </div>
            )}
          </div>

          {/* 标签行 */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {notice.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className={`text-xs font-normal ${typeColors[tag] || "bg-gray-50 text-gray-600 border-gray-200"}`}
              >
                {tag}
              </Badge>
            ))}
          </div>

          {/* 底部统计行 */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground/70">
            <div className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              <span>{notice.view_count} 次浏览</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5" />
              <span>{notice.intent_count} 人意向</span>
            </div>
            {notice.application_rule !== "未知" && (
              <div className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5" />
                <span>{notice.application_rule}</span>
              </div>
            )}
          </div>
        </div>

        {/* 右侧状态区 */}
        <div className="flex flex-col items-center justify-between w-[100px] shrink-0 border-l bg-muted/5">
          {/* 状态标签 */}
          <div className={`flex items-center justify-center gap-1 px-3 py-2.5 text-sm font-semibold bg-gradient-to-r ${statusInfo.gradient} ${statusInfo.textColor} w-full`}>
            <span className="text-xs">●</span>
            <span>{statusInfo.label}</span>
          </div>

          {/* 倒计时 */}
          {notice.registration_end && notice.status === "registering" && (
            <div className="flex-1 flex items-center justify-center px-2">
              <CountdownBadge deadline={notice.registration_end} compact />
            </div>
          )}

          {/* 非报名中状态的占位 */}
          {(notice.status !== "registering" || !notice.registration_end) && (
            <div className="flex-1 flex items-center justify-center px-2 text-xs text-muted-foreground/60">
              {notice.status === "ended" ? "已结束" : notice.status === "not_started" ? "敬请期待" : "进行中"}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
