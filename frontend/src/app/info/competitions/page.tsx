"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Search, Filter, Calendar, Star, ExternalLink,
  Clock, Users, Tag, X, ChevronDown, Award, Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from "next/link";
import FavoriteButton from "@/components/common/FavoriteButton";

interface Competition {
  id: string;
  name: string;
  level: "国际级" | "国家级" | "省级";
  organizer: string;
  disciplines: string[];
  registrationPeriod: string;
  competitionPeriod: string;
  status: "报名中" | "即将开始" | "进行中" | "已结束";
  rating: number;
  description: string;
  baoyanNote: string;
  url: string;
  frequency: string;
  participants: string;
}

const mockCompetitions: Competition[] = [
  {
    id: "c1", name: "全国大学生数学建模竞赛", level: "国家级",
    organizer: "中国工业与应用数学学会", disciplines: ["数学", "计算机", "工学"],
    registrationPeriod: "每年 6 月 - 9 月", competitionPeriod: "每年 9 月（3 天）",
    status: "即将开始", rating: 5,
    description: "中国规模最大的基础性学科竞赛，培养创新意识和团队合作精神，每年约 4 万队参加。",
    baoyanNote: "绝大多数 985/211 高校认可，国一/国二均可作为保研加分项，含金量极高。",
    url: "http://www.mcm.edu.cn/", frequency: "每年一届", participants: "~12 万人",
  },
  {
    id: "c2", name: "ACM-ICPC 国际大学生程序设计竞赛", level: "国际级",
    organizer: "ACM / ICPC Foundation", disciplines: ["计算机"],
    registrationPeriod: "每年 9 月 - 10 月", competitionPeriod: "区域赛 10-12 月 / 全球总决赛次年",
    status: "已结束", rating: 5,
    description: "全球历史最悠久、规模最大的大学生编程竞赛，被誉为计算机领域的「奥林匹克」。三人团队赛。",
    baoyanNote: "CS 方向含金量最高的竞赛之一，区域赛金/银牌对保研帮助极大，部分高校可直接免试录取。",
    url: "https://icpc.global/", frequency: "每年一届", participants: "全球 ~5 万队",
  },
  {
    id: "c3", name: "\"挑战杯\"全国大学生课外学术科技作品竞赛", level: "国家级",
    organizer: "共青团中央 / 中国科协 / 教育部 / 全国学联", disciplines: ["全学科"],
    registrationPeriod: "每两年举办，上一年启动", competitionPeriod: "奇数年 10-11 月决赛",
    status: "即将开始", rating: 5,
    description: "被誉为中国大学生科技创新的「奥林匹克」，涵盖自然科学、哲学社会科学、科技发明三大类。",
    baoyanNote: "几乎所有高校保研细则均有明确加分条款，国奖特等/一等含金量极高。",
    url: "https://www.tiaozhanbei.net/", frequency: "两年一届", participants: "~200 万人",
  },
  {
    id: "c4", name: "美国大学生数学建模竞赛 (MCM/ICM)", level: "国际级",
    organizer: "COMAP (美国数学及应用联合会)", disciplines: ["数学", "工学", "交叉学科"],
    registrationPeriod: "每年 11 月 - 次年 1 月", competitionPeriod: "每年 2 月（4 天）",
    status: "已结束", rating: 5,
    description: "全球最具影响力的数学建模竞赛之一，以英文论文形式提交，锻炼学术写作能力。",
    baoyanNote: "F 奖（Finalist）及以上等级被多数高校认可为省级以上获奖，M 奖（Meritorious）含金量很高。",
    url: "https://www.comap.com/contests/mcm-icm", frequency: "每年一届", participants: "全球 ~2.7 万队",
  },
  {
    id: "c5", name: "\"互联网+\"大学生创新创业大赛", level: "国家级",
    organizer: "教育部", disciplines: ["全学科"],
    registrationPeriod: "每年 4 月 - 6 月", competitionPeriod: "每年 7-10 月（校赛→省赛→国赛）",
    status: "报名中", rating: 4,
    description: "中国最大的创新创业赛事，覆盖面广、参与人数多。设有主赛道、青年红色筑梦之旅赛道等。",
    baoyanNote: "国赛金/银/铜奖均有加分，省赛金奖部分高校也认可。对展示综合能力有帮助。",
    url: "https://cy.ncss.cn/", frequency: "每年一届", participants: "~1500 万人",
  },
  {
    id: "c6", name: "全国大学生英语竞赛 (NECCS)", level: "国家级",
    organizer: "高等学校大学外语教学指导委员会 / 高等学校大学外语教学研究会", disciplines: ["外语"],
    registrationPeriod: "每年 1 月 - 3 月", competitionPeriod: "初赛 4 月 / 决赛 5 月",
    status: "已结束", rating: 4,
    description: "全国唯一的大学生英语综合能力竞赛，分为 A、B、C、D 四个类别，覆盖各层次学生。",
    baoyanNote: "特等奖、一等奖被多数高校认可为保研加分项，证明英语综合能力的有力凭证。",
    url: "http://www.chinaneccs.cn/", frequency: "每年一届", participants: "~120 万人",
  },
  {
    id: "c7", name: "全国大学生电子设计竞赛", level: "国家级",
    organizer: "教育部 / 工业和信息化部", disciplines: ["电子", "通信", "计算机", "自动化"],
    registrationPeriod: "每两年举办，当年 3-5 月报名", competitionPeriod: "偶数年 8 月（4 天 3 夜）",
    status: "即将开始", rating: 4,
    description: "面向电子信息类专业的实践性竞赛，强调动手能力和工程实现，题目涵盖模拟电路、数字系统、信号处理等。",
    baoyanNote: "EE/CS 方向认可度高，国一等奖对保研加分明显。锻炼硬件+软件综合能力。",
    url: "http://nuedc.xjtu.edu.cn/", frequency: "两年一届", participants: "~10 万人",
  },
  {
    id: "c8", name: "中国大学生计算机设计大赛", level: "国家级",
    organizer: "教育部高等学校计算机类专业教学指导委员会", disciplines: ["计算机"],
    registrationPeriod: "每年 3 月 - 5 月", competitionPeriod: "每年 7-8 月决赛",
    status: "即将开始", rating: 3,
    description: "涵盖软件应用与开发、微课与教学辅助、数媒设计、人工智能等多个类别，注重作品完整性。",
    baoyanNote: "部分高校认可为省级以上学科竞赛，一等奖有一定加分效果。适合有完整项目的同学参赛。",
    url: "http://jsjds.blcu.edu.cn/", frequency: "每年一届", participants: "~6 万人",
  },
  {
    id: "c9", name: "RoboMaster 机甲大师赛", level: "国家级",
    organizer: "共青团中央 / DJI 大疆创新", disciplines: ["机械", "自动化", "计算机", "电子"],
    registrationPeriod: "每年 1 月 - 3 月", competitionPeriod: "每年 5-8 月（区域赛→全国赛）",
    status: "进行中", rating: 4,
    description: "机器人对抗赛事，强调多学科交叉和团队协作。参赛队伍需自主设计、制造、操控多台机器人。",
    baoyanNote: "工科方向认可度高，尤其是机器人/自动化方向。展示系统工程能力的绝佳平台。",
    url: "https://www.robomaster.com/", frequency: "每年一届", participants: "~500 支队伍",
  },
  {
    id: "c10", name: "全国大学生统计建模大赛", level: "国家级",
    organizer: "中国统计教育学会", disciplines: ["统计", "数学", "经济"],
    registrationPeriod: "每年 5 月 - 7 月", competitionPeriod: "每年 9-11 月",
    status: "即将开始", rating: 3,
    description: "面向统计学、数学、经济学等专业学生的应用型竞赛，强调数据分析与统计建模能力。",
    baoyanNote: "统计/经济方向院校认可度较高，全国一等奖可作为保研加分凭证。",
    url: "http://tjjm.stats.gov.cn/", frequency: "每年一届", participants: "~8 万人",
  },
];

