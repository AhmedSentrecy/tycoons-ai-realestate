// Day-to-night sky behind the inner pages (project, unit, area, developer, guide, search…).
// Plain script, no canvas: a few fixed layers whose opacity changes as the reader scrolls
// (sunrise at the top of the page, night at the footer). Changing opacity and transform is done
// by the graphics card, so scrolling stays smooth on cheap phones, and nothing runs while the
// page is still.
//
// Only on pages that ask for it with <html data-sky="on">: the server-rendered pages set it in
// their HTML, the React pages set it while they are on screen (src/lib/useSiteSky.ts). The
// homepage keeps its own animated sky (src/components/home/DaySky.tsx), so it never sets it.
(function () {
  "use strict";
  if (window.__tycoonsSiteSky) return;
  window.__tycoonsSiteSky = true;

  var root = document.documentElement;
  // Scroll positions of the sky colours (same as the homepage sky).
  var KEYS = [0, 0.22, 0.48, 0.68, 0.82, 1];
  var sky = null;
  var layers = [];
  var stars, sun, moon, city, lights;
  var ticking = false;
  var on = false;

  var CSS =
    "html.has-sky{background:#0b1b30}html.has-sky body{background:transparent!important}" +
    "#tsky{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;contain:strict}" +
    "#tsky[hidden]{display:none}" +
    "#tsky>i{position:absolute;inset:0;opacity:0;will-change:opacity}" +
    "#tsky>.k0{background:linear-gradient(180deg,#ffcf9e,#ffeedd);opacity:1}" +
    "#tsky>.k1{background:linear-gradient(180deg,#8cc6f7,#e4f2ff)}" +
    "#tsky>.k2{background:linear-gradient(180deg,#5aa6e6,#d3eaff)}" +
    "#tsky>.k3{background:linear-gradient(180deg,#ff8a5c,#7a4a86)}" +
    "#tsky>.k4{background:linear-gradient(180deg,#2c2f6c,#1a2550)}" +
    "#tsky>.k5{background:linear-gradient(180deg,#060f1c,#0b1b30)}" +
    "#tsky>.stars{bottom:30%;background-image:radial-gradient(1.4px 1.4px at 12% 18%,#fff 98%,transparent),radial-gradient(1.2px 1.2px at 32% 42%,#fff 98%,transparent),radial-gradient(1.6px 1.6px at 54% 12%,#fff 98%,transparent),radial-gradient(1.2px 1.2px at 71% 33%,#fff 98%,transparent),radial-gradient(1.4px 1.4px at 88% 9%,#fff 98%,transparent),radial-gradient(1px 1px at 22% 66%,#fff 98%,transparent),radial-gradient(1.3px 1.3px at 63% 58%,#fff 98%,transparent),radial-gradient(1px 1px at 93% 52%,#fff 98%,transparent);background-size:260px 220px}" +
    "#tsky>.sun{inset:auto;top:0;left:0;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(255,244,210,1) 0,rgba(255,190,90,.5) 24%,rgba(255,190,90,0) 70%);opacity:1;will-change:transform,opacity}" +
    "#tsky>.moon{inset:auto;top:12vh;right:14vw;width:110px;height:110px;border-radius:50%;background:radial-gradient(circle,rgba(245,245,255,.95) 0,rgba(220,225,255,.3) 26%,rgba(220,225,255,0) 70%)}" +
    "#tsky>.city,#tsky>.lights{top:auto;height:24vh;background-repeat:repeat-x;background-position:bottom;background-size:auto 100%}" +
    "@media print{#tsky{display:none}}";

  function progress() {
    var max = (document.documentElement.scrollHeight || 0) - window.innerHeight;
    var y = window.scrollY || window.pageYOffset || 0;
    return max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
  }

  // A skyline drawn once as an SVG picture: the buildings, and their lit windows on a second layer.
  function skyline() {
    var seed = 7;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    var W = 1200, H = 240, x = -10, blocks = "", wins = "";
    while (x < W + 10) {
      var w = 26 + rnd() * 50;
      var h = H * (0.3 + rnd() * 0.62);
      blocks += '<rect x="' + x.toFixed(1) + '" y="' + (H - h).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '"/>';
      for (var wy = H - h + 10; wy < H - 8; wy += 12) {
        for (var wx = x + 6; wx < x + w - 8; wx += 10) if (rnd() < 0.45) wins += '<rect x="' + wx.toFixed(1) + '" y="' + wy.toFixed(1) + '" width="4" height="6"/>';
      }
      x += w + 2 + rnd() * 6;
    }
    var svg = function (fill, body) {
      return 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMax slice"><g fill="' + fill + '">' + body + "</g></svg>") + '")';
    };
    return { city: svg("#0e2240", blocks), lights: svg("#f0bd4f", wins) };
  }

  function layer(className) {
    var el = document.createElement("i");
    el.className = className;
    return el;
  }

  function paint() {
    ticking = false;
    if (!on || !sky) return;
    var p = progress();
    // Each colour layer fades in over the one before it.
    for (var i = 1; i < KEYS.length; i++) {
      var k = (p - KEYS[i - 1]) / (KEYS[i] - KEYS[i - 1]);
      layers[i].style.opacity = String(Math.min(1, Math.max(0, k)).toFixed(3));
    }
    var night = Math.min(1, Math.max(0, (p - 0.7) / 0.2));
    stars.style.opacity = night.toFixed(3);
    moon.style.opacity = Math.min(1, Math.max(0, (p - 0.78) / 0.12)).toFixed(3);
    city.style.opacity = (0.28 + 0.72 * Math.min(1, p / 0.75)).toFixed(3);
    lights.style.opacity = Math.min(1, Math.max(0, (p - 0.6) / 0.3)).toFixed(3);
    // The sun climbs from one side, crosses the sky and sets by the end of the day.
    var W = window.innerWidth, H = window.innerHeight;
    var angle = Math.PI * (1 - Math.min(1, p / 0.8));
    var x = W / 2 + Math.cos(angle) * W * 0.42 - 110;
    var y = H * 0.72 - Math.sin(angle) * H * 0.55 - 110;
    sun.style.transform = "translate3d(" + x.toFixed(0) + "px," + y.toFixed(0) + "px,0)";
    sun.style.opacity = (1 - Math.min(1, Math.max(0, (p - 0.72) / 0.1))).toFixed(3);
  }

  function request() {
    if (ticking || !on) return;
    ticking = true;
    window.requestAnimationFrame(paint);
  }

  function build() {
    if (!document.getElementById("tsky-style")) {
      var style = document.createElement("style");
      style.id = "tsky-style";
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    sky = document.getElementById("tsky") || document.createElement("div");
    sky.id = "tsky";
    sky.setAttribute("aria-hidden", "true");
    sky.innerHTML = "";
    layers = [];
    for (var i = 0; i < KEYS.length; i++) {
      layers.push(layer("k" + i));
      sky.appendChild(layers[i]);
    }
    stars = layer("stars");
    sun = layer("sun");
    moon = layer("moon");
    city = layer("city");
    lights = layer("lights");
    var art = skyline();
    city.style.backgroundImage = art.city;
    lights.style.backgroundImage = art.lights;
    [stars, sun, moon, city, lights].forEach(function (el) { sky.appendChild(el); });
    if (!sky.parentNode) document.body.insertBefore(sky, document.body.firstChild);
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
  }

  // Show or hide the sky to match <html data-sky>.
  function sync() {
    var want = root.getAttribute("data-sky") === "on";
    if (want && !sky) build();
    on = want;
    if (sky) sky.hidden = !want;
    root.classList.toggle("has-sky", want);
    window.__tycoonsSkyProgress = want ? progress : undefined;
    if (want) paint();
  }

  function start() {
    sync();
    try {
      new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ["data-sky"] });
    } catch (error) {
      // Very old browsers: the sky simply follows the first page.
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
