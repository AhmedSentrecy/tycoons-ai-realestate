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

async function expectRateLimitWithoutTiming() {
  globalThis.fetch = async () => new Response(JSON.stringify({ error: "generation_provider_rate_limited" }), {
    status: 429,
    headers: { "content-type": "application/json" },
  });
  try {
    await adminApi.articleDraft("test-token", "draft:client-rate-no-delay-1234", {
      language: "ar", target_type: "project", project_id: "project-1", area_name: null,
    }, "اقتراح موضوعات");
    assert.fail("articleDraft should reject a rate-limited response");
  } catch (error) {
    assert.ok(error instanceof AdminApiError);
    assert.equal(error.retryAfterSeconds, null);
    const message = errorMessage(error);
    assert.match(message, /حاول لاحقاً/);
    assert.doesNotMatch(message, /60|ثانية/);
  }
}

async function expectGenerationFailure(reason: string, expectedMessage: RegExp) {
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: "generation_commercial_fact_unverified",
    generation_failure: { reason, fields: ["body_markdown", "PRIVATE_FIELD"], recovery_eligible: false, intent: "other", raw: "PRIVATE_RAW" },
  }), { status: 502, headers: { "content-type": "application/json" } });
  try {
    await adminApi.articleDraft("test-token", `draft:client-${reason}-1234`, {
      language: "ar", target_type: "project", project_id: "project-1", area_name: null,
    }, "دليل المشروع");
    assert.fail("articleDraft should reject an unverified generated draft");
  } catch (error) {
    assert.ok(error instanceof AdminApiError);
    assert.equal(error.generationFailure?.reason, reason);
    assert.deepEqual(error.generationFailure?.fields, ["body_markdown"]);
    const message = errorMessage(error);
    assert.match(message, expectedMessage);
    assert.doesNotMatch(`${message}\n${JSON.stringify(error.generationFailure)}`, /PRIVATE_/);
  }
}

try {
  await expectRateLimit("generation_provider_rate_limited", 45, /45 ثانية/);
  await expectRateLimitWithoutTiming();
  await expectRateLimit("generation_rate_limited", 540, /9 دقائق/);
  await expectGenerationFailure("numeric_prose", /رقماً تجارياً غير موثق.*نص المقال/);
  await expectGenerationFailure("commercial_prose", /وصفاً تجارياً غير موثق.*نص المقال/);
  await expectGenerationFailure("claim_evidence", /حقيقة تجارية غير موجودة/);
  console.log("Article generation client error behavior tests passed.");
} finally {
  globalThis.fetch = originalFetch;
}
