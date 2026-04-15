"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Send, Smile, Frown, Meh, Flame, Zap,
  Sun, Moon, CloudRain, Wind, Leaf, Music,
  BookOpen, Video, Headphones, Dumbbell,
  ChevronRight, RotateCcw, Sparkles, User, Bot,
  Shield, Brain, Coffee, MessageCircle, Mic, MicOff,
  Gamepad2, Timer, RefreshCw, Trophy, Star,
  History, Volume2, Pause, Play, CheckCircle2, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { MentalMessage, MentalTopic, MentalAssessment, MentalMode, MiniGame } from "@/types/ai-tools";

/* ================================================================
   常量 & Mock
   ================================================================ */

const TOPICS: { id: MentalTopic; icon: React.ReactNode; color: string; desc: string }[] = [
  { id: "考研焦虑", icon: <Brain className="h-5 w-5" />, color: "text-red-500 bg-red-50", desc: "对保研结果感到焦虑不安" },
  { id: "面试紧张", icon: <Zap className="h-5 w-5" />, color: "text-amber-500 bg-amber-50", desc: "面试前后的紧张情绪" },
  { id: "选择困难", icon: <Wind className="h-5 w-5" />, color: "text-blue-500 bg-blue-50", desc: "在多个选择间犹豫不决" },
  { id: "人际关系", icon: <Heart className="h-5 w-5" />, color: "text-pink-500 bg-pink-50", desc: "与同学、导师的关系困扰" },
  { id: "时间管理", icon: <Coffee className="h-5 w-5" />, color: "text-emerald-500 bg-emerald-50", desc: "感觉时间不够用、效率低" },
  { id: "自我怀疑", icon: <CloudRain className="h-5 w-5" />, color: "text-violet-500 bg-violet-50", desc: "对自己的能力产生怀疑" },
  { id: "其他", icon: <MessageCircle className="h-5 w-5" />, color: "text-gray-500 bg-gray-50", desc: "其他心理困扰" },
];

