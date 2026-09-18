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

const SITE_URL = "https://tycoons-inv.com";

export default function UnitsTab({
  projects,
  loading,
  error,
  onRetry,
  selectedId,
  onSelect,
}: {
  projects: AdminProject[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { token, isOwner, notify, handleError, refreshPending } = useAdmin();
  const [units, setUnits] = useState<AdminUnit[] | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [loadedId, setLoadedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<"add" | "edit" | "import" | "media" | null>(null);
  const [current, setCurrent] = useState<AdminUnit | null>(null);
  const project = projects.find((item) => item.id === selectedId) || null;

  const projectId = project?.id ?? "";
  const load = useCallback(() => {
    if (!projectId) return Promise.resolve();
    return adminApi
      .units(token, projectId)
      .then((data) => {
        setUnits(data.units);
        setPendingIds(new Set(data.pending.flatMap((request) => request.ops.map((op) => String(op.id ?? "")).filter(Boolean))));
      })
      .catch((requestError) => {
        setUnits([]);
        handleError(requestError);
      })
      .finally(() => setLoadedId(projectId));
  }, [projectId, token, handleError]);

  useEffect(() => {
    void load();
  }, [load]);

  const unitsLoading = loadedId !== projectId;

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

            {!isOwner && (
              <p className="m-4 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-800">
                أي إضافة أو تعديل أو حذف بتعمله بيروح للمالك للموافقة الأول، ومش بيتطبق على الموقع غير بعد ما يوافق.
              </p>
            )}

            <div className="overflow-x-auto p-4">
              {unitsLoading && <p className="p-6 text-center text-sm font-bold">جاري التحميل…</p>}
              {!unitsLoading && units && !units.length && <p className="p-6 text-center text-sm font-bold">مفيش وحدات للمشروع ده لسه</p>}
              {!unitsLoading && units && units.length > 0 && (
                <table className="w-full min-w-[760px] text-right text-sm">
                  <thead className="text-xs font-black text-[#5c6a62]">
                    <tr className="border-b border-[#efe7d8]">
                      <th className="p-2">النوع</th>
                      <th className="p-2">المساحة</th>
                      <th className="p-2">السعر</th>
                      <th className="p-2">المقدم / التقسيط</th>
                      <th className="p-2">الاستلام</th>
                      <th className="p-2">الحالة</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.map((unit) => {
                      const own = mediaImages(unit).length;
                      return (
                        <tr key={unit.id} className="border-b border-[#f4eee2] align-top">
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
                                href={`${SITE_URL}/units/${unit.id}`}
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
