const crypto = require("node:crypto");

const ALLOWED_TYPES = new Set(["developer", "project", "phase", "comparison", "guide"]);
const DISCOVERY_SOURCES = Object.freeze(["Flat & Villa", "RealEstate.eg"]);
const MAX_ATTEMPTS = 3;
const MONTHLY_BUDGET_CENTS = 5000;

function cleanText(value, max = 500) {
  return String(value ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
}

function createJobInput(input) {
  const contentType = cleanText(input.content_type, 30);
  if (!ALLOWED_TYPES.has(contentType)) throw new Error("content_type_invalid");
  const topic = cleanText(input.topic, 300);
  if (!topic) throw new Error("topic_required");
  const primaryEntityId = cleanText(input.primary_entity_id, 120) || null;
  const secondaryEntityId = contentType === "comparison" ? cleanText(input.secondary_entity_id, 120) || null : null;
  if (["developer", "project", "phase", "comparison"].includes(contentType) && !primaryEntityId) throw new Error("primary_entity_required");
  if (contentType === "comparison" && !secondaryEntityId) throw new Error("secondary_entity_required");
  const areaName = cleanText(input.area_name, 120) || null;
  const sourceInput = cleanText(input.source_input, 2000) || null;
  const fingerprint = crypto.createHash("sha256").update(JSON.stringify({ contentType, primaryEntityId, secondaryEntityId, areaName, topic, sourceInput })).digest("hex");
  return {
    content_type: contentType, primary_entity_id: primaryEntityId, secondary_entity_id: secondaryEntityId,
    area_name: areaName, topic, source_input: sourceInput,
    idempotency_key: `editorial:${fingerprint}`,
    discovery_sources: [...DISCOVERY_SOURCES],
  };
}

function evidenceItem({ url, label, authority, checked_at, source_date, claims = [], rights = null }) {
  return {
    url: cleanText(url, 1000), label: cleanText(label, 200), authority: cleanText(authority, 80),
    checked_at: cleanText(checked_at, 40), source_date: cleanText(source_date, 40) || null,
    claims: claims.map((claim) => cleanText(claim, 500)).filter(Boolean), rights,
  };
}

function validatePackage(pkg, now = new Date()) {
  const checks = [];
  const exceptions = [];
  const evidence = Array.isArray(pkg.evidence) ? pkg.evidence : [];
  const drafts = [pkg.draft_ar, pkg.draft_en];
  checks.push({ gate: "bilingual", passed: drafts.every((draft) => draft?.title && draft?.body_markdown) });
  checks.push({ gate: "evidence", passed: evidence.length > 0 && evidence.every((item) => item.url && item.checked_at && item.claims?.length) });
  checks.push({ gate: "entity_links", passed: Array.isArray(pkg.internal_links) && pkg.internal_links.every((link) => link.entity_id && /^\//.test(link.url)) });
  checks.push({ gate: "commercial_separation", passed: pkg.commercial_inventory === "separate" });
  checks.push({ gate: "prompt_injection_boundary", passed: pkg.external_content_is_data_only === true });
  checks.push({ gate: "html_safety", passed: !drafts.some((draft) => /<script|javascript:|onerror\s*=/i.test(draft?.body_markdown || "")) });
  checks.push({ gate: "review_identity", passed: pkg.review_kind !== "human" || Boolean(pkg.reviewed_by) });

  if (pkg.claims_current_price && !pkg.current_inventory_verified_at) exceptions.push({ code: "price_unverified", message: "Current price claims require dated Tycoons inventory evidence." });
  if (pkg.claims_availability && !pkg.current_inventory_verified_at) exceptions.push({ code: "availability_unverified", message: "Weekly research cannot prove current availability." });
  if (pkg.media_assets?.some((asset) => !asset.rights_status || asset.rights_status === "unknown")) exceptions.push({ code: "media_rights_unknown", message: "Every published asset needs recorded reuse rights." });
  if (evidence.some((item) => item.conflict === true)) exceptions.push({ code: "source_conflict", message: "Conflicting evidence requires a decision." });
  if (pkg.search_volume_claimed === true) exceptions.push({ code: "search_volume_unsupported", message: "No market-wide keyword volume source is connected." });

  const failed = checks.filter((check) => !check.passed);
  // These checks validate package shape only. Factual/semantic verification is
  // not deterministic here, so this module never authorizes publication.
  const autoPublishEligible = false;
  return {
    checked_at: now.toISOString(), checks, exceptions,
    status: "needs_review",
    auto_publish_eligible: autoPublishEligible,
    review_kind: autoPublishEligible ? "automated_validation" : null,
  };
}

function validateProviderResult(value, now = new Date()) {
  if (!value || typeof value !== "object") throw new Error("provider_output_invalid");
  const evidence = Array.isArray(value.evidence) ? value.evidence : [];
  if (!evidence.length) throw new Error("provider_evidence_missing");
  const ids = new Set();
  for (const item of evidence) {
    if (!/^[a-zA-Z0-9._:-]{1,80}$/.test(String(item.id || "")) || ids.has(item.id)) throw new Error("provider_evidence_id_invalid");
    ids.add(item.id);
    let parsed; try { parsed = new URL(String(item.url)); } catch { throw new Error("provider_evidence_url_invalid"); }
    if (parsed.protocol !== "https:") throw new Error("provider_evidence_url_invalid");
    const checked = Date.parse(String(item.checked_at || ""));
    if (!Number.isFinite(checked) || checked > now.getTime() + 300000) throw new Error("provider_evidence_date_invalid");
    if (!["tycoons_inventory","developer_official","government_official","competitor_discovery"].includes(item.authority)) throw new Error("provider_evidence_authority_invalid");
    if (!Array.isArray(item.claims) || !item.claims.length) throw new Error("provider_evidence_claims_missing");
  }
  const claims = Array.isArray(value.claim_evidence) ? value.claim_evidence : [];
  for (const claim of claims) {
    if (!Array.isArray(claim.evidence_ids) || claim.evidence_ids.some((id) => !ids.has(id))) throw new Error("provider_claim_evidence_invalid");
  }
  const draftAr = value.draft_ar; const draftEn = value.draft_en;
  if (draftAr?.language !== "ar" || draftEn?.language !== "en") throw new Error("provider_languages_invalid");
  if (!/[\u0600-\u06ff]/.test(`${draftAr.title} ${draftAr.body_markdown}`)) throw new Error("provider_arabic_missing");
  if (!/[A-Za-z]/.test(`${draftEn.title} ${draftEn.body_markdown}`) || /[\u0600-\u06ff]/.test(draftEn.title || "")) throw new Error("provider_english_invalid");
  for (const draft of [draftAr, draftEn]) {
    if (!draft.title || !draft.slug || !draft.excerpt || !draft.body_markdown || !draft.meta_title || !draft.meta_description) throw new Error("provider_draft_incomplete");
    if (!Array.isArray(draft.source_refs) || draft.source_refs.some((ref) => !ids.has(ref.id) || !/^https:\/\//.test(ref.url))) throw new Error("provider_source_refs_invalid");
    if (/<script|javascript:|on\w+\s*=/i.test(draft.body_markdown)) throw new Error("provider_draft_unsafe");
  }
  const exceptions = Array.isArray(value.exceptions) ? value.exceptions.slice(0, 30) : [];
  for (const claim of claims) if (claim.status !== "supported") exceptions.push({ code: `claim_${claim.status}`, message: cleanText(claim.claim, 300) });
  return {
    evidence, claim_evidence: claims, draft_ar: draftAr, draft_en: draftEn, exceptions,
    validation: [{ gate: "provider_shape", passed: true }, { gate: "semantic_review", passed: false, reason: "trusted semantic validation required" }],
  };
}

function dryRunPilot() {
  const input = createJobInput({ content_type: "project", primary_entity_id: "prk-vie--upwyde", area_name: "New Cairo", topic: "Comprehensive PRK Vie project guide", source_input: "Editorial pilot checked 2026-10-08" });
  const checkedAt = "2026-10-08T00:00:00.000Z";
  const pkg = {
    ...input,
    evidence: [
      evidenceItem({ url: "https://upwyde.com/project/prk-vie/", label: "Upwyde project page", authority: "developer_official", checked_at: checkedAt, claims: ["Project identity", "New Cairo", "commercial, administrative and medical uses"] }),
      evidenceItem({ url: "https://upwyde.com/vezeeta/", label: "PRK Vie × Vezeeta announcement", authority: "developer_official", checked_at: checkedAt, source_date: "2026-09-02", claims: ["Announced medical component and operator relationship"] }),
      evidenceItem({ url: "https://realestate.eg/ar/5050815-commercial-in-new-cairo-prk-vie-compound", label: "RealEstate.eg coverage", authority: "competitor_discovery", checked_at: checkedAt, claims: ["Coverage structure and user questions only"] }),
    ],
    draft_ar: { title: "بارك في القاهرة الجديدة PRK Vie | دليل المشروع والوحدات", body_markdown: "## إجابة مختصرة\nمشروع متعدد الاستخدامات من اب وايد في القاهرة الجديدة.\n\n## قبل الاختيار\nاطلب تأكيد الاستخدام والمخطط والمعلومات التجارية الحالية من Tycoons." },
    draft_en: { title: "PRK Vie New Cairo by Upwyde | Project and Unit Guide", body_markdown: "## Short answer\nA mixed-use Upwyde project in New Cairo.\n\n## Before choosing\nAsk Tycoons to confirm permitted use, plans, and current commercial information." },
    internal_links: [
      { entity_id: "prk-vie--upwyde", url: "/projects/prk-vie--upwyde" },
      { entity_id: "upwyde", url: "/ar/developers/upwyde" },
      { entity_id: "new-cairo", url: "/ar/areas/new-cairo" },
    ],
    commercial_inventory: "separate",
    external_content_is_data_only: true,
    claims_current_price: false,
    claims_availability: false,
    media_assets: [{ asset_id: "project-hero", rights_status: "unknown" }],
    review_kind: null,
  };
  return { input, package: pkg, validation: validatePackage(pkg, new Date(checkedAt)), proposed_budget: { monthly_ceiling_cents: MONTHLY_BUDGET_CENTS, reservation_cents: 150, max_attempts: MAX_ATTEMPTS, paid_execution_enabled: false } };
}

module.exports = { ALLOWED_TYPES, DISCOVERY_SOURCES, MAX_ATTEMPTS, MONTHLY_BUDGET_CENTS, createJobInput, evidenceItem, validatePackage, validateProviderResult, dryRunPilot };
