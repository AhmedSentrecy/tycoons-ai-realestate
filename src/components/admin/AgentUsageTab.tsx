import { useCallback, useEffect, useState } from "react";
import { adminApi, type AgentUsageReport } from "../../lib/adminApi";
import { useAdmin } from "./AdminContext";
import { Badge, Chip, EmptyState } from "./ui";

const TOOL_LABELS: Record<string, string> = {
  search_properties: "بحث عن وحدات",
  get_property_details: "تفاصيل وحدة",
  compare_properties: "مقارنة وحدات",
  calculate_payment_plan: "حساب أقساط",
  get_inventory_summary: "ملخص المخزون",
  create_whatsapp_inquiry: "تجهيز رسالة واتساب",
};

const MCP_COLOR = "#0d1f18";
const WEBMCP_COLOR = "#a3854e";

function toolLabel(tool: string) {
  return TOOL_LABELS[tool] ?? tool;
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[#e7ddc8] bg-white p-4">
      <p className="text-xs font-bold text-[#5c6a62]">{label}</p>
      <p className="mt-1 text-3xl font-black tabular-nums">{value.toLocaleString("en-US")}</p>
      {hint && <p className="mt-1 text-[11px] text-[#5c6a62]">{hint}</p>}
    </div>
  );
}

function DailyChart({ report }: { report: AgentUsageReport }) {
  const max = Math.max(1, ...report.by_day.map((day) => day.mcp + day.webmcp));
  return (
    <div className="rounded-2xl border border-[#e7ddc8] bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs font-bold">
        <span className="me-auto text-sm font-black">الاستخدام يوم بيوم</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: MCP_COLOR }} /> MCP
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: WEBMCP_COLOR }} /> WebMCP
        </span>
      </div>
      <div dir="ltr" className="flex h-40 items-end gap-[2px]" role="img" aria-label="عدد مرات الاستخدام في كل يوم">
        {report.by_day.map((day) => {
          const total = day.mcp + day.webmcp;
          return (
            <div
              key={day.day}
              title={`${day.day}: ${total} (MCP ${day.mcp} · WebMCP ${day.webmcp})`}
              className="flex h-full min-w-0 flex-1 flex-col justify-end"
            >
              {day.webmcp > 0 && <div style={{ height: `${(day.webmcp / max) * 100}%`, background: WEBMCP_COLOR }} className="rounded-t-sm" />}
              {day.mcp > 0 && (
                <div style={{ height: `${(day.mcp / max) * 100}%`, background: MCP_COLOR }} className={day.webmcp > 0 ? "" : "rounded-t-sm"} />
              )}
              {total === 0 && <div className="h-px bg-[#e7ddc8]" />}
            </div>
          );
        })}
      </div>
      <div dir="ltr" className="mt-1 flex justify-between text-[11px] text-[#5c6a62]">
        <span>{report.by_day[0]?.day}</span>
        <span>{report.by_day.at(-1)?.day}</span>
      </div>
    </div>
  );
}

export default function AgentUsageTab() {
  const { token, handleError } = useAdmin();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [report, setReport] = useState<AgentUsageReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    adminApi
      .agentUsage(token, days)
      .then(setReport)
      .catch((error) => {
        setReport(null);
        handleError(error);
      })
      .finally(() => setLoading(false));
  }, [token, days, handleError]);

  useEffect(load, [load]);

  const maxTool = Math.max(1, ...(report?.by_tool.map((item) => item.calls) ?? [1]));

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="me-auto text-sm text-[#5c6a62]">
          كل مرة أداة ذكاء اصطناعي (زي ChatGPT أو Claude أو Gemini في Chrome) بتستخدم بيانات الموقع بتتسجل هنا.
        </p>
        {([7, 30, 90] as const).map((value) => (
          <Chip
            key={value}
            active={days === value}
            onClick={() => {
              if (value === days) return;
              setLoading(true);
              setDays(value);
            }}
          >
            آخر {value} يوم
          </Chip>
        ))}
        <button
          onClick={() => {
            setLoading(true);
            load();
          }}
          disabled={loading} className="rounded-full bg-[#f7f2ea] px-3 py-1.5 text-xs font-black disabled:opacity-40">
          تحديث
        </button>
      </div>

      {loading && !report && <p className="p-6 text-center text-sm font-bold">جاري التحميل…</p>}

      {report && report.total === 0 && (
        <EmptyState
          title="لسه مفيش استخدام مسجّل"
          text="العداد بيبدأ يحسب من لحظة تفعيله. أول ما أي AI يستخدم الموقع هيظهر هنا."
        />
      )}

      {report && report.total > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Stat label="إجمالي الاستخدام" value={report.total} hint={report.truncated ? "أول 10,000 بس" : undefined} />
            <Stat label="MCP (من بره الموقع)" value={report.mcp} />
            <Stat label="WebMCP (جوه المتصفح)" value={report.webmcp} />
            <Stat label="رسايل واتساب اتجهزت" value={report.whatsapp_inquiries} hint="مش معناها إنها اتبعتت" />
          </div>

          <DailyChart report={report} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[#e7ddc8] bg-white p-4">
              <p className="mb-3 text-sm font-black">أكتر حاجة بيتعمل</p>
              <div className="space-y-2">
                {report.by_tool.map((item) => (
                  <div key={item.tool}>
                    <div className="mb-1 flex justify-between text-xs font-bold">
                      <span>{toolLabel(item.tool)}</span>
                      <span className="tabular-nums">{item.calls.toLocaleString("en-US")}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#f1eadc]">
                      <div className="h-2 rounded-full bg-[#a3854e]" style={{ width: `${(item.calls / maxTool) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              {report.failed > 0 && (
                <p className="mt-3 text-xs text-red-600">{report.failed.toLocaleString("en-US")} محاولة فشلت</p>
              )}
            </div>

            <div className="rounded-2xl border border-[#e7ddc8] bg-white p-4">
              <p className="mb-3 text-sm font-black">آخر الطلبات</p>
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {report.recent.map((call, index) => (
                  <div key={`${call.created_at}-${index}`} className="rounded-xl bg-[#faf7f1] p-2 text-xs">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="me-auto font-black">{toolLabel(call.tool)}</span>
                      <Badge tone={call.channel === "webmcp" ? "gold" : "muted"}>{call.channel === "webmcp" ? "WebMCP" : "MCP"}</Badge>
                      {!call.ok && <Badge tone="error">فشل</Badge>}
                    </div>
                    {call.query && <p className="mt-1 break-words">{call.query}</p>}
                    <p className="mt-1 text-[11px] text-[#5c6a62]">
                      {new Date(call.created_at).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}
                      {call.result_count !== null && ` · ${call.result_count} نتيجة`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
