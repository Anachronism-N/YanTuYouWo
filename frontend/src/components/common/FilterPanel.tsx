"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SCHOOL_LEVEL_OPTIONS,
  NOTICE_TYPE_OPTIONS,
  NOTICE_STATUS_OPTIONS,
  NOTICE_SORT_OPTIONS,
  PROVINCE_OPTIONS,
  DISCIPLINE_OPTIONS,
  MAJOR_OPTIONS,
  UNIVERSITY_OPTIONS,
} from "@/lib/constants";
import { useState } from "react";
import { type FilterValues, defaultFilterValues } from "@/stores/useFilterStore";

// 重新导出类型，保持向后兼容
export type { FilterValues };
export { defaultFilterValues };

interface FilterPanelProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  totalResults?: number;
}

/** 筛选标签的中文映射 */
const filterLabelMap: Record<string, string> = {
  school_level: "学校层次",
  province: "省份",
  university: "学校",
  discipline: "学科",
  major: "专业",
  program_type: "类型",
  status: "状态",
};

/** 获取筛选值的显示文本 */
function getFilterDisplayText(key: string, value: string): string {
  switch (key) {
    case "school_level":
      return SCHOOL_LEVEL_OPTIONS.find((o) => o.value === value)?.label || value;
    case "program_type":
      return NOTICE_TYPE_OPTIONS.find((o) => o.value === value)?.label || value;
    case "status":
      return NOTICE_STATUS_OPTIONS.find((o) => o.value === value)?.label || value;
    default:
      return value;
  }
}

/** 通用筛选下拉组件 - 使用 key 强制重新挂载来避免 uncontrolled→controlled 问题 */
function FilterSelect({
  value,
  onValueChange,
  placeholder,
  allLabel,
  options,
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  allLabel: string;
  options: readonly { value: string; label: string }[] | readonly string[];
}) {
  // 当 value 为空时，使用 key 强制重新挂载 Select，确保始终是 uncontrolled 状态
  // 当 value 有值时，传入 value 使其成为 controlled 状态
  const hasValue = value !== "";

  return (
    <Select
      key={hasValue ? "controlled" : `uncontrolled-${placeholder}`}
      value={hasValue ? value : undefined}
      defaultValue={undefined}
      onValueChange={(v) => onValueChange(v ?? "")}
    >
      <SelectTrigger className="h-9 text-sm w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">{allLabel}</SelectItem>
        {options.map((opt) => {
          const val = typeof opt === "string" ? opt : opt.value;
          const label = typeof opt === "string" ? opt : opt.label;
          return (
            <SelectItem key={val} value={val}>
              {label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export default function FilterPanel({
  values,
  onChange,
  totalResults,
}: FilterPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const updateFilter = (key: keyof FilterValues, value: string) => {
    onChange({ ...values, [key]: value === "__all__" ? "" : value });
  };

  const clearFilter = (key: keyof FilterValues) => {
    onChange({ ...values, [key]: "" });
  };

  const clearAll = () => {
    onChange(defaultFilterValues);
  };

  const activeFilters = Object.entries(values).filter(
    ([key, val]) => val && key !== "keyword" && key !== "sort"
  );

  return (
    <div className="space-y-3">
      {/* 搜索 + 筛选按钮 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索学校、学院、专业、关键词..."
            className="pl-10 h-11 transition-shadow focus-visible:shadow-md focus-visible:shadow-primary/10"
            value={values.keyword}
            onChange={(e) => updateFilter("keyword", e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 h-11 gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="text-sm">筛选</span>
          {activeFilters.length > 0 && (
          <Badge className="ml-1 h-5 min-w-[20px] rounded-full px-1.5 text-xs animate-in zoom-in-50 duration-200">
              {activeFilters.length}
            </Badge>
          )}
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* 筛选面板 */}
      <AnimatePresence>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, height: "auto", marginTop: 12 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="overflow-hidden"
        >
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          {/* 第一行：类型 + 状态 + 层次 + 省份 */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
              <div className="h-1 w-3 rounded-full bg-primary/60" />
              基本筛选
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <FilterSelect
                value={values.program_type}
                onValueChange={(v) => updateFilter("program_type", v)}
                placeholder="通知类型"
                allLabel="全部类型"
                options={NOTICE_TYPE_OPTIONS.filter(o => o.value !== "all")}
              />
              <FilterSelect
                value={values.status}
                onValueChange={(v) => updateFilter("status", v)}
                placeholder="进行状态"
                allLabel="全部状态"
                options={NOTICE_STATUS_OPTIONS}
              />
              <FilterSelect
                value={values.school_level}
                onValueChange={(v) => updateFilter("school_level", v)}
                placeholder="学校层次"
                allLabel="全部层次"
                options={SCHOOL_LEVEL_OPTIONS}
              />
              <FilterSelect
                value={values.province}
                onValueChange={(v) => updateFilter("province", v)}
                placeholder="省份"
                allLabel="全部省份"
                options={PROVINCE_OPTIONS.map(p => ({ value: p, label: p }))}
              />
            </div>
          </div>

          {/* 第二行：学校 + 学科 + 专业 */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
              <div className="h-1 w-3 rounded-full bg-cyan-500/60" />
              学科专业
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <FilterSelect
                value={values.university}
                onValueChange={(v) => updateFilter("university", v)}
                placeholder="学校"
                allLabel="全部学校"
                options={UNIVERSITY_OPTIONS.map(u => ({ value: u, label: u }))}
              />
              <FilterSelect
                value={values.discipline}
                onValueChange={(v) => updateFilter("discipline", v)}
                placeholder="学科门类"
                allLabel="全部学科"
                options={DISCIPLINE_OPTIONS.map(d => ({ value: d, label: d }))}
              />
              <FilterSelect
                value={values.major}
                onValueChange={(v) => updateFilter("major", v)}
                placeholder="专业"
                allLabel="全部专业"
                options={MAJOR_OPTIONS.map(m => ({ value: m, label: m }))}
              />
            </div>
          </div>
        </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* 已选筛选标签 + 排序 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {activeFilters.map(([key, val]) => (
            <Badge
              key={key}
              variant="secondary"
              className="cursor-pointer gap-1 pr-1.5 hover:bg-destructive/10 hover:text-destructive transition-all duration-200 hover:scale-105"
              onClick={() => clearFilter(key as keyof FilterValues)}
            >
              <span className="text-muted-foreground text-xs">{filterLabelMap[key] || key}:</span>
              <span className="font-medium">{getFilterDisplayText(key, val)}</span>
              <X className="h-3 w-3 ml-0.5" />
            </Badge>
          ))}
          {activeFilters.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors ml-1"
            >
              清除全部
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm">
          {totalResults !== undefined && (
            <span className="text-muted-foreground">
              共 <span className="font-semibold text-foreground">{totalResults}</span> 条结果
            </span>
          )}
          <Select
            value={values.sort || "latest"}
            onValueChange={(v) => updateFilter("sort", v ?? "latest")}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOTICE_SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
