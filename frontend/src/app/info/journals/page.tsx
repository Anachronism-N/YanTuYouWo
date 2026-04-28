"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Search, ExternalLink, Star, X, Clock, TrendingUp,
  FileText, Users, Filter, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import FavoriteButton from "@/components/common/FavoriteButton";

type Tab = "journals" | "conferences";

interface Journal {
  id: string;
  name: string;
  abbr: string;
  level: string;
  discipline: string;
  impactFactor: string;
  reviewCycle: string;
  acceptanceRate: string;
  friendliness: number;
  tip: string;
  url: string;
  publisher: string;
}

interface Conference {
  id: string;
  name: string;
  abbr: string;
  level: string;
  discipline: string;
  deadlineMonth: string;
  acceptanceRate: string;
  friendliness: number;
  tip: string;
  url: string;
  location: string;
}

const mockJournals: Journal[] = [
  { id: "j1", name: "IEEE Transactions on Pattern Analysis and Machine Intelligence", abbr: "TPAMI", level: "SCI Q1 / CCF-A", discipline: "计算机视觉/AI", impactFactor: "23.6", reviewCycle: "3-6 个月", acceptanceRate: "~10%", friendliness: 2, tip: "顶刊，本科生独立投稿难度极大。建议作为二作跟随导师投稿。", url: "https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=34", publisher: "IEEE" },
  { id: "j2", name: "Pattern Recognition", abbr: "PR", level: "SCI Q1 / CCF-B", discipline: "模式识别/CV", impactFactor: "8.0", reviewCycle: "2-4 个月", acceptanceRate: "~20%", friendliness: 3, tip: "审稿相对较快，对实验充分的工作友好。本科生有导师指导可尝试。", url: "https://www.journals.elsevier.com/pattern-recognition", publisher: "Elsevier" },
  { id: "j3", name: "Knowledge-Based Systems", abbr: "KBS", level: "SCI Q1", discipline: "AI/知识工程", impactFactor: "8.8", reviewCycle: "1-3 个月", acceptanceRate: "~22%", friendliness: 4, tip: "审稿周期短，对应用型创新工作友好。本科生首投推荐选择之一。", url: "https://www.journals.elsevier.com/knowledge-based-systems", publisher: "Elsevier" },
  { id: "j4", name: "Applied Soft Computing", abbr: "ASOC", level: "SCI Q1", discipline: "计算智能", impactFactor: "8.7", reviewCycle: "2-3 个月", acceptanceRate: "~25%", friendliness: 4, tip: "对软计算方法的应用创新较友好，适合有完整实验的本科生论文。", url: "https://www.journals.elsevier.com/applied-soft-computing", publisher: "Elsevier" },
  { id: "j5", name: "Expert Systems with Applications", abbr: "ESWA", level: "SCI Q1", discipline: "专家系统/AI 应用", impactFactor: "8.5", reviewCycle: "2-4 个月", acceptanceRate: "~20%", friendliness: 4, tip: "偏应用导向，实验设计完善即可。本科生投稿成功率相对较高的 Q1 期刊。", url: "https://www.journals.elsevier.com/expert-systems-with-applications", publisher: "Elsevier" },
  { id: "j6", name: "计算机学报", abbr: "计算机学报", level: "中文 CCF-A / 北大核心", discipline: "计算机", impactFactor: "-", reviewCycle: "3-6 个月", acceptanceRate: "~15%", friendliness: 3, tip: "中文顶刊，对理论和系统创新要求较高。以中文写作对本科生门槛相对低于英文顶刊。", url: "http://cjc.ict.ac.cn/", publisher: "中国计算机学会" },
  { id: "j7", name: "软件学报", abbr: "软件学报", level: "中文 CCF-A / 北大核心", discipline: "软件工程", impactFactor: "-", reviewCycle: "3-6 个月", acceptanceRate: "~15%", friendliness: 3, tip: "中文 CCF-A 期刊，保研认可度高。对软件系统和方法论有较高要求。", url: "http://www.jos.org.cn/", publisher: "中国科学院软件研究所" },
  { id: "j8", name: "Neurocomputing", abbr: "NEUCOM", level: "SCI Q2 / CCF-C", discipline: "神经计算/深度学习", impactFactor: "6.0", reviewCycle: "2-4 个月", acceptanceRate: "~30%", friendliness: 4, tip: "深度学习方向常投期刊，接受率相对友好。适合本科生作为第一篇 SCI 的目标。", url: "https://www.journals.elsevier.com/neurocomputing", publisher: "Elsevier" },
  { id: "j9", name: "经济研究", abbr: "经济研究", level: "CSSCI / 北大核心", discipline: "经济学", impactFactor: "-", reviewCycle: "3-6 个月", acceptanceRate: "~5%", friendliness: 2, tip: "经济学最高权威期刊，本科生独立发表极其困难。建议跟随导师合作。", url: "http://www.erj.cn/", publisher: "中国社会科学院经济研究所" },
  { id: "j10", name: "管理世界", abbr: "管理世界", level: "CSSCI / 北大核心", discipline: "管理学", impactFactor: "-", reviewCycle: "3-6 个月", acceptanceRate: "~5%", friendliness: 2, tip: "管理学最高权威期刊之一，发表难度极高。可作为远期目标。", url: "http://www.mwm.net.cn/", publisher: "国务院发展研究中心" },
];

