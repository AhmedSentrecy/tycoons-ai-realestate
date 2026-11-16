// Property photos are stored full size in Supabase Storage. On the live site Netlify Image
// CDN resizes them at the edge (allow-listed in netlify.toml [images]) and caches the result,
// so a card that is 300px wide no longer downloads a 400 KB photo. Anywhere else (local dev,
// the mobile app) the original URL is used because /.netlify/images does not exist there.
const STORAGE_PREFIX = "https://coqnjymekrkoausiiytm.supabase.co/storage/v1/object/public/";

function onNetlify(): boolean {
  if (typeof window === "undefined") return false;
  return /(^|\.)tycoons-inv\.com$|\.netlify\.app$/.test(window.location.hostname);
}

export function sizedImage(url: string | null | undefined, width: number): string {
  const value = String(url || "");
  if (!value.startsWith(STORAGE_PREFIX) || !onNetlify()) return value;
  return `/.netlify/images?url=${encodeURIComponent(value)}&w=${width}&q=70`;
}

// src + srcSet for an image shown at about `width` CSS pixels (2x for sharp phone screens).
export function sizedImageProps(url: string | null | undefined, width: number): { src: string; srcSet?: string } {
  const src = sizedImage(url, width);
  if (src === String(url || "")) return { src };
  return { src, srcSet: `${src} 1x, ${sizedImage(url, width * 2)} 2x` };
}
