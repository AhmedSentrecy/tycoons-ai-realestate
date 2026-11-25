import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "../../lib/adminApi";
import { loadPaymentIssueUnits, type PaymentIssueUnit } from "../../lib/paymentIssues";

/**
 * Banner at the top of the units tab listing every unit whose down payment or
 * installments don't follow the site format, with the reason and a jump to its project.
 */
export default function PaymentIssuesPanel({ onOpenProject, refreshKey }: { onOpenProject: (projectId: string) => void; refreshKey?: number }) {
  const [rows, setRows] = useState<PaymentIssueUnit[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    loadPaymentIssueUnits()
      .then((data) => alive && (setRows(data), setFailed(false)))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  const groups = useMemo(() => {
    const map = new Map<string, { projectId: string; name: string; units: PaymentIssueUnit[] }>();
    for (const row of rows ?? []) {
      const key = row.project_id || row.project_name || "—";
      if (!map.has(key)) map.set(key, { projectId: row.project_id || "", name: row.project_name || "—", units: [] });
      map.get(key)!.units.push(row);
    }
    return [...map.values()].sort((a, b) => b.units.length - a.units.length);
  }, [rows]);

  if (failed || !rows || !rows.length) return null;

  const downCount = rows.filter((row) => row.issues.some((issue) => issue.field === "down_payment")).length;
  const instCount = rows.filter((row) => row.issues.some((issue) => issue.field === "installments")).length;

  return (
    <div className="mb-4 rounded-3xl border border-[#f0bd4f] bg-[#fff8e8]">
      <button onClick={() => setOpen((value) => !value)} className="flex w-full flex-wrap items-center gap-2 p-4 text-right">
        <span className="text-lg">⚠️</span>
        <span className="me-auto font-black text-[#0b1b30]">
          {rows.length} وحدة خطة السداد فيها مش واضحة ومحتاجة توضيح
          <span className="block text-xs font-bold text-[#7a5a14]">
            {downCount} مقدم · {instCount} تقسيط — المقدم لازم يبقى نسبة واحدة، والتقسيط مدة بالسنين
          </span>
        </span>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#b47c17]">{open ? "اقفل" : "اعرض"}</span>
      </button>
      {open && (
        <div className="max-h-[60vh] overflow-auto border-t border-[#f3d9a0] p-4">
          {groups.map((group) => (
            <div key={group.projectId || group.name} className="mb-4 last:mb-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="me-auto font-black text-[#0b1b30]">
                  {group.name} <span className="text-xs text-[#7a5a14]">({group.units.length})</span>
                </h3>
                {group.projectId && (
                  <button onClick={() => onOpenProject(group.projectId)} className="rounded-full bg-[#060f1c] px-3 py-1 text-xs font-black text-white">
                    افتح وحدات المشروع
                  </button>
                )}
              </div>
              <ul className="grid gap-2">
                {group.units.map((unit) => (
                  <li key={unit.id} className="rounded-2xl bg-white p-3 text-sm">
                    <p className="font-black text-[#0f1724]">
                      {unit.unit_type || "وحدة"}
                      {unit.area_sqm ? ` · ${unit.area_sqm} م²` : ""}
                      {unit.starting_price ? ` · ${formatPrice(unit.starting_price)}` : ""}
                    </p>
                    {unit.issues.map((issue) => (
                      <p key={issue.field} className="mt-1 text-xs text-[#556070]">
                        <span className="font-black text-[#b47c17]">{issue.field === "down_payment" ? "المقدم:" : "التقسيط:"}</span>{" "}
                        <span dir="auto" className="font-bold text-[#0f1724]">«{issue.value}»</span> — {issue.reason}
                      </p>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
