"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  GraduationCap, X, Minus, Send, Trash2, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAIChatbotStore, QUICK_ACTIONS } from "@/lib/stores/chatbot-store";

/* ================================================================
   悬浮球 AI Bot
   全局悬浮的 AI 助手，可拖拽、可收起、可对话
   ================================================================ */

/** 模拟 AI 回复 */
function simulateReply(userMsg: string): string {
  const lower = userMsg.toLowerCase();
  if (lower.includes("院校") || lower.includes("学校")) {
    return "你可以前往「院校库」查看全国 985/211/双一流院校的详细信息，也可以使用「AI 择校推荐」让我根据你的背景智能推荐。\n\n需要我帮你推荐院校吗？";
  }
  if (lower.includes("简历") || lower.includes("cv")) {
    return "「AI 简历工坊」可以帮你分步填写保研简历，支持多种模板和实时预览。我还能给出针对性的优化建议哦！\n\n要不要现在就开始？";
  }
  if (lower.includes("面试")) {
    return "「AI 模拟面试」支持多种面试场景，包括自我介绍、专业课提问、英语口语等。我会实时给出评价和改进建议。\n\n准备好练习了吗？";
  }
  if (lower.includes("规划") || lower.includes("时间")) {
    return "「AI 综合规划」可以根据你的背景和目标，生成个性化的保研时间线和任务清单。\n\n告诉我你的基本情况，我来帮你规划！";
  }
  if (lower.includes("导师")) {
    return "「导师库」收录了全国高校导师信息，你可以按研究方向、院校等条件筛选。「AI 导师推荐」还能根据你的兴趣智能匹配。";
  }
  return "我是研途 AI 助手，可以帮你解答保研相关的各种问题。你可以问我关于院校选择、简历优化、面试准备、时间规划等方面的问题，也可以点击下方的快捷入口直接使用对应功能。😊";
}

export default function AIChatbot() {
  const {
    isOpen, messages, isTyping,
    toggle, close, minimize,
    addMessage, clearMessages, setTyping,
  } = useAIChatbotStore();

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // 展开时聚焦输入框
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput("");
    addMessage({ role: "user", content: text });
    setTyping(true);

    // 模拟 AI 回复延迟
    setTimeout(() => {
      addMessage({ role: "assistant", content: simulateReply(text) });
      setTyping(false);
    }, 800 + Math.random() * 600);
  }, [input, isTyping, addMessage, setTyping]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* ===== 悬浮球按钮 ===== */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggle}
            className={cn(
              "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center",
              "rounded-full bg-gradient-to-br from-primary to-violet-600 text-white",
              "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
              "transition-shadow duration-300 cursor-pointer",
            )}
            aria-label="打开 AI 助手"
          >
            <GraduationCap className="h-7 w-7" />
            {/* 呼吸光圈 */}
            <span className="absolute inset-0 rounded-full animate-ping bg-primary/20 pointer-events-none" style={{ animationDuration: "2.5s" }} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ===== 对话面板 ===== */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed bottom-6 right-6 z-50 flex flex-col",
              "w-[380px] h-[540px] max-h-[80vh]",
              "rounded-2xl border bg-card shadow-2xl shadow-black/10",
              "overflow-hidden",
            )}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-violet-500/5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-600 text-white">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">研途 AI 助手</h3>
                  <p className="text-xs text-muted-foreground">随时为你解答保研问题</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => clearMessages()} title="清空对话">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={minimize} title="最小化">
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={close} title="关闭">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* 消息区 */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md shadow-sm ring-1 ring-border/20",
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* 正在输入指示器 */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>

            {/* 快捷入口 */}
            <div className="px-3 py-2 border-t bg-muted/30">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
                {QUICK_ACTIONS.map((a) => (
                  <Link key={a.label} href={a.href} onClick={close}>
                    <button className="flex items-center gap-1 whitespace-nowrap rounded-full border bg-card px-2.5 py-1 text-[11px] font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/30 active:scale-[0.97] transition-all">
                      <span>{a.icon}</span>
                      {a.label}
                    </button>
                  </Link>
                ))}
              </div>
            </div>

            {/* 输入区 */}
            <div className="px-3 pb-3 pt-1">
              <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="输入你的问题..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all",
                    input.trim() && !isTyping
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                      : "bg-muted text-muted-foreground cursor-not-allowed",
                  )}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
