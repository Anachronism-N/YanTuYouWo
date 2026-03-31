"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Building2, X, Filter, GraduationCap, Loader2 } from "lucide-react";
import SchoolCard from "@/components/common/SchoolCard";
import { getSchools } from "@/lib/api";
import type { SchoolItem } from "@/types/school";
import { SCHOOL_LEVEL_OPTIONS, PROVINCE_OPTIONS } from "@/lib/constants";

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export default function SchoolsPage() {
  const [keyword, setKeyword] = useState("");
  const [level, setLevel] = useState("");
  const [province, setProvince] = useState("");
  const [sort, setSort] = useState<"name" | "notice_count">("notice_count");

  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // 从后端 API 获取院校数据
  useEffect(() => {
    async function fetchSchools() {
      setLoading(true);
      try {
        const params: Record<string, string | number> = {
          sort,
          size: 100, // 院校数量不多，一次性加载
        };
        if (keyword) params.keyword = keyword;
        if (level) params.level = level;
        if (province) params.province = province;

        const res = await getSchools(params as any);
        setSchools(res.items);
        setTotal(res.total);
      } catch {
        setSchools([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }
    fetchSchools();
  }, [keyword, level, province, sort]);

  // 防抖搜索
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const activeFilterCount = [level, province].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">首页</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>院校库</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 页面标题 */}
      <div className="mt-6 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <GraduationCap className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">院校库</h1>
        </div>
        <p className="text-muted-foreground">
          985/211/双一流院校信息，了解目标院校详情
        </p>
      </div>

      {/* 搜索栏 */}
      <div className="mb-5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索学校名称、城市..."
            className="h-11 pl-10 pr-10 rounded-xl"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* 筛选区 */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
            <Filter className="h-3.5 w-3.5" />
            <span>筛选</span>
          </div>

          <select
            className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors w-[130px]"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="">全部层次</option>
            {SCHOOL_LEVEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors w-[120px]"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
          >
            <option value="">全部地区</option>
            {PROVINCE_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <div className="h-4 w-px bg-border mx-1" />

          {/* 排序 */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">排序</span>
            <button
              onClick={() => setSort("notice_count")}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                sort === "notice_count"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              通知数
            </button>
            <button
              onClick={() => setSort("name")}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                sort === "name"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              名称
            </button>
          </div>

          {/* 已选标签 */}
          {activeFilterCount > 0 && (
            <>
              <div className="h-4 w-px bg-border mx-1" />
              {level && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  {SCHOOL_LEVEL_OPTIONS.find((o) => o.value === level)?.label || level}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setLevel("")} />
                </Badge>
              )}
              {province && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  {province}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setProvince("")} />
                </Badge>
              )}
              <button
                onClick={() => { setLevel(""); setProvince(""); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                清除
              </button>
            </>
          )}
        </div>
      </div>

      {/* 结果统计 */}
      <div className="mb-4 text-sm text-muted-foreground">
        共 <span className="font-medium text-foreground">{total}</span> 所院校
      </div>

      {/* 院校网格 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">加载中...</span>
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {schools.map((school) => (
            <motion.div key={school.id} variants={fadeInUp}>
              <SchoolCard school={school} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {!loading && schools.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Building2 className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">暂无符合条件的院校</p>
          <p className="mt-1 text-sm">试试调整筛选条件或搜索关键词</p>
          {(keyword || activeFilterCount > 0) && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => { setSearchInput(""); setKeyword(""); setLevel(""); setProvince(""); }}
            >
              清除筛选条件
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
