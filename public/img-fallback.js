// Property photos go through Netlify Image CDN (/.netlify/images?url=…) to be resized.
// If that address fails for any reason (CDN setting, the mobile app, a local preview), show
// the original photo instead so a page never ends up with empty image boxes.
(function () {
  var PREFIX = "/.netlify/images";
  function restore(img) {
    if (!img || img.tagName !== "IMG" || img.getAttribute("data-original-restored")) return;
    var src = img.getAttribute("src") || "";
    if (src.indexOf(PREFIX) !== 0) return;
    var match = /[?&]url=([^&]+)/.exec(src);
    if (!match) return;
    img.setAttribute("data-original-restored", "1");
    img.removeAttribute("srcset");
    img.removeAttribute("sizes");
    img.src = decodeURIComponent(match[1]);
  }
  document.addEventListener("error", function (event) { restore(event.target); }, true);
  // Photos that already failed before this script ran.
  var images = document.images;
  for (var i = 0; i < images.length; i += 1) {
    if (images[i].complete && images[i].naturalWidth === 0) restore(images[i]);
  }
})();
