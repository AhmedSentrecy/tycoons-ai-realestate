import { useMemo, useState } from "react";
import { hideLegacyDuplicates, type AdminProject } from "../../lib/adminApi";

const AREAS: [RegExp, string][] = [
  [/mostakbal|مستقبل/i, "مستقبل سيتي"],
  [/new alamein|العلمين الجديد/i, "العلمين الجديدة"],
  [/new cairo|fifth|tagamo|التجمع|القاهرة الجديدة|5th/i, "التجمع / القاهرة الجديدة"],
  [/north coast|sahel|ras el|الساحل|alamein|العلمين|hikma|sidi/i, "الساحل الشمالي"],
  [/sokhna|galala|السخنة|الجلالة/i, "العين السخنة"],
  [/zayed|زايد/i, "الشيخ زايد"],
  [/capital|العاصمة/i, "العاصمة الإدارية"],
  [/october|أكتوبر|اكتوبر/i, "6 أكتوبر"],
];
const areaOf = (location: string | null) => AREAS.find(([pattern]) => pattern.test(location || ""))?.[1] ?? "مناطق تانية";

/** What is on the site right now: available units, new this week, split by area and developer. */
export default function InventorySummary({ projects }: { projects: AdminProject[] }) {
  const [open, setOpen] = useState(false);
  const data = useMemo(() => {
    const list = hideLegacyDuplicates(projects).filter((project) => project.slug && project.available_units > 0);
    const byArea = new Map<string, { units: number; projects: number }>();
    const byDev = new Map<string, { units: number; projects: number }>();
    let units = 0;
    let fresh = 0;
    for (const project of list) {
      units += project.available_units;
      fresh += project.new_units_week ?? 0;
      for (const [map, key] of [[byArea, areaOf(project.location)], [byDev, project.developer || "—"]] as const) {
        const entry = map.get(key) ?? { units: 0, projects: 0 };
        entry.units += project.available_units;
        entry.projects += 1;
        map.set(key, entry);
      }
    }
    const sort = (map: Map<string, { units: number; projects: number }>) => [...map.entries()].sort((a, b) => b[1].units - a[1].units);
    return { projects: list.length, units, fresh, developers: byDev.size, areas: sort(byArea), devs: sort(byDev) };
  }, [projects]);

  if (!projects.length) return null;
  const n = (value: number) => new Intl.NumberFormat("en-EG").format(value);

  return (
    <section className="mb-4 rounded-3xl border border-[#e7ddc8] bg-white p-4">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <h2 className="text-sm font-black text-[#14352a]">المعروض على الموقع دلوقتي</h2>
        <Stat value={n(data.units)} label="وحدة متاحة" />
        <Stat value={n(data.projects)} label="مشروع" />
        <Stat value={n(data.developers)} label="مطور" />
        <Stat value={n(data.fresh)} label="وحدة جديدة آخر 7 أيام" />
        <button type="button" onClick={() => setOpen(!open)} className="ms-auto rounded-full border border-[#e0d3bb] px-4 py-1.5 text-xs font-bold">
          {open ? "اقفل التفاصيل" : "حسب المنطقة والمطور"}
        </button>
      </div>
      {open && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Breakdown title="حسب المنطقة" rows={data.areas} total={data.units} />
          <Breakdown title="حسب المطور" rows={data.devs.slice(0, 15)} total={data.units} />
        </div>
      )}
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <b className="block text-xl font-black text-[#a3854e]">{value}</b>
      <span className="text-xs text-[#5c6a62]">{label}</span>
    </div>
  );
}

function Breakdown({ title, rows, total }: { title: string; rows: [string, { units: number; projects: number }][]; total: number }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-black">{title}</h3>
      <ul className="grid gap-1.5">
        {rows.map(([name, value]) => (
          <li key={name} className="grid grid-cols-[1fr_auto] items-center gap-2 text-xs">
            <div>
              <div className="flex justify-between"><span className="font-bold">{name}</span><span className="text-[#5c6a62]">{value.units} وحدة · {value.projects} مشروع</span></div>
              <div className="mt-1 h-1.5 rounded-full bg-[#f1eadc]"><div className="h-full rounded-full bg-[#14352a]" style={{ width: `${Math.max(2, (value.units / Math.max(1, total)) * 100)}%` }} /></div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
