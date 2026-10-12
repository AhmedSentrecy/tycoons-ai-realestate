// Offline: researched buyer FAQ (request, validation) and how it joins the page FAQ.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { buildProjectFaq, researchFaqItems } from "../src/lib/projectFaq.ts";

const require = createRequire(import.meta.url);
const gen = require("../netlify/functions/_article-generation.cjs");
let checks = 0;
const check = (value: unknown, message: string) => { assert.ok(value, message); checks += 1; };
const event = (body: unknown) => ({ body: JSON.stringify(body) });

// request parsing
const input = gen.parseRequest(event({ action: "project_faq", target_type: "project", project_id: "p1" }));
check(input.action === "project_faq" && input.projectId === "p1", "project_faq is accepted without a topic");
assert.throws(() => gen.parseRequest(event({ action: "project_faq", target_type: "area", area_name: "New Cairo" })), /project_required/); checks += 1;

// request: web search, strict schema, no commercial topics
const request = gen.buildProjectFaqRequest([{ name: "Bleu Vert", developer: "SED", location: "New Capital" }]);
check(request.tools?.[0]?.type === "web_search", "uses web search");
check(request.text.format.strict === true && request.text.format.name === "project_faq", "strict JSON schema");
check(/never write questions or answers about them: prices/.test(request.input[0].content), "tells the model to skip inventory topics");
check(/Bleu Vert/.test(request.input[1].content), "names the project");

// validation
const payload = (faq: unknown[]) => ({ status: "completed", output_text: JSON.stringify({ faq, notes: "" }) });
const good = { question: "Bleu Vert فين بالظبط", answer: "يقع Bleu Vert في الحي السكني R7 بالعاصمة الإدارية الجديدة بالقرب من المحور المركزي.", topic: "location", confidence: "official", sources: [{ url: "https://sed.com.eg/projects/bleu-vert", title: "Bleu Vert" }] };
const money = { ...good, question: "سعر Bleu Vert كام؟", answer: "تبدأ الأسعار من 5 مليون جنيه حسب نوع الوحدة والمساحة في المشروع." };
const broker = { ...good, question: "مساحة Bleu Vert قد إيه؟", sources: [{ url: "https://www.nawy.com/compound/bleu-vert", title: "Nawy" }] };
const single = { ...good, question: "مين المعماري بتاع Bleu Vert؟", confidence: "single" };
const oneHost = { ...good, question: "إيه خدمات Bleu Vert؟", confidence: "corroborated" };
const result = gen.parseOpenAiOutput(payload([good, money, broker, single, oneHost]), "project_faq", {});
check(result.faq.length === 1 && result.faq[0].question.endsWith("؟"), "keeps the official answer and adds the question mark");
const reasons = result.excluded.map((item: { reason: string }) => item.reason).sort().join(",");
check(reasons === "broker_source,broker_source,commercial,single_source", "drops price, broker, single-source and one-site 'corroborated' answers");

// page FAQ: research joins the computed questions, with its website named
const units = [
  { unit_type: "Townhouse", area_sqm: 247, starting_price: 25055000, down_payment_text: "5%", installments_text: "10 years", delivery_text: "Ready to move", finishing: "Semi Finished", last_updated_at: "2026-08-20" },
  { unit_type: "Twinhouse", area_sqm: 292, starting_price: 31007000, down_payment_text: "5%", installments_text: "10 years", delivery_text: "Ready to move", finishing: "Semi Finished", last_updated_at: "2026-08-20" },
];
const project = { name: "Bleu Vert", developer: "Saudi Egyptian Developers (SED)", location: "New Capital" };
const plain = buildProjectFaq(project, units);
const withResearch = buildProjectFaq(project, units, { research: [{ question: good.question + "؟", answer: good.answer, sources: good.sources }] });
check(withResearch.length === plain.length, "a researched question with the same wording replaces the computed one");
const replaced = withResearch.find((item) => item.question === "Bleu Vert فين بالظبط؟");
check(replaced && replaced.answer.includes("R7") && replaced.answer.includes("المصدر: sed.com.eg."), "researched answer cites its website");
const other = { question: "مساحة Bleu Vert قد إيه؟", answer: "يقام Bleu Vert على مساحة 50 فدان في العاصمة الإدارية الجديدة حسب موقع المطور.", sources: good.sources };
check(buildProjectFaq(project, units, { research: [other] }).length === plain.length + 1, "a new researched question is added");
const reworded = buildProjectFaq(project, units, { research: [{ ...other, question: "موقع Bleu Vert فين؟" }] });
check(reworded.length === plain.length && reworded.some((item) => item.question === "Bleu Vert فين بالظبط؟" && item.answer.includes("50 فدان")), "a reworded location question replaces the computed location answer");
check(/never transliterated into Arabic/.test(request.input[0].content), "keeps project names in Latin letters");
check(withResearch[withResearch.length - 1].question.startsWith("مين مطور"), "developer question stays last");
check(researchFaqItems([{ question: "x؟", answer: "y", sources: [{ url: "javascript:alert(1)" }] }])[0].sources?.length === 0, "unsafe source links are dropped");
check(researchFaqItems("bad").length === 0 && researchFaqItems(new Array(10).fill({ question: "q", answer: "a" })).length === 6, "stored value is bounded");

console.log(`Project research FAQ tests passed (${checks} checks; offline only).`);
