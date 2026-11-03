import { useEffect, useMemo, useState } from "react";
import {
  adminApi,
  formatPrice,
  hideLegacyDuplicates,
  STATUS_LABELS,
  type AdminProject,
  type AdminUnit,
  type WaGroup,
  type WaInboxItem,
  type WaInboxStatus,
  type WaInboxValues,
} from "../../lib/adminApi";
import { useAdmin } from "./AdminContext";
import { Badge, Chip, EmptyState, inputClass, Modal } from "./ui";

/**
 * "وحدات واتساب": units Claude read from the WhatsApp developer groups (via Make.com) wait here.
 * Nothing shows on the site until the admin edits (if needed) and presses "وافق".
 * Also holds the on/off switch per WhatsApp group.
 */
export default function WhatsAppInboxTab({ projects, onChanged }: { projects: AdminProject[]; onChanged: () => void }) {
  const { token, notify, handleError } = useAdmin();
  const [status, setStatus] = useState<WaInboxStatus>("pending");
  const [items, setItems] = useState<WaInboxItem[]>([]);
  const [matches, setMatches] = useState<Map<string, AdminUnit>>(new Map());
  const [counts, setCounts] = useState<Record<WaInboxStatus, number>>({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<WaInboxItem | null>(null);
  const [query, setQuery] = useState("");
  const [groupsOpen, setGroupsOpen] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);
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
        setCounts(result.counts);
        setSelected(new Set());
      })
      .catch((error) => active && handleError(error))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token, status, reloadKey, handleError]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [item.project_name, item.developer, item.unit_type, item.source_group, item.location].some((value) => String(value || "").toLowerCase().includes(needle)),
    );
  }, [items, query]);

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

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">وحدات واتساب</h2>
          <p className="text-sm text-[#5c6a62]">الوحدات اللي اتسحبت من جروبات المطورين. مفيش حاجة بتظهر على الموقع غير لما توافق عليها.</p>
        </div>
        <button onClick={() => setGroupsOpen(true)} className="rounded-full border border-[#d8c9ab] bg-white px-4 py-2 text-sm font-black">
          الجروبات (تشغيل / إيقاف)
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Chip active={status === "pending"} onClick={() => changeStatus("pending")}>
          مستنية موافقة ({counts.pending})
        </Chip>
        <Chip active={status === "approved"} onClick={() => changeStatus("approved")}>
          اتوافق عليها ({counts.approved})
        </Chip>
        <Chip active={status === "rejected"} onClick={() => changeStatus("rejected")}>
          اترفضت ({counts.rejected})
        </Chip>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="دور بالمشروع أو المطور أو الجروب"
          className={`${inputClass} max-w-xs`}
        />
        {status === "pending" && selected.size > 0 && (
          <button onClick={() => void reject([...selected])} className="rounded-full bg-red-50 px-4 py-2 text-sm font-black text-red-600">
            ارفض المختار ({selected.size})
          </button>
        )}
        <button onClick={reload} className="rounded-full bg-[#f1eadc] px-3 py-1.5 text-xs font-black">
          تحديث
        </button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-[#5c6a62]">بيحمّل…</p>
      ) : !visible.length ? (
        <EmptyState title={status === "pending" ? "مفيش وحدات مستنية" : "مفيش حاجة هنا"} text="أول ما مطور ينزل وحدات في الجروب هتظهر هنا." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visible.map((item) => (
            <InboxCard
              key={item.id}
              item={item}
              match={item.match_unit_id ? matches.get(item.match_unit_id) ?? null : null}
              pending={status === "pending"}
              busy={busyId === item.id}
              checked={selected.has(item.id)}
              onCheck={() => toggleSelect(item.id)}
              onEdit={() => setEditing(item)}
              onApprove={() => void quickApprove(item)}
              onReject={() => void reject([item.id])}
            />
          ))}
        </div>
      )}

      {editing && (
        <EditDialog
          item={editing}
          projects={projects}
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
    </section>
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

function InboxCard({
  item,
  match,
  pending,
  busy,
  checked,
  onCheck,
  onEdit,
  onApprove,
  onReject,
}: {
  item: WaInboxItem;
  match: AdminUnit | null;
  pending: boolean;
  busy: boolean;
  checked: boolean;
  onCheck: () => void;
  onEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const gaps = missing(item);
  const rows: [string, string | null][] = [
    ["الغرف", item.bedrooms_text],
    ["المقدم", item.down_payment_text],
    ["التقسيط", item.installments_text],
    ["الاستلام", item.delivery_text],
    ["التشطيب", item.finishing],
    ["المنطقة", item.location],
  ];
  return (
    <article className={`rounded-3xl border bg-white p-4 ${checked ? "border-[#a3854e]" : "border-[#e7ddc8]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {pending && <input type="checkbox" checked={checked} onChange={onCheck} aria-label="اختيار" />}
            <h3 className="truncate text-lg font-black">{item.project_name || "مشروع مش معروف"}</h3>
            {!item.project_id && <Badge tone="error">مش متطابق مع مشروع على الموقع</Badge>}
            {match && <Badge tone="gold">هتحدّث وحدة موجودة</Badge>}
            {item.status === "approved" && <Badge tone="ok">اتوافق</Badge>}
            {item.status === "rejected" && <Badge tone="muted">اترفض</Badge>}
          </div>
          <p className="text-sm text-[#5c6a62]">{item.developer || "—"}</p>
        </div>
        <div className="shrink-0 text-left">
          <p className="text-lg font-black">{formatPrice(item.starting_price)}</p>
          <p className="text-sm font-bold">
            {item.unit_type || "—"} · {Number(item.area_sqm) ? `${Number(item.area_sqm)} م²` : "—"}
          </p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[11px] font-bold text-[#5c6a62]">{label}</dt>
            <dd className="truncate">{value || "—"}</dd>
          </div>
        ))}
      </dl>
      {item.description && <p className="mt-2 line-clamp-2 text-sm text-[#3d4a43]">{item.description}</p>}

      {match && (
        <p className="mt-2 rounded-xl bg-[#fbf8f2] px-3 py-2 text-xs">
          الموجود دلوقتي: {match.unit_type} {match.area_sqm} م² — {formatPrice(match.starting_price)} ({STATUS_LABELS[match.availability_status || ""] || match.availability_status})
        </p>
      )}
      {pending && gaps.length > 0 && <p className="mt-2 text-xs font-bold text-red-600">ناقص: {gaps.join("، ")} — دوس تعديل وكمّله</p>}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-[#5c6a62]">
          {item.source_group || "جروب"} · {when(item.created_at)}
          {item.image_url ? " · فيه صورة في الجروب" : ""}
        </p>
        {pending && (
          <div className="flex gap-2">
            <button onClick={onEdit} className="rounded-full bg-[#f1eadc] px-4 py-2 text-sm font-black">
              ✏️ تعديل
            </button>
            <button onClick={onReject} className="rounded-full bg-red-50 px-4 py-2 text-sm font-black text-red-600">
              ❌ ارفض
            </button>
            <button onClick={onApprove} disabled={busy} className="rounded-full bg-[#0d1f18] px-4 py-2 text-sm font-black text-white disabled:opacity-40">
              {busy ? "بيحفظ…" : "✅ وافق"}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

const TEXT_INPUTS: { key: keyof WaInboxValues; label: string; placeholder: string }[] = [
  { key: "unit_type", label: "النوع *", placeholder: "Apartment / Villa / Chalet" },
  { key: "bedrooms_text", label: "الغرف", placeholder: "3 Bedrooms" },
  { key: "down_payment_text", label: "المقدم", placeholder: "10%" },
  { key: "installments_text", label: "التقسيط", placeholder: "8 years" },
  { key: "delivery_text", label: "الاستلام", placeholder: "2029" },
  { key: "finishing", label: "التشطيب", placeholder: "Fully Finished" },
  { key: "location", label: "المنطقة", placeholder: "New Cairo" },
];

/** Every field of the unit in one form: edit once, then save or approve once. */
function EditDialog({
  item,
  projects,
  onClose,
  onDone,
}: {
  item: WaInboxItem;
  projects: AdminProject[];
  onClose: () => void;
  onDone: (message: string) => Promise<void>;
}) {
  const { token, handleError } = useAdmin();
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
  const [projectQuery, setProjectQuery] = useState("");
  const [unitsState, setUnitsState] = useState<{ projectId: string; units: AdminUnit[] }>({ projectId: "", units: [] });
  const [busy, setBusy] = useState(false);

  const projectId = String(values.project_id || "");
  const liveProjects = useMemo(() => hideLegacyDuplicates(projects), [projects]);
  const project = liveProjects.find((row) => row.id === projectId) ?? projects.find((row) => row.id === projectId) ?? null;
  const projectOptions = useMemo(() => {
    const needle = projectQuery.trim().toLowerCase();
    const list = liveProjects.filter((row) => !needle || `${row.name} ${row.developer ?? ""}`.toLowerCase().includes(needle));
    return list.slice(0, needle ? 50 : 400);
  }, [liveProjects, projectQuery]);

  // Units of the chosen project, so the admin can pick which one this replaces (or none = new unit).
  const units = unitsState.projectId === projectId ? unitsState.units : [];
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

  const set = (key: keyof WaInboxValues, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const gaps = missing({ project_id: projectId || null, unit_type: String(values.unit_type || ""), area_sqm: values.area_sqm ?? null, starting_price: values.starting_price ?? null });

  const submit = async (approve: boolean) => {
    setBusy(true);
    try {
      if (approve) {
        const result = await adminApi.waInboxApprove(token, item.id, values, replaceId, availability);
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

  return (
    <Modal title="تعديل الوحدة قبل الموافقة" onClose={onClose} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-bold">المشروع *</span>
          <input
            type="search"
            value={projectQuery}
            onChange={(event) => setProjectQuery(event.target.value)}
            placeholder={item.project_name ? `اللي جه من الجروب: ${item.project_name} — دور هنا لو عايز تغيّره` : "دور على المشروع"}
            className={`${inputClass} mb-2`}
          />
          <select
            value={projectId}
            onChange={(event) => {
              set("project_id", event.target.value);
              setReplaceId("");
            }}
            className={inputClass}
          >
            <option value="">— اختار المشروع —</option>
            {project && !projectOptions.some((row) => row.id === project.id) && (
              <option value={project.id}>
                {project.name} — {project.developer}
              </option>
            )}
            {projectOptions.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} — {row.developer}
              </option>
            ))}
          </select>
          {!projectId && item.project_name && (
            <span className="mt-1 block text-xs text-red-600">
              «{item.project_name}» مش موجود على الموقع. اختاره من القايمة، ولو مشروع جديد ضيفه الأول من تابة المشاريع.
            </span>
          )}
        </label>

        {TEXT_INPUTS.map(({ key, label, placeholder }) => (
          <label key={key} className="block text-sm">
            <span className="mb-1 block font-bold">{label}</span>
            <input value={String(values[key] ?? "")} onChange={(event) => set(key, event.target.value)} placeholder={placeholder} className={inputClass} />
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
      </div>

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
    </Modal>
  );
}

/** On/off per WhatsApp group. Off = Make skips the group (no AI cost, nothing reaches this tab). */
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
