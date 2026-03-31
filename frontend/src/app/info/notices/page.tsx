"use client";

import { Suspense, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, List } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import FilterPanel from "@/components/common/FilterPanel";
import InfoCard from "@/components/common/InfoCard";
import CompactInfoCard from "@/components/common/CompactInfoCard";
import Pagination from "@/components/common/Pagination";
import { NoticeListSkeleton } from "@/components/common/LoadingSkeleton";
import { mockNotices } from "@/lib/mock-data";
import { useFilterStore, type FilterValues } from "@/stores/useFilterStore";

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

/** 将筛选条件序列化为 URL query string */
function filtersToParams(filters: FilterValues, page: number, viewMode: string): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== "latest" && key !== "sort") {
      params.set(key, value);
    }
    // sort 只在非默认值时写入
    if (key === "sort" && value && value !== "latest") {
      params.set(key, value);
    }
  });
  if (page > 1) params.set("page", String(page));
  if (viewMode !== "card") params.set("view", viewMode);
  return params.toString();
}

/** 默认导出：用 Suspense 包裹以支持 useSearchParams */
export default function NoticesPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <NoticeListSkeleton count={5} />
      </div>
    }>
      <NoticesContent />
    </Suspense>
  );
}

function NoticesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    filters,
    page,
    pageSize,
    viewMode,
    setFilters,
    setPage,
    setViewMode,
    initFromParams,
  } = useFilterStore();

  // 从 URL 参数初始化 Store（仅首次加载）
  useEffect(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    if (Object.keys(params).length > 0) {
      initFromParams(params);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 筛选条件变化时同步到 URL
  const syncUrl = useCallback(
    (newFilters: FilterValues, newPage: number, newViewMode: string) => {
      const queryString = filtersToParams(newFilters, newPage, newViewMode);
      const newUrl = queryString ? `?${queryString}` : "";
      // 使用 replace 避免产生大量历史记录
      router.replace(`/info/notices${newUrl}`, { scroll: false });
    },
    [router]
  );

  // 监听 store 变化，同步 URL
  useEffect(() => {
    syncUrl(filters, page, viewMode);
  }, [filters, page, viewMode, syncUrl]);

  // 前端筛选 + 排序（后端就绪后改为 API 调用）
  const filteredNotices = useMemo(() => {
    let result = mockNotices
      .filter((n) => {
        if (filters.keyword) {
          const kw = filters.keyword.toLowerCase();
          return (
            n.title.toLowerCase().includes(kw) ||
            n.university_name.toLowerCase().includes(kw) ||
            n.department_name.toLowerCase().includes(kw) ||
            n.disciplines.some((d) => d.toLowerCase().includes(kw)) ||
            n.tags.some((t) => t.toLowerCase().includes(kw))
          );
        }
        return true;
      })
      .filter((n) => !filters.program_type || n.program_type_key === filters.program_type)
      .filter((n) => !filters.school_level || n.school_level === filters.school_level)
      .filter((n) => !filters.province || n.province === filters.province)
      .filter((n) => !filters.university || n.university_name === filters.university)
      .filter((n) => !filters.discipline || n.disciplines.some((d) => d.includes(filters.discipline)))
      .filter((n) => !filters.major || n.disciplines.some((d) => d.includes(filters.major)))
      .filter((n) => !filters.status || n.status === filters.status);

    // 排序
    if (filters.sort === "deadline") {
      result = [...result].sort((a, b) => {
        if (!a.registration_end) return 1;
        if (!b.registration_end) return -1;
        return new Date(a.registration_end).getTime() - new Date(b.registration_end).getTime();
      });
    } else if (filters.sort === "hot") {
      result = [...result].sort((a, b) => b.view_count - a.view_count);
    } else {
      // 默认按发布日期倒序
      result = [...result].sort((a, b) =>
        new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime()
      );
    }

    return result;
  }, [filters]);

  // 分页计算
  const totalResults = filteredNotices.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const paginatedNotices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredNotices.slice(start, start + pageSize);
  }, [filteredNotices, page, pageSize]);

  // 处理筛选变化
  const handleFiltersChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
  };

  // 处理页码变化
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // 滚动到列表顶部
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
            <BreadcrumbPage>保研信息</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 页面标题 + 视图切换 */}
      <div className="mt-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            保研信息聚合
          </h1>
          <p className="mt-1.5 text-muted-foreground">
            全国高校夏令营、预推免、宣讲会等招生信息，实时更新
          </p>
        </div>

        {/* 视图切换按钮 */}
        <div className="hidden sm:flex items-center gap-1 rounded-lg border p-1 bg-muted/30">
          <Button
            variant={viewMode === "card" ? "default" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setViewMode("card")}
            title="卡片视图"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "compact" ? "default" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setViewMode("compact")}
            title="紧凑列表"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 筛选面板 */}
      <div className="mt-6">
        <FilterPanel
          values={filters}
          onChange={handleFiltersChange}
          totalResults={totalResults}
        />
      </div>

      {/* 通知列表 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${viewMode}-${page}`}
          initial="hidden"
          animate="visible"
          exit={{ opacity: 0 }}
          variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
          className={`mt-6 ${viewMode === "compact" ? "space-y-2" : "space-y-4"}`}
        >
          {paginatedNotices.length > 0 ? (
            paginatedNotices.map((notice) => (
              <motion.div key={notice.id} variants={fadeInUp}>
                {viewMode === "compact" ? (
                  <CompactInfoCard notice={notice} />
                ) : (
                  <InfoCard notice={notice} />
                )}
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-20 text-center"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <span className="text-2xl">🔍</span>
              </div>
              <p className="text-lg font-medium text-muted-foreground">暂无符合条件的通知</p>
              <p className="mt-2 text-sm text-muted-foreground">
                试试调整筛选条件或搜索关键词
              </p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
          <p className="text-xs text-muted-foreground">
            第 {page} / {totalPages} 页，共 {totalResults} 条结果
          </p>
        </div>
      )}
    </div>
  );
}