const MOOD_OPTIONS = [
  { emoji: "😊", label: "开心", color: "bg-green-50 border-green-200 text-green-700" },
  { emoji: "😐", label: "一般", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
  { emoji: "😟", label: "低落", color: "bg-blue-50 border-blue-200 text-blue-700" },
  { emoji: "😫", label: "焦虑", color: "bg-red-50 border-red-200 text-red-700" },
  { emoji: "😤", label: "烦躁", color: "bg-orange-50 border-orange-200 text-orange-700" },
];

const MOCK_REPLIES: Record<string, string[]> = {
  "考研焦虑": [
    "我理解你的焦虑，保研确实是一个充满不确定性的过程。首先，请记住焦虑是正常的情绪反应，它说明你在乎这件事。\n\n让我们一起来分析一下：你目前最担心的具体是什么呢？是成绩排名、科研经历，还是面试表现？",
    "你说得对，很多同学都有类似的感受。我建议你可以试试「5-4-3-2-1」接地技巧：看到5样东西、触摸4样东西、听到3种声音、闻到2种气味、尝到1种味道。这能帮助你回到当下。\n\n另外，把你的担忧写下来，然后逐一分析哪些是你能控制的、哪些是不能控制的，把精力集中在能控制的部分。",
    "保研焦虑很常见，你并不孤单。研究表明，适度的焦虑其实能提升表现。关键是不要让焦虑失控。\n\n我建议你：\n1. 制定一个清晰的时间表，把大目标拆解成小步骤\n2. 每天留出 15 分钟做深呼吸或冥想\n3. 和信任的朋友或家人聊聊你的感受\n4. 保持规律的运动和睡眠\n\n你觉得哪一点最适合你现在开始尝试？",
  ],
  "default": [
    "谢谢你愿意和我分享。我在认真倾听你说的每一句话。能告诉我更多关于这个情况的细节吗？",
    "我能感受到这对你来说很不容易。你的感受是完全合理的。让我们一起来看看有什么方法可以帮助你。",
    "你已经迈出了很重要的一步——愿意表达和面对自己的情绪。这本身就需要勇气。我们可以慢慢来，不着急。",
  ],
};

const MOCK_ASSESSMENT: MentalAssessment = {
  stress_level: 6, anxiety_level: 7, confidence_level: 5,
  suggestions: [
    "建议每天进行 10-15 分钟的正念冥想练习",
    "保持规律的作息时间，确保每天 7-8 小时睡眠",
    "适当运动，每周至少 3 次有氧运动",
    "与信任的朋友或家人保持沟通",
    "如果焦虑持续加重，建议寻求专业心理咨询",
  ],
  resources: [
    { title: "正念冥想入门指南", type: "文章", url: "#" },
    { title: "5 分钟呼吸放松练习", type: "音频", url: "#" },
    { title: "考研压力管理技巧", type: "视频", url: "#" },
    { title: "渐进式肌肉放松训练", type: "练习", url: "#" },
  ],
};

const MINI_GAMES: MiniGame[] = [
  { id: "g1", type: "breathing", title: "呼吸放松", description: "跟随节奏进行 4-7-8 呼吸法，快速缓解焦虑", duration: 3, icon: "🌬️" },
  { id: "g2", type: "word_relay", title: "保研知识接龙", description: "用保研相关词汇进行接龙，寓教于乐", duration: 5, icon: "🔤" },
  { id: "g3", type: "knowledge_quiz", title: "保研知识问答", description: "趣味问答测试你的保研知识储备", duration: 5, icon: "🧠" },
  { id: "g4", type: "affirmation", title: "正能量卡片", description: "翻转卡片获取今日专属鼓励语", duration: 1, icon: "💪" },
];

const genId = () => Math.random().toString(36).slice(2, 10);

/* ================================================================
   顶部 Tab
   ================================================================ */

const MENTAL_TABS = [
  { id: "chat", label: "心理对话", icon: Heart },
  { id: "games", label: "解压空间", icon: Gamepad2 },
  { id: "history", label: "对话记录", icon: History },
];

/* ================================================================
   话题选择（增强版）
   ================================================================ */

function TopicSelector({ onSelect, mode, onModeChange }: {
  onSelect: (topic: MentalTopic, mood: string) => void;
  mode: MentalMode;
  onModeChange: (m: MentalMode) => void;
}) {
  const [selectedTopic, setSelectedTopic] = useState<MentalTopic | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/10 to-rose-500/10 mb-4">
          <Heart className="h-8 w-8 text-pink-600" />
        </div>
        <h2 className="text-2xl font-bold">心理支持</h2>
        <p className="text-muted-foreground mt-2">保研路上的温暖陪伴，倾听你的心声</p>
        <p className="text-xs text-muted-foreground mt-1">
          <Shield className="inline h-3 w-3 mr-1" />
          你的对话内容完全保密，不会被任何人看到
        </p>
      </div>

      {/* 交互模式选择 */}
      <Card className="shadow-sm mb-6 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-pink-500 to-rose-500" />
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">选择交流方式</h3>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => onModeChange("text")}
              className={cn("relative rounded-xl border-2 p-5 text-left transition-all",
                mode === "text" ? "border-pink-400 bg-pink-50/50 shadow-sm dark:bg-pink-500/5" : "border-transparent bg-muted/30 hover:bg-muted/50")}>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-100 text-pink-600"><MessageCircle className="h-5 w-5" /></div>
                <p className="font-semibold text-sm">文字交流</p>
              </div>
              <p className="text-xs text-muted-foreground">通过文字倾诉和交流，可以慢慢组织语言</p>
              {mode === "text" && <div className="absolute top-3 right-3"><CheckCircle2 className="h-5 w-5 text-pink-500" /></div>}
            </button>
            <button onClick={() => onModeChange("voice")}
              className={cn("relative rounded-xl border-2 p-5 text-left transition-all",
                mode === "voice" ? "border-pink-400 bg-pink-50/50 shadow-sm dark:bg-pink-500/5" : "border-transparent bg-muted/30 hover:bg-muted/50")}>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600"><Mic className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold text-sm">语音交流</p>
                  <Badge className="text-xs bg-amber-100 text-amber-700 mt-0.5">即将上线</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">语音对话，更自然的交流方式，像和朋友聊天</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 心情选择 */}
      <Card className="shadow-sm mb-6">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">你现在的心情如何？</h3>
          <div className="flex gap-3 justify-center">
            {MOOD_OPTIONS.map((m) => (
              <button key={m.emoji} onClick={() => setSelectedMood(m.emoji)}
                className={cn("flex flex-col items-center gap-1.5 rounded-xl border-2 px-5 py-4 transition-all",
                  selectedMood === m.emoji ? m.color + " shadow-sm" : "border-transparent bg-muted/30 hover:bg-muted/50 hover:shadow-sm hover:-translate-y-0.5")}>
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-xs font-medium">{m.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 话题选择 */}
      <Card className="shadow-sm mb-6">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">你想聊聊什么？</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TOPICS.map((t) => (
              <button key={t.id} onClick={() => setSelectedTopic(t.id)}
                className={cn("flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
                  selectedTopic === t.id ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-muted/30 hover:bg-muted/50 hover:shadow-md hover:-translate-y-0.5")}>
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", t.color)}>{t.icon}</div>
                <div>
                  <p className="font-medium text-sm">{t.id}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => selectedTopic && selectedMood && onSelect(selectedTopic, selectedMood)}
        disabled={!selectedTopic || !selectedMood || mode === "voice"} size="lg" className="w-full h-12 text-base gap-2 bg-pink-600 hover:bg-pink-700">
        <MessageCircle className="h-5 w-5" /> {mode === "voice" ? "语音交流即将上线" : "开始对话"}
      </Button>
    </div>
  );
}

/* ================================================================
   解压小游戏空间
   ================================================================ */

function MiniGameSpace() {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [breathPhase, setBreathPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [breathCount, setBreathCount] = useState(0);
  const [affirmation, setAffirmation] = useState<string | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);

  const affirmations = [
    "你已经很努力了，结果不会辜负你的付出 💪",
    "每一步积累都是在为未来铺路，相信过程 🌟",
    "焦虑说明你在乎，但别忘了享受当下 🌈",
    "你比自己想象的更优秀，加油！🔥",
    "保研只是人生的一个节点，无论结果如何你都很棒 ❤️",
    "今天的你比昨天更接近目标了 🎯",
    "休息不是偷懒，是为了走更远的路 🌿",
    "你的独特经历就是你最大的竞争力 ✨",
  ];

  const quizQuestions = [
    { q: "夏令营一般在什么时间举办？", options: ["3-4月", "5-7月", "9-10月", "11-12月"], answer: 1 },
    { q: "保研中「推免」的全称是？", options: ["推荐免费", "推荐免试", "推荐免修", "推荐免考"], answer: 1 },
    { q: "以下哪个不是保研的常见加分项？", options: ["SCI论文", "国家级竞赛", "学生会主席", "发明专利"], answer: 2 },
    { q: "六级多少分通常被认为是保研的加分项？", options: ["425+", "500+", "550+", "600+"], answer: 2 },
  ];

  // 呼吸练习
  useEffect(() => {
    if (activeGame !== "g1") return;
    const phases: Array<{ phase: "inhale" | "hold" | "exhale"; duration: number }> = [
      { phase: "inhale", duration: 4000 },
      { phase: "hold", duration: 7000 },
      { phase: "exhale", duration: 8000 },
    ];
    let idx = 0;
    const run = () => {
      setBreathPhase(phases[idx % 3].phase);
      if (idx % 3 === 0 && idx > 0) setBreathCount((p) => p + 1);
      idx++;
    };
    run();
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timeout = setTimeout(() => { run(); schedule(); }, phases[(idx - 1) % 3].duration);
    };
    schedule();
    return () => clearTimeout(timeout);
  }, [activeGame]);

  if (!activeGame) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 mb-4">
            <Gamepad2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold">解压空间</h2>
          <p className="text-muted-foreground mt-2">放松一下，用轻松的方式缓解保研压力</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MINI_GAMES.map((game) => (
            <Card key={game.id} className="shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => { setActiveGame(game.id); setBreathCount(0); setQuizIndex(0); setQuizScore(0); setQuizAnswer(null); setAffirmation(null); }}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{game.icon}</span>
                  <div>
                    <h3 className="font-bold text-base">{game.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs gap-1"><Timer className="h-3 w-3" /> {game.duration} 分钟</Badge>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{game.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // 呼吸放松
  if (activeGame === "g1") {
    const phaseText = breathPhase === "inhale" ? "吸气..." : breathPhase === "hold" ? "屏住..." : "呼气...";
    const phaseTime = breathPhase === "inhale" ? "4 秒" : breathPhase === "hold" ? "7 秒" : "8 秒";
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <h2 className="text-xl font-bold mb-2">🌬️ 呼吸放松</h2>
        <p className="text-sm text-muted-foreground mb-8">4-7-8 呼吸法：吸气 4 秒 → 屏住 7 秒 → 呼气 8 秒</p>
        <div className="relative mx-auto mb-8">
          <motion.div
            className={cn("mx-auto rounded-full flex items-center justify-center",
              breathPhase === "inhale" ? "bg-blue-100" : breathPhase === "hold" ? "bg-amber-100" : "bg-green-100")}
            animate={{ width: breathPhase === "inhale" ? 200 : breathPhase === "hold" ? 200 : 120, height: breathPhase === "inhale" ? 200 : breathPhase === "hold" ? 200 : 120 }}
            transition={{ duration: breathPhase === "inhale" ? 4 : breathPhase === "hold" ? 0.3 : 8, ease: "easeInOut" }}>
            <div className="text-center">
              <p className="text-lg font-bold">{phaseText}</p>
              <p className="text-sm text-muted-foreground">{phaseTime}</p>
            </div>
          </motion.div>
        </div>
        <p className="text-sm text-muted-foreground mb-6">已完成 {breathCount} 个循环</p>
        <Button variant="outline" onClick={() => setActiveGame(null)} className="gap-2"><ChevronRight className="h-4 w-4 rotate-180" /> 返回</Button>
      </div>
    );
  }

  // 正能量卡片
  if (activeGame === "g4") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <h2 className="text-xl font-bold mb-2">💪 正能量卡片</h2>
        <p className="text-sm text-muted-foreground mb-8">点击翻转获取今日专属鼓励</p>
        <div className="mb-8">
          {affirmation ? (
            <motion.div initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} className="mx-auto max-w-sm">
              <Card className="shadow-lg border-pink-200 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-500/10 dark:to-rose-500/10">
                <CardContent className="p-8">
                  <p className="text-lg font-medium leading-relaxed">{affirmation}</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <Card className="mx-auto max-w-sm shadow-lg cursor-pointer hover:shadow-xl transition-shadow bg-gradient-to-br from-pink-500 to-rose-500 text-white"
              onClick={() => setAffirmation(affirmations[Math.floor(Math.random() * affirmations.length)])}>
              <CardContent className="p-12 text-center">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-80" />
                <p className="text-lg font-medium">点击翻转</p>
              </CardContent>
            </Card>
          )}
        </div>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => setAffirmation(affirmations[Math.floor(Math.random() * affirmations.length)])} className="gap-2"><RefreshCw className="h-4 w-4" /> 换一张</Button>
          <Button variant="outline" onClick={() => setActiveGame(null)} className="gap-2"><ChevronRight className="h-4 w-4 rotate-180" /> 返回</Button>
        </div>
      </div>
    );
  }

  // 保研知识问答
  if (activeGame === "g3") {
    const currentQ = quizQuestions[quizIndex];
    if (!currentQ) {
      return (
        <div className="max-w-md mx-auto text-center py-10">
          <h2 className="text-xl font-bold mb-2">🧠 问答结束！</h2>
          <div className="text-5xl font-bold text-primary my-6">{quizScore}/{quizQuestions.length}</div>
          <p className="text-muted-foreground mb-6">{quizScore >= 3 ? "太棒了！你的保研知识储备很充足 🎉" : "继续加油，多了解保研相关知识 💪"}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => { setQuizIndex(0); setQuizScore(0); setQuizAnswer(null); }} className="gap-2"><RotateCcw className="h-4 w-4" /> 再来一次</Button>
            <Button variant="outline" onClick={() => setActiveGame(null)} className="gap-2"><ChevronRight className="h-4 w-4 rotate-180" /> 返回</Button>
          </div>
        </div>
      );
    }
    return (
      <div className="max-w-lg mx-auto py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">🧠 保研知识问答</h2>
          <Badge variant="outline">{quizIndex + 1}/{quizQuestions.length}</Badge>
        </div>
        <Card className="shadow-sm mb-6">
          <CardContent className="p-6">
            <h3 className="font-bold text-base mb-4">{currentQ.q}</h3>
            <div className="space-y-2">
              {currentQ.options.map((opt, i) => (
                <button key={i} onClick={() => {
                  if (quizAnswer !== null) return;
                  setQuizAnswer(i);
                  if (i === currentQ.answer) setQuizScore((p) => p + 1);
                  setTimeout(() => { setQuizIndex((p) => p + 1); setQuizAnswer(null); }, 1500);
                }}
                  className={cn("w-full rounded-xl border-2 p-4 text-left text-sm font-medium transition-all",
                    quizAnswer === null ? "hover:bg-muted/50 hover:border-primary/30" :
                    i === currentQ.answer ? "border-green-400 bg-green-50 text-green-700" :
                    quizAnswer === i ? "border-red-400 bg-red-50 text-red-700" : "opacity-50")}>
                  <span className="mr-2">{String.fromCharCode(65 + i)}.</span> {opt}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
        <Button variant="outline" onClick={() => setActiveGame(null)} className="gap-2"><ChevronRight className="h-4 w-4 rotate-180" /> 返回</Button>
      </div>
    );
  }

  // 保研知识接龙（简化版）
  return (
    <div className="max-w-md mx-auto text-center py-10">
      <h2 className="text-xl font-bold mb-2">🔤 保研知识接龙</h2>
      <p className="text-sm text-muted-foreground mb-6">即将上线，敬请期待！</p>
      <Button variant="outline" onClick={() => setActiveGame(null)} className="gap-2"><ChevronRight className="h-4 w-4 rotate-180" /> 返回</Button>
    </div>
  );
}

/* ================================================================
   对话界面（保持原有逻辑）
   ================================================================ */

function ChatRoom({ topic, mood, onEnd }: { topic: MentalTopic; mood: string; onEnd: () => void }) {
  const [messages, setMessages] = useState<MentalMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const replyIndex = useRef(0);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages]);

  useEffect(() => {
    const greeting: MentalMessage = {
      id: genId(), role: "assistant",
      content: `你好呀 ${mood}，感谢你愿意来这里聊聊。我注意到你想谈谈「${topic}」方面的困扰。\n\n请放心，这里是一个安全的空间，你可以自由地表达自己的感受。没有对错之分，我会认真倾听你说的每一句话。\n\n你可以先告诉我，最近发生了什么让你有这样的感受吗？`,
      timestamp: new Date().toISOString(),
    };
    setTimeout(() => setMessages([greeting]), 500);
  }, [topic, mood]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isTyping) return;
    setMessages((p) => [...p, { id: genId(), role: "user", content: input.trim(), timestamp: new Date().toISOString() }]);
    setInput("");
    setIsTyping(true);
    setTimeout(() => {
      const replies = MOCK_REPLIES[topic] || MOCK_REPLIES["default"];
      const reply = replies[replyIndex.current % replies.length];
      replyIndex.current++;
      setMessages((p) => [...p, { id: genId(), role: "assistant", content: reply, timestamp: new Date().toISOString() }]);
      setIsTyping(false);
    }, 1500);
  }, [input, isTyping, topic]);

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-500/5 dark:to-rose-500/5 px-5 py-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-100 text-pink-600"><Heart className="h-4.5 w-4.5" /></div>
          <div>
            <p className="font-medium text-sm">心理支持助手</p>
            <p className="text-xs text-muted-foreground">话题：{topic} · 对话将自动保存</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onEnd} className="gap-1.5">结束对话</Button>
      </div>

      <div ref={chatRef} className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                msg.role === "assistant" ? "bg-pink-100 text-pink-600" : "bg-primary/10 text-primary")}>
                {msg.role === "assistant" ? <Heart className="h-4.5 w-4.5" /> : <User className="h-4.5 w-4.5" />}
              </div>
              <div className={cn("max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-pink-50 dark:bg-pink-500/10 text-foreground")}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600"><Heart className="h-4.5 w-4.5" /></div>
            <div className="rounded-2xl bg-pink-50 dark:bg-pink-500/10 px-4 py-3">
              <div className="flex gap-1">
                {[0, 150, 300].map((d) => <div key={d} className="h-2 w-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {["我感觉压力很大", "我不知道该怎么选择", "我需要一些鼓励", "能给我一些建议吗"].map((q) => (
          <button key={q} onClick={() => setInput(q)} className="shrink-0 rounded-full border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors">{q}</button>
        ))}
      </div>

      <div className="mt-2 flex gap-3">
        <Input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="说说你的感受..." className="h-12 text-sm" disabled={isTyping} />
        <Button onClick={handleSend} disabled={!input.trim() || isTyping} size="lg" className="h-12 px-5 gap-2 bg-pink-600 hover:bg-pink-700"><Send className="h-4 w-4" /> 发送</Button>
      </div>
    </div>
  );
}

