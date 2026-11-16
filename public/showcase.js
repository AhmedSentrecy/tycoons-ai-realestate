// Movement for the project "showcase" block (netlify/functions/_project-showcase.cjs):
// the photos move toward the viewer as the page scrolls (CSS 3D, no library), and the
// down-payment calculator follows the selected home. Without this file, or with "reduce
// motion", the block is a plain photo strip with the first home's numbers.
(function () {
  "use strict";
  if (window.TycoonsShowcase) return;
  var GAP = 1000; // distance between two photos along the depth axis, in px
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function money(value) { return Math.round(value).toLocaleString("en-US"); }

  function initWalk(walk) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var shots = Array.prototype.slice.call(walk.querySelectorAll(".tsc-shot"));
    if (reduce || shots.length < 3) return function () {};
    var bar = walk.querySelector("[data-tsc-bar]"), caption = walk.querySelector("[data-tsc-caption]");
    var labels = shots.map(function (shot) { var c = shot.querySelector("figcaption"); return c && c.firstChild ? c.firstChild.textContent : ""; });
    var ticking = false, placed = false, last = -1;
    walk.classList.add("is-live");
    function frame() {
      ticking = false;
      var vh = window.innerHeight, rect = walk.getBoundingClientRect(), total = rect.height - vh;
      if (total <= 0) return;
      if (placed && (rect.top > vh || rect.bottom < 0)) return;
      placed = true;
      var progress = clamp(-rect.top / total, 0, 1);
      var travel = clamp(progress * 1.08, 0, 1) * (shots.length - 1) * GAP;
      var side = Math.min(window.innerWidth * 0.2, 230), nearest = 0, distance = Infinity;
      for (var i = 0; i < shots.length; i += 1) {
        var z = travel - i * GAP, direction = i % 2 === 0 ? 1 : -1;
        var approach = clamp(-z / GAP, 0, 3), near = clamp(approach, 0, 1);
        var opacity = z > 0 ? clamp(1 - z / 240, 0, 1) : clamp(1 - (approach - 0.12) / 1.05, 0, 1);
        var shot = shots[i];
        if (Math.abs(z) < distance) { distance = Math.abs(z); nearest = i; }
        if (opacity <= 0.01) { shot.style.opacity = "0"; shot.style.visibility = "hidden"; continue; }
        shot.style.visibility = "visible";
        shot.style.opacity = opacity.toFixed(3);
        shot.style.zIndex = String(1000 - Math.round(Math.abs(z)));
        shot.style.transform = "translate3d(" + (direction * side * near).toFixed(1) + "px,0," + z.toFixed(1) + "px) rotateY(" + (-direction * 14 * near).toFixed(2) + "deg)";
      }
      if (bar) bar.style.transform = "scaleX(" + progress.toFixed(4) + ")";
      if (caption && nearest !== last) { last = nearest; caption.textContent = (nearest + 1) + " من " + shots.length + " · " + labels[nearest]; }
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    frame();
    return function () {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }

  function initCalc(calc) {
    var select = calc.querySelector("[data-tsc-select]");
    if (!select) return function () {};
    var parts = [];
    try { parts = JSON.parse(calc.getAttribute("data-parts") || "[]"); } catch (error) { parts = []; }
    var total = parts.reduce(function (sum, part) { return sum + Number(part || 0); }, 0);
    function render() {
      var option = select.options[select.selectedIndex];
      var price = Number(select.value) || 0;
      if (!option || !price) return;
      var priceEl = calc.querySelector("[data-tsc-price]"), totalEl = calc.querySelector("[data-tsc-total]"), cta = calc.querySelector("[data-tsc-cta]");
      if (priceEl) priceEl.textContent = money(price);
      parts.forEach(function (part, index) {
        var el = calc.querySelector('[data-tsc-part="' + index + '"]');
        if (el) el.textContent = money(price * Number(part) / 100);
      });
      if (totalEl) totalEl.textContent = money(price * total / 100);
      if (cta) cta.href = "https://wa.me/" + calc.getAttribute("data-whatsapp") + "?text=" + encodeURIComponent("أهلاً Tycoons، عايز جدول السداد لوحدة " + option.getAttribute("data-label") + " في " + calc.getAttribute("data-project") + " (سعر " + money(price) + " جنيه)");
    }
    select.addEventListener("change", render);
    return function () { select.removeEventListener("change", render); };
  }

  // Returns a function that removes the listeners (the browser page calls it when it unmounts).
  function init(root) {
    if (!root || root.getAttribute("data-tsc-ready")) return function () {};
    root.setAttribute("data-tsc-ready", "1");
    var undo = [];
    Array.prototype.forEach.call(root.querySelectorAll("[data-tsc-walk]"), function (walk) { undo.push(initWalk(walk)); });
    Array.prototype.forEach.call(root.querySelectorAll("[data-tsc-calc]"), function (calc) { undo.push(initCalc(calc)); });
    return function () { undo.forEach(function (stop) { stop(); }); root.removeAttribute("data-tsc-ready"); };
  }

  window.TycoonsShowcase = { init: init };
  function auto() { Array.prototype.forEach.call(document.querySelectorAll("[data-showcase]"), function (root) { init(root); }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", auto); else auto();
})();