const mockConferences: Conference[] = [
  { id: "cf1", name: "AAAI Conference on Artificial Intelligence", abbr: "AAAI", level: "CCF-A", discipline: "人工智能", deadlineMonth: "8 月", acceptanceRate: "~20%", friendliness: 3, tip: "AI 方向顶会，接受率逐年下降但仍相对友好。Workshop 论文适合本科生尝试。", url: "https://aaai.org/", location: "全球轮换" },
  { id: "cf2", name: "IEEE/CVF Conference on Computer Vision and Pattern Recognition", abbr: "CVPR", level: "CCF-A", discipline: "计算机视觉", deadlineMonth: "11 月", acceptanceRate: "~25%", friendliness: 2, tip: "CV 方向最顶级会议，竞争激烈。本科生建议以二作/三作参与。", url: "https://cvpr.thecvf.com/", location: "全球轮换" },
  { id: "cf3", name: "Annual Meeting of the Association for Computational Linguistics", abbr: "ACL", level: "CCF-A", discipline: "自然语言处理", deadlineMonth: "1 月", acceptanceRate: "~22%", friendliness: 3, tip: "NLP 方向顶会，Findings 接收通道对创新性要求稍低，适合首次投稿。", url: "https://www.aclweb.org/", location: "全球轮换" },
  { id: "cf4", name: "International Joint Conference on Artificial Intelligence", abbr: "IJCAI", level: "CCF-A", discipline: "人工智能", deadlineMonth: "1 月", acceptanceRate: "~15%", friendliness: 3, tip: "AI 领域历史最悠久的顶会之一，审稿严格但公正。适合有扎实理论基础的工作。", url: "https://www.ijcai.org/", location: "全球轮换" },
  { id: "cf5", name: "International Conference on Machine Learning", abbr: "ICML", level: "CCF-A", discipline: "机器学习", deadlineMonth: "1 月", acceptanceRate: "~22%", friendliness: 2, tip: "ML 方向最顶级会议，对理论创新要求高。本科生建议以合作者身份参与。", url: "https://icml.cc/", location: "全球轮换" },
  { id: "cf6", name: "ACM SIGKDD Conference on Knowledge Discovery and Data Mining", abbr: "KDD", level: "CCF-A", discipline: "数据挖掘", deadlineMonth: "2 月", acceptanceRate: "~20%", friendliness: 3, tip: "数据挖掘顶会，Applied Data Science Track 对应用型工作更友好。", url: "https://kdd.org/", location: "全球轮换" },
  { id: "cf7", name: "ACM International Conference on Information and Knowledge Management", abbr: "CIKM", level: "CCF-B", discipline: "信息管理", deadlineMonth: "5 月", acceptanceRate: "~22%", friendliness: 4, tip: "CCF-B 中接受率相对友好的会议，Short Paper 适合作为本科生第一篇英文会议论文。", url: "https://www.cikm2024.org/", location: "全球轮换" },
  { id: "cf8", name: "International Conference on Computational Linguistics", abbr: "COLING", level: "CCF-B", discipline: "自然语言处理", deadlineMonth: "3 月", acceptanceRate: "~30%", friendliness: 4, tip: "NLP 方向 CCF-B 会议，接受率较高。适合本科生作为首次投稿目标。", url: "https://coling2024.org/", location: "全球轮换" },
];

const FRIENDLINESS_LABELS = ["", "极难", "较难", "中等", "友好", "非常友好"];

