import { useRef, useState } from "react";
import { STATUS_LABELS, UNIT_FIELD_LABELS, formatPrice, type AdminUnit, type UnitValues } from "../../lib/adminApi";
import { Badge, Modal } from "./ui";

/** Column aliases so a developer's own sheet usually imports without renaming anything. */
const HEADER_MAP: Record<string, keyof UnitValues | "id"> = {
  id: "id",
  unit_id: "id",
  unit_type: "unit_type",
  type: "unit_type",
  "نوع الوحدة": "unit_type",
  النوع: "unit_type",
  bedrooms: "bedrooms_text",
  bedrooms_text: "bedrooms_text",
  rooms: "bedrooms_text",
  الغرف: "bedrooms_text",
  area: "area_sqm",
  area_sqm: "area_sqm",
  bua: "area_sqm",
  المساحة: "area_sqm",
  price: "starting_price",
  starting_price: "starting_price",
  total_price: "starting_price",
  السعر: "starting_price",
  down_payment: "down_payment_text",
  down_payment_text: "down_payment_text",
  downpayment: "down_payment_text",
  المقدم: "down_payment_text",
  installments: "installments_text",
  installments_text: "installments_text",
  years: "installments_text",
  التقسيط: "installments_text",
  delivery: "delivery_text",
  delivery_text: "delivery_text",
  الاستلام: "delivery_text",
  finishing: "finishing",
  التشطيب: "finishing",
  status: "availability_status",
  availability_status: "availability_status",
  الحالة: "availability_status",
  description: "description",
  الوصف: "description",
};
/** Loaded only when someone imports a real .xlsx, so the site bundle stays small. */
const XLSX_CDN = "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";
const STATUS_ALIASES: Record<string, string> = {
  available: "available",
  متاحة: "available",
  متاح: "available",
  sold: "sold",
  اتباعت: "sold",
  مباعة: "sold",
  reserved: "sold",
  not_confirmed: "not_confirmed",
  "محتاجة تأكيد": "not_confirmed",
  review_only: "review_only",
  new_launch: "new_launch",
};
const COMPARE_FIELDS: (keyof UnitValues)[] = [
  "unit_type",
  "bedrooms_text",
  "area_sqm",
  "starting_price",
  "down_payment_text",
  "installments_text",
  "delivery_text",
  "finishing",
  "availability_status",
];

interface ParsedRow {
  id?: string;
  values: UnitValues;
  match: AdminUnit | null;
  kind: "new" | "update" | "same" | "error";
  changed: string[];
  error?: string;
}

const normalise = (value: unknown) => (value === null || value === undefined ? "" : String(value).trim());
const numberOf = (value: unknown) => {
  const raw = normalise(value).replace(/[,\s\u066C]/g, "");
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === "," || char === ";") {
      cells.push(cell);
      cell = "";
    } else cell += char;
  }
  cells.push(cell);
  return cells.map((value) => value.trim());
}

async function readRows(file: File): Promise<Record<string, string>[]> {
  if (/\.(xlsx|xls)$/i.test(file.name)) {
    // SheetJS is only needed for Excel files, so it loads on demand instead of shipping with the site.
    const xlsx = (await import(/* @vite-ignore */ (XLSX_CDN as string))) as {
      read: (data: ArrayBuffer, options: unknown) => { SheetNames: string[]; Sheets: Record<string, unknown> };
      utils: { sheet_to_json: (sheet: unknown, options: unknown) => Record<string, string>[] };
    };
    const workbook = xlsx.read(await file.arrayBuffer(), { type: "array" });
    return xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "", raw: false });
  }
  const text = await file.text();
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function toRow(raw: Record<string, string>, units: AdminUnit[]): ParsedRow {
  const values: UnitValues = {};
  let id = "";
  for (const [header, cell] of Object.entries(raw)) {
    const key = HEADER_MAP[header.trim().toLowerCase()] ?? HEADER_MAP[header.trim()];
    if (!key) continue;
    const value = normalise(cell);
    if (key === "id") id = value;
    else if (key === "availability_status") values[key] = value ? STATUS_ALIASES[value.toLowerCase()] ?? STATUS_ALIASES[value] ?? "" : "";
    else if (key === "area_sqm" || key === "starting_price") values[key] = value ? String(numberOf(value) ?? "") : "";
    else values[key] = value;
  }
  for (const key of Object.keys(values) as (keyof UnitValues)[]) if (values[key] === "") delete values[key];

  if (!values.unit_type && !id) return { values, match: null, kind: "error", changed: [], error: "مفيش نوع وحدة" };
  if (values.area_sqm === "" || values.starting_price === "") return { values, match: null, kind: "error", changed: [], error: "رقم غير صالح" };

  const match =
    (id && units.find((unit) => unit.id === id)) ||
    units.find(
      (unit) =>
        normalise(unit.unit_type).toLowerCase() === normalise(values.unit_type).toLowerCase() &&
        Number(unit.area_sqm || 0) === Number(values.area_sqm || 0) &&
        Number(values.area_sqm || 0) > 0,
    ) ||
    null;
  if (id && !match) return { values, match: null, kind: "error", changed: [], error: "الـid مش موجود في المشروع ده" };
  if (!match) return { values, match: null, kind: "new", changed: [] };

  const changed = COMPARE_FIELDS.filter(
    (field) => values[field] !== undefined && normalise(match[field as keyof AdminUnit]) !== normalise(values[field]),
  );
  return { id: match.id, values, match, kind: changed.length ? "update" : "same", changed };
}

