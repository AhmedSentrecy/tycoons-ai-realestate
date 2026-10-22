"use strict";

// Runs public/wa-track.js in a tiny fake browser and checks what it does to WhatsApp clicks.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "public", "wa-track.js"), "utf8");

function element({ tag = "a", href = "", text = "", attrs = {}, parent = null, fixed = false } = {}) {
  const node = {
    tagName: tag.toUpperCase(),
    href,
    textContent: text,
    title: "",
    parentElement: parent,
    fixed,
    getAttribute: (name) => (name in attrs ? attrs[name] : null),
    closest(selector) {
      for (let current = node; current; current = current.parentElement) {
        if (selector === "a[href]" && current.tagName === "A" && current.href) return current;
        if (selector === "[data-wa-source]" && current.getAttribute("data-wa-source")) return current;
        if (selector === "header, nav" && ["HEADER", "NAV"].includes(current.tagName)) return current;
        if (selector === "footer" && current.tagName === "FOOTER") return current;
      }
      return null;
    },
  };
  return node;
}

function browser({ pathname = "/projects/sodic-east--sodic", search = "", referrer = "", lang = "ar", h1 = "SODIC East" } = {}) {
  const requests = [];
  const opened = [];
  const store = new Map();
  let clickListener = null;
  const body = element({ tag: "body" });
  const window = {
    open: (url) => { opened.push(url); return null; },
  };
  const context = {
    window,
    location: { pathname, search, origin: "https://tycoons-inv.com", hostname: "tycoons-inv.com" },
    document: {
      referrer,
      body,
      documentElement: { lang },
      activeElement: null,
      addEventListener: (type, listener, capture) => { if (type === "click" && capture) clickListener = listener; },
      querySelector: (selector) => (selector === "h1" && h1 ? { textContent: h1 } : null),
    },
    navigator: { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile" },
    sessionStorage: { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)) },
    getComputedStyle: (node) => ({ position: node.fixed ? "fixed" : "static" }),
    fetch: (url, options) => { requests.push({ url, options, row: JSON.parse(options.body) }); return Promise.resolve({ ok: true }); },
    URL,
    URLSearchParams,
    Date,
    Math,
    JSON,
    String,
    Array,
  };
  vm.runInNewContext(source, context);
  return {
    requests,
    opened,
    window,
    document: context.document,
    body,
    click(target) {
      clickListener({ target });
      return target;
    },
  };
}

// 1. A plain WhatsApp link on a project page: code added to the message, click recorded.
{
  const page = browser({ search: "?utm_source=facebook&utm_campaign=sodic_east", referrer: "https://l.facebook.com/" });
  const link = page.click(element({ href: "https://wa.me/201200704344", text: " كلمنا واتساب ", parent: page.body }));
  const url = new URL(link.href);
  assert.match(url.searchParams.get("text"), /^كود الطلب: T-[A-Z2-9]{5}$/);
  assert.equal(page.requests.length, 1);
  const { url: endpoint, options, row } = page.requests[0];
  assert.equal(endpoint, "https://coqnjymekrkoausiiytm.supabase.co/rest/v1/whatsapp_clicks");
  assert.equal(options.keepalive, true);
  assert.equal(options.headers.Prefer, "return=minimal");
  assert.equal(row.tracking_id, url.searchParams.get("text").replace("كود الطلب: ", ""));
  assert.equal(row.source, "page");
  assert.equal(row.button_label, "كلمنا واتساب");
  assert.equal(row.page_path, "/projects/sodic-east--sodic");
  assert.equal(row.project_slug, "sodic-east--sodic");
  assert.equal(row.project_name, "SODIC East");
  assert.equal(row.traffic_source, "facebook");
  assert.equal(row.utm_campaign, "sodic_east");
  assert.equal(row.referrer, "l.facebook.com");
  assert.equal(row.device, "mobile");
}

// 2. A link whose message already carries a code keeps it (no second code).
{
  const page = browser({ referrer: "https://www.google.com/" });
  const message = "Hello\nTracking ID: wa_abc123_xyz";
  const href = `https://wa.me/201200704344?text=${encodeURIComponent(message)}`;
  const link = page.click(element({ href, text: "اطلب آخر الأسعار", parent: page.body }));
  assert.equal(link.href, href, "an existing code must not be duplicated");
  assert.equal(page.requests[0].row.tracking_id, "wa_abc123_xyz");
  assert.equal(page.requests[0].row.traffic_source, "google");
}

// 3. Placement: header, footer, floating, explicit data-wa-source.
{
  const page = browser();
  const header = element({ tag: "header", parent: page.body });
  page.click(element({ href: "https://wa.me/201200704344", text: "واتساب", parent: header }));
  const footer = element({ tag: "footer", parent: page.body });
  page.click(element({ href: "https://wa.me/201200704344?text=a", text: "تواصل معنا", parent: footer }));
  const floating = element({ tag: "div", parent: page.body, fixed: true });
  page.click(element({ href: "https://wa.me/201200704344?text=b", parent: floating }));
  const tagged = element({ tag: "div", parent: page.body, attrs: { "data-wa-source": "unit_card" } });
  page.click(element({ href: "https://wa.me/201200704344?text=c", parent: tagged }));
  assert.deepEqual(page.requests.map((request) => request.row.source), ["header", "footer", "floating", "unit_card"]);
}

