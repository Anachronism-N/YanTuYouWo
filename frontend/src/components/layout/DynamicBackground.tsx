"use client";

import { useEffect, useMemo, useState, memo } from "react";
import { useThemeStore, THEME_COLORS, type BgEffect } from "@/lib/stores/theme-store";

/* ================================================================
   动态背景组件 — 极致性能版
   
   性能优化策略：
   1. 用 CSS background-image 动画替代大量独立 DOM 元素
   2. 雨/雪用单个 SVG 背景平铺 + translateY 动画（1 个合成层）
   3. 移除所有 filter: blur()，改用 radial-gradient 模拟模糊
   4. 所有 keyframes 定义在组件顶层 <style>，避免重复创建
   5. 最多 3-5 个 DOM 元素，每个效果只创建 1-3 个合成层
   ================================================================ */

// ==================== 天气 API ====================

async function fetchWeather(): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch("https://wttr.in/?format=%C", { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return "sunny";
    const text = (await res.text()).trim().toLowerCase();
    if (text.includes("thunder") || text.includes("storm") || text.includes("雷")) return "storm";
    if (text.includes("rain") || text.includes("drizzle") || text.includes("shower") || text.includes("雨")) return "rain";
    if (text.includes("snow") || text.includes("sleet") || text.includes("雪")) return "snow";
    if (text.includes("fog") || text.includes("mist") || text.includes("haze") || text.includes("雾") || text.includes("霾")) return "fog";
    if (text.includes("cloud") || text.includes("overcast") || text.includes("阴") || text.includes("云")) return "cloudy";
    return "sunny";
  } catch {
    clearTimeout(timer);
    return "sunny";
  }
}

function resolveEffect(bgEffect: BgEffect, weatherCondition: string): string {
  if (bgEffect === "weather") return `weather-${weatherCondition}`;
  return bgEffect;
}

// ==================== 全局 Keyframes（只注入一次）====================

const GLOBAL_KEYFRAMES = `
@keyframes bg-drift{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(2%,-1.5%) scale(1.01)}66%{transform:translate(-1.5%,2%) scale(0.99)}}
@keyframes bg-aurora{0%,100%{transform:translateX(-3%) scaleY(1);opacity:.7}50%{transform:translateX(3%) scaleY(1.12);opacity:1}}
@keyframes bg-wave{0%,100%{transform:translateX(-2%) scaleX(1.03)}50%{transform:translateX(2%) scaleX(.97)}}
@keyframes bg-twinkle{0%,100%{opacity:.15}50%{opacity:.8}}
@keyframes bg-float{0%{transform:translateY(100vh);opacity:0}5%{opacity:1}95%{opacity:1}100%{transform:translateY(-5vh);opacity:0}}
@keyframes bg-geo{0%,100%{transform:rotate(0) scale(1)}50%{transform:rotate(2deg) scale(1.01)}}
@keyframes bg-sun-pulse{0%,100%{transform:scale(1);opacity:.75}50%{transform:scale(1.08);opacity:1}}
@keyframes bg-sun-ray{0%,100%{opacity:.2}50%{opacity:.7}}
@keyframes bg-sun-arc{0%{transform:translate(-10vw,15vh) scale(0.85);opacity:0.3}15%{opacity:1}50%{transform:translate(0,0) scale(1);opacity:1}85%{opacity:1}100%{transform:translate(10vw,15vh) scale(0.85);opacity:0.3}}
@keyframes bg-sun-glow{0%,100%{opacity:.15;transform:scale(1)}50%{opacity:.4;transform:scale(1.15)}}
@keyframes bg-cloud-move{0%{transform:translate3d(-60%,0,0)}100%{transform:translate3d(110vw,0,0)}}
@keyframes bg-rain{0%{background-position:0 -100vh}100%{background-position:0 100vh}}
@keyframes bg-rain-slant{0%{background-position:0 -100vh}100%{background-position:-200px 100vh}}
@keyframes bg-snow{0%{background-position:0 -20vh}100%{background-position:40px 100vh}}
@keyframes bg-fog-drift{0%{transform:translate3d(0,0,0)}100%{transform:translate3d(33.33%,0,0)}}
@keyframes bg-fog-breathe{0%,100%{opacity:.2}50%{opacity:.85}}
@keyframes bg-fog-rise{0%,100%{transform:translateY(0) scaleY(1);opacity:.35}50%{transform:translateY(-8%) scaleY(1.08);opacity:.8}}
@keyframes bg-flash{0%,90%,100%{opacity:0}92%{opacity:.12}94%{opacity:0}96%{opacity:.08}}
`;

