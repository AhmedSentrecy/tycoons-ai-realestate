import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { MessageCircle } from "lucide-react";
import Navbar from "@/sections/Navbar";
import Footer from "@/sections/Footer";
import ProjectResultCard from "@/components/ProjectResultCard";
import SmartSearchBar from "@/components/SmartSearchBar";
import { usePropertySearch } from "@/hooks/usePropertySearch";
import { groupByProject } from "@/lib/searchDisplay";
import { openSearchWhatsApp } from "@/lib/whatsapp";

const GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = (params.get("q") ?? "").trim();
  const { results, search, inventory } = usePropertySearch();
  const [visible, setVisible] = useState(24);

  useEffect(() => {
    document.title = q ? `نتائج البحث: ${q} | Tycoons Investments` : "البحث | Tycoons Investments";
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
      <main className="mx-auto max-w-7xl px-5 pb-20 pt-28 lg:px-8">
        <div className="mb-8">
          <p className="text-xs font-bold text-[#8a6630]">
            <Link to="/" className="hover:underline">الرئيسية</Link> / نتائج البحث
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-[#0d1f18] sm:text-4xl">
            {q ? `نتائج البحث عن: ${q}` : "ابحث عن عقارك"}
          </h1>
          {results.interpreted && (
            <p className="mt-2 text-sm font-semibold text-[#92733f]">{results.interpreted}</p>
          )}
          {q && !inventory.loading && (
            <p className="mt-1 text-sm text-[#6d7a72]">
              {total
                ? `${exactGroups.length.toLocaleString("ar-EG")} مشروع مطابق و${altGroups.length.toLocaleString("ar-EG")} مشروع بديل (${total.toLocaleString("ar-EG")} وحدة)`
                : "لا توجد نتائج مطابقة حالياً"}
            </p>
          )}
          <div className="mt-6 max-w-2xl">
            <SmartSearchBar compact />
          </div>
        </div>

        {inventory.loading && (
          <p className="py-16 text-center text-sm font-semibold text-[#6d7a72]">بنحمّل المخزون المحدث...</p>
        )}

        {!inventory.loading && exactGroups.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-extrabold text-emerald-900">نتائج مطابقة</h2>
            <div className={GRID}>
              {exactGroups.slice(0, visible).map((group) => (
                <ProjectResultCard key={group.key} group={group} query={q} />
              ))}
            </div>
          </section>
        )}

        {!inventory.loading && altGroups.length > 0 && (
          <section className={exactGroups.length ? "mt-10" : ""}>
            <h2 className="mb-3 text-lg font-extrabold text-amber-900">
              {exactGroups.length ? "بدائل قريبة" : "أقرب بدائل متاحة"}
            </h2>
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
      </main>
      <Footer />
    </div>
  );
}
