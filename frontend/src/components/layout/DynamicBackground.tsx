"use client";

import { useEffect, useRef, useState, memo } from "react";
import { useThemeStore, THEME_COLORS } from "@/lib/stores/theme-store";

const WEATHER_CACHE_KEY = "yantu-weather-v2";
const WEATHER_CACHE_TTL = 600000; // 10 min

function wmoToCondition(code: number): string {
  if (code === 0 || code === 1) return "sunny";
  if (code === 2 || code === 3) return "cloudy";
  if (code >= 45 && code <= 48) return "fog";
  if (code >= 51 && code <= 55) return "rain";
  if (code >= 56 && code <= 57) return "hail";
  if (code >= 61 && code <= 65) return "rain";
  if (code >= 66 && code <= 67) return "hail";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain";
  if (code >= 85 && code <= 86) return "snow";
  if (code >= 95 && code <= 99) return "storm";
  return "sunny";
}

async function getGeoPosition(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 600000 },
    );
  });
}

async function fetchWeather(): Promise<string> {
  try {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (cached) {
      const { condition, ts } = JSON.parse(cached);
      if (Date.now() - ts < WEATHER_CACHE_TTL) return condition;
    }
  } catch {}

  try {
    const geo = await getGeoPosition();
    const lat = geo?.lat ?? 39.9; // default: Beijing
    const lon = geo?.lon ?? 116.4;

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 6000);
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
      { signal: ac.signal },
    );
    clearTimeout(timer);

    if (!res.ok) return "sunny";
    const data = await res.json();
    const code = data?.current_weather?.weathercode ?? 0;
    const condition = wmoToCondition(code);

    try { localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ condition, ts: Date.now() })); } catch {}
    return condition;
  } catch {
    return "sunny";
  }
}

/* ================================================================
   Root Component
   ================================================================ */

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
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [darkMode]);

  useEffect(() => {
    if (bgEffect !== "weather") return;
    fetchWeather().then(setWeatherCondition);
    const id = setInterval(() => fetchWeather().then(setWeatherCondition), 1800000);
    return () => clearInterval(id);
  }, [bgEffect, setWeatherCondition]);

  const weatherConfig = useThemeStore((s) => s.weatherConfig);

  const effect = bgEffect === "weather" ? `weather-${weatherCondition}` : bgEffect;
  if (bgEffect === "none") return null;

  const isWeather = effect.startsWith("weather-");
  const weatherType = effect.replace("weather-", "");
  const showClouds = weatherType === "cloudy" || weatherType === "rain" || weatherType === "storm" || weatherType === "hail";

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden="true">
      {!isWeather && <CSSBg type={effect} hue={hue} isDark={isDark} />}
      {isWeather && <WeatherCanvas type={weatherType} isDark={isDark} />}
      {isWeather && showClouds && (
        <CloudOverlay density={weatherConfig.cloudCover} />
      )}
      {isWeather && weatherType === "fog" && <FogOverlay density={0.5} />}
    </div>
  );
}

export default memo(DynamicBackground);

/* ================================================================
   Sky gradient look-up tables
   ================================================================ */

const SKY_LIGHT: Record<string, [number, string][]> = {
  sunny: [[0,"#38bdf8"],[0.3,"#7dd3fc"],[0.6,"#bae6fd"],[0.85,"#fef9c3"],[1,"#fefce8"]],
  cloudy: [[0,"#60a5fa"],[0.25,"#93c5fd"],[0.5,"#bfdbfe"],[0.75,"#e0f2fe"],[1,"#f0f9ff"]],
  rain: [[0,"#475569"],[0.3,"#64748b"],[0.6,"#94a3b8"],[1,"#cbd5e1"]],
  storm: [[0,"#334155"],[0.3,"#475569"],[0.7,"#64748b"],[1,"#94a3b8"]],
  snow: [[0,"#cbd5e1"],[0.4,"#e2e8f0"],[0.7,"#f1f5f9"],[1,"#f8fafc"]],
  fog: [[0,"#94a3b8"],[0.3,"#b0bec5"],[0.6,"#cbd5e1"],[1,"#e2e8f0"]],
  hail: [[0,"#475569"],[0.3,"#64748b"],[0.7,"#94a3b8"],[1,"#cbd5e1"]],
  sandstorm: [[0,"#b8860b"],[0.3,"#c4a35a"],[0.6,"#d4b896"],[1,"#e8d5b5"]],
};

const SKY_DARK: Record<string, [number, string][]> = {
  sunny: [[0,"#0c1222"],[0.6,"#1a2744"],[1,"#1e293b"]],
  cloudy: [[0,"#1e293b"],[0.5,"#334155"],[1,"#1e293b"]],
  rain: [[0,"#0f172a"],[0.5,"#1e293b"],[1,"#0f172a"]],
  storm: [[0,"#020617"],[0.5,"#0f172a"],[1,"#020617"]],
  snow: [[0,"#1e293b"],[0.5,"#334155"],[1,"#1e293b"]],
  fog: [[0,"#1e293b"],[0.4,"#334155"],[1,"#1e293b"]],
  hail: [[0,"#0f172a"],[0.5,"#1e293b"],[1,"#0f172a"]],
  sandstorm: [[0,"#3d2e0f"],[0.5,"#4d3a18"],[1,"#3d2e0f"]],
};

/* ================================================================
   Canvas Weather — adapted from web-weather
   SoA Float32Array, trapezoid rain, splash particles,
   screen blend for sun, offscreen texture for fog, lens flares
   ================================================================ */

