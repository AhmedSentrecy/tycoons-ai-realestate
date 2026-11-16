// Landing page for Mountain View iCity October (ad traffic). Plain script, no build step.
// - Photos come from Supabase Storage, resized by Netlify Image CDN on the live site.
// - The "walk-through" moves photos toward the viewer with CSS 3D transforms as the page scrolls.
// - Homes are a snapshot from 16 Nov 2026 and are refreshed from the live inventory when it loads.
(function () {
  "use strict";

  var STORAGE = "https://coqnjymekrkoausiiytm.supabase.co/storage/v1/object/public/property-images/";
  var PHOTOS = [
    "mountain-view/mountain-view-icity-october/mountain-view-icity-october-07.jpg",
    "mountain-view/mountain-view-icity-october/mountain-view-icity-october-08.jpg",
    "wessam-media/mountain-view/mountain-view-icity-october/imgdownloader-08ddee3b.webp",
    "wessam-media/mountain-view/mountain-view-icity-october/imgdownloader-4c29e8a7.webp",
    "wessam-media/mountain-view/mountain-view-icity-october/imgdownloader-55e61961.webp",
    "wessam-media/mountain-view/mountain-view-icity-october/imgdownloader-96b6f8df.webp",
    "wessam-media/mountain-view/mountain-view-icity-october/imgdownloader-b146e224.webp",
    "wessam-media/mountain-view/mountain-view-icity-october/imgdownloader-c759cc32.webp",
    "wessam-media/mountain-view/mountain-view-icity-october/imgdownloader-dd53e116.webp",
    "wessam-media/mountain-view/mountain-view-icity-october/imgdownloader-e79bca80.webp"
  ];
  // One fact per stop of the walk-through (facts about the project, not descriptions of the photo).
  var STOPS = [
    ["في 6 أكتوبر", "ماونتن فيو آي سيتي أكتوبر"],
    ["شقق من 110 لـ 165 م²", "غرفتين و3 غرف"],
    ["سكاي لوفت لحد 315 م²", "3 و4 و5 غرف"],
    ["فيلات وبيوت من 175 م²", "آي فيلا، بارك فيلا، بيتش هاوس"],
    ["وحدات استلام فوري", "ومنها استلام خلال سنتين ونص لـ 4 سنين"],
    ["مقدم 2% للحجز", "و2% بعد 3 شهور و2% بعد 6 شهور"],
    ["تقسيط لحد 14 سنة", "قسط شهري ودفعات سنوية"],
    ["اطلب جدول السداد", "هيوصلك على واتساب"]
  ];
  // Which photo each stop shows (the hero uses photo 0). The low-resolution banner and a
  // duplicate are left out.
  var WALK_PHOTOS = [1, 4, 2, 6, 7, 9, 8, 5];
  var PROJECT_ID = "f01d0f14-3106-4cd1-994f-f1d68c936f5f";
  var SUPABASE_URL = "https://coqnjymekrkoausiiytm.supabase.co";
  var PUBLIC_KEY = "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";
  var WHATSAPP = "201110100025";
  // Snapshot of the available homes: [type, bedrooms, area m², price EGP, delivery].
  var HOMES = [
    ["I-Apartment", 2, 115, 8507289, "4 years"],
    ["Garden Apartment", 2, 110, 10192100, "4 years"],
    ["Garden Apartment", 3, 130, 11505818, "4 years"],
    ["Millennial", 2, 115, 11819038, "2.5 years"],
    ["I-Apartment", 3, 150, 11956426, "4 years"],
    ["Millennial", 3, 165, 14933024, "Ready to Move"],
    ["Sky Loft", 4, 260, 15637381, "4 years"],
    ["I-Villa 3", 3, 190, 16350159, "2.5 years"],
    ["Park Side House", 3, 180, 17217211, "2.5 years"],
    ["I-Villa 2", 0, 225, 18213884, "3 years"],
    ["Park Villa", 2, 175, 18381353, "2.5 years"],
    ["Garden Millennial", 3, 165, 18486064, "2.5 years"],
    ["Sky Loft", 3, 260, 19506887, "2.5 years"],
    ["Sky Loft", 5, 315, 21666775, "2.5 years"],
    ["Park Villa", 3, 275, 22865210, "Ready to Move"],
    ["Beach House", 3, 210, 25152857, "3 years"],
    ["I-Villa", 3, 230, 26504466, "Ready to Move"],
    ["Lake House", 0, 385, 63159269, "Ready to Move"]
  ];

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var onNetlify = /(^|\.)tycoons-inv\.com$|\.netlify\.app$/.test(location.hostname);
  function $(id) { return document.getElementById(id); }
  function money(value) { return Math.round(value).toLocaleString("en-US"); }
  function photo(index, width) {
    var url = STORAGE + PHOTOS[index % PHOTOS.length];
    return onNetlify ? "/.netlify/images?url=" + encodeURIComponent(url) + "&w=" + width + "&q=70" : url;
  }
  function waLink(text) { return "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(text); }

  // ---- Photos -------------------------------------------------------------------------------
  var heroImg = document.querySelector("[data-photo]");
  if (heroImg) heroImg.src = photo(0, window.innerWidth < 700 ? 900 : 1600);

  var world = $("world");
  var shots = [];
  STOPS.forEach(function (stop, index) {
    var figure = document.createElement("figure");
    figure.className = "shot";
    var img = document.createElement("img");
    img.alt = "صورة من ماونتن فيو آي سيتي أكتوبر (" + (index + 1) + ")";
    img.width = 960; img.height = 630; img.decoding = "async";
    if (index > 1) img.loading = "lazy";
    img.src = photo(WALK_PHOTOS[index], window.innerWidth < 700 ? 700 : 1200);
    var caption = document.createElement("figcaption");
    caption.textContent = stop[0];
    var small = document.createElement("small");
    small.textContent = stop[1];
    caption.appendChild(small);
    figure.appendChild(img); figure.appendChild(caption);
    world.appendChild(figure);
    shots.push(figure);
  });

  // ---- Scroll-driven 3D ---------------------------------------------------------------------
  var walk = $("walk"), bar = $("walkBar"), captionEl = $("walkCaption");
  var heroPhoto = document.querySelector(".hero-photo"), heroBody = document.querySelector(".hero-body");
  var GAP = 1000;          // distance between two photos along the depth axis, in px
  var lastCaption = -1, ticking = false, placed = false;

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

  function frame() {
    ticking = false;
    var vh = window.innerHeight, y = window.scrollY;

    // Hero: the photo drifts slower than the text and grows a little (depth).
    if (y < vh * 1.2) {
      var hp = y / vh;
      heroPhoto.style.transform = "translate3d(0," + (y * 0.28).toFixed(1) + "px,0) scale(" + (1 + hp * 0.1).toFixed(3) + ")";
      heroBody.style.transform = "translate3d(0," + (-y * 0.1).toFixed(1) + "px,0)";
      heroBody.style.opacity = clamp(1 - hp * 1.25, 0, 1).toFixed(3);
    }

    // Walk-through: progress 0 → 1 while the tall section scrolls past its sticky stage.
    var rect = walk.getBoundingClientRect();
    var total = rect.height - vh;
    if (total <= 0) return;
    // Off screen: nothing to move (after the first pass, which puts every photo in place).
    if (placed && (rect.top > vh || rect.bottom < 0)) return;
    placed = true;
    var progress = clamp(-rect.top / total, 0, 1);
    // The last photo stops at the focus plane and stays there for the end of the section.
    var travel = clamp(progress * 1.08, 0, 1) * (shots.length - 1) * GAP;
    var side = Math.min(window.innerWidth * 0.2, 230);
    var nearest = 0, nearestDistance = Infinity;
    for (var i = 0; i < shots.length; i += 1) {
      var z = travel - i * GAP;                       // 0 = at the focus plane, >0 = passing the viewer
      var direction = i % 2 === 0 ? 1 : -1;
      var approach = clamp(-z / GAP, 0, 3);           // 0 at focus, grows with distance behind it
      var x = direction * side * clamp(approach, 0, 1);
      var rotate = -direction * 14 * clamp(approach, 0, 1);
      // In front of the focus plane a photo fades out fast; behind it, only the next one shows faintly.
      var opacity = z > 0 ? clamp(1 - z / 240, 0, 1) : clamp(1 - (approach - 0.12) / 1.05, 0, 1);
      var shot = shots[i];
      if (Math.abs(z) < nearestDistance) { nearestDistance = Math.abs(z); nearest = i; }
      if (opacity <= 0.01) { shot.style.opacity = "0"; shot.style.visibility = "hidden"; continue; }
      shot.style.visibility = "visible";
      shot.style.opacity = opacity.toFixed(3);
      shot.style.zIndex = String(1000 - Math.round(Math.abs(z)));
      shot.style.transform = "translate3d(" + x.toFixed(1) + "px,0," + z.toFixed(1) + "px) rotateY(" + rotate.toFixed(2) + "deg)";
    }
    bar.style.transform = "scaleX(" + progress.toFixed(4) + ")";
    if (nearest !== lastCaption) {
      lastCaption = nearest;
      captionEl.textContent = (nearest + 1) + " من " + shots.length + " · " + STOPS[nearest][0];
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  if (!reduceMotion) {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    frame();
  }

  // Offer cards tilt up into place when they come into view.
  var plans = document.querySelectorAll(".plan");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) { entry.target.classList.add("in"); seen.unobserve(entry.target); } });
    }, { threshold: 0.25 });
    plans.forEach(function (plan) { seen.observe(plan); });
  } else {
    plans.forEach(function (plan) { plan.classList.add("in"); });
  }

  // ---- Homes --------------------------------------------------------------------------------
  function kind(type) { return /apartment|millennial|loft/i.test(type) ? "apt" : "villa"; }
  function isReady(delivery) { return /ready/i.test(delivery || ""); }
  function deliveryAr(delivery) {
    if (isReady(delivery)) return "استلام فوري";
    var years = parseFloat(delivery);
    if (!years) return "";
    if (years === 2.5) return "استلام خلال سنتين ونص";
    if (years === 2) return "استلام خلال سنتين";
    return "استلام خلال " + years + " سنين";
  }
  function roomsAr(rooms) { return rooms === 2 ? "غرفتين" : rooms ? rooms + " غرف" : ""; }
  function label(home) { return home[0] + (home[1] ? "، " + roomsAr(home[1]) : "") + "، " + home[2] + " م²"; }

  var list = $("homeList"), select = $("pickHome"), filter = "all";

  function renderHomes() {
    list.textContent = "";
    HOMES.forEach(function (home) {
      var show = filter === "all" || (filter === "ready" ? isReady(home[4]) : kind(home[0]) === filter);
      if (!show) return;
      var card = document.createElement("article");
      card.className = "home";
      var delivery = deliveryAr(home[4]);
      card.innerHTML =
        (delivery ? '<span class="badge' + (isReady(home[4]) ? "" : " later") + '">' + delivery + "</span>" : "") +
        "<h3></h3>" +
        '<p class="meta"></p>' +
        '<p class="price"><span class="num"></span> <small>جنيه</small></p>' +
        '<p class="first"><span>أول دفعة (2%)</span><b><span class="num"></span> جنيه</b></p>' +
        '<a data-wa-source="lp-icity-october-home" rel="noopener">اطلب جدول السداد ←</a>';
      card.querySelector("h3").textContent = home[0];
      card.querySelector(".meta").textContent = [roomsAr(home[1]), home[2] + " م²"].filter(Boolean).join(" · ");
      card.querySelector(".price .num").textContent = money(home[3]);
      card.querySelector(".first .num").textContent = money(home[3] * 0.02);
      card.querySelector("a").href = waLink("أهلاً Tycoons، عايز جدول السداد لوحدة " + label(home) + " في ماونتن فيو آي سيتي أكتوبر (سعر " + money(home[3]) + " جنيه)");
      list.appendChild(card);
    });
  }

  function renderSelect() {
    var keep = select.value;
    select.textContent = "";
    HOMES.forEach(function (home, index) {
      var option = document.createElement("option");
      option.value = String(index);
      option.textContent = label(home) + " · " + money(home[3]) + " جنيه";
      select.appendChild(option);
    });
    if (keep && HOMES[Number(keep)]) select.value = keep;
    renderExample();
  }

  function renderExample() {
    var home = HOMES[Number(select.value) || 0];
    if (!home) return;
    var part = home[3] * 0.02;
    $("exPrice").textContent = money(home[3]);
    $("exFirst").textContent = money(part);
    $("exSecond").textContent = money(part);
    $("exThird").textContent = money(part);
    $("exTotal").textContent = money(home[3] * 0.06);
    $("exampleCta").href = waLink("أهلاً Tycoons، عايز جدول السداد لوحدة " + label(home) + " في ماونتن فيو آي سيتي أكتوبر (سعر " + money(home[3]) + " جنيه)");
  }

  function renderSummary() {
    var min = HOMES.reduce(function (low, home) { return Math.min(low, home[3]); }, Infinity);
    $("homeCount").textContent = String(HOMES.length);
    $("fromPrice").textContent = (Math.floor(min / 100000) / 10).toFixed(1);
  }

  document.querySelectorAll(".filters button").forEach(function (button) {
    button.addEventListener("click", function () {
      filter = button.getAttribute("data-f");
      document.querySelectorAll(".filters button").forEach(function (other) { other.setAttribute("aria-pressed", other === button ? "true" : "false"); });
      renderHomes();
    });
  });
  select.addEventListener("change", renderExample);
  renderHomes(); renderSelect(); renderSummary();

  // Live prices: replace the snapshot when the inventory answers. Any failure keeps the snapshot.
  try {
    var query = "select=unit_type,bedrooms_text,area_sqm,starting_price,delivery_text,last_updated_at" +
      "&project_id=eq." + PROJECT_ID + "&availability_status=eq.available&starting_price=gt.0&order=starting_price.asc";
    fetch(SUPABASE_URL + "/rest/v1/units?" + query, { headers: { apikey: PUBLIC_KEY, Accept: "application/json" } })
      .then(function (response) { return response.ok ? response.json() : []; })
      .then(function (rows) {
        if (!Array.isArray(rows) || rows.length < 3) return;
        var latest = "";
        HOMES = rows.map(function (row) {
          if (row.last_updated_at && row.last_updated_at > latest) latest = row.last_updated_at;
          return [
            String(row.unit_type || "").replace(/^iCity October\s*-\s*/i, ""),
            parseInt(row.bedrooms_text, 10) || 0,
            Number(row.area_sqm) || 0,
            Number(row.starting_price) || 0,
            row.delivery_text || ""
          ];
        });
        renderHomes(); renderSelect(); renderSummary();
        if (latest) {
          var date = new Date(latest);
          $("updated").textContent = "آخر تحديث للأسعار: " + date.toLocaleDateString("ar-EG-u-nu-latn", { day: "numeric", month: "long", year: "numeric" }) + ".";
        }
      })
      .catch(function () {});
  } catch (error) { /* keep the snapshot */ }
})();
