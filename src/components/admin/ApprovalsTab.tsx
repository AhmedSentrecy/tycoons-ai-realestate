import { useCallback, useEffect, useState } from "react";
import { STATUS_LABELS, UNIT_FIELD_LABELS, adminApi, formatPrice, type ChangeRequest } from "../../lib/adminApi";
import { useAdmin } from "./AdminContext";
import { Badge, Chip, EmptyState } from "./ui";

const ACTION_LABELS: Record<string, string> = {
  media: "صور",
  create: "إضافة",
  update: "تعديل وحدة",
  delete: "حذف وحدة",
  import: "استيراد",
};
const STATUS_TONES: Record<string, "pending" | "ok" | "error" | "muted"> = {
  pending: "pending",
  approved: "ok",
  rejected: "error",
  failed: "error",
  cancelled: "muted",
};
const STATUS_TEXT: Record<string, string> = {
  pending: "مستني",
  approved: "اتوافق عليه",
  rejected: "اترفض",
  failed: "فشل التطبيق",
  cancelled: "اتلغى",
};

function show(field: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "availability_status") return STATUS_LABELS[String(value)] ?? String(value);
  if (field === "starting_price") return formatPrice(value as number);
  if (field === "gallery_urls") return `${String(value).split(",").filter(Boolean).length} صورة`;
  if (field === "image_url" || field === "video_url" || field === "brochure_url") return "رابط";
  return String(value);
}

/** Flatten a request into "field: before → after" lines the owner can read at a glance. */
function diffLines(request: ChangeRequest) {
  const lines: { field: string; before: unknown; after: unknown }[] = [];
  const before = (request.before ?? {}) as Record<string, unknown>;
  for (const op of request.ops) {
    if (op.op === "delete") {
      lines.push({ field: "الوحدة", before: `${before.unit_type ?? ""} ${before.area_sqm ?? ""} م²`, after: "تتمسح" });
      continue;
    }
    const values = (op.values ?? {}) as Record<string, unknown>;
    const scope = request.action === "import" && op.id ? ((before[String(op.id)] ?? {}) as Record<string, unknown>) : before;
    for (const [field, after] of Object.entries(values)) {
      if (["project_id", "project_name", "developer"].includes(field)) continue;
      lines.push({ field, before: op.op === "create" ? "" : scope[field], after });
    }
  }
  return lines.slice(0, 40);
}

export default function ApprovalsTab({ onChanged }: { onChanged: () => void }) {
  const { token, isOwner, user, notify, handleError } = useAdmin();
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [requests, setRequests] = useState<ChangeRequest[] | null>(null);
  const [loadedTab, setLoadedTab] = useState<"pending" | "history" | "">("");
  const [busy, setBusy] = useState(0);

  const load = useCallback(
    () =>
      adminApi
        .requests(token, tab)
        .then((data) => setRequests(data.requests))
        .catch((error) => {
          setRequests([]);
          handleError(error);
        })
        .finally(() => setLoadedTab(tab)),
    [token, tab, handleError],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const loading = loadedTab !== tab;

  async function decide(request: ChangeRequest, decision: "approve" | "reject" | "cancel") {
    if (decision === "approve" && request.conflict && !window.confirm("البيانات اتغيرت بعد ما الطلب اتبعت. تطبّق بردو؟")) return;
    if (decision === "reject" && !window.confirm("ترفض الطلب ده؟")) return;
    setBusy(request.id);
    try {
      await adminApi.decide(token, request.id, decision);
      notify(decision === "approve" ? "اتطبق ✓" : decision === "reject" ? "اترفض" : "اتلغى");
      load();
      onChanged();
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(0);
    }
  }

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <Chip active={tab === "pending"} onClick={() => setTab("pending")}>
          {isOwner ? "مستني موافقتك" : "طلباتي المستنية"}
        </Chip>
        <Chip active={tab === "history"} onClick={() => setTab("history")}>
          السجل
        </Chip>
      </div>

      {loading && <p className="p-6 text-center text-sm font-bold">جاري التحميل…</p>}
      {!loading && requests && !requests.length && (
        <EmptyState title={tab === "pending" ? "مفيش طلبات مستنية" : "مفيش سجل لسه"} text={tab === "pending" ? "أي تعديل من مستخدم تاني هيظهر هنا." : undefined} />
      )}

      <div className="space-y-3">
        {!loading &&
          requests?.map((request) => (
          <article key={request.id} className="rounded-3xl border border-[#e7ddc8] bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="gold">
                {request.entity === "project" && request.action === "create"
                  ? "مشروع جديد"
                  : ACTION_LABELS[request.action] ?? request.action}
              </Badge>
              <span className="font-black">{request.summary}</span>
              <Badge tone={STATUS_TONES[request.status]}>{STATUS_TEXT[request.status]}</Badge>
              {request.conflict && <Badge tone="error">البيانات اتغيرت بعد الطلب</Badge>}
              <span className="ms-auto text-xs text-[#5c6a62]">
                {request.created_by_name} · {new Date(request.created_at).toLocaleString("ar-EG")}
                {request.project_name ? ` · ${request.project_name}` : ""}
              </span>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-right text-xs">
                <tbody>
                  {diffLines(request).map((line, index) => (
                    <tr key={index} className="border-b border-[#f4eee2]">
                      <td className="w-32 p-1.5 font-bold">{UNIT_FIELD_LABELS[line.field] ?? line.field}</td>
                      <td className="p-1.5 text-[#5c6a62] line-through">{show(line.field, line.before)}</td>
                      <td className="p-1.5 font-bold text-[#1b2420]">{show(line.field, line.after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {request.action === "import" && <p className="mt-1 text-xs text-[#5c6a62]">{request.ops.length} عملية في الاستيراد ده</p>}
            </div>

            {request.status === "pending" && (
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                {(request.created_by === user.id || isOwner) && (
                  <button
                    onClick={() => void decide(request, "cancel")}
                    disabled={busy === request.id}
                    className="rounded-full px-4 py-2 text-sm font-bold"
                  >
                    إلغاء الطلب
                  </button>
                )}
                {isOwner && (
                  <>
                    <button
                      onClick={() => void decide(request, "reject")}
                      disabled={busy === request.id}
                      className="rounded-full border border-red-200 px-4 py-2 text-sm font-black text-red-600"
                    >
                      رفض
                    </button>
                    <button
                      onClick={() => void decide(request, "approve")}
                      disabled={busy === request.id}
                      className="rounded-full bg-[#0d1f18] px-5 py-2 text-sm font-black text-white disabled:opacity-40"
                    >
                      {busy === request.id ? "…" : "موافقة وتطبيق"}
                    </button>
                  </>
                )}
              </div>
            )}
            {request.status !== "pending" && request.reviewed_at && (
              <p className="mt-2 text-xs text-[#5c6a62]">
                {request.reviewed_by_name} · {new Date(request.reviewed_at).toLocaleString("ar-EG")}
                {request.review_note ? ` · ${request.review_note}` : ""}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
