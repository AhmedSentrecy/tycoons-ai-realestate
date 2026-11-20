"use strict";

// Site theme for every server-rendered and build-time page (project, unit, area, developer,
// guide, report, about…), so they match the homepage: navy ink, porcelain, saffron gold and a
// coral accent, over one day-to-night sky.
//
// - retheme(html) swaps the old green/cream palette for the new one in the page's styles and
//   inline styles (never inside <script>, so JSON-LD and data stay untouched). One table below,
//   so every page module (_seo-utils, _project-showcase, _apartments-guide…) changes together.
// - SKY_CSS puts the page content on a light panel over the sky. public/site-sky.js draws the
//   sky with a few fixed layers that only change opacity while scrolling (no canvas), so it
//   costs the phone almost nothing. Without JavaScript the page shows a still morning sky.

const PALETTE = [
  // dark greens → navy
  ["#14352a", "#0b1b30"], ["#0d1f18", "#060f1c"], ["#10261d", "#08162a"], ["#132c22", "#0a1a2e"], ["#17382d", "#0e2240"],
  ["#1a3b30", "#10264a"], ["#24473a", "#18305a"], ["#0b1a14", "#050c18"], ["#1b2420", "#0f1724"], ["#182420", "#0f1724"],
  ["#26332d", "#1e2a3b"],
  // gold and brown → saffron
  ["#c49b5f", "#d99a2b"], ["#d9b87c", "#f0bd4f"], ["#a3854e", "#b47c17"], ["#8a6630", "#9a640f"], ["#8a7a58", "#8a93a3"],
  ["#5c4f33", "#4a5568"], ["#ecd9ae", "#ffe3a3"],
  // cream → porcelain
  ["#fffaf1", "#f7f9fc"], ["#f7f2ea", "#f4f6fa"], ["#fbf7f0", "#f7f9fc"], ["#f6f1e7", "#f2f5fa"], ["#f3efe6", "#f2f5fa"],
  ["#f1ece1", "#eef2f7"], ["#efe7d8", "#ecf0f6"], ["#eee5d6", "#ecf0f6"], ["#ece3d0", "#e9eef5"], ["#e9e1d0", "#e6ebf2"],
  ["#e8dcc2", "#e3e9f2"], ["#e7ddc8", "#e3e9f2"], ["#e0d3bb", "#dde4ee"], ["#d8ccb4", "#d3dce8"], ["#d8c9a8", "#c9d3e1"],
  // green greys → blue greys
  ["#5c6a62", "#556070"], ["#3d4a43", "#334155"], ["#667168", "#5b6678"], ["#7a857f", "#7b8594"], ["#9fb3a8", "#a9bbd2"],
  ["#b9c7bf", "#c3cfdf"], ["#cfd8d2", "#d3dce8"], ["#dfe6e1", "#e3e9f2"], ["#eef3ef", "#eef2f7"],
];
const RGB = [
  ["20,53,42", "11,27,48"], ["20,30,25", "6,15,28"], ["10,25,20", "6,15,28"], ["13,31,24", "6,15,28"], ["11,26,20", "6,15,28"],
  ["217,184,124", "240,189,79"],
];

const HEX = new Map(PALETTE);
const HEX_RE = new RegExp(`(${PALETTE.map(([from]) => from).join("|")})(?![0-9a-f])`, "gi");
const RGB_RE = new RegExp(`rgba?\\(\\s*(${RGB.map(([from]) => from.replace(/,/g, "\\s*,\\s*")).join("|")})`, "gi");
const RGB_MAP = new Map(RGB);

function recolor(text) {
  return String(text)
    .replace(HEX_RE, (match) => HEX.get(match.toLowerCase()) || match)
    .replace(RGB_RE, (match, triple) => match.replace(triple, RGB_MAP.get(triple.replace(/\s+/g, "")) || triple));
}

/** New palette for a whole page, leaving <script> contents (JSON-LD, data) exactly as they are. */
function retheme(html) {
  return String(html)
    .split(/(<script\b[\s\S]*?<\/script>)/i)
    .map((part, index) => (index % 2 ? part : recolor(part)))
    .join("");
}

// The page content sits on a light panel over the sky; the header and footer stay solid.
// Pages that carry it say so with <html data-sky="on">; public/site-sky.js only draws there.
const SKY_CSS = `
html{background:#0b1b30}
body{background:linear-gradient(180deg,#ffcf9e 0,#ffe2c4 30vh,#cfe6fb 100vh) fixed #cfe6fb;min-height:100vh}
html.has-sky body{background:transparent}
#tsky{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;contain:strict}
#tsky>i{position:absolute;inset:0;opacity:0;will-change:opacity}
#tsky>.k0{background:linear-gradient(180deg,#ffcf9e,#ffeedd);opacity:1}
#tsky>.k1{background:linear-gradient(180deg,#8cc6f7,#e4f2ff)}
#tsky>.k2{background:linear-gradient(180deg,#5aa6e6,#d3eaff)}
#tsky>.k3{background:linear-gradient(180deg,#ff8a5c,#7a4a86)}
#tsky>.k4{background:linear-gradient(180deg,#2c2f6c,#1a2550)}
#tsky>.k5{background:linear-gradient(180deg,#060f1c,#0b1b30)}
#tsky>.stars{bottom:30%;background-image:radial-gradient(1.4px 1.4px at 12% 18%,#fff 98%,transparent),radial-gradient(1.2px 1.2px at 32% 42%,#fff 98%,transparent),radial-gradient(1.6px 1.6px at 54% 12%,#fff 98%,transparent),radial-gradient(1.2px 1.2px at 71% 33%,#fff 98%,transparent),radial-gradient(1.4px 1.4px at 88% 9%,#fff 98%,transparent),radial-gradient(1px 1px at 22% 66%,#fff 98%,transparent),radial-gradient(1.3px 1.3px at 63% 58%,#fff 98%,transparent),radial-gradient(1px 1px at 93% 52%,#fff 98%,transparent);background-size:260px 220px}
#tsky>.sun{inset:auto;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(255,244,210,1) 0,rgba(255,190,90,.5) 24%,rgba(255,190,90,0) 70%);opacity:1;transform:translate3d(0,0,0);will-change:transform,opacity}
#tsky>.moon{inset:auto;top:12vh;inset-inline-end:14vw;width:110px;height:110px;border-radius:50%;background:radial-gradient(circle,rgba(245,245,255,.95) 0,rgba(220,225,255,.3) 26%,rgba(220,225,255,0) 70%)}
#tsky>.city,#tsky>.lights{top:auto;height:24vh;background-repeat:repeat-x;background-position:bottom;background-size:auto 100%}
#tsky>.city{opacity:1}
main,.dmain{position:relative;background:rgba(255,255,255,.95);border-radius:26px;box-shadow:0 30px 70px -40px rgba(6,15,28,.6)}
main{margin-top:14px;margin-bottom:22vh;padding-inline:clamp(14px,3vw,34px)}
.dmain{margin-top:14px;margin-bottom:22vh;padding-inline:clamp(14px,3vw,34px)}
.dhero{border-radius:0 0 26px 26px}
footer{position:relative}
@media(max-width:800px){main,.dmain{width:calc(100% - 20px);border-radius:20px;padding-inline:14px}}
@media (prefers-reduced-motion:reduce){#tsky>i{transition:none}}
@media print{#tsky{display:none}body{background:#fff}main,.dmain{box-shadow:none;margin-bottom:0}}
`;

module.exports = { retheme, recolor, SKY_CSS, PALETTE };
