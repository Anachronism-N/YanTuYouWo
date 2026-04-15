"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  X,
  Users,
  ChevronDown,
  ChevronRight,
  Building2,
  LayoutGrid,
  GraduationCap,
  Sparkles,
  Target,
  FlaskConical,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import TutorCard from "@/components/common/TutorCard";
import Pagination from "@/components/common/Pagination";
import { mockTutors } from "@/lib/mock-data";
import { useUserStore } from "@/stores/useUserStore";
import {
  DISCIPLINE_OPTIONS,
  UNIVERSITY_OPTIONS,
  PROVINCE_OPTIONS,
} from "@/lib/constants";

/** 排序选项 */
const SORT_OPTIONS = [
  { value: "view_count", label: "热度" },
  { value: "paper_count", label: "论文数" },
  { value: "name", label: "姓名" },
] as const;

/** 招生状态选项 */
const RECRUITING_OPTIONS = [
  { value: "", label: "全部" },
  { value: "true", label: "招生中" },
  { value: "false", label: "暂不招生" },
] as const;

/** 视图模式 */
type ViewMode = "grouped" | "research" | "all";

/** 学科门类 → 子学科方向映射 */
const DISCIPLINE_DIRECTIONS: Record<string, string[]> = {
  "工学": ["人工智能", "机器学习", "计算机视觉", "自然语言处理", "深度学习", "数据库系统", "大数据", "分布式计算", "机器人", "智能制造", "控制工程", "航天器设计", "轨道力学", "电力系统", "新能源", "智能电网"],
  "理学": ["凝聚态物理", "量子计算", "拓扑物理", "有机化学", "药物化学", "催化化学", "空间科学"],
  "经济学": ["宏观经济学", "金融经济学", "计量经济学"],
  "法学": ["民商法", "知识产权法", "国际私法"],
  "管理学": ["市场营销", "消费者行为", "数字营销"],
  "医学": ["肿瘤学", "精准医学", "免疫治疗"],
};

/** 研究方向颜色映射 */
const RESEARCH_COLORS: Record<string, string> = {
  "人工智能": "from-violet-500/10 to-purple-500/10 text-violet-700 dark:text-violet-400",
  "机器学习": "from-blue-500/10 to-indigo-500/10 text-blue-700 dark:text-blue-400",
  "自然语言处理": "from-cyan-500/10 to-teal-500/10 text-cyan-700 dark:text-cyan-400",
  "计算机视觉": "from-emerald-500/10 to-green-500/10 text-emerald-700 dark:text-emerald-400",
  "深度学习": "from-indigo-500/10 to-blue-500/10 text-indigo-700 dark:text-indigo-400",
  "数据库系统": "from-amber-500/10 to-orange-500/10 text-amber-700 dark:text-amber-400",
  "大数据": "from-orange-500/10 to-red-500/10 text-orange-700 dark:text-orange-400",
  "分布式计算": "from-rose-500/10 to-pink-500/10 text-rose-700 dark:text-rose-400",
  "宏观经济学": "from-teal-500/10 to-emerald-500/10 text-teal-700 dark:text-teal-400",
  "机器人": "from-sky-500/10 to-blue-500/10 text-sky-700 dark:text-sky-400",
  "凝聚态物理": "from-purple-500/10 to-violet-500/10 text-purple-700 dark:text-purple-400",
  "量子计算": "from-fuchsia-500/10 to-pink-500/10 text-fuchsia-700 dark:text-fuchsia-400",
  "有机化学": "from-lime-500/10 to-green-500/10 text-lime-700 dark:text-lime-400",
  "航天器设计": "from-slate-500/10 to-gray-500/10 text-slate-700 dark:text-slate-400",
  "民商法": "from-yellow-500/10 to-amber-500/10 text-yellow-700 dark:text-yellow-400",
  "市场营销": "from-pink-500/10 to-rose-500/10 text-pink-700 dark:text-pink-400",
  "肿瘤学": "from-red-500/10 to-rose-500/10 text-red-700 dark:text-red-400",
  "电力系统": "from-blue-500/10 to-cyan-500/10 text-blue-700 dark:text-blue-400",
};