function WeatherCanvas({ type, isDark }: { type: string; isDark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const configRef = useRef(useThemeStore.getState().weatherConfig);

  useEffect(() => {
    return useThemeStore.subscribe((s) => { configRef.current = s.weatherConfig; });
  }, []);
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener("resize", resize);

    // ── Rain SoA ──────────────────────────────────────────
    const MAX_RAIN = 500;
    const rainX = new Float32Array(MAX_RAIN);
    const rainY = new Float32Array(MAX_RAIN);
    const rainSpd = new Float32Array(MAX_RAIN);
    const rainLen = new Float32Array(MAX_RAIN);
    const rainOp = new Float32Array(MAX_RAIN);
    let rainCount = 0;

    function initRain(i: number) {
      rainX[i] = Math.random() * W;
      rainY[i] = Math.random() * -H;
      rainSpd[i] = 15 + Math.random() * 15;
      rainLen[i] = 20 + Math.random() * 20;
      rainOp[i] = 0.1 + Math.random() * 0.4;
    }

    // Opacity bin indices for batch drawing (3 bins)
    const BIN_COUNT = 3;
    const binThresholds: [number, number][] = [[0, 0.2], [0.2, 0.35], [0.35, 0.6]];
    const binFillStyles = binThresholds.map(([lo, hi]) =>
      `rgba(180,200,235,${((lo + hi) / 2).toFixed(2)})`
    );
    const binIndices: Int16Array[] = Array.from({ length: BIN_COUNT }, () => new Int16Array(MAX_RAIN));
    const binSizes = new Int32Array(BIN_COUNT);

    function rebuildBins() {
      for (let b = 0; b < BIN_COUNT; b++) binSizes[b] = 0;
      for (let i = 0; i < rainCount; i++) {
        const o = rainOp[i];
        let assigned = false;
        for (let b = 0; b < BIN_COUNT; b++) {
          if (o >= binThresholds[b][0] && o < binThresholds[b][1]) {
            binIndices[b][binSizes[b]++] = i;
            assigned = true;
            break;
          }
        }
        if (!assigned) binIndices[BIN_COUNT - 1][binSizes[BIN_COUNT - 1]++] = i;
      }
    }

    // ── Splash pool (swap-and-pop, max 256) ───────────────
    const MAX_SPLASH = 256;
    const splX = new Float32Array(MAX_SPLASH);
    const splY = new Float32Array(MAX_SPLASH);
    const splVx = new Float32Array(MAX_SPLASH);
    const splVy = new Float32Array(MAX_SPLASH);
    const splLife = new Float32Array(MAX_SPLASH);
    let splCount = 0;

    function spawnSplash(x: number, y: number) {
      if (splCount >= MAX_SPLASH) return;
      const i = splCount++;
      splX[i] = x;
      splY[i] = y;
      splVx[i] = (Math.random() - 0.5) * 4;
      splVy[i] = -(Math.random() * 3 + 2);
      splLife[i] = 1;
    }

    // ── Snow SoA ──────────────────────────────────────────
    const MAX_SNOW = 250;
    const snowX = new Float32Array(MAX_SNOW);
    const snowY = new Float32Array(MAX_SNOW);
    const snowR = new Float32Array(MAX_SNOW);
    const snowSpd = new Float32Array(MAX_SNOW);
    const snowAng = new Float32Array(MAX_SNOW);
    const snowOp = new Float32Array(MAX_SNOW);
    let snowCount = 0;

    function initSnow(i: number) {
      snowX[i] = Math.random() * W;
      snowY[i] = Math.random() * -H;
      snowR[i] = 1 + Math.random() * 3;
      snowSpd[i] = 0.5 + Math.random() * 1.5;
      snowAng[i] = Math.random() * Math.PI * 2;
      snowOp[i] = 0.3 + Math.random() * 0.5;
    }

    // ── Snow pile (semi-circles at ground, slowly melt) ───
    const MAX_PILE = 500;
    const pileX = new Float32Array(MAX_PILE);
    const pileY = new Float32Array(MAX_PILE);
    const pileSize = new Float32Array(MAX_PILE);
    const pileLife = new Float32Array(MAX_PILE);
    let pileCount = 0;

    function addPile(x: number) {
      if (pileCount >= MAX_PILE) {
        let minL = 2, minIdx = 0;
        for (let j = 0; j < pileCount; j++) {
          if (pileLife[j] < minL) { minL = pileLife[j]; minIdx = j; }
        }
        pileX[minIdx] = x;
        pileY[minIdx] = H - 2;
        pileSize[minIdx] = 3 + Math.random() * 4;
        pileLife[minIdx] = 1;
        return;
      }
      const i = pileCount++;
      pileX[i] = x;
      pileY[i] = H - 2;
      pileSize[i] = 3 + Math.random() * 4;
      pileLife[i] = 1;
    }

    // ── Fog offscreen texture (128×128) ───────────────────
    const FOG_TEX_SIZE = 128;
    const fogTex = document.createElement("canvas");
    fogTex.width = FOG_TEX_SIZE;
    fogTex.height = FOG_TEX_SIZE;
    const ftx = fogTex.getContext("2d")!;
    const fogCenter = FOG_TEX_SIZE / 2;
    const fg = ftx.createRadialGradient(fogCenter, fogCenter, 0, fogCenter, fogCenter, fogCenter);
    fg.addColorStop(0, "rgba(225,235,240,1)");
    fg.addColorStop(0.4, "rgba(215,225,235,0.8)");
    fg.addColorStop(0.7, "rgba(205,220,235,0.3)");
    fg.addColorStop(1, "rgba(205,220,235,0)");
    ftx.fillStyle = fg;
    ftx.fillRect(0, 0, FOG_TEX_SIZE, FOG_TEX_SIZE);

    const MAX_FOG = 15;
    const fogPuffs: { x: number; y: number; r: number; spd: number; op: number; osc: number }[] = [];
    for (let i = 0; i < MAX_FOG; i++) {
      const minDim = Math.min(W, H);
      fogPuffs.push({
        x: Math.random() * (W + 400) - 200,
        y: Math.random() * (H + 200) - 100,
        r: Math.min(minDim * (0.2 + Math.random() * 0.5), 400),
        spd: (0.15 + Math.random() * 0.4) * (Math.random() > 0.5 ? 1 : -1),
        op: 0.06 + Math.random() * 0.12,
        osc: Math.random() * Math.PI * 2,
      });
    }

    // ── Lightning state ───────────────────────────────────
    let lightningLife = 0;
    let lightningSegments: { x: number; y: number }[][] = [];
    let flashAlpha = 0;
    let strikesCount = 0;
    let lightningCountdown = getNextLightningDelay();

    function getNextLightningDelay(): number {
      const extraFrames = Math.min(strikesCount * 60, 600);
      return 180 + extraFrames + Math.random() * 240;
    }

    function createLightning() {
      lightningLife = 15 + Math.random() * 10;
      lightningSegments = [];
      const createBolt = (sx: number, sy: number, maxY: number, spread: number, depth: number) => {
        let cx = sx, cy = sy;
        const path = [{ x: cx, y: cy }];
        let branches = 0;
        while (cy < maxY) {
          cy += 20 + Math.random() * 40;
          cx += (Math.random() - 0.5) * spread;
          path.push({ x: cx, y: cy });
          if (depth === 0 && Math.random() < 0.12 && maxY - cy > 150 && branches < 3) {
            createBolt(cx, cy, cy + 100 + Math.random() * 250, spread * 0.6, 1);
            branches++;
          }
        }
        lightningSegments.push(path);
      };
      createBolt(Math.random() * W, 0, H, 100, 0);
      flashAlpha = 0.6 + Math.random() * 0.4;
      strikesCount++;
      lightningCountdown = getNextLightningDelay();
    }

    // ── Lens flare config ─────────────────────────────────
    const lensFlares = [
      { distRatio: -0.2, size: 60, opacity: 0.06, color: "255,255,255" },
      { distRatio: 0.4, size: 30, opacity: 0.035, color: "200,240,255" },
      { distRatio: 1.0, size: 80, opacity: 0.08, color: "255,245,220" },
      { distRatio: 1.5, size: 50, opacity: 0.08, color: "255,250,230" },
      { distRatio: 2.0, size: 100, opacity: 0.1, color: "255,240,200" },
    ];

    // ── Init particles ────────────────────────────────────
    if (type === "rain") {
      for (let i = 0; i < 300; i++) initRain(i);
      rainCount = 300;
      rebuildBins();
    } else if (type === "storm") {
      for (let i = 0; i < 500; i++) initRain(i);
      rainCount = 500;
      rebuildBins();
    } else if (type === "snow") {
      for (let i = 0; i < 200; i++) initSnow(i);
      snowCount = 200;
    } else if (type === "hail") {
      for (let i = 0; i < 80; i++) initRain(i);
      rainCount = 80;
      rebuildBins();
    }

    let frameCount = 0;

    // ── Sky gradient ──────────────────────────────────────
    function drawSky(c: CanvasRenderingContext2D, w: number, h: number, t: string, dk: boolean) {
      const g = c.createLinearGradient(0, 0, 0, h);
      const stops = dk ? SKY_DARK[t] || SKY_DARK.sunny : SKY_LIGHT[t] || SKY_LIGHT.sunny;
      for (const [pos, col] of stops) g.addColorStop(pos, col);
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }

    // ── Sun (screen blend + lens flares + ground glow) ────
    function drawSun(c: CanvasRenderingContext2D, w: number, h: number, dk: boolean, t: number) {
      const sunX = w * 0.5, sunY = h * 0.1;
      const pulse = 1 + Math.sin(t * 0.02) * 0.04;
      const baseR = Math.max(w, h) * 0.7;

      c.save();
      c.globalCompositeOperation = "screen";

      const glow = c.createRadialGradient(sunX, sunY, 0, sunX, sunY, baseR * pulse);
      if (dk) {
        glow.addColorStop(0, "rgba(251,191,36,0.35)");
        glow.addColorStop(0.1, "rgba(251,191,36,0.12)");
        glow.addColorStop(0.5, "rgba(251,191,36,0.03)");
        glow.addColorStop(1, "rgba(255,255,255,0)");
      } else {
        glow.addColorStop(0, "rgba(255,255,255,0.5)");
        glow.addColorStop(0.1, "rgba(255,255,255,0.15)");
        glow.addColorStop(0.5, "rgba(255,255,255,0.04)");
        glow.addColorStop(1, "rgba(255,255,255,0)");
      }
      c.fillStyle = glow;
      c.fillRect(0, 0, w, h);

      const centerX = w / 2, centerY = h / 2;
      for (const flare of lensFlares) {
        const fx = centerX + (centerX - sunX) * flare.distRatio;
        const fy = centerY + (centerY - sunY) * flare.distRatio;
        c.fillStyle = `rgba(${flare.color},${flare.opacity})`;
        c.beginPath();
        c.arc(fx, fy, flare.size, 0, Math.PI * 2);
        c.fill();
      }

      // Bottom ground glow — elliptical
      c.save();
      const glowX = Math.max(0, Math.min(1, sunX / w)) * w;
      const glowY = h - 30;
      const glowRadius = Math.max(60, w * 0.15);
      c.translate(glowX, glowY);
      c.scale(2.5, 0.3);
      const groundGlow = c.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
      groundGlow.addColorStop(0, dk ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.35)");
      groundGlow.addColorStop(0.35, dk ? "rgba(251,191,36,0.06)" : "rgba(255,250,230,0.12)");
      groundGlow.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = groundGlow;
      c.beginPath();
      c.arc(0, 0, glowRadius, 0, Math.PI * 2);
      c.fill();
      c.restore();

      c.globalCompositeOperation = "source-over";
      c.restore();
    }

    // ── Rain + splash (bin-grouped drawing) ───────────────
    function updateAndDrawRain(c: CanvasRenderingContext2D, w: number, h: number, baseWind: number) {
      const cfg = configRef.current;
      const speedMult = cfg.speed;
      const wind = baseWind + cfg.wind;
      const groundY = h - 4;
      for (let i = 0; i < rainCount; i++) {
        rainY[i] += rainSpd[i] * speedMult;
        rainX[i] += wind;
        if (rainY[i] > groundY) {
          if (splCount < MAX_SPLASH - 4) {
            spawnSplash(rainX[i], groundY);
            spawnSplash(rainX[i], groundY);
          }
          rainY[i] = -(rainLen[i] + Math.random() * 100);
          rainX[i] = Math.random() * w;
        }
        if (rainX[i] > w + 50) rainX[i] = -50;
        if (rainX[i] < -50) rainX[i] = w + 50;
      }

      const windOff = wind * 2;

      for (let b = 0; b < BIN_COUNT; b++) {
        const size = binSizes[b];
        if (size === 0) continue;
        c.fillStyle = binFillStyles[b];
        c.beginPath();
        const idx = binIndices[b];
        for (let j = 0; j < size; j++) {
          const i = idx[j];
          if (i >= rainCount) continue;
          const tx = rainX[i], ty = rainY[i];
          const bx = tx + windOff, by = ty + rainLen[i];
          c.moveTo(tx - 0.3, ty);
          c.lineTo(tx + 0.3, ty);
          c.lineTo(bx + 1.2, by);
          c.lineTo(bx - 1.2, by);
        }
        c.fill();
      }

      // Splash update (swap-and-pop)
      let si = 0;
      while (si < splCount) {
        splVy[si] += 0.2;
        splX[si] += splVx[si];
        splY[si] += splVy[si];
        splLife[si] -= 0.05;
        if (splLife[si] <= 0) {
          const last = splCount - 1;
          if (si < last) {
            splX[si] = splX[last]; splY[si] = splY[last];
            splVx[si] = splVx[last]; splVy[si] = splVy[last];
            splLife[si] = splLife[last];
          }
          splCount--;
        } else { si++; }
      }

      if (splCount > 0) {
        c.fillStyle = "rgba(200,220,255,0.5)";
        c.beginPath();
        for (let i = 0; i < splCount; i++) {
          c.rect(splX[i] - 1, splY[i] - 1, 2, 2);
        }
        c.fill();
      }
    }

    // ── Lightning (glow=8, core=2.5, 20% flicker) ────────
    function drawLightning(c: CanvasRenderingContext2D) {
      if (lightningLife <= 0) return;
      if (Math.random() > 0.8) return;
      const alpha = lightningLife < 10 ? lightningLife / 10 : 1;

      c.strokeStyle = `rgba(180,210,255,${alpha * 0.3})`;
      c.lineWidth = 8;
      for (const seg of lightningSegments) {
        c.beginPath();
        for (let j = 0; j < seg.length; j++) {
          j === 0 ? c.moveTo(seg[j].x, seg[j].y) : c.lineTo(seg[j].x, seg[j].y);
        }
        c.stroke();
      }

      c.strokeStyle = `rgba(230,245,255,${alpha})`;
      c.lineWidth = 2.5;
      for (const seg of lightningSegments) {
        c.beginPath();
        for (let j = 0; j < seg.length; j++) {
          j === 0 ? c.moveTo(seg[j].x, seg[j].y) : c.lineTo(seg[j].x, seg[j].y);
        }
        c.stroke();
      }
    }

    // ── Snow + pile ───────────────────────────────────────
    function updateAndDrawSnow(c: CanvasRenderingContext2D, w: number, h: number, t: number) {
      const cfg = configRef.current;
      const speedMult = cfg.speed;
      const windOff = cfg.wind * 0.3;
      const groundY = h - 4;
      for (let i = 0; i < snowCount; i++) {
        snowY[i] += snowSpd[i] * speedMult;
        snowX[i] += Math.sin(snowAng[i]) * 0.5 + windOff;
        snowAng[i] += 0.02;
        if (snowY[i] > groundY) {
          addPile(snowX[i]);
          snowY[i] = -(snowR[i] + Math.random() * 30);
          snowX[i] = Math.random() * w;
        }
      }

      for (let i = 0; i < snowCount; i++) {
        c.beginPath();
        c.fillStyle = `rgba(255,255,255,${snowOp[i]})`;
        c.arc(snowX[i], snowY[i], snowR[i], 0, Math.PI * 2);
        c.fill();
      }

      if (pileCount > 0) {
        let pi = 0;
        while (pi < pileCount) {
          pileLife[pi] -= 0.0005;
          if (pileLife[pi] <= 0) {
            const last = pileCount - 1;
            if (pi < last) {
              pileX[pi] = pileX[last]; pileY[pi] = pileY[last];
              pileSize[pi] = pileSize[last]; pileLife[pi] = pileLife[last];
            }
            pileCount--;
          } else { pi++; }
        }

        c.fillStyle = "rgba(255,255,255,0.9)";
        c.beginPath();
        for (let i = 0; i < pileCount; i++) {
          const r = pileSize[i] * pileLife[i];
          c.moveTo(pileX[i] + r, pileY[i]);
          c.arc(pileX[i], pileY[i], r, Math.PI, 0);
        }
        c.fill();
      }
    }

    // ── Fog (canvas: base tint + puffs) ───────────────────
    function updateAndDrawFog(c: CanvasRenderingContext2D, w: number, h: number, dk: boolean, t: number) {
      const density = 0.5;

      c.globalAlpha = density * 0.5;
      c.fillStyle = "rgb(180,195,210)";
      c.fillRect(0, 0, w, h);
      c.globalAlpha = 1;

      for (const f of fogPuffs) {
        f.x += f.spd;
        f.y += Math.sin(t * 0.008 + f.osc) * 0.15;
        if (f.x > w + f.r + 100) { f.x = -(f.r + 100); f.y = Math.random() * h; }
        if (f.x < -(f.r + 100)) { f.x = w + f.r + 100; f.y = Math.random() * h; }
      }

      for (const f of fogPuffs) {
        if (f.x + f.r < 0 || f.x - f.r > w || f.y + f.r < 0 || f.y - f.r > h) continue;
        c.globalAlpha = f.op * (dk ? 1.2 : 1.5);
        c.drawImage(fogTex, f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
      }
      c.globalAlpha = 1;
    }

    // ── Main loop ─────────────────────────────────────────
    function loop() {
      const dark = isDarkRef.current;
      frameCount++;
      ctx.clearRect(0, 0, W, H);

      drawSky(ctx, W, H, type, dark);

      if (type === "sunny") {
        drawSun(ctx, W, H, dark, frameCount);
      } else if (type === "cloudy") {
        // Clouds handled by CSS CloudOverlay — no canvas particles needed
      } else if (type === "rain") {
        updateAndDrawRain(ctx, W, H, 0);
      } else if (type === "storm") {
        // Lightning with increasing delay between strikes
        if (lightningLife <= 0) {
          lightningCountdown--;
          if (lightningCountdown <= 0) {
            createLightning();
          }
        } else {
          drawLightning(ctx);
          lightningLife--;
        }
        // Thunder flash — decays at 0.05/frame
        if (flashAlpha > 0) {
          ctx.fillStyle = `rgba(255,255,255,${flashAlpha * (dark ? 0.25 : 0.4)})`;
          ctx.fillRect(0, 0, W, H);
          flashAlpha -= 0.05;
        }
        updateAndDrawRain(ctx, W, H, 4);
      } else if (type === "snow") {
        updateAndDrawSnow(ctx, W, H, frameCount);
      } else if (type === "hail") {
        // Light rain background
        updateAndDrawRain(ctx, W, H, 1);
        // Hailstones — larger white circles falling fast
        drawHail(ctx, W, H, dark, frameCount);
      } else if (type === "sandstorm") {
        drawSandstorm(ctx, W, H, dark, frameCount);
      } else if (type === "fog") {
        updateAndDrawFog(ctx, W, H, dark, frameCount);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    // ── Hail ───────────────────────────────────────────────
    const MAX_HAIL_P = 60;
    const hailX = new Float32Array(MAX_HAIL_P);
    const hailY = new Float32Array(MAX_HAIL_P);
    const hailSpd = new Float32Array(MAX_HAIL_P);
    const hailSz = new Float32Array(MAX_HAIL_P);
    const hailRot = new Float32Array(MAX_HAIL_P);
    let hailCount = 0;
    if (type === "hail") {
      for (let i = 0; i < MAX_HAIL_P; i++) {
        hailX[i] = Math.random() * W;
        hailY[i] = Math.random() * -H;
        hailSpd[i] = 14 + Math.random() * 6;
        hailSz[i] = 4 + Math.random() * 5;
        hailRot[i] = Math.random() * Math.PI * 2;
      }
      hailCount = MAX_HAIL_P;
    }

    function drawHail(c: CanvasRenderingContext2D, w: number, h: number, dk: boolean, _t: number) {
      for (let i = 0; i < hailCount; i++) {
        hailY[i] += hailSpd[i];
        hailX[i] += 0.5;
        hailRot[i] += 0.05;
        if (hailY[i] > h) {
          hailY[i] = -(hailSz[i] + Math.random() * 50);
          hailX[i] = Math.random() * w;
          hailSpd[i] = 14 + Math.random() * 6;
        }
      }
      for (let i = 0; i < hailCount; i++) {
        c.save();
        c.translate(hailX[i], hailY[i]);
        c.rotate(hailRot[i]);
        const sz = hailSz[i];
        const grad = c.createRadialGradient(-sz * 0.2, -sz * 0.2, sz * 0.1, 0, 0, sz);
        grad.addColorStop(0, dk ? "rgba(220,235,255,0.8)" : "rgba(240,248,255,0.85)");
        grad.addColorStop(0.5, dk ? "rgba(180,210,240,0.6)" : "rgba(200,220,245,0.65)");
        grad.addColorStop(1, dk ? "rgba(140,180,220,0.3)" : "rgba(160,190,220,0.35)");
        c.fillStyle = grad;
        c.beginPath();
        const sides = 6;
        for (let v = 0; v < sides; v++) {
          const angle = (v / sides) * Math.PI * 2;
          const r = sz * (0.7 + ((v * 37) % 10) * 0.03);
          const px = Math.cos(angle) * r, py = Math.sin(angle) * r;
          v === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
        }
        c.closePath();
        c.fill();
        c.restore();
      }
    }

    // ── Sandstorm ─────────────────────────────────────────
    const MAX_SAND_P = 300;
    const sandX = new Float32Array(MAX_SAND_P);
    const sandY = new Float32Array(MAX_SAND_P);
    const sandSpd = new Float32Array(MAX_SAND_P);
    const sandSz = new Float32Array(MAX_SAND_P);
    const sandOp = new Float32Array(MAX_SAND_P);
    let sandCount = 0;
    if (type === "sandstorm") {
      for (let i = 0; i < MAX_SAND_P; i++) {
        sandX[i] = Math.random() * W;
        sandY[i] = Math.random() * H;
        sandSpd[i] = 2 + Math.random() * 5;
        sandSz[i] = 1 + Math.random() * 2.5;
        sandOp[i] = 0.15 + Math.random() * 0.4;
      }
      sandCount = MAX_SAND_P;
    }

    function drawSandstorm(c: CanvasRenderingContext2D, w: number, h: number, dk: boolean, t: number) {
      // Sand tint overlay
      c.fillStyle = dk ? "rgba(100,75,30,0.2)" : "rgba(180,140,70,0.18)";
      c.fillRect(0, 0, w, h);

      // Update and draw sand particles blowing horizontally
      for (let i = 0; i < sandCount; i++) {
        sandX[i] += sandSpd[i];
        sandY[i] += Math.sin(t * 0.01 + i) * 0.4;
        if (sandX[i] > w + 10) {
          sandX[i] = -10;
          sandY[i] = Math.random() * h;
        }
      }

      c.fillStyle = dk ? "rgba(180,150,90,0.3)" : "rgba(180,145,80,0.35)";
      c.beginPath();
      for (let i = 0; i < sandCount; i++) {
        c.moveTo(sandX[i] + sandSz[i], sandY[i]);
        c.arc(sandX[i], sandY[i], sandSz[i], 0, Math.PI * 2);
      }
      c.fill();

      // Top and bottom dust bands
      const topGrad = c.createLinearGradient(0, 0, 0, 120);
      topGrad.addColorStop(0, dk ? "rgba(100,75,30,0.35)" : "rgba(140,100,40,0.3)");
      topGrad.addColorStop(1, "transparent");
      c.fillStyle = topGrad;
      c.fillRect(0, 0, w, 120);

      const botGrad = c.createLinearGradient(0, h - 100, 0, h);
      botGrad.addColorStop(0, "transparent");
      botGrad.addColorStop(1, dk ? "rgba(120,85,35,0.4)" : "rgba(150,110,45,0.35)");
      c.fillStyle = botGrad;
      c.fillRect(0, h - 100, w, 100);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [type]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

/* ================================================================
   Cloud Overlay — CSS layers with cloud PNG textures
   Web Animations API for horizontal scrolling
   ================================================================ */

function CloudOverlay({ density }: { density: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animsRef = useRef<Animation[]>([]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    animsRef.current.forEach(a => a.cancel());
    animsRef.current = [];

    const layers = [
      { distance: 1000, duration: 20000 },
      { distance: 1000, duration: 15000 },
      { distance: 1579, duration: 17000 },
    ];

    const children = el.children;
    for (let i = 0; i < children.length && i < layers.length; i++) {
      const child = children[i] as HTMLElement;
      const { distance, duration } = layers[i];
      const anim = child.animate(
        [{ backgroundPosition: "0 0" }, { backgroundPosition: `-${distance}px 0` }],
        { duration, iterations: Infinity, easing: "linear" },
      );
      animsRef.current.push(anim);
    }
    return () => { animsRef.current.forEach(a => a.cancel()); };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ contain: "layout style paint", isolation: "isolate" }}
      aria-hidden="true"
    >
      <div className="absolute inset-0" style={{
        backgroundImage: "url(/images/clouds_2.png)",
        backgroundRepeat: "repeat-x",
        backgroundSize: "auto 100%",
        opacity: 0.04 + density * 0.18,
        transform: "translate3d(0,0,0)",
        willChange: "background-position",
      }} />
      <div className="absolute inset-0" style={{
        backgroundImage: "url(/images/clouds_1.png)",
        backgroundRepeat: "repeat-x",
        backgroundSize: "auto 100%",
        opacity: 0.05 + density * 0.2,
        transform: "translate3d(0,0,0)",
        willChange: "background-position",
      }} />
      <div className="absolute inset-0" style={{
        backgroundImage: "url(/images/clouds_3.png)",
        backgroundRepeat: "repeat-x",
        backgroundSize: "auto 100%",
        opacity: 0.04 + density * 0.15,
        transform: "translate3d(0,0,0)",
        willChange: "background-position",
      }} />
    </div>
  );
}

/* ================================================================
   Fog Overlay — CSS layers with smoke textures + gradient tint
   Keyframes inlined via <style> tag
   ================================================================ */

const FOG_KEYFRAMES_CSS = `
@keyframes yantu-fog-drift {
  0%   { transform: translate3d(0,0,0); }
  25%  { transform: translate3d(100px,0,0) rotate(0.01deg); }
  50%  { transform: translate3d(75px,-25px,0) rotate(0.01deg); }
  75%  { transform: translate3d(45px,30px,0) rotate(0.01deg); }
  100% { transform: translate3d(25px,-15px,0) rotate(0.01deg); }
}
@keyframes yantu-fog-drift-slow {
  0%   { transform: translate3d(0,0,0) rotate(0.01deg); }
  25%  { transform: translate3d(-80px,10px,0) rotate(0.01deg); }
  50%  { transform: translate3d(-40px,-20px,0) rotate(0.01deg); }
  75%  { transform: translate3d(-20px,25px,0) rotate(0.01deg); }
  100% { transform: translate3d(-10px,-10px,0) rotate(0.01deg); }
}`;

function FogOverlay({ density }: { density: number }) {
  const overscan = "140px";
  const layerInset = `-${overscan}`;

  return (
    <>
      <style>{FOG_KEYFRAMES_CSS}</style>
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
        style={{ contain: "layout style paint" }}
      >
        {/* fog-tint: radial-gradient white/gray wash */}
        <div
          className="absolute inset-0"
        style={{
            background: "radial-gradient(ellipse 120% 80% at 50% 60%, rgba(220,225,230,0.95) 0%, rgba(200,208,216,0.7) 50%, rgba(180,190,200,0.5) 100%)",
            opacity: 0.55 + density * 0.4,
            transform: "translate3d(0,0,0)",
            contain: "paint",
          }}
        />
        {/* fog-depth: bottom-heavy ground fog */}
      <div
        className="absolute inset-0"
        style={{
            background: "linear-gradient(to top, rgba(230,235,240,0.9) 0%, rgba(225,230,235,0.5) 30%, rgba(215,222,228,0.2) 60%, transparent 85%)",
            opacity: 0.3 + density * 0.5,
            transform: "translate3d(0,0,0)",
            contain: "paint",
          }}
        />
        {/* fog-base: smoke_1.jpg texture, very subtle */}
      <div
        className="absolute"
        style={{
            inset: layerInset,
            backgroundImage: "url(/images/smoke_1.jpg)",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            opacity: 0.06 + density * 0.1,
            transform: "translate3d(0,0,0)",
            willChange: "transform",
            contain: "paint",
          }}
        />
        {/* fog-smoke: smoke_2.png texture, animated */}
      <div
        className="absolute"
        style={{
            inset: layerInset,
            backgroundImage: "url(/images/smoke_2.png)",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            opacity: 0.04 + density * 0.08,
            animation: "yantu-fog-drift 60s infinite alternate",
            transform: "translate3d(0,0,0)",
            willChange: "transform",
            contain: "paint",
          }}
        />
        {/* fog-smoke slow variant */}
        <div
          className="absolute"
        style={{
            inset: layerInset,
            backgroundImage: "url(/images/smoke_2.png)",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            opacity: 0.03 + density * 0.07,
            animation: "yantu-fog-drift-slow 90s infinite alternate",
            transform: "translate3d(0,0,0) rotate(0.01deg)",
            willChange: "transform",
            contain: "paint",
        }}
      />
    </div>
    </>
  );
}

/* ================================================================
   CSS backgrounds (non-weather) — kept exactly as-is
   ================================================================ */

function CSSBg({ type, hue, isDark }: { type: string; hue: number; isDark: boolean }) {
  const A = "absolute inset-0";
  const G = "absolute inset-0 will-change-transform";

  if (type === "gradient") {
  return (
      <div className={A} style={{
        background: isDark
          ? `linear-gradient(-45deg, hsl(${hue},30%,8%), hsl(${hue+40},25%,12%), hsl(${hue+80},20%,10%), hsl(${hue+120},25%,8%))`
          : `linear-gradient(-45deg, hsl(${hue},60%,90%), hsl(${hue+40},55%,88%), hsl(${hue+80},50%,92%), hsl(${hue+120},55%,86%))`,
        backgroundSize: "400% 400%",
        animation: "bg-gradient-shift 15s ease infinite",
      }} />
    );
  }

  if (type === "aurora") {
    const colors = [
      { color: `hsl(${hue},70%,50%)`, dur: 19, kf: "bg-aurora-1" },
      { color: `hsl(${hue+60},65%,45%)`, dur: 25, kf: "bg-aurora-2" },
      { color: `hsl(${hue+120},60%,55%)`, dur: 15, kf: "bg-aurora-3" },
    ];
  return (
      <div className={A} style={{
        background: isDark ? `hsl(${hue},20%,5%)` : `hsl(${hue},25%,90%)`,
        filter: "hue-rotate(0deg)",
        animation: "bg-hue-rotate 20s linear infinite",
      }}>
        {colors.map((c, i) => (
          <div key={i} className="absolute will-change-transform" style={{
            width: 1, height: 1, borderRadius: "50%",
            boxShadow: `0 0 ${isDark ? 40 : 30}vmax ${isDark ? 40 : 30}vmax ${c.color}`,
            opacity: isDark ? 0.5 : 0.3,
            animation: `${c.kf} ${c.dur}s linear infinite`,
          }} />
        ))}
    </div>
  );
  }

  if (type === "wave") {
    const f = (l: number, a: number) => isDark ? `hsla(${hue+l},40%,25%,${a})` : `hsla(${hue+l},55%,68%,${a})`;
    const layers = [
      { path: "M0,64 C288,128 576,0 720,64 C864,128 1152,0 1440,64 C1728,128 2016,0 2160,64 L2160,320 L0,320 Z", fill: f(0, 0.5), h: "45%", dur: 8, delay: 0 },
      { path: "M0,96 C240,32 480,160 720,96 C960,32 1200,160 1440,96 C1680,32 1920,160 2160,96 L2160,320 L0,320 Z", fill: f(15, 0.4), h: "40%", dur: 11, delay: -4 },
      { path: "M0,80 C360,140 540,20 720,80 C900,140 1080,20 1440,80 C1620,140 1800,20 2160,80 L2160,320 L0,320 Z", fill: f(30, 0.6), h: "35%", dur: 14, delay: -7 },
    ];
  return (
      <div className={A} style={{
        background: isDark
          ? `linear-gradient(180deg, hsl(${hue},20%,8%) 0%, hsl(${hue+5},25%,12%) 100%)`
          : `linear-gradient(180deg, hsl(${hue},50%,88%) 0%, hsl(${hue+5},55%,82%) 100%)`,
        overflow: "hidden",
      }}>
        {layers.map((l, i) => (
          <svg key={i} viewBox="0 0 2160 320" preserveAspectRatio="none" style={{
            position: "absolute", bottom: 0, left: "-33.33%", width: "166.67%", height: l.h,
            animation: `bg-wave-slide ${l.dur}s ease-in-out ${l.delay}s infinite`,
          }}>
            <path d={l.path} fill={l.fill} />
          </svg>
        ))}
    </div>
  );
  }

  if (type === "starfield") {
    const starColor = isDark ? `hsla(${hue},30%,85%,0.8)` : `hsla(${hue},40%,40%,0.35)`;
    const bigStarColor = isDark ? `hsla(${hue},40%,90%,1)` : `hsla(${hue},50%,50%,0.5)`;
    const stars = Array.from({ length: 60 }, (_, i) => {
      const x = ((i * 17.3) % 100), y = ((i * 23.7) % 100);
      const sz = i < 8 ? 2 + (i % 3) : 0.8 + (i % 4) * 0.4;
      const c = i < 8 ? bigStarColor : starColor;
      return `radial-gradient(${sz}px ${sz}px at ${x}% ${y}%, ${c} 50%, transparent 100%)`;
    }).join(",");

    return (
      <div className={A} style={{ background: isDark
        ? `linear-gradient(180deg, hsl(${hue},20%,4%) 0%, hsl(${hue+20},15%,8%) 100%)`
        : `linear-gradient(180deg, hsl(${hue},30%,94%) 0%, hsl(${hue},25%,97%) 100%)`
      }}>
        <div className={G} style={{ backgroundImage: stars, animation: "bg-twinkle 3s ease-in-out infinite" }} />
        <div className={G} style={{ backgroundImage: stars, transform: "translate(5%,3%) scale(1.1)", opacity: 0.4, animation: "bg-twinkle 5s ease-in-out -2s infinite" }} />
      </div>
    );
  }

  if (type === "particles") {
    const particles = Array.from({ length: 18 }, (_, i) => ({
      x: 5 + ((i * 13) % 90),
      size: 3 + (i % 5) * 2,
      dur: 15 + (i % 7) * 4,
      delay: (i % 5) * 3,
      alpha: isDark ? 0.15 + (i % 4) * 0.08 : 0.08 + (i % 4) * 0.05,
    }));
  return (
      <div className={A} style={{ background: isDark
        ? `linear-gradient(180deg, hsl(${hue},20%,8%) 0%, hsl(${hue},15%,12%) 100%)`
        : `linear-gradient(180deg, hsl(${hue},40%,93%) 0%, hsl(${hue},35%,96%) 100%)`
      }}>
        {particles.map((p, i) => (
          <div key={i} className="absolute rounded-full will-change-transform" style={{
            left: `${p.x}%`, bottom: "-2%",
            width: p.size, height: p.size,
            background: `hsla(${hue + (i * 20) % 60},50%,${isDark ? 60 : 55}%,${p.alpha})`,
            animation: `bg-float ${p.dur}s linear ${p.delay}s infinite`,
          }} />
        ))}
    </div>
  );
  }

  if (type === "geometric") {
    const lineColor = isDark ? `hsla(${hue},30%,50%,0.15)` : `hsla(${hue},40%,45%,0.1)`;
    const dotColor = isDark ? `hsla(${hue},40%,55%,0.25)` : `hsla(${hue},45%,50%,0.15)`;
    const nodes = Array.from({ length: 12 }, (_, i) => ({
      x: 8 + ((i * 11) % 85), y: 5 + ((i * 17) % 90), r: 2 + (i % 3),
    }));
    const lines: [number, number][] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        if (Math.sqrt(dx * dx + dy * dy) < 35) lines.push([i, j]);
      }
    }
  return (
      <div className={A} style={{ background: isDark
        ? `linear-gradient(135deg, hsl(${hue},15%,8%) 0%, hsl(${hue+20},12%,11%) 100%)`
        : `linear-gradient(135deg, hsl(${hue},35%,94%) 0%, hsl(${hue+20},30%,96%) 100%)`
      }}>
        <svg className="absolute inset-0 w-full h-full will-change-transform" style={{ animation: "bg-geo 60s linear infinite" }}>
          {lines.map(([a, b], i) => (
            <line key={`l${i}`} x1={`${nodes[a].x}%`} y1={`${nodes[a].y}%`} x2={`${nodes[b].x}%`} y2={`${nodes[b].y}%`} stroke={lineColor} strokeWidth="1.5" />
          ))}
          {nodes.map((n, i) => (
            <circle key={`c${i}`} cx={`${n.x}%`} cy={`${n.y}%`} r={n.r} fill={dotColor} />
          ))}
        </svg>
    </div>
  );
  }

  return null;
}
