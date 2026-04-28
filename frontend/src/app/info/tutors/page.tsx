"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search,
  X,
  Users,
  Filter,
  Sparkles,
  Loader2,
  TrendingUp,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import TutorCard from "@/components/common/TutorCard";
import Pagination from "@/components/common/Pagination";
import { getTutors, getTutorStats, type TutorStats } from "@/lib/api";
import type { TutorItem, TutorListResponse, TutorQueryParams } from "@/types/tutor";
import {
  DISCIPLINE_OPTIONS,
  PROVINCE_OPTIONS,
} from "@/lib/constants";

const SORT_OPTIONS = [
  { value: "completeness", label: "完整度" },
  { value: "view_count", label: "热度" },
  { value: "paper_count", label: "论文数" },
  { value: "name", label: "姓名" },
] as const;

const RECRUITING_OPTIONS = [
  { value: "", label: "全部" },
  { value: "true", label: "招生中" },
  { value: "false", label: "暂不招生" },
] as const;

const TIER_OPTIONS = [
  { value: "", label: "全部数据" },
  { value: "tier1", label: "完整画像" },
  { value: "tier2", label: "基础信息" },
  { value: "tier3", label: "仅外链" },
] as const;

const PAGE_SIZE = 12;

export default function TutorsPage() {
  // 筛选状态
  const [keyword, setKeyword] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [university, setUniversity] = useState("");
  const [department, setDepartment] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [province, setProvince] = useState("");
  const [recruiting, setRecruiting] = useState("");
  const [tier, setTier] = useState("");
  const [sort, setSort] = useState<string>("completeness");
  const [page, setPage] = useState(1);

  // 数据状态
  const [data, setData] = useState<TutorListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 统计数据（一次性加载，用于动态填充下拉菜单）
  const [stats, setStats] = useState<TutorStats | null>(null);
  useEffect(() => {
    getTutorStats()
      .then(setStats)
      .catch(() => {
        /* 静默失败，stats 不影响主流程 */
      });
  }, []);

  // 防抖搜索
  useEffect(() => {
    const t = setTimeout(() => {
      setKeyword(keywordInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [keywordInput]);

  // API 拉数据
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params: TutorQueryParams = {
      page,
      size: PAGE_SIZE,
      sort: sort as TutorQueryParams["sort"],
    };
    if (keyword) params.keyword = keyword;
    if (university) params.university = university;
    // 学院、tier 不在 TutorQueryParams 里，但后端支持，这里直接传
    const extraParams: Record<string, string> = {};
    if (department) extraParams.department = department;
    if (tier) extraParams.crawl_tier = tier;
    if (discipline) params.discipline = discipline;
    if (province) params.province = province;
    if (recruiting) params.is_recruiting = recruiting === "true";

    // 合并 extraParams 进入 params（避免 axios 类型限制）
    const fullParams = { ...params, ...extraParams };
    getTutors(fullParams as TutorQueryParams)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [keyword, university, department, discipline, province, recruiting, tier, sort, page]);

  const items: TutorItem[] = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const activeFiltersCount = useMemo(() => {
    return [keyword, university, department, discipline, province, recruiting, tier].filter(Boolean).length;
  }, [keyword, university, department, discipline, province, recruiting, tier]);

  function clearAll() {
    setKeyword("");
    setKeywordInput("");
    setUniversity("");
    setDepartment("");
    setDiscipline("");
    setProvince("");
    setRecruiting("");
    setTier("");
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 标题 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-blue-500/15 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">导师库</h1>
            <p className="text-sm text-muted-foreground">
              覆盖 39 所 985 高校真实师资数据，支持研究方向、学院、完整度多维筛选
            </p>
          </div>
        </div>
      </motion.div>

      {/* 统计概览（动态从 API） */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card className="bg-gradient-to-r from-primary/5 via-blue-500/5 to-emerald-500/5 border-primary/10">
            <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{stats.total}</div>
                <div className="text-xs text-muted-foreground">总收录</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                  <Sparkles className="h-5 w-5" />
                  {stats.tier_distribution["tier1"] || 0}
                </div>
                <div className="text-xs text-muted-foreground">完整画像</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1">
                  <Award className="h-5 w-5" />
                  {stats.data_quality.with_h_index}
                </div>
                <div className="text-xs text-muted-foreground">含 h-index</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                  <TrendingUp className="h-5 w-5" />
                  {stats.universities.length}
                </div>
                <div className="text-xs text-muted-foreground">已覆盖院校</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* 筛选区 */}
      <div className="mb-6 space-y-4">
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索导师姓名 / 学校 / 学院 / 职称..."
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            className="pl-10 h-11 rounded-xl"
          />
          {keywordInput && (
            <button
              onClick={() => setKeywordInput("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 筛选下拉行 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>筛选</span>
          </div>

          <select
            value={university}
            onChange={(e) => { setUniversity(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
          >
            <option value="">全部学校</option>
            {(stats?.universities || []).map((u) => (
              <option key={u.name} value={u.name}>
                {u.name} ({u.count})
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="学院（如 计算机）"
            value={department}
            onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border bg-background px-3 text-sm w-32 focus:ring-2 focus:ring-primary/20 outline-none"
          />

          <select
            value={discipline}
            onChange={(e) => { setDiscipline(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
          >
            <option value="">全部学科</option>
            {DISCIPLINE_OPTIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={province}
            onChange={(e) => { setProvince(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
          >
            <option value="">全部省份</option>
            {/* 优先用 stats 中已有数据的省份，没有 stats 时回退到全省份 */}
            {(stats?.provinces && stats.provinces.length > 0
              ? stats.provinces.map((p) => ({ name: p.name, label: `${p.name} (${p.count})` }))
              : PROVINCE_OPTIONS.map((p) => ({ name: p, label: p }))
            ).map((p) => (
              <option key={p.name} value={p.name}>{p.label}</option>
            ))}
          </select>

          <select
            value={recruiting}
            onChange={(e) => { setRecruiting(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
          >
            {RECRUITING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            value={tier}
            onChange={(e) => { setTier(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
          >
            {TIER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-xs gap-1 ml-auto"
            >
              <X className="h-3 w-3" />
              清除筛选 ({activeFiltersCount})
            </Button>
          )}
        </div>

        {/* 排序 */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">排序：</span>
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => { setSort(o.value); setPage(1); }}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                sort === o.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
          {!loading && (
            <span className="ml-auto text-xs text-muted-foreground">
              共 <strong className="text-foreground">{total}</strong> 位导师
              {tier && (
                <Badge variant="outline" className="ml-2 text-[10px]">
                  <Sparkles className="mr-0.5 h-2.5 w-2.5" />
                  {TIER_OPTIONS.find((o) => o.value === tier)?.label}
                </Badge>
              )}
            </span>
          )}
        </div>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-3" />
          <p className="text-sm">加载中...</p>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="text-center py-20 text-rose-600">
          <p>加载失败: {error}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            请确保后端服务运行在 http://localhost:8000
          </p>
        </div>
      )}

      {/* 空状态 */}
      {!loading && !error && items.length === 0 && (
        <div className="text-center py-20">
          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">没有匹配的导师</p>
          {activeFiltersCount > 0 && (
            <Button onClick={clearAll} variant="link" className="mt-2 text-sm">
              清除筛选条件
            </Button>
          )}
        </div>
      )}

      {/* 列表 */}
      {!loading && !error && items.length > 0 && (
        <>
          <motion.div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {items.map((tutor) => (
              <TutorCard key={tutor.id} tutor={tutor} />
            ))}
          </motion.div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
