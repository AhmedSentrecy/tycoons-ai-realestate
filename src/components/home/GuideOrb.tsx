import { useEffect, useRef } from "react";
import { scrollProgress } from "@/components/home/DaySky";

/** Shared "energy" so typing, the mic and scrolling all make every orb on the page move more. */
export const orbEnergy = { value: 0, listening: false };

// Each mounted orb registers here, so a nudge can restart its drawing after it went to sleep.
const wakers = new Set<() => void>();

export function nudgeOrb(amount = 0.6) {
  orbEnergy.value = Math.min(2, orbEnergy.value + amount);
  wakers.forEach((wake) => wake());
}

/** Call after changing orbEnergy.listening, so sleeping orbs wake up (or settle) right away. */
export function wakeOrbs() {
  wakers.forEach((wake) => wake());
}

// Colours follow the sky: gold in the morning, warm at noon, coral at sunset, silver at night.
function palette(sp: number) {
  if (sp < 0.3) return ["#fff3d1", "#f0bd4f", "#d99a2b"];
  if (sp < 0.62) return ["#fff8e6", "#ffd36b", "#f0a43a"];
  if (sp < 0.8) return ["#ffe0d4", "#ff8a6a", "#ff5a36"];
  return ["#ffffff", "#ffe3a3", "#4f6fd9"];
}

/**
 * A soft, breathing ball of light drawn on a canvas.
 * It is drawn only while it moves (typing, mic, scrolling); once the energy fades it draws one
 * still frame and stops, so an idle page costs the phone nothing.
 */
export default function GuideOrb({ size, className = "" }: { size: number; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.width = size * dpr;
    el.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let frame = 0;
    const start = performance.now();

    const paint = (now: number) => {
      const t = reduce ? 0 : now - start;
      const energy = orbEnergy.value;
      const c = size / 2;
      const R = size * 0.3 * (1 + energy * 0.1);
      const pal = palette(scrollProgress());
      ctx.clearRect(0, 0, size, size);
      const halo = ctx.createRadialGradient(c, c, R * 0.5, c, c, size * 0.5);
      halo.addColorStop(0, `${pal[1]}77`);
      halo.addColorStop(1, `${pal[1]}00`);
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, size, size);
      for (let layer = 0; layer < 3; layer++) {
        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.08) {
          const n =
            Math.sin(a * 3 + t / (700 - layer * 120) + layer) * 0.06 +
            Math.sin(a * 5 - t / 900) * 0.04 * (1 + energy * 2) +
            (orbEnergy.listening ? Math.sin(a * 8 + t / 90) * 0.05 : 0);
          const r = R * (1 - layer * 0.16) * (1 + n);
          const x = c + Math.cos(a) * r;
          const y = c + Math.sin(a) * r;
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const g = ctx.createRadialGradient(c - R * 0.3, c - R * 0.4, 2, c, c, R * 1.1);
        g.addColorStop(0, "#ffffff");
        g.addColorStop(0.35, pal[0]);
        g.addColorStop(0.75, pal[1]);
        g.addColorStop(1, pal[2]);
        ctx.globalAlpha = layer ? 0.55 : 1;
        ctx.fillStyle = g;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      orbEnergy.value *= 0.985;
      paint(now);
      const busy = orbEnergy.listening || orbEnergy.value > 0.03;
      if (!reduce && busy && !document.hidden) frame = requestAnimationFrame(loop);
      else frame = 0;
    };

    const wake = () => {
      if (!frame && !reduce && !document.hidden) frame = requestAnimationFrame(loop);
      else if (reduce) paint(performance.now());
    };
    const onVisible = () => { if (!document.hidden) wake(); };

    wakers.add(wake);
    document.addEventListener("visibilitychange", onVisible);
    paint(performance.now());
    // A short breath when it first appears, then it rests until something nudges it.
    nudgeOrb(0.4);
    return () => {
      cancelAnimationFrame(frame);
      wakers.delete(wake);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [size]);

  return <canvas ref={canvas} aria-hidden="true" style={{ width: size, height: size }} className={className} />;
}
