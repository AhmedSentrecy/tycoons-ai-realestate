// Day-to-night sky behind the server-rendered pages (project, unit, area, developer, guide…).
// Plain script, no canvas: a few fixed layers whose opacity changes as the reader scrolls
// (sunrise at the top of the page, night at the footer). Changing opacity and transform is done
// by the graphics card, so scrolling stays smooth on cheap phones, and nothing runs while the
// page is still. Only on pages that ask for it with <html data-sky="on">; the homepage keeps its
// own animated sky (src/components/home/DaySky.tsx).
(function () {
  "use strict";
  if (window.__tycoonsSiteSky) return;
  window.__tycoonsSiteSky = true;

  var root = document.documentElement;
  if (root.getAttribute("data-sky") !== "on") return;

  // Scroll positions of the sky colours (same as the homepage sky).
  var KEYS = [0, 0.22, 0.48, 0.68, 0.82, 1];
  var layers = [];
  var stars, sun, moon, city, lights;
  var ticking = false;

  function progress() {
    var max = (document.documentElement.scrollHeight || 0) - window.innerHeight;
    var y = window.scrollY || window.pageYOffset || 0;
    return max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
  }
  window.__tycoonsSkyProgress = progress;

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
    // The sun climbs from the start side, crosses the sky and sets by the end of the day.
    var W = window.innerWidth, H = window.innerHeight;
    var angle = Math.PI * (1 - Math.min(1, p / 0.8));
    var x = W / 2 + Math.cos(angle) * W * 0.42 - 110;
    var y = H * 0.72 - Math.sin(angle) * H * 0.55 - 110;
    sun.style.transform = "translate3d(" + x.toFixed(0) + "px," + y.toFixed(0) + "px,0)";
    sun.style.opacity = (1 - Math.min(1, Math.max(0, (p - 0.72) / 0.1))).toFixed(3);
  }

  function request() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(paint);
  }

  function mount() {
    if (document.getElementById("tsky")) return;
    var sky = document.createElement("div");
    sky.id = "tsky";
    sky.setAttribute("aria-hidden", "true");
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
    document.body.insertBefore(sky, document.body.firstChild);
    root.classList.add("has-sky");
    paint();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
