// Projects that are not on the site yet (pure part, no database / network):
// 1. grouping: the prompt that asks Claude which WhatsApp names are the same project; when Claude is
//    unsure, each name is searched on the web and the grouping is kept only when 2 sites show it
// 2. research: the prompt for Claude's web search, and the check that keeps a fact only when
//    2 different sites (not ours) say it, or the admin confirmed it by hand
// 3. the draft's doubts (anything missing or doubtful keeps it in «محتاج مراجعة»)
// Used by index.ts and scripts/test-wa-research.ts.

import { developerKey } from "./review.ts";

type Json = Record<string, unknown>;
const text = (value: unknown) => (typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim());

/** The 9 main areas (same list as projects.area_group). */
export const AREA_GROUPS = ["New Cairo", "Mostakbal City", "New Capital", "Sheikh Zayed", "October", "North Coast", "New Alamein", "Ain Sokhna", "Other"];

/** Project facts the research fills, in the order the admin sees them. */
export const DRAFT_FIELDS = [
  "name", "name_ar", "developer", "area_group", "sub_area", "location", "description",
  "down_payment_text", "installments_text", "delivery_text", "finishing",
] as const;
export type DraftField = (typeof DRAFT_FIELDS)[number];
/** Without these the project cannot go on the site. Payment, delivery and finishing are "if found". */
export const REQUIRED_FIELDS: DraftField[] = ["name", "developer", "area_group", "location"];

// ---------- 1. grouping ----------

export interface NameCount { name: string; count: number; location: string }
export interface SiteProject { id: string; name: string }
export interface DraftRef { id: string; name: string }

export const GROUPING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["projects"],
  properties: {
    projects: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "wa_names", "site_project_id", "draft_id", "sure"],
        properties: {
          name: { type: "string", description: "The project's usual English name, as the developer markets it" },
          wa_names: { type: "array", items: { type: "string" }, description: "Every WhatsApp name (exactly as given) that is this project" },
          site_project_id: { type: "string", description: "id of the site project it is, or empty" },
          draft_id: { type: "string", description: "id of the draft it is, or empty" },
          sure: { type: "boolean", description: "false when unsure these names are one project" },
        },
      },
    },
  },
};

export function groupingPrompt(developer: string, names: NameCount[], site: SiteProject[], drafts: DraftRef[]) {
  return [
    `Developer: ${developer || "unknown"} (Egypt real estate).`,
    "Project names as written in this developer's WhatsApp sales group (with how many units and a location hint):",
    ...names.map((row) => `- ${row.name} (${row.count} units${row.location ? `, ${row.location}` : ""})`),
    "",
    site.length ? "Projects of this developer already on our site (id: name):" : "This developer has no project on our site yet.",
    ...site.map((project) => `- ${project.id}: ${project.name}`),
    drafts.length ? "Drafts we already started (id: name):" : "",
    ...drafts.map((draft) => `- ${draft.id}: ${draft.name}`),
    "",
    "Group the WhatsApp names into projects. Rules:",
    "- Different spellings, \"The\", the area added after the name, or the developer's name added before it are the same project (\"101\", \"The 101\", \"Biography 101\").",
    "- A building, phase or collection sold inside one project is that project (\"Motion Collection\" inside \"The 101\") only if you know the developer markets it that way; otherwise keep it apart and set sure=false.",
    "- \"East\"/\"West\", different numbers (\"La Vista 6\" vs \"La Vista 7\") or a mall vs a residential compound are different projects.",
    "- If a group is a project already on our site, set site_project_id; if it is one of our drafts, set draft_id. Only when you are sure.",
    "- Every WhatsApp name must appear in exactly one group. Keep each name exactly as written.",
  ].filter((line) => line !== "").join("\n");
}

// ---------- 1b. unsure grouping: settled on the web, same 2-sites rule ----------

export function groupingCheckPrompt(developer: string, waNames: string[]) {
  return [
    `These names were written in the WhatsApp sales group of ${developer || "an Egyptian real-estate developer"}: ${waNames.map((name) => `"${name}"`).join(", ")}.`,
    "Are they ONE project (spelling variants of the same name) or DIFFERENT projects? Search the web for each name on its own.",
    "Group the names only by what real web pages (developer site, property portals, news) show, and give for each project the URLs that show it.",
    "A name you do not find on the web stays alone in its own project, with no sources. Never guess.",
    "Do not use tycoons-inv.com as a source.",
    "",
    "Answer with JSON only:",
    '{"projects": [{"name": "the official English name", "wa_names": ["names exactly as given above"], "sources": ["https://..."]}]}',
  ].join("\n");
}

