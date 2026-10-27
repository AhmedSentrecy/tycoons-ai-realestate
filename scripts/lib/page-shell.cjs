"use strict";
const { escapeHtml } = require("../../netlify/functions/_article-render.cjs");
const { fitTitle } = require("../../netlify/functions/_display-text.cjs");

function removeTag(html, expression) {
  return html.replace(expression, "");
}

function pageShell(shell, { title: rawTitle, description, canonical, image, keywords, schemas, body, robots = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1", alternates = [], lang = "ar" }) {
  // Google shows about 60 characters of a title; fit it without cutting a word.
  const title = fitTitle(rawTitle);
  const language = lang === "en" ? "en" : "ar";
  let html = shell.replace(/<html\b[^>]*>/i, `<html lang="${language}" dir="${language === "en" ? "ltr" : "rtl"}">`);
  const defaultUrl = alternates.find((item) => item.hreflang === "ar-EG")?.href || canonical;
  html = removeTag(html, /<title>[\s\S]*?<\/title>/i);
  html = removeTag(html, /<meta\s+name=["']description["'][\s\S]*?\/?\s*>/i);
  html = removeTag(html, /<meta\s+name=["']robots["'][\s\S]*?\/?\s*>/i);
  html = removeTag(html, /<meta\s+name=["']keywords["'][\s\S]*?\/?\s*>/i);
  html = removeTag(html, /<link\s+rel=["']canonical["'][\s\S]*?\/?\s*>/i);
  html = removeTag(html, /<link\s+rel=["']alternate["'][\s\S]*?\/?\s*>/gi);
  html = removeTag(html, /<meta\s+property=["']og:[^"']+["'][\s\S]*?\/?\s*>/gi);
  html = removeTag(html, /<meta\s+name=["']twitter:card["'][\s\S]*?\/?\s*>/i);
  html = removeTag(html, /<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi);

  const head = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<meta name="robots" content="${escapeHtml(robots)}">`,
    keywords.length ? `<meta name="keywords" content="${escapeHtml(keywords.join(", "))}">` : "",
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    `<link rel="alternate" hreflang="${language === "en" ? "en" : "ar-EG"}" href="${escapeHtml(canonical)}">`,
    ...alternates.filter((item) => item.hreflang !== (language === "en" ? "en" : "ar-EG") && item.hreflang !== "x-default").map(({ hreflang, href }) => `<link rel="alternate" hreflang="${escapeHtml(hreflang)}" href="${escapeHtml(href)}">`),
    `<link rel="alternate" hreflang="x-default" href="${escapeHtml(defaultUrl)}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="Tycoons Investments">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(canonical)}">`,
    image ? `<meta property="og:image" content="${escapeHtml(image)}">` : "",
    `<meta property="og:locale" content="${language === "en" ? "en_US" : "ar_EG"}">`,
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`,
    `<script type="application/ld+json" id="tycoons-page-schema">${JSON.stringify({ "@context": "https://schema.org", "@graph": schemas }).replace(/</g, "\\u003c")}</script>`,
  ].filter(Boolean).join("\n    ");
  html = html.replace("</head>", `    ${head}\n  </head>`);

  const rootStart = html.indexOf('<div id="root">');
  const bodyEnd = html.lastIndexOf("</body>");
  if (rootStart < 0 || bodyEnd < 0) throw new Error("Vite shell is missing the root or body end");
  const rootTail = html.slice(rootStart, bodyEnd);
  // App bundle (module scripts) + the WhatsApp click counter (/wa-track.js) + the sitewide voice button (/voice-cta.js).
  const bodyScripts = rootTail.match(/<script\s+(?:type=["']module["']|src=["']\/(?:wa-track|voice-cta)\.js["'])[\s\S]*?<\/script>/gi) || [];
  html = `${html.slice(0, rootStart)}<div id="root">${body}</div>\n    ${bodyScripts.join("\n    ")}\n  ${html.slice(bodyEnd)}`;
  return html;
}

module.exports = { pageShell };
