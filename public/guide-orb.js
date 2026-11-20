// Sitewide page guide: a small golden orb that follows the reader and, each time they stop
// scrolling, says one new thing about the part of the page they are looking at.
// Plain script (no build step), loaded on every page like voice-cta.js.
//
// - The lines come from /.netlify/functions/orb-lines, which reads this page's own facts
//   (offer, payment plan, prices, units, delivery, the developer's signature facts) and has an
//   AI word them once per page. The orb never makes anything up on its own.
// - It never says the same line twice in a visit, even across pages (sessionStorage).
// - The homepage has its own guide (src/components/home/PageGuide.tsx); admin and the Sales
//   War Room never show it.
// - Light on the phone: the orb is drawn only while it moves, never while the page is idle or
//   hidden, and not at all with "reduce motion" switched on.
(function () {
  "use strict";
  if (window.__tycoonsGuideOrb) return;
  window.__tycoonsGuideOrb = true;

  var HIDDEN = /^\/(?:en\/?)?$|^\/(?:admin|sales|war-room|sales-war-room|media-admin|search)(?:[\/.?#]|$)/i;
  var ENDPOINT = "/.netlify/functions/orb-lines?path=";
  var WHATSAPP = "201110100025";
  var SEEN_KEY = "tycoons_orb_seen";
  var CLOSED_KEY = "tycoons_orb_closed";
  var SIZE = 56;

  var TOPIC_RULES = [
    ["offer", /عرض|خصم|offer|discount|promo/i],
    ["payment", /مقدم|قسط|تقسيط|أقساط|دفعة|سداد|down ?payment|instal?ments?|monthly|payment plan/i],
    ["delivery", /استلام|تسليم|delivery|handover|ready to move|جاهز|فوري/i],
    ["price", /سعر|أسعار|جنيه|مليون|price|egp|million/i],
    ["units", /شقة|شقق|فيلا|فيلات|تاون|توين|دوبلكس|شاليه|بنتهاوس|ستوديو|غرف|apartment|villa|townhouse|twin|duplex|chalet|penthouse|studio|bedroom/i],
    ["location", /طريق|دقيقة|دقايق|منطقة|موقع|قريب|المطار|road|minutes|location|near|airport/i],
    ["developer", /مطور|المطور|تأسست|شركة|developer|founded|company/i],
  ];
  // Topics that go well together when the exact one has nothing new left.
  var NEAR = { offer: ["payment", "price"], payment: ["offer", "price"], price: ["offer", "payment", "units"], units: ["price", "delivery"], delivery: ["units", "payment"], location: ["units", "developer"], developer: ["general", "offer"], general: ["developer", "offer"] };

  var TEXT = {
    ar: { next: "قولّي حاجة تانية", close: "اقفل", open: "افتح نصايح الصفحة", wa: "اسأل على واتساب", plans: "شوف أنظمة السداد", typing: "بيكتب" },
    en: { next: "Tell me something else", close: "Close", open: "Open page tips", wa: "Ask on WhatsApp", plans: "See the payment plans", typing: "Typing" },
  };

  function lang() {
    var value = (document.documentElement.getAttribute("lang") || "").toLowerCase();
    if (value.indexOf("en") === 0) return "en";
    return /^\/en(\/|$)/.test(location.pathname) ? "en" : "ar";
  }

  function store(kind, key, value) {
    try {
      var box = kind === "local" ? window.localStorage : window.sessionStorage;
      if (value === undefined) return box.getItem(key);
      box.setItem(key, value);
    } catch (error) {
      return null;
    }
    return null;
  }

  function hash(text) {
    var h = 5381;
    for (var i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  var seen = {};
  try { seen = JSON.parse(store("session", SEEN_KEY) || "{}") || {}; } catch (error) { seen = {}; }
  function markSeen(line) {
    seen[hash(line.text)] = 1;
    store("session", SEEN_KEY, JSON.stringify(seen));
  }

  function topicOf(text) {
    for (var i = 0; i < TOPIC_RULES.length; i++) if (TOPIC_RULES[i][1].test(text)) return TOPIC_RULES[i][0];
    return "general";
  }

  // The topic of the part of the page in the middle of the screen.
  function topicInView() {
    var el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight * 0.45);
    var hops = 0;
    while (el && el !== document.body && hops < 12) {
      if (/^(SECTION|ARTICLE|TABLE|ASIDE)$/.test(el.tagName) || el.hasAttribute("data-showcase") || (el.querySelector && el.querySelector("h2,h3") && el.textContent.length > 120)) break;
      el = el.parentElement;
      hops++;
    }
    if (!el || el === document.body) return "general";
    var heading = el.querySelector && el.querySelector("h2,h3");
    var text = ((heading ? heading.textContent + " " : "") + el.textContent).slice(0, 600);
    if (el.hasAttribute && el.hasAttribute("data-showcase")) return "offer";
    return topicOf(text);
  }

  // ---------- the orb (canvas) ----------
  var energy = 0;
  var frame = 0;
  var reduce = false;
  try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (error) { reduce = false; }

  function Orb(canvas) {
    var ctx = canvas.getContext && canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    canvas.style.width = SIZE + "px";
    canvas.style.height = SIZE + "px";
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var start = Date.now();

    function draw() {
      if (!ctx) return;
      var t = reduce ? 0 : Date.now() - start;
      var c = SIZE / 2;
      var R = SIZE * 0.3 * (1 + energy * 0.12);
      ctx.clearRect(0, 0, SIZE, SIZE);
      var halo = ctx.createRadialGradient(c, c, R * 0.5, c, c, SIZE * 0.5);
      halo.addColorStop(0, "rgba(255,211,107,.55)");
      halo.addColorStop(1, "rgba(255,211,107,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, SIZE, SIZE);
      for (var layer = 0; layer < 3; layer++) {
        ctx.beginPath();
        for (var a = 0; a <= Math.PI * 2 + 0.01; a += 0.1) {
          var n = Math.sin(a * 3 + t / (700 - layer * 120) + layer) * 0.05 * (0.4 + energy) + Math.sin(a * 5 - t / 900) * 0.03 * (1 + energy * 2);
          var r = R * (1 - layer * 0.16) * (1 + n);
          var x = c + Math.cos(a) * r;
          var y = c + Math.sin(a) * r;
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        var g = ctx.createRadialGradient(c - R * 0.3, c - R * 0.4, 2, c, c, R * 1.1);
        g.addColorStop(0, "#ffffff");
        g.addColorStop(0.35, "#fff3d1");
        g.addColorStop(0.75, "#f0bd4f");
        g.addColorStop(1, "#d99a2b");
        ctx.globalAlpha = layer ? 0.55 : 1;
        ctx.fillStyle = g;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Animate only while there is energy left; then stop drawing until the next nudge.
    function loop() {
      draw();
      energy *= 0.95;
      if (!reduce && !document.hidden && energy > 0.02) frame = requestAnimationFrame(loop);
      else { frame = 0; energy = 0; draw(); }
    }

    return {
      draw: draw,
      nudge: function (amount) {
        energy = Math.min(1.6, energy + amount);
        if (!frame && !reduce) frame = requestAnimationFrame(loop);
      },
    };
  }

  // ---------- the bubble ----------
  var root, bubble, orb, lines = [], current = null, path = "", loaded = false, closed = false, shownFirst = false;
  var lastStopY = 0, scrollTimer = 0, request = 0;

  function style() {
    if (document.getElementById("tgo-style")) return;
    var css =
      ".tgo{position:fixed;z-index:61;right:12px;bottom:calc(max(14px,env(safe-area-inset-bottom)) + 66px);display:flex;align-items:flex-end;gap:8px;" +
      "flex-direction:row;max-width:min(360px,calc(100vw - 24px));font:500 13.5px/1.6 Alexandria,Arial,'Noto Sans Arabic',sans-serif;" +
      "opacity:0;transform:translateY(10px);transition:opacity .35s ease,transform .35s ease;pointer-events:none}" +
      ".tgo.on{opacity:1;transform:none;pointer-events:auto}.tgo[dir=ltr]{flex-direction:row-reverse}" +
      ".tgo-orb{flex:none;border:0;padding:0;background:none;cursor:pointer;border-radius:50%;filter:drop-shadow(0 10px 18px rgba(217,154,43,.45))}" +
      ".tgo-orb:focus-visible{outline:3px solid #d99a2b;outline-offset:2px}" +
      ".tgo-b{position:relative;min-width:0;background:#fff;color:#0f1724;border-radius:18px 18px 4px 18px;padding:10px 14px;" +
      "box-shadow:0 20px 50px -20px rgba(6,15,28,.55);border:1px solid rgba(11,27,48,.08)}" +
      ".tgo-b[hidden]{display:none}.tgo-b p{margin:0}" +
      ".tgo-x{float:inline-end;margin-inline-start:8px;border:0;background:none;color:#8a93a3;font-size:16px;line-height:1;cursor:pointer;padding:2px}" +
      ".tgo-x:hover{color:#0f1724}" +
      ".tgo-a{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}" +
      ".tgo-a a,.tgo-a button{border-radius:999px;padding:4px 12px;font:700 12px/1.6 inherit;font-family:inherit;text-decoration:none;cursor:pointer}" +
      ".tgo-wa{border:1px solid rgba(31,170,89,.4);background:rgba(31,170,89,.1);color:#147a40}" +
      ".tgo-go{border:1px solid #e3e9f2;background:#f4f6fa;color:#0b1b30}.tgo-go:hover{border-color:#d99a2b}" +
      ".tgo-dots{display:inline-flex;gap:4px;padding:6px 0}.tgo-dots i{width:6px;height:6px;border-radius:50%;background:#b8c1cf;animation:tgo-p 1s infinite}" +
      ".tgo-dots i:nth-child(2){animation-delay:.15s}.tgo-dots i:nth-child(3){animation-delay:.3s}" +
      "@keyframes tgo-p{0%,100%{opacity:.3}50%{opacity:1}}" +
      "@media (prefers-reduced-motion:reduce){.tgo{transition:none}.tgo-dots i{animation:none}}" +
      "@media print{.tgo{display:none}}";
    var node = document.createElement("style");
    node.id = "tgo-style";
    node.textContent = css;
    document.head.appendChild(node);
  }

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    for (var key in attrs) if (Object.prototype.hasOwnProperty.call(attrs, key)) node.setAttribute(key, attrs[key]);
    if (text) node.textContent = text;
    return node;
  }

  function waHref(line) {
    var en = lang() === "en";
    var message = [
      "Hello Tycoons Investments,",
      en ? "I saw this on your website and want to know more:" : "شفت المعلومة دي على موقعكم وعايز أعرف تفاصيل أكتر:",
      line.text,
      "",
      "Source: guide_orb",
      "Page: " + location.href.split("#")[0],
    ].join("\n");
    return "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(message);
  }

  function show(line) {
    current = line;
    markSeen(line);
    var t = TEXT[lang()];
    bubble.innerHTML = "";
    bubble.hidden = false;
    var x = el("button", { type: "button", class: "tgo-x", "aria-label": t.close }, "×");
    x.addEventListener("click", close);
    bubble.appendChild(x);
    bubble.appendChild(el("p", {}, line.text));
    var actions = el("div", { class: "tgo-a" });
    var plans = document.querySelector("[data-showcase]");
    if (plans && (line.topic === "offer" || line.topic === "payment")) {
      var go = el("button", { type: "button", class: "tgo-go" }, t.plans);
      go.addEventListener("click", function () { plans.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); });
      actions.appendChild(go);
    }
    actions.appendChild(el("a", { class: "tgo-wa", href: waHref(line), target: "_blank", rel: "noopener", "data-wa-source": "guide-orb" }, t.wa));
    bubble.appendChild(actions);
  }

  function typing() {
    bubble.hidden = false;
    bubble.innerHTML = "";
    var dots = el("span", { class: "tgo-dots", "aria-label": TEXT[lang()].typing });
    dots.innerHTML = "<i></i><i></i><i></i>";
    bubble.appendChild(dots);
  }

  // The next line nobody has heard yet: same topic as the part of the page in view, then a close
  // topic, then anything left. Null when everything has been said.
  function pick(topic) {
    var fresh = lines.filter(function (line) { return !seen[hash(line.text)]; });
    if (!fresh.length) return null;
    var order = [topic].concat(NEAR[topic] || []);
    for (var i = 0; i < order.length; i++) {
      for (var j = 0; j < fresh.length; j++) if (fresh[j].topic === order[i]) return fresh[j];
    }
    return fresh[0];
  }

  function speak(force) {
    if (!lines.length || (closed && !force)) return;
    var line = pick(shownFirst ? topicInView() : "offer");
    if (!line) return;
    shownFirst = true;
    orb.nudge(1.2);
    typing();
    setTimeout(function () { show(line); }, reduce ? 0 : 480);
  }

  function close() {
    closed = true;
    store("session", CLOSED_KEY, "1");
    bubble.hidden = true;
  }

  function reveal() {
    if (!root || root.classList.contains("on") || !lines.length) return;
    root.classList.add("on");
    orb.draw();
    if (!closed) setTimeout(function () { speak(false); }, 600);
  }

  function onScroll() {
    if (!root || !loaded) return;
    if (orb) orb.nudge(0.08);
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () {
      var y = window.scrollY || window.pageYOffset || 0;
      if (!root.classList.contains("on")) {
        if (y > window.innerHeight * 0.25) reveal();
        return;
      }
      // A new line only after the reader moved about half a screen and stopped.
      if (Math.abs(y - lastStopY) < window.innerHeight * 0.45) return;
      lastStopY = y;
      speak(false);
    }, 450);
  }

  function load() {
    var mine = ++request;
    lines = [];
    loaded = false;
    shownFirst = false;
    if (root) { root.classList.remove("on"); bubble.hidden = true; }
    if (HIDDEN.test(location.pathname)) return;
    path = location.pathname;
    var done = function (data) {
      if (mine !== request) return;
      lines = (data && Array.isArray(data.lines) ? data.lines : []).filter(function (line) { return line && typeof line.text === "string" && line.text.length > 4; });
      loaded = true;
      lastStopY = window.scrollY || 0;
      // The first line (the strongest one, usually the offer) comes a few seconds after arrival.
      if (lines.length) setTimeout(function () { if (mine === request) reveal(); }, 3500);
    };
    if (!window.fetch) return;
    fetch(ENDPOINT + encodeURIComponent(path), { credentials: "omit" })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(done, function () { done(null); });
  }

  function mount() {
    if (document.getElementById("tgo")) return;
    style();
    closed = store("session", CLOSED_KEY) === "1";
    root = el("div", { id: "tgo", class: "tgo", role: "status", "aria-live": "polite" });
    var t = TEXT[lang()];
    var button = el("button", { type: "button", class: "tgo-orb", "aria-label": t.next });
    var canvas = el("canvas", { "aria-hidden": "true" });
    button.appendChild(canvas);
    bubble = el("div", { class: "tgo-b" });
    bubble.hidden = true;
    root.appendChild(button);
    root.appendChild(bubble);
    root.setAttribute("dir", lang() === "en" ? "ltr" : "rtl");
    document.body.appendChild(root);
    orb = Orb(canvas);
    button.addEventListener("click", function () {
      closed = false;
      store("session", CLOSED_KEY, "0");
      if (!pick("general")) { seen = {}; store("session", SEEN_KEY, "{}"); } // said everything: start over on request
      speak(true);
    });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", function () { if (!document.hidden && orb) orb.draw(); });

    // The React app changes pages without a reload: load the new page's lines.
    ["pushState", "replaceState"].forEach(function (name) {
      var original = history[name];
      if (typeof original !== "function") return;
      history[name] = function () {
        var result = original.apply(this, arguments);
        setTimeout(function () { if (location.pathname !== path) load(); }, 0);
        return result;
      };
    });
    window.addEventListener("popstate", function () { if (location.pathname !== path) load(); });
    load();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
