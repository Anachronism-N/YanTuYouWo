"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Heart, StickyNote, Tag, Search,
  FolderOpen, Plus, Trash2, ExternalLink,
  Calendar, Filter, Star, Sparkles, Edit3,
  Building2, User, FileText, Lightbulb,
  GraduationCap, MessageSquare, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useUserStore } from "@/stores/useUserStore";
import { mockUserProfile, mockFavorites } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { FavoriteType } from "@/types/user";
import type { GraphNodeType } from "@/types/graph";
import { ForceGraph } from "@/components/graph/ForceGraph";
import GraphDetailPanel from "@/components/graph/GraphDetailPanel";
import GraphToolbar from "@/components/graph/GraphToolbar";
import { personalGraphData } from "@/lib/mock-graph-data";
import type { GraphNode } from "@/types/graph";
import { Network } from "lucide-react";

/* ================================================================
   类型定义
   ================================================================ */

type ViewTab = "favorites" | "notes" | "tags" | "graph";

interface Note {
  id: number;
  title: string;
  content: string;
  related_favorite_id?: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

/* ================================================================
   Mock 数据
   ================================================================ */

const MOCK_NOTES: Note[] = [
  {
    id: 1, title: "清华计算机系面试要点", content: "1. 重视算法基础\n2. 需要准备英文自我介绍\n3. 会问科研项目细节\n4. 建议提前联系导师",
    related_favorite_id: 1, tags: ["面试", "清华"], created_at: "2026-03-28", updated_at: "2026-03-28",
  },
  {
    id: 2, title: "个人陈述写作思路", content: "开头：用一个具体的故事引入\n中间：科研经历 + 竞赛成果 + 学术兴趣\n结尾：未来规划和目标",
    tags: ["文书", "个人陈述"], created_at: "2026-03-25", updated_at: "2026-03-26",
  },
  {
    id: 3, title: "择校对比笔记", content: "清华 vs 北大 vs 浙大 计算机方向对比：\n- 清华：科研最强，竞争最激烈\n- 北大：学术自由，跨学科机会多\n- 浙大：工程导向，就业好",
    tags: ["择校", "对比"], created_at: "2026-03-20", updated_at: "2026-03-22",
  },
];

const MOCK_USER_TAGS = [
  { name: "面试", count: 5 },
  { name: "清华", count: 3 },
  { name: "文书", count: 4 },
  { name: "择校", count: 2 },
  { name: "科研", count: 6 },
  { name: "英语", count: 3 },
  { name: "导师", count: 2 },
  { name: "个人陈述", count: 2 },
];

const RECOMMENDED = [
  { id: 1, title: "2026 清华计算机夏令营面试真题", type: "面试题库", reason: "基于你收藏的清华相关内容" },
  { id: 2, title: "保研面试英语口语速成课", type: "录播课程", reason: "基于你的英语学习标签" },
  { id: 3, title: "个人陈述模板（理工科通用版）", type: "文书模板", reason: "基于你的文书笔记" },
];

const TYPE_CONFIG: Record<FavoriteType, { label: string; icon: typeof BookOpen; color: string; href: (id: number) => string }> = {
  notice: { label: "通知", icon: FileText, color: "text-blue-600 bg-blue-50 border-blue-200", href: (id) => `/info/notices/${id}` },
  school: { label: "院校", icon: Building2, color: "text-emerald-600 bg-emerald-50 border-emerald-200", href: (id) => `/info/schools/${id}` },
  tutor: { label: "导师", icon: User, color: "text-purple-600 bg-purple-50 border-purple-200", href: (id) => `/info/tutors/${id}` },
};

const FOLDER_OPTIONS = ["全部", "通知", "院校", "导师", "知识库", "社群"];

/* ================================================================
   页面组件
   ================================================================ */

export default function PersonalKnowledgePage() {
  const { favorites, setFavorites, removeFavorite, isLoggedIn, setUser } = useUserStore();
  const [activeTab, setActiveTab] = useState<ViewTab>("favorites");
  const [folder, setFolder] = useState("全部");
  const [keyword, setKeyword] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [graphFilterTypes, setGraphFilterTypes] = useState<GraphNodeType[]>([]);
  const [selectedGraphNode, setSelectedGraphNode] = useState<GraphNode | null>(null);

  // 初始化 Mock 数据
  useEffect(() => {
    if (!isLoggedIn) {
      setUser(mockUserProfile, "mock-token-123");
    }
    if (favorites.length === 0) {
      setFavorites(mockFavorites);
    }
  }, [isLoggedIn, setUser, favorites.length, setFavorites]);

  const filteredFavorites = favorites
    .filter((f) => folder === "全部" || TYPE_CONFIG[f.type]?.label === folder)
    .filter((f) => !keyword || f.title.includes(keyword) || f.description.includes(keyword));

  const filteredNotes = MOCK_NOTES
    .filter((n) => !keyword || n.title.includes(keyword) || n.content.includes(keyword))
    .filter((n) => !selectedTag || n.tags.includes(selectedTag));

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-violet-500" /> 个人知识库
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            收藏、笔记、标签，构建你的专属知识体系
          </p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> 新建笔记
        </Button>
      </div>

      {/* Tab 切换 */}
      <div className="border-b">
        <div className="flex gap-1">
          {([
            { id: "favorites" as ViewTab, label: "我的收藏", icon: Heart, count: favorites.length },
            { id: "notes" as ViewTab, label: "我的笔记", icon: StickyNote, count: MOCK_NOTES.length },
            { id: "tags" as ViewTab, label: "标签管理", icon: Tag, count: MOCK_USER_TAGS.length },
            { id: "graph" as ViewTab, label: "知识图谱", icon: Network, count: personalGraphData.nodes.length },
          ]).map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn("flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all",
                  activeTab === tab.id
                    ? "border-violet-500 text-violet-700 dark:text-violet-400"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30")}>
                <Icon className="h-4 w-4" />
                {tab.label}
                <span className="text-xs text-muted-foreground">({tab.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 搜索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={keyword} onChange={(e) => setKeyword(e.target.value)}
          placeholder={activeTab === "favorites" ? "搜索收藏..." : activeTab === "notes" ? "搜索笔记..." : "搜索标签..."}
          className="pl-10 h-10 rounded-xl" />
      </div>

      {/* 收藏列表 */}
      {activeTab === "favorites" && (
        <div className="space-y-4">
          {/* 文件夹筛选 */}
          <div className="flex items-center gap-1.5">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            {FOLDER_OPTIONS.map((f) => (
              <button key={f} onClick={() => setFolder(f)}
                className={cn("rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                  folder === f ? "bg-violet-500 text-white" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
                {f}
              </button>
            ))}
          </div>

          {filteredFavorites.length > 0 ? (
            <AnimatePresence mode="popLayout">
              <div className="space-y-2">
                {filteredFavorites.map((item) => {
                  const config = TYPE_CONFIG[item.type];
                  if (!config) return null;
                  const Icon = config.icon;
                  return (
                    <motion.div key={`${item.type}-${item.target_id}`} layout
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }} transition={{ duration: 0.2 }}>
                      <Card className="group transition-all hover:shadow-md hover:border-violet-200">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${config.color}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Link href={config.href(item.target_id)}
                                  className="text-sm font-semibold hover:text-violet-600 transition-colors truncate">
                                  {item.title}
                                </Link>
                                <Badge variant="outline" className="shrink-0 text-xs">{config.label}</Badge>
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground truncate">{item.description}</p>
                              <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground/70">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(item.created_at).toLocaleDateString("zh-CN")}收藏
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="添加笔记">
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                              <Link href={config.href(item.target_id)}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                              <Button variant="ghost" size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                onClick={() => removeFavorite(item.type, item.target_id)}>
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
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Heart className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">暂无收藏</p>
              <p className="mt-1 text-sm">浏览内容时，点击收藏按钮即可添加到个人知识库</p>
            </div>
          )}
        </div>
      )}

      {/* 笔记列表 */}
      {activeTab === "notes" && (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredNotes.map((note, i) => (
              <motion.div key={note.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}>
                <Card className="shadow-sm hover:shadow-md transition-all group cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm group-hover:text-violet-600 transition-colors">{note.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-line">{note.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {note.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {note.updated_at}
                          </span>
                          {note.related_favorite_id && (
                            <Badge variant="outline" className="text-xs text-violet-600">
                              📌 关联收藏
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredNotes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <StickyNote className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">暂无笔记</p>
              <p className="mt-1 text-sm">点击右上角「新建笔记」开始记录</p>
            </div>
          )}
        </div>
      )}

      {/* 标签管理 */}
      {activeTab === "tags" && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {MOCK_USER_TAGS.map((tag) => (
              <button key={tag.name}
                onClick={() => setSelectedTag(selectedTag === tag.name ? null : tag.name)}
                className={cn("rounded-xl border px-4 py-2 text-sm font-medium transition-all",
                  selectedTag === tag.name
                    ? "border-violet-500 bg-violet-500/5 text-violet-700"
                    : "hover:bg-muted/50")}>
                <Tag className="h-3.5 w-3.5 inline mr-1.5" />
                {tag.name}
                <span className="ml-1.5 text-xs text-muted-foreground">({tag.count})</span>
              </button>
            ))}
            <button className="rounded-xl border border-dashed px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-all">
              <Plus className="h-3.5 w-3.5 inline mr-1" /> 新建标签
            </button>
          </div>

          {selectedTag && (
            <div>
              <h3 className="font-bold text-sm mb-3">标签「{selectedTag}」下的内容</h3>
              <div className="space-y-2">
                {filteredNotes.map((note) => (
                  <Card key={note.id} className="shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <StickyNote className="h-4 w-4 text-violet-500 shrink-0" />
                        <span className="text-sm font-medium">{note.title}</span>
                        <Badge variant="secondary" className="text-xs">笔记</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 知识图谱 */}
      {activeTab === "graph" && (
        <div className="space-y-3">
          <GraphToolbar
            title="个人知识图谱"
            availableTypes={[...new Set(personalGraphData.nodes.map((n) => n.type))] as GraphNodeType[]}
            filterTypes={graphFilterTypes}
            onFilterChange={setGraphFilterTypes}
          />
          <div className="relative h-[500px]">
            <ForceGraph
              data={personalGraphData}
              filterTypes={graphFilterTypes.length > 0 ? graphFilterTypes : undefined}
              onNodeClick={setSelectedGraphNode}
            />
            <GraphDetailPanel
              node={selectedGraphNode}
              onClose={() => setSelectedGraphNode(null)}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            💡 拖拽节点调整位置 · 滚轮缩放 · 点击节点查看详情 · 悬停高亮关联
          </p>
        </div>
      )}

      {/* 智能推荐 */}
      <Card className="shadow-sm bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:from-violet-500/5 dark:to-purple-500/5">
        <CardContent className="p-5">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" /> 猜你想看
          </h3>
          <div className="space-y-2">
            {RECOMMENDED.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.reason}</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">{item.type}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
