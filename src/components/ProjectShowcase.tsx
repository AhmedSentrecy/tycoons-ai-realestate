import { useEffect, useMemo, useRef } from "react";
import { showcaseHtml, type ShowcaseUnit } from "../../netlify/functions/_project-showcase.cjs";

declare global {
  interface Window { TycoonsShowcase?: { init: (root: Element) => () => void } }
}

// The project "showcase" block: photo walk-through, the developer's current offer and the
// down-payment calculator. The markup comes from the same builder as the pre-rendered page
// (netlify/functions/_project-showcase.cjs); /showcase.js adds the movement.
export default function ProjectShowcase({ slug, images, units }: { slug: string; images: string[]; units: ShowcaseUnit[] }) {
  const ref = useRef<HTMLDivElement>(null);
  // The parent builds new arrays on every render: rebuild the markup only when their content changes.
  const imagesKey = images.join("|");
  const unitsKey = units.map((unit) => [unit.unit_type, unit.bedrooms_text, unit.area_sqm, unit.starting_price].join("|")).join(";");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => showcaseHtml({ slug, images, units }), [slug, imagesKey, unitsKey]);

  useEffect(() => {
    const host = ref.current;
    const root = host?.querySelector("[data-showcase]");
    if (!html || !root) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    const start = () => { if (!cancelled && window.TycoonsShowcase) stop = window.TycoonsShowcase.init(root); };
    if (window.TycoonsShowcase) {
      start();
    } else {
      let script = document.querySelector<HTMLScriptElement>('script[src="/showcase.js"]');
      if (!script) {
        script = document.createElement("script");
        script.src = "/showcase.js";
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", start, { once: true });
    }
    return () => { cancelled = true; stop?.(); };
  }, [html]);

  if (!html) return null;
  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}
