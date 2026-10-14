import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { adminApi, hideLegacyDuplicates, mediaImages } from "@/lib/adminApi";
import type { AdminProject, HomepageLaunchItem } from "@/lib/adminApi";
import { useAdmin } from "./AdminContext";

/** Admin control for the homepage "بتتطرح دلوقتي" carousel: pick projects, order, badge and photo. */
export default function HomepageLaunchesTab({ projects }: { projects: AdminProject[] }) {
  const { token, notify, handleError } = useAdmin();
  const [items, setItems] = useState<HomepageLaunchItem[]>([]);
  const [badges, setBadges] = useState<string[]>(["جديد"]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    adminApi.homepageLaunches(token)
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setBadges(result.badges.length ? result.badges : ["جديد"]);
      })
      .catch(handleError)
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [token, handleError]);

  const byId = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const selectedIds = new Set(items.map((item) => item.project_id));
  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return hideLegacyDuplicates(projects)
      .filter((project) => project.slug && !selectedIds.has(project.id))
      .filter((project) => !q || `${project.name} ${project.developer ?? ""} ${project.location ?? ""}`.toLowerCase().includes(q))
      .slice(0, 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, query, items]);

  const update = (index: number, patch: Partial<HomepageLaunchItem>) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const move = (index: number, dir: -1 | 1) =>
    setItems((current) => {
      const next = [...current];
      const target = index + dir;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const add = (project: AdminProject) => {
    if (items.length >= 12) return notify("أقصى عدد 12 مشروع", "error");
    setItems((current) => [...current, { project_id: project.id, badge: badges[0], image_url: mediaImages(project)[0] ?? "" }]);
  };
  const save = async () => {
    setSaving(true);
    try {
      const result = await adminApi.saveHomepageLaunches(token, items.map(({ project_id, badge, image_url }) => ({ project_id, badge, image_url })));
      setItems(result.items);
      notify("اتحفظ — الصفحة الرئيسية هتعرض المشاريع دي بالترتيب ده");
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-6 text-center font-bold text-[#5c6a62]">جاري التحميل…</p>;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <section className="rounded-3xl border border-[#e7ddc8] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-[#14352a]">بتتطرح دلوقتي — الصفحة الرئيسية</h2>
            <p className="mt-1 text-sm text-[#5c6a62]">اختار المشاريع الجديدة وترتيبها والصورة اللي تظهر لكل مشروع. لو القائمة فاضية، الصفحة الرئيسية بتعرض المشاريع الافتراضية.</p>
          </div>
          <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-[#14352a] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? "بيتحفظ…" : "احفظ"}
          </button>
        </div>
        {!items.length && <p className="mt-6 rounded-2xl bg-[#f6f1e7] p-5 text-center text-sm text-[#5c6a62]">لسه مفيش مشاريع مختارة. ضيف من القائمة اللي جنبك.</p>}
        <ol className="mt-5 grid gap-4">
          {items.map((item, index) => {
            const project = byId.get(item.project_id);
            const images = project ? mediaImages(project) : [];
            return (
              <li key={item.project_id} className="rounded-2xl border border-[#e7ddc8] p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#14352a] text-sm font-bold text-white">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{project?.name ?? item.name ?? item.project_id}</p>
                    <p className="truncate text-xs text-[#5c6a62]">{project?.developer} · {project?.location}</p>
                  </div>
                  <select value={item.badge} onChange={(event) => update(index, { badge: event.target.value })} className="rounded-full border border-[#e0d3bb] px-3 py-2 text-sm">
                    {badges.map((badge) => <option key={badge} value={badge}>{badge}</option>)}
                  </select>
                  <button type="button" aria-label="لفوق" onClick={() => move(index, -1)} className="grid h-9 w-9 place-items-center rounded-full border border-[#e0d3bb]"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" aria-label="لتحت" onClick={() => move(index, 1)} className="grid h-9 w-9 place-items-center rounded-full border border-[#e0d3bb]"><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" aria-label="شيل" onClick={() => setItems((current) => current.filter((_, i) => i !== index))} className="grid h-9 w-9 place-items-center rounded-full border border-red-200 text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
                {images.length ? (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {images.map((src) => (
                      <button key={src} type="button" onClick={() => update(index, { image_url: src })} className={`shrink-0 overflow-hidden rounded-xl border-2 ${item.image_url === src ? "border-[#c49b5f]" : "border-transparent opacity-70 hover:opacity-100"}`} aria-label="اختار الصورة دي">
                        <img src={src} alt="" loading="lazy" className="h-20 w-32 object-cover" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-amber-700">المشروع ده ملوش صور — ارفع صور من تبويب "الصور والميديا".</p>
                )}
              </li>
            );
          })}
        </ol>
      </section>
      <section className="rounded-3xl border border-[#e7ddc8] bg-white p-5">
        <h3 className="font-extrabold text-[#14352a]">ضيف مشروع</h3>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث باسم المشروع أو المطور أو المنطقة" className="mt-3 w-full rounded-full border border-[#e0d3bb] px-4 py-2.5 text-sm outline-none focus:border-[#c49b5f]" />
        <ul className="mt-3 grid max-h-[560px] gap-2 overflow-y-auto">
          {candidates.map((project) => {
            const cover = mediaImages(project)[0];
            return (
              <li key={project.id} className="flex items-center gap-3 rounded-2xl border border-[#eee5d6] p-2">
                {cover ? <img src={cover} alt="" loading="lazy" className="h-12 w-16 rounded-lg object-cover" /> : <span className="h-12 w-16 rounded-lg bg-[#f1ebdc]" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{project.name}</p>
                  <p className="truncate text-xs text-[#5c6a62]">{project.developer} · {project.available_units} وحدة متاحة</p>
                </div>
                <button type="button" onClick={() => add(project)} aria-label="ضيف" className="grid h-9 w-9 place-items-center rounded-full bg-[#c49b5f] text-white"><Plus className="h-4 w-4" /></button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
