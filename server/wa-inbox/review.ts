// Pure rules for the WhatsApp inbox (no database): which developer a unit belongs to, which units are
// the same project under different spellings, and whether a unit is "ready" (every detail present and
// nothing doubtful) or needs a human look, with the reasons. Used by index.ts and
// scripts/test-wa-review.ts.

export type Row = Record<string, unknown>;

const text = (value: unknown) => (typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim());
/** Lower-case letters and digits only (Arabic letters kept). */
export const norm = (value: unknown) =>
  text(value).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9؀-ۿ]+/g, "");

// ---------- developers ----------

/** What Claude writes when the message does not name the developer (or names our own team). */
const NO_DEVELOPER = new Set(["", "unknown", "needsdeveloper", "needsdevelopername", "na", "none", "tai", "taitycoons", "tycoons"]);
export const isUnknownDeveloper = (value: unknown) => NO_DEVELOPER.has(norm(value)) || /^needs/i.test(text(value));

/** Words that do not tell developers apart ("Concrete Developments" == "Concrete"). */
const DEV_FILLER = /\b(developments?|developers?|development|dev|holding|group|properties|property|real\s*estate|realestate|company|co|egypt|eg|for|and|&)\b/gi;
export const developerKey = (value: unknown) => norm(text(value).replace(DEV_FILLER, " "));

export interface DeveloperRow { name: string; aliases?: unknown }

/** Known developer for a free-text name, by name or alias (same key), else "". */
export function canonicalDeveloper(raw: unknown, developers: DeveloperRow[]): string {
  const key = developerKey(raw);
  if (!key || isUnknownDeveloper(raw)) return "";
  for (const dev of developers) {
    const aliases = Array.isArray(dev.aliases) ? dev.aliases : typeof dev.aliases === "string" ? dev.aliases.split(/[,|]/) : [];
    if ([dev.name, ...aliases].some((name) => developerKey(name) === key)) return dev.name;
  }
  return "";
}

