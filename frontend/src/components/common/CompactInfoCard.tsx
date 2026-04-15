import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Calendar, Eye, Star } from "lucide-react";
import type { NoticeItem, NoticeStatus } from "@/types/notice";

interface CompactInfoCardProps {
  notice: NoticeItem;
}

/** 状态配色 */
const statusDot: Record<NoticeStatus, string> = {
  registering: "bg-blue-500",
  in_progress: "bg-emerald-500",
  not_started: "bg-slate-400",
  ended: "bg-gray-300",
};

const statusLabel: Record<NoticeStatus, string> = {
  registering: "报名中",
  in_progress: "进行中",
  not_started: "未开始",
  ended: "已结束",
};

/** 通知类型配色 */
const typeColors: Record<string, string> = {
  "夏令营": "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30",
  "预推免": "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30",
  "招生简章": "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/30",
  "入营名单": "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30",
  "拟录取": "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30",
  "直博": "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30",
  "硕博连读": "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/30",
  "招生宣讲": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30",
  "宣讲会": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30",
};

export default function CompactInfoCard({ notice }: CompactInfoCardProps) {
  const daysLeft = notice.registration_end
    ? Math.max(0, Math.ceil((new Date(notice.registration_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <Link href={`/info/notices/${notice.id}`}>
      <div className="group flex items-center gap-4 rounded-lg border bg-card px-4 py-3 transition-all duration-200 hover:shadow-md hover:shadow-primary/5 hover:border-primary/20 hover:bg-primary/[0.01]">
        {/* 状态指示点 */}
        <div className="shrink-0">
          <div className={`h-2.5 w-2.5 rounded-full ${statusDot[notice.status]} ${notice.status === "registering" ? "animate-pulse" : ""}`} />
        </div>

        {/* 学校 + 学院 */}
        <div className="w-[200px] shrink-0 min-w-0 hidden sm:block">
          <div className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
            {notice.university_name}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {notice.department_name}
          </div>
        </div>

        {/* 标题 */}
        <div className="flex-1 min-w-0">
          {/* 移动端显示学校名 */}
          <div className="sm:hidden text-xs text-muted-foreground mb-0.5">
            {notice.university_name} · {notice.department_name}
          </div>
          <div className="text-sm truncate group-hover:text-primary transition-colors">
            {notice.title}
          </div>
        </div>

        {/* 类型标签 */}
        <div className="shrink-0 hidden md:block">
          <Badge
            variant="outline"
            className={`text-xs font-normal ${typeColors[notice.program_type] || "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/30"}`}
          >
            {notice.program_type}
          </Badge>
        </div>

        {/* 报名截止 */}
        <div className="shrink-0 w-[90px] text-right hidden lg:block">
          {notice.registration_end ? (
            <div className="text-xs text-muted-foreground">
              <div className="flex items-center justify-end gap-1">
                <Calendar className="h-3 w-3" />
                <span>{notice.registration_end}</span>
              </div>
              {notice.status === "registering" && daysLeft !== null && (
                <div className={`text-xs font-medium mt-0.5 ${daysLeft <= 7 ? "text-red-500" : "text-blue-500"}`}>
                  剩 {daysLeft} 天
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>

        {/* 统计 */}
        <div className="shrink-0 w-[100px] hidden xl:flex items-center gap-3 text-xs text-muted-foreground/70">
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span>{notice.view_count}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            <span>{notice.intent_count}</span>
          </div>
        </div>

        {/* 状态文字 */}
        <div className="shrink-0 w-[56px] text-right">
          <span className={`text-xs font-medium ${
            notice.status === "registering" ? "text-blue-600" :
            notice.status === "in_progress" ? "text-emerald-600" :
            notice.status === "ended" ? "text-gray-400" :
            "text-slate-500"
          }`}>
            {statusLabel[notice.status]}
          </span>
        </div>
      </div>
    </Link>
  );
}
