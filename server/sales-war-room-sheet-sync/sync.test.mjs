import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const dir = new URL("./", import.meta.url);
const script = readFileSync(new URL("google-apps-script.gs", dir), "utf8");
const scriptContext = vm.createContext({});
vm.runInContext(`${script}\nthis.testApi={warRoomHeaderMap_,warRoomRow_};`, scriptContext);
const { warRoomHeaderMap_, warRoomRow_ } = scriptContext.testApi;

const source = readFileSync(new URL("index.ts", dir), "utf8")
  .replace(/^import .*;\n/gm, "")
  .replace(/^Deno\.serve\([\s\S]*$/m, "");
const backendContext = vm.createContext({
  crypto: webcrypto, TextEncoder, Intl, Date,
  Deno: { env: { get: () => "unused" } }, createClient: () => ({}),
});
vm.runInContext(`${stripTypeScriptTypes(source)}\nthis.testApi={feedbacks,agentSlug,normalizePhone};`, backendContext);
const { feedbacks, agentSlug, normalizePhone } = backendContext.testApi;

test("a SODIC lead without feedback is never sent", () => {
  const headers = ["lead_id", "الاسم", "الموبايل", "راح لمين", "الحالة", "رد الـ CRM", "آخر إيجنت", "آخر فيدباك", "كل الفيدباك"];
  const map = warRoomHeaderMap_(headers);
  const bare = ["lead-1", "محمد", "01112345678", "CRM", "SENT", '{"data":{"id":23895}}', "Ahmed Yehya", "", ""];
  assert.equal(warRoomRow_(bare, map, { kind: "sodic" }), null);
  bare[7] = "تواصلنا وهنتابع بكرة";
  const matched = warRoomRow_(bare, map, { kind: "sodic" });
  assert.equal(matched.crm_id, "23895");
  assert.equal(agentSlug(matched.agent), "ahmed-yehia");
  assert.equal(normalizePhone(matched.phone), "201112345678");
});

test("CRM ownership resolves all four active agents", () => {
  for (const [name, slug] of [
    ["Ahmed Yehya", "ahmed-yehia"], ["Mostafa Amr", "mostafa-amr"],
    ["Nour Mohamed", "nour-mohamed"], ["Ahmed Sentrecy", "ahmed-sentrecy"],
  ]) assert.equal(agentSlug(name), slug);
  assert.equal(agentSlug("someone else"), "");
});

test("Hyde Park uses CRM agent and extracts only written feedback", async () => {
  const headers = ["crm_id", "الاسم", "الموبايل", "الإيجنت", "آخر كومنت", "آخر أكتيفيتي", "كل الكومنتات"];
  const map = warRoomHeaderMap_(headers);
  const row = ["23824", "محمد", "EG 01112345678", "Ahmed Yehya", "هنبعت التفاصيل", "2026-09-26 15:02", "2026-09-26 15:02 Ahmed Yehya: هنبعت التفاصيل"];
  const mapped = warRoomRow_(row, map, { kind: "hyde", tab: "CRM Status" });
  const comments = await feedbacks(mapped, mapped.crm_id, Date.parse("2026-09-26T11:00:00Z"));
  assert.equal(comments.length, 1);
  assert.equal(comments[0].body, "هنبعت التفاصيل");
  assert.equal((await feedbacks(mapped, mapped.crm_id, Date.parse("2026-09-26T14:00:00Z"))).length, 0);
  assert.equal(comments[0].key, (await feedbacks(mapped, mapped.crm_id, 0))[0].key);
});

test("a blank CRM comment and older comment cannot create a lead", async () => {
  const row = {
    all_feedback: "2026-09-25 15:52 — Ahmed Yehya: \n2026-09-25 16:28 — Ahmed Yehya: na wa",
  };
  assert.equal((await feedbacks(row, "23898", Date.parse("2026-09-26T10:00:00Z"))).length, 0);
  assert.deepEqual(Array.from(await feedbacks(row, "23898", 0), x => x.body), ["na wa"]);
});
