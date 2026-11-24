import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, Megaphone, RefreshCw, Trash2, X } from "lucide-react";
import {
  adminApi,
  hideLegacyDuplicates,
  type AdminProject,
  type WaOfferInput,
  type WaProjectOffer,
  type WaProjectUpdate,
  type WaUpdateField,
  type WaUpdateProject,
  type WaUpdateStatus,
  type WaUpdateType,
} from "../../lib/adminApi";
import { useAdmin } from "./AdminContext";
import { SearchSelect } from "./SearchSelect";
import { Badge, Chip, EmptyState, inputClass } from "./ui";

const TYPE_LABELS: Record<WaUpdateType, string> = {
  payment_plan: "خطة سداد",
  offer: "عرض / خصم",
  delivery: "تسليم",
  finishing: "تشطيب",
  price_change: "تغيير أسعار",
  launch: "طرح جديد",
  other: "تحديث تاني",
};
const FIELD_LABELS: Record<WaUpdateField, string> = {
  down_payment_text: "المقدم",
  installments_text: "مدة التقسيط",
  delivery_text: "التسليم",
  finishing: "التشطيب",
};
const FIELDS = Object.keys(FIELD_LABELS) as WaUpdateField[];
const STATUS_LABELS: Record<WaUpdateStatus, string> = { pending: "مستنية", applied: "اتطبّقت", ignored: "اتجاهلت" };
/** Types published as an offer line on the site (card badge + «أحدث العروض» section in the article). */
const OFFER_TYPES: WaUpdateType[] = ["offer", "launch", "price_change", "other"];
const OFFER_KIND_LABELS: Record<WaProjectOffer["kind"], string> = { offer: "عرض", launch: "طرح جديد", price_change: "تحديث الأسعار", other: "تحديث" };
const isoDay = (value: string | null | undefined) => (/^\d{4}-\d{2}-\d{2}/.test(value ?? "") ? (value ?? "").slice(0, 10) : "");

const day = (value: string | null) => (value ? new Date(value).toLocaleDateString("ar-EG", { day: "numeric", month: "short" }) : "");

/**
 * «تحديثات المشاريع»: payment plans, offers, delivery and finishing changes read from the developers'
 * WhatsApp groups. Only the newest update per project + type is shown; «طبّق» changes the project's
 * payment / delivery / finishing on the site (empty fields keep the current value), «تجاهل» changes nothing.
 */
