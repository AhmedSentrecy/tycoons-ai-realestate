"use strict";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function inlineMarkdown(value) {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/\[([^\]]{1,160})\]\((\/(?:projects|guides|units)\/[a-z0-9-]+\/?)\)/g, (_, label, href) => `<a href="${href}">${label}</a>`)
    .replace(/\*\*([^*]{1,200})\*\*/g, "<strong>$1</strong>");
}

function renderSafeMarkdown(markdown) {
  const lines = String(markdown || "").replace(/\r/g, "").split("\n");
  const out = [];
  let list = [];
  const flushList = () => {
    if (list.length) out.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushList(); continue; }
    const bullet = line.match(/^[-*]\s+(.+)/);
    if (bullet) { list.push(bullet[1]); continue; }
    flushList();
    const heading = line.match(/^(#{2,3})\s+(.+)/);
    if (heading) out.push(`<${heading[1].length === 2 ? "h2" : "h3"}>${inlineMarkdown(heading[2])}</${heading[1].length === 2 ? "h2" : "h3"}>`);
    else out.push(`<p>${inlineMarkdown(line)}</p>`);
  }
  flushList();
  return out.join("\n");
}

module.exports = { escapeHtml, renderSafeMarkdown };
