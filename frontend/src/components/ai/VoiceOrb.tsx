"use client";

import { useEffect, useId, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

/** 心情/情绪 — 影响球内色团权重和眨眼频率 */
export type OrbMood = "happy" | "neutral" | "sad" | "anxious" | "irritated";

export interface OrbChip {
  label: string;
  /** 角度（0°=正上，顺时针） */
  angle: number;
  accent?: "blue" | "pink" | "amber" | "emerald" | "violet";
}

export interface VoiceOrbProps {
  state?: OrbState;
  /** 心情，控制球内色彩比重与眨眼节奏 */
  mood?: OrbMood;
  audioStream?: MediaStream | null;
  audioElement?: HTMLAudioElement | null;
  size?: number;
  className?: string;
  label?: string;
  chips?: OrbChip[];
  trackMouse?: boolean;
}

const elementSourceCache = new WeakMap<HTMLAudioElement, { ctx: AudioContext; node: MediaElementAudioSourceNode }>();

const STATE_TINT: Record<OrbState, { halo: string; rim: string; accent: string; ring: string }> = {
  idle: { halo: "rgba(167,139,250,0.55)", rim: "rgba(129,140,248,0.55)", accent: "rgba(196,181,253,0.85)", ring: "rgba(167,139,250,0.7)" },
  listening: { halo: "rgba(34,211,238,0.65)", rim: "rgba(6,182,212,0.65)", accent: "rgba(165,243,252,0.95)", ring: "rgba(6,182,212,0.85)" },
  thinking: { halo: "rgba(217,70,239,0.65)", rim: "rgba(168,85,247,0.65)", accent: "rgba(240,171,252,0.95)", ring: "rgba(168,85,247,0.85)" },
  speaking: { halo: "rgba(251,146,60,0.7)", rim: "rgba(244,63,94,0.7)", accent: "rgba(254,215,170,0.98)", ring: "rgba(251,146,60,0.9)" },
};

interface MoodPalette {
  /** 5 个色团的强度（0-1） */
  blue: number;
  pink: number;
  red: number;
  violet: number;
  cyan: number;
  /** 是否启用 amber 暖色光（开心/焦虑用） */
  amber?: number;
  /** idle 状态下完整眨眼周期（秒） */
  blinkPeriod: number;
  /** idle 时眨眼闭合占比（越大越温和） */
  blinkClosedSpan: number;
  /** 球面整体亮度系数（控制 depth/rim 的暗化强度） */
  brightness: number;
}

const MOOD_PALETTES: Record<OrbMood, MoodPalette> = {
  // 😊 开心 — 暖色为主，明亮活泼，频繁眨眼
  happy:     { blue: 0.4, pink: 1.0, red: 1.0, violet: 0.55, cyan: 0.85, amber: 0.9, blinkPeriod: 3.6, blinkClosedSpan: 0.06, brightness: 1.18 },
  // 😐 一般 — 全色相平衡
  neutral:   { blue: 1.0, pink: 1.0, red: 1.0, violet: 1.0,  cyan: 1.0,  amber: 0.0, blinkPeriod: 5.2, blinkClosedSpan: 0.08, brightness: 1.0  },
  // 😟 低落 — 冷色调，慢节奏长闭眼
  sad:       { blue: 1.0, pink: 0.45, red: 0.25, violet: 1.0, cyan: 0.85, amber: 0.0, blinkPeriod: 6.8, blinkClosedSpan: 0.12, brightness: 0.92 },
  // 😫 焦虑 — 急促频繁眨眼，红粉蓝紫高频闪
  anxious:   { blue: 0.35, pink: 1.0, red: 1.0, violet: 0.85, cyan: 0.3, amber: 0.7, blinkPeriod: 2.4, blinkClosedSpan: 0.04, brightness: 1.05 },
  // 😤 烦躁 — 红橙强烈，节奏中等不规则
  irritated: { blue: 0.2, pink: 1.0, red: 1.0, violet: 0.6, cyan: 0.15, amber: 0.8, blinkPeriod: 3.0, blinkClosedSpan: 0.05, brightness: 1.08 },
};

const CHIP_STYLES: Record<NonNullable<OrbChip["accent"]>, string> = {
  blue: "bg-blue-500/15 text-blue-700 dark:text-blue-200 border-blue-500/40",
  pink: "bg-pink-500/15 text-pink-700 dark:text-pink-200 border-pink-500/40",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-200 border-amber-500/40",
  emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 border-emerald-500/40",
  violet: "bg-violet-500/15 text-violet-700 dark:text-violet-200 border-violet-500/40",
};

export default function VoiceOrb({
  state = "idle",
  mood = "neutral",
  audioStream = null,
  audioElement = null,
  size = 440,
  className,
  label,
  chips = [],
  trackMouse = true,
}: VoiceOrbProps) {
  const palette = MOOD_PALETTES[mood];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const amplitudeRef = useRef(0);
  const stateRef = useRef<OrbState>(state);
  stateRef.current = state;
  const uid = useId().replace(/:/g, "");
  const fid = (s: string) => `${s}-${uid}`;

  // ──────────── 鼠标跟随：使用 Motion Value（跳过 React 渲染） ────────────
  const mx = useMotionValue(0); // -1..1
  const my = useMotionValue(0);
  // 弹簧平滑：高刚度+低阻尼=更灵敏
  const smoothMx = useSpring(mx, { stiffness: 280, damping: 20, mass: 0.4 });
  const smoothMy = useSpring(my, { stiffness: 280, damping: 20, mass: 0.4 });

  const orbSize = size * 0.66;
  const eyeMaxOffset = orbSize * 0.075;

  const eyeTransX = useTransform(smoothMx, [-1, 1], [-eyeMaxOffset, eyeMaxOffset]);
  const eyeTransY = useTransform(smoothMy, [-1, 1], [-eyeMaxOffset, eyeMaxOffset]);

  // 球内色团视差位移（CSS px 单位，会自动映射到渲染空间）
  const innerOX = useTransform(smoothMx, [-1, 1], [-10, 10]);
  const innerOY = useTransform(smoothMy, [-1, 1], [-10, 10]);

  // 球面高光视差（光源相对镜头不变 → 鼠标移动时高光相对球反向小幅移动）
  const specOX = useTransform(smoothMx, [-1, 1], [5, -5]);
  const specOY = useTransform(smoothMy, [-1, 1], [5, -5]);

  useEffect(() => {
    if (!trackMouse) return;
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // reach 越小越灵敏 — 鼠标在球附近就到极限
      const reach = 220;
      mx.set(Math.max(-1, Math.min(1, (e.clientX - cx) / reach)));
      my.set(Math.max(-1, Math.min(1, (e.clientY - cy) / reach)));
    };
    const onLeave = () => { mx.set(0); my.set(0); };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, [trackMouse, mx, my]);

  // 自动漫游（trackMouse 关闭时）
  useEffect(() => {
    if (trackMouse) return;
    let id = 0;
    const tick = () => {
      mx.set((Math.random() - 0.5) * 1.4);
      my.set((Math.random() - 0.5) * 1.2);
      id = window.setTimeout(tick, 1800 + Math.random() * 2200);
    };
    tick();
    return () => clearTimeout(id);
  }, [trackMouse, mx, my]);

  // ──────────── 音频分析 ────────────
  useEffect(() => {
    if (!audioStream && !audioElement) {
      amplitudeRef.current = 0;
      return;
    }
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let rafId = 0;
    let cleanupStreamSource: (() => void) | null = null;
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      if (audioElement) {
        let cached = elementSourceCache.get(audioElement);
        if (!cached) {
          const ctx = new Ctor();
          const node = ctx.createMediaElementSource(audioElement);
          node.connect(ctx.destination);
          cached = { ctx, node };
          elementSourceCache.set(audioElement, cached);
        }
        audioCtx = cached.ctx;
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.75;
        cached.node.connect(analyser);
      } else if (audioStream) {
        audioCtx = new Ctor();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.75;
        const streamSource = audioCtx.createMediaStreamSource(audioStream);
        streamSource.connect(analyser);
        cleanupStreamSource = () => { try { streamSource.disconnect(); } catch { /* noop */ } };
      }
      if (!analyser) return;
      const bins = analyser.frequencyBinCount;
      const data = new Uint8Array(bins);
      const read = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < bins; i++) sum += data[i];
        const avg = sum / bins / 255;
        amplitudeRef.current = amplitudeRef.current * 0.65 + avg * 0.35;
        rafId = requestAnimationFrame(read);
      };
      read();
    } catch (err) {
      console.warn("[VoiceOrb] audio analyser init failed", err);
    }
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      try {
        cleanupStreamSource?.();
        analyser?.disconnect();
        if (audioStream && audioCtx) audioCtx.close();
      } catch { /* noop */ }
    };
  }, [audioStream, audioElement]);

  // ──────────── 星点画布 ────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const DPR = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = size * DPR;
    canvas.height = size * DPR;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const center = size / 2;
    const orbR = size * 0.30;

    type Star = { x: number; y: number; r: number; phase: number; speed: number; drift: number; baseAlpha: number; hue: number };
    const STAR_COUNT = 100;
    const stars: Star[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const angle = (i / STAR_COUNT) * Math.PI * 2 + Math.random() * 0.6;
      const rr = orbR * 1.06 + Math.random() * (size / 2 - orbR * 1.1 - 4);
      stars.push({
        x: center + Math.cos(angle) * rr,
        y: center + Math.sin(angle) * rr,
        r: 0.4 + Math.random() * 1.7,
        phase: Math.random() * Math.PI * 2,
        speed: 0.0015 + Math.random() * 0.003,
        drift: Math.random() * Math.PI * 2,
        baseAlpha: 0.35 + Math.random() * 0.6,
        hue: Math.random() > 0.7 ? 200 + Math.random() * 80 : 30 + Math.random() * 25,
      });
    }

    type Pulse = { born: number; duration: number };
    const pulses: Pulse[] = [];
    let lastPulseAt = 0;

    let rafId = 0;
    const t0 = performance.now();
    const hasAudioSource = !!(audioStream || audioElement);

    const draw = (now: number) => {
      const dt = now - t0;
      const s = stateRef.current;
      const rawAmp = amplitudeRef.current;
      let amp: number;
      if (hasAudioSource && rawAmp > 0.02) amp = Math.min(rawAmp * 1.7, 1);
      else if (s === "thinking") amp = 0.3 + Math.sin(dt * 0.0045) * 0.18;
      else if (s === "speaking") amp = 0.22 + (Math.sin(dt * 0.009) * 0.5 + 0.5) * 0.35;
      else if (s === "listening") amp = 0.08 + (Math.sin(dt * 0.003) * 0.5 + 0.5) * 0.08;
      else amp = 0.05 + (Math.sin(dt * 0.0015) * 0.5 + 0.5) * 0.05;

      ctx.clearRect(0, 0, size, size);

      const pulseInterval = s === "speaking" ? 700 : s === "listening" ? 1300 : s === "thinking" ? 950 : 2400;
      if (now - lastPulseAt > pulseInterval) {
        pulses.push({ born: now, duration: 2400 });
        lastPulseAt = now;
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        const progress = (now - p.born) / p.duration;
        if (progress >= 1) { pulses.splice(i, 1); continue; }
        const radius = orbR * 1.04 + progress * (size / 2 - orbR * 1.04);
        const alpha = (1 - progress) * 0.28;
        const stroke =
          s === "speaking" ? `rgba(251,146,60,${alpha})` :
          s === "listening" ? `rgba(34,211,238,${alpha})` :
          s === "thinking" ? `rgba(217,70,239,${alpha})` :
          `rgba(167,139,250,${alpha})`;
        ctx.beginPath();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1 + amp * 1.8;
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (const star of stars) {
        const driftX = Math.cos(dt * star.speed * 0.4 + star.drift) * 2.5;
        const driftY = Math.sin(dt * star.speed * 0.4 + star.drift) * 2.5;
        const twinkle = (Math.sin(dt * star.speed + star.phase) * 0.5 + 0.5);
        const alpha = star.baseAlpha * (0.4 + twinkle * 0.6) * (0.6 + amp * 0.6);
        const radius = star.r * (1 + amp * 0.6 + twinkle * 0.3);
        const color = star.hue > 100
          ? `hsla(${star.hue}, 85%, 75%, ${alpha})`
          : `hsla(${star.hue}, 95%, 78%, ${alpha})`;
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.shadowColor = star.hue > 100 ? "rgba(147,197,253,0.9)" : "rgba(253,186,116,0.95)";
        ctx.shadowBlur = 8 + amp * 14;
        ctx.arc(star.x + driftX, star.y + driftY, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [size, audioStream, audioElement]);

  const tint = STATE_TINT[state];
  const breathScale: number[] =
    state === "speaking" ? [1, 1.045, 1] :
    state === "thinking" ? [1, 1.025, 1] :
    state === "listening" ? [1, 1.035, 1] :
    [1, 1.02, 1];
  const breathDuration =
    state === "speaking" ? 0.8 :
    state === "thinking" ? 1.0 :
    state === "listening" ? 1.3 :
    2.6;

  // 根据 mood 计算 idle 眨眼时序
  const idleBlinkTimes = (() => {
    const span = palette.blinkClosedSpan;
    const start = 0.5 - span / 2;
    const end = 0.5 + span / 2;
    return [0, start, 0.5, end, 1];
  })();

  const blinkAnim =
    state === "thinking" ? { scaleY: [1, 0.15, 1], transition: { duration: 0.85, repeat: Infinity, ease: "easeInOut" } } :
    state === "listening" ? { scaleY: [1, 0.78, 1], transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } } :
    state === "speaking" ? { scaleY: [1, 1.08, 1], scaleX: [1, 0.92, 1], transition: { duration: 0.34, repeat: Infinity, ease: "easeInOut" } } :
    { scaleY: [1, 1, 0.08, 1, 1], transition: { duration: palette.blinkPeriod, repeat: Infinity, times: idleBlinkTimes, ease: "easeInOut" } };

  const orbHalf = orbSize / 2;
  const eyeSize = { w: orbSize * 0.075, h: orbSize * 0.255 };
  const eyeGap = orbSize * 0.155;
  const chipRadius = size * 0.50;

  return (
    <div className={cn("relative select-none flex flex-col items-center", className)}>
      <div ref={containerRef} className="relative" style={{ width: size, height: size }}>
        {/* 深色舞台 */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle at 50% 50%, rgba(8,4,28,0.95) 0%, rgba(15,8,40,0.7) 40%, rgba(20,15,45,0) 72%)",
          }}
        />

        {/* 状态外晕 */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${tint.halo} 0%, transparent 56%)`,
            filter: "blur(28px)",
          }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: breathDuration, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* 星点 canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

        {/* Chips */}
        {chips.map((chip, i) => {
          const rad = (chip.angle - 90) * (Math.PI / 180);
          const x = size / 2 + Math.cos(rad) * chipRadius;
          const y = size / 2 + Math.sin(rad) * chipRadius;
          return (
            <motion.div
              key={`${chip.label}-${i}`}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="absolute pointer-events-none"
              style={{ left: x, top: y, marginLeft: 0, marginTop: 0, x: "-50%", y: "-50%" }}
            >
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border backdrop-blur-md shadow-md",
                  CHIP_STYLES[chip.accent ?? "violet"],
                )}
              >
                {chip.label}
              </motion.div>
            </motion.div>
          );
        })}

        {/* ─── SVG 主球体（用 margin 居中，避免与 scale 动画冲突） ─── */}
        <motion.div
          className="absolute"
          style={{
            width: orbSize,
            height: orbSize,
            left: "50%",
            top: "50%",
            marginLeft: -orbHalf,
            marginTop: -orbHalf,
            filter: `drop-shadow(0 0 50px ${tint.halo}) drop-shadow(0 0 110px ${tint.halo}) drop-shadow(0 28px 60px rgba(8,3,30,0.55))`,
            willChange: "transform",
          }}
          animate={{ scale: breathScale }}
          transition={{ duration: breathDuration, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg viewBox="0 0 200 200" width={orbSize} height={orbSize}>
            <defs>
              <filter id={fid("liquid")} x="-15%" y="-15%" width="130%" height="130%">
                <feTurbulence type="fractalNoise" baseFrequency="0.014 0.022" numOctaves="2" seed="3" result="n">
                  <animate attributeName="baseFrequency" dur="22s" values="0.014 0.022; 0.022 0.014; 0.014 0.022" repeatCount="indefinite" />
                </feTurbulence>
                <feDisplacementMap in="SourceGraphic" in2="n" scale="14" />
              </filter>

              <radialGradient id={fid("depth")} cx="34%" cy="24%" r="84%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="50%" stopColor="#1a1240" stopOpacity={0.05 / palette.brightness} />
                <stop offset="80%" stopColor="#1a1140" stopOpacity={0.42 / palette.brightness} />
                <stop offset="100%" stopColor="#0c0828" stopOpacity={0.78 / palette.brightness} />
              </radialGradient>

              <radialGradient id={fid("rim")} cx="50%" cy="50%" r="50%">
                <stop offset="62%" stopColor="#1a0e3e" stopOpacity="0" />
                <stop offset="90%" stopColor="#0e0628" stopOpacity={0.40 / palette.brightness} />
                <stop offset="100%" stopColor="#080420" stopOpacity={0.72 / palette.brightness} />
              </radialGradient>

              <radialGradient id={fid("iridescent")} cx="50%" cy="50%" r="50%">
                <stop offset="86%" stopColor="#22d3ee" stopOpacity="0" />
                <stop offset="92%" stopColor="#a855f7" stopOpacity="0.4" />
                <stop offset="96%" stopColor="#ec4899" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
              </radialGradient>

              <radialGradient id={fid("specular")} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="35%" stopColor="#ffffff" stopOpacity="0.45" />
                <stop offset="70%" stopColor="#ffffff" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>

              <radialGradient id={fid("hot")} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="55%" stopColor="#ffffff" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>

              <linearGradient id={fid("topRim")} x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
                <stop offset="20%" stopColor="#ffffff" stopOpacity="0.18" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>

              <linearGradient id={fid("sweep")} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="48%" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.55" />
                <stop offset="52%" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>

              {/* 色团使用更亮的 400 系颜色，让球面更明亮 */}
              <radialGradient id={fid("cBlue")} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="1" />
                <stop offset="40%" stopColor="#60a5fa" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={fid("cPink")} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f472b6" stopOpacity="1" />
                <stop offset="40%" stopColor="#f472b6" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={fid("cRed")} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fb7185" stopOpacity="1" />
                <stop offset="40%" stopColor="#fb923c" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={fid("cViolet")} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#c084fc" stopOpacity="1" />
                <stop offset="40%" stopColor="#a855f7" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={fid("cCyan")} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
                <stop offset="40%" stopColor="#22d3ee" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={fid("cAmber")} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fde047" stopOpacity="1" />
                <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
              </radialGradient>

              <radialGradient id={fid("tint")} cx="50%" cy="50%" r="65%">
                <stop offset="0%" stopColor={tint.halo} stopOpacity="0.85" />
                <stop offset="100%" stopColor={tint.halo} stopOpacity="0" />
              </radialGradient>
              {/* 状态色环 — 在球面外侧投射明显的当前状态色 */}
              <radialGradient id={fid("stateRing")} cx="50%" cy="50%" r="50%">
                <stop offset="80%" stopColor={tint.ring} stopOpacity="0" />
                <stop offset="92%" stopColor={tint.ring} stopOpacity="0.55" />
                <stop offset="100%" stopColor={tint.ring} stopOpacity="0" />
              </radialGradient>

              <clipPath id={fid("clip")}>
                <circle cx="100" cy="100" r="100" />
              </clipPath>
            </defs>

            {/* Layer 1: 基底（更亮的深紫，不再压死颜色） */}
            <circle cx="100" cy="100" r="100" fill="#1a1240" />

            {/*
              ─── 色团层（修复 bumps）────
              clipPath 在外层固定 <g> 上不参与 transform；
              filter + CSS transform 在内层 motion.g 上独立生效，
              避免 clipPath 跟着 transform 移位产生鼓包。
            */}
            <g clipPath={`url(#${fid("clip")})`}>
              <motion.g
                filter={`url(#${fid("liquid")})`}
                style={{ mixBlendMode: "screen", x: innerOX, y: innerOY }}
              >
                <circle cx="40" cy="35" r="82" fill={`url(#${fid("cBlue")})`} opacity={palette.blue}>
                  <animate attributeName="cx" values="40;55;30;40" dur="9s" repeatCount="indefinite" />
                  <animate attributeName="cy" values="35;30;55;35" dur="9s" repeatCount="indefinite" />
                </circle>
                <circle cx="120" cy="68" r="78" fill={`url(#${fid("cPink")})`} opacity={palette.pink}>
                  <animate attributeName="cx" values="120;105;135;120" dur="11s" repeatCount="indefinite" />
                  <animate attributeName="cy" values="68;82;58;68" dur="11s" repeatCount="indefinite" />
                </circle>
                <circle cx="155" cy="135" r="80" fill={`url(#${fid("cRed")})`} opacity={palette.red}>
                  <animate attributeName="cx" values="155;145;165;155" dur="13s" repeatCount="indefinite" />
                  <animate attributeName="cy" values="135;145;125;135" dur="13s" repeatCount="indefinite" />
                </circle>
                <circle cx="50" cy="150" r="72" fill={`url(#${fid("cViolet")})`} opacity={palette.violet}>
                  <animate attributeName="cx" values="50;65;38;50" dur="10s" repeatCount="indefinite" />
                  <animate attributeName="cy" values="150;140;160;150" dur="10s" repeatCount="indefinite" />
                </circle>
                <circle cx="140" cy="40" r="50" fill={`url(#${fid("cCyan")})`} opacity={palette.cyan}>
                  <animate attributeName="cx" values="140;125;155;140" dur="14s" repeatCount="indefinite" />
                  <animate attributeName="cy" values="40;55;30;40" dur="14s" repeatCount="indefinite" />
                </circle>
                {(palette.amber ?? 0) > 0 && (
                  <circle cx="100" cy="55" r="62" fill={`url(#${fid("cAmber")})`} opacity={palette.amber}>
                    <animate attributeName="cx" values="100;115;90;100" dur="12s" repeatCount="indefinite" />
                    <animate attributeName="cy" values="55;48;62;55" dur="12s" repeatCount="indefinite" />
                  </circle>
                )}
              </motion.g>
            </g>

            {/* Layer 2.5: 二次饱和度叠加（提亮中心区） */}
            <g clipPath={`url(#${fid("clip")})`} style={{ mixBlendMode: "color-dodge", opacity: 0.4 }}>
              <circle cx="60" cy="55" r="55" fill={`url(#${fid("cBlue")})`} opacity={palette.blue} />
              <circle cx="135" cy="80" r="50" fill={`url(#${fid("cPink")})`} opacity={palette.pink} />
              <circle cx="145" cy="140" r="55" fill={`url(#${fid("cRed")})`} opacity={palette.red} />
              <circle cx="65" cy="145" r="50" fill={`url(#${fid("cViolet")})`} opacity={palette.violet} />
            </g>

            {/* Layer 3a: 状态色温叠加（soft-light） */}
            <circle cx="100" cy="100" r="100" fill={`url(#${fid("tint")})`} style={{ mixBlendMode: "soft-light" }} />
            {/* Layer 3b: 状态色环（screen，明显的当前状态色环） */}
            <circle cx="100" cy="100" r="100" fill={`url(#${fid("stateRing")})`} style={{ mixBlendMode: "screen", opacity: 0.7 }} />

            {/* Layer 4: 球面深度阴影 */}
            <circle cx="100" cy="100" r="100" fill={`url(#${fid("depth")})`} style={{ mixBlendMode: "multiply" }} />

            {/* Layer 5: Fresnel */}
            <circle cx="100" cy="100" r="100" fill={`url(#${fid("rim")})`} style={{ mixBlendMode: "multiply" }} />

            {/* Layer 5.5: 彩虹色色散 rim */}
            <circle cx="100" cy="100" r="100" fill={`url(#${fid("iridescent")})`} style={{ mixBlendMode: "screen" }} />

            {/* Layer 6: 主弧形高光 — 鼠标视差反向小幅位移 */}
            <motion.g style={{ x: specOX, y: specOY }}>
              <ellipse cx="76" cy="48" rx="60" ry="36" fill={`url(#${fid("specular")})`} transform="rotate(-22 76 48)" />
              <ellipse cx="78" cy="40" rx="13" ry="7.5" fill={`url(#${fid("hot")})`} />
              <ellipse cx="56" cy="80" rx="3.5" ry="2.5" fill="#ffffff" opacity="0.85" />
            </motion.g>

            {/* Layer 7.6: 周期性扫光 */}
            <g clipPath={`url(#${fid("clip")})`} style={{ mixBlendMode: "screen" }}>
              <rect x="-100" y="0" width="160" height="200" fill={`url(#${fid("sweep")})`} opacity="0.55">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="-160 0; 200 0"
                  dur="6s"
                  repeatCount="indefinite"
                />
              </rect>
            </g>

            {/* Layer 8: 顶部 rim 细线 */}
            <circle cx="100" cy="100" r="98" fill="none" stroke={`url(#${fid("topRim")})`} strokeWidth="2.5" />

            {/* Layer 9: 状态色光环 */}
            <circle cx="100" cy="100" r="99" fill="none" stroke={tint.ring} strokeWidth="1" opacity="0.5" />
          </svg>

          {/* 眼睛 — Motion Value 直接驱动，零 React 重渲染 */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ gap: `${eyeGap}px` }}
          >
            <motion.div style={{ x: eyeTransX, y: eyeTransY }}>
              <motion.div
                animate={blinkAnim as any}
                style={{
                  width: eyeSize.w,
                  height: eyeSize.h,
                  borderRadius: "999px",
                  background: "linear-gradient(180deg, #ffffff 0%, #fff5fb 50%, #f4ebff 100%)",
                  boxShadow: `0 0 18px ${tint.accent}, 0 0 6px rgba(255,255,255,0.95), inset 0 2px 4px rgba(255,255,255,0.95), inset 0 -3px 6px rgba(180,140,220,0.28)`,
                }}
              />
            </motion.div>
            <motion.div style={{ x: eyeTransX, y: eyeTransY }}>
              <motion.div
                animate={blinkAnim as any}
                style={{
                  width: eyeSize.w,
                  height: eyeSize.h,
                  borderRadius: "999px",
                  background: "linear-gradient(180deg, #ffffff 0%, #fff5fb 50%, #f4ebff 100%)",
                  boxShadow: `0 0 18px ${tint.accent}, 0 0 6px rgba(255,255,255,0.95), inset 0 2px 4px rgba(255,255,255,0.95), inset 0 -3px 6px rgba(180,140,220,0.28)`,
                }}
              />
            </motion.div>
          </div>

          {/* 球外彩色光环 */}
          <div
            className="absolute pointer-events-none rounded-full"
            style={{
              inset: -orbHalf * 0.06,
              border: `1px solid ${tint.ring}`,
              opacity: 0.35,
              filter: "blur(0.5px)",
            }}
          />
        </motion.div>

        {/* 接触地面投影 */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-[50%] pointer-events-none"
          style={{
            width: orbSize * 0.72,
            height: orbSize * 0.08,
            bottom: size * 0.08,
            background: "radial-gradient(ellipse, rgba(5,2,25,0.7) 0%, transparent 70%)",
            filter: "blur(10px)",
          }}
        />
      </div>

      {label && (
        <AnimatePresence mode="wait">
          <motion.div
            key={state}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35 }}
            className="mt-4 text-sm text-muted-foreground font-medium tracking-wide text-center"
          >
            {label}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
