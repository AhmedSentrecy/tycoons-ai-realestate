"use strict";

// IndexNow: tells Bing (which grounds ChatGPT search and Copilot answers), Yandex,
// Seznam and Naver which URLs changed, so AI answers use current prices.
// Runs daily on Netlify's scheduler (netlify.toml [functions."indexnow-ping"]).
// Only URLs whose sitemap <lastmod> changed in the last 36 hours are sent; a
// local run with ?all=1 submits the whole sitemap.
// The key file lives at https://tycoons-inv.com/<KEY>.txt (public/).

const SITE_URL = "https://tycoons-inv.com";
const KEY = "aed450cd95ed460cea887dfb78d4d1ae";
const WINDOW_MS = 36 * 60 * 60 * 1000;

function sitemapEntries(xml) {
  const entries = [];
  for (const block of String(xml).match(/<url>[\s\S]*?<\/url>/g) || []) {
    const loc = (block.match(/<loc>([^<]+)<\/loc>/) || [])[1];
    const lastmod = (block.match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1];
    if (loc && loc.startsWith(SITE_URL)) entries.push({ loc: loc.replace(/&amp;/g, "&"), lastmod: lastmod ? Date.parse(lastmod) : NaN });
  }
  return entries;
}

exports.handler = async function handler(event) {
  const all = event?.queryStringParameters?.all === "1";
  try {
    const response = await fetch(`${SITE_URL}/sitemap.xml`, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`sitemap ${response.status}`);
    const entries = sitemapEntries(await response.text());
    const now = Date.now();
    const urls = entries
      .filter((entry) => all || (Number.isFinite(entry.lastmod) && now - entry.lastmod <= WINDOW_MS))
      .map((entry) => entry.loc)
      .slice(0, 10000);
    if (!urls.length) return { statusCode: 200, body: JSON.stringify({ submitted: 0 }) };
    const ping = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: "tycoons-inv.com", key: KEY, keyLocation: `${SITE_URL}/${KEY}.txt`, urlList: urls }),
      signal: AbortSignal.timeout(15000),
    });
    console.log("[indexnow]", ping.status, urls.length);
    return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ submitted: urls.length, status: ping.status }) };
  } catch (error) {
    console.error("[indexnow]", error);
    return { statusCode: 502, headers: { "content-type": "application/json" }, body: JSON.stringify({ error: String(error?.message || error) }) };
  }
};

exports.sitemapEntries = sitemapEntries;