// 4. Non-WhatsApp links are ignored.
{
  const page = browser();
  const link = page.click(element({ href: "https://tycoons-inv.com/ar/areas/new-cairo", parent: page.body }));
  assert.equal(link.href, "https://tycoons-inv.com/ar/areas/new-cairo");
  assert.equal(page.requests.length, 0);
}

// 5. Internal tools (sales war room, admin) are never touched.
for (const pathname of ["/sales-war-room/lead/12", "/admin", "/media-admin/x"]) {
  const page = browser({ pathname });
  const href = "https://wa.me/201000000000?text=hello";
  const link = page.click(element({ href, parent: page.body }));
  assert.equal(link.href, href, `${pathname} must keep its WhatsApp link unchanged`);
  assert.equal(page.requests.length, 0, `${pathname} must not be tracked`);
}

// 6. Buttons that call window.open (React app) are tracked and get the code too.
{
  const page = browser({ pathname: "/en/projects/eastvale--sodic", lang: "en", h1: "Eastvale" });
  page.document.activeElement = element({ tag: "button", text: "Ask about payment plan", parent: page.body });
  page.window.open("https://wa.me/201200704344?text=Hi", "_blank", "noopener,noreferrer");
  assert.equal(page.opened.length, 1);
  assert.match(new URL(page.opened[0]).searchParams.get("text"), /^Hi\n\nRef: T-[A-Z2-9]{5}$/);
  assert.equal(page.requests[0].row.button_label, "Ask about payment plan");
  assert.equal(page.requests[0].row.project_slug, "eastvale--sodic");
  assert.equal(page.requests[0].row.traffic_source, "direct");
  assert.equal(page.requests[0].row.lang, "en");
}

// 7. A double click on the same link is recorded once.
{
  const page = browser();
  const link = element({ href: "https://wa.me/201200704344", parent: page.body });
  page.click(link);
  page.click(link);
  assert.equal(page.requests.length, 1);
}

// 8. Every value respects the database size limits.
{
  const page = browser({ h1: "x".repeat(500) });
  page.click(element({ href: `https://wa.me/201200704344?text=${"y".repeat(3000)}`, text: "z".repeat(400), parent: page.body }));
  const row = page.requests[0].row;
  assert.ok(row.button_label.length <= 120 && row.project_name.length <= 160 && row.whatsapp_url.length <= 1500);
}

// 9. When Google Analytics is on the page, the click is also sent as a GA4 lead.
{
  const page = browser();
  const events = [];
  page.window.gtag = (...args) => events.push(args);
  page.click(element({ href: "https://wa.me/201200704344", parent: page.body }));
  assert.equal(events.length, 1);
  assert.equal(events[0][0], "event");
  assert.equal(events[0][1], "generate_lead");
  assert.equal(events[0][2].method, "whatsapp");
  assert.equal(events[0][2].lead_ref, page.requests[0].row.tracking_id);
  assert.equal(events[0][2].project, "SODIC East");
}

// 10. The GA4 tag (SPA shell + server-rendered pages) loads on public pages only.
{
  const shell = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const { GA4_TAG } = require("../netlify/functions/_seo-utils.cjs");
  assert.match(shell, /<script src="\/wa-track\.js" defer><\/script>/);
  const shellTag = shell.match(/<script>(\(function\(\)\{[^<]*G-2DC6V5L3XM[^<]*)<\/script>/);
  assert.ok(shellTag, "index.html must carry the GA4 tag");
  for (const [name, code] of [["index.html", shellTag[1]], ["SSR", GA4_TAG.replace(/^<script>|<\/script>$/g, "")]]) {
    for (const [pathname, expected] of [["/projects/sodic-east--sodic", true], ["/", true], ["/admin", false], ["/sales-war-room/lead/1", false], ["/media-admin", false]]) {
      const appended = [];
      const sandbox = {
        location: { pathname },
        window: {},
        document: { createElement: () => ({}), head: { appendChild: (node) => appended.push(node) } },
        Date,
      };
      sandbox.window.dataLayer = undefined;
      vm.runInNewContext(code, sandbox);
      assert.equal(typeof sandbox.window.gtag === "function", expected, `${name} ${pathname}`);
      assert.equal(appended.length, expected ? 1 : 0, `${name} ${pathname}`);
      if (expected) assert.equal(appended[0].src, "https://www.googletagmanager.com/gtag/js?id=G-2DC6V5L3XM");
    }
  }
}

console.log("WhatsApp click tracking validation passed (10 scenarios).");
