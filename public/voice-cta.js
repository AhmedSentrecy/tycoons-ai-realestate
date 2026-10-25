// Sitewide "search by voice" button. Plain script (no build step) loaded on every page.
// - Shows a fixed button at the bottom of the screen on every public page except the
//   homepage itself (which is already the voice search) and admin/internal pages.
// - Any element with [data-voice-start] (e.g. the voice box on /ar/) behaves the same way.
// - Click: if the page has the AI search bar, it starts the voice agent right here
//   (SmartSearchBar listens for the cancelable "tycoons:start-voice" event and claims it).
//   Otherwise it opens the homepage with ?voice=1, which starts the voice agent there.
(function () {
  "use strict";
  if (window.__tycoonsVoiceCta) return;
  window.__tycoonsVoiceCta = true;

  var HIDDEN = /^\/(?:en\/?)?$|^\/(?:admin|sales|war-room|sales-war-room|media-admin|search)(?:[\/.?#]|$)/i;
  var TEXT = {
    ar: "عقارك بصوتك: اسأل، اسمع، قارن",
    en: "Your property by voice: ask, listen, compare",
  };

  function lang() {
    var value = (document.documentElement.getAttribute("lang") || "").toLowerCase();
    if (value.indexOf("en") === 0) return "en";
    return /^\/en(\/|$)/.test(location.pathname) ? "en" : "ar";
  }

  // Ask an AI search bar on this page to start the voice agent. True when one took it.
  function startHere() {
    var event;
    try {
      event = new CustomEvent("tycoons:start-voice", { cancelable: true });
    } catch (error) {
      return false;
    }
    window.dispatchEvent(event);
    return event.defaultPrevented;
  }

  function scrollToSearch() {
    var target = document.querySelector("[data-tycoons-search]") || document.querySelector('form[role="search"]');
    if (target && target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function go() {
    if (startHere()) {
      scrollToSearch();
      return;
    }
    location.href = (lang() === "en" ? "/en/" : "/") + "?voice=1";
  }

  // Homepage opened with ?voice=1: start the agent once the search bar has mounted.
  function autoStart() {
    var params;
    try {
      params = new URLSearchParams(location.search);
    } catch (error) {
      return;
    }
    if (params.get("voice") !== "1") return;
    params.delete("voice");
    var clean = location.pathname + (params.toString() ? "?" + params.toString() : "") + location.hash;
    try {
      history.replaceState(history.state, "", clean);
    } catch (error) {
      // Keep going even if the URL can't be cleaned.
    }
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (startHere() || tries > 40) {
        clearInterval(timer);
        scrollToSearch();
      }
    }, 250);
  }

  function style() {
    var css =
      ".tvc{position:fixed;z-index:60;bottom:max(14px,env(safe-area-inset-bottom));inset-inline:12px;margin:auto;" +
      "display:flex;align-items:center;justify-content:center;gap:10px;width:max-content;max-width:calc(100% - 24px);" +
      "padding:9px 18px 9px 10px;border:2px solid #c49b5f;border-radius:999px;background:#14352a;color:#fff;" +
      "font:700 14px/1.4 Alexandria,Arial,'Noto Sans Arabic',sans-serif;cursor:pointer;" +
      "box-shadow:0 14px 34px -12px rgba(10,25,20,.55);transition:transform .15s ease}" +
      "[dir=rtl] .tvc,.tvc[dir=rtl]{padding:9px 10px 9px 18px}" +
      ".tvc:hover{transform:translateY(-2px)}.tvc:focus-visible{outline:3px solid #c49b5f;outline-offset:3px}" +
      ".tvc i{display:grid;place-items:center;flex:none;width:32px;height:32px;border-radius:50%;background:#c49b5f}" +
      ".tvc svg{width:18px;height:18px}.tvc span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".tvc[hidden]{display:none}html.has-tvc body{padding-bottom:78px}" +
      "@media(max-width:380px){.tvc{font-size:12.5px;gap:8px}}" +
      "@media print{.tvc{display:none}}";
    var node = document.createElement("style");
    node.id = "tvc-style";
    node.textContent = css;
    document.head.appendChild(node);
  }

  var MIC =
    '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>';

  var button;

  function render() {
    if (!button) return;
    var l = lang();
    button.setAttribute("dir", l === "en" ? "ltr" : "rtl");
    button.setAttribute("lang", l);
    button.innerHTML = "<i>" + MIC + "</i><span>" + TEXT[l] + "</span>";
    button.hidden = HIDDEN.test(location.pathname);
    document.documentElement.classList.toggle("has-tvc", !button.hidden);
  }

  function mount() {
    if (document.getElementById("tvc")) return;
    style();
    button = document.createElement("button");
    button.type = "button";
    button.id = "tvc";
    button.className = "tvc";
    button.setAttribute("data-voice-start", "");
    document.body.appendChild(button);
    render();

    // Keep the button right when the React app changes pages without a reload.
    ["pushState", "replaceState"].forEach(function (name) {
      var original = history[name];
      if (typeof original !== "function") return;
      history[name] = function () {
        var result = original.apply(this, arguments);
        setTimeout(render, 0);
        return result;
      };
    });
    window.addEventListener("popstate", render);
  }

  document.addEventListener("click", function (event) {
    var target = event.target && event.target.closest ? event.target.closest("[data-voice-start]") : null;
    if (!target) return;
    event.preventDefault();
    go();
  });

  function init() {
    mount();
    autoStart();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
