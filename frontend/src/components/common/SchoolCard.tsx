"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, FileText, Building2, ArrowUpRight } from "lucide-react";
import type { SchoolItem } from "@/types/school";
import { getSchoolLogoUrl } from "@/lib/school-logos";

const levelConfig: Record<string, { badge: string; gradient: string; ring: string }> = {
  "985": {
    badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30",
    gradient: "from-blue-500 to-blue-600",
    ring: "ring-blue-500/20",
  },
  "211": {
    badge: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/30",
    gradient: "from-violet-500 to-violet-600",
    ring: "ring-violet-500/20",
  },
  "双一流": {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30",
    gradient: "from-emerald-500 to-emerald-600",
    ring: "ring-emerald-500/20",
  },
};

export default function SchoolCard({ school }: { school: SchoolItem }) {
  const cfg = levelConfig[school.level] || levelConfig["双一流"];
  const logoUrl = getSchoolLogoUrl(school.name);
  const [logoError, setLogoError] = useState(false);

  return (
    <Link href={`/info/schools/${school.id}`}>
      <Card className={`group relative overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-1`}>
        <div className={`h-1 bg-gradient-to-r ${cfg.gradient}`} />

        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {logoUrl && !logoError ? (
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-gray-800 shadow-md ring-2 ${cfg.ring} overflow-hidden transition-transform group-hover:scale-105 p-1.5`}>
                <Image src={logoUrl} alt={school.name} width={36} height={36} className="h-full w-full object-contain" onError={() => setLogoError(true)} unoptimized />
              </div>
            ) : (
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${cfg.gradient} text-white text-base font-bold shadow-md ring-2 ${cfg.ring} transition-transform group-hover:scale-105`}>
                {school.name.charAt(0)}
              </div>
            )}

            <div className="flex-1 min-w-0">
              {/* 校名 + 层次 */}
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold truncate group-hover:text-primary transition-colors">
                  {school.name}
                </h3>
                <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 py-0 ${cfg.badge}`}>
                  {school.level}
                </Badge>
              </div>

              {/* 位置 */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{school.province} {school.city}</span>
              </div>
            </div>

            {/* Hover 箭头 */}
            <ArrowUpRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-primary/60 transition-all shrink-0 mt-0.5" />
          </div>

          {/* 统计信息 */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-muted/30 to-transparent px-2.5 py-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5 text-primary/60" />
              <span className="font-medium tabular-nums">{school.department_count}</span>
              <span className="text-muted-foreground">个学院</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-muted/30 to-transparent px-2.5 py-1.5 text-xs">
              <FileText className="h-3.5 w-3.5 text-primary/60" />
              <span className="font-medium tabular-nums">{school.notice_count}</span>
              <span className="text-muted-foreground">条通知</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
