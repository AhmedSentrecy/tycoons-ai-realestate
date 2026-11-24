import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, RefreshCw, X } from "lucide-react";
import {
  adminApi,
  hideLegacyDuplicates,
  type AdminProject,
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

const day = (value: string | null) => (value ? new Date(value).toLocaleDateString("ar-EG", { day: "numeric", month: "short" }) : "");

/**
 * «تحديثات المشاريع»: payment plans, offers, delivery and finishing changes read from the developers'
 * WhatsApp groups. Only the newest update per project + type is shown; «طبّق» changes the project's
 * payment / delivery / finishing on the site (empty fields keep the current value), «تجاهل» changes nothing.
 */
export default function ProjectUpdatesTab({ projects, onChanged }: { projects: AdminProject[]; onChanged: () => void }) {
  const { token, notify, handleError } = useAdmin();
  const [status, setStatus] = useState<WaUpdateStatus>("pending");
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
            <p className="mt-1 text-sm text-[#5c6a62]">
              خطط سداد وعروض وتسليم وتشطيب. «طبّق» بيغيّر بيانات المشروع على الموقع (المقدم نسبة، القسط مدة، أطول خطة). الأقدم من نفس النوع بيتشال لوحده.
            </p>
          </div>
          <button onClick={load} className="flex items-center gap-1 rounded-full border border-[#e7ddc8] px-3 py-2 text-sm font-bold">
            <RefreshCw size={14} /> تحديث
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(STATUS_LABELS) as WaUpdateStatus[]).map((name) => (
            <Chip key={name} active={status === name} onClick={() => pickStatus(name)}>
              {STATUS_LABELS[name]} {counts[name] ? `(${counts[name]})` : ""}
            </Chip>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip active={!type} onClick={() => setType("")}>كل الأنواع</Chip>
          {(Object.keys(TYPE_LABELS) as WaUpdateType[]).map((name) => (
            <Chip key={name} active={type === name} onClick={() => setType(name)}>{TYPE_LABELS[name]}</Chip>
          ))}
        </div>
        <input className={`${inputClass} mt-3`} placeholder="دوّر بالمشروع أو المطور أو الجروب" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>

      {loading ? (
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
          <p className="text-sm text-[#5c6a62]">{project?.developer ?? first.developer ?? ""}</p>
        </div>
        {project?.slug ? (
          <a href={`/projects/${project.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm font-bold text-[#a3854e]">
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
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-[#fbf8f2] p-3 text-sm sm:grid-cols-4">
          {FIELDS.map((field) => (
            <div key={field}>
              <span className="block text-xs text-[#5c6a62]">{FIELD_LABELS[field]} دلوقتي</span>
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
  const changes = FIELDS.filter((field) => (values[field] ?? "").trim() && (values[field] ?? "").trim() !== (project?.[field] ?? ""));

  const apply = async () => {
    setBusy(true);
    try {
      const result = await adminApi.waUpdatesApply(token, row.id, values);
      onDone([row.id], result.changed.length ? `اتحدّث المشروع: ${result.changed.map((field) => FIELD_LABELS[field as WaUpdateField] ?? field).join("، ")}` : "اتعلّم عليه إنه اتشاف");
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
    <div className="rounded-2xl border border-[#efe6d4] p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge tone="gold">{TYPE_LABELS[row.update_type]}</Badge>
        <span className="text-[#5c6a62]">{day(row.message_date)} · {row.source_group ?? "جروب"}</span>
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

      {status === "pending" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={apply}
            disabled={busy || !project}
            title={!project ? "اربطه بمشروع الأول" : undefined}
            className="flex items-center gap-1 rounded-full bg-[#0d1f18] px-4 py-2 text-sm font-black text-white disabled:opacity-40"
          >
            <Check size={14} /> {changes.length ? `طبّق على المشروع (${changes.length})` : "اتشاف"}
          </button>
          <button onClick={ignore} disabled={busy} className="flex items-center gap-1 rounded-full border border-[#e7ddc8] px-4 py-2 text-sm font-bold disabled:opacity-40">
            <X size={14} /> تجاهل
          </button>
        </div>
      )}
    </div>
  );
}