export interface CheckedGroup { name: string; wa_names: string[] }

/**
 * The web's answer to an unsure grouping. Settled only when every WhatsApp name is in exactly one project
 * and every project is shown by 2 different sites (that the search returned, not ours). Otherwise null:
 * the draft keeps «grouping_unsure» for the admin.
 */
export function verifyGrouping(raw: unknown, searched: Set<string>, waNames: string[]): CheckedGroup[] | null {
  const data = (raw && typeof raw === "object" ? raw : {}) as Json;
  const projects = Array.isArray(data.projects) ? (data.projects as Json[]) : [];
  if (!projects.length) return null;
  const searchedSites = new Set([...searched].map(siteOf).filter(Boolean));
  const wanted = new Set(waNames);
  const seen = new Set<string>();
  const out: CheckedGroup[] = [];
  for (const project of projects) {
    const names = (Array.isArray(project.wa_names) ? project.wa_names : []).map(text).filter(Boolean);
    if (!names.length) continue;
    for (const name of names) {
      if (!wanted.has(name) || seen.has(name)) return null;
      seen.add(name);
    }
    const sites = new Set((Array.isArray(project.sources) ? project.sources : []).map(text)
      .filter((url) => /^https?:\/\//i.test(url))
      .map(siteOf)
      .filter((site) => site && !OWN_SITES.has(site) && (!searchedSites.size || searchedSites.has(site))));
    if (sites.size < 2) return null;
    out.push({ name: text(project.name).slice(0, 200) || names[0], wa_names: names });
  }
  return seen.size === wanted.size ? out : null;
}

// ---------- 2. research ----------

export function researchPrompt(name: string, developer: string, waNames: string[], hints: string[]) {
  return [
    `Research this Egyptian real-estate project on the web: "${name}" by ${developer || "an unknown developer"}.`,
    `It is also written: ${waNames.join(", ")}.`,
    hints.length ? `Hints from the developer's WhatsApp messages (not proof): ${hints.join(" | ")}` : "",
    "",
    "Find, from real web pages (developer site, property portals, news), and give each fact with the URLs that state it:",
    "- name: the official English name; name_ar: the usual Arabic name (as Egyptian buyers write it)",
    "- developer: the developer's official name",
    `- area_group: exactly one of ${AREA_GROUPS.join(", ")}`,
    "- sub_area: the district or road inside it (e.g. \"Golden Square\", \"R7\", \"Ras El Hekma\"); location: a short English location line",
    "- description: one or two short Arabic sentences on what the project is (type, size in feddan if stated). No prices, no marketing words.",
    "- down_payment_text and installments_text: the current payment plan (e.g. \"10%\", \"8 years\"); delivery_text: delivery date or period; finishing: finishing type",
    "Each value is the bare fact only, no notes or brackets: developer = the name only (e.g. \"Biography Developments\"); sub_area at most 5 words; location at most 12 words; finishing one of Core & Shell, Semi Finished, Flexi Finished, Fully Finished, Fully Finished with ACs, Furnished.",
    "Leave a fact empty when you did not find it. Never guess. If two sites disagree on a fact, list it in conflicts (not inside the value).",
    "Do not use tycoons-inv.com as a source.",
    "",
    "Answer with JSON only:",
    '{"found": true|false, "facts": {"<field>": {"value": "...", "sources": ["https://..."]}}, "conflicts": [{"field": "...", "values": ["...", "..."]}]}',
  ].filter((line) => line !== "").join("\n");
}

/** "https://www.nawy.com/x" -> "nawy.com". */
export function siteOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "").split(".").slice(-3).join(".").replace(/^(m|ar|en)\./, "");
  } catch {
    return "";
  }
}
const OWN_SITES = new Set(["tycoons-inv.com", "tycoons-inv.de"]);

export interface Fact { value: string; sources: string[] }
export type Facts = Partial<Record<DraftField, Fact>>;