const LEVEL_COLORS: Record<string, string> = {
  "国际级": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "国家级": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "省级": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

const STATUS_COLORS: Record<string, string> = {
  "报名中": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "即将开始": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "进行中": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "已结束": "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
};

export default function CompetitionsPage() {
  const [keyword, setKeyword] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState("");

  const allDisciplines = Array.from(new Set(mockCompetitions.flatMap((c) => c.disciplines))).sort();

  const filtered = mockCompetitions.filter((c) => {
    if (keyword && !c.name.includes(keyword) && !c.description.includes(keyword) && !c.disciplines.some(d => d.includes(keyword))) return false;
    if (levelFilter && c.level !== levelFilter) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    if (disciplineFilter && !c.disciplines.includes(disciplineFilter)) return false;
    return true;
  });

  const clearFilters = () => { setKeyword(""); setLevelFilter(""); setStatusFilter(""); setDisciplineFilter(""); };
  const hasFilters = keyword || levelFilter || statusFilter || disciplineFilter;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Trophy className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">竞赛信息</h1>
        </div>
        <p className="text-muted-foreground text-sm">保研加分竞赛指南 — 含金量评估、报名时间、适用学科一览</p>
      </div>

      {/* 筛选栏 */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索竞赛名称、学科..." value={keyword} onChange={(e) => setKeyword(e.target.value)} className="pl-9 rounded-xl" />
          {keyword && <button onClick={() => setKeyword("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-muted-foreground" /></button>}
        </div>

        <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="h-9 rounded-xl border bg-background px-3 text-sm">
          <option value="">全部级别</option>
          <option value="国际级">国际级</option>
          <option value="国家级">国家级</option>
          <option value="省级">省级</option>
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-xl border bg-background px-3 text-sm">
          <option value="">全部状态</option>
          <option value="报名中">报名中</option>
          <option value="即将开始">即将开始</option>
          <option value="进行中">进行中</option>
          <option value="已结束">已结束</option>
        </select>

        <select value={disciplineFilter} onChange={(e) => setDisciplineFilter(e.target.value)} className="h-9 rounded-xl border bg-background px-3 text-sm">
          <option value="">全部学科</option>
          {allDisciplines.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
            <X className="h-3 w-3 mr-1" /> 清除筛选
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-4">共 {filtered.length} 项竞赛</p>

      {/* 竞赛列表 */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((comp) => (
            <motion.div key={comp.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Card className="overflow-hidden">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      {/* 标题行 */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-base font-bold">{comp.name}</h3>
                        <Badge className={cn("text-[10px] font-medium", LEVEL_COLORS[comp.level])}>{comp.level}</Badge>
                        <Badge className={cn("text-[10px] font-medium", STATUS_COLORS[comp.status])}>{comp.status}</Badge>
                      </div>

                      {/* 主办单位 */}
                      <p className="text-xs text-muted-foreground mb-2">{comp.organizer}</p>

                      {/* 简介 */}
                      <p className="text-sm text-foreground/80 mb-3 leading-relaxed">{comp.description}</p>

                      {/* 信息行 */}
                      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> 报名：{comp.registrationPeriod}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> 比赛：{comp.competitionPeriod}</span>
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {comp.participants}</span>
                      </div>

                      {/* 学科标签 */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {comp.disciplines.map((d) => (
                          <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>
                        ))}
                      </div>

                      {/* 保研加分说明 */}
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30 px-3 py-2">
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                          <Flame className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span><strong>保研加分：</strong>{comp.baoyanNote}</span>
                        </p>
                      </div>
                    </div>

                    {/* 右侧：含金量 + 操作 */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 shrink-0">
                      {/* 含金量 */}
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} className={cn("h-4 w-4", i < comp.rating ? "fill-amber-400 text-amber-400" : "text-gray-200 dark:text-gray-700")} />
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground">含金量</span>

                      <div className="flex items-center gap-2 mt-1">
                        <a href={comp.url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="text-xs h-8 rounded-lg">
                            <ExternalLink className="h-3.5 w-3.5 mr-1" /> 官网
                          </Button>
                        </a>
                        <FavoriteButton type="notice" targetId={parseInt(comp.id.replace("c",""))} title={comp.name} size="sm" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">没有找到匹配的竞赛</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={clearFilters}>清除筛选条件</Button>
        </div>
      )}
    </div>
  );
}
