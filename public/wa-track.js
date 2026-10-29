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
 * Before WhatsApp opens, a short form asks for the visitor's name and mobile number (29 Oct 2026).
 * The lead goes to the website-lead edge function, which stores it and pushes it to 8X CRM; the
 * name is added to the WhatsApp message. A visitor who already filled it in is not asked again
 * (remembered in this browser for 60 days).
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
  var LEAD_URL = SUPABASE_URL + "/functions/v1/website-lead";
  var LEAD_KEY = "tycoons_lead";
  var LEAD_DAYS = 60;
  var originalOpen = window.open;

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

  function arabicPage() {
    return (document.documentElement.lang || "ar").toLowerCase().indexOf("en") !== 0;
  }

  function savedLead() {
    try {
      var lead = JSON.parse(localStorage.getItem(LEAD_KEY) || "null");
      if (lead && lead.name && lead.phone && Date.now() - lead.at < LEAD_DAYS * 86400000) return lead;
    } catch (error) {
      /* storage blocked: ask again */
    }
    return null;
  }

  function saveLead(name, phone) {
    try { localStorage.setItem(LEAD_KEY, JSON.stringify({ name: name, phone: phone, at: Date.now() })); } catch (error) { /* optional */ }
  }

  function phoneDigits(value) {
    return String(value || "")
      .replace(/[٠-٩]/g, function (d) { return String("٠١٢٣٤٥٦٧٨٩".indexOf(d)); })
      .replace(/[^\d+]/g, "");
  }

  function validPhone(value) {
    var digits = phoneDigits(value).replace(/\D/g, "");
    return /^(?:20)?0?1[0125]\d{8}$/.test(digits) || (/^\+/.test(phoneDigits(value)) && digits.length >= 8 && digits.length <= 15);
  }

  // Adds "الاسم: …" to the WhatsApp message so the sales team knows who is writing.
  function withName(href, name) {
    try {
      var url = new URL(href);
      var text = url.searchParams.get("text") || "";
      var line = (arabicPage() ? "الاسم: " : "Name: ") + name;
      if (text.indexOf(line) === -1) url.searchParams.set("text", text ? line + "\n" + text : line);
      return url.toString();
    } catch (error) {
      return href;
    }
  }

  function sendLead(name, phone, code, element) {
    var origin = landing();
    var payload = {
      name: name,
      phone: phone,
      tracking_id: code,
      placement: placement(element),
      button_label: label(element),
      page_url: clip(location.origin + location.pathname, 500),
      page_path: clip(location.pathname, 300),
      project_slug: projectSlug(),
      project_name: projectName() || clip(document.querySelector("h1") && document.querySelector("h1").textContent, 160),
      lang: clip(document.documentElement.lang, 10),
      device: device(),
      traffic_source: clip(origin.source, 40),
      referrer: clip(origin.referrer, 200),
      landing_path: clip(origin.path, 300),
      utm_source: origin.utm_source || null,
      utm_medium: origin.utm_medium || null,
      utm_campaign: origin.utm_campaign || null
    };
    try {
      var controller = typeof AbortController === "function" ? new AbortController() : null;
      var timer = controller ? setTimeout(function () { controller.abort(); }, 4000) : null;
      return fetch(LEAD_URL, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller ? controller.signal : undefined
      }).then(function () { if (timer) clearTimeout(timer); }, function () { if (timer) clearTimeout(timer); });
    } catch (error) {
      return Promise.resolve();
    }
  }

  function injectStyles() {
    if (document.getElementById("tyc-lead-style")) return;
    var style = document.createElement("style");
    style.id = "tyc-lead-style";
    style.textContent =
      ".tyc-lead{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(13,31,24,.55)}" +
      ".tyc-lead form{position:relative;width:100%;max-width:380px;padding:24px 20px 20px;border-radius:20px;background:#fff;color:#1b2420;font-family:inherit;box-shadow:0 20px 60px rgba(0,0,0,.25)}" +
      ".tyc-lead h2{margin:0 0 18px;font-size:20px;line-height:1.5;color:#14352a}" +
      ".tyc-lead p{margin:0 0 16px;font-size:14px;line-height:1.7;color:#5c6a62}" +
      ".tyc-lead label{display:block;margin:0 0 12px;font-size:14px;font-weight:700}" +
      ".tyc-lead input{display:block;width:100%;box-sizing:border-box;margin-top:6px;padding:12px 14px;border:1px solid #d8ccb4;border-radius:12px;font:inherit;font-size:16px;background:#fff;color:#1b2420}" +
      ".tyc-lead input:focus{outline:2px solid #1faa59;border-color:#1faa59}" +
      ".tyc-lead .tyc-err{min-height:20px;margin:0 0 8px;font-size:13px;color:#b42318}" +
      ".tyc-lead button[type=submit]{width:100%;padding:13px;border:0;border-radius:12px;background:#1faa59;color:#fff;font:inherit;font-size:16px;font-weight:800;cursor:pointer}" +
      ".tyc-lead button[type=submit][disabled]{opacity:.7;cursor:wait}" +
      ".tyc-lead .tyc-x{position:absolute;top:10px;inset-inline-end:12px;width:32px;height:32px;border:0;border-radius:50%;background:#f3efe6;color:#14352a;font-size:18px;line-height:1;cursor:pointer}" +
      ".tyc-lead .tyc-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}" +
      ".tyc-lead small{display:block;margin-top:10px;font-size:12px;line-height:1.6;color:#7a857f;text-align:center}";
    document.head.appendChild(style);
  }

  // false when the page cannot show the form (then WhatsApp opens as before)
  function openForm(href, element) {
    if (!document.createElement || !document.head || !document.body || !document.body.appendChild) return false;
    if (document.querySelector(".tyc-lead")) return true;
    injectStyles();
    var ar = arabicPage();
    var t = ar
      ? { title: "كمل على الواتساب", name: "الاسم", phone: "رقم الموبايل", send: "كمل على واتساب", wait: "لحظة…", close: "إغلاق", errName: "اكتب اسمك", errPhone: "اكتب رقم موبايل صحيح، زي 01012345678" }
      : { title: "Continue on WhatsApp", name: "Name", phone: "Mobile number", send: "Continue to WhatsApp", wait: "One moment…", close: "Close", errName: "Please enter your name", errPhone: "Please enter a valid mobile number, e.g. 01012345678" };
    var overlay = document.createElement("div");
    overlay.className = "tyc-lead";
    overlay.setAttribute("dir", ar ? "rtl" : "ltr");
    overlay.innerHTML =
      '<form novalidate role="dialog" aria-modal="true" aria-labelledby="tyc-lead-title">' +
      '<button type="button" class="tyc-x" aria-label="' + t.close + '">×</button>' +
      '<h2 id="tyc-lead-title">' + t.title + '</h2>' +
      '<label>' + t.name + '<input name="name" autocomplete="name" maxlength="80" required></label>' +
      '<label>' + t.phone + '<input name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" dir="ltr" required></label>' +
      '<input class="tyc-hp" name="company_website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<div class="tyc-err" role="alert"></div>' +
      '<button type="submit">' + t.send + '</button></form>';
    document.body.appendChild(overlay);
    var form = overlay.querySelector("form");
    var nameInput = form.querySelector('input[name="name"]');
    var phoneInput = form.querySelector('input[name="phone"]');
    var error = form.querySelector(".tyc-err");
    var submit = form.querySelector('button[type="submit"]');
    function close() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); document.removeEventListener("keydown", onKey, true); }
    function onKey(event) { if (event.key === "Escape") close(); }
    document.addEventListener("keydown", onKey, true);
    overlay.addEventListener("click", function (event) { if (event.target === overlay) close(); });
    form.querySelector(".tyc-x").addEventListener("click", close);
    setTimeout(function () { try { nameInput.focus(); } catch (e) { /* ignore */ } }, 50);

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var name = clip(nameInput.value, 80) || "";
      var phone = phoneDigits(phoneInput.value);
      if (name.length < 2) { error.textContent = t.errName; nameInput.focus(); return; }
      if (!validPhone(phone)) { error.textContent = t.errPhone; phoneInput.focus(); return; }
      if (form.querySelector(".tyc-hp").value) { close(); return; }
      error.textContent = "";
      submit.disabled = true;
      submit.textContent = t.wait;
      // Open the WhatsApp tab now (inside the tap) so browsers do not block it, then point it at WhatsApp.
      var mobile = device() !== "desktop";
      var tab = null;
      if (!mobile && typeof originalOpen === "function") {
        try { tab = originalOpen.call(window, "", "_blank"); } catch (e) { tab = null; }
      }
      var result = withCode(withName(href, name));
      lastClick = { href: result.href, at: Date.now() };
      record(result.href, result.code, element);
      saveLead(name, phone);
      sendLead(name, phone, result.code, element).then(function () {
        close();
        if (tab && !tab.closed) { try { tab.location.href = result.href; return; } catch (e) { /* fall through */ } }
        location.href = result.href;
      });
    });
    return true;
  }

  // true when this WhatsApp click should show the form first
  function needsForm(href) {
    return !internalPage() && WA_PATTERN.test(href) && !savedLead();
  }

  function handle(href, element) {
    if (internalPage() || !WA_PATTERN.test(href)) return href;
    var now = Date.now();
    if (lastClick.href === href && now - lastClick.at < 1000) return href;
    var lead = savedLead();
    var result = withCode(lead ? withName(href, lead.name) : href);
    lastClick = { href: result.href, at: now };
    record(result.href, result.code, element);
    return result.href;
  }

  // Links (<a href="https://wa.me/...">): capture phase runs before the browser follows them.
  document.addEventListener("click", function (event) {
    try {
      var link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (!link) return;
      if (needsForm(link.href) && openForm(link.href, link)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      var updated = handle(link.href, link);
      if (updated !== link.href) link.href = updated;
    } catch (error) {
      /* never block the click */
    }
  }, true);

  // Buttons that open WhatsApp from code (window.open in the React app).
  if (typeof originalOpen === "function") {
    window.open = function (url) {
      var args = Array.prototype.slice.call(arguments);
      try {
        if (typeof url === "string" || (url && typeof url.href === "string")) {
          if (needsForm(String(url)) && openForm(String(url), document.activeElement)) return null;
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