// ==================== 主组件 ====================

function DynamicBackground() {
  const bgEffect = useThemeStore((s) => s.bgEffect);
  const color = useThemeStore((s) => s.color);
  const darkMode = useThemeStore((s) => s.darkMode);
  const weatherCondition = useThemeStore((s) => s.weatherCondition);
  const setWeatherCondition = useThemeStore((s) => s.setWeatherCondition);

  const hue = THEME_COLORS[color]?.hue ?? 230;
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [darkMode]);

  useEffect(() => {
    if (bgEffect !== "weather") return;
    fetchWeather().then(setWeatherCondition);
    const interval = setInterval(() => fetchWeather().then(setWeatherCondition), 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [bgEffect, setWeatherCondition]);

  const effect = resolveEffect(bgEffect, weatherCondition);

  if (bgEffect === "none") return null;

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* 全局 keyframes 只注入一次 */}
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_KEYFRAMES }} />
      {effect === "gradient" && <GradientBg hue={hue} isDark={isDark} />}
      {effect === "aurora" && <AuroraBg hue={hue} isDark={isDark} />}
      {effect === "wave" && <WaveBg hue={hue} isDark={isDark} />}
      {effect === "starfield" && <StarfieldBg hue={hue} isDark={isDark} />}
      {effect === "particles" && <ParticlesBg hue={hue} isDark={isDark} />}
      {effect === "geometric" && <GeometricBg hue={hue} isDark={isDark} />}
      {effect === "weather-sunny" && <SunnyBg hue={hue} isDark={isDark} />}
      {effect === "weather-cloudy" && <CloudyBg hue={hue} isDark={isDark} />}
      {effect === "weather-rain" && <RainBg hue={hue} isDark={isDark} />}
      {effect === "weather-storm" && <StormBg hue={hue} isDark={isDark} />}
      {effect === "weather-snow" && <SnowBg hue={hue} isDark={isDark} />}
      {effect === "weather-fog" && <FogBg hue={hue} isDark={isDark} />}
    </div>
  );
}

export default memo(DynamicBackground);

// ==================== 通用 Props ====================

interface BgProps { hue: number; isDark: boolean; }

// ==================== 渐变流动（2 个 DOM 元素）====================

