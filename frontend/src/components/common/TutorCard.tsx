"use client";

import Link from "next/link";
import {
  MapPin,
  BookOpen,
  FlaskConical,
  Eye,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ExternalLink,
  Sparkles,
  Award,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FavoriteButton from "@/components/common/FavoriteButton";
import TutorAvatar from "@/components/common/TutorAvatar";
import { cn } from "@/lib/utils";
import type { TutorItem } from "@/types/tutor";

interface TutorCardProps {
  tutor: TutorItem;
}

/** 数据完整度徽章 */
function TierBadge({ tier, completeness }: { tier?: string; completeness?: number }) {
  if (tier === "tier1") {
    return (
      <Badge
        variant="outline"
        className="text-[10px] px-1.5 py-0 border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
        title={`完整画像 · ${completeness}/100`}
      >
        <Sparkles className="mr-0.5 h-2.5 w-2.5" />
        完整
      </Badge>
    );
  }
  if (tier === "tier2") {
    return (
      <Badge
        variant="outline"
        className="text-[10px] px-1.5 py-0 border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400"
        title={`基础信息 · ${completeness}/100`}
      >
        基础
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="text-[10px] px-1.5 py-0 border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-500/30 dark:bg-gray-500/10 dark:text-gray-400"
      title="仅外链"
    >
      <ExternalLink className="mr-0.5 h-2.5 w-2.5" />
      外链
    </Badge>
  );
}

export default function TutorCard({ tutor }: TutorCardProps) {
  const isTier3 = tutor.crawl_tier === "tier3" || (!tutor.homepage_url && tutor.crawl_tier !== "tier1");
  const hasHIndex = typeof tutor.h_index === "number" && tutor.h_index > 0;

  return (
    <Link href={`/info/tutors/${tutor.id}`}>
      <Card className="group h-full transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 overflow-hidden">
        <CardContent className="p-5">
          {/* 顶部：头像 + 基本信息 */}
          <div className="flex items-start gap-4">
            <TutorAvatar src={tutor.avatar_url} alt={tutor.name} size={56} />

            {/* 姓名 + 职称 + 学校 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-semibold tracking-tight truncate">
                  {tutor.name}
                </h3>
                <TierBadge tier={tutor.crawl_tier} completeness={tutor.profile_completeness} />
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 text-xs",
                    tutor.is_recruiting
                      ? "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400"
                      : "border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-500/30 dark:bg-gray-500/10 dark:text-gray-400"
                  )}
                >
                  {tutor.is_recruiting ? (
                    <><CheckCircle2 className="mr-1 h-3 w-3" />招生中</>
                  ) : (
                    <><XCircle className="mr-1 h-3 w-3" />暂不招生</>
                  )}
                </Badge>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground truncate">
                {tutor.title}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground truncate">
                {tutor.university_name} · {tutor.department_name}
              </p>
            </div>

            {/* 收藏按钮 */}
            <FavoriteButton
              type="tutor"
              targetId={tutor.id}
              title={tutor.name}
              description={`${tutor.university_name} · ${tutor.department_name} · ${tutor.title}`}
              extra={{ university: tutor.university_name, research: tutor.research_areas.join("、") }}
              size="sm"
              className="shrink-0 -mt-1 -mr-2"
            />
          </div>

          {/* 研究方向 */}
          {tutor.research_areas.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tutor.research_areas.slice(0, 5).map((area) => (
                <Badge key={area} variant="secondary" className="text-xs font-normal">
                  {area}
                </Badge>
              ))}
              {tutor.research_areas.length > 5 && (
                <span className="text-xs text-muted-foreground">+{tutor.research_areas.length - 5}</span>
              )}
            </div>
          )}

          {/* 招生信息 */}
          {tutor.recruiting_info && (
            <p className="mt-3 text-xs text-muted-foreground line-clamp-1 bg-muted/50 rounded-md px-2.5 py-1.5">
              <Lightbulb className="h-3 w-3 inline-block shrink-0" /> {tutor.recruiting_info}
            </p>
          )}

          {/* Tier 3 占位提示 */}
          {isTier3 && (
            <p className="mt-3 text-xs text-muted-foreground/70 italic">
              详细信息待完善，可访问院校师资页查看
            </p>
          )}

          {/* 底部统计 */}
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground/70 pt-3 border-t">
            <span className="flex items-center gap-1" title={`${tutor.province} · ${tutor.city}`}>
              <MapPin className="h-3 w-3" />
              {tutor.city || tutor.province}
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {tutor.paper_count} 篇
            </span>
            {hasHIndex ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400" title="OpenAlex h-指数">
                <Award className="h-3 w-3" />
                h{tutor.h_index}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <FlaskConical className="h-3 w-3" />
                {tutor.project_count} 项目
              </span>
            )}
            <span className="ml-auto flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {tutor.view_count >= 1000 ? `${(tutor.view_count / 1000).toFixed(1)}k` : tutor.view_count}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
