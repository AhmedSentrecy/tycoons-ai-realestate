import assert from "node:assert/strict";
import { AdminApiError, GENERATION_POLL, adminApi, errorMessage } from "../src/lib/adminApi.ts";

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

async function expectTimeoutPolling() {
  GENERATION_POLL.delayMs = 1;
  const draft = { title: "عنوان", slug: "slug-ok", excerpt: "", body_markdown: "نص", meta_title: "", meta_description: "", source_refs: [], generated_as: "draft" };
  const keys: string[] = [];
  const replies = [
    new Response("<html>gateway timeout</html>", { status: 504 }),
    new Response(JSON.stringify({ error: "generation_in_progress", retry_after_seconds: 0 }), { status: 409, headers: { "content-type": "application/json" } }),
    new Response(JSON.stringify(draft), { status: 200, headers: { "content-type": "application/json" } }),
  ];
  globalThis.fetch = async (_url, init) => {
    keys.push(String((init?.headers as Record<string, string>)["x-idempotency-key"]));
    return replies.shift()!;
  };
  const result = await adminApi.articleDraft("test-token", "draft:client-timeout-poll-1234", { language: "ar", target_type: "project", project_id: "project-1", area_name: null }, "موضوع");
  assert.equal(result.title, "عنوان", "a gateway timeout is followed by polling the same request");
  assert.deepEqual(keys, Array(3).fill("draft:client-timeout-poll-1234"), "polling reuses one idempotency key, so nothing is generated twice");

  GENERATION_POLL.maxWaitMs = 0;
  globalThis.fetch = async () => new Response("timeout", { status: 504 });
  try {
    await adminApi.articleDraft("test-token", "draft:client-timeout-gives-up", { language: "ar", target_type: "project", project_id: "project-1", area_name: null }, "موضوع");
    assert.fail("polling must stop after the wait budget");
  } catch (error) {
    assert.ok(error instanceof AdminApiError);
    assert.equal(error.code, "http_504");
    assert.match(errorMessage(error), /اضغط نفس الزرار تاني/);
  }
  GENERATION_POLL.maxWaitMs = 150000;
  GENERATION_POLL.delayMs = 5000;
}

try {
  await expectTimeoutPolling();
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