const GradientBg = memo(function GradientBg({ hue, isDark }: BgProps) {
  const bgL = isDark ? 0.16 : 0.97;
  const c = isDark ? 0.03 : 0.02;
  return (
    <div className="absolute inset-0" style={{ background: `oklch(${bgL} 0.005 ${hue})` }}>
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 20% 30%, oklch(${bgL + 0.03} ${c} ${hue}) 0%, transparent 70%),
            radial-gradient(ellipse 60% 80% at 80% 70%, oklch(${bgL + 0.02} ${c} ${hue + 40}) 0%, transparent 70%)
          `,
          animation: "bg-drift 25s ease-in-out infinite",
        }}
      />
    </div>
  );
});

// ==================== 极光（3 个 DOM 元素，无 blur）====================

const AuroraBg = memo(function AuroraBg({ hue, isDark }: BgProps) {
  const bgL = isDark ? 0.13 : 0.97;
  return (
    <div className="absolute inset-0" style={{ background: `oklch(${bgL} 0.005 ${hue})` }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute inset-x-0"
          style={{
            top: `${15 + i * 12}%`,
            height: "45%",
            background: `linear-gradient(180deg, oklch(${isDark ? 0.5 : 0.68} 0.16 ${hue + i * 40} / ${isDark ? 0.18 - i * 0.04 : 0.1 - i * 0.02}) 0%, transparent 100%)`,
            animation: `bg-aurora ${14 + i * 4}s ease-in-out infinite`,
            animationDelay: `${i * -5}s`,
          }}
        />
      ))}
    </div>
  );
});

// ==================== 波浪（3 个 DOM 元素，无 blur）====================

const WaveBg = memo(function WaveBg({ hue, isDark }: BgProps) {
  const bgL = isDark ? 0.13 : 0.97;
  return (
    <div className="absolute inset-0" style={{ background: `oklch(${bgL} 0.005 ${hue})` }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: `${30 + i * 8}%`,
            background: `oklch(${isDark ? 0.4 : 0.62} 0.1 ${hue + i * 15} / ${isDark ? 0.1 - i * 0.02 : 0.06 - i * 0.015})`,
            borderRadius: "45% 55% 0 0 / 18% 22% 0 0",
            animation: `bg-wave ${9 + i * 3}s ease-in-out infinite`,
            animationDelay: `${i * -3}s`,
          }}
        />
      ))}
    </div>
  );
});

// ==================== 星空（用 radial-gradient 背景代替 60 个 DOM）====================

const StarfieldBg = memo(function StarfieldBg({ hue, isDark }: BgProps) {
  const bgL = isDark ? 0.08 : 0.97;
  const starColor = isDark ? "oklch(0.92 0.04 " + hue + ")" : "oklch(0.45 0.06 " + hue + ")";

  // 用 useMemo 生成星星的 background-image（一次性，不会重新计算）
  const starsBg = useMemo(() => {
    const stars: string[] = [];
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const size = Math.random() * 2 + 0.5;
      stars.push(`radial-gradient(${size}px ${size}px at ${x}% ${y}%, ${starColor} 50%, transparent 100%)`);
    }
    return stars.join(",");
  }, [starColor]);

  return (
    <div className="absolute inset-0" style={{ background: `oklch(${bgL} 0.008 ${hue})` }}>
      {/* 第一层星星 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: starsBg,
          animation: "bg-twinkle 4s ease-in-out infinite",
        }}
      />
      {/* 第二层星星（偏移 + 不同节奏） */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: starsBg,
          transform: "translate(3%, 5%)",
          animation: "bg-twinkle 5.5s ease-in-out infinite",
          animationDelay: "-2s",
          opacity: 0.6,
        }}
      />
    </div>
  );
});

// ==================== 粒子漂浮（6 个 DOM 元素）====================

const ParticlesBg = memo(function ParticlesBg({ hue, isDark }: BgProps) {
  const bgL = isDark ? 0.13 : 0.97;
  const particles = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: 10 + (i * 16) % 80,
      size: 4 + (i % 3) * 2,
      duration: 18 + i * 4,
      delay: i * 3,
      alpha: 0.08 + (i % 3) * 0.04,
    })),
  []);

  return (
    <div className="absolute inset-0" style={{ background: `oklch(${bgL} 0.005 ${hue})` }}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            bottom: "-3%",
            width: p.size,
            height: p.size,
            background: `oklch(${isDark ? 0.65 : 0.55} 0.14 ${hue} / ${p.alpha})`,
            animation: `bg-float ${p.duration}s linear infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
});

// ==================== 几何线条（1 个 SVG）====================

const GeometricBg = memo(function GeometricBg({ hue, isDark }: BgProps) {
  const bgL = isDark ? 0.13 : 0.97;
  const strokeColor = `oklch(${isDark ? 0.5 : 0.45} 0.1 ${hue} / ${isDark ? 0.1 : 0.06})`;
  const dotColor = `oklch(${isDark ? 0.55 : 0.5} 0.12 ${hue} / ${isDark ? 0.15 : 0.1})`;
  return (
    <div className="absolute inset-0" style={{ background: `oklch(${bgL} 0.005 ${hue})` }}>
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ animation: "bg-geo 50s linear infinite" }}
      >
        {Array.from({ length: 8 }, (_, i) => (
          <line
            key={`l${i}`}
            x1={`${10 + (i * 12) % 90}%`} y1={`${5 + (i * 17) % 85}%`}
            x2={`${20 + ((i + 3) * 14) % 80}%`} y2={`${15 + ((i + 5) * 11) % 75}%`}
            stroke={strokeColor} strokeWidth="1"
          />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <circle
            key={`c${i}`}
            cx={`${15 + (i * 16) % 80}%`} cy={`${10 + (i * 19) % 80}%`}
            r="2.5" fill={dotColor}
          />
        ))}
      </svg>
    </div>
  );
});