export default function ImportDialog({
  projectName,
  units,
  busy,
  onClose,
  onConfirm,
}: {
  projectName: string;
  units: AdminUnit[];
  busy: boolean;
  onClose: () => void;
  onConfirm: (rows: { id?: string; values: UnitValues }[]) => void;
}) {
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setParseError("");
    setFileName(file.name);
    try {
      const raw = await readRows(file);
      if (!raw.length) throw new Error("empty");
      const parsed = raw.map((item) => toRow(item, units));
      if (parsed.every((row) => row.kind === "error" && row.error === "مفيش نوع وحدة")) {
        throw new Error("headers");
      }
      setRows(parsed);
    } catch (error) {
      setRows(null);
      setParseError(
        (error as Error).message === "headers"
          ? "مقدرتش أتعرف على أعمدة الملف. نزّل القالب واتأكد إن أسماء الأعمدة زيه."
          : "الملف فاضي أو مش مقروء",
      );
    }
  }

  function downloadTemplate() {
    const headers = ["unit_type", "bedrooms_text", "area_sqm", "starting_price", "down_payment_text", "installments_text", "delivery_text", "finishing", "availability_status", "description"];
    const sample = ["Apartment", "3 Bedrooms", "170", "12500000", "5%", "8 years", "2029-12-30", "Fully Finished", "available", ""];
    const csv = `\uFEFF${headers.join(",")}\n${sample.join(",")}\n`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "tycoons-units-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const counts = {
    new: rows?.filter((row) => row.kind === "new").length ?? 0,
    update: rows?.filter((row) => row.kind === "update").length ?? 0,
    same: rows?.filter((row) => row.kind === "same").length ?? 0,
    error: rows?.filter((row) => row.kind === "error").length ?? 0,
  };
  const ready = rows?.filter((row) => row.kind === "new" || row.kind === "update") ?? [];

  return (
    <Modal title={`استيراد وحدات — ${projectName}`} onClose={onClose} wide>
      {!rows && (
        <div>
          <p className="text-sm leading-relaxed text-[#5c6a62]">
            ارفع ملف Excel أو CSV فيه وحدات المشروع. هعرض لك معاينة بالجديد والمتغيّر قبل أي حفظ، ومفيش حاجة هتتسجل غير لما توافق.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => fileInput.current?.click()} className="rounded-full bg-[#0d1f18] px-5 py-2.5 text-sm font-black text-white">
              اختار ملف
            </button>
            <button onClick={downloadTemplate} className="rounded-full border border-[#d8c9ab] px-5 py-2.5 text-sm font-black text-[#8a6630]">
              نزّل قالب CSV
            </button>
          </div>
          {parseError && <p className="mt-3 text-sm font-bold text-red-600">{parseError}</p>}
          <p className="mt-4 text-xs text-[#5c6a62]">
            الأعمدة المفهومة: unit_type · bedrooms_text · area_sqm · starting_price · down_payment_text · installments_text · delivery_text ·
            finishing · availability_status · description (والأسماء العربية زي «النوع» و«المساحة» و«السعر» كمان).
          </p>
        </div>
      )}

      {rows && (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-bold" dir="ltr">
              {fileName}
            </span>
            <Badge tone="ok">{counts.new} جديدة</Badge>
            <Badge tone="gold">{counts.update} تعديل</Badge>
            <Badge tone="muted">{counts.same} بدون تغيير</Badge>
            {counts.error > 0 && <Badge tone="error">{counts.error} بها مشكلة</Badge>}
            <button onClick={() => setRows(null)} className="ms-auto underline">
              ملف تاني
            </button>
          </div>
          <div className="max-h-[52vh] overflow-auto rounded-2xl border border-[#efe7d8]">
            <table className="w-full min-w-[720px] text-right text-xs">
              <thead className="sticky top-0 bg-[#f7f2ea] font-black">
                <tr>
                  <th className="p-2">الحالة</th>
                  <th className="p-2">النوع</th>
                  <th className="p-2">المساحة</th>
                  <th className="p-2">السعر</th>
                  <th className="p-2">التغيير</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-t border-[#efe7d8]">
                    <td className="p-2">
                      {row.kind === "new" && <Badge tone="ok">جديدة</Badge>}
                      {row.kind === "update" && <Badge tone="gold">تعديل</Badge>}
                      {row.kind === "same" && <Badge tone="muted">زي ما هي</Badge>}
                      {row.kind === "error" && <Badge tone="error">{row.error}</Badge>}
                    </td>
                    <td className="p-2 font-bold">{String(row.values.unit_type ?? row.match?.unit_type ?? "—")}</td>
                    <td className="p-2">{String(row.values.area_sqm ?? row.match?.area_sqm ?? "—")}</td>
                    <td className="p-2">{formatPrice(row.values.starting_price ?? row.match?.starting_price ?? null)}</td>
                    <td className="p-2 text-[#5c6a62]">
                      {row.kind === "update"
                        ? row.changed
                            .map((field) => {
                              const before = row.match?.[field as keyof AdminUnit] as unknown;
                              const after = row.values[field as keyof UnitValues];
                              const label = UNIT_FIELD_LABELS[field] ?? field;
                              const show = (value: unknown) => {
                                if (field === "availability_status") return STATUS_LABELS[String(value)] ?? String(value || "—");
                                if (field === "starting_price") return formatPrice(value as number);
                                return String(value || "—");
                              };
                              return `${label}: ${show(before)} ← ${show(after)}`;
                            })
                            .join("، ")
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-bold">
              إلغاء
            </button>
            <button
              onClick={() => onConfirm(ready.map((row) => ({ id: row.id, values: row.values })))}
              disabled={busy || !ready.length}
              className="rounded-full bg-[#0d1f18] px-5 py-2 text-sm font-black text-white disabled:opacity-40"
            >
              {busy ? "بيحفظ…" : `طبّق ${ready.length} صف`}
            </button>
          </div>
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        accept=".csv,.xlsx,.xls,text/csv"
        hidden
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </Modal>
  );
}
