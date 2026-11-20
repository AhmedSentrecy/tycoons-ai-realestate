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
// Pages that carry it say so with <html data-sky="on">; public/site-sky.js draws the sky (and its
// own styles) only there.
const SKY_CSS = `
html{background:#0b1b30}
body{background:linear-gradient(180deg,#ffcf9e 0,#ffe2c4 30vh,#cfe6fb 100vh) fixed #cfe6fb;min-height:100vh}
main,.dmain{position:relative;background:rgba(255,255,255,.95);border-radius:26px;box-shadow:0 30px 70px -40px rgba(6,15,28,.6)}
main{margin-top:14px;margin-bottom:22vh;padding-inline:clamp(14px,3vw,34px)}
.dmain{margin-top:14px;margin-bottom:22vh;padding-inline:clamp(14px,3vw,34px)}
.dhero{border-radius:0 0 26px 26px}
footer{position:relative}
@media(max-width:800px){main,.dmain{width:calc(100% - 20px);border-radius:20px;padding-inline:14px}}
@media print{body{background:#fff}main,.dmain{box-shadow:none;margin-bottom:0}}
`;

module.exports = { retheme, recolor, SKY_CSS, PALETTE };