// ==================== 天气：晴天（3 个 DOM 元素）====================

const SunnyBg = memo(function SunnyBg({ hue, isDark }: BgProps) {
  const bgL = isDark ? 0.14 : 0.97;
  const sunHue = 65; // 暖黄色
  const sunCore = isDark ? 0.6 : 0.92;
  const sunAlpha = isDark ? 0.35 : 0.55;
  return (
    <div className="absolute inset-0" style={{
      background: `linear-gradient(180deg, oklch(${isDark ? 0.16 : 0.92} 0.02 210) 0%, oklch(${bgL} 0.015 ${sunHue}) 40%, oklch(${isDark ? 0.18 : 0.95} 0.025 ${sunHue}) 100%)`,
    }}>
      {/* 天空渐变 — 从蓝到暖 */}
      <div className="absolute inset-0" style={{
        background: `linear-gradient(180deg, oklch(${isDark ? 0.2 : 0.85} 0.04 210 / 0.3) 0%, transparent 50%)`,
      }} />
      {/* 太阳主体 — 沿弧线运动（东升西落） */}
      <div
        className="absolute"
        style={{
          top: "3%",
          left: "50%",
          marginLeft: "-18vmin",
          width: "36vmin",
          height: "36vmin",
          borderRadius: "50%",
          background: `radial-gradient(circle at 50% 50%, oklch(${sunCore} 0.22 ${sunHue} / ${sunAlpha}) 0%, oklch(${sunCore - 0.05} 0.18 ${sunHue} / ${sunAlpha * 0.6}) 30%, oklch(${sunCore - 0.1} 0.12 ${sunHue} / ${sunAlpha * 0.2}) 55%, transparent 70%)`,
          animation: "bg-sun-arc 60s ease-in-out infinite",
        }}
      />
      {/* 太阳内核（更亮更小） */}
      <div
        className="absolute"
        style={{
          top: "3%",
          left: "50%",
          marginLeft: "-8vmin",
          width: "16vmin",
          height: "16vmin",
          borderRadius: "50%",
          background: `radial-gradient(circle, oklch(${isDark ? 0.7 : 0.98} 0.25 ${sunHue} / ${isDark ? 0.5 : 0.8}) 0%, oklch(${isDark ? 0.6 : 0.95} 0.2 ${sunHue} / ${isDark ? 0.2 : 0.3}) 50%, transparent 100%)`,
          animation: "bg-sun-arc 60s ease-in-out infinite",
        }}
      />
      {/* 光芒扩散 */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 15%, oklch(${isDark ? 0.4 : 0.9} 0.1 ${sunHue} / ${isDark ? 0.12 : 0.2}) 0%, transparent 70%)`,
          animation: "bg-sun-glow 8s ease-in-out infinite",
        }}
      />
      {/* 光线束（从太阳向下辐射） */}
      <div
        className="absolute"
        style={{
          top: "5%",
          left: "30%",
          width: "40%",
          height: "70%",
          background: `linear-gradient(175deg, oklch(0.9 0.12 ${sunHue} / ${isDark ? 0.06 : 0.12}) 0%, transparent 50%)`,
          animation: "bg-sun-ray 6s ease-in-out infinite",
        }}
      />
      <div
        className="absolute"
        style={{
          top: "5%",
          left: "45%",
          width: "35%",
          height: "65%",
          background: `linear-gradient(165deg, oklch(0.88 0.1 ${sunHue + 10} / ${isDark ? 0.04 : 0.08}) 0%, transparent 45%)`,
          animation: "bg-sun-ray 8s ease-in-out infinite",
          animationDelay: "-3s",
        }}
      />
      {/* 底部暖色地面 */}
      <div
        className="absolute inset-x-0 bottom-0 h-[25%]"
        style={{
          background: `linear-gradient(0deg, oklch(${isDark ? 0.2 : 0.93} 0.035 ${sunHue} / ${isDark ? 0.2 : 0.2}) 0%, transparent 100%)`,
        }}
      />
    </div>
  );
});

// ==================== 天气：多云（用 box-shadow 构建云朵轮廓）====================

/* 多云 — 每朵云用一个 div + box-shadow 构建蓬松形态，vw 单位确保可见 */
const CloudyBg = memo(function CloudyBg({ hue, isDark }: BgProps) {
  const bgL = isDark ? 0.14 : 0.90;
  // 云朵颜色
  const cloudColor = isDark ? "rgba(55,65,85,0.85)" : "rgba(240,243,250,0.92)";
  const cloudShadow = isDark ? "rgba(45,55,75,0.7)" : "rgba(230,235,248,0.85)";

  // 每朵云用一个圆形 div + 多个 box-shadow 来构建蓬松形态
  // box-shadow 不增加 DOM，性能极好
  const clouds = useMemo(() => [
    {
      top: "5%", size: "8vw", dur: 45, delay: 0, opacity: isDark ? 0.7 : 0.9,
      shadow: `
        ${cloudColor} 10vw 0.5vw 0 -0.5vw,
        ${cloudColor} 5vw -2vw 0 0.5vw,
        ${cloudColor} 15vw -1vw 0 0vw,
        ${cloudShadow} 3vw 1vw 0 1.5vw,
        ${cloudShadow} 12vw 1.5vw 0 1vw,
        ${cloudShadow} 8vw -0.5vw 0 2vw
      `,
    },
    {
      top: "12%", size: "6vw", dur: 36, delay: -15, opacity: isDark ? 0.8 : 0.95,
      shadow: `
        ${cloudColor} 8vw 0.3vw 0 -0.3vw,
        ${cloudColor} 4vw -1.5vw 0 0.3vw,
        ${cloudColor} 12vw -0.8vw 0 0vw,
        ${cloudShadow} 2.5vw 0.8vw 0 1.2vw,
        ${cloudShadow} 9vw 1vw 0 0.8vw,
        ${cloudShadow} 6vw -0.3vw 0 1.5vw
      `,
    },
    {
      top: "2%", size: "10vw", dur: 52, delay: -28, opacity: isDark ? 0.5 : 0.7,
      shadow: `
        ${cloudColor} 12vw 0.8vw 0 -0.8vw,
        ${cloudColor} 6vw -2.5vw 0 0.8vw,
        ${cloudColor} 18vw -1.2vw 0 0.3vw,
        ${cloudShadow} 4vw 1.2vw 0 2vw,
        ${cloudShadow} 14vw 1.8vw 0 1.5vw,
        ${cloudShadow} 9vw -0.8vw 0 2.5vw,
        ${cloudShadow} 20vw 0.5vw 0 1vw
      `,
    },
    {
      top: "8%", size: "5vw", dur: 32, delay: -8, opacity: isDark ? 0.75 : 0.85,
      shadow: `
        ${cloudColor} 6vw 0.2vw 0 -0.2vw,
        ${cloudColor} 3vw -1.2vw 0 0.2vw,
        ${cloudColor} 9vw -0.5vw 0 0vw,
        ${cloudShadow} 2vw 0.6vw 0 1vw,
        ${cloudShadow} 7vw 0.8vw 0 0.6vw
      `,
    },
    {
      top: "15%", size: "7vw", dur: 40, delay: -20, opacity: isDark ? 0.6 : 0.75,
      shadow: `
        ${cloudColor} 9vw 0.4vw 0 -0.4vw,
        ${cloudColor} 4.5vw -1.8vw 0 0.4vw,
        ${cloudColor} 13vw -1vw 0 0.2vw,
        ${cloudShadow} 3vw 1vw 0 1.3vw,
        ${cloudShadow} 10vw 1.2vw 0 1vw,
        ${cloudShadow} 7vw -0.4vw 0 1.8vw
      `,
    },
  ], [isDark, cloudColor, cloudShadow]);

  return (
    <div className="absolute inset-0" style={{
      background: `linear-gradient(180deg, oklch(${isDark ? 0.18 : 0.78} 0.025 215) 0%, oklch(${bgL} 0.015 ${hue}) 50%, oklch(${bgL + 0.02} 0.008 ${hue}) 100%)`,
    }}>
      {/* 云朵 — 每朵用 box-shadow 构建，整体飘动 */}
      {clouds.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: c.top,
            left: 0,
            width: c.size,
            height: c.size,
            borderRadius: "50%",
            background: cloudColor,
            boxShadow: c.shadow,
            opacity: c.opacity,
            willChange: "transform",
            animation: `bg-cloud-move ${c.dur}s linear infinite`,
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}
      {/* 天空氛围 */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse 130% 60% at 50% 15%, oklch(${isDark ? 0.22 : 0.85} 0.015 210 / 0.4) 0%, transparent 70%)`,
      }} />
      {/* 底部微亮 */}
      <div className="absolute inset-x-0 bottom-0 h-[25%]" style={{
        background: `linear-gradient(0deg, oklch(${isDark ? 0.18 : 0.92} 0.008 ${hue} / 0.2) 0%, transparent 100%)`,
      }} />
    </div>
  );
});

