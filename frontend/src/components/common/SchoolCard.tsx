import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, FileText, Users, ExternalLink } from "lucide-react";
import type { SchoolItem } from "@/types/school";

interface SchoolCardProps {
  school: SchoolItem;
}

/** 学校层次配色 */
const levelColors: Record<string, string> = {
  "985": "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30",
  "211": "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30",
  "双一流": "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30",
};

export default function SchoolCard({ school }: SchoolCardProps) {
  return (
    <Link href={`/info/schools/${school.id}`}>
      <Card className="group transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-1 overflow-hidden">
        <CardContent className="p-4">
          {/* 第一行：图标 + 校名 + 标签 */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-blue-500/10 text-primary transition-transform group-hover:scale-105">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold tracking-tight truncate group-hover:text-primary transition-colors duration-200">
                  {school.name}
                </h3>
                <Badge variant="outline" className={`shrink-0 text-xs px-1.5 py-0 leading-4 ${levelColors[school.level] || ""}`}>
                  {school.level}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin className="h-3 w-3 text-primary/50 shrink-0" />
                <span className="truncate">{school.province} · {school.city}</span>
              </div>
            </div>
          </div>

          {/* 第二行：统计数据 */}
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground pt-2.5 border-t border-dashed">
            <div className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              <span>{school.department_count} 个学院</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>{school.notice_count} 条通知</span>
            </div>
            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="h-3 w-3 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
