"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Search,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Building2,
  BookOpen,
  Target,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUserStore } from "@/stores/useUserStore";
import {
  UNIVERSITIES_985,
  getDepartmentsByUniversity,
  searchUniversities,
  COMMON_MAJORS,
} from "@/lib/university-data";
import type { TargetUniversity } from "@/types/user";

/** 目标院校最大数量 */
const MAX_TARGET_UNIVERSITIES = 3;

/** 引导步骤 */
const STEPS = [
  { id: 1, title: "基本信息", icon: GraduationCap, description: "你的本科学校和专业" },
  { id: 2, title: "目标院校", icon: Target, description: "你想去的学校和学院" },
  { id: 3, title: "研究兴趣", icon: Sparkles, description: "你感兴趣的研究方向" },
];

/** GPA 排名选项 */
const GPA_RANK_OPTIONS = [
  "前 1%", "前 3%", "前 5%", "前 10%", "前 15%", "前 20%", "前 30%", "前 50%", "暂不确定",
];

/** 热门研究方向 */
const RESEARCH_DIRECTIONS = [
  "人工智能", "机器学习", "深度学习", "自然语言处理", "计算机视觉",
  "大数据", "数据挖掘", "分布式系统", "网络安全", "区块链",
  "量子计算", "机器人", "自动驾驶", "物联网", "云计算",
  "金融科技", "生物信息学", "新能源", "新材料", "环境科学",
  "凝聚态物理", "粒子物理", "有机化学", "分析化学", "生物化学",
  "基因组学", "免疫学", "神经科学", "药物研发", "精准医学",
  "宏观经济学", "微观经济学", "计量经济学", "国际贸易",
  "民商法", "刑法学", "国际法", "知识产权法",
  "中国古代文学", "比较文学", "语言学", "传播学",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, updateUser } = useUserStore();
  const [step, setStep] = useState(1);

  // Step 1: 基本信息
  const [universitySearch, setUniversitySearch] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState(user?.university || "");
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);
  const [majorSearch, setMajorSearch] = useState("");
  const [selectedMajor, setSelectedMajor] = useState(user?.major || "");
  const [showMajorDropdown, setShowMajorDropdown] = useState(false);
  const [grade, setGrade] = useState(user?.grade || "大三");
  const [gpaRank, setGpaRank] = useState(user?.gpa_rank || "");

  // Step 2: 目标院校
  const [targetUniversities, setTargetUniversities] = useState<TargetUniversity[]>(
    user?.target_universities || []
  );
  const [targetUniSearch, setTargetUniSearch] = useState("");
  const [showTargetUniDropdown, setShowTargetUniDropdown] = useState(false);
  const [selectedTargetUni, setSelectedTargetUni] = useState("");
  const [selectedTargetDepts, setSelectedTargetDepts] = useState<string[]>([]);
  const [deptSearch, setDeptSearch] = useState("");

  // 下拉框引用（用于点击外部关闭）
  const uniDropdownRef = useRef<HTMLDivElement>(null);
  const majorDropdownRef = useRef<HTMLDivElement>(null);
  const targetUniDropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (uniDropdownRef.current && !uniDropdownRef.current.contains(e.target as Node)) {
        setShowUniversityDropdown(false);
      }
      if (majorDropdownRef.current && !majorDropdownRef.current.contains(e.target as Node)) {
        setShowMajorDropdown(false);
      }
      if (targetUniDropdownRef.current && !targetUniDropdownRef.current.contains(e.target as Node)) {
        setShowTargetUniDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 是否已达到目标院校上限
  const isTargetFull = targetUniversities.length >= MAX_TARGET_UNIVERSITIES;

  // Step 3: 研究兴趣
  const [researchInterests, setResearchInterests] = useState<string[]>(
    user?.research_interests || []
  );
  const [customInterest, setCustomInterest] = useState("");

  // 搜索过滤
  const filteredUniversities = useMemo(
    () => searchUniversities(universitySearch),
    [universitySearch]
  );

  const filteredMajors = useMemo(() => {
    if (!majorSearch) return [...COMMON_MAJORS];
    const kw = majorSearch.toLowerCase();
    return COMMON_MAJORS.filter((m) => m.toLowerCase().includes(kw));
  }, [majorSearch]);

  const filteredTargetUnis = useMemo(
    () => searchUniversities(targetUniSearch),
    [targetUniSearch]
  );

  const targetDepts = useMemo(
    () => getDepartmentsByUniversity(selectedTargetUni),
    [selectedTargetUni]
  );

  const filteredDepts = useMemo(() => {
    if (!deptSearch) return targetDepts;
    const kw = deptSearch.toLowerCase();
    return targetDepts.filter((d) => d.toLowerCase().includes(kw));
  }, [targetDepts, deptSearch]);

  // 添加目标院校
  const addTargetUniversity = () => {
    if (!selectedTargetUni || selectedTargetDepts.length === 0) return;
    const existing = targetUniversities.find((t) => t.university === selectedTargetUni);
    if (existing) {
      setTargetUniversities((prev) =>
        prev.map((t) =>
          t.university === selectedTargetUni
            ? { ...t, departments: [...new Set([...t.departments, ...selectedTargetDepts])] }
            : t
        )
      );
    } else {
      setTargetUniversities((prev) => [
        ...prev,
        { university: selectedTargetUni, departments: selectedTargetDepts },
      ]);
    }
    setSelectedTargetUni("");
    setSelectedTargetDepts([]);
    setTargetUniSearch("");
    setDeptSearch("");
  };

  const removeTargetUniversity = (uniName: string) => {
    setTargetUniversities((prev) => prev.filter((t) => t.university !== uniName));
  };

  const removeTargetDept = (uniName: string, deptName: string) => {
    setTargetUniversities((prev) =>
      prev
        .map((t) =>
          t.university === uniName
            ? { ...t, departments: t.departments.filter((d) => d !== deptName) }
            : t
        )
        .filter((t) => t.departments.length > 0)
    );
  };

  // 提交
  const handleComplete = () => {
    updateUser({
      university: selectedUniversity || null,
      major: selectedMajor || null,
      grade: grade || null,
      gpa_rank: gpaRank || null,
      target_universities: targetUniversities,
      research_interests: researchInterests,
      is_onboarded: true,
    });
    router.push("/");
  };

  const handleSkip = () => {
    updateUser({ is_onboarded: true });
    router.push("/");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-primary/[0.02] to-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        {/* 顶部标题 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-500 text-white mb-4 shadow-lg shadow-primary/20">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">完善你的信息</h1>
          <p className="mt-2 text-muted-foreground">
            帮助我们为你推荐更精准的保研信息
          </p>
        </motion.div>

        {/* 步骤指示器 */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <motion.button
                onClick={() => setStep(s.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={
                  step === s.id
                    ? { scale: [1, 1.08, 1], transition: { duration: 0.35 } }
                    : { scale: 1 }
                }
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  step === s.id
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : step > s.id
                    ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s.id ? (
                  <motion.span
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <Check className="h-4 w-4" />
                  </motion.span>
                ) : (
                  <s.icon className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{s.title}</span>
                <span className="sm:hidden">{s.id}</span>
              </motion.button>
              {i < STEPS.length - 1 && (
                <div className="mx-1 flex items-center">
                  <motion.div
                    className="h-0.5 w-6 rounded-full"
                    animate={{
                      backgroundColor: step > s.id + 1 || (step > s.id)
                        ? "var(--color-primary)"
                        : "hsl(var(--muted))",
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 步骤内容 */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="border-0 shadow-lg shadow-black/[0.03]">
                <CardContent className="p-6 sm:p-8 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      本科学校
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">选择你当前就读的学校</p>
                  </div>

                  {/* 学校搜索选择 */}
                  <div className="relative" ref={uniDropdownRef}>
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="搜索学校名称..."
                      className="pl-10 h-11 rounded-xl"
                      value={selectedUniversity || universitySearch}
                      onChange={(e) => {
                        setUniversitySearch(e.target.value);
                        setSelectedUniversity("");
                        setShowUniversityDropdown(true);
                      }}
                      onFocus={() => setShowUniversityDropdown(true)}
                    />
                    {selectedUniversity && (
                      <button
                        onClick={() => { setSelectedUniversity(""); setUniversitySearch(""); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    {showUniversityDropdown && !selectedUniversity && (
                      <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border bg-popover shadow-lg p-1">
                        {filteredUniversities.length > 0 ? (
                          filteredUniversities.map((u) => (
                            <button
                              key={u.name}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between"
                              onClick={() => {
                                setSelectedUniversity(u.name);
                                setUniversitySearch("");
                                setShowUniversityDropdown(false);
                              }}
                            >
                              <span>{u.name}</span>
                              <span className="text-xs text-muted-foreground">{u.province}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                            未找到匹配的学校，你可以直接输入
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* 专业搜索选择 */}
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      本科专业
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">选择你当前就读的专业</p>
                  </div>

                  <div className="relative" ref={majorDropdownRef}>
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="搜索专业名称..."
                      className="pl-10 h-11"
                      value={selectedMajor || majorSearch}
                      onChange={(e) => {
                        setMajorSearch(e.target.value);
                        setSelectedMajor("");
                        setShowMajorDropdown(true);
                      }}
                      onFocus={() => setShowMajorDropdown(true)}
                    />
                    {selectedMajor && (
                      <button
                        onClick={() => { setSelectedMajor(""); setMajorSearch(""); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    {showMajorDropdown && !selectedMajor && (
                      <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border bg-popover shadow-lg p-1">
                        {filteredMajors.length > 0 ? (
                          filteredMajors.map((m) => (
                            <button
                              key={m}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                              onClick={() => {
                                setSelectedMajor(m);
                                setMajorSearch("");
                                setShowMajorDropdown(false);
                              }}
                            >
                              {m}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                            未找到匹配的专业，你可以直接输入
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* 年级 + GPA */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">年级</label>
                      <select
                        className="w-full h-11 rounded-md border bg-background px-3 text-sm"
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                      >
                        <option value="大一">大一</option>
                        <option value="大二">大二</option>
                        <option value="大三">大三</option>
                        <option value="大四">大四</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">GPA 排名</label>
                      <select
                        className="w-full h-11 rounded-md border bg-background px-3 text-sm"
                        value={gpaRank}
                        onChange={(e) => setGpaRank(e.target.value)}
                      >
                        <option value="">请选择</option>
                        {GPA_RANK_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="border-0 shadow-lg shadow-black/[0.03]">
                <CardContent className="p-6 sm:p-8 space-y-6">
                  <div>
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        目标院校
                      </h2>
                      <Badge
                        variant={isTargetFull ? "default" : "outline"}
                        className={isTargetFull ? "bg-primary/10 text-primary border-primary/20" : ""}
                      >
                        {targetUniversities.length} / {MAX_TARGET_UNIVERSITIES}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      选择你最想保研去的学校和学院（最多 {MAX_TARGET_UNIVERSITIES} 所），我们会优先推送相关信息
                    </p>
                  </div>

                  {/* 已选目标院校 */}
                  {targetUniversities.length > 0 && (
                    <div className="space-y-3">
                      {targetUniversities.map((target) => (
                        <div
                          key={target.university}
                          className="rounded-lg border bg-muted/30 p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{target.university}</span>
                            <button
                              onClick={() => removeTargetUniversity(target.university)}
                              className="text-muted-foreground hover:text-red-500 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {target.departments.map((dept) => (
                              <Badge
                                key={dept}
                                variant="secondary"
                                className="text-xs gap-1 pr-1"
                              >
                                {dept}
                                <button
                                  onClick={() => removeTargetDept(target.university, dept)}
                                  className="hover:text-red-500 transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Separator />

                  {/* 添加目标院校 */}
                  {!isTargetFull ? (
                  <div className="space-y-4">
                    <p className="text-sm font-medium">添加目标院校</p>

                    {/* 选择学校 */}
                    <div className="relative" ref={targetUniDropdownRef}>
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="搜索目标学校..."
                        className="pl-10 h-11"
                        value={selectedTargetUni || targetUniSearch}
                        onChange={(e) => {
                          setTargetUniSearch(e.target.value);
                          setSelectedTargetUni("");
                          setSelectedTargetDepts([]);
                          setShowTargetUniDropdown(true);
                        }}
                        onFocus={() => setShowTargetUniDropdown(true)}
                      />
                      {selectedTargetUni && (
                        <button
                          onClick={() => {
                            setSelectedTargetUni("");
                            setTargetUniSearch("");
                            setSelectedTargetDepts([]);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      {showTargetUniDropdown && !selectedTargetUni && (
                        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border bg-popover shadow-lg p-1">
                          {filteredTargetUnis.map((u) => (
                            <button
                              key={u.name}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between"
                              onClick={() => {
                                setSelectedTargetUni(u.name);
                                setTargetUniSearch("");
                                setShowTargetUniDropdown(false);
                                setSelectedTargetDepts([]);
                              }}
                            >
                              <span>{u.name}</span>
                              <span className="text-xs text-muted-foreground">{u.province}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 选择学院 */}
                    {selectedTargetUni && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-3"
                      >
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder={`搜索 ${selectedTargetUni} 的学院...`}
                            className="pl-10 h-10 text-sm"
                            value={deptSearch}
                            onChange={(e) => setDeptSearch(e.target.value)}
                          />
                        </div>
                        <div className="max-h-40 overflow-y-auto rounded-lg border p-2 space-y-0.5">
                          {filteredDepts.map((dept) => {
                            const isSelected = selectedTargetDepts.includes(dept);
                            return (
                              <button
                                key={dept}
                                className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2 ${
                                  isSelected
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "hover:bg-accent"
                                }`}
                                onClick={() => {
                                  setSelectedTargetDepts((prev) =>
                                    isSelected
                                      ? prev.filter((d) => d !== dept)
                                      : [...prev, dept]
                                  );
                                }}
                              >
                                <div
                                  className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                                    isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                                  }`}
                                >
                                  {isSelected && <Check className="h-3 w-3 text-white" />}
                                </div>
                                {dept}
                              </button>
                            );
                          })}
                        </div>
                        {selectedTargetDepts.length > 0 && (
                          <Button
                            onClick={addTargetUniversity}
                            className="w-full gap-2"
                            size="sm"
                          >
                            <Plus className="h-4 w-4" />
                            添加 {selectedTargetUni}（{selectedTargetDepts.length} 个学院）
                          </Button>
                        )}
                      </motion.div>
                    )}
                  </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-primary/30 bg-primary/[0.02] p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        已选择 {MAX_TARGET_UNIVERSITIES} 所目标院校，如需更换请先删除已有院校
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="border-0 shadow-lg shadow-black/[0.03]">
                <CardContent className="p-6 sm:p-8 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      研究兴趣
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      选择你感兴趣的研究方向，帮助我们推荐合适的导师
                    </p>
                  </div>

                  {/* 已选标签 */}
                  {researchInterests.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {researchInterests.map((interest) => (
                        <Badge
                          key={interest}
                          className="gap-1 pr-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                        >
                          {interest}
                          <button
                            onClick={() =>
                              setResearchInterests((prev) => prev.filter((i) => i !== interest))
                            }
                            className="hover:text-red-500 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  <Separator />

                  {/* 热门方向 */}
                  <div>
                    <p className="text-sm font-medium mb-3">热门研究方向</p>
                    <div className="flex flex-wrap gap-2">
                      {RESEARCH_DIRECTIONS.map((dir) => {
                        const isSelected = researchInterests.includes(dir);
                        return (
                          <button
                            key={dir}
                            onClick={() => {
                              setResearchInterests((prev) =>
                                isSelected
                                  ? prev.filter((i) => i !== dir)
                                  : [...prev, dir]
                              );
                            }}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                            }`}
                          >
                            {dir}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* 自定义方向 */}
                  <div>
                    <p className="text-sm font-medium mb-2">自定义方向</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="输入你感兴趣的方向..."
                        className="h-10"
                        value={customInterest}
                        onChange={(e) => setCustomInterest(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && customInterest.trim()) {
                            if (!researchInterests.includes(customInterest.trim())) {
                              setResearchInterests((prev) => [...prev, customInterest.trim()]);
                            }
                            setCustomInterest("");
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 shrink-0"
                        onClick={() => {
                          if (customInterest.trim() && !researchInterests.includes(customInterest.trim())) {
                            setResearchInterests((prev) => [...prev, customInterest.trim()]);
                            setCustomInterest("");
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 底部操作栏 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 flex items-center justify-between"
        >
          <div>
            {step > 1 ? (
              <Button
                variant="ghost"
                onClick={() => setStep(step - 1)}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                上一步
              </Button>
            ) : (
              <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
                跳过，稍后填写
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} className="gap-1 shadow-md shadow-primary/20">
                下一步
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                className="gap-2 shadow-md shadow-primary/20 px-6"
              >
                <Trophy className="h-4 w-4" />
                完成设置
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
