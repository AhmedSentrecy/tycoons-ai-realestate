"use strict";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function inlineMarkdown(value) {
  const escaped = escapeHtml(value);
  return escaped
    // Same-site editorial destinations only; no raw HTML, schemes or encoded paths.
    .replace(/\[([^\]]{1,160})\]\((\/(?:(?:(?:ar|en)\/)?(?:projects|guides|units)|(?:ar|en)\/(?:areas|developers))\/[a-z0-9-]+\/?|\/(?:about|contact|methodology|corrections)\/?)\)/g, (_, label, href) => `<a href="${href}">${label}</a>`)
    .replace(/\*\*([^*]{1,200})\*\*/g, "<strong>$1</strong>");
}

function tableCells(line) {
  let value = String(line).trim();
  if (!value.includes("|")) return null;
  if (value.startsWith("|")) value = value.slice(1);
  const cells = [];
  let cell = "";
  let endedAtSeparator = false;
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] === "\\" && value[i + 1] === "|") {
      cell += "|";
      i += 1;
      endedAtSeparator = false;
    } else if (value[i] === "|") {
      cells.push(cell.trim());
      cell = "";
      endedAtSeparator = true;
    } else {
      cell += value[i];
      endedAtSeparator = false;
    }
  }
  if (!endedAtSeparator) cells.push(cell.trim());
  return cells;
}

function renderSafeMarkdown(markdown) {
  const lines = String(markdown || "").replace(/\r/g, "").split("\n");
  const out = [];
  let list = [];
  const flushList = () => {
    if (list.length) out.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  };
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) { flushList(); continue; }
    const header = tableCells(line);
    const divider = i + 1 < lines.length ? tableCells(lines[i + 1]) : null;
    if (header && header.length >= 2 && divider && divider.length === header.length && divider.every((cell) => /^:?-{3,}:?$/.test(cell))) {
      flushList();
      const rows = [];
      i += 1;
      while (i + 1 < lines.length) {
        const cells = tableCells(lines[i + 1]);
        // Keep malformed rows in the article instead of silently discarding data.
        if (!cells || cells.length !== header.length) break;
        rows.push(cells);
        i += 1;
      }
      out.push(`<div class="table" style="overflow-x:auto" role="region" aria-label="${escapeHtml(header.join(" / "))}" tabindex="0"><table><thead><tr>${header.map((cell) => `<th scope="col">${inlineMarkdown(cell)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
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
