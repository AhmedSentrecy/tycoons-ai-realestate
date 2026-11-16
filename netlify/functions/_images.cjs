"use strict";

// Property photos are stored full size in Supabase Storage. Netlify Image CDN resizes them at
// the edge (allow-listed in netlify.toml [images]) and caches the result, so a 400px card no
// longer downloads a 400 KB photo. Local /images files and other hosts are left untouched.
// og:image and JSON-LD keep the original URL: only <img> tags go through this.
// The browser-side twin of this file is src/lib/images.ts.
const STORAGE_PUBLIC_PREFIX = "https://coqnjymekrkoausiiytm.supabase.co/storage/v1/object/public/";

function sizedImage(url, width) {
  const value = String(url || "");
  if (!value.startsWith(STORAGE_PUBLIC_PREFIX)) return value;
  return `/.netlify/images?url=${encodeURIComponent(value)}&w=${width}&q=70`;
}

function attr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

// src + srcset attributes for an <img> displayed at about `width` CSS pixels.
function imgSrcAttrs(url, width) {
  const src = sizedImage(url, width);
  if (src === String(url || "")) return `src="${attr(src)}"`;
  return `src="${attr(src)}" srcset="${attr(src)} 1x, ${attr(sizedImage(url, width * 2))} 2x"`;
}

// For a large image that fills the screen width on phones (a page's main photo): the browser
// picks the smallest file that fits the screen instead of always taking the full size.
function heroSrcAttrs(url, maxWidth) {
  const src = sizedImage(url, maxWidth);
  if (src === String(url || "")) return `src="${attr(src)}"`;
  const widths = [480, 800, maxWidth].filter((width, index, list) => width <= maxWidth && list.indexOf(width) === index);
  return `src="${attr(src)}" srcset="${widths.map((width) => `${attr(sizedImage(url, width))} ${width}w`).join(", ")}" sizes="(max-width: ${maxWidth}px) 100vw, ${maxWidth}px"`;
}

module.exports = { sizedImage, imgSrcAttrs, heroSrcAttrs };
