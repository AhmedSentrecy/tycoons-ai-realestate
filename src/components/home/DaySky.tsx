import { useEffect, useRef, useState } from "react";
import { isEnglish } from "@/lib/homeLanguage";

/**
 * Homepage backdrop: one sky behind the whole page that runs from sunrise (top of the page)
 * to night (footer) as the reader scrolls. A city skyline at the bottom lights up after sunset.
 */

// [scroll position, top colour, bottom colour]
const KEYS: [number, string, string][] = [
  [0, "#ffcf9e", "#ffeedd"],
  [0.22, "#8cc6f7", "#e4f2ff"],
  [0.48, "#5aa6e6", "#d3eaff"],
  [0.68, "#ff8a5c", "#7a4a86"],
  [0.82, "#2c2f6c", "#1a2550"],
  [1, "#060f1c", "#0b1b30"],
];

const hex = (value: string) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
const mix = (a: string, b: string, k: number) => {
  const A = hex(a);
  const B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(",")})`;
};

export function scrollProgress() {
  if (typeof window === "undefined") return 0;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

/** The time of day the sky shows at a scroll position (6:00 at the top, about 23:00 at the bottom). */
export function skyTime(progress: number, english: boolean) {
  const hours = 6 + progress * 17;
  const hh = Math.floor(hours);
  const mm = Math.floor((hours - hh) * 4) * 15;
  const h12 = hh > 12 ? hh - 12 : hh;
  if (english) return `${h12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "am" : "pm"}`;
  const part = hh < 11 ? "الصبح" : hh < 15 ? "الضهر" : hh < 18 ? "العصر" : hh < 19 ? "المغرب" : "بالليل";
  return `${h12}:${String(mm).padStart(2, "0")} ${part}`.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

export default function DaySky() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [clock, setClock] = useState(() => skyTime(0, isEnglish()));

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const english = isEnglish();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0;
    let H = 0;
    let city: { x: number; w: number; h: number; wins: [number, number, number][] }[] = [];
    let shown = scrollProgress();
    let frame = 0;
    let lastClock = "";

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      el.width = W * dpr;
      el.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const narrow = W < 720;
      city = [];
      let x = -10;
      // Same skyline on every load: a small seeded generator instead of Math.random.
      let seed = 7;
      const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
      while (x < W + 10) {
        const w = (narrow ? 18 : 26) + rnd() * (narrow ? 30 : 50);
        const h = H * (0.07 + rnd() * 0.15);
        const wins: [number, number, number][] = [];
        for (let y = H - h + 10; y < H - 8; y += 12) for (let wx = x + 6; wx < x + w - 8; wx += 10) wins.push([wx, y, rnd()]);
        city.push({ x, w, h, wins });
        x += w + 2 + rnd() * 6;
      }
    };

    const draw = (t: number) => {
      const target = scrollProgress();
      shown += reduce ? target - shown : (target - shown) * 0.1;
      const sp = shown;
      let i = 0;
      while (i < KEYS.length - 2 && sp > KEYS[i + 1][0]) i++;
      const a = KEYS[i];
      const b = KEYS[i + 1];
      const k = Math.min(1, Math.max(0, (sp - a[0]) / (b[0] - a[0])));
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, mix(a[1], b[1], k));
      g.addColorStop(1, mix(a[2], b[2], k));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      if (sp > 0.7) {
        const alpha = Math.min(1, (sp - 0.7) / 0.2);
        for (let s = 0; s < 90; s++) {
          ctx.fillStyle = `rgba(255,255,255,${alpha * (0.3 + 0.7 * Math.abs(Math.sin(t / 900 + s)))})`;
          ctx.fillRect((s * 137.5) % W, (s * 71.3) % (H * 0.65), 1.6, 1.6);
        }
      }

      // Sun by day, moon at night, along one arc.
      const angle = Math.PI * (1 - sp);
      const cx = W / 2 + Math.cos(angle) * W * 0.42;
      const cy = H * 0.7 - Math.sin(angle) * H * 0.52;
      const night = sp > 0.8;
      const R = night ? 70 : 150;
      const sun = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      sun.addColorStop(0, night ? "rgba(245,245,255,.95)" : "rgba(255,244,210,1)");
      sun.addColorStop(0.22, night ? "rgba(220,225,255,.3)" : "rgba(255,190,90,.55)");
      sun.addColorStop(1, "rgba(255,190,90,0)");
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      const lit = Math.max(0, (sp - 0.58) / 0.35);
      for (const block of city) {
        ctx.fillStyle = sp > 0.72 ? "#071224" : mix("#a9bbd2", "#071224", Math.min(1, sp / 0.72));
        ctx.fillRect(block.x, H - block.h, block.w, block.h);
        for (const [wx, wy, r] of block.wins) {
          if (r < lit * 0.85) {
            ctx.fillStyle = `rgba(240,189,79,${0.6 + 0.4 * Math.sin(t / 800 + r * 40)})`;
            ctx.fillRect(wx, wy, 4, 6);
          }
        }
      }

      const nextClock = skyTime(sp, english);
      if (nextClock !== lastClock) {
        lastClock = nextClock;
        setClock(nextClock);
      }
      frame = requestAnimationFrame(draw);
    };

    size();
    window.addEventListener("resize", size);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", size);
    };
  }, []);

  return (
    <>
      <canvas ref={canvas} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />
      <div
        aria-hidden="true"
        className="fixed end-3 top-[74px] z-40 rounded-full bg-[#060f1c]/55 px-3 py-1.5 text-[11.5px] font-semibold tabular-nums text-white backdrop-blur-md"
      >
        {clock}
      </div>
    </>
  );
}
