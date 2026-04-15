import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeColor = "blue" | "orange" | "purple" | "green" | "rose";
export type DarkMode = "light" | "dark" | "system";
export type BgEffect =
  | "none"
  | "gradient"
  | "particles"
  | "geometric"
  | "aurora"
  | "wave"
  | "starfield"
  | "weather"
  | "weather-sunny"
  | "weather-cloudy"
  | "weather-rain"
  | "weather-storm"
  | "weather-snow"
  | "weather-fog"
  | "weather-hail"
  | "weather-sandstorm";

export interface WeatherConfig {
  cloudCover: number;       // 0-1
  particleCount: number;    // 50-500
  speed: number;            // 0.3-3
  wind: number;             // -5 to 5
  thunder: boolean;
  fogDensity: number;       // 0-1
  intensity: number;        // 0.3-3 (sun intensity / sand density)
  temperature: number;      // -15 to 10 (snow melt)
}

export const DEFAULT_WEATHER_CONFIG: WeatherConfig = {
  cloudCover: 0.5,
  particleCount: 200,
  speed: 1,
  wind: 0,
  thunder: false,
  fogDensity: 0.5,
  intensity: 1,
  temperature: 0,
};

interface ThemeState {
  color: ThemeColor;
  darkMode: DarkMode;
  bgEffect: BgEffect;
  weatherCondition: string;
  weatherConfig: WeatherConfig;
  setColor: (c: ThemeColor) => void;
  setDarkMode: (m: DarkMode) => void;
  setBgEffect: (e: BgEffect) => void;
  setWeatherCondition: (w: string) => void;
  setWeatherConfig: (cfg: Partial<WeatherConfig>) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      color: "blue",
      darkMode: "light",
      bgEffect: "gradient",
      weatherCondition: "clear",
      weatherConfig: { ...DEFAULT_WEATHER_CONFIG },
      setColor: (color) => set({ color }),
      setDarkMode: (darkMode) => set({ darkMode }),
      setBgEffect: (bgEffect) => set({ bgEffect }),
      setWeatherCondition: (weatherCondition) => set({ weatherCondition }),
      setWeatherConfig: (cfg) => set((s) => ({ weatherConfig: { ...s.weatherConfig, ...cfg } })),
    }),
    {
      name: "yantu-theme",
      merge: (persisted, current) => {
        const p = persisted as Partial<ThemeState> | undefined;
        if (!p) return current;
        return {
          ...current,
          ...p,
          weatherConfig: { ...DEFAULT_WEATHER_CONFIG, ...(p.weatherConfig || {}) },
        };
      },
    },
  ),
);

/** 主题颜色配置映射 */
export const THEME_COLORS: Record<ThemeColor, { label: string; hue: number; preview: string }> = {
  blue:   { label: "清新蓝", hue: 230, preview: "oklch(0.55 0.18 230)" },
  orange: { label: "活力橙", hue: 55,  preview: "oklch(0.65 0.20 55)" },
  purple: { label: "学术紫", hue: 290, preview: "oklch(0.55 0.18 290)" },
  green:  { label: "自然绿", hue: 145, preview: "oklch(0.55 0.18 145)" },
  rose:   { label: "玫瑰粉", hue: 350, preview: "oklch(0.60 0.18 350)" },
};

/** 背景特效分组 */
export const BG_EFFECT_GROUPS: { label: string; items: { key: BgEffect; label: string; emoji: string }[] }[] = [
  {
    label: "基础",
    items: [
      { key: "none",      label: "无",     emoji: "⬜" },
      { key: "gradient",  label: "渐变",   emoji: "🌈" },
      { key: "aurora",    label: "极光",   emoji: "🌌" },
      { key: "wave",      label: "波浪",   emoji: "🌊" },
      { key: "starfield", label: "星空",   emoji: "✨" },
      { key: "particles", label: "粒子",   emoji: "💫" },
      { key: "geometric", label: "几何",   emoji: "📐" },
    ],
  },
  {
    label: "天气",
    items: [
      { key: "weather",        label: "自动跟随", emoji: "🌐" },
      { key: "weather-sunny",  label: "晴天",     emoji: "☀️" },
      { key: "weather-cloudy", label: "多云",     emoji: "⛅" },
      { key: "weather-rain",   label: "雨天",     emoji: "🌧️" },
      { key: "weather-storm",  label: "雷暴",     emoji: "⛈️" },
      { key: "weather-snow",      label: "雪天",     emoji: "❄️" },
      { key: "weather-fog",       label: "雾天",     emoji: "🌫️" },
      { key: "weather-hail",      label: "冰雹",     emoji: "🧊" },
      { key: "weather-sandstorm", label: "沙尘暴",   emoji: "🏜️" },
    ],
  },
];
