"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  BookOpen,
  Building2,
  User,
  Trash2,
  ExternalLink,
  Calendar,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserStore } from "@/stores/useUserStore";
import { mockUserProfile, mockFavorites } from "@/lib/mock-data";
import type { FavoriteType } from "@/types/user";

const TYPE_CONFIG: Record<FavoriteType, { label: string; icon: typeof BookOpen; color: string; href: (id: number) => string }> = {
  notice: {
    label: "通知",
    icon: BookOpen,
    color: "text-blue-600 bg-blue-50 border-blue-200",
    href: (id) => `/info/notices/${id}`,
  },
  school: {
    label: "院校",
    icon: Building2,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    href: (id) => `/info/schools/${id}`,
  },
  tutor: {
    label: "导师",
    icon: User,
    color: "text-purple-600 bg-purple-50 border-purple-200",
    href: (id) => `/info/tutors/${id}`,
  },
};

const FILTER_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "notice", label: "通知" },
  { value: "school", label: "院校" },
  { value: "tutor", label: "导师" },
] as const;

export default function FavoritesPage() {
  const { favorites, setFavorites, removeFavorite, isLoggedIn, setUser } = useUserStore();
  const [filter, setFilter] = useState<string>("all");

  // 初始化 Mock 数据
  useEffect(() => {
    if (!isLoggedIn) {
      setUser(mockUserProfile, "mock-token-123");
    }
    if (favorites.length === 0) {
      setFavorites(mockFavorites);
    }
  }, [isLoggedIn, setUser, favorites.length, setFavorites]);

  const filteredFavorites = filter === "all"
    ? favorites
    : favorites.filter((f) => f.type === filter);

  const handleRemove = (type: FavoriteType, targetId: number) => {
    removeFavorite(type, targetId);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Heart className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">我的收藏</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          管理你收藏的通知、院校和导师
        </p>
      </div>

      {/* 筛选标签 */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
              filter === opt.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {opt.label}
            {opt.value === "all" ? (
              <span className="ml-1 text-xs opacity-70">({favorites.length})</span>
            ) : (
              <span className="ml-1 text-xs opacity-70">
                ({favorites.filter((f) => f.type === opt.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 收藏列表 */}
      {filteredFavorites.length > 0 ? (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {filteredFavorites.map((item) => {
              const config = TYPE_CONFIG[item.type];
              const Icon = config.icon;

              return (
                <motion.div
                  key={`${item.type}-${item.target_id}`}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="group transition-all hover:shadow-md hover:border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* 类型图标 */}
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${config.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>

                        {/* 内容 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={config.href(item.target_id)}
                              className="text-sm font-semibold hover:text-primary transition-colors truncate"
                            >
                              {item.title}
                            </Link>
                            <Badge variant="outline" className="shrink-0 text-xs">
                              {config.label}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground truncate">
                            {item.description}
                          </p>
                          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground/70">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(item.created_at).toLocaleDateString("zh-CN")}收藏
                            </span>
                            {item.extra.status && (
                              <Badge variant="secondary" className="text-xs h-5">
                                {item.extra.status}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={config.href(item.target_id)}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                            onClick={() => handleRemove(item.type, item.target_id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Heart className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">暂无收藏</p>
          <p className="mt-1 text-sm">浏览通知、院校或导师时，点击收藏按钮即可添加</p>
          <div className="mt-4 flex gap-2">
            <Link href="/info/notices">
              <Button variant="outline" size="sm">浏览通知</Button>
            </Link>
            <Link href="/info/schools">
              <Button variant="outline" size="sm">浏览院校</Button>
            </Link>
            <Link href="/info/tutors">
              <Button variant="outline" size="sm">浏览导师</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