// ==================== 天气：雨天（用 SVG 背景平铺 + 单层动画）====================

const RainBg = memo(function RainBg({ hue, isDark }: BgProps) {
  const bgL = isDark ? 0.11 : 0.91;
  const dropColor = isDark ? "rgba(140,170,210,0.25)" : "rgba(100,140,200,0.2)";

  // 用 SVG 生成雨滴图案，作为 background-image 平铺
  const rainSvg = useMemo(() => {
    const lines: string[] = [];
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 200;
      const y = Math.random() * 400;
      const len = 12 + Math.random() * 18;
      lines.push(`<line x1="${x}" y1="${y}" x2="${x - 2}" y2="${y + len}" stroke="${dropColor}" stroke-width="1.2" stroke-linecap="round"/>`);
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="400">${lines.join("")}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }, [dropColor]);

  return (
    <div className="absolute inset-0" style={{
      background: `linear-gradient(180deg, oklch(${bgL - 0.03} 0.012 ${hue}) 0%, oklch(${bgL} 0.008 ${hue}) 100%)`,
    }}>
      {/* 暗色云层 */}
      <div className="absolute inset-x-0 top-0 h-[35%]" style={{
        background: `linear-gradient(180deg, oklch(${isDark ? 0.15 : 0.82} 0.015 ${hue} / 0.5) 0%, transparent 100%)`,
      }} />
      {/* 雨滴层 1 */}
      <div className="absolute inset-0" style={{
        backgroundImage: rainSvg,
        backgroundRepeat: "repeat",
        animation: "bg-rain 1.2s linear infinite",
      }} />
      {/* 雨滴层 2（偏移，增加密度感） */}
      <div className="absolute inset-0" style={{
        backgroundImage: rainSvg,
        backgroundRepeat: "repeat",
        backgroundPosition: "100px 50px",
        animation: "bg-rain 0.9s linear infinite",
        animationDelay: "-0.3s",
        opacity: 0.7,
      }} />
      {/* 地面水汽 */}
      <div className="absolute inset-x-0 bottom-0 h-[15%]" style={{
        background: `linear-gradient(0deg, oklch(${isDark ? 0.18 : 0.9} 0.008 ${hue} / 0.4) 0%, transparent 100%)`,
      }} />
    </div>
  );
});

