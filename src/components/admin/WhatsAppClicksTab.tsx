import { useCallback, useEffect, useState } from "react";
import { adminApi, type WhatsAppClickCount, type WhatsAppClicksReport } from "../../lib/adminApi";
import { useAdmin } from "./AdminContext";
import { Badge, Chip, EmptyState } from "./ui";

const SOURCE_LABELS: Record<string, string> = {
  google: "جوجل (بحث عادي)",
  google_ads: "إعلانات جوجل",
  facebook: "فيسبوك / إنستجرام",
  ai: "ChatGPT وأدوات AI",
  social: "سوشيال تانية",
  other_search: "محركات بحث تانية",
  referral: "مواقع تانية",
  direct: "مباشر (كتب اللينك أو من واتساب)",
};

const BUTTON_LABELS: Record<string, string> = {
  header: "زرار الهيدر",
  footer: "الفوتر",
  floating: "الزرار العايم",
  page: "زرار جوه الصفحة",
  button: "زرار",
};

const DEVICE_LABELS: Record<string, string> = { mobile: "موبايل", desktop: "كمبيوتر", tablet: "تابلت" };

function label(map: Record<string, string>, value: string | null | undefined) {
  if (!value) return "غير معروف";
  return map[value] ?? value;
}

function Stat({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[#e7ddc8] bg-white p-4">
      <p className="text-xs font-bold text-[#5c6a62]">{title}</p>
      <p className="mt-1 text-3xl font-black tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-[#5c6a62]">{hint}</p>}
    </div>
  );
}

function DailyChart({ report }: { report: WhatsAppClicksReport }) {
  const max = Math.max(1, ...report.by_day.map((day) => day.clicks));
  return (
    <div className="rounded-2xl border border-[#e7ddc8] bg-white p-4">
      <p className="mb-3 text-sm font-black">دوسات الواتساب يوم بيوم</p>
      <div dir="ltr" className="flex h-40 items-end gap-[2px]" role="img" aria-label="عدد دوسات الواتساب في كل يوم">
        {report.by_day.map((day) => (
          <div key={day.day} title={`${day.day}: ${day.clicks}`} className="flex h-full min-w-0 flex-1 flex-col justify-end">
            {day.clicks > 0 ? (
              <div style={{ height: `${(day.clicks / max) * 100}%`, background: "#1f9d55" }} className="rounded-t-sm" />
            ) : (
              <div className="h-px bg-[#e7ddc8]" />
            )}
          </div>
        ))}
      </div>
      <div dir="ltr" className="mt-1 flex justify-between text-[11px] text-[#5c6a62]">
        <span>{report.by_day[0]?.day}</span>
        <span>{report.by_day.at(-1)?.day}</span>
      </div>
    </div>
  );
}

function Breakdown({ title, items, map }: { title: string; items: WhatsAppClickCount[]; map?: Record<string, string> }) {
  const max = Math.max(1, ...items.map((item) => item.clicks));
  return (
    <div className="rounded-2xl border border-[#e7ddc8] bg-white p-4">
      <p className="mb-3 text-sm font-black">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-[#5c6a62]">لسه مفيش</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.name}>
              <div className="mb-1 flex justify-between gap-2 text-xs font-bold">
                <span className="truncate" dir="auto">{map ? label(map, item.name) : item.name}</span>
                <span className="tabular-nums">{item.clicks.toLocaleString("en-US")}</span>
              </div>
              <div className="h-2 rounded-full bg-[#f1eadc]">
                <div className="h-2 rounded-full bg-[#1f9d55]" style={{ width: `${(item.clicks / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WhatsAppClicksTab() {
  const { token, handleError } = useAdmin();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [report, setReport] = useState<WhatsAppClicksReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    adminApi
      .whatsappClicks(token, days)
      .then(setReport)
      .catch((error) => {
        setReport(null);
        handleError(error);
      })
      .finally(() => setLoading(false));
  }, [token, days, handleError]);

  useEffect(load, [load]);

  const perDay = report && report.days ? (report.total / report.days).toFixed(1) : "0";
  const topSource = report?.by_traffic_source[0];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="me-auto text-sm text-[#5c6a62]">
          كل دوسة على أي زرار واتساب في الموقع بتتسجل هنا. الرسالة بتوصلك فيها «كود الطلب» (زي T-7K2QM)، دوّر عليه هنا تعرف العميل جه منين.
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
          disabled={loading}
          className="rounded-full bg-[#f7f2ea] px-3 py-1.5 text-xs font-black disabled:opacity-40"
        >
          تحديث
        </button>
      </div>

      {loading && !report && <p className="p-6 text-center text-sm font-bold">جاري التحميل…</p>}

      {report && report.total === 0 && (
        <EmptyState
          title="لسه مفيش دوسات مسجّلة"
          text="العداد بيبدأ يحسب من لحظة تفعيله. أول ما حد يدوس واتساب في الموقع هيظهر هنا."
        />
      )}

      {report && report.total > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Stat title="إجمالي الدوسات" value={report.total.toLocaleString("en-US")} hint={report.truncated ? "أول 20,000 بس" : undefined} />
            <Stat title="في اليوم (متوسط)" value={perDay} />
            <Stat title="أكتر مصدر" value={topSource ? String(topSource.clicks) : "0"} hint={topSource ? label(SOURCE_LABELS, topSource.name) : undefined} />
            <Stat title="أكتر مشروع" value={report.by_project[0] ? String(report.by_project[0].clicks) : "0"} hint={report.by_project[0]?.name} />
          </div>

          <DailyChart report={report} />

          <div className="grid gap-4 md:grid-cols-2">
            <Breakdown title="جايين منين" items={report.by_traffic_source} map={SOURCE_LABELS} />
            <Breakdown title="أكتر المشاريع" items={report.by_project} />
            <Breakdown title="أكتر الصفحات" items={report.by_page} />
            <Breakdown title="أنهي زرار" items={report.by_button} map={BUTTON_LABELS} />
            <Breakdown title="الجهاز" items={report.by_device} map={DEVICE_LABELS} />
            {report.by_campaign.length > 0 && <Breakdown title="الحملات (utm_campaign)" items={report.by_campaign} />}
          </div>

          <div className="rounded-2xl border border-[#e7ddc8] bg-white p-4">
            <p className="mb-3 text-sm font-black">آخر الدوسات</p>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {report.recent.map((click, index) => (
                <div key={`${click.created_at}-${index}`} className="rounded-xl bg-[#faf7f1] p-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="me-auto font-black" dir="auto">{click.project || click.page_path || "—"}</span>
                    {click.code && <Badge tone="gold">{click.code}</Badge>}
                    <Badge tone="muted">{label(SOURCE_LABELS, click.traffic_source)}</Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-[#5c6a62]" dir="auto">
                    {new Date(click.created_at).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}
                    {click.button && ` · ${label(BUTTON_LABELS, click.button)}`}
                    {click.device && ` · ${label(DEVICE_LABELS, click.device)}`}
                    {click.page_path && ` · ${click.page_path}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
