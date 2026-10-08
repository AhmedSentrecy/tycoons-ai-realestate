import assert from "node:assert/strict";
import { AdminApiError, adminApi, errorMessage } from "../src/lib/adminApi.ts";

const originalFetch = globalThis.fetch;

async function expectRateLimit(code: string, retryAfterSeconds: number, expectedMessage: RegExp) {
  globalThis.fetch = async () => new Response(JSON.stringify({ error: code, retry_after_seconds: retryAfterSeconds }), {
    status: 429,
    headers: { "content-type": "application/json" },
  });
  try {
    await adminApi.articleDraft("test-token", "draft:client-rate-limit-1234", {
      language: "ar", target_type: "project", project_id: "project-1", area_name: null,
    }, "موضوع اختباري");
    assert.fail("articleDraft should reject a rate-limited response");
  } catch (error) {
    assert.ok(error instanceof AdminApiError);
    assert.equal(error.code, code);
    assert.equal(error.status, 429);
    assert.equal(error.retryAfterSeconds, retryAfterSeconds);
    assert.match(errorMessage(error), expectedMessage);
  }
}

try {
  await expectRateLimit("generation_provider_rate_limited", 45, /45 ثانية/);
  await expectRateLimit("generation_rate_limited", 540, /9 دقائق/);
  console.log("Article generation client retry timing tests passed.");
} finally {
  globalThis.fetch = originalFetch;
}
