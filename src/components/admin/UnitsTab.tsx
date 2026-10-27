import { useCallback, useEffect, useState } from "react";
import {
  STATUS_LABELS,
  adminApi,
  errorMessage,
  formatPrice,
  mediaImages,
  type AdminProject,
  type AdminUnit,
  type SubmitResult,
  type UnitValues,
} from "../../lib/adminApi";
import { useAdmin } from "./AdminContext";
import ImportDialog from "./ImportDialog";
import MediaEditor from "./MediaEditor";
import ProjectPicker from "./ProjectPicker";
import UnitForm from "./UnitForm";
import { Badge, EmptyState, Modal } from "./ui";
import { unitPath } from "@/lib/unitUrl";

const SITE_URL = "https://tycoons-inv.com";

export default function UnitsTab({
  projects,
  loading,
  error,
  onRetry,
  selectedId,
  onSelect,
  onCreateProject,
}: {
  projects: AdminProject[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  selectedId: string;
  onSelect: (id: string) => void;
  onCreateProject: () => void;
}) {
  const { token, notify, handleError, refreshPending } = useAdmin();
  const [units, setUnits] = useState<AdminUnit[] | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [loadedId, setLoadedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<"add" | "edit" | "import" | "media" | null>(null);
  const [current, setCurrent] = useState<AdminUnit | null>(null);
  // Units ticked for bulk delete (cleared whenever the project or the unit list changes).
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [bulkProgress, setBulkProgress] = useState("");
  const project = projects.find((item) => item.id === selectedId) || null;

  const projectId = project?.id ?? "";
  const load = useCallback(() => {
    if (!projectId) return Promise.resolve();
    return adminApi
      .units(token, projectId)
      .then((data) => {
        setUnits(data.units);
        setChecked(new Set());
        setPendingIds(new Set(data.pending.flatMap((request) => request.ops.map((op) => String(op.id ?? "")).filter(Boolean))));
      })
      .catch((requestError) => {
        setUnits([]);
        setChecked(new Set());
        handleError(requestError);
      })
      .finally(() => setLoadedId(projectId));
  }, [projectId, token, handleError]);

  useEffect(() => {
    void load();
  }, [load]);

  const unitsLoading = loadedId !== projectId;

  const allIds = units?.map((unit) => unit.id) ?? [];
  const allChecked = allIds.length > 0 && allIds.every((id) => checked.has(id));
  const someChecked = checked.size > 0 && !allChecked;

  function toggle(id: string) {
    setChecked((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setChecked(allChecked ? new Set() : new Set(allIds));
  }

  /** Deletes the ticked units one by one (each delete is logged like a single delete). */
  async function removeChecked() {
    const targets = (units ?? []).filter((unit) => checked.has(unit.id));
    if (!targets.length) return;
    if (!window.confirm(`حذف ${targets.length} وحدة نهائيًا؟\nلو عايز تخفيهم من الموقع بس، استخدم «اتباعت» لكل وحدة.`)) return;
    setBusy(true);
    let applied = 0;
    let pending = 0;
    let failed = 0;
    try {
      for (const [index, unit] of targets.entries()) {
        setBulkProgress(`جاري الحذف ${index + 1} من ${targets.length}…`);
        try {
          const result = await adminApi.unitDelete(token, unit.id);
          if (result.applied) applied += 1;
          else if (!result.unchanged) pending += 1;
        } catch (requestError) {
          failed += 1;
          if (failed === 1) handleError(requestError);
        }
      }
    } finally {
      setBulkProgress("");
      setBusy(false);
    }
    const parts = [
      applied ? `اتمسح ${applied}` : "",
      pending ? `${pending} اتبعتوا للمالك للموافقة` : "",
      failed ? `${failed} محصلش فيهم حذف` : "",
    ].filter(Boolean);
    notify(parts.join(" · ") || "مفيش حاجة اتمسحت", failed ? "error" : undefined);
    if (pending) refreshPending();
    setChecked(new Set());
    void load();
  }

  /** Every write goes through here so the owner/editor difference is explained once. */
  async function submit(run: () => Promise<SubmitResult>, appliedText: string) {
    setBusy(true);
    try {
      const result = await run();
      if (result.unchanged) notify("مفيش تغيير يتحفظ");
      else if (result.applied) notify(appliedText);
      else {
        notify("اتبعت للمالك للموافقة");
        refreshPending();
      }
      setDialog(null);
      setCurrent(null);
      load();
    } catch (requestError) {
      handleError(requestError);
    } finally {
      setBusy(false);
    }
  }

  async function markSold(unit: AdminUnit) {
    if (!window.confirm(`تأكيد: «${unit.unit_type}» اتباعت وتختفي من الموقع؟`)) return;
    await submit(() => adminApi.unitUpdate(token, unit.id, { availability_status: "sold" }), "اتسجلت إنها اتباعت");
  }

  async function remove(unit: AdminUnit) {
    if (!window.confirm(`حذف «${unit.unit_type}» نهائيًا؟ لو عايز تخفيها من الموقع بس، استخدم «اتباعت».`)) return;
    await submit(() => adminApi.unitDelete(token, unit.id), "اتمسحت");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <ProjectPicker
        projects={projects}
        loading={loading}
        error={error}
        onRetry={onRetry}
        selectedId={selectedId}
        onSelect={onSelect}
        onCreate={onCreateProject}
        className={project ? "hidden lg:block" : ""}
      />
      <section className={project ? "" : "hidden lg:block"}>
        {!project && <EmptyState title="اختار مشروع عشان تشوف وحداته" text="تقدر تضيف وحدة، تعدّل سعر، تعلّم وحدة إنها اتباعت، أو تستورد شيت كامل." />}
        {project && (
          <div className="rounded-3xl border border-[#e7ddc8] bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b border-[#efe7d8] p-4">
              <button onClick={() => onSelect("")} className="rounded-full bg-[#f7f2ea] px-3 py-1.5 text-sm font-bold lg:hidden">
                → رجوع
              </button>
              <div className="me-auto min-w-0">
                <h2 className="truncate text-xl font-black">{project.name}</h2>
                <p className="text-xs text-[#5c6a62]">
                  {!unitsLoading && units
                  ? `${units.length} وحدة · ${units.filter((unit) => unit.availability_status === "available").length} متاحة`
                  : "…"}
                </p>
              </div>
              <button onClick={() => setDialog("import")} className="rounded-full border border-[#d8c9ab] px-4 py-2 text-sm font-black text-[#8a6630]">
                استيراد Excel / CSV
              </button>
              <button onClick={() => setDialog("add")} className="rounded-full bg-[#0d1f18] px-4 py-2 text-sm font-black text-white">
                + وحدة جديدة
              </button>
            </div>

            {checked.size > 0 && !unitsLoading && (
              <div className="flex flex-wrap items-center gap-2 border-b border-[#efe7d8] bg-[#fffaf1] px-4 py-3">
                <span className="me-auto text-sm font-black">
                  {bulkProgress || `${checked.size} وحدة متحددة`}
                </span>
                <button
                  onClick={() => setChecked(new Set())}
                  disabled={busy}
                  className="rounded-full border border-[#d8c9ab] px-4 py-2 text-sm font-black text-[#5c6a62] disabled:opacity-50"
                >
                  إلغاء التحديد
                </button>
                <button
                  onClick={() => void removeChecked()}
                  disabled={busy}
                  className="rounded-full bg-red-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
                >
                  حذف المحدد ({checked.size})
                </button>
              </div>
            )}

            <div className="overflow-x-auto p-4">
              {unitsLoading && <p className="p-6 text-center text-sm font-bold">جاري التحميل…</p>}
              {!unitsLoading && units && !units.length && <p className="p-6 text-center text-sm font-bold">مفيش وحدات للمشروع ده لسه</p>}
              {!unitsLoading && units && units.length > 0 && (
                <table className="w-full min-w-[880px] text-right text-sm">
                  <thead className="text-xs font-black text-[#5c6a62]">
                    <tr className="border-b border-[#efe7d8]">
                      <th className="w-8 p-2">
                        <input
                          type="checkbox"
                          aria-label="تحديد كل الوحدات"
                          title="تحديد الكل"
                          checked={allChecked}
                          ref={(element) => {
                            if (element) element.indeterminate = someChecked;
                          }}
                          onChange={toggleAll}
                          disabled={busy}
                          className="h-4 w-4 cursor-pointer accent-[#0d1f18]"
                        />
                      </th>
                      <th className="p-2">النوع</th>
                      <th className="p-2">المساحة</th>
                      <th className="p-2">السعر</th>
                      <th className="p-2">المقدم / التقسيط</th>
                      <th className="p-2">الاستلام</th>
                      <th className="p-2">الحالة</th>
                      <th className="p-2">اتضافت / آخر تحديث</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.map((unit) => {
                      const own = mediaImages(unit).length;
                      return (
                        <tr key={unit.id} className={`border-b border-[#f4eee2] align-top ${checked.has(unit.id) ? "bg-[#fffaf1]" : ""}`}>
                          <td className="p-2">
                            <input
                              type="checkbox"
                              aria-label={`تحديد ${unit.unit_type || "الوحدة"}`}
                              checked={checked.has(unit.id)}
                              onChange={() => toggle(unit.id)}
                              disabled={busy}
                              className="mt-1 h-4 w-4 cursor-pointer accent-[#0d1f18]"
                            />
                          </td>
                          <td className="p-2">
                            <span className="font-black">{unit.unit_type || "—"}</span>
                            <span className="block text-xs text-[#5c6a62]">{unit.bedrooms_text || ""}</span>
                            {pendingIds.has(unit.id) && <Badge tone="pending">مستني موافقة</Badge>}
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
                          <td className="whitespace-nowrap p-2 text-xs text-[#5c6a62]">
                            {isNewUnit(unit.created_at) && <Badge tone="ok">جديد</Badge>}
                            <span className="block font-bold text-[#1b2420]">{adminDate(unit.created_at)}</span>
                            <span className="block">تحديث: {adminDate(unit.last_updated_at)}</span>
                          </td>
                          <td className="p-2">
                            <div className="flex flex-wrap justify-end gap-1">
                              <button
                                onClick={() => {
                                  setCurrent(unit);
                                  setDialog("edit");
                                }}
                                className="rounded-lg bg-[#f7f2ea] px-2 py-1 text-xs font-black"
                              >
                                تعديل
                              </button>
                              <button
                                onClick={() => {
                                  setCurrent(unit);
                                  setDialog("media");
                                }}
                                className="rounded-lg bg-[#f7f2ea] px-2 py-1 text-xs font-black"
                              >
                                صور {own ? `(${own})` : ""}
                              </button>
                              {unit.availability_status === "available" && (
                                <button onClick={() => void markSold(unit)} className="rounded-lg bg-[#f7f2ea] px-2 py-1 text-xs font-black">
                                  اتباعت
                                </button>
                              )}
                              <button onClick={() => void remove(unit)} className="rounded-lg bg-white px-2 py-1 text-xs font-black text-red-600">
                                حذف
                              </button>
                              <a
                                href={`${SITE_URL}${unitPath(unit)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg px-2 py-1 text-xs font-black text-[#8a6630]"
                              >
                                ↗
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </section>

      {project && dialog === "add" && (
        <Modal title={`وحدة جديدة — ${project.name}`} onClose={() => setDialog(null)}>
          <UnitForm
            busy={busy}
            onCancel={() => setDialog(null)}
            onSubmit={(values: UnitValues) => void submit(() => adminApi.unitCreate(token, project.id, values), "اتضافت الوحدة")}
          />
        </Modal>
      )}

      {dialog === "edit" && current && (
        <Modal title={`تعديل ${current.unit_type ?? ""}`} onClose={() => setDialog(null)}>
          <UnitForm
            unit={current}
            busy={busy}
            onCancel={() => setDialog(null)}
            onSubmit={(values: UnitValues) => void submit(() => adminApi.unitUpdate(token, current.id, values), "اتحفظ التعديل")}
          />
        </Modal>
      )}

      {dialog === "media" && current && (
        <Modal title={`صور ${current.unit_type ?? "الوحدة"}`} onClose={() => setDialog(null)} wide>
          <MediaEditor
            target="unit"
            item={current}
            hint="لو سبت الوحدة من غير صور، هتعرض صور المشروع تلقائيًا."
            onSaved={() => load()}
          />
        </Modal>
      )}

      {project && dialog === "import" && (
        <ImportDialog
          projectName={project.name}
          units={units ?? []}
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={(rows) =>
            void submit(() => adminApi.unitsImport(token, project.id, rows), `اتطبق الاستيراد (${rows.length} صف)`).catch((importError) =>
              notify(errorMessage(importError), "error"),
            )
          }
        />
      )}
    </div>
  );
}

function adminDate(value: string | null | undefined) {
  const time = Date.parse(value ?? "");
  return Number.isFinite(time) ? new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Cairo" }).format(new Date(time)) : "—";
}

function isNewUnit(value: string | null | undefined) {
  const time = Date.parse(value ?? "");
  return Number.isFinite(time) && Date.now() - time <= 7 * 86400000;
}
