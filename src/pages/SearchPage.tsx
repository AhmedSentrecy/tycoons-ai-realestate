import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { MessageCircle } from "lucide-react";
import Navbar from "@/sections/Navbar";
import Footer from "@/sections/Footer";
import SearchResultCard from "@/components/SearchResultCard";
import SmartSearchBar from "@/components/SmartSearchBar";
import { usePropertySearch } from "@/hooks/usePropertySearch";
import { inventoryUnitKey } from "@/lib/inventory";
import { openSearchWhatsApp } from "@/lib/whatsapp";

const GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = (params.get("q") ?? "").trim();
  const { results, search, inventory } = usePropertySearch();
  const [expandedKey, setExpandedKey] = useState("");

  useEffect(() => {
    document.title = q ? `نتائج البحث: ${q} | Tycoons Investments` : "البحث | Tycoons Investments";
  }, [q]);

  useEffect(() => {
    if (q && inventory.units.length) search(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, inventory.units.length]);

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
                ? `${results.totalExact.toLocaleString("ar-EG")} نتيجة مطابقة و${results.totalAlternatives.toLocaleString("ar-EG")} بديل قريب`
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

        {!inventory.loading && results.exact.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-extrabold text-emerald-900">نتائج مطابقة</h2>
            <div className={GRID}>
              {results.exact.map((result) => {
                const key = inventoryUnitKey(result.unit);
                return (
                  <SearchResultCard
                    key={key}
                    result={result}
                    query={q}
                    expanded={expandedKey === key}
                    onToggle={() => setExpandedKey((c) => (c === key ? "" : key))}
                  />
                );
              })}
            </div>
          </section>
        )}

        {!inventory.loading && results.alternatives.length > 0 && (
          <section className={results.exact.length ? "mt-10" : ""}>
            <h2 className="mb-3 text-lg font-extrabold text-amber-900">
              {results.exact.length ? "بدائل قريبة" : "أقرب بدائل متاحة"}
            </h2>
            <div className={GRID}>
              {results.alternatives.map((result) => {
                const key = inventoryUnitKey(result.unit);
                return (
                  <SearchResultCard
                    key={`alt-${key}`}
                    result={result}
                    query={q}
                    expanded={expandedKey === key}
                    onToggle={() => setExpandedKey((c) => (c === key ? "" : key))}
                  />
                );
              })}
            </div>
          </section>
        )}

        {!inventory.loading && q && !results.exact.length && !results.alternatives.length && (
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