// ==================== 天气：雷暴（雨 + 闪电 CSS 动画）====================

const StormBg = memo(function StormBg({ hue, isDark }: BgProps) {
  const bgL = isDark ? 0.09 : 0.85;
  const dropColor = isDark ? "rgba(130,160,200,0.3)" : "rgba(80,120,180,0.25)";

  const rainSvg = useMemo(() => {
    const lines: string[] = [];
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 200;
      const y = Math.random() * 300;
      const len = 15 + Math.random() * 22;
      lines.push(`<line x1="${x}" y1="${y}" x2="${x - 4}" y2="${y + len}" stroke="${dropColor}" stroke-width="1.5" stroke-linecap="round"/>`);
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300">${lines.join("")}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }, [dropColor]);

  return (
    <div className="absolute inset-0" style={{
      background: `linear-gradient(180deg, oklch(${bgL - 0.04} 0.015 ${hue}) 0%, oklch(${bgL} 0.01 ${hue}) 100%)`,
    }}>
      {/* 厚重暗云 */}
      <div className="absolute inset-x-0 top-0 h-[45%]" style={{
        background: `linear-gradient(180deg, oklch(${isDark ? 0.1 : 0.7} 0.02 ${hue} / 0.65) 0%, transparent 100%)`,
      }} />
      {/* 闪电效果 — 纯 CSS 动画，无 JS setTimeout */}
      <div className="absolute inset-0" style={{
        background: `oklch(0.95 0.02 ${hue})`,
        animation: "bg-flash 4s ease-in-out infinite",
      }} />
      <div className="absolute inset-0" style={{
        background: `oklch(0.95 0.02 ${hue})`,
        animation: "bg-flash 7s ease-in-out infinite",
        animationDelay: "-2.5s",
      }} />
      {/* 暴雨层 */}
      <div className="absolute inset-0" style={{
        backgroundImage: rainSvg,
        backgroundRepeat: "repeat",
        animation: "bg-rain-slant 0.8s linear infinite",
      }} />
      <div className="absolute inset-0" style={{
        backgroundImage: rainSvg,
        backgroundRepeat: "repeat",
        backgroundPosition: "80px 30px",
        animation: "bg-rain-slant 0.65s linear infinite",
        animationDelay: "-0.2s",
        opacity: 0.6,
      }} />
      {/* 底部水汽 */}
      <div className="absolute inset-x-0 bottom-0 h-[20%]" style={{
        background: `linear-gradient(0deg, oklch(${isDark ? 0.15 : 0.85} 0.01 ${hue} / 0.5) 0%, transparent 100%)`,
      }} />
    </div>
  );
});

// ==================== 天气：雪天（SVG 背景平铺 + translateY）====================

const SnowBg = memo(function SnowBg({ hue, isDark }: BgProps) {
  const bgL = isDark ? 0.13 : 0.96;
  const flakeColor = isDark ? "rgba(200,210,230,0.5)" : "rgba(255,255,255,0.8)";
  const flakeStroke = isDark ? "rgba(160,180,210,0.3)" : "rgba(180,200,230,0.4)";

  const snowSvg = useMemo(() => {
    const circles: string[] = [];
    for (let i = 0; i < 25; i++) {
      const x = Math.random() * 300;
      const y = Math.random() * 400;
      const r = 1.5 + Math.random() * 3;
      circles.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${flakeColor}" stroke="${flakeStroke}" stroke-width="0.3"/>`);
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400">${circles.join("")}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }, [flakeColor, flakeStroke]);

  return (
    <div className="absolute inset-0" style={{
      background: `linear-gradient(180deg, oklch(${bgL - 0.01} 0.006 ${hue}) 0%, oklch(${bgL} 0.004 ${hue}) 100%)`,
    }}>
      {/* 雪花层 1 */}
      <div className="absolute inset-0" style={{
        backgroundImage: snowSvg,
        backgroundRepeat: "repeat",
        animation: "bg-snow 8s linear infinite",
      }} />
      {/* 雪花层 2（不同速度 + 偏移） */}
      <div className="absolute inset-0" style={{
        backgroundImage: snowSvg,
        backgroundRepeat: "repeat",
        backgroundPosition: "150px 100px",
        animation: "bg-snow 12s linear infinite",
        animationDelay: "-4s",
        opacity: 0.5,
      }} />
      {/* 地面积雪感 */}
      <div className="absolute inset-x-0 bottom-0 h-[12%]" style={{
        background: `linear-gradient(0deg, oklch(${isDark ? 0.25 : 0.98} 0.003 ${hue} / ${isDark ? 0.3 : 0.5}) 0%, transparent 100%)`,
      }} />
      {/* 整体冷色调氛围 */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse 100% 80% at 50% 30%, oklch(${isDark ? 0.18 : 0.94} 0.01 210 / 0.15) 0%, transparent 70%)`,
      }} />
    </div>
  );
});

// ==================== 天气：雾天（SVG 雾气纹理 + translateX 飘动）====================

const FogBg = memo(function FogBg({ hue, isDark }: BgProps) {
  // 用 SVG 生成柔和的雾气纹理，作为 background-image 平铺
  // 然后用 translateX 动画让整个纹理层水平飘动
  const fogColor1 = isDark ? "rgba(160,175,200,0.35)" : "rgba(255,255,255,0.7)";
  const fogColor2 = isDark ? "rgba(140,158,185,0.25)" : "rgba(240,245,255,0.55)";
  const fogColor3 = isDark ? "rgba(120,140,170,0.18)" : "rgba(225,235,250,0.4)";

  // 生成 SVG 雾气纹理 — 多个大椭圆叠加
  const fogSvg1 = useMemo(() => {
    const els: string[] = [];
    for (let i = 0; i < 8; i++) {
      const cx = Math.random() * 600;
      const cy = 100 + Math.random() * 200;
      const rx = 120 + Math.random() * 200;
      const ry = 40 + Math.random() * 60;
      els.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fogColor1}" />`);
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">${els.join("")}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }, [fogColor1]);

  const fogSvg2 = useMemo(() => {
    const els: string[] = [];
    for (let i = 0; i < 6; i++) {
      const cx = 50 + Math.random() * 500;
      const cy = 80 + Math.random() * 240;
      const rx = 100 + Math.random() * 180;
      const ry = 35 + Math.random() * 55;
      els.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fogColor2}" />`);
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">${els.join("")}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }, [fogColor2]);

  const fogSvg3 = useMemo(() => {
    const els: string[] = [];
    for (let i = 0; i < 5; i++) {
      const cx = Math.random() * 600;
      const cy = 120 + Math.random() * 180;
      const rx = 150 + Math.random() * 220;
      const ry = 50 + Math.random() * 70;
      els.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fogColor3}" />`);
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">${els.join("")}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }, [fogColor3]);

  return (
    <div className="absolute inset-0" style={{
      background: isDark
        ? `linear-gradient(180deg, rgb(22,28,38) 0%, rgb(32,40,55) 40%, rgb(28,35,48) 100%)`
        : `linear-gradient(180deg, rgb(180,195,215) 0%, rgb(195,210,228) 40%, rgb(188,202,222) 100%)`,
    }}>
      {/* 雾气层 1 — 最慢最大，向右飘 */}
      <div className="absolute" style={{
        top: "-10%",
        left: "-100%",
        width: "300%",
        height: "120%",
        backgroundImage: fogSvg1,
        backgroundRepeat: "repeat",
        backgroundSize: "600px 400px",
        willChange: "transform",
        animation: "bg-fog-drift 25s linear infinite",
      }} />
      {/* 雾气层 2 — 中速，向左飘 */}
      <div className="absolute" style={{
        top: "5%",
        left: "-100%",
        width: "300%",
        height: "110%",
        backgroundImage: fogSvg2,
        backgroundRepeat: "repeat",
        backgroundSize: "600px 400px",
        backgroundPosition: "200px 50px",
        willChange: "transform",
        animation: "bg-fog-drift 18s linear infinite reverse",
        animationDelay: "-6s",
      }} />
      {/* 雾气层 3 — 最快最淡 */}
      <div className="absolute" style={{
        top: "-5%",
        left: "-100%",
        width: "300%",
        height: "115%",
        backgroundImage: fogSvg3,
        backgroundRepeat: "repeat",
        backgroundSize: "600px 400px",
        backgroundPosition: "100px 80px",
        willChange: "transform",
        animation: "bg-fog-drift 14s linear infinite",
        animationDelay: "-3s",
      }} />
      {/* 呼吸感覆盖 */}
      <div className="absolute inset-0" style={{
        background: isDark
          ? `radial-gradient(ellipse 120% 100% at 50% 50%, rgba(160,175,200,0.2) 0%, transparent 70%)`
          : `radial-gradient(ellipse 120% 100% at 50% 50%, rgba(255,255,255,0.35) 0%, transparent 70%)`,
        animation: "bg-fog-breathe 8s ease-in-out infinite",
      }} />
      {/* 底部浓雾 */}
      <div className="absolute inset-x-0 bottom-0 h-[40%]" style={{
        background: isDark
          ? `linear-gradient(0deg, rgba(160,175,200,0.5) 0%, rgba(140,158,185,0.2) 50%, transparent 100%)`
          : `linear-gradient(0deg, rgba(255,255,255,0.75) 0%, rgba(240,245,255,0.35) 50%, transparent 100%)`,
        animation: "bg-fog-rise 12s ease-in-out infinite",
      }} />
    </div>
  );
});
