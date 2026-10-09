// Pure shared review policy. Inputs in `sources` must be freshly loaded public rows,
// never the article's source_refs snapshots or model/client review flags.
const FIELDS = ["title", "slug", "excerpt", "meta_title", "meta_description", "body_markdown"];
const KINDS = ["price", "down_payment", "installments", "delivery", "availability"];
const clean = (value, max = 2000) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const key = (value) => clean(value).normalize("NFKC").toLocaleLowerCase();
const own = (row, raw, normalized) => Object.hasOwn(row, raw) ? row[raw] : row[normalized];
const positive = (value) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
const digits = (value) => String(value).replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/٫/g, ".").replace(/٪/g, "%").replace(/[٬,]/g, "");
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

function unitRow(row) {
  return {
    id: clean(row.id, 80), project_id: clean(row.project_id, 80), unit_type: clean(row.unit_type, 160),
    area_sqm: positive(row.area_sqm), price: positive(own(row, "starting_price", "starting_price_egp")),
    down_payment: clean(own(row, "down_payment_text", "down_payment"), 200),
    installments: clean(own(row, "installments_text", "installments"), 200),
    delivery: clean(own(row, "delivery_text", "delivery"), 160),
    availability: clean(own(row, "availability_status", "availability"), 40),
    updated: clean(own(row, "last_updated_at", "source_last_updated_at"), 50).slice(0, 10),
  };
}

function displayFact(unit, kind) {
  if (kind === "price") return unit.price ? `${unit.price} EGP` : "";
  if (kind === "down_payment") {
    const values = [...digits(unit.down_payment).matchAll(/(?<![\d.])([+-]?\d+(?:\.\d+)?)\s*%/g)];
    return values.length && values.every(([, value]) => Number(value) >= 0 && Number(value) <= 100) ? unit.down_payment : "";
  }
  if (kind === "installments") {
    const values = [...digits(unit.installments).matchAll(/(?<![\d.])([+-]?\d+(?:\.\d+)?)\s*(?:سنوات?|سنة|years?|yrs?|y\b)/gi)];
    return values.length && values.every(([, value]) => Number(value) > 0 && Number.isFinite(Number(value))) ? unit.installments : "";
  }
  if (kind === "delivery") {
    const dates = [...digits(unit.delivery).matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)];
    return dates.length && dates.every(([date]) => validDate(date)) ? unit.delivery : "";
  }
  if (kind === "availability") return ["available", "sold", "not_confirmed", "review_only", "new_launch"].includes(unit.availability) ? unit.availability : "";
  return "";
}

function canonicalLines(unit, language) {
  if (!unit.unit_type || !validDate(unit.updated)) return [];
  const ar = language !== "en";
  const link = `[${unit.unit_type}](/units/${encodeURIComponent(unit.id)})`;
  const updated = `${ar ? "تاريخ المصدر" : "source updated"}: ${unit.updated}`;
  const lines = [];
  // The generator labels this sample as available, so a changed availability
  // status must invalidate that sample instead of silently relabeling it.
  if (unit.availability === "available") lines.push(`- ${link}${unit.area_sqm !== null ? `: ${unit.area_sqm} ${ar ? "م²" : "m²"}` : ""} — ${ar ? "الحالة في بيانات المصدر" : "source status"}: ${unit.availability} — ${updated}.`);
  const labels = ar
    ? { price: "السعر", down_payment: "الدفعة المقدمة", installments: "التقسيط", delivery: "التسليم", availability: "التوافر" }
    : { price: "Price", down_payment: "Down payment", installments: "Installments", delivery: "Delivery", availability: "Availability" };
  for (const kind of KINDS) {
    const value = displayFact(unit, kind);
    if (value) lines.push(`- ${labels[kind]}: ${value} — ${link} — ${updated} — ${ar ? "يجب التحقق منه قبل النشر" : "must be verified before publication"}.`);
  }
  return lines;
}

function stripKnownNames(value, projects) {
  let result = value;
  for (const project of projects) {
    const location = clean(project.location);
    const locationSlug = location.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    // Only current, scoped project locations establish place identities. The
    // editable area_name is never an exemption, nor is a digits-only slug.
    const names = [project.name, project.slug, /\p{L}/u.test(location) ? location : "", /[a-z]/i.test(locationSlug) ? locationSlug : ""];
    for (const name of names.filter(Boolean).sort((a, b) => b.length - a.length)) {
      // A digit-bearing name (5A, 97 Hills) is an entity, not a quantity.
      const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "giu"), "project");
    }
  }
  return result;
}

