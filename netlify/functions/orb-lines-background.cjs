"use strict";

// POST /.netlify/functions/orb-lines-background  { "path": "/projects/..." }
// Background function (Netlify gives it up to 15 minutes; the caller gets 202 at once).
// Writes the AI lines for one page of the page guide orb. See orb-lines.cjs.

const { runJob } = require("./orb-lines.cjs");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "" };
  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, body: "" }; }
  const result = await runJob(String(body.path || "")).catch((error) => ({ done: false, reason: String(error?.message || error).slice(0, 120) }));
  console.log(`orb-lines-background ${String(body.path || "").slice(0, 120)} ${JSON.stringify(result)}`);
  return { statusCode: 200, body: "" };
};