export default function ProjectUpdatesTab({ projects, onChanged }: { projects: AdminProject[]; onChanged: () => void }) {
  const { token, notify, handleError } = useAdmin();
  const [status, setStatus] = useState<WaUpdateStatus>("pending");
  const [view, setView] = useState<"updates" | "offers">("updates");
  const [items, setItems] = useState<WaProjectUpdate[]>([]);
  const [siteProjects, setSiteProjects] = useState<Record<string, WaUpdateProject>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<WaUpdateType | "">("");

  const [reloadKey, setReloadKey] = useState(0);
  const load = useCallback(() => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }, []);
  useEffect(() => {
    let active = true;
    adminApi.waUpdates(token, status)
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setSiteProjects(result.projects);
        setCounts(result.counts);
      })
      .catch(handleError)
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [token, status, handleError, reloadKey]);
  const pickStatus = (name: WaUpdateStatus) => {
    if (name === status) return;
    setLoading(true);
    setStatus(name);
  };

  const remove = (ids: number[]) => setItems((current) => current.filter((item) => !ids.includes(item.id)));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) =>
      (!type || item.update_type === type) &&
      (!q || `${item.project_name} ${item.developer ?? ""} ${item.source_group ?? ""} ${item.details ?? ""}`.toLowerCase().includes(q)),
    );
  }, [items, query, type]);

  // One card per project (linked id, else the WhatsApp name); unlinked ones last.
  const groups = useMemo(() => {
    const map = new Map<string, WaProjectUpdate[]>();
    for (const item of filtered) {
      const key = item.project_id || `name:${item.project_name.toLowerCase()}`;
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()].sort((a, b) => Number(a[0].startsWith("name:")) - Number(b[0].startsWith("name:")));
  }, [filtered]);

  const projectOptions = useMemo(
    () => hideLegacyDuplicates(projects).map((row) => ({ value: row.id, label: `${row.name} — ${row.developer ?? ""}`, hint: row.area_group || row.location || "" })),
    [projects],
  );

  return (
    <section dir="rtl" className="space-y-4">
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">تحديثات المشاريع من الجروبات</h2>
            <p className="mt-1 text-sm text-[#556070]">
              خطط سداد وعروض وتسليم وتشطيب. «طبّق» بيغيّر بيانات المشروع على الموقع (المقدم نسبة، القسط مدة، أطول خطة). الأقدم من نفس النوع بيتشال لوحده.
            </p>
          </div>
          <button onClick={load} className="flex items-center gap-1 rounded-full border border-[#e3e9f2] px-3 py-2 text-sm font-bold">
            <RefreshCw size={14} /> تحديث
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(STATUS_LABELS) as WaUpdateStatus[]).map((name) => (
            <Chip key={name} active={view === "updates" && status === name} onClick={() => { setView("updates"); pickStatus(name); }}>
              {STATUS_LABELS[name]} {counts[name] ? `(${counts[name]})` : ""}
            </Chip>
          ))}
          <Chip active={view === "offers"} onClick={() => setView("offers")}>العروض المنشورة على الموقع</Chip>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip active={!type} onClick={() => setType("")}>كل الأنواع</Chip>
          {(Object.keys(TYPE_LABELS) as WaUpdateType[]).map((name) => (
            <Chip key={name} active={type === name} onClick={() => setType(name)}>{TYPE_LABELS[name]}</Chip>
          ))}
        </div>
        <input className={`${inputClass} mt-3`} placeholder="دوّر بالمشروع أو المطور أو الجروب" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>

      {view === "offers" ? (
        <PublishedOffers token={token} handleError={handleError} notify={notify} />
      ) : loading ? (
        <EmptyState title="بيحمّل…" />
      ) : !groups.length ? (
        <EmptyState title="مفيش تحديثات هنا" text={status === "pending" ? "أول ما يتقرا تحديث جديد من الجروبات هيظهر هنا." : undefined} />
      ) : (
        groups.map(([key, rows]) => (
          <ProjectCard
            key={key}
            rows={rows}
            project={rows[0].project_id ? siteProjects[rows[0].project_id] ?? null : null}
            status={status}
            projectOptions={projectOptions}
            onDone={(ids, message) => {
              remove(ids);
              notify(message);
              onChanged();
            }}
            onLinked={load}
            token={token}
            handleError={handleError}
          />
        ))
      )}
    </section>
  );
}