export default function JournalsPage() {
  const [tab, setTab] = useState<Tab>("journals");
  const [keyword, setKeyword] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState("");

  const journalLevels = Array.from(new Set(mockJournals.map((j) => j.level)));
  const confLevels = Array.from(new Set(mockConferences.map((c) => c.level)));
  const journalDiscs = Array.from(new Set(mockJournals.map((j) => j.discipline)));
  const confDiscs = Array.from(new Set(mockConferences.map((c) => c.discipline)));

  const levels = tab === "journals" ? journalLevels : confLevels;
  const discs = tab === "journals" ? journalDiscs : confDiscs;

  const filteredJournals = mockJournals.filter((j) => {
    if (keyword && !j.name.toLowerCase().includes(keyword.toLowerCase()) && !j.abbr.toLowerCase().includes(keyword.toLowerCase()) && !j.discipline.includes(keyword)) return false;
    if (levelFilter && j.level !== levelFilter) return false;
    if (disciplineFilter && j.discipline !== disciplineFilter) return false;
    return true;
  });

  const filteredConfs = mockConferences.filter((c) => {
    if (keyword && !c.name.toLowerCase().includes(keyword.toLowerCase()) && !c.abbr.toLowerCase().includes(keyword.toLowerCase()) && !c.discipline.includes(keyword)) return false;
    if (levelFilter && c.level !== levelFilter) return false;
    if (disciplineFilter && c.discipline !== disciplineFilter) return false;
    return true;
  });

  const clearFilters = () => { setKeyword(""); setLevelFilter(""); setDisciplineFilter(""); };
  const hasFilters = keyword || levelFilter || disciplineFilter;

  const switchTab = (t: Tab) => { setTab(t); setLevelFilter(""); setDisciplineFilter(""); };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 标题 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <BookOpen className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">期刊与会议</h1>
        </div>
        <p className="text-muted-foreground text-sm">适合本科生投稿的期刊与学术会议 — 含级别、影响因子、本科生友好度评估</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/50 w-fit mb-6">
        <button onClick={() => switchTab("journals")} className={cn("px-5 py-2 rounded-lg text-sm font-medium transition-all", tab === "journals" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
          <FileText className="h-4 w-4 inline mr-1.5 -mt-0.5" />期刊
        </button>
        <button onClick={() => switchTab("conferences")} className={cn("px-5 py-2 rounded-lg text-sm font-medium transition-all", tab === "conferences" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
          <Users className="h-4 w-4 inline mr-1.5 -mt-0.5" />学术会议
        </button>
      </div>

      {/* 筛选 */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索名称、缩写、学科..." value={keyword} onChange={(e) => setKeyword(e.target.value)} className="pl-9 rounded-xl" />
          {keyword && <button onClick={() => setKeyword("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-muted-foreground" /></button>}
        </div>
        <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="h-9 rounded-xl border bg-background px-3 text-sm">
          <option value="">全部级别</option>
          {levels.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={disciplineFilter} onChange={(e) => setDisciplineFilter(e.target.value)} className="h-9 rounded-xl border bg-background px-3 text-sm">
          <option value="">全部学科</option>
          {discs.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
            <X className="h-3 w-3 mr-1" /> 清除
          </Button>
        )}
      </div>

      {/* 期刊列表 */}
      {tab === "journals" && (
        <>
          <p className="text-sm text-muted-foreground mb-4">共 {filteredJournals.length} 本期刊</p>
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredJournals.map((j) => (
                <motion.div key={j.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Card>
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="text-base font-bold">{j.abbr}</h3>
                            <Badge variant="secondary" className="text-[10px]">{j.level}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 truncate">{j.name}</p>
                          <p className="text-xs text-muted-foreground mb-3">{j.publisher} · {j.discipline}</p>
                          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground mb-3">
                            {j.impactFactor !== "-" && <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> IF: {j.impactFactor}</span>}
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> 审稿周期：{j.reviewCycle}</span>
                            <span className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /> 录用率：{j.acceptanceRate}</span>
                          </div>
                          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/30 px-3 py-2">
                            <p className="text-xs text-blue-800 dark:text-blue-300">{j.tip}</p>
                          </div>
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 shrink-0">
                          <div>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star key={i} className={cn("h-3.5 w-3.5", i < j.friendliness ? "fill-violet-400 text-violet-400" : "text-gray-200 dark:text-gray-700")} />
                              ))}
                            </div>
                            <span className="text-[10px] text-muted-foreground block text-right">{FRIENDLINESS_LABELS[j.friendliness]}</span>
                          </div>
                          <a href={j.url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="text-xs h-8 rounded-lg">
                              <ExternalLink className="h-3.5 w-3.5 mr-1" /> 官网
                            </Button>
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* 会议列表 */}
      {tab === "conferences" && (
        <>
          <p className="text-sm text-muted-foreground mb-4">共 {filteredConfs.length} 个学术会议</p>
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredConfs.map((c) => (
                <motion.div key={c.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Card>
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="text-base font-bold">{c.abbr}</h3>
                            <Badge variant="secondary" className="text-[10px]">{c.level}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 truncate">{c.name}</p>
                          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground mb-3">
                            <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {c.discipline}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> 截稿：{c.deadlineMonth}</span>
                            <span className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /> 录用率：{c.acceptanceRate}</span>
                          </div>
                          <div className="rounded-lg bg-violet-50 dark:bg-violet-900/10 border border-violet-200/50 dark:border-violet-800/30 px-3 py-2">
                            <p className="text-xs text-violet-800 dark:text-violet-300">{c.tip}</p>
                          </div>
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 shrink-0">
                          <div>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star key={i} className={cn("h-3.5 w-3.5", i < c.friendliness ? "fill-violet-400 text-violet-400" : "text-gray-200 dark:text-gray-700")} />
                              ))}
                            </div>
                            <span className="text-[10px] text-muted-foreground block text-right">{FRIENDLINESS_LABELS[c.friendliness]}</span>
                          </div>
                          <a href={c.url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="text-xs h-8 rounded-lg">
                              <ExternalLink className="h-3.5 w-3.5 mr-1" /> 官网
                            </Button>
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {((tab === "journals" && filteredJournals.length === 0) || (tab === "conferences" && filteredConfs.length === 0)) && (
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">没有找到匹配的{tab === "journals" ? "期刊" : "会议"}</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={clearFilters}>清除筛选条件</Button>
        </div>
      )}
    </motion.div>
  );
}
