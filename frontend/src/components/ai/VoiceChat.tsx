"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, X, Loader2, MessageSquare, Volume2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import VoiceOrb, { type OrbState, type OrbChip, type OrbMood } from "./VoiceOrb";
import VoicePicker from "./VoicePicker";
import { voiceMentalChat, voiceInterviewAnswer, voiceInterviewStart, type VoiceAnswerResponse } from "@/lib/api";
import axios from "axios";

const DEFAULT_MENTAL_VOICE = "FunAudioLLM/CosyVoice2-0.5B:claire";
const DEFAULT_INTERVIEW_VOICE = "FunAudioLLM/CosyVoice2-0.5B:alex";

export type VoiceChatMode =
  | { kind: "mental"; topic: string; mood?: string }
  | { kind: "interview"; sessionId: string; autoPlayFirstQuestion?: boolean };

/** 把心情 emoji / 标签映射到 OrbMood */
function resolveMood(mode: VoiceChatMode, orbState: OrbState): OrbMood {
  if (mode.kind === "interview") {
    // 面试模式：随状态走，整体偏中性偏暖
    if (orbState === "thinking") return "neutral";
    if (orbState === "speaking") return "happy";
    return "neutral";
  }
  // mental：根据用户选的心情决定
  const m = mode.mood ?? "";
  if (/😊|开心|happy/i.test(m)) return "happy";
  if (/😐|一般|neutral/i.test(m)) return "neutral";
  if (/😟|低落|sad/i.test(m)) return "sad";
  if (/😫|焦虑|anxious|考研焦虑|面试紧张/i.test(m)) return "anxious";
  if (/😤|烦躁|irritated/i.test(m)) return "irritated";
  return "neutral";
}

export interface VoiceChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface VoiceChatProps {
  mode: VoiceChatMode;
  /** 退出语音模式 */
  onExit?: () => void;
  /** 每轮完成时回调（可用于外部同步对话历史） */
  onTurnComplete?: (userText: string, replyText: string, raw: VoiceAnswerResponse) => void;
  /** 标题（可选） */
  title?: string;
  /** 子标题（可选） */
  subtitle?: string;
}

const genId = () => Math.random().toString(36).slice(2, 10);

/** 将 base64 转成 Blob URL */
function base64ToBlobUrl(base64: string, mime = "audio/mpeg"): string {
  const bin = atob(base64);
  const len = bin.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([arr], { type: mime }));
}

