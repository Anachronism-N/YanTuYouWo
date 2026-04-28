"use client";

import { useEffect, useRef, useState } from "react";
import { Mic2, Check, Volume2, Loader2, Play, Pause } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getAvailableVoices, textToSpeech, type TtsVoice } from "@/lib/api";
import { toast } from "sonner";

interface VoicePickerProps {
  value?: string;
  onChange?: (voiceId: string, voice: TtsVoice) => void;
  /** 触发器的字号（small / default） */
  size?: "sm" | "md";
  /** 用于试听的样本文本 */
  sampleText?: string;
}

const GENDER_EMOJI: Record<string, string> = { 男: "👨", 女: "👩" };
const SCENE_COLOR: Record<string, string> = {
  面试官: "bg-blue-500/15 text-blue-700 dark:text-blue-200 border-blue-500/30",
  心理支持: "bg-pink-500/15 text-pink-700 dark:text-pink-200 border-pink-500/30",
  通用: "bg-violet-500/15 text-violet-700 dark:text-violet-200 border-violet-500/30",
};

export default function VoicePicker({ value, onChange, size = "sm", sampleText }: VoicePickerProps) {
  const [voices, setVoices] = useState<TtsVoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAvailableVoices()
      .then((vs) => { if (!cancelled) setVoices(vs); })
      .catch((err) => { console.warn("获取语音列表失败", err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // 卸载时停止预览
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const current = voices.find((v) => v.id === value);
  const currentName = current?.name ?? "默认";
  const currentEmoji = current ? GENDER_EMOJI[current.gender] ?? "🎙️" : "🎙️";

  const handlePreview = async (e: React.MouseEvent, voice: TtsVoice) => {
    e.stopPropagation();
    if (previewingId === voice.id) {
      audioRef.current?.pause();
      setPreviewingId(null);
      return;
    }
    try {
      audioRef.current?.pause();
      setPreviewingId(voice.id);
      const text = sampleText ?? `你好，我是${voice.name}，${voice.style}的声音，很高兴为你服务。`;
      const blob = await textToSpeech(text, voice.id);
      const url = URL.createObjectURL(blob);
      const el = audioRef.current ?? new Audio();
      el.src = url;
      el.onended = () => setPreviewingId(null);
      el.onerror = () => { setPreviewingId(null); toast.error("试听失败"); };
      audioRef.current = el;
      await el.play();
    } catch (err) {
      console.error(err);
      setPreviewingId(null);
      toast.error("试听失败，请检查登录状态或网络");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border bg-background/80 backdrop-blur-sm hover:bg-muted/60 transition-colors shrink-0",
          size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-sm",
        )}
        title="选择语音"
      >
        <span className="text-base leading-none">{currentEmoji}</span>
        <span className="font-medium">{currentName}</span>
        {current && <span className="text-muted-foreground">· {current.style}</span>}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="w-80 p-0 max-h-[420px] overflow-hidden flex flex-col">
        <div className="px-3 py-2.5 border-b flex items-center gap-2">
          <Mic2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">选择 AI 声音</span>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />}
        </div>
        <div className="overflow-y-auto scrollbar-thin py-1 flex-1">
          {voices.length === 0 && !loading && (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              暂无可用语音，请确认后端已配置 SiliconFlow Key
            </div>
          )}
          {voices.map((v) => {
            const selected = v.id === value;
            const previewing = previewingId === v.id;
            return (
              <button
                key={v.id}
                onClick={() => {
                  onChange?.(v.id, v);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left group",
                  selected && "bg-primary/5",
                )}
              >
                <div className={cn(
                  "shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-lg",
                  v.gender === "女" ? "bg-pink-100 dark:bg-pink-500/15" : "bg-blue-100 dark:bg-blue-500/15",
                )}>
                  {GENDER_EMOJI[v.gender] ?? "🎙️"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold">{v.name}</span>
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4", SCENE_COLOR[v.scene] ?? "")}>
                      {v.scene}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{v.style} · {v.lang}</div>
                </div>
                <button
                  onClick={(e) => handlePreview(e, v)}
                  className={cn(
                    "shrink-0 h-7 w-7 rounded-full flex items-center justify-center transition-colors",
                    previewing ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted-foreground/20",
                  )}
                  title={previewing ? "停止试听" : "试听"}
                >
                  {previewing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-[1px]" />}
                </button>
                {selected ? (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <div className="h-4 w-4 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
        <div className="border-t px-3 py-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Volume2 className="h-3 w-3" /> 由 FunAudioLLM CosyVoice2 合成
        </div>
      </PopoverContent>
    </Popover>
  );
}
