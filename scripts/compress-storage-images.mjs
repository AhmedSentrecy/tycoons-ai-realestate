// Compresses new, large photos in the Supabase `property-images` bucket, in place (same path,
// same public URL), so nothing that links to them changes.
//
// Why: photos copied from developer websites (wa-inbox photo suggestions) and other imports
// were stored as-is, some at 2–7 MB. Bots fetch them a lot, and Storage egress went over the
// free plan quota (Nov 2026).
//
// A file is processed once: after it is handled its cache-control is set to DONE_CACHE, and
// files that already carry it are skipped. Files that would not get much smaller are re-saved
// unchanged, only to set that marker.
//
// Needs: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and `sharp` installed next to this file.
// Usage: node compress-storage-images.mjs [--dry-run] [--limit=200]
import sharp from "sharp";

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://coqnjymekrkoausiiytm.supabase.co").replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "property-images";
const DONE_CACHE = "max-age=2592000"; // 30 days; also marks a file as handled
const MIN_BYTES = 300 * 1024;
const MIN_SAVING = 0.25;
const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT = Number((process.argv.find((arg) => arg.startsWith("--limit=")) || "").split("=")[1]) || 200;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const auth = { Authorization: `Bearer ${KEY}`, apikey: KEY };
const encodePath = (path) => path.split("/").map(encodeURIComponent).join("/");

/** Brochure pages and master plans keep more pixels so their small text stays readable. */
export const maxEdge = (path) => (/page|masterplan|master-plan|floor|plan/i.test(path) ? 2600 : 1600);

async function listFolder(prefix) {
  const entries = [];
  for (let offset = 0; ; offset += 1000) {
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
    });
    if (!response.ok) throw new Error(`list ${prefix || "/"}: ${response.status} ${await response.text()}`);
    const page = await response.json();
    entries.push(...page);
    if (page.length < 1000) return entries;
  }
}

async function listAll(prefix = "") {
  const files = [];
  for (const entry of await listFolder(prefix)) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) files.push(...(await listAll(path)));
    else files.push({ path, ...entry.metadata });
  }
  return files;
}

export async function shrink(input, path) {
  const edge = maxEdge(path);
  const image = sharp(input, { failOn: "none" })
    .rotate()
    .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true });
  if (/\.jpe?g$/i.test(path)) return { bytes: await image.jpeg({ quality: 78, mozjpeg: true }).toBuffer(), type: "image/jpeg" };
  // .webp and .png both become WebP (browsers go by the content type, not the file name).
  return { bytes: await image.webp({ quality: 76, effort: 5 }).toBuffer(), type: "image/webp" };
}

async function save(path, bytes, type) {
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(path)}`, {
    method: "PUT",
    headers: { ...auth, "content-type": type, "cache-control": DONE_CACHE, "x-upsert": "true" },
    body: bytes,
  });
  if (!response.ok) throw new Error(`upload ${response.status} ${(await response.text()).slice(0, 120)}`);
}

async function main() {
  if (!KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");
  const files = await listAll();
  const todo = files
    .filter((file) => IMAGE_TYPES.has(file.mimetype) && file.size >= MIN_BYTES && file.cacheControl !== DONE_CACHE)
    .sort((a, b) => String(b.lastModified).localeCompare(String(a.lastModified)))
    .slice(0, LIMIT);
  console.log(`${files.length} files in ${BUCKET}; ${todo.length} to check${DRY_RUN ? " (dry run)" : ""}`);

  let before = 0, after = 0, compressed = 0, marked = 0;
  const failed = [];
  for (const file of todo) {
    try {
      const download = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(file.path)}`, { headers: auth });
      if (!download.ok) throw new Error(`download ${download.status}`);
      const input = Buffer.from(await download.arrayBuffer());
      const output = await shrink(input, file.path);
      const smaller = 1 - output.bytes.length / input.length >= MIN_SAVING;
      before += input.length;
      after += smaller ? output.bytes.length : input.length;
      if (smaller) compressed++;
      else marked++;
      console.log(`${smaller ? "compress" : "keep    "} ${(input.length / 1024) | 0} KB -> ${((smaller ? output.bytes.length : input.length) / 1024) | 0} KB  ${file.path}`);
      if (!DRY_RUN) {
        if (smaller) await save(file.path, output.bytes, output.type);
        else await save(file.path, input, file.mimetype);
      }
    } catch (error) {
      failed.push(file.path);
      console.error(`failed ${file.path}: ${error.message || error}`);
    }
  }
  const mb = (bytes) => (bytes / 1048576).toFixed(1);
  console.log(`done: ${compressed} compressed, ${marked} kept as-is, ${failed.length} failed; ${mb(before)} MB -> ${mb(after)} MB`);
  if (failed.length) process.exitCode = 1;
}

// Tests import shrink()/maxEdge() without running the job.
if (!process.env.COMPRESS_IMAGES_NO_RUN) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}