/**
 * Keeps a fact only when 2 different sites (that the search really returned, not ours) state it.
 * Answer: the kept facts and the fields that had a value but not enough sources.
 */
export function verifyFacts(raw: unknown, searched: Set<string>): { facts: Facts; weak: DraftField[]; conflicts: DraftField[]; found: boolean } {
  const data = (raw && typeof raw === "object" ? raw : {}) as Json;
  const given = (data.facts && typeof data.facts === "object" ? data.facts : {}) as Json;
  const facts: Facts = {};
  const weak: DraftField[] = [];
  const searchedSites = new Set([...searched].map(siteOf).filter(Boolean));
  for (const field of DRAFT_FIELDS) {
    const item = (given[field] ?? {}) as Json;
    let value = text(item.value).slice(0, field === "description" ? 600 : 200);
    if (field === "area_group") value = AREA_GROUPS.find((area) => area.toLowerCase() === value.toLowerCase()) ?? "";
    if (!value) continue;
    // Citations must be pages the search returned (compared by site: URLs differ by a slash or a query).
    const sources = [...new Set((Array.isArray(item.sources) ? item.sources : []).map(text)
      .filter((url) => /^https?:\/\//i.test(url) && (!searchedSites.size || searchedSites.has(siteOf(url)))))];
    const sites = new Set(sources.map(siteOf).filter((site) => site && !OWN_SITES.has(site)));
    if (sites.size >= 2) facts[field] = { value, sources: sources.slice(0, 6) };
    else weak.push(field);
  }
  const conflicts = [...new Set((Array.isArray(data.conflicts) ? data.conflicts : [])
    .map((item) => text((item as Json)?.field) as DraftField)
    .filter((field) => (DRAFT_FIELDS as readonly string[]).includes(field)))];
  return { facts, weak, conflicts, found: data.found !== false };
}

// ---------- 3. draft doubts ----------

export type DraftDoubt =
  | "not_found" | "grouping_unsure" | "developer_mismatch"
  | `missing_${"name" | "developer" | "area_group" | "location"}`
  | `weak_${DraftField}` | `conflict_${DraftField}`;

export interface DraftState {
  values: Partial<Record<DraftField, string>>;
  /** Fields with 2+ sources. */
  verified: DraftField[];
  /** Fields the admin confirmed or typed. */
  confirmed: DraftField[];
  weak: DraftField[];
  conflicts: DraftField[];
  found: boolean;
  groupingSure: boolean;
  /** Developer the WhatsApp units name (mismatch with the research = doubt). */
  waDeveloper: string;
}

/** Everything that keeps a draft from «انشر» without a look. Empty = ready. */
export function draftDoubts(state: DraftState): DraftDoubt[] {
  const ok = (field: DraftField) => Boolean(text(state.values[field])) && (state.verified.includes(field) || state.confirmed.includes(field));
  const out: DraftDoubt[] = [];
  if (!state.found && !state.confirmed.length) out.push("not_found");
  if (!state.groupingSure && !state.confirmed.includes("name")) out.push("grouping_unsure");
  for (const field of REQUIRED_FIELDS) if (!ok(field)) out.push(`missing_${field}` as DraftDoubt);
  // A fact found but on one site only: shown (not used) until the admin confirms it.
  for (const field of state.weak) if (!state.confirmed.includes(field) && !REQUIRED_FIELDS.includes(field)) out.push(`weak_${field}`);
  for (const field of state.conflicts) if (!state.confirmed.includes(field)) out.push(`conflict_${field}`);
  const wa = developerKey(state.waDeveloper);
  const found = developerKey(state.values.developer);
  if (wa && found && wa !== found && !wa.includes(found) && !found.includes(wa) && !state.confirmed.includes("developer")) out.push("developer_mismatch");
  return out;
}

/** URLs the web search really returned (citations must come from these). */
export function searchedUrls(content: unknown[]): Set<string> {
  const out = new Set<string>();
  for (const block of content as Json[]) {
    if (block?.type !== "web_search_tool_result" || !Array.isArray(block.content)) continue;
    for (const item of block.content as Json[]) if (typeof item?.url === "string") out.add(item.url);
  }
  return out;
}

/** First {...} JSON object in Claude's text (research answers are plain text). */
export function firstJson(value: string): unknown {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(value.slice(start, end + 1));
  } catch {
    return null;
  }
}