/** "Concrete 🤝 Tai Tycoons" -> "Concrete"; "TAI Tycoons - Kleek 1683" -> "Kleek". */
export function groupNameDeveloper(groupName: unknown): string {
  const parts = text(groupName).split(/\s*(?:\/|&|\||🤝|♦️|:|\s-\s|•)\s*/u).map((part) => part.replace(/[^\p{L}\p{N}\s.'()-]/gu, " ").replace(/\b\d{3,}\b/g, "").trim());
  return parts.find((part) => part && !/\b(tai|tycoons?|taycoons?|tyccons)\b/i.test(part) && !/^tai\b/i.test(part)) ?? "";
}

/** Our own team's name added to a developer ("Tharaa & Tai" -> "Tharaa", "Biography - TAI" -> "Biography"). */
export function cleanDeveloperName(raw: unknown): string {
  const value = text(raw);
  return /\b(tai|tycoons?|taycoons?|tyccons)\b/i.test(value) ? groupNameDeveloper(value) : value;
}

/**
 * The developer a unit is saved with:
 * 1. the developer Claude read, when it is a known developer (spelled the site's way)
 * 2. the group's developer, when the message named none ("Unknown", "Needs developer name")
 * 3. what Claude read, as written (a developer the site does not know yet)
 * Groups are not always one developer (a sales agency posts several), so the group never overrides a
 * developer the message names.
 */
export function resolveDeveloper(raw: unknown, groupDeveloper: string, developers: DeveloperRow[]): { developer: string; from: "message" | "group" | "unknown" } {
  const cleaned = cleanDeveloperName(raw);
  if (!isUnknownDeveloper(cleaned)) {
    // The group's developer as the admin spelled it ("Tharaa" -> "Tharaa Developments").
    if (groupDeveloper && developerKey(groupDeveloper) === developerKey(cleaned)) return { developer: groupDeveloper, from: "message" };
    return { developer: canonicalDeveloper(cleaned, developers) || cleaned, from: "message" };
  }
  if (groupDeveloper) return { developer: groupDeveloper, from: "group" };
  return { developer: "", from: "unknown" };
}

// ---------- project names ----------

/** Names that are not a project name (Claude writes them when the message names none). */
export const NO_NAME_KEYS = new Set(["", "needsprojectname", "needsname", "unknown", "unknownproject", "na", "none", "newproject", "newlaunch"]);
/** Area words people add after a project name ("KOR New Capital" == "KOR"). */
const AREA_SUFFIXES = [
  "newcapital", "newadministrativecapital", "newcairo", "fifthsettlement", "5thsettlement", "mostakbalcity", "mostakbal",
  "sheikhzayed", "elsheikhzayed", "newzayed", "zayed", "october", "6thofoctober", "northcoast", "sahel", "ainsokhna", "sokhna", "newalamein", "alamein",
];

/** Same project whatever the spelling: no "The", no punctuation/case, no trailing area. */
export function projectKey(name: unknown): string {
  let key = norm(text(name).split(" @ ")[0].replace(/^\s*the\s+/i, ""));
  if (NO_NAME_KEYS.has(key)) return "";
  for (const suffix of AREA_SUFFIXES) {
    if (key.length > suffix.length + 2 && key.endsWith(suffix)) {
      key = key.slice(0, -suffix.length);
      break;
    }
  }
  return key;
}
export const hasProjectName = (name: unknown) => Boolean(projectKey(name)) && !/^needs/i.test(text(name));

// ---------- readiness ----------

/** Why a unit needs a human look (Arabic labels live in the admin page). */
export type Doubt =
  | "no_project" | "no_name" | "dev_unknown" | "dev_conflict" | "suggested_project" | "missing_type" | "missing_area" | "missing_price"
  | "missing_payment" | "missing_delivery" | "missing_finishing" | "no_area" | "duplicate" | "rejected_before" | "price_jump"
  | "draft_review" | "draft_researching";

export interface ReviewContext {
  /** The unit is linked to a project on the site. */
  hasProject: (row: Row) => boolean;
  /** Status of the unit's new-project draft (not on the site yet), or "" when it has none. */
  draftStatus?: (row: Row) => string;
  /** Inbox id -> a project was only suggested (the admin has not confirmed it). */
  suggested: Set<string>;
  duplicates: Record<string, number[]>;
  rejectedBefore: Record<string, string>;
  /** Project key -> developers seen for it among the open units (more than one = doubt). */
  developersByKey: Map<string, Set<string>>;
  /** Price of the site unit this one would replace (by inbox id). */
  replacedPrice: Map<string, number>;
  /** The project has a main area (site project or draft). */
  hasArea: (row: Row) => boolean;
}

/** Collects the developers seen per project key (dev_conflict). */
export function developersByProject(rows: Row[]): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const row of rows) {
    if (text(row.project_id)) continue;
    const key = projectKey(row.project_name);
    const dev = developerKey(row.developer);
    if (!key || !dev) continue;
    out.set(key, (out.get(key) ?? new Set()).add(dev));
  }
  return out;
}

/** Every reason this unit cannot be approved without a look. Empty = ready. */
export function doubtsFor(row: Row, ctx: ReviewContext): Doubt[] {
  const id = String(row.id);
  const out: Doubt[] = [];
  const linked = ctx.hasProject(row);
  const draft = linked ? "" : ctx.draftStatus?.(row) ?? "";
  if (draft) {
    // A new project: its units are ready once the project's own facts are (published together).
    if (draft === "researching") out.push("draft_researching");
    else if (draft !== "ready") out.push("draft_review");
  } else if (!linked) {
    if (!hasProjectName(row.project_name)) out.push("no_name");
    else if (ctx.suggested.has(id)) out.push("suggested_project");
    else out.push("no_project");
    if (isUnknownDeveloper(row.developer)) out.push("dev_unknown");
    const devs = ctx.developersByKey.get(projectKey(row.project_name));
    if (devs && devs.size > 1) out.push("dev_conflict");
  }
  if (!text(row.unit_type)) out.push("missing_type");
  if (!(Number(row.area_sqm) > 0)) out.push("missing_area");
  if (!(Number(row.starting_price) > 0)) out.push("missing_price");
  if (!text(row.down_payment_text) || !text(row.installments_text)) out.push("missing_payment");
  if (!text(row.delivery_text)) out.push("missing_delivery");
  if (!text(row.finishing)) out.push("missing_finishing");
  if (!ctx.hasArea(row)) out.push("no_area");
  if (ctx.duplicates[id]?.length) out.push("duplicate");
  if (ctx.rejectedBefore[id]) out.push("rejected_before");
  const old = ctx.replacedPrice.get(id);
  const price = Number(row.starting_price);
  // Same unit, price more than 40% away from the site's: a typo (one zero too many) or another unit.
  if (old && price > 0 && Math.abs(price - old) / old > 0.4) out.push("price_jump");
  return out;
}
