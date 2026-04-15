"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageSquare, Send, Shield, Clock,
  Smile, Frown, Meh, ThumbsUp, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MOCK_CONFESSIONS = [
  { id: 1, content: "今天收到了梦校的拒信，感觉天都塌了。但是冷静下来想想，还有预推免的机会，不能放弃。给自己打个气，继续加油！💪", mood: "😢", likes: 89, comments: 23, time: "2 小时前", replies: ["抱抱！预推免一定可以的！", "我也被拒过，后来拿到了更好的 offer，加油！"] },
  { id: 2, content: "刚刚模拟面试被导师问到一个完全不会的问题，大脑一片空白，尴尬得想找个地缝钻进去 😂 不过这也让我知道了自己的薄弱点，回去好好补补。", mood: "😅", likes: 156, comments: 34, time: "5 小时前", replies: ["哈哈哈我也有过这种经历", "知道不足就是进步！"] },
  { id: 3, content: "看到室友已经拿到了 3 个 offer，而我还在海投，真的好焦虑。但是每个人的节奏不一样，我要按自己的步伐来。深呼吸，一切都会好的。", mood: "😟", likes: 234, comments: 56, time: "8 小时前", replies: ["每个人的时间线不一样，别比较", "你已经很努力了！"] },
  { id: 4, content: "今天导师回复了我的邮件！！！说欢迎我去面试！！！开心到飞起！！！🎉🎉🎉 感谢这段时间的努力没有白费！", mood: "🥳", likes: 567, comments: 89, time: "1 天前", replies: ["恭喜恭喜！！", "太棒了！面试加油！"] },
  { id: 5, content: "保研人的日常：白天看论文、晚上刷面经、睡前焦虑、醒来继续。虽然很累，但想到未来的自己会感谢现在的努力，就觉得值了。", mood: "💪", likes: 345, comments: 67, time: "1 天前", replies: ["说的就是我本人", "一起加油！"] },
];

const MOOD_TAGS = ["全部", "😢 难过", "😅 尴尬", "😟 焦虑", "🥳 开心", "💪 励志", "😤 吐槽"];

export default function ConfessionsPage() {
  const [newContent, setNewContent] = useState("");
  const [selectedMood, setSelectedMood] = useState("💪");
  const [filter, setFilter] = useState("全部");
  const [confessions, setConfessions] = useState(MOCK_CONFESSIONS);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleSubmit = () => {
    if (!newContent.trim()) return;
    setConfessions((prev) => [{
      id: Date.now(), content: newContent, mood: selectedMood,
      likes: 0, comments: 0, time: "刚刚", replies: [],
    }, ...prev]);
    setNewContent("");
  };

  return (
    <div>
      {/* 发布区 */}
      <Card className="shadow-sm mb-6 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-pink-500 to-rose-500" />
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-pink-500" />
            <p className="text-sm font-medium">匿名树洞</p>
            <p className="text-xs text-muted-foreground">· 你的身份完全保密</p>
          </div>
          <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)}
            placeholder="在这里倾诉你的心声，无论是喜悦、焦虑还是吐槽..."
            className="w-full rounded-xl border bg-background px-4 py-3 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-pink-200 dark:focus:ring-pink-500/30 transition-shadow" />
          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-2">
              {["😢", "😅", "😟", "🥳", "💪", "😤"].map((m) => (
                <button key={m} onClick={() => setSelectedMood(m)}
                  className={cn("h-8 w-8 rounded-full text-lg flex items-center justify-center transition-all",
                    selectedMood === m ? "bg-pink-100 ring-2 ring-pink-300 dark:bg-pink-500/20 dark:ring-pink-500/40 scale-110" : "hover:bg-muted/50")}>
                  {m}
                </button>
              ))}
            </div>
            <Button onClick={handleSubmit} disabled={!newContent.trim()} size="sm" className="gap-1.5 bg-pink-600 hover:bg-pink-700">
              <Send className="h-3.5 w-3.5" /> 匿名发布
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 筛选 */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto scrollbar-thin pb-1">
        {MOOD_TAGS.map((t) => (
          <button key={t} onClick={() => setFilter(t)}
            className={cn("rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all",
              filter === t ? "bg-pink-600 text-white shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
            {t}
          </button>
        ))}
      </div>

      {/* 树洞列表 */}
      <div className="space-y-4">
        <AnimatePresence>
          {confessions.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{c.mood}</span>
                    <span className="text-xs text-muted-foreground">{c.time}</span>
                  </div>
                  <p className="text-sm leading-relaxed mb-4">{c.content}</p>

                  {/* 互动区 */}
                  <div className="flex items-center gap-4 pt-3 border-t">
                    <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-pink-500 transition-colors">
                      <Heart className="h-4 w-4" /> {c.likes}
                    </button>
                    <button onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                      <MessageSquare className="h-4 w-4" /> {c.comments}
                    </button>
                    <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-amber-500 transition-colors ml-auto">
                      <ThumbsUp className="h-4 w-4" /> 抱抱
                    </button>
                  </div>

                  {/* 评论区 */}
                  <AnimatePresence>
                    {expandedId === c.id && c.replies.length > 0 && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-3 pt-3 border-t space-y-2">
                          {c.replies.map((r, ri) => (
                            <div key={ri} className="flex items-start gap-2">
                              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs shrink-0">🤗</div>
                              <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">{r}</p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
