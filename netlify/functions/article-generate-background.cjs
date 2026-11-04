"use strict";

// Long article generations (Claude) run here: up to 15 minutes instead of about one.
// article-generate claims the idempotency key and hands over its lock token; this function
// writes the result (or the error) under that key, and the admin's polling picks it up.
// It can only finish a generation that the same admin session already claimed: the admin
// API checks the session token, the key, the payload fingerprint and the lock token.
const crypto = require("node:crypto");
const { finishGeneration } = require("./article-generate.cjs");
const { IDEMPOTENCY_RE } = require("./_article-generation.cjs");

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "" };
  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, body: "" }; }
  const token = String(event.headers?.["x-admin-token"] || event.headers?.["X-Admin-Token"] || "");
  const key = String(body.key || "");
  const lockToken = String(body.lock_token || "");
  const input = body.input && typeof body.input === "object" ? body.input : null;
  if (token.length < 32 || !IDEMPOTENCY_RE.test(key) || !/^[0-9a-f-]{36}$/i.test(lockToken) || !input) return { statusCode: 400, body: "" };
  // The fingerprint is recomputed, so a caller cannot store a result for different input.
  const fingerprint = crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
  if (fingerprint !== String(body.fingerprint || "")) return { statusCode: 400, body: "" };
  await finishGeneration(token, key, fingerprint, lockToken, input);
  return { statusCode: 200, body: "" };
};