function ProjectCard({
  rows, project, status, projectOptions, onDone, onLinked, token, handleError,
}: {
  rows: WaProjectUpdate[];
  project: WaUpdateProject | null;
  status: WaUpdateStatus;
  projectOptions: { value: string; label: string; hint: string }[];
  onDone: (ids: number[], message: string) => void;
  onLinked: () => void;
  token: string;
  handleError: (error: unknown) => void;
}) {
  const first = rows[0];
  const [linking, setLinking] = useState(false);
  const link = async (projectId: string) => {
    if (!projectId) return;
    setLinking(true);
    try {
      await adminApi.waUpdatesLink(token, first.id, projectId);
      onLinked();
    } catch (error) {
      handleError(error);
    } finally {
      setLinking(false);
    }
  };

  return (
    <article className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black" dir="ltr">{project?.name ?? first.project_name}</h3>
          <p className="text-sm text-[#556070]">{project?.developer ?? first.developer ?? ""}</p>
        </div>
        {project?.slug ? (
          <a href={`/projects/${project.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm font-bold text-[#b47c17]">
            صفحة المشروع <ExternalLink size={14} />
          </a>
        ) : !project ? (
          <Badge tone="pending">مش مربوط بمشروع على الموقع</Badge>
        ) : null}
      </div>

      {!project && status === "pending" && (
        <div className="mt-3 text-sm">
          <span className="mb-1 block font-bold">اربطه بمشروع على الموقع</span>
          <SearchSelect
            options={projectOptions}
            value=""
            onChange={(value) => link(value)}
            placeholder={linking ? "بيربط…" : `اللي جه من الجروب: ${first.project_name}`}
            dir="ltr"
          />
        </div>
      )}

      {project && (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-[#f7f9fc] p-3 text-sm sm:grid-cols-4">
          {FIELDS.map((field) => (
            <div key={field}>
              <span className="block text-xs text-[#556070]">{FIELD_LABELS[field]} دلوقتي</span>
              <span className="font-bold">{project[field] || "—"}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 space-y-3">
        {rows.map((row) => (
          <UpdateRow key={row.id} row={row} project={project} status={status} onDone={onDone} token={token} handleError={handleError} />
        ))}
      </div>
    </article>
  );
}

function UpdateRow({
  row, project, status, onDone, token, handleError,
}: {
  row: WaProjectUpdate;
  project: WaUpdateProject | null;
  status: WaUpdateStatus;
  onDone: (ids: number[], message: string) => void;
  token: string;
  handleError: (error: unknown) => void;
}) {
  const stated = FIELDS.filter((field) => row[field]);
  const [values, setValues] = useState<Partial<Record<WaUpdateField, string>>>(() => Object.fromEntries(stated.map((field) => [field, row[field] ?? ""])));
  const [busy, setBusy] = useState(false);
  const isOffer = OFFER_TYPES.includes(row.update_type);
  const [offer, setOffer] = useState<WaOfferInput>(() => ({
    title_ar: row.headline_ar ?? "",
    body_ar: row.summary_ar ?? "",
    valid_until: isoDay(row.valid_until),
  }));
  const changes = FIELDS.filter((field) => (values[field] ?? "").trim() && (values[field] ?? "").trim() !== (project?.[field] ?? ""));

  const apply = async () => {
    setBusy(true);
    try {
      const result = await adminApi.waUpdatesApply(token, row.id, values, isOffer ? offer : undefined);
      const parts = [
        ...(result.changed.length ? [`اتحدّث المشروع: ${result.changed.map((field) => FIELD_LABELS[field as WaUpdateField] ?? field).join("، ")}`] : []),
        ...(result.offer ? ["العرض اتنشر على الموقع (بيظهر في الصفحة الثابتة بعد «حدّث الموقع»)"] : []),
      ];
      onDone([row.id], parts.join(" · ") || "اتعلّم عليه إنه اتشاف");
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };
  const ignore = async () => {
    setBusy(true);
    try {
      await adminApi.waUpdatesIgnore(token, [row.id]);
      onDone([row.id], "اتجاهل");
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#ecf0f6] p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge tone="gold">{TYPE_LABELS[row.update_type]}</Badge>
        <span className="text-[#556070]">{day(row.message_date)} · {row.source_group ?? "جروب"}</span>
        {row.valid_until && <Badge tone="pending">لحد {row.valid_until}</Badge>}
      </div>
      {row.details && <p className="mt-2 text-sm leading-6" dir="ltr">{row.details}</p>}

      {stated.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stated.map((field) => (
            <label key={field} className="block text-xs">
              <span className="mb-1 block font-bold">{FIELD_LABELS[field]} الجديد</span>
              <input
                className={inputClass}
                dir="ltr"
                value={values[field] ?? ""}
                disabled={status !== "pending"}
                onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))}
              />
            </label>
          ))}
        </div>
      )}

      {isOffer && status === "pending" && (
        <div className="mt-3 grid gap-2 rounded-2xl bg-[#f7f9fc] p-3">
          <label className="block text-xs">
            <span className="mb-1 block font-bold">سطر العرض على الموقع (الكارت + المقال) *</span>
            <input className={inputClass} value={offer.title_ar} maxLength={200} placeholder="مثال: خصم 5% أو سنة تقسيط زيادة على وحدات مختارة"
              onChange={(event) => setOffer((current) => ({ ...current, title_ar: event.target.value }))} />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-bold">التفاصيل في المقال</span>
            <textarea className={inputClass} rows={3} value={offer.body_ar} maxLength={1200}
              onChange={(event) => setOffer((current) => ({ ...current, body_ar: event.target.value }))} />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-bold">ينتهي يوم (سيبه فاضي = يفضل ظاهر لحد ما ييجي تحديث أو تشيله)</span>
            <input type="date" className={inputClass} dir="ltr" value={offer.valid_until}
              onChange={(event) => setOffer((current) => ({ ...current, valid_until: event.target.value }))} />
          </label>
        </div>
      )}

      {status === "pending" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={apply}
            disabled={busy || !project || (isOffer && offer.title_ar.trim().length < 3)}
            title={!project ? "اربطه بمشروع الأول" : undefined}
            className="flex items-center gap-1 rounded-full bg-[#060f1c] px-4 py-2 text-sm font-black text-white disabled:opacity-40"
          >
            {isOffer ? <Megaphone size={14} /> : <Check size={14} />}{" "}
            {isOffer ? (changes.length ? `انشر على الموقع + طبّق (${changes.length})` : "انشر على الموقع") : changes.length ? `طبّق على المشروع (${changes.length})` : "اتشاف"}
          </button>
          <button onClick={ignore} disabled={busy} className="flex items-center gap-1 rounded-full border border-[#e3e9f2] px-4 py-2 text-sm font-bold disabled:opacity-40">
            <X size={14} /> تجاهل
          </button>
        </div>
      )}
    </div>
  );
}

/** «العروض المنشورة على الموقع»: edit the wording / end date of a live offer, or take it off the site. */
function PublishedOffers({ token, handleError, notify }: { token: string; handleError: (error: unknown) => void; notify: (message: string) => void }) {
  const [state, setState] = useState<{ loading: boolean; offers: WaProjectOffer[]; projects: Record<string, { name: string; developer: string | null; slug: string | null }> }>({ loading: true, offers: [], projects: {} });
  useEffect(() => {
    let active = true;
    adminApi.waOffers(token)
      .then((result) => { if (active) setState({ loading: false, offers: result.offers, projects: result.projects }); })
      .catch((error) => { if (active) setState((current) => ({ ...current, loading: false })); handleError(error); });
    return () => { active = false; };
  }, [token, handleError]);
  if (state.loading) return <EmptyState title="بيحمّل…" />;
  if (!state.offers.length) return <EmptyState title="مفيش عروض منشورة" text="انشر عرض أو طرح جديد من «مستنية» وهيظهر هنا." />;
  return (
    <div className="space-y-3">
      {state.offers.map((row) => (
        <OfferEditor
          key={row.id}
          row={row}
          project={state.projects[row.project_id]}
          token={token}
          handleError={handleError}
          onSaved={(next) => { setState((current) => ({ ...current, offers: current.offers.map((item) => (item.id === next.id ? next : item)) })); notify("العرض اتعدّل (الصفحة الثابتة بتتحدّث بعد «حدّث الموقع»)"); }}
          onRemoved={() => { setState((current) => ({ ...current, offers: current.offers.filter((item) => item.id !== row.id) })); notify("العرض اتشال من الموقع"); }}
        />
      ))}
    </div>
  );
}

function OfferEditor({
  row, project, token, handleError, onSaved, onRemoved,
}: {
  row: WaProjectOffer;
  project?: { name: string; developer: string | null; slug: string | null };
  token: string;
  handleError: (error: unknown) => void;
  onSaved: (row: WaProjectOffer) => void;
  onRemoved: () => void;
}) {
  const [offer, setOffer] = useState<WaOfferInput>({ title_ar: row.title_ar, body_ar: row.body_ar ?? "", valid_until: isoDay(row.valid_until) });
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try { await action(); } catch (error) { handleError(error); } finally { setBusy(false); }
  };
  return (
    <article className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="gold">{OFFER_KIND_LABELS[row.kind]}</Badge>
          <h3 className="font-black" dir="ltr">{project?.name ?? "مشروع"}</h3>
          <span className="text-sm text-[#556070]">{project?.developer ?? ""} · اتنشر {day(row.created_at)}</span>
        </div>
        {project?.slug && (
          <a href={`/projects/${project.slug}#offers`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm font-bold text-[#b47c17]">
            شوفه على الموقع <ExternalLink size={14} />
          </a>
        )}
      </div>
      <div className="mt-3 grid gap-2">
        <input className={inputClass} value={offer.title_ar} maxLength={200} onChange={(event) => setOffer((current) => ({ ...current, title_ar: event.target.value }))} />
        <textarea className={inputClass} rows={3} value={offer.body_ar} maxLength={1200} onChange={(event) => setOffer((current) => ({ ...current, body_ar: event.target.value }))} />
        <input type="date" className={inputClass} dir="ltr" value={offer.valid_until} onChange={(event) => setOffer((current) => ({ ...current, valid_until: event.target.value }))} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          disabled={busy || offer.title_ar.trim().length < 3}
          onClick={() => run(async () => onSaved((await adminApi.waOfferSave(token, row.id, offer)).offer))}
          className="flex items-center gap-1 rounded-full bg-[#060f1c] px-4 py-2 text-sm font-black text-white disabled:opacity-40"
        >
          <Check size={14} /> احفظ التعديل
        </button>
        <button
          disabled={busy}
          onClick={() => run(async () => { await adminApi.waOfferRemove(token, row.id); onRemoved(); })}
          className="flex items-center gap-1 rounded-full border border-[#e3e9f2] px-4 py-2 text-sm font-bold disabled:opacity-40"
        >
          <Trash2 size={14} /> شيله من الموقع
        </button>
      </div>
    </article>
  );
}