const DEFAULT_RESEARCH_COLOR = "from-primary/10 to-blue-500/10 text-primary";

const PAGE_SIZE = 9;

export default function TutorsPage() {
  const { user, isLoggedIn } = useUserStore();
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState("view_count");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");

  // 全部视图筛选
  const [allUniversity, setAllUniversity] = useState("");
  const [allDiscipline, setAllDiscipline] = useState("");
  const [allProvince, setAllProvince] = useState("");
  const [allRecruiting, setAllRecruiting] = useState("");

  // 目标院校视图筛选
  const [groupedUniversity, setGroupedUniversity] = useState("");
  const [groupedDepartment, setGroupedDepartment] = useState("");
  const [groupedRecruiting, setGroupedRecruiting] = useState("");

  // 研究方向视图筛选
  const [researchDiscipline, setResearchDiscipline] = useState("");
  const [researchDirection, setResearchDirection] = useState("");

  // 用户的目标院校和研究兴趣
  const targetUniversities = user?.target_universities || [];
  const researchInterests = user?.research_interests || [];
  const hasTargets = targetUniversities.length > 0;
  const hasResearchInterests = researchInterests.length > 0;

  // 可用的研究方向（根据选中的学科门类）
  const availableDirections = useMemo(() => {
    if (!researchDiscipline) return [];
    return DISCIPLINE_DIRECTIONS[researchDiscipline] || [];
  }, [researchDiscipline]);

  // 全部视图 - 筛选逻辑
  const filteredTutors = useMemo(() => {
    let result = [...mockTutors];

    if (keyword) {
      const kw = keyword.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(kw) ||
          t.university_name.toLowerCase().includes(kw) ||
          t.department_name.toLowerCase().includes(kw) ||
          t.research_areas.some((a) => a.toLowerCase().includes(kw))
      );
    }
    if (allUniversity) {
      result = result.filter((t) => t.university_name === allUniversity);
    }
    if (allDiscipline) {
      result = result.filter((t) => t.discipline === allDiscipline);
    }
    if (allProvince) {
      result = result.filter((t) => t.province === allProvince);
    }
    if (allRecruiting === "true") {
      result = result.filter((t) => t.is_recruiting);
    } else if (allRecruiting === "false") {
      result = result.filter((t) => !t.is_recruiting);
    }

    result.sort((a, b) => {
      if (sort === "paper_count") return b.paper_count - a.paper_count;
      if (sort === "name") return a.name.localeCompare(b.name, "zh-CN");
      return b.view_count - a.view_count;
    });

    return result;
  }, [keyword, allUniversity, allDiscipline, allProvince, allRecruiting, sort]);

  // 目标院校视图 - 按学校分组
  const groupedTutors = useMemo(() => {
    // 如果有学校筛选，只显示该学校
    const uniList = groupedUniversity
      ? [{ university: groupedUniversity, departments: [] as string[] }]
      : hasTargets
        ? targetUniversities
        : [];

    return uniList.map((target) => {
      let tutors = mockTutors.filter(
        (t) => t.university_name === target.university
      );

      // 学院筛选
      if (groupedDepartment) {
        tutors = tutors.filter((t) =>
          t.department_name.includes(groupedDepartment) || groupedDepartment.includes(t.department_name)
        );
      } else if (target.departments.length > 0) {
        tutors = tutors.filter((t) =>
          target.departments.some((dept) =>
            t.department_name.includes(dept) || dept.includes(t.department_name)
          )
        );
      }

      // 招生状态筛选
      if (groupedRecruiting === "true") {
        tutors = tutors.filter((t) => t.is_recruiting);
      } else if (groupedRecruiting === "false") {
        tutors = tutors.filter((t) => !t.is_recruiting);
      }

      return {
        university: target.university,
        departments: target.departments,
        tutors,
      };
    });
  }, [targetUniversities, hasTargets, groupedUniversity, groupedDepartment, groupedRecruiting]);

  // 目标院校视图 - 可选学校列表（目标院校 + 全部学校）
  const groupedUniOptions = useMemo(() => {
    const targetNames = targetUniversities.map((t) => t.university);
    const otherNames = UNIVERSITY_OPTIONS.filter((u) => !targetNames.includes(u));
    return { targetNames, otherNames };
  }, [targetUniversities]);

  // 目标院校视图 - 可选学院列表
  const groupedDeptOptions = useMemo(() => {
    const selectedUni = groupedUniversity || "";
    if (!selectedUni) {
      // 返回所有目标院校的学院
      return targetUniversities.flatMap((t) => t.departments);
    }
    const target = targetUniversities.find((t) => t.university === selectedUni);
    if (target) return target.departments;
    // 非目标院校，从 mock 数据中提取学院
    const depts = new Set<string>();
    mockTutors.filter((t) => t.university_name === selectedUni).forEach((t) => depts.add(t.department_name));
    return Array.from(depts);
  }, [groupedUniversity, targetUniversities]);

  // 研究方向视图 - 按方向分组
  const researchGroupedTutors = useMemo(() => {
    const areaMap = new Map<string, typeof mockTutors>();
    const priorityAreas = new Set(researchInterests);

    let sourceTutors = [...mockTutors];

    // 学科门类筛选
    if (researchDiscipline) {
      sourceTutors = sourceTutors.filter((t) => t.discipline === researchDiscipline);
    }

    sourceTutors.forEach((tutor) => {
      tutor.research_areas.forEach((area) => {
        // 具体方向筛选
        if (researchDirection && area !== researchDirection) return;

        if (!areaMap.has(area)) {
          areaMap.set(area, []);
        }
        areaMap.get(area)!.push(tutor);
      });
    });

    const groups = Array.from(areaMap.entries()).map(([area, tutors]) => ({
      area,
      tutors: tutors.sort((a, b) => b.view_count - a.view_count),
      isInterested: priorityAreas.has(area),
    }));

    groups.sort((a, b) => {
      if (a.isInterested && !b.isInterested) return -1;
      if (!a.isInterested && b.isInterested) return 1;
      return b.tutors.length - a.tutors.length;
    });

    return groups;
  }, [researchInterests, researchDiscipline, researchDirection]);

  const totalPages = Math.ceil(filteredTutors.length / PAGE_SIZE);
  const paginatedTutors = filteredTutors.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  // 各视图的筛选条件数量
  const allFilterCount = [allUniversity, allDiscipline, allProvince, allRecruiting].filter(Boolean).length;
  const groupedFilterCount = [groupedUniversity, groupedDepartment, groupedRecruiting].filter(Boolean).length;
  const researchFilterCount = [researchDiscipline, researchDirection].filter(Boolean).length;

  const clearAllFilters = () => {
    setKeyword("");
    setAllUniversity(""); setAllDiscipline(""); setAllProvince(""); setAllRecruiting("");
    setGroupedUniversity(""); setGroupedDepartment(""); setGroupedRecruiting("");
    setResearchDiscipline(""); setResearchDirection("");
    setSort("view_count");
    setPage(1);
  };

  const switchView = (mode: ViewMode) => {
    setViewMode(mode);
    setKeyword("");
    setPage(1);
  };

  // 筛选条件下拉框样式
  const selectClass = "h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">导师库</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              搜索全国高校导师信息，了解研究方向与招生情况
            </p>
          </div>

          {/* 视图切换 */}
          <div className="flex items-center gap-1 rounded-xl border bg-muted/30 p-1 self-start sm:self-auto">
            <button
              onClick={() => switchView("grouped")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                viewMode === "grouped"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">按目标院校</span>
              <span className="sm:hidden">院校</span>
            </button>
            <button
              onClick={() => switchView("research")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                viewMode === "research"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">按研究方向</span>
              <span className="sm:hidden">方向</span>
            </button>
            <button
              onClick={() => switchView("all")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                viewMode === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">全部导师</span>
              <span className="sm:hidden">全部</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* ===== 搜索栏（所有视图共用） ===== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-5"
      >
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索导师姓名、学校、研究方向..."
            className="h-11 pl-10 pr-10 rounded-xl"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
          />
          {keyword && (
            <button
              onClick={() => { setKeyword(""); setPage(1); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </motion.div>

      {/* ===== 目标院校视图的筛选条目 ===== */}
      {viewMode === "grouped" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
              <Filter className="h-3.5 w-3.5" />
              <span>筛选</span>
            </div>

            {/* 学校 */}
            <select
              className={`${selectClass} w-[140px]`}
              value={groupedUniversity}
              onChange={(e) => { setGroupedUniversity(e.target.value); setGroupedDepartment(""); }}
            >
              <option value="">全部学校</option>
              {groupedUniOptions.targetNames.length > 0 && (
                <optgroup label="⭐ 我的目标院校">
                  {groupedUniOptions.targetNames.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="其他学校">
                {groupedUniOptions.otherNames.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </optgroup>
            </select>

            {/* 学院 */}
            <select
              className={`${selectClass} w-[160px]`}
              value={groupedDepartment}
              onChange={(e) => setGroupedDepartment(e.target.value)}
            >
              <option value="">全部学院</option>
              {groupedDeptOptions.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            {/* 招生状态 */}
            <select
              className={`${selectClass} w-[120px]`}
              value={groupedRecruiting}
              onChange={(e) => setGroupedRecruiting(e.target.value)}
            >
              <option value="">招生状态</option>
              <option value="true">招生中</option>
              <option value="false">暂不招生</option>
            </select>

            {/* 已选标签 */}
            {groupedFilterCount > 0 && (
              <>
                <div className="h-4 w-px bg-border mx-1" />
                {groupedUniversity && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {groupedUniversity}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => { setGroupedUniversity(""); setGroupedDepartment(""); }} />
                  </Badge>
                )}
                {groupedDepartment && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {groupedDepartment}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setGroupedDepartment("")} />
                  </Badge>
                )}
                {groupedRecruiting && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {groupedRecruiting === "true" ? "招生中" : "暂不招生"}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setGroupedRecruiting("")} />
                  </Badge>
                )}
                <button
                  onClick={() => { setGroupedUniversity(""); setGroupedDepartment(""); setGroupedRecruiting(""); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  清除
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* ===== 研究方向视图的筛选条目 ===== */}
      {viewMode === "research" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
              <Filter className="h-3.5 w-3.5" />
              <span>筛选</span>
            </div>

            {/* 学科门类 */}
            <select
              className={`${selectClass} w-[130px]`}
              value={researchDiscipline}
              onChange={(e) => { setResearchDiscipline(e.target.value); setResearchDirection(""); }}
            >
              <option value="">学科门类</option>
              {DISCIPLINE_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* 具体方向 */}
            <select
              className={`${selectClass} w-[150px]`}
              value={researchDirection}
              onChange={(e) => setResearchDirection(e.target.value)}
              disabled={!researchDiscipline}
            >
              <option value="">研究方向</option>
              {availableDirections.map((dir) => (
                <option key={dir} value={dir}>{dir}</option>
              ))}
            </select>

            {/* 已选标签 */}
            {researchFilterCount > 0 && (
              <>
                <div className="h-4 w-px bg-border mx-1" />
                {researchDiscipline && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {researchDiscipline}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => { setResearchDiscipline(""); setResearchDirection(""); }} />
                  </Badge>
                )}
                {researchDirection && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {researchDirection}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setResearchDirection("")} />
                  </Badge>
                )}
                <button
                  onClick={() => { setResearchDiscipline(""); setResearchDirection(""); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  清除
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* ===== 全部导师视图的筛选条目 ===== */}
      {viewMode === "all" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
              <Filter className="h-3.5 w-3.5" />
              <span>筛选</span>
            </div>

            {/* 学校 */}
            <select
              className={`${selectClass} w-[140px]`}
              value={allUniversity}
              onChange={(e) => { setAllUniversity(e.target.value); setPage(1); }}
            >
              <option value="">全部学校</option>
              {UNIVERSITY_OPTIONS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>

            {/* 学科 */}
            <select
              className={`${selectClass} w-[130px]`}
              value={allDiscipline}
              onChange={(e) => { setAllDiscipline(e.target.value); setPage(1); }}
            >
              <option value="">学科门类</option>
              {DISCIPLINE_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* 省份 */}
            <select
              className={`${selectClass} w-[120px]`}
              value={allProvince}
              onChange={(e) => { setAllProvince(e.target.value); setPage(1); }}
            >
              <option value="">省份</option>
              {PROVINCE_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* 招生状态 */}
            <select
              className={`${selectClass} w-[120px]`}
              value={allRecruiting}
              onChange={(e) => { setAllRecruiting(e.target.value); setPage(1); }}
            >
              <option value="">招生状态</option>
              <option value="true">招生中</option>
              <option value="false">暂不招生</option>
            </select>

            {/* 已选标签 */}
            {allFilterCount > 0 && (
              <>
                <div className="h-4 w-px bg-border mx-1" />
                {allUniversity && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {allUniversity}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => { setAllUniversity(""); setPage(1); }} />
                  </Badge>
                )}
                {allDiscipline && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {allDiscipline}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => { setAllDiscipline(""); setPage(1); }} />
                  </Badge>
                )}
                {allProvince && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {allProvince}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => { setAllProvince(""); setPage(1); }} />
                  </Badge>
                )}
                {allRecruiting && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {allRecruiting === "true" ? "招生中" : "暂不招生"}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => { setAllRecruiting(""); setPage(1); }} />
                  </Badge>
                )}
                <button
                  onClick={() => { setAllUniversity(""); setAllDiscipline(""); setAllProvince(""); setAllRecruiting(""); setPage(1); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  清除
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* ===== 按目标院校分组视图 ===== */}
      {viewMode === "grouped" && hasTargets && !groupedUniversity && (
        <div className="space-y-8">
          {/* 提示信息 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/[0.04] to-blue-500/[0.02] p-4"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">根据你的目标院校推荐</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                展示你感兴趣的 {targetUniversities.length} 所学校的导师信息，可通过筛选查看其他学校
              </p>
            </div>
          </motion.div>

          {groupedTutors.map((group, groupIndex) => (
            <motion.div
              key={group.university}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIndex * 0.1 }}
            >
              {/* 学校标题 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-blue-500/10 text-primary">
                    <GraduationCap className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">{group.university}</h2>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {group.departments.slice(0, 3).map((dept) => (
                        <Badge key={dept} variant="outline" className="text-xs font-normal">
                          {dept}
                        </Badge>
                      ))}
                      {group.departments.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{group.departments.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-muted-foreground shrink-0"
                  onClick={() => setGroupedUniversity(group.university)}
                >
                  查看更多
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* 导师卡片 */}
              {group.tutors.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.tutors.slice(0, 6).map((tutor) => (
                    <motion.div
                      key={tutor.id}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.2 }}
                    >
                      <TutorCard tutor={tutor} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Users className="h-8 w-8 mb-3 opacity-30" />
                    <p className="text-sm font-medium">暂无该校导师数据</p>
                    <p className="text-xs mt-1">导师数据持续更新中，敬请期待</p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* 目标院校视图 - 筛选了特定学校时 */}
      {viewMode === "grouped" && groupedUniversity && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-blue-500/10 text-primary">
              <GraduationCap className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{groupedUniversity}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                共 {groupedTutors[0]?.tutors.length || 0} 位导师
              </p>
            </div>
          </div>

          {groupedTutors[0]?.tutors.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {groupedTutors[0].tutors.map((tutor) => (
                <motion.div
                  key={tutor.id}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <TutorCard tutor={tutor} />
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-8 w-8 mb-3 opacity-30" />
                <p className="text-sm font-medium">暂无该校导师数据</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 未设置目标院校的提示（分组视图下） */}
      {viewMode === "grouped" && !hasTargets && !groupedUniversity && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.02] to-blue-500/[0.01]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                <Target className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold mb-2">设置你的目标院校</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                完善个人信息后，我们会根据你的目标院校推荐相关导师。
                你也可以通过上方筛选条件查看特定学校的导师。
              </p>
              <div className="flex gap-3">
                <Link href="/user/onboarding">
                  <Button className="gap-2 shadow-md shadow-primary/20">
                    <Sparkles className="h-4 w-4" />
                    去设置
                  </Button>
                </Link>
                <Button variant="outline" onClick={() => switchView("all")}>
                  浏览全部导师
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ===== 按研究方向分组视图 ===== */}
      {viewMode === "research" && (
        <div className="space-y-8">
          {/* 提示信息 */}
          {hasResearchInterests && !researchDiscipline && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50/50 to-purple-50/30 dark:border-violet-500/20 dark:from-violet-500/[0.03] dark:to-purple-500/[0.02] p-4"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-500/10 shrink-0">
                <FlaskConical className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">根据你的研究兴趣排序</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {researchInterests.slice(0, 5).map((interest) => (
                    <Badge
                      key={interest}
                      variant="outline"
                      className="text-xs font-normal border-violet-200 text-violet-600 dark:border-violet-500/30"
                    >
                      {interest}
                    </Badge>
                  ))}
                  {researchInterests.length > 5 && (
                    <span className="text-xs text-muted-foreground">
                      +{researchInterests.length - 5}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {researchGroupedTutors.map((group, groupIndex) => (
            <motion.div
              key={group.area}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(groupIndex * 0.05, 0.5) }}
            >
              {/* 研究方向标题 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${RESEARCH_COLORS[group.area] || DEFAULT_RESEARCH_COLOR}`}>
                    <FlaskConical className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-semibold tracking-tight">{group.area}</h2>
                    {group.isInterested && (
                      <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-xs dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/30">
                        <Sparkles className="h-3 w-3 mr-0.5" />
                        感兴趣
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {group.tutors.length} 位导师
                    </span>
                  </div>
                </div>
                {group.tutors.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-muted-foreground shrink-0"
                    onClick={() => {
                      setKeyword(group.area);
                      switchView("all");
                    }}
                  >
                    查看全部
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {/* 导师卡片 */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.tutors.slice(0, 3).map((tutor) => (
                  <motion.div
                    key={`${group.area}-${tutor.id}`}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TutorCard tutor={tutor} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}

          {researchGroupedTutors.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <FlaskConical className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">暂无匹配的导师</p>
              <p className="mt-1 text-sm">试试调整筛选条件</p>
              {researchFilterCount > 0 && (
                <Button variant="outline" className="mt-4" onClick={() => { setResearchDiscipline(""); setResearchDirection(""); }}>
                  清除筛选条件
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== 全部导师视图 ===== */}
      {viewMode === "all" && (
        <>
          {/* 排序栏 + 结果数 */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              共 <span className="font-medium text-foreground">{filteredTutors.length}</span> 位导师
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground hidden sm:inline mr-1">排序</span>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setSort(opt.value); setPage(1); }}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                    sort === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 导师列表 */}
          {paginatedTutors.length > 0 ? (
            <motion.div
              key={`page-${page}`}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
              }}
              className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
            >
              {paginatedTutors.map((tutor) => (
                <motion.div
                  key={tutor.id}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: { opacity: 1, y: 0 },
                  }}
                >
                  <TutorCard tutor={tutor} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">暂无匹配的导师</p>
              <p className="mt-1 text-sm">试试调整筛选条件或搜索关键词</p>
              <Button variant="outline" className="mt-4" onClick={() => { setAllUniversity(""); setAllDiscipline(""); setAllProvince(""); setAllRecruiting(""); setKeyword(""); setPage(1); }}>
                清除筛选条件
              </Button>
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="mt-8">
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
