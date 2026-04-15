"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Sun, Moon, Monitor, Cloud, Wind, Zap, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useThemeStore, THEME_COLORS, BG_EFFECT_GROUPS,
  type ThemeColor, type DarkMode, type WeatherConfig,
} from "@/lib/stores/theme-store";

const DARK_MODES: { value: DarkMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "浅色", icon: Sun },
  { value: "dark", label: "深色", icon: Moon },
  { value: "system", label: "跟随系统", icon: Monitor },
];

const WEATHER_LABELS: Record<string, string> = {
  sunny: "☀️ 晴天", cloudy: "⛅ 多云", rain: "🌧️ 雨天", storm: "⛈️ 雷暴",
  snow: "❄️ 雪天", fog: "🌫️ 雾天", hail: "🧊 冰雹", sandstorm: "🏜️ 沙尘暴",
};

export default function ThemeSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const {
    color, darkMode, bgEffect, weatherCondition, weatherConfig,
    setColor, setDarkMode, setBgEffect, setWeatherConfig,
  } = useThemeStore();

  const isWeatherActive = bgEffect === "weather" || bgEffect.startsWith("weather-");
  const activeWeatherType = bgEffect === "weather" ? weatherCondition : bgEffect.replace("weather-", "");

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(t) && buttonRef.current && !buttonRef.current.contains(t))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  return (
    <div className="relative">
      <Button ref={buttonRef} variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setIsOpen(!isOpen)} title="主题设置">
        <Palette className="h-4 w-4" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 w-80 max-h-[85vh] overflow-y-auto rounded-xl border bg-card p-4 shadow-xl"
          >
            {/* 颜色主题 */}
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2.5">颜色主题</h4>
              <div className="flex gap-2">
                {(Object.entries(THEME_COLORS) as [ThemeColor, typeof THEME_COLORS.blue][]).map(([key, val]) => (
                  <button key={key} onClick={() => setColor(key)} className={cn(
                    "group flex flex-col items-center gap-1.5 rounded-lg p-2 transition-all hover:bg-muted/50",
                    color === key && "bg-muted ring-1 ring-primary/30",
                  )} title={val.label}>
                    <div className={cn(
                      "h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-card transition-all",
                      color === key ? "ring-primary scale-110" : "ring-transparent group-hover:ring-muted-foreground/20",
                    )} style={{ background: val.preview }} />
                    <span className="text-xs text-muted-foreground">{val.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 外观模式 */}
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2.5">外观模式</h4>
              <div className="flex gap-1.5">
                {DARK_MODES.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button key={m.value} onClick={() => setDarkMode(m.value)} className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                      darkMode === m.value ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "bg-muted/50 text-muted-foreground hover:bg-muted",
                    )}>
                      <Icon className="h-3.5 w-3.5" />{m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 背景效果 */}
            {BG_EFFECT_GROUPS.map((group) => (
              <div key={group.label} className="mb-3">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">{group.label}背景</h4>
                <div className="grid grid-cols-4 gap-1.5">
                  {group.items.map((item) => (
                    <button key={item.key} onClick={() => setBgEffect(item.key)} className={cn(
                      "flex flex-col items-center gap-1 rounded-lg px-1.5 py-2 text-center transition-all",
                      bgEffect === item.key ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "bg-muted/40 text-muted-foreground hover:bg-muted",
                    )}>
                      <span className="text-base leading-none">{item.emoji}</span>
                      <span className="text-xs font-medium leading-tight">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* 天气参数控制面板 — 根据天气类型显示不同参数 */}
            {isWeatherActive && (
              <div className="mt-1 pt-3 border-t space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5" /> 天气参数
                </h4>

                {bgEffect === "weather" && weatherCondition && (
                  <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-medium">🌐 当前：</span>
                    <span>{WEATHER_LABELS[weatherCondition] || weatherCondition}</span>
                    <span className="block mt-0.5 opacity-50">Open-Meteo · 浏览器定位</span>
                  </div>
                )}

                <WeatherParams type={activeWeatherType} config={weatherConfig} onChange={setWeatherConfig} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SliderRow({ icon: Icon, label, value, min, max, step, display, onChange }: {
  icon: typeof Cloud; label: string; value: number; min: number; max: number; step: number;
  display: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-xs">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{label}</span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-muted-foreground/15 cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-sm
          [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background"
      />
    </div>
  );
}

function ToggleRow({ icon: Icon, label, value, onChange }: {
  icon: typeof Cloud; label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium">{label}</span>
      </div>
      <button onClick={() => onChange(!value)} className={cn(
        "relative h-5 w-9 rounded-full transition-colors",
        value ? "bg-primary" : "bg-muted-foreground/20",
      )}>
        <div className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          value ? "translate-x-4" : "translate-x-0.5",
        )} />
      </button>
    </div>
  );
}

function WeatherParams({ type, config, onChange }: {
  type: string; config: WeatherConfig; onChange: (cfg: Partial<WeatherConfig>) => void;
}) {
  return (
    <div className="space-y-2.5">
      {/* 晴天: 光照强度 */}
      {type === "sunny" && (
        <SliderRow icon={Sun} label="光照强度" value={config.intensity} min={0.3} max={3} step={0.1}
          display={`${config.intensity.toFixed(1)}x`}
          onChange={(v) => onChange({ intensity: v })} />
      )}

      {/* 多云: 云量 + 移动速度 */}
      {type === "cloudy" && (<>
        <SliderRow icon={Cloud} label="云量" value={config.cloudCover} min={0} max={1} step={0.05}
          display={`${Math.round(config.cloudCover * 100)}%`}
          onChange={(v) => onChange({ cloudCover: v })} />
        <SliderRow icon={Gauge} label="移动速度" value={config.speed} min={0.3} max={3} step={0.1}
          display={`${config.speed.toFixed(1)}x`}
          onChange={(v) => onChange({ speed: v })} />
      </>)}

      {/* 雨天: 云量 + 降水量 + 速度 + 风力 + 雷电 */}
      {(type === "rain" || type === "storm") && (<>
        <SliderRow icon={Cloud} label="云量" value={config.cloudCover} min={0} max={1} step={0.05}
          display={`${Math.round(config.cloudCover * 100)}%`}
          onChange={(v) => onChange({ cloudCover: v })} />
        <SliderRow icon={Gauge} label="降水量" value={config.particleCount} min={50} max={500} step={10}
          display={`${config.particleCount}`}
          onChange={(v) => onChange({ particleCount: v })} />
        <SliderRow icon={Gauge} label="下落速度" value={config.speed} min={0.3} max={3} step={0.1}
          display={`${config.speed.toFixed(1)}x`}
          onChange={(v) => onChange({ speed: v })} />
        <SliderRow icon={Wind} label="风力" value={config.wind} min={-5} max={5} step={0.5}
          display={config.wind === 0 ? "无风" : config.wind > 0 ? `→ ${config.wind.toFixed(1)}` : `← ${Math.abs(config.wind).toFixed(1)}`}
          onChange={(v) => onChange({ wind: v })} />
        <ToggleRow icon={Zap} label="雷电" value={config.thunder} onChange={(v) => onChange({ thunder: v })} />
      </>)}

      {/* 雪天: 降雪量 + 速度 + 风力 + 温度 */}
      {type === "snow" && (<>
        <SliderRow icon={Gauge} label="降雪量" value={config.particleCount} min={50} max={400} step={10}
          display={`${config.particleCount}`}
          onChange={(v) => onChange({ particleCount: v })} />
        <SliderRow icon={Gauge} label="下落速度" value={config.speed} min={0.3} max={3} step={0.1}
          display={`${config.speed.toFixed(1)}x`}
          onChange={(v) => onChange({ speed: v })} />
        <SliderRow icon={Wind} label="风力" value={config.wind} min={-5} max={5} step={0.5}
          display={config.wind === 0 ? "无风" : config.wind > 0 ? `→ ${config.wind.toFixed(1)}` : `← ${Math.abs(config.wind).toFixed(1)}`}
          onChange={(v) => onChange({ wind: v })} />
        <SliderRow icon={Gauge} label="温度" value={config.temperature} min={-15} max={10} step={1}
          display={`${config.temperature}°C`}
          onChange={(v) => onChange({ temperature: v })} />
      </>)}

      {/* 雾天: 浓度 */}
      {type === "fog" && (
        <SliderRow icon={Cloud} label="雾浓度" value={config.fogDensity} min={0.1} max={1} step={0.05}
          display={`${Math.round(config.fogDensity * 100)}%`}
          onChange={(v) => onChange({ fogDensity: v })} />
      )}

      {/* 冰雹: 云量 + 降雨量 + 冰雹数量 + 速度 + 风力 + 雷电 */}
      {type === "hail" && (<>
        <SliderRow icon={Cloud} label="云量" value={config.cloudCover} min={0} max={1} step={0.05}
          display={`${Math.round(config.cloudCover * 100)}%`}
          onChange={(v) => onChange({ cloudCover: v })} />
        <SliderRow icon={Gauge} label="冰雹数量" value={config.particleCount} min={20} max={150} step={5}
          display={`${config.particleCount}`}
          onChange={(v) => onChange({ particleCount: v })} />
        <SliderRow icon={Gauge} label="下落速度" value={config.speed} min={0.5} max={3} step={0.1}
          display={`${config.speed.toFixed(1)}x`}
          onChange={(v) => onChange({ speed: v })} />
        <SliderRow icon={Wind} label="风力" value={config.wind} min={-5} max={5} step={0.5}
          display={config.wind === 0 ? "无风" : config.wind > 0 ? `→ ${config.wind.toFixed(1)}` : `← ${Math.abs(config.wind).toFixed(1)}`}
          onChange={(v) => onChange({ wind: v })} />
        <ToggleRow icon={Zap} label="雷电" value={config.thunder} onChange={(v) => onChange({ thunder: v })} />
      </>)}

      {/* 沙尘暴: 沙尘浓度 + 风力 */}
      {type === "sandstorm" && (<>
        <SliderRow icon={Gauge} label="沙尘浓度" value={config.intensity} min={0.2} max={2} step={0.1}
          display={`${(config.intensity * 100).toFixed(0)}%`}
          onChange={(v) => onChange({ intensity: v })} />
        <SliderRow icon={Wind} label="风力" value={config.wind} min={-5} max={5} step={0.5}
          display={config.wind === 0 ? "无风" : config.wind > 0 ? `→ ${config.wind.toFixed(1)}` : `← ${Math.abs(config.wind).toFixed(1)}`}
          onChange={(v) => onChange({ wind: v })} />
      </>)}
    </div>
  );
}
