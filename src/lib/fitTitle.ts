// Keep <title> within what Google shows (about 60 characters) without cutting a word.
// Order: drop the " | Tycoons…" brand suffix, then cut at the last " — " / " | " / ": "
// that still leaves a meaningful title, then at the last space.
// Keep in sync with fitTitle in netlify/functions/_display-text.cjs (tested together).
export function fitTitle(value: string, max = 60): string {
  let title = String(value || "").replace(/\s+/g, " ").trim();
  if (title.length <= max) return title;
  title = title.replace(/\s*\|\s*Tycoons(?: Investments)?\s*$/i, "").trim();
  if (title.length <= max) return title;
  const head = title.slice(0, max + 1);
  const cut = Math.max(head.lastIndexOf(" — "), head.lastIndexOf(" | "), head.lastIndexOf(": "));
  // a separator cut that keeps most of the title reads best; otherwise cut at a word
  if (cut >= Math.round(max * 0.7)) return title.slice(0, cut).trim();
  const space = head.lastIndexOf(" ");
  let short = space >= 25 ? title.slice(0, space) : title.slice(0, max);
  // never leave an unclosed bracket or a dangling separator
  if ((short.match(/\(/g) || []).length > (short.match(/\)/g) || []).length) short = short.slice(0, short.lastIndexOf("("));
  // a half list ("Units, Payment") reads cut off: stop at the last comma near the end
  const comma = Math.max(short.lastIndexOf(", "), short.lastIndexOf("، "), short.lastIndexOf("،"));
  if (comma > 0 && short.length - comma < 20 && comma >= 25) short = short.slice(0, comma);
  return short.replace(/[\s،,:—|(-]+$/, "").trim();
}

// Short price for titles: 50263000 -> "50.3 مليون", 980000 -> "980 ألف".
export function priceShortAr(value: number | string | null | undefined): string {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) return "";
  // two decimals so near-identical units (11.87 vs 11.92 مليون) never share one title
  if (price >= 1_000_000) return `${(Math.round(price / 10_000) / 100).toString()} مليون`;
  return `${Math.round(price / 1000)} ألف`;
}
