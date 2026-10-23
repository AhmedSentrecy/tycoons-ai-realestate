/*
 * Google Analytics 4 for tycoons-inv.com (Measurement ID G-2DC6V5L3XM).
 *
 * A same-origin file (not an inline <script>) so it runs on every render path, including the
 * server-rendered pages whose Content-Security-Policy blocks inline scripts.
 * Never loads on internal tools (/admin, /sales-war-room, /media-admin).
 */
(function () {
  "use strict";
  if (/^\/(?:admin|sales-war-room|media-admin)(?:\/|$)/i.test(location.pathname)) return;
  if (window.__tycoonsGa4) return;
  window.__tycoonsGa4 = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", "G-2DC6V5L3XM");
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=G-2DC6V5L3XM";
  document.head.appendChild(s);
})();
