import { useEffect, useState } from "react";

const EXPORT_API = "https://coqnjymekrkoausiiytm.supabase.co/functions/v1/sales-war-room-export";

function routeSlug() {
  const match = window.location.pathname.match(/^\/sales-war-room\/a\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function filenameFromDisposition(value: string | null, slug: string) {
  const match = String(value || "").match(/filename="?([^";]+)"?/i);
  return match?.[1] || `${slug || "agent"}-clients.xlsx`;
}

export default function SalesWarRoomExport() {
  const slug = routeSlug();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [lang, setLang] = useState<"en" | "ar">(
    (localStorage.getItem("warRoomLang") as "en" | "ar") || "en",
  );
  const t = (en: string, ar: string) => (lang === "ar" ? ar : en);

  useEffect(() => {
    if (!slug) return;
    const id = window.setInterval(() => {
      const next = (localStorage.getItem("warRoomLang") as "en" | "ar") || "en";
      setLang(next);
    }, 1000);
    return () => window.clearInterval(id);
  }, [slug]);

  async function exportClients() {
    if (!slug || downloading) return;
    const token = localStorage.getItem(`warRoomAgentToken:${slug}`) || "";
    if (!token) {
      setError(t("Open the agent dashboard first.", "افتح داشبورد الـAgent الأول."));
      return;
    }

    try {
      setDownloading(true);
      setError("");
      const response = await fetch(EXPORT_API, {
        method: "GET",
        headers: { "x-agent-token": token },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Export failed: ${response.status}`);
      }

      const blob = await response.blob();
      const filename = filenameFromDisposition(response.headers.get("Content-Disposition"), slug);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (e: any) {
      setError(e?.message === "unauthorized"
        ? t("Your session expired. Sign in again.", "جلسة الدخول انتهت. ادخل تاني.")
        : String(e?.message || e));
    } finally {
      setDownloading(false);
    }
  }

  if (!slug) return null;

  return (
    <>
      <button
        onClick={exportClients}
        disabled={downloading}
        className="fixed bottom-5 start-5 z-[90] rounded-full bg-slate-950 px-4 py-3 text-xs font-black text-white shadow-2xl ring-4 ring-white/70 transition hover:-translate-y-0.5 disabled:opacity-60 md:px-5 md:text-sm"
      >
        {downloading ? t("Exporting…", "جاري التصدير…") : `⬇ ${t("Export Excel", "تصدير Excel")}`}
      </button>
      {error && (
        <button
          onClick={() => setError("")}
          className="fixed bottom-20 start-5 z-[91] max-w-[280px] rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-start text-xs font-bold text-red-700 shadow-lg"
        >
          {error} · ✕
        </button>
      )}
    </>
  );
}
