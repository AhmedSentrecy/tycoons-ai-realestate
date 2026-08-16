import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { CheckCircle2, MessageCircle, Search, SlidersHorizontal } from "lucide-react";
import Navbar from "@/sections/Navbar";
import Footer from "@/sections/Footer";
import ProjectResultCard from "@/components/ProjectResultCard";
import SmartSearchBar from "@/components/SmartSearchBar";
import { usePropertySearch } from "@/hooks/usePropertySearch";
import { groupByProject } from "@/lib/searchDisplay";
import { openSearchWhatsApp } from "@/lib/whatsapp";

const GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";
const EXAMPLES = [
  "شقة في التجمع تحت 10 مليون",
  "فيلا في زايد بمقدم 5%",
  "شاليه في الساحل استلام قريب",
  "وحدة متشطبة وتقسيط 10 سنين",
];

export default function SearchPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const q = (params.get("q") ?? "").trim();
  const { results, search, inventory } = usePropertySearch();
  const [visible, setVisible] = useState(24);

  useEffect(() => {
    document.title = q ? `نتائج البحث: ${q} | Tycoons Investments` : "البحث | Tycoons Investments";
    let robots = document.head.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    const previousRobots = robots.content;
    robots.content = "noindex,follow";
    return () => {
      if (robots) robots.content = previousRobots || "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";
    };
  }, [q]);

  useEffect(() => {
    setVisible(24);
    if (q && inventory.units.length) search(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, inventory.units.length]);

  const exactGroups = useMemo(() => groupByProject(results.exact), [results]);
  const altGroups = useMemo(() => groupByProject(results.alternatives), [results]);
  const total = results.totalExact + results.totalAlternatives;

  return (
    <div dir="rtl" className="min-h-screen bg-[#f7f2ea] text-[#1b2420]">
      <Navbar />
      <section className="bg-[#0d1f18] px-5 pb-10 pt-28 text-white lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold text-[#d9b87c]"><Link to="/" className="hover:underline">الرئيسية</Link> / البحث</p>
          <div className="mt-4 grid items-end gap-7 lg:grid-cols-[1fr_0.85fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/70">
                <Search className="h-3.5 w-3.5 text-[#d9b87c]" /> بحث مباشر في المخزون الحالي
              </span>
              <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl">
                {q ? "الاختيارات الأقرب لطلبك" : "قولنا بتدور على إيه"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
                اكتب المنطقة ونوع الوحدة والميزانية والمقدم أو التقسيط، وهنرتب النتائج حسب أقرب تطابق.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur sm:p-4">
              <SmartSearchBar compact initialQuery={q} />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button key={example} type="button" onClick={() => navigate(`/search?q=${encodeURIComponent(example)}`)} className="rounded-full border border-white/15 px-3.5 py-2 text-xs text-white/75 transition hover:border-[#d9b87c]/60 hover:bg-white/10 hover:text-white">
                {example}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-5 pb-20 pt-8 lg:px-8">
        {q && (
          <div className="mb-7 rounded-3xl border border-[#e3d7c0] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[#8a6630]">طلب البحث</p>
                <h2 className="mt-1 text-xl font-extrabold text-[#0d1f18] sm:text-2xl">{q}</h2>
                {results.interpreted && <p className="mt-2 text-sm font-semibold text-[#92733f]">{results.interpreted}</p>}
              </div>
              {!inventory.loading && total > 0 && (
                <div className="flex gap-2 text-center">
                  <div className="rounded-2xl bg-[#e9f6ee] px-4 py-2.5"><b className="block text-xl text-[#126a3b]">{exactGroups.length.toLocaleString("en-US")}</b><span className="text-[11px] text-[#51705d]">مشروع مطابق</span></div>
                  <div className="rounded-2xl bg-[#fff4db] px-4 py-2.5"><b className="block text-xl text-[#896719]">{altGroups.length.toLocaleString("en-US")}</b><span className="text-[11px] text-[#7d6a3b]">بديل قريب</span></div>
                </div>
              )}
            </div>
          </div>
        )}

        {inventory.loading && (
          <p className="py-16 text-center text-sm font-semibold text-[#6d7a72]">بنحمّل المخزون المحدث...</p>
        )}

        {!inventory.loading && exactGroups.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-700" /><h2 className="text-lg font-extrabold text-emerald-900">نتائج مطابقة لطلبك</h2></div>
            <div className={GRID}>
              {exactGroups.slice(0, visible).map((group) => (
                <ProjectResultCard key={group.key} group={group} query={q} />
              ))}
            </div>
          </section>
        )}

        {!inventory.loading && altGroups.length > 0 && (
          <section className={exactGroups.length ? "mt-10" : ""}>
            <div className="mb-4 flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-amber-700" /><h2 className="text-lg font-extrabold text-amber-900">
              {exactGroups.length ? "بدائل قريبة" : "أقرب بدائل متاحة"}
            </h2></div>
            <div className={GRID}>
              {altGroups.slice(0, Math.max(6, visible - exactGroups.length)).map((group) => (
                <ProjectResultCard key={`alt-${group.key}`} group={group} query={q} />
              ))}
            </div>
          </section>
        )}

        {!inventory.loading && exactGroups.length + altGroups.length > visible && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setVisible((v) => v + 24)}
              className="rounded-full border border-[#d8ccb4] bg-white px-8 py-3 text-sm font-extrabold text-[#5e5139] transition-colors hover:bg-[#f4efe2]"
            >
              اعرض المزيد من النتائج
            </button>
          </div>
        )}

        {!inventory.loading && q && !exactGroups.length && !altGroups.length && (
          <div className="rounded-3xl border border-[#e7ddc8] bg-white px-6 py-14 text-center">
            <p className="text-base font-extrabold">ملقيناش نتيجة قريبة كفاية</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#6d7a72]">
              ابعتلنا نفس الطلب على واتساب وهنراجع كل الاختيارات المتاحة يدويًا ونرد عليك بأحدث الأسعار.
            </p>
            <button
              type="button"
              onClick={() => openSearchWhatsApp(q)}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1faa59] px-6 py-3 text-sm font-bold text-white"
            >
              <MessageCircle className="h-4 w-4" /> كمّل على واتساب
            </button>
          </div>
        )}

        {!inventory.loading && !q && (
          <div className="rounded-3xl border border-[#e7ddc8] bg-white px-6 py-16 text-center">
            <Search className="mx-auto h-9 w-9 text-[#a3854e]" />
            <p className="mt-4 text-lg font-extrabold">ابدأ بوصف العقار اللي بتدور عليه</p>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-[#6d7a72]">كل ما تكتب تفاصيل أكتر عن المنطقة والميزانية ونوع الوحدة، ترتيب النتائج يبقى أدق.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
