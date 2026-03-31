"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  GraduationCap,
  BookOpen,
  Calendar,
  Edit3,
  Save,
  X,
  Target,
  Sparkles,
  Trophy,
  Search,
  Plus,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUserStore } from "@/stores/useUserStore";
import { mockUserProfile, mockFavorites } from "@/lib/mock-data";
import {
  searchUniversities,
  getDepartmentsByUniversity,
  COMMON_MAJORS,
} from "@/lib/university-data";
/** GPA 排名选项 */
const GPA_RANK_OPTIONS = [
  "前 1%", "前 3%", "前 5%", "前 10%", "前 15%", "前 20%", "前 30%", "前 50%", "暂不确定",
];

export default function UserProfilePage() {
  const { user, isLoggedIn, setUser, updateUser } = useUserStore();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    nickname: "",
    university: "",
    major: "",
    grade: "",
    bio: "",
    gpa_rank: "",
  });

  // 搜索状态
  const [uniSearch, setUniSearch] = useState("");
  const [showUniDropdown, setShowUniDropdown] = useState(false);
  const [majorSearch, setMajorSearch] = useState("");
  const [showMajorDropdown, setShowMajorDropdown] = useState(false);

  // 初始化：如果未登录，使用 Mock 数据模拟登录
  useEffect(() => {
    if (!isLoggedIn) {
      setUser(mockUserProfile, "mock-token-123");
    }
  }, [isLoggedIn, setUser]);

  // 同步表单数据
  useEffect(() => {
    if (user) {
      setForm({
        nickname: user.nickname || "",
        university: user.university || "",
        major: user.major || "",
        grade: user.grade || "",
        bio: user.bio || "",
        gpa_rank: user.gpa_rank || "",
      });
    }
  }, [user]);

  const filteredUnis = useMemo(() => searchUniversities(uniSearch), [uniSearch]);
  const filteredMajors = useMemo(() => {
    if (!majorSearch) return [...COMMON_MAJORS];
    const kw = majorSearch.toLowerCase();
    return COMMON_MAJORS.filter((m) => m.toLowerCase().includes(kw));
  }, [majorSearch]);

  const handleSave = () => {
    updateUser({
      nickname: form.nickname,
      university: form.university || null,
      major: form.major || null,
      grade: form.grade || null,
      bio: form.bio || null,
      gpa_rank: form.gpa_rank || null,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (user) {
      setForm({
        nickname: user.nickname || "",
        university: user.university || "",
        major: user.major || "",
        grade: user.grade || "",
        bio: user.bio || "",
        gpa_rank: user.gpa_rank || "",
      });
    }
    setIsEditing(false);
  };

  if (!user) return null;

  const favoriteNotices = (user as any)._favoriteNoticeCount ?? mockFavorites.filter((f) => f.type === "notice").length;
  const favoriteSchools = (user as any)._favoriteSchoolCount ?? mockFavorites.filter((f) => f.type === "school").length;
  const favoriteTutors = (user as any)._favoriteTutorCount ?? mockFavorites.filter((f) => f.type === "tutor").length;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">个人资料</h1>
          <p className="text-sm text-muted-foreground mt-1">管理你的个人信息</p>
        </div>
        {!isEditing ? (
          <Button variant="outline" className="gap-1.5" onClick={() => setIsEditing(true)}>
            <Edit3 className="h-4 w-4" />
            编辑
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" className="gap-1.5" onClick={handleCancel}>
              <X className="h-4 w-4" />
              取消
            </Button>
            <Button className="gap-1.5" onClick={handleSave}>
              <Save className="h-4 w-4" />
              保存
            </Button>
          </div>
        )}
      </div>

      {/* 基本信息 */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            基本信息
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* 昵称 */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">昵称</label>
              {isEditing ? (
                <Input
                  value={form.nickname}
                  onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                  placeholder="输入昵称"
                />
              ) : (
                <p className="text-sm py-2">{user.nickname || "—"}</p>
              )}
            </div>

            {/* 邮箱（不可编辑） */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">邮箱</label>
              <div className="flex items-center gap-2 text-sm py-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {user.email}
                <Badge variant="outline" className="text-xs">已验证</Badge>
              </div>
            </div>

            {/* 学校（候选框） */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">学校</label>
              {isEditing ? (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={form.university || uniSearch}
                    onChange={(e) => {
                      setUniSearch(e.target.value);
                      setForm({ ...form, university: "" });
                      setShowUniDropdown(true);
                    }}
                    onFocus={() => setShowUniDropdown(true)}
                    onBlur={() => setTimeout(() => setShowUniDropdown(false), 200)}
                    placeholder="搜索学校..."
                  />
                  {form.university && (
                    <button
                      onClick={() => { setForm({ ...form, university: "" }); setUniSearch(""); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {showUniDropdown && !form.university && (
                    <div className="absolute z-50 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border bg-popover shadow-lg">
                      {filteredUnis.slice(0, 10).map((u) => (
                        <button
                          key={u.name}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                          onMouseDown={() => {
                            setForm({ ...form, university: u.name });
                            setUniSearch("");
                            setShowUniDropdown(false);
                          }}
                        >
                          {u.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm py-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  {user.university || "未填写"}
                </div>
              )}
            </div>

            {/* 专业（候选框） */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">专业</label>
              {isEditing ? (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={form.major || majorSearch}
                    onChange={(e) => {
                      setMajorSearch(e.target.value);
                      setForm({ ...form, major: "" });
                      setShowMajorDropdown(true);
                    }}
                    onFocus={() => setShowMajorDropdown(true)}
                    onBlur={() => setTimeout(() => setShowMajorDropdown(false), 200)}
                    placeholder="搜索专业..."
                  />
                  {form.major && (
                    <button
                      onClick={() => { setForm({ ...form, major: "" }); setMajorSearch(""); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {showMajorDropdown && !form.major && (
                    <div className="absolute z-50 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border bg-popover shadow-lg">
                      {filteredMajors.slice(0, 10).map((m) => (
                        <button
                          key={m}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                          onMouseDown={() => {
                            setForm({ ...form, major: m });
                            setMajorSearch("");
                            setShowMajorDropdown(false);
                          }}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm py-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  {user.major || "未填写"}
                </div>
              )}
            </div>

            {/* 年级 */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">年级</label>
              {isEditing ? (
                <select
                  className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                >
                  <option value="">请选择</option>
                  <option value="大一">大一</option>
                  <option value="大二">大二</option>
                  <option value="大三">大三</option>
                  <option value="大四">大四</option>
                </select>
              ) : (
                <div className="flex items-center gap-2 text-sm py-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {user.grade || "未填写"}
                </div>
              )}
            </div>

            {/* GPA 排名 */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">GPA 排名</label>
              {isEditing ? (
                <select
                  className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                  value={form.gpa_rank}
                  onChange={(e) => setForm({ ...form, gpa_rank: e.target.value })}
                >
                  <option value="">请选择</option>
                  {GPA_RANK_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2 text-sm py-2">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                  {user.gpa_rank || "未填写"}
                </div>
              )}
            </div>
          </div>

          {/* 个人简介 */}
          <Separator className="my-5" />
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">个人简介</label>
            {isEditing ? (
              <textarea
                className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="介绍一下自己..."
                maxLength={200}
              />
            ) : (
              <p className="text-sm py-2 text-muted-foreground">
                {user.bio || "这个人很懒，什么都没写~"}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 目标院校 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              目标院校
              {user.target_universities && user.target_universities.length > 0 && (
                <Badge variant="outline" className="text-xs font-normal">
                  {user.target_universities.length} / 3
                </Badge>
              )}
            </h2>
            <Link href="/user/onboarding">
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
                <Edit3 className="h-3 w-3" />
                编辑
              </Button>
            </Link>
          </div>
          {user.target_universities && user.target_universities.length > 0 ? (
            <div className="space-y-3">
              {user.target_universities.map((target) => (
                <div key={target.university} className="rounded-lg bg-muted/40 p-3">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <GraduationCap className="h-3.5 w-3.5 text-primary" />
                    {target.university}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {target.departments.map((dept) => (
                      <Badge key={dept} variant="secondary" className="text-xs font-normal">
                        {dept}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">还未设置目标院校</p>
              <Link href="/user/onboarding">
                <Button variant="link" size="sm" className="mt-1 text-xs">
                  去设置 →
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 研究兴趣 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              研究兴趣
            </h2>
            <Link href="/user/onboarding">
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
                <Edit3 className="h-3 w-3" />
                编辑
              </Button>
            </Link>
          </div>
          {user.research_interests && user.research_interests.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {user.research_interests.map((interest) => (
                <Badge
                  key={interest}
                  className="bg-primary/10 text-primary border-primary/20"
                >
                  {interest}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">还未设置研究兴趣</p>
              <Link href="/user/onboarding">
                <Button variant="link" size="sm" className="mt-1 text-xs">
                  去设置 →
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 数据统计 */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold mb-4">数据概览</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">
                {mockFavorites.filter((f) => f.type === "notice").length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">收藏通知</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">
                {mockFavorites.filter((f) => f.type === "school").length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">收藏院校</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">
                {mockFavorites.filter((f) => f.type === "tutor").length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">收藏导师</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