/* ================================================================
   评估报告（保持原有逻辑）
   ================================================================ */

function AssessmentPanel({ assessment, onBack }: { assessment: MentalAssessment; onBack: () => void }) {
  const levelLabel = (v: number) => v >= 8 ? "较高" : v >= 5 ? "中等" : "较低";
  const levelColor = (v: number, inverse = false) => {
    if (inverse) return v >= 8 ? "text-green-600" : v >= 5 ? "text-amber-600" : "text-red-600";
    return v >= 8 ? "text-red-600" : v >= 5 ? "text-amber-600" : "text-green-600";
  };
  const resourceIcon = (type: string) => {
    switch (type) { case "文章": return <BookOpen className="h-4 w-4" />; case "视频": return <Video className="h-4 w-4" />; case "音频": return <Headphones className="h-4 w-4" />; case "练习": return <Dumbbell className="h-4 w-4" />; default: return <BookOpen className="h-4 w-4" />; }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-pink-500 to-rose-500" />
        <CardContent className="p-8 text-center">
          <h2 className="text-xl font-bold mb-6">心理状态评估</h2>
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: "压力指数", value: assessment.stress_level, inverse: false },
              { label: "焦虑指数", value: assessment.anxiety_level, inverse: false },
              { label: "信心指数", value: assessment.confidence_level, inverse: true },
            ].map((item) => (
              <div key={item.label}>
                <div className={cn("text-3xl font-bold", levelColor(item.value, item.inverse))}>{item.value}/10</div>
                <p className="text-sm text-muted-foreground mt-1">{item.label}</p>
                <Badge variant="outline" className={cn("mt-1 text-xs", levelColor(item.value, item.inverse))}>{levelLabel(item.inverse ? 11 - item.value : item.value)}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm"><CardContent className="p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-pink-500" /> 调节建议</h3>
        <ul className="space-y-3">
          {assessment.suggestions.map((s, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600 text-xs font-bold">{i + 1}</div>{s}
            </li>
          ))}
        </ul>
      </CardContent></Card>

      <Card className="shadow-sm"><CardContent className="p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Leaf className="h-5 w-5 text-emerald-500" /> 推荐资源</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {assessment.resources.map((r, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border p-4 hover:bg-muted/30 transition-colors cursor-pointer">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">{resourceIcon(r.type)}</div>
              <div><p className="font-medium text-sm">{r.title}</p><Badge variant="outline" className="text-xs mt-0.5">{r.type}</Badge></div>
            </div>
          ))}
        </div>
      </CardContent></Card>

      <div className="text-center"><Button onClick={onBack} size="lg" className="gap-2 bg-pink-600 hover:bg-pink-700"><RotateCcw className="h-4 w-4" /> 重新开始</Button></div>
      <p className="text-center text-xs text-muted-foreground">⚠️ 本评估仅供参考，不能替代专业心理咨询。如果你感到严重的心理困扰，请及时联系学校心理咨询中心或拨打心理援助热线 400-161-9995。</p>
    </div>
  );
}

