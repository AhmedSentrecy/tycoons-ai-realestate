import { useEffect, useMemo, useState } from "react";
import {
  adminApi,
  formatPrice,
  hideLegacyDuplicates,
  mediaImages,
  STATUS_LABELS,
  FINISHING_LABELS,
  WA_FILL_LABELS,
  WA_SUGGEST_LABELS,
  type AdminProject,
  type AdminUnit,
  type WaGroup,
  type WaInboxItem,
  type WaInboxStatus,
  type WaInboxValues,
  type WaFillSource,
  type WaProjectSuggestion,
} from "../../lib/adminApi";
import { useAdmin } from "./AdminContext";
import ProjectForm, { type NewProject } from "./ProjectForm";
import { FinishingSelect, SearchSelect } from "./SearchSelect";
import { Badge, Chip, EmptyState, inputClass, Modal } from "./ui";

/** Bucket for units whose project name did not match any project on the site. */
const UNMATCHED = "__unmatched__";

/**
 * "وحدات واتساب": units Claude read from the WhatsApp developer groups wait here.
 * Same layout as the units tab: projects on the right, that project's WhatsApp units on the left,
 * with the units already on the site underneath to compare. Nothing shows on the site until "وافق".
 */
export default function WhatsAppInboxTab({ projects, onChanged }: { projects: AdminProject[]; onChanged: () => void }) {
  const { token, notify, handleError } = useAdmin();
  const [status, setStatus] = useState<WaInboxStatus>("pending");
  const [items, setItems] = useState<WaInboxItem[]>([]);
  const [matches, setMatches] = useState<Map<string, AdminUnit>>(new Map());
  const [duplicates, setDuplicates] = useState<Record<string, number[]>>({});
  const [autoFilled, setAutoFilled] = useState<Record<string, Record<string, WaFillSource>>>({});
  const [rejectedBefore, setRejectedBefore] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<Record<string, WaProjectSuggestion>>({});
  const [finishingSuggestions, setFinishingSuggestions] = useState<Record<string, string>>({});
  const [finishingOpen, setFinishingOpen] = useState(false);
  const [counts, setCounts] = useState<Record<WaInboxStatus, number>>({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<WaInboxItem | null>(null);
  const [bucket, setBucket] = useState("");
  const [query, setQuery] = useState("");
  const [unitQuery, setUnitQuery] = useState("");
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [unitsState, setUnitsState] = useState<{ projectId: string; units: AdminUnit[] }>({ projectId: "", units: [] });

  const reload = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };
  const changeStatus = (next: WaInboxStatus) => {
    if (next === status) return;
    setLoading(true);
    setStatus(next);
  };

  useEffect(() => {
    let active = true;
    adminApi
      .waInbox(token, status)
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setMatches(new Map(result.matches.map((unit) => [unit.id, unit])));
        setDuplicates(result.duplicates ?? {});
        setAutoFilled(result.auto_filled ?? {});
        setRejectedBefore(result.previously_rejected ?? {});
        setSuggestions(result.suggestions ?? {});
        setFinishingSuggestions(result.finishing_suggestions ?? {});
        setCounts(result.counts);
        setSelected(new Set());
      })
      .catch((error) => active && handleError(error))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token, status, reloadKey, handleError]);

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  /** Right-hand list: one row per project that has WhatsApp units (+ one row for the unmatched ones). */
  const buckets = useMemo(() => {
    const map = new Map<string, WaInboxItem[]>();
    for (const item of items) {
      const id = item.project_id && projectById.has(item.project_id) ? item.project_id : UNMATCHED;
      map.set(id, [...(map.get(id) ?? []), item]);
    }
    const needle = query.trim().toLowerCase();
    return [...map.entries()]
      .map(([id, list]) => ({ id, list, project: projectById.get(id) ?? null }))
      .filter(({ project, list }) =>
        !needle ||
        [project?.name, project?.developer, project?.area_group, ...list.map((item) => `${item.project_name} ${item.source_group}`)].some((value) =>
          String(value || "").toLowerCase().includes(needle),
        ),
      )
      .sort((a, b) => Number(b.id === UNMATCHED) - Number(a.id === UNMATCHED) || b.list.length - a.list.length);
  }, [items, projectById, query]);

  // Keep a valid bucket selected (first one by default, as the units tab keeps a project open).
  const activeBucket = buckets.find((row) => row.id === bucket) ?? buckets[0] ?? null;
  const activeProject = activeBucket?.project ?? null;
  // Unmatched units with a suggested project first (one click each).
  const bucketRows = useMemo(() => {
    const list = activeBucket?.list ?? [];
    return activeBucket?.project ? list : [...list].sort((a, b) => Number(Boolean(suggestions[String(b.id)])) - Number(Boolean(suggestions[String(a.id)])));
  }, [activeBucket, suggestions]);
  // Search inside the open list: every word must appear somewhere in the unit (name, type, area, price, group…).
  const rows = useMemo(() => {
    const words = searchText(unitQuery).split(/\s+/).filter(Boolean);
    if (!words.length) return bucketRows;
    return bucketRows.filter((item) => {
      const suggestion = suggestions[String(item.id)];
      const haystack = searchText(
        [
          item.project_name, item.developer, item.location, item.area_group, item.unit_type, item.bedrooms_text, item.area_sqm,
          item.starting_price, item.down_payment_text, item.installments_text, item.delivery_text, item.finishing,
          item.description, item.source_group, item.sender, suggestion?.name,
        ].join(" "),
      );
      return words.every((word) => haystack.includes(word));
    });
  }, [bucketRows, unitQuery, suggestions]);

  // Units already on the site for the open project, to compare and to pick photos from.
  const activeProjectId = activeProject?.id ?? "";
  useEffect(() => {
    if (!activeProjectId) return;
    let active = true;
    adminApi
      .units(token, activeProjectId)
      .then((result) => active && setUnitsState({ projectId: activeProjectId, units: result.units }))
      .catch(() => active && setUnitsState({ projectId: activeProjectId, units: [] }));
    return () => {
      active = false;
    };
  }, [token, activeProjectId, reloadKey]);
  const siteUnits = unitsState.projectId === activeProjectId ? unitsState.units : [];

  const quickApprove = async (item: WaInboxItem) => {
    if (missing(item).length) return setEditing(item);
    setBusyId(item.id);
    try {
      const result = await adminApi.waInboxApprove(token, item.id, {}, item.match_unit_id || "", "available");
      notify(result.action === "update" ? "اتحدثت الوحدة الموجودة على الموقع" : "اتضافت وحدة جديدة على الموقع");
      onChanged();
      reload();
    } catch (error) {
      handleError(error);
    } finally {
      setBusyId(null);
    }
  };

  /** Confirms the suggested (or picked) project: every unit with the same WhatsApp name goes with it. */
  const linkProject = async (item: WaInboxItem, projectId: string, projectName: string) => {
    setBusyId(item.id);
    try {
      const result = await adminApi.waInboxLink(token, item.id, projectId);
      notify(`اتربطت ${result.linked} وحدة بـ ${projectName}${result.remembered ? " — والاسم ده هيتربط لوحده بعد كده" : ""}`);
      reload();
    } catch (error) {
      handleError(error);
    } finally {
      setBusyId(null);
    }
  };

  /** Default finishing of the open project (units without one take it). */
  const saveFinishing = async (finishing: string) => {
    if (!activeProject) return;
    try {
      const result = await adminApi.projectUpdate(token, activeProject.id, { finishing });
      notify(result.applied ? `التشطيب الافتراضي لـ ${activeProject.name}: ${finishing || "مش محدد"}` : "مفيش تغيير");
      setFinishingOpen(false);
      onChanged();
      reload();
    } catch (error) {
      handleError(error);
    }
  };

  const nameKey = (value: string | null) => String(value || "").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, "");

  const reject = async (ids: number[]) => {
    if (!ids.length) return;
    if (!window.confirm(ids.length === 1 ? "ترفض الوحدة دي؟" : `ترفض ${ids.length} وحدة؟`)) return;
    try {
      const result = await adminApi.waInboxReject(token, ids);
      notify(`اترفض ${result.rejected}`);
      reload();
    } catch (error) {
      handleError(error);
    }
  };

  const toggleSelect = (id: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const rowIds = rows.map((item) => item.id);
  const allChecked = rowIds.length > 0 && rowIds.every((id) => selected.has(id));
  const pending = status === "pending";

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <aside className={`rounded-3xl border border-[#e7ddc8] bg-white p-3 ${bucket ? "hidden lg:block" : ""}`}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-lg font-black">وحدات واتساب</h2>
          <div className="flex gap-1">
            <button onClick={reload} className="rounded-full bg-[#f1eadc] px-3 py-1.5 text-xs font-black">
              تحديث
            </button>
            <button onClick={() => setGroupsOpen(true)} className="rounded-full border border-[#d8c9ab] px-3 py-1.5 text-xs font-black">
              الجروبات
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={status === "pending"} onClick={() => changeStatus("pending")}>
            مستنية ({counts.pending})
          </Chip>
          <Chip active={status === "approved"} onClick={() => changeStatus("approved")}>
            اتوافق ({counts.approved})
          </Chip>
          <Chip active={status === "rejected"} onClick={() => changeStatus("rejected")}>
            اترفض ({counts.rejected})
          </Chip>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ابحث بالمشروع أو المطور أو الجروب…"
          className={`${inputClass} mt-2`}
        />
        <div className="mt-3 max-h-[calc(100vh-260px)] space-y-1 overflow-y-auto">
          {loading && <p className="p-4 text-center text-sm font-bold text-[#5c6a62]">جاري التحميل…</p>}
          {!loading && !buckets.length && <p className="p-4 text-center text-sm font-bold text-[#5c6a62]">مفيش وحدات هنا</p>}
          {!loading &&
            buckets.map(({ id, list, project }) => {
              const active = id === activeBucket?.id;
              const image = project ? mediaImages(project)[0] : "";
              const dupes = list.filter((item) => duplicates[String(item.id)]?.length).length;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setBucket(id);
                    setSelected(new Set());
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl p-2 text-right transition ${active ? "bg-[#0d1f18] text-white" : "hover:bg-[#f7f2ea]"}`}
                >
                  {id === UNMATCHED ? (
                    <span className="grid h-12 w-16 shrink-0 place-items-center rounded-lg bg-red-50 text-[10px] font-black text-red-600">مش متطابقة</span>
                  ) : image ? (
                    <img src={image} alt="" loading="lazy" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="grid h-12 w-16 shrink-0 place-items-center rounded-lg bg-[#f1eadc] text-[10px] font-black text-[#5c6a62]">بدون صور</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black">{project ? project.name : "مشاريع مش موجودة على الموقع"}</span>
                    <span className={`block truncate text-xs ${active ? "text-white/70" : "text-[#5c6a62]"}`}>
                      {project ? `${project.developer || "—"} · ${project.area_group || project.location || "—"}` : "اختار المشروع أو اعمله جديد"}
                      {dupes ? ` · ${dupes} مكررة` : ""}
                    </span>
                  </span>
                  <Badge tone={id === UNMATCHED ? "error" : "pending"}>{list.length}</Badge>
                </button>
              );
            })}
        </div>
      </aside>

      <section className={bucket ? "" : "hidden lg:block"}>
        {!loading && !activeBucket && <EmptyState title={pending ? "مفيش وحدات مستنية" : "مفيش حاجة هنا"} text="أول ما مطور ينزل وحدات في الجروب هتظهر هنا." />}
        {activeBucket && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-[#e7ddc8] bg-white">
              <div className="flex flex-wrap items-center gap-2 border-b border-[#efe7d8] p-4">
                <button onClick={() => setBucket("")} className="rounded-full bg-[#f7f2ea] px-3 py-1.5 text-sm font-bold lg:hidden">
                  → رجوع
                </button>
                <div className="me-auto min-w-0">
                  <h2 className="truncate text-xl font-black">{activeProject ? activeProject.name : "وحدات مشروعها مش موجود على الموقع"}</h2>
                  <p className="text-xs text-[#5c6a62]">
                    {activeProject
                      ? `${activeProject.developer || "—"} · ${[activeProject.sub_area, activeProject.area_group].filter(Boolean).join(", ") || activeProject.location || "—"} · ${siteUnits.length} وحدة على الموقع`
                      : "دوس «تعديل» على كل وحدة واختار مشروعها، أو اعمل المشروع جديد من نفس الشاشة."}
                  </p>
                </div>
                <input
                  type="search"
                  value={unitQuery}
                  onChange={(event) => { setUnitQuery(event.target.value); setSelected(new Set()); }}
                  placeholder="ابحث في الوحدات: اسم، نوع، مساحة، سعر، جروب…"
                  className={`${inputClass} w-full sm:w-80`}
                />
                {unitQuery.trim() && <span className="text-xs font-bold text-[#5c6a62]">{rows.length} من {bucketRows.length}</span>}
                {pending && selected.size > 0 && (
                  <button onClick={() => void reject([...selected])} className="rounded-full bg-red-50 px-4 py-2 text-sm font-black text-red-600">
                    ارفض المختار ({selected.size})
                  </button>
                )}
              </div>
              {activeProject && pending && (
                <FinishingBar
                  current={activeProject.finishing || ""}
                  suggested={finishingSuggestions[activeProject.id] || ""}
                  onConfirm={(value) => void saveFinishing(value)}
                  onEdit={() => setFinishingOpen(true)}
                />
              )}

              <div className="overflow-x-auto p-4">
                <table className="w-full min-w-[900px] text-right text-sm">
                  <thead className="text-xs font-black text-[#5c6a62]">
                    <tr className="border-b border-[#efe7d8]">
                      {pending && (
                        <th className="w-8 p-2">
                          <input
                            type="checkbox"
                            aria-label="تحديد الكل"
                            checked={allChecked}
                            onChange={() => setSelected(allChecked ? new Set() : new Set(rowIds))}
                            className="h-4 w-4 cursor-pointer accent-[#0d1f18]"
                          />
                        </th>
                      )}
                      {!activeProject && <th className="p-2">المشروع (من الجروب)</th>}
                      <th className="p-2">النوع</th>
                      <th className="p-2">المساحة</th>
                      <th className="p-2">السعر</th>
                      <th className="p-2">المقدم / التقسيط / التشطيب</th>
                      <th className="p-2">الاستلام</th>
                      <th className="p-2">جاية من</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => {
                      const match = item.match_unit_id ? matches.get(item.match_unit_id) ?? null : null;
                      const gaps = missing(item);
                      const twins = (duplicates[String(item.id)] ?? []).map((id) => itemById.get(id)).filter(Boolean) as WaInboxItem[];
                      const filled = autoFilled[String(item.id)] ?? {};
                      const rejectedAt = rejectedBefore[String(item.id)];
                      return (
                        <tr key={item.id} className={`border-b border-[#f4eee2] align-top ${selected.has(item.id) ? "bg-[#fffaf1]" : ""}`}>
                          {pending && (
                            <td className="p-2">
                              <input
                                type="checkbox"
                                aria-label="اختيار"
                                checked={selected.has(item.id)}
                                onChange={() => toggleSelect(item.id)}
                                className="mt-1 h-4 w-4 cursor-pointer accent-[#0d1f18]"
                              />
                            </td>
                          )}
                          {!activeProject && (
                            <td className="p-2">
                              <span className="font-black">{item.project_name || "—"}</span>
                              <span className="block text-xs text-[#5c6a62]">{item.developer || ""}</span>
                              {pending && (() => {
                                const suggestion = suggestions[String(item.id)];
                                const same = rows.filter((row) => row.id !== item.id && nameKey(row.project_name) === nameKey(item.project_name)).length;
                                if (!suggestion)
                                  return (
                                    <button onClick={() => setEditing(item)} className="mt-1 rounded-lg border border-dashed border-[#d8c9ab] px-2 py-1 text-[11px] font-black text-[#8a6630]">
                                      اختار المشروع أو اعمله جديد
                                    </button>
                                  );
                                return (
                                  <div className="mt-1 rounded-xl bg-[#fffaf1] p-2 ring-1 ring-[#ecdcbc]">
                                    <span className="block text-[11px] text-[#5c6a62]">تقصد ({WA_SUGGEST_LABELS[suggestion.kind]}):</span>
                                    <span className="block text-xs font-black" dir="ltr">{suggestion.name}؟</span>
                                    <div className="mt-1 flex gap-1">
                                      <button
                                        onClick={() => void linkProject(item, suggestion.project_id, suggestion.name)}
                                        disabled={busyId === item.id}
                                        className="rounded-lg bg-[#0d1f18] px-2 py-1 text-[11px] font-black text-white disabled:opacity-40"
                                      >
                                        {busyId === item.id ? "…" : `تأكيد${same ? ` (+${same})` : ""}`}
                                      </button>
                                      <button onClick={() => setEditing(item)} className="rounded-lg bg-white px-2 py-1 text-[11px] font-black ring-1 ring-[#e0d3bb]">
                                        غيّر
                                      </button>
                                    </div>
                                    {same > 0 && <span className="mt-1 block text-[10px] text-[#5c6a62]">هيتربط معاها {same} وحدة بنفس الاسم</span>}
                                  </div>
                                );
                              })()}
                            </td>
                          )}
                          <td className="p-2">
                            <span className="font-black">{item.unit_type || "—"}</span>
                            <span className="block text-xs text-[#5c6a62]">{item.bedrooms_text || ""}</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {match && <Badge tone="gold">هتحدّث وحدة موجودة</Badge>}
                              {twins.length > 0 && <Badge tone="pending">مكررة ×{twins.length + 1}</Badge>}
                              {rejectedAt && <Badge tone="error">اترفضت قبل كده · {when(rejectedAt)}</Badge>}
                              {item.status === "approved" && <Badge tone="ok">اتوافق</Badge>}
                              {item.status === "rejected" && <Badge tone="muted">اترفض</Badge>}
                            </div>
                          </td>
                          <td className="p-2">{Number(item.area_sqm) ? `${Number(item.area_sqm)} م²` : "—"}</td>
                          <td className="p-2 font-bold">
                            {formatPrice(item.starting_price)}
                            {match && Number(match.starting_price) > 0 && (
                              <span className="block text-[11px] font-normal text-[#5c6a62]">الحالي: {formatPrice(match.starting_price)}</span>
                            )}
                          </td>
                          <td className="p-2 text-xs text-[#5c6a62]">
                            {item.down_payment_text || "—"}
                            <AutoMark source={filled.down_payment_text} />
                            <span className="block">
                              {item.installments_text || ""}
                              <AutoMark source={filled.installments_text} />
                            </span>
                            {item.finishing && (
                              <span className="block">
                                {item.finishing}
                                <AutoMark source={filled.finishing} />
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-xs text-[#5c6a62]">
                            {item.delivery_text || "—"}
                            <AutoMark source={filled.delivery_text} />
                          </td>
                          <td className="p-2 text-xs text-[#5c6a62]">
                            <span className="block font-bold text-[#1b2420]">{item.source_group || "جروب"}</span>
                            {when(item.created_at)}
                            {twins.length > 0 && (
                              <span className="mt-1 block text-[11px] text-amber-700">
                                برضه في: {[...new Set(twins.map((twin) => twin.source_group || "جروب"))].join("، ")}
                              </span>
                            )}
                            {pending && gaps.length > 0 && <span className="mt-1 block font-bold text-red-600">ناقص: {gaps.join("، ")}</span>}
                          </td>
                          <td className="p-2">
                            {pending && (
                              <div className="flex flex-wrap justify-end gap-1">
                                <button onClick={() => setEditing(item)} className="rounded-lg bg-[#f7f2ea] px-2 py-1 text-xs font-black">
                                  تعديل وصور
                                </button>
                                <button onClick={() => void reject([item.id])} className="rounded-lg bg-white px-2 py-1 text-xs font-black text-red-600">
                                  ارفض
                                </button>
                                <button
                                  onClick={() => void quickApprove(item)}
                                  disabled={busyId === item.id}
                                  className="rounded-lg bg-[#0d1f18] px-2 py-1 text-xs font-black text-white disabled:opacity-40"
                                >
                                  {busyId === item.id ? "…" : "وافق"}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {!rows.length && unitQuery.trim() && (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-sm text-[#5c6a62]">مفيش وحدة فيها «{unitQuery.trim()}».</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {activeProject && (
              <div className="rounded-3xl border border-[#e7ddc8] bg-white p-4">
                <h3 className="mb-2 text-base font-black">الوحدات الموجودة على الموقع في {activeProject.name}</h3>
                {!siteUnits.length ? (
                  <p className="p-4 text-center text-sm text-[#5c6a62]">مفيش وحدات للمشروع ده على الموقع لسه.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-right text-sm">
                      <thead className="text-xs font-black text-[#5c6a62]">
                        <tr className="border-b border-[#efe7d8]">
                          <th className="p-2">النوع</th>
                          <th className="p-2">المساحة</th>
                          <th className="p-2">السعر</th>
                          <th className="p-2">المقدم / التقسيط</th>
                          <th className="p-2">الاستلام</th>
                          <th className="p-2">الحالة</th>
                          <th className="p-2">صور</th>
                        </tr>
                      </thead>
                      <tbody>
                        {siteUnits.map((unit) => {
                          const touched = rows.some((item) => item.match_unit_id === unit.id);
                          return (
                            <tr key={unit.id} className={`border-b border-[#f4eee2] ${touched ? "bg-[#fffaf1]" : ""}`}>
                              <td className="p-2">
                                <span className="font-black">{unit.unit_type || "—"}</span>
                                <span className="block text-xs text-[#5c6a62]">{unit.bedrooms_text || ""}</span>
                                {touched && <Badge tone="gold">جاله تحديث من واتساب</Badge>}
                              </td>
                              <td className="p-2">{unit.area_sqm ? `${unit.area_sqm} م²` : "—"}</td>
                              <td className="p-2 font-bold">{formatPrice(unit.starting_price)}</td>
                              <td className="p-2 text-xs text-[#5c6a62]">
                                {unit.down_payment_text || "—"}
                                <span className="block">{unit.installments_text || ""}</span>
                              </td>
                              <td className="p-2 text-xs text-[#5c6a62]">{unit.delivery_text || "—"}</td>
                              <td className="p-2">
                                <Badge tone={unit.availability_status === "available" ? "ok" : "muted"}>
                                  {STATUS_LABELS[String(unit.availability_status)] ?? unit.availability_status}
                                </Badge>
                              </td>
                              <td className="p-2 text-xs">{mediaImages(unit).length || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {editing && (
        <EditDialog
          item={editing}
          suggestion={suggestions[String(editing.id)] ?? null}
          filled={autoFilled[String(editing.id)] ?? {}}
          rejectedAt={rejectedBefore[String(editing.id)] ?? ""}
          projects={projects}
          onProjectCreated={onChanged}
          onClose={() => setEditing(null)}
          onDone={async (message) => {
            setEditing(null);
            notify(message);
            onChanged();
            reload();
          }}
        />
      )}
      {groupsOpen && <GroupsDialog onClose={() => setGroupsOpen(false)} />}
      {finishingOpen && activeProject && (
        <FinishingDialog
          project={activeProject}
          suggested={finishingSuggestions[activeProject.id] || ""}
          onClose={() => setFinishingOpen(false)}
          onSave={saveFinishing}
        />
      )}
    </div>
  );
}

const finishingText = (value: string) => (FINISHING_LABELS[value] ? `${value} (${FINISHING_LABELS[value]})` : value);

/** The open project's default finishing: shown, suggested from its units, or missing. */
function FinishingBar({ current, suggested, onConfirm, onEdit }: { current: string; suggested: string; onConfirm: (value: string) => void; onEdit: () => void }) {
  if (current)
    return (
      <div className="flex flex-wrap items-center gap-2 border-b border-[#efe7d8] bg-[#fbf8f2] px-4 py-2 text-xs">
        <span className="font-bold text-[#5c6a62]">التشطيب الافتراضي للمرحلة:</span>
        <b dir="ltr">{finishingText(current)}</b>
        <span className="text-[#5c6a62]">— أي وحدة من غير تشطيب بتاخده</span>
        <button onClick={onEdit} className="ms-auto rounded-full bg-white px-3 py-1 font-black ring-1 ring-[#e0d3bb]">تعديل</button>
      </div>
    );
  if (suggested)
    return (
      <div className="flex flex-wrap items-center gap-2 border-b border-[#ecdcbc] bg-[#fffaf1] px-4 py-2 text-xs">
        <span className="font-bold">كل وحدات المرحلة دي على الموقع تشطيبها</span>
        <b dir="ltr">{finishingText(suggested)}</b>
        <span className="text-[#5c6a62]">— تخليه التشطيب الافتراضي؟</span>
        <span className="ms-auto flex gap-1">
          <button onClick={() => onConfirm(suggested)} className="rounded-full bg-[#0d1f18] px-3 py-1 font-black text-white">تأكيد</button>
          <button onClick={onEdit} className="rounded-full bg-white px-3 py-1 font-black ring-1 ring-[#e0d3bb]">اختار غيره</button>
        </span>
      </div>
    );
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[#efe7d8] px-4 py-2 text-xs">
      <span className="text-[#5c6a62]">المرحلة دي مالهاش تشطيب افتراضي، فالوحدات اللي من غير تشطيب بتفضل فاضية.</span>
      <button onClick={onEdit} className="ms-auto rounded-full border border-[#d8c9ab] px-3 py-1 font-black text-[#8a6630]">حدّد التشطيب</button>
    </div>
  );
}

function FinishingDialog({ project, suggested, onClose, onSave }: { project: AdminProject; suggested: string; onClose: () => void; onSave: (value: string) => Promise<void> }) {
  const [value, setValue] = useState(project.finishing || suggested);
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={`التشطيب الافتراضي — ${project.name}`} onClose={onClose}>
      <p className="mb-3 text-sm text-[#5c6a62]">
        أي وحدة جاية من الواتساب للمرحلة دي من غير تشطيب هتاخد التشطيب ده (وعليها علامة «تلقائي»). لو الرسالة ذكرت تشطيب تاني، اللي في الرسالة هو اللي بيتحط.
      </p>
      <div className="min-h-[330px]">
        <FinishingSelect value={value} onChange={setValue} />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm font-bold">إلغاء</button>
        <button
          type="button"
          disabled={busy || value === (project.finishing || "")}
          onClick={async () => {
            setBusy(true);
            await onSave(value);
            setBusy(false);
          }}
          className="rounded-full bg-[#0d1f18] px-5 py-2 text-sm font-black text-white disabled:opacity-40"
        >
          {busy ? "بيحفظ…" : "احفظ"}
        </button>
      </div>
    </Modal>
  );
}

/** Small grey note after a detail the message did not give (filled from the site). */
function AutoMark({ source }: { source?: WaFillSource }) {
  if (!source) return null;
  return (
    <span title={`الرسالة ماذكرتهاش — ${WA_FILL_LABELS[source]}`} className="ms-1 rounded bg-sky-50 px-1 text-[10px] font-black text-sky-700">
      تلقائي
    </span>
  );
}

/** Fields that must be filled before the unit can go on the site. */
function missing(item: Pick<WaInboxItem, "project_id" | "unit_type" | "area_sqm" | "starting_price">) {
  const out: string[] = [];
  if (!item.project_id) out.push("المشروع");
  if (!item.unit_type) out.push("النوع");
  if (!Number(item.area_sqm)) out.push("المساحة");
  if (!Number(item.starting_price)) out.push("السعر");
  return out;
}

function when(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ar-EG", { timeZone: "Africa/Cairo", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

const TEXT_INPUTS: { key: keyof WaInboxValues; label: string; placeholder: string }[] = [
  { key: "unit_type", label: "النوع *", placeholder: "Apartment / Villa / Chalet" },
  { key: "bedrooms_text", label: "الغرف", placeholder: "3 Bedrooms" },
  { key: "down_payment_text", label: "المقدم", placeholder: "10%" },
  { key: "installments_text", label: "التقسيط", placeholder: "8 years" },
  { key: "delivery_text", label: "الاستلام", placeholder: "2029" },
  { key: "finishing", label: "التشطيب", placeholder: "Fully Finished" },
  { key: "location", label: "المنطقة (للوحدة)", placeholder: "سيبها فاضية وتاخد منطقة المشروع" },
];

/** Every field of the unit in one form, plus the project's photos to attach: edit once, then save or approve once. */
function EditDialog({
  item,
  suggestion,
  filled,
  rejectedAt,
  projects,
  onProjectCreated,
  onClose,
  onDone,
}: {
  item: WaInboxItem;
  suggestion: WaProjectSuggestion | null;
  filled: Record<string, WaFillSource>;
  rejectedAt: string;
  projects: AdminProject[];
  onProjectCreated: () => void;
  onClose: () => void;
  onDone: (message: string) => Promise<void>;
}) {
  const { token, handleError, notify } = useAdmin();
  const [values, setValues] = useState<WaInboxValues>({
    project_id: item.project_id ?? "",
    location: item.location ?? "",
    unit_type: item.unit_type ?? "",
    bedrooms_text: item.bedrooms_text ?? "",
    area_sqm: item.area_sqm ?? "",
    starting_price: item.starting_price ?? "",
    down_payment_text: item.down_payment_text ?? "",
    installments_text: item.installments_text ?? "",
    delivery_text: item.delivery_text ?? "",
    finishing: item.finishing ?? "",
    description: item.description ?? "",
  });
  const [replaceId, setReplaceId] = useState(item.match_unit_id ?? "");
  const [availability, setAvailability] = useState<"available" | "new_launch">("available");
  const [unitsState, setUnitsState] = useState<{ projectId: string; units: AdminUnit[] }>({ projectId: "", units: [] });
  const [images, setImages] = useState<string[]>([]);
  const [extraProjects, setExtraProjects] = useState<AdminProject[]>([]);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  const allProjects = useMemo(() => [...extraProjects, ...projects.filter((row) => !extraProjects.some((extra) => extra.id === row.id))], [projects, extraProjects]);
  const projectId = String(values.project_id || "");
  const liveProjects = useMemo(() => hideLegacyDuplicates(allProjects), [allProjects]);
  const project = allProjects.find((row) => row.id === projectId) ?? null;
  const projectOptions = useMemo(
    () =>
      [...(project && !liveProjects.includes(project) ? [project] : []), ...liveProjects].map((row) => ({
        value: row.id,
        label: `${row.name} — ${row.developer ?? ""}`,
        hint: row.area_group || row.location || "",
      })),
    [liveProjects, project],
  );

  // Units of the chosen project: which one this replaces (or none = new unit) and their photos.
  const units = useMemo(() => (unitsState.projectId === projectId ? unitsState.units : []), [unitsState, projectId]);
  useEffect(() => {
    if (!projectId) return;
    let active = true;
    adminApi
      .units(token, projectId)
      .then((result) => active && setUnitsState({ projectId, units: result.units }))
      .catch(() => active && setUnitsState({ projectId, units: [] }));
    return () => {
      active = false;
    };
  }, [token, projectId]);

  /** Photos already on Supabase for this project: the project's own, then each unit's. */
  const photoGroups = useMemo(() => {
    const groups: { label: string; urls: string[] }[] = [];
    if (project) groups.push({ label: `صور المشروع (${project.name})`, urls: mediaImages(project) });
    for (const unit of units) {
      const urls = mediaImages(unit).filter((url) => !groups.some((group) => group.urls.includes(url)));
      if (urls.length) groups.push({ label: `${unit.unit_type || "وحدة"}${unit.area_sqm ? ` ${unit.area_sqm} م²` : ""}`, urls });
    }
    return groups.filter((group) => group.urls.length);
  }, [project, units]);
  const replacing = units.find((unit) => unit.id === replaceId) ?? null;

  const set = (key: keyof WaInboxValues, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const toggleImage = (url: string) => setImages((current) => (current.includes(url) ? current.filter((value) => value !== url) : [...current, url]));
  const gaps = missing({ project_id: projectId || null, unit_type: String(values.unit_type || ""), area_sqm: values.area_sqm ?? null, starting_price: values.starting_price ?? null });

  const submit = async (approve: boolean) => {
    setBusy(true);
    try {
      if (approve) {
        const result = await adminApi.waInboxApprove(token, item.id, values, replaceId, availability, images);
        await onDone(result.action === "update" ? "اتحدثت الوحدة الموجودة على الموقع" : "اتضافت وحدة جديدة على الموقع");
      } else {
        await adminApi.waInboxSave(token, item.id, values);
        await onDone("اتحفظت التعديلات — لسه مستنية موافقة");
      }
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };

  const createProject = async (form: NewProject) => {
    setCreating(true);
    try {
      await adminApi.projectCreate(token, form);
      const data = await adminApi.projects(token);
      const created = data.projects.find((row) => row.name === form.name.trim() && row.area_group === form.area_group);
      if (created) {
        setExtraProjects([created]);
        set("project_id", created.id);
        setReplaceId("");
        setImages([]);
      }
      setNewProjectOpen(false);
      notify(`اتعمل مشروع ${form.name} — كمّل الوحدة ووافق`);
      onProjectCreated();
    } catch (error) {
      handleError(error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal title="تعديل الوحدة قبل الموافقة" onClose={onClose} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-bold">المشروع *</span>
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <SearchSelect
                options={projectOptions}
                value={projectId}
                onChange={(next) => {
                  set("project_id", next);
                  setReplaceId("");
                  setImages([]);
                }}
                placeholder={item.project_name ? `اللي جه من الجروب: ${item.project_name}` : "اختار المشروع"}
                dir="ltr"
              />
            </div>
            <button type="button" onClick={() => setNewProjectOpen(true)} className="shrink-0 rounded-xl border border-[#d8c9ab] px-3 py-2 text-xs font-black text-[#8a6630]">
              + مشروع جديد
            </button>
          </div>
          {!projectId && suggestion && (
            <button
              type="button"
              onClick={() => set("project_id", suggestion.project_id)}
              className="mt-1 block rounded-lg bg-[#fffaf1] px-2 py-1 text-xs font-black text-[#8a6630] ring-1 ring-[#ecdcbc]"
            >
              اقتراح ({WA_SUGGEST_LABELS[suggestion.kind]}): <span dir="ltr">{suggestion.name}</span> — استخدمه
            </button>
          )}
          {!projectId && item.project_name && (
            <span className="mt-1 block text-xs text-red-600">
              «{item.project_name}» مش موجود على الموقع. اختاره من القايمة لو موجود باسم تاني، أو دوس «+ مشروع جديد».
            </span>
          )}
        </div>

        {TEXT_INPUTS.map(({ key, label, placeholder }) => (
          <label key={key} className="block text-sm">
            <span className="mb-1 block font-bold">{label}</span>
            {key === "finishing" ? (
              <div className={filled[key] && values[key] === item[key as keyof WaInboxItem] ? "rounded-xl ring-2 ring-sky-300" : ""}>
                <FinishingSelect value={String(values[key] ?? "")} onChange={(next) => set(key, next)} />
              </div>
            ) : (
              <input
                value={String(values[key] ?? "")}
                onChange={(event) => set(key, event.target.value)}
                placeholder={placeholder}
                className={`${inputClass} ${filled[key] && values[key] === item[key as keyof WaInboxItem] ? "border-sky-300 bg-sky-50" : ""}`}
              />
            )}
            {filled[key] && (
              <span className="mt-1 block text-[11px] font-bold text-sky-700">الرسالة ماذكرتهاش — اتملت {WA_FILL_LABELS[filled[key]]}. راجعها.</span>
            )}
          </label>
        ))}
        <label className="block text-sm">
          <span className="mb-1 block font-bold">المساحة (م²) *</span>
          <input inputMode="decimal" value={String(values.area_sqm ?? "")} onChange={(event) => set("area_sqm", event.target.value)} placeholder="165" className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-bold">السعر (جنيه) *</span>
          <input
            inputMode="numeric"
            value={String(values.starting_price ?? "")}
            onChange={(event) => set("starting_price", event.target.value)}
            placeholder="9850000"
            className={inputClass}
          />
          {Number(String(values.starting_price ?? "").replace(/,/g, "")) > 0 && (
            <span className="mt-1 block text-xs text-[#5c6a62]">{formatPrice(String(values.starting_price).replace(/,/g, ""))}</span>
          )}
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-bold">الحالة على الموقع</span>
          <select value={availability} onChange={(event) => setAvailability(event.target.value as "available" | "new_launch")} className={inputClass}>
            <option value="available">{STATUS_LABELS.available}</option>
            <option value="new_launch">{STATUS_LABELS.new_launch}</option>
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-bold">الوصف</span>
          <textarea value={String(values.description ?? "")} onChange={(event) => set("description", event.target.value)} rows={3} className={inputClass} />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-bold">دي وحدة جديدة ولا تحديث لوحدة موجودة؟</span>
          <select value={replaceId} onChange={(event) => setReplaceId(event.target.value)} className={inputClass} disabled={!projectId}>
            <option value="">وحدة جديدة (تتضاف)</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                تحديث: {unit.unit_type} {unit.area_sqm ?? "—"} م² — {formatPrice(unit.starting_price)} ({STATUS_LABELS[unit.availability_status || ""] || unit.availability_status})
              </option>
            ))}
          </select>
        </label>

        <div className="sm:col-span-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-bold">صور الوحدة (من الصور اللي على Supabase)</span>
            {images.length > 0 && (
              <button type="button" onClick={() => setImages([])} className="text-xs font-bold text-[#8a6630] underline">
                شيل الاختيار ({images.length})
              </button>
            )}
          </div>
          {!projectId ? (
            <p className="rounded-xl bg-[#f7f2ea] p-3 text-xs text-[#5c6a62]">اختار المشروع الأول عشان تظهر صوره.</p>
          ) : !photoGroups.length ? (
            <p className="rounded-xl bg-[#f7f2ea] p-3 text-xs text-[#5c6a62]">المشروع ده مافيهوش صور لسه. ارفعها من تابة الصور، والوحدة هتعرض صور المشروع تلقائيًا.</p>
          ) : (
            <div className="space-y-3 rounded-2xl border border-[#efe6d4] p-3">
              {photoGroups.map((group) => (
                <div key={group.label}>
                  <p className="mb-1 text-xs font-black text-[#5c6a62]">{group.label}</p>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {group.urls.map((url) => {
                      const order = images.indexOf(url);
                      return (
                        <button
                          type="button"
                          key={url}
                          onClick={() => toggleImage(url)}
                          className={`relative overflow-hidden rounded-lg border-2 ${order >= 0 ? "border-[#a3854e]" : "border-transparent"}`}
                        >
                          <img src={url} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
                          {order >= 0 && (
                            <span className="absolute right-1 top-1 rounded-full bg-[#0d1f18] px-1.5 text-[10px] font-black text-white">
                              {order === 0 ? "غلاف" : order + 1}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-[#5c6a62]">
                أول صورة تختارها بتبقى الغلاف.{" "}
                {replacing
                  ? images.length
                    ? "الصور دي هتحل محل صور الوحدة الحالية."
                    : `لو ماختارتش صور، الوحدة الحالية هتفضل بصورها (${mediaImages(replacing).length}).`
                  : "لو ماختارتش صور، الوحدة هتعرض صور المشروع تلقائيًا."}
              </p>
            </div>
          )}
        </div>
      </div>

      {rejectedAt && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">
          وحدة بنفس المشروع والنوع والمساحة والسعر اترفضت قبل كده ({when(rejectedAt)}).
        </p>
      )}
      {gaps.length > 0 && <p className="mt-3 text-sm font-bold text-red-600">لازم تكمّل: {gaps.join("، ")} قبل الموافقة.</p>}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm font-bold">
          إلغاء
        </button>
        <button type="button" disabled={busy} onClick={() => void submit(false)} className="rounded-full bg-[#f1eadc] px-5 py-2 text-sm font-black disabled:opacity-40">
          احفظ بس
        </button>
        <button
          type="button"
          disabled={busy || gaps.length > 0}
          onClick={() => void submit(true)}
          className="rounded-full bg-[#0d1f18] px-5 py-2 text-sm font-black text-white disabled:opacity-40"
        >
          {busy ? "بيحفظ…" : "✅ احفظ ووافق"}
        </button>
      </div>

      {newProjectOpen && (
        <ProjectForm
          projects={projects}
          initial={{ name: item.project_name ?? "", developer: item.developer ?? "", area_group: item.area_group ?? "" }}
          busy={creating}
          onCancel={() => setNewProjectOpen(false)}
          onSubmit={(form) => void createProject(form)}
        />
      )}
    </Modal>
  );
}

/** On/off per WhatsApp group. Off = the group's messages are skipped (no AI cost, nothing reaches this tab). */
function GroupsDialog({ onClose }: { onClose: () => void }) {
  const { token, handleError } = useAdmin();
  const [groups, setGroups] = useState<WaGroup[] | null>(null);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    adminApi
      .waGroups(token)
      .then((result) => setGroups(result.groups))
      .catch((error) => {
        handleError(error);
        setGroups([]);
      });
  }, [token, handleError]);

  const toggle = async (group: WaGroup) => {
    setBusy(group.group_id);
    try {
      const result = await adminApi.waGroupToggle(token, group.group_id, !group.track);
      setGroups(result.groups);
    } catch (error) {
      handleError(error);
    } finally {
      setBusy("");
    }
  };

  return (
    <Modal title="جروبات الواتساب" onClose={onClose}>
      <p className="mb-3 text-sm text-[#5c6a62]">
        أي جروب جديد بيتضاف هنا لوحده وشغال. اقفل أي جروب مش جروب مطور (شات، شخصي…) وهيتم تجاهل رسايله.
      </p>
      {groups === null ? (
        <p className="py-6 text-center text-sm">بيحمّل…</p>
      ) : !groups.length ? (
        <p className="py-6 text-center text-sm">لسه مفيش جروبات اتسجلت.</p>
      ) : (
        <ul className="divide-y divide-[#efe6d4]">
          {groups.map((group) => (
            <li key={group.group_id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate font-bold">{group.name || group.group_id}</p>
                <p className="text-[11px] text-[#5c6a62]">
                  {group.messages} رسالة · آخر رسالة {when(group.last_seen_at)}
                </p>
              </div>
              <button
                onClick={() => void toggle(group)}
                disabled={busy === group.group_id}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-black disabled:opacity-40 ${group.track ? "bg-emerald-50 text-emerald-700" : "bg-[#f1eadc] text-[#5c6a62]"}`}
              >
                {group.track ? "شغال" : "متوقف"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

/** Lowercase, Arabic digits → 0-9, أ/إ/آ → ا, ة → ه, ى → ي, so "تاون هاوس" / "٢٢٠" match the way the groups write them. */
function searchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/,/g, "");
}
