import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ChatbotState {
  /** 是否展开对话面板 */
  isOpen: boolean;
  /** 是否最小化（只显示小图标） */
  isMinimized: boolean;
  /** 对话消息列表 */
  messages: ChatMessage[];
  /** 是否正在输入 */
  isTyping: boolean;
  /** 是否首次打开（用于新手引导） */
  isFirstVisit: boolean;
  /** 操作方法 */
  toggle: () => void;
  open: () => void;
  close: () => void;
  minimize: () => void;
  restore: () => void;
  addMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
  clearMessages: () => void;
  setTyping: (v: boolean) => void;
  markVisited: () => void;
}

/** 快捷回复模板 */
const WELCOME_MSG: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "你好！我是研途 AI 助手 🎓\n\n我可以帮你：\n• 查找院校和导师信息\n• 优化保研简历\n• 制定保研规划\n• 模拟面试练习\n\n有什么我可以帮你的吗？",
  timestamp: Date.now(),
};

export const useAIChatbotStore = create<ChatbotState>()(
  persist(
    (set) => ({
      isOpen: false,
      isMinimized: false,
      messages: [WELCOME_MSG],
      isTyping: false,
      isFirstVisit: true,
      toggle: () => set((s) => ({ isOpen: !s.isOpen, isMinimized: false })),
      open: () => set({ isOpen: true, isMinimized: false }),
      close: () => set({ isOpen: false }),
      minimize: () => set({ isOpen: false, isMinimized: true }),
      restore: () => set({ isOpen: true, isMinimized: false }),
      addMessage: (msg) =>
        set((s) => ({
          messages: [
            ...s.messages,
            { ...msg, id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, timestamp: Date.now() },
          ],
        })),
      clearMessages: () => set({ messages: [WELCOME_MSG] }),
      setTyping: (isTyping) => set({ isTyping }),
      markVisited: () => set({ isFirstVisit: false }),
    }),
    {
      name: "yantu-chatbot",
      partialize: (s) => ({ isFirstVisit: s.isFirstVisit }),
    },
  ),
);

/** 快捷入口 */
export const QUICK_ACTIONS = [
  { label: "帮我规划", icon: "📋", href: "/ai/plan" },
  { label: "找院校", icon: "🏫", href: "/info/schools" },
  { label: "改简历", icon: "📝", href: "/ai/resume" },
  { label: "练面试", icon: "🎤", href: "/ai/interview" },
  { label: "找导师", icon: "👨‍🏫", href: "/ai/tutor-match" },
  { label: "心理支持", icon: "💚", href: "/ai/mental" },
];