/* ================================================================
   对话历史
   ================================================================ */

function ChatHistoryPanel() {
  const mockHistory = [
    { id: "c1", topic: "考研焦虑" as MentalTopic, mood: "😫", date: "2026-03-31", messages: 12, summary: "讨论了对夏令营结果的焦虑，学习了 5-4-3-2-1 接地技巧" },
    { id: "c2", topic: "面试紧张" as MentalTopic, mood: "😟", date: "2026-03-29", messages: 8, summary: "分享了面试前的紧张情绪，制定了面试前放松计划" },
    { id: "c3", topic: "自我怀疑" as MentalTopic, mood: "😐", date: "2026-03-27", messages: 15, summary: "探讨了自我价值感，重新认识了自己的优势" },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 mb-4">
          <History className="h-8 w-8 text-violet-600" />
        </div>
        <h2 className="text-2xl font-bold">对话记录</h2>
        <p className="text-muted-foreground mt-2">回顾过往对话，追踪心理状态变化</p>
      </div>

      <div className="space-y-3">
        {mockHistory.map((h) => (
          <Card key={h.id} className="shadow-sm hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">{h.mood}</span>
                <Badge variant="outline" className="text-xs">{h.topic}</Badge>
                <span className="text-xs text-muted-foreground ml-auto">{h.date}</span>
              </div>
              <p className="text-sm text-muted-foreground">{h.summary}</p>
              <div className="flex items-center justify-between mt-3 pt-2 border-t">
                <span className="text-xs text-muted-foreground">{h.messages} 条消息</span>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Eye className="h-3 w-3" /> 查看</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   主页面
   ================================================================ */

export default function MentalPage() {
  const [activeTab, setActiveTab] = useState("chat");
  const [phase, setPhase] = useState<"select" | "chat" | "assessment">("select");
  const [topic, setTopic] = useState<MentalTopic>("考研焦虑");
  const [mood, setMood] = useState("😐");
  const [mode, setMode] = useState<MentalMode>("text");

  const handleSelect = (t: MentalTopic, m: string) => { setTopic(t); setMood(m); setPhase("chat"); };

  return (
    <div>
      {/* 顶部 Tab（仅在非对话中显示） */}
      {phase === "select" && (
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-xl bg-muted/50 backdrop-blur-sm shadow-sm p-1 gap-1">
            {MENTAL_TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  activeTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50")}>
                <tab.icon className="h-4 w-4" /> {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === "chat" && phase === "select" && (
          <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <TopicSelector onSelect={handleSelect} mode={mode} onModeChange={setMode} />
          </motion.div>
        )}
        {activeTab === "chat" && phase === "chat" && (
          <motion.div key="chat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <ChatRoom topic={topic} mood={mood} onEnd={() => setPhase("assessment")} />
          </motion.div>
        )}
        {activeTab === "chat" && phase === "assessment" && (
          <motion.div key="assessment" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <AssessmentPanel assessment={MOCK_ASSESSMENT} onBack={() => setPhase("select")} />
          </motion.div>
        )}
        {activeTab === "games" && (
          <motion.div key="games" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <MiniGameSpace />
          </motion.div>
        )}
        {activeTab === "history" && (
          <motion.div key="history" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <ChatHistoryPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