export default function VoiceChat({ mode, onExit, onTurnComplete, title, subtitle }: VoiceChatProps) {
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [messages, setMessages] = useState<VoiceChatMessage[]>([]);
  const [partialText, setPartialText] = useState<string>("");
  const [recordMs, setRecordMs] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState<string>(
    mode.kind === "mental" ? DEFAULT_MENTAL_VOICE : DEFAULT_INTERVIEW_VOICE,
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const [ttsEl, setTtsEl] = useState<HTMLAudioElement | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const busyRef = useRef(false);

  // 面试模式：首次进入自动播放首题
  useEffect(() => {
    if (mode.kind !== "interview" || !mode.autoPlayFirstQuestion) return;
    let cancelled = false;

    (async () => {
      try {
        setOrbState("thinking");
        const res = await voiceInterviewStart(mode.sessionId, voiceId);
        if (cancelled) return;
        if (res.question) {
          setMessages((prev) => [...prev, { id: genId(), role: "assistant", content: res.question, timestamp: new Date().toISOString() }]);
        }
        if (res.has_audio && res.audio_base64) {
          const url = base64ToBlobUrl(res.audio_base64);
          await playAudio(url);
        } else {
          setOrbState("idle");
        }
      } catch (err) {
        console.error(err);
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          setError("登录态已过期或未登录，请先登录后再使用语音面试");
        } else {
          setError("获取首题失败，请检查网络");
        }
        setOrbState("idle");
      }
    })();

    return () => { cancelled = true; };
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // 卸载时清理
  useEffect(() => {
    return () => {
      try { mediaRecorderRef.current?.stop(); } catch { /* noop */ }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      audioElRef.current?.pause();
    };
  }, []);

  const playAudio = useCallback(async (src: string) => {
    return new Promise<void>((resolve) => {
      let el = audioElRef.current;
      if (!el) {
        el = new Audio();
        audioElRef.current = el;
      }
      el.src = src;
      el.onended = () => { setOrbState("idle"); resolve(); };
      el.onerror = () => { setOrbState("idle"); resolve(); };
      setTtsEl(el);
      setOrbState("speaking");
      el.play().catch(() => { setOrbState("idle"); resolve(); });
    });
  }, []);

  const startRecording = useCallback(async () => {
    if (busyRef.current) return;
    // 先清理上次残留错误
    setError(null);
    setPartialText("");
    // Auth guard — 只做"是否有 token"的基础检查，真伪由后端负责
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("yantu-user-store");
        const store = raw ? JSON.parse(raw) : null;
        const token = store?.state?.token;
        if (!token) {
          toast.error("请先登录后再使用语音对话");
          setError("语音功能需要登录后使用");
          return;
        }
      } catch { /* noop */ }
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      mediaStreamRef.current = stream;
      setMicStream(stream);

      // 挑选浏览器支持的 MIME
      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
      const mimeType = candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => { void handleUpload(recorder.mimeType); };
      mediaRecorderRef.current = recorder;
      recorder.start();

      setOrbState("listening");
      setRecordMs(0);
      recordTimerRef.current = setInterval(() => setRecordMs((p) => p + 100), 100);
    } catch (err) {
      console.error(err);
      setError("无法访问麦克风，请检查浏览器权限");
      toast.error("麦克风访问失败，请在浏览器设置中允许录音权限");
      setOrbState("idle");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== "recording") return;
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
    try { mediaRecorderRef.current.stop(); } catch { /* noop */ }
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    setMicStream(null);
  }, []);

  const handleUpload = useCallback(async (mime: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      setOrbState("thinking");
      const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
      if (blob.size < 800) {
        toast.message("录音太短，请再说几句");
        setOrbState("idle");
        return;
      }

      let res: VoiceAnswerResponse;
      if (mode.kind === "mental") {
        res = await voiceMentalChat(blob, mode.topic, voiceId);
      } else {
        res = await voiceInterviewAnswer(mode.sessionId, blob, voiceId);
      }

      const userMsg: VoiceChatMessage = { id: genId(), role: "user", content: res.transcribed_text, timestamp: new Date().toISOString() };
      const asstMsg: VoiceChatMessage = { id: genId(), role: "assistant", content: res.reply_text, timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, userMsg, asstMsg]);
      onTurnComplete?.(res.transcribed_text, res.reply_text, res);

      if (res.has_audio && res.reply_audio_base64) {
        const url = base64ToBlobUrl(res.reply_audio_base64);
        await playAudio(url);
      } else {
        // 无 TTS 时也停留短暂时间展示文字再回到 idle
        setOrbState("speaking");
        setTimeout(() => setOrbState("idle"), 1200);
      }
    } catch (err: unknown) {
      console.error(err);
      let msg = err instanceof Error ? err.message : "语音请求失败";
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        msg = "登录态已过期，请重新登录后再使用语音功能";
        // 清理可能的旧版 mock-token 遗留
        if (typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem("yantu-user-store");
            if (raw) {
              const obj = JSON.parse(raw);
              if (obj?.state) {
                obj.state.token = null;
                obj.state.isLoggedIn = false;
                obj.state.user = null;
                localStorage.setItem("yantu-user-store", JSON.stringify(obj));
              }
            }
          } catch { /* noop */ }
        }
      } else if (axios.isAxiosError(err) && err.response?.status === 429) {
        msg = "请求过于频繁，请稍后再试";
      } else if (axios.isAxiosError(err) && err.response?.status === 503) {
        msg = "语音服务暂时不可用（后端可能未配置 LLM/TTS Key）";
      } else if (axios.isAxiosError(err) && err.code === "ERR_NETWORK") {
        msg = "无法连接后端服务，请确认后端已启动";
      }
      setError(msg);
      toast.error(msg);
      setOrbState("idle");
    } finally {
      busyRef.current = false;
    }
  }, [mode, onTurnComplete, playAudio, voiceId]);

  const recordingSeconds = (recordMs / 1000).toFixed(1);

  const orbLabel =
    orbState === "idle" ? "点击下方按钮开始说话"
    : orbState === "listening" ? "正在聆听你的声音"
    : orbState === "thinking" ? "正在思考中…"
    : "AI 正在回应";

  const topicLabel = mode.kind === "mental" ? `话题：${mode.topic}` : `面试会话 #${mode.sessionId}`;

  // 围绕 Orb 的悬浮标签（chips）按状态动态生成
  const chips: OrbChip[] = (() => {
    if (orbState === "idle") {
      return mode.kind === "mental"
        ? [
            { label: "🔒 端到端保密", angle: 315, accent: "pink" },
            { label: "🎙️ 清晰地说 5-20 秒", angle: 45, accent: "violet" },
            { label: "💭 " + mode.topic, angle: 200, accent: "blue" },
          ]
        : [
            { label: "🎤 语音面试", angle: 315, accent: "blue" },
            { label: "🤖 AI 面试官", angle: 45, accent: "violet" },
            { label: "📝 实时评分", angle: 200, accent: "amber" },
          ];
    }
    if (orbState === "listening") {
      return [
        { label: `⏱️ ${recordingSeconds}s`, angle: 315, accent: "emerald" },
        { label: "🎤 正在录音", angle: 45, accent: "emerald" },
        { label: "按「结束说话」发送", angle: 200, accent: "violet" },
      ];
    }
    if (orbState === "thinking") {
      return [
        { label: "🧠 AI 思考中", angle: 315, accent: "violet" },
        { label: mode.kind === "mental" ? "倾听你的感受" : "分析你的回答", angle: 45, accent: "pink" },
        { label: "通常 2-8 秒", angle: 200, accent: "amber" },
      ];
    }
    return [
      { label: "🔊 AI 回应中", angle: 315, accent: "amber" },
      { label: "CosyVoice2 合成", angle: 45, accent: "violet" },
      { label: "按 × 可跳过", angle: 200, accent: "pink" },
    ];
  })();

  return (
    <div className="relative mx-auto max-w-3xl">
      {/* 头部 */}
      <div className="flex items-start justify-between mb-6 gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" /> {title ?? "语音交流"}
          </h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">{topicLabel}</Badge>
            {mode.kind === "mental" && <Badge className="text-xs bg-pink-100 text-pink-700 border-pink-200">匿名保密</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <VoicePicker value={voiceId} onChange={(id) => setVoiceId(id)} />
          {onExit && (
            <Button variant="ghost" size="sm" onClick={onExit} className="gap-1.5">
              <X className="h-4 w-4" /> 退出
            </Button>
          )}
        </div>
      </div>

      {/* 中央 Orb 区域 */}
      <div className="flex flex-col items-center py-6">
        <VoiceOrb
          state={orbState}
          mood={resolveMood(mode, orbState)}
          audioStream={orbState === "listening" ? micStream : null}
          audioElement={orbState === "speaking" ? ttsEl : null}
          size={440}
          label={orbLabel}
          chips={chips}
        />

        {/* 主控制按钮 */}
        <div className="mt-8 flex items-center gap-3">
          <AnimatePresence mode="wait" initial={false}>
            {orbState === "idle" && (
              <motion.div key="start" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <Button onClick={startRecording} size="lg" className="h-14 px-8 gap-2 rounded-full shadow-lg">
                  <Mic className="h-5 w-5" /> 按下说话
                </Button>
              </motion.div>
            )}

            {orbState === "listening" && (
              <motion.div key="stop" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <Button onClick={stopRecording} size="lg" variant="destructive" className="h-14 px-8 gap-2 rounded-full shadow-lg">
                  <Square className="h-5 w-5" /> 结束说话
                </Button>
              </motion.div>
            )}

            {orbState === "thinking" && (
              <motion.div key="thinking" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <Button size="lg" disabled className="h-14 px-8 gap-2 rounded-full">
                  <Loader2 className="h-5 w-5 animate-spin" /> 正在处理
                </Button>
              </motion.div>
            )}

            {orbState === "speaking" && (
              <motion.div key="speaking" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center gap-2">
                <Button size="lg" disabled className="h-14 px-8 gap-2 rounded-full">
                  <Volume2 className="h-5 w-5" /> AI 回应中
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => { audioElRef.current?.pause(); setOrbState("idle"); }}
                  className="h-14 w-14 rounded-full p-0"
                  title="跳过"
                >
                  <X className="h-5 w-5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {partialText && (
          <p className="mt-3 text-sm text-muted-foreground italic">{partialText}</p>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200/50 px-4 py-2.5 text-sm text-red-600">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
          {/登录|401/.test(error) && (
            <a href="/auth/login" className="shrink-0 rounded-md bg-red-500 text-white px-3 py-1 text-xs hover:bg-red-600 transition-colors">
              去登录
            </a>
          )}
        </div>
      )}

      {/* 对话字幕 */}
      {messages.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">对话字幕</span>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin pr-2">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : mode.kind === "mental"
                          ? "bg-pink-50 dark:bg-pink-500/10"
                          : "bg-blue-50 dark:bg-blue-500/10",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* 提示条 */}
      <div className="mt-6 rounded-xl bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        💡 小贴士：清晰地说 5-20 秒，AI 会自动识别并回复。当前语音由 FunAudioLLM CosyVoice2 合成，识别由 SenseVoice 提供。
      </div>
    </div>
  );
}
