import Link from "next/link";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  MapPin,
  ExternalLink,
  FileText,
  GraduationCap,
} from "lucide-react";
import InfoCard from "@/components/common/InfoCard";
import { mockSchoolDetail, mockNotices } from "@/lib/mock-data";

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const school = { ...mockSchoolDetail, id: Number(id) };

  // 该院校下的通知（Mock）
  const schoolNotices = mockNotices.filter(
    (n) => n.university_name === school.name
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">首页</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/info/schools">院校库</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{school.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 院校头部信息 */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/5 text-primary">
          <Building2 className="h-10 w-10" />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold sm:text-3xl">{school.name}</h1>
            <Badge>{school.level}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {school.province} · {school.city}
            </div>
            <div className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              {school.department_count} 个学院
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {school.notice_count} 条通知
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <a
              href={school.homepage_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              官网
            </a>
            <a
              href={school.graduate_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              研究生院
            </a>
          </div>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Tabs */}
      <Tabs defaultValue="departments" className="w-full">
        <TabsList>
          <TabsTrigger value="departments">学院列表</TabsTrigger>
          <TabsTrigger value="notices">最新通知</TabsTrigger>
          <TabsTrigger value="about">院校简介</TabsTrigger>
        </TabsList>

        {/* 学院列表 */}
        <TabsContent value="departments" className="mt-6">
          <div className="grid gap-3">
            {school.departments.map((dept) => (
              <Card key={dept.id} className="transition-colors hover:border-primary/20">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">{dept.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {dept.discipline_category}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {dept.notice_count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {dept.notice_count} 条通知
                      </Badge>
                    )}
                    <a
                      href={dept.homepage_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 最新通知 */}
        <TabsContent value="notices" className="mt-6">
          {schoolNotices.length > 0 ? (
            <div className="space-y-4">
              {schoolNotices.map((notice) => (
                <InfoCard
                  key={notice.id}
                  notice={notice}
                />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground">
              暂无该院校的推免通知
            </div>
          )}
        </TabsContent>

        {/* 院校简介 */}
        <TabsContent value="about" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <p className="leading-relaxed text-muted-foreground">
                {school.description || "暂无简介信息"}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
