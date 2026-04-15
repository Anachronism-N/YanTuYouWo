"use client";

import Link from "next/link";
import {
  User,
  MapPin,
  BookOpen,
  FlaskConical,
  Eye,
  CheckCircle2,
  XCircle,
  Lightbulb,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FavoriteButton from "@/components/common/FavoriteButton";
import { cn } from "@/lib/utils";
import type { TutorItem } from "@/types/tutor";

interface TutorCardProps {
  tutor: TutorItem;
}

export default function TutorCard({ tutor }: TutorCardProps) {
  return (
    <Link href={`/info/tutors/${tutor.id}`}>
      <Card className="group h-full transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 overflow-hidden">
          <CardContent className="p-5">
            {/* 顶部：头像 + 基本信息 */}
            <div className="flex items-start gap-4">
              {/* 头像 */}
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-blue-500/10 text-primary">
                {tutor.avatar_url ? (
                  <img
                    src={tutor.avatar_url}
                    alt={tutor.name}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-7 w-7" />
                )}
              </div>

              {/* 姓名 + 职称 + 学校 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold tracking-tight truncate">
                    {tutor.name}
                  </h3>
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
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tutor.research_areas.map((area) => (
                <Badge
                  key={area}
                  variant="secondary"
                  className="text-xs font-normal"
                >
                  {area}
                </Badge>
              ))}
            </div>

            {/* 招生信息 */}
            {tutor.recruiting_info && (
              <p className="mt-3 text-xs text-muted-foreground line-clamp-1 bg-muted/50 rounded-md px-2.5 py-1.5">
                <Lightbulb className="h-3 w-3 inline-block shrink-0" /> {tutor.recruiting_info}
              </p>
            )}

            {/* 底部统计 */}
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground/70 pt-3 border-t">
              <span className="flex items-center gap-1" title={`${tutor.province} · ${tutor.city}`}>
                <MapPin className="h-3 w-3" />
                {tutor.city}
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {tutor.paper_count} 篇
              </span>
              <span className="flex items-center gap-1">
                <FlaskConical className="h-3 w-3" />
                {tutor.project_count} 项目
              </span>
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
