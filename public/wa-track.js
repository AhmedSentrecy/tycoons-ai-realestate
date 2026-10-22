/*
 * WhatsApp click counter for tycoons-inv.com.
 *
 * Loaded on every public render path (SPA shell, build-time static pages and the
 * Netlify SSR pages). One capturing click listener + a window.open wrapper catch
 * every WhatsApp link or button, whatever component rendered it.
 *
 * Each click:
 *   1. gets a short reference code (e.g. T-7K2QM) added to the WhatsApp message,
 *      so an incoming chat can be matched to the page it came from;
 *   2. is recorded in Supabase public.whatsapp_clicks (insert-only with the public key,
 *      nobody can read rows with it). Fire-and-forget: tracking never blocks or breaks
 *      the WhatsApp link.
 *
 * Internal tools (/admin, /sales-war-room) are never touched: their WhatsApp links go to
 * clients from the sales team and must stay exactly as written.
 */
(function () {
  "use strict";
  if (window.__tycoonsWaTrack) return;
  window.__tycoonsWaTrack = true;

  var SUPABASE_URL = "https://coqnjymekrkoausiiytm.supabase.co";
  var PUBLIC_KEY = "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";
  var SESSION_KEY = "tycoons_wa_landing";
  var WA_PATTERN = /^https?:\/\/(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|(?:www\.)?whatsapp\.com)\//i;
  var EXISTING_CODE = /(?:Tracking ID|كود الطلب|Ref):\s*([A-Za-z0-9_-]{4,40})/;
  var lastClick = { href: "", at: 0 };

  function internalPage() {
    return /^\/(?:admin|sales-war-room|media-admin)(?:\/|$)/i.test(location.pathname);
  }

  function clip(value, max) {
    if (value === null || value === undefined) return null;
    var text = String(value).replace(/\s+/g, " ").trim();
    return text ? text.slice(0, max) : null;
  }

  function session(value) {
    try {
      if (value === undefined) return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
    } catch (error) {
      return null;
    }
    return null;
  }

  // Where the visitor came from, decided on the first page they open in this tab.
  function classify(host) {
    if (!host) return "direct";
    if (/(^|\.)google\./i.test(host)) return "google";
    if (/(^|\.)(bing|duckduckgo|yahoo|yandex|ecosia)\./i.test(host)) return "other_search";
    if (/(^|\.)(facebook|fb|instagram|messenger)\.|^l\.facebook|^lm\.facebook|^m\.facebook/i.test(host)) return "facebook";
    if (/(chatgpt|openai|perplexity|gemini|copilot|claude|bard)\./i.test(host)) return "ai";
    if (/(^|\.)(t\.co|x\.com|twitter\.com|linkedin\.com|tiktok\.com|youtube\.com|snapchat\.com)$/i.test(host)) return "social";
    return "referral";
  }

  function landing() {
    var saved = session();
    if (saved) return saved;
    var params;
    try { params = new URLSearchParams(location.search); } catch (error) { params = { get: function () { return null; } }; }
    var refHost = "";
    try { refHost = document.referrer ? new URL(document.referrer).hostname : ""; } catch (error) { refHost = ""; }
    if (refHost === location.hostname || /(^|\.)tycoons-inv\.(com|de)$/i.test(refHost)) refHost = "";
    var utmSource = clip(params.get("utm_source"), 60);
    var source = params.get("gclid") ? "google_ads"
      : params.get("fbclid") ? "facebook"
      : utmSource ? utmSource.toLowerCase()
      : classify(refHost);
    var value = {
      source: source,
      referrer: refHost || null,
      utm_source: utmSource,
      utm_medium: clip(params.get("utm_medium"), 60),
      utm_campaign: clip(params.get("utm_campaign"), 120),
      path: location.pathname
    };
    session(value);
    return value;
  }

  function device() {
    var ua = navigator.userAgent || "";
    if (/iPad|Tablet/i.test(ua)) return "tablet";
    if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "mobile";
    return "desktop";
  }

  function newCode() {
    var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var code = "T-";
    for (var i = 0; i < 5; i++) code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    return code;
  }

  // Adds the reference code to the message text (or reuses the one already in it).
  function withCode(href) {
    var url;
    try { url = new URL(href); } catch (error) { return { href: href, code: newCode() }; }
    var text = url.searchParams.get("text") || "";
    var found = text.match(EXISTING_CODE);
    if (found) return { href: href, code: found[1] };
    var code = newCode();
    var arabic = (document.documentElement.lang || "ar").toLowerCase().indexOf("en") !== 0;
    var line = (arabic ? "كود الطلب: " : "Ref: ") + code;
    url.searchParams.set("text", text ? text + "\n\n" + line : line);
    return { href: url.toString(), code: code };
  }

  function placement(element) {
    if (!element || !element.closest) return "button";
    var tagged = element.closest("[data-wa-source]");
    if (tagged) return clip(tagged.getAttribute("data-wa-source"), 60);
    if (element.closest("header, nav")) return "header";
    if (element.closest("footer")) return "footer";
    for (var node = element; node && node !== document.body; node = node.parentElement) {
      try {
        if (getComputedStyle(node).position === "fixed") return "floating";
      } catch (error) {
        break;
      }
    }
    return "page";
  }

  function projectSlug() {
    var match = location.pathname.match(/^\/(?:en\/|ar\/)?projects\/([^/?#]+)/i);
    return match ? clip(decodeURIComponent(match[1]), 160) : null;
  }

  function projectName() {
    if (!projectSlug()) return null;
    var heading = document.querySelector("h1");
    return heading ? clip(heading.textContent, 160) : null;
  }

  function label(element) {
    if (!element) return null;
    return clip(element.getAttribute && element.getAttribute("aria-label") || element.textContent || element.title, 120);
  }

  function record(href, code, element) {
    var origin = landing();
    var row = {
      tracking_id: code,
      source: placement(element),
      button_label: label(element),
      page_url: clip(location.origin + location.pathname, 500),
      page_path: clip(location.pathname, 300),
      project_slug: projectSlug(),
      project_name: projectName(),
      traffic_source: clip(origin.source, 40),
      referrer: clip(origin.referrer, 200),
      landing_path: clip(origin.path, 300),
      device: device(),
      lang: clip(document.documentElement.lang, 10),
      user_agent: clip(navigator.userAgent, 300),
      whatsapp_url: clip(href, 1500)
    };
    if (origin.utm_source) row.utm_source = origin.utm_source;
    if (origin.utm_medium) row.utm_medium = origin.utm_medium;
    if (origin.utm_campaign) row.utm_campaign = origin.utm_campaign;
    try {
      fetch(SUPABASE_URL + "/rest/v1/whatsapp_clicks", {
        method: "POST",
        keepalive: true,
        headers: { apikey: PUBLIC_KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify(row)
      }).catch(function () {});
    } catch (error) {
      /* tracking must never break the WhatsApp link */
    }
    // Same click as a Google Analytics 4 lead (mark "generate_lead" as a key event in GA4).
    try {
      if (typeof window.gtag === "function") {
        window.gtag("event", "generate_lead", {
          method: "whatsapp",
          lead_ref: code,
          lead_button: row.source,
          project: row.project_name || row.project_slug || undefined,
          transport_type: "beacon"
        });
      }
    } catch (error) {
      /* analytics is optional */
    }
  }

  function handle(href, element) {
    if (internalPage() || !WA_PATTERN.test(href)) return href;
    var now = Date.now();
    if (lastClick.href === href && now - lastClick.at < 1000) return href;
    var result = withCode(href);
    lastClick = { href: result.href, at: now };
    record(result.href, result.code, element);
    return result.href;
  }

  // Links (<a href="https://wa.me/...">): capture phase runs before the browser follows them.
  document.addEventListener("click", function (event) {
    try {
      var link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (!link) return;
      var updated = handle(link.href, link);
      if (updated !== link.href) link.href = updated;
    } catch (error) {
      /* never block the click */
    }
  }, true);

  // Buttons that open WhatsApp from code (window.open in the React app).
  var originalOpen = window.open;
  if (typeof originalOpen === "function") {
    window.open = function (url) {
      var args = Array.prototype.slice.call(arguments);
      try {
        if (typeof url === "string" || (url && typeof url.href === "string")) {
          args[0] = handle(String(url), document.activeElement);
        }
      } catch (error) {
        /* keep the original URL */
      }
      return originalOpen.apply(window, args);
    };
  }

  // Remember where this visit started even if the first click happens pages later.
  if (!internalPage()) landing();
})();
