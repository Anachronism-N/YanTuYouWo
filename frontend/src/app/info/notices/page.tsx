"use client";

import { Suspense, useEffect, useMemo, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, LayoutGrid, List, SearchX } from "lucide-react";
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
import { getNotices } from "@/lib/api";
import type { NoticeItem } from "@/types/notice";
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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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

  // API 数据状态
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);

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

  // 从后端 API 获取通知数据
  useEffect(() => {
    async function fetchNotices() {
      setLoading(true);
      try {
        const params: Record<string, string | number> = {
          page,
          size: pageSize,
        };
        if (filters.keyword) params.keyword = filters.keyword;
        if (filters.program_type) params.type = filters.program_type;
        if (filters.school_level) params.school_level = filters.school_level;
        if (filters.province) params.province = filters.province;
        if (filters.university) params.university = filters.university;
        if (filters.discipline) params.discipline = filters.discipline;
        if (filters.major) params.keyword = filters.major; // major 作为关键词搜索
        if (filters.status) params.status = filters.status;
        if (filters.sort) params.sort = filters.sort;

        const res = await getNotices(params as any);
        setNotices(res.items);
        setTotalResults(res.total);
      } catch {
        // API 不可用时显示空列表
        setNotices([]);
        setTotalResults(0);
      } finally {
        setLoading(false);
      }
    }
    fetchNotices();
  }, [filters, page, pageSize]);

  // 分页计算
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));

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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
      <div className="mt-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">保研信息聚合</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              全国高校夏令营、预推免、宣讲会等招生信息，实时更新
            </p>
          </div>
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
        {loading ? (
          <div className="mt-6">
            <NoticeListSkeleton count={5} />
          </div>
        ) : (
          <motion.div
            key={`${viewMode}-${page}`}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
            className={`mt-6 ${viewMode === "compact" ? "space-y-2" : "space-y-4"}`}
          >
            {notices.length > 0 ? (
              notices.map((notice) => (
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
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-violet-500/10">
                  <SearchX className="h-7 w-7 text-primary/60" />
                </div>
                <p className="text-lg font-semibold">暂无符合条件的通知</p>
                <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
                  试试调整筛选条件或搜索关键词，也可以清除所有筛选重新浏览
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
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