/** @returns {{code: string, field: string, severity: 'blocker'|'review', message: string}[]} */
export function assessArticleReview(article, sources = {}) {
  const issues = [];
  const add = (code, field, severity, message) => {
    if (!issues.some((issue) => issue.code === code && issue.field === field)) issues.push({ code, field, severity, message });
  };
  const refs = Array.isArray(article?.source_refs) ? article.source_refs : [];
  const projects = (Array.isArray(sources.projects) ? sources.projects : []).filter((project) => {
    if (!project || !clean(project.id)) return false;
    if (article.target_type === "project") return String(project.id) === article.project_id;
    return article.target_type === "area" && key(article.area_name) && key(project.location).includes(key(article.area_name));
  });
  const projectById = new Map(projects.map((project) => [String(project.id), project]));
  const units = (Array.isArray(sources.units) ? sources.units : []).filter((row) => row && projectById.has(String(row.project_id))).map(unitRow);
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const referencedProjects = new Set();
  const referencedUnits = new Set();
  const links = new Set();
  const seen = new Set();
  if (!refs.length || refs.length > 30) add("source_reference_invalid", "source_refs", "blocker", "Add a valid current project source for this article's target.");
  for (const ref of refs.slice(0, 30)) {
    const type = ref?.type;
    const id = typeof ref?.id === "string" ? ref.id : "";
    const row = type === "project" ? projectById.get(id) : type === "unit" ? unitById.get(id) : null;
    const url = row ? (type === "project" ? `/projects/${row.slug}` : `/units/${encodeURIComponent(row.id)}`) : "";
    const identity = `${type}:${id}`;
    if (!row || !id || !url || ref.url !== url || !clean(type === "project" ? row.slug : row.unit_type) || seen.has(identity)) {
      add("source_reference_invalid", "source_refs", "blocker", "A source is missing, duplicated, out of scope, or no longer matches a current project or unit. Refresh the sources before publishing.");
      continue;
    }
    // Only identity and current rows establish evidence. Snapshot values, source
    // timestamps, labels, and client-supplied review flags grant no authority.
    seen.add(identity);
    links.add(url);
    (type === "project" ? referencedProjects : referencedUnits).add(id);
  }
  const groundedProjects = projects.filter((project) => referencedProjects.has(String(project.id)));
  if (!groundedProjects.length) add("source_grounding_missing", "source_refs", "blocker", "The article needs a current project source within its selected project or area.");
  for (const id of referencedUnits) {
    if (!referencedProjects.has(unitById.get(id).project_id)) add("source_reference_invalid", "source_refs", "blocker", "Each unit source must belong to a referenced project in the article's target.");
  }
  const combined = FIELDS.filter((field) => field !== "slug").map((field) => String(article?.[field] ?? "")).join("\n");
  if (groundedProjects.length && !groundedProjects.some((project) => (clean(project.name) && key(combined).includes(key(project.name))) || combined.includes(`](/projects/${project.slug})`))) {
    add("source_grounding_missing", "body_markdown", "blocker", "Explain which sourced project the article describes, using its current name or project link.");
  }
  const canonical = new Set(units.filter((unit) => referencedUnits.has(unit.id) && referencedProjects.has(unit.project_id)).flatMap((unit) => canonicalLines(unit, article.language)));
  for (const field of FIELDS) {
    const value = String(article?.[field] ?? "");
    if (/\{\{[^{}]*\}\}|\$\{[^{}]*\}|\b(?:min|max)_(?:area|price)\b|\b(?:TODO|TBD|INSERT[_ ](?:PRICE|AREA|VALUE))\b|\[(?:insert|add|ضع|أدخل)\b[^\]]*\]/i.test(value)) {
      add("unresolved_placeholder", field, "blocker", "Replace or remove the unresolved placeholder before publication.");
    }
    const prose = [];
    for (const rawLine of value.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (field === "body_markdown" && canonical.has(line)) {
        add("source_fact_review", field, "review", "The cited unit facts match current source rows. Confirm the source dates and commercial terms before publication.");
        continue;
      }
      if (field === "body_markdown" && /(?:source updated|تاريخ المصدر|source status|الحالة في بيانات المصدر)|^-\s*(?:Price|Down payment|Installments|Delivery|Availability|السعر|الدفعة المقدمة|التقسيط|التسليم|التوافر):/i.test(line)) {
        add("invalid_typed_fact", field, "blocker", "A sourced fact no longer matches its exact unit, fact type, value, or source date. Refresh or remove that statement.");
      }
      // Resolve complete reference tokens before replacing entity names: otherwise
      // a project name/slug inside a valid URL can itself be rewritten.
      const checkReference = (url) => {
        if (links.has(url)) return true;
        if (/^\/(?:projects|units)\//.test(url)) add("source_reference_invalid", field, "blocker", "An internal project or unit link has no matching scoped source reference.");
        return false;
      };
      let numericText = line.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (_, label, url) => {
        return checkReference(url) ? label : `${label} ${url}`;
      });
      // Only exact current, scoped source paths are identifiers. Never exempt a
      // UUID/number generally, a partial path, or a URL carrying extra data.
      numericText = numericText.replace(/(?<![\p{L}\p{N}/.:])(و?)(\/(?:projects|units)\/[^\s<>"'\[\]()`]+)/gu, (_, conjunction, token) => {
        const path = token.replace(/[.,،؛:!?؟]+$/, "");
        return checkReference(path) ? `${conjunction}source reference` : `${conjunction}${token}`;
      });
      numericText = stripKnownNames(numericText, groundedProjects).replace(/^\s*\d+[.)]\s+/, "");
      // Unicode numbers include fullwidth, Arabic/Persian, and other numeral
      // scripts. An alternate glyph must not bypass numeric fact validation.
      const numeric = /\p{N}/u.exec(numericText);
      if (numeric) {
        const excerpt = numericText.slice(Math.max(0, numeric.index - 45), numeric.index + 95);
        add("unsupported_numeric_claim", field, "blocker", `Numeric text requires source verification: “${excerpt}”. Remove it or use an exact sourced statement before publication.`);
      }
      prose.push(line);
    }
    if (/(?:price|payment|installment|delivery|handover|availability|available|best|lowest|guarantee|return|amenit|facilit|سعر|أسعار|سداد|مقدم(?!ة)|تقسيط|تسليم|استلام|توافر|متاح|متوفر|أفضل|أرخص|عائد|خدمات|مرافق)/i.test(prose.join("\n"))) {
      add("qualitative_claim_review", field, "review", "Check qualitative, availability, and commercial wording against the sources. Edit unsupported wording and explicitly acknowledge your review.");
    }
  }
  add("editorial_review_required", "body_markdown", "review", "Review the complete saved article, including title, metadata, prose, and sources, before confirming publication.");
  return issues;
}
