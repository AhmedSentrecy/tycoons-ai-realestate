import { useMemo, useState } from "react";
import { projects, type Project } from "@/data/projects";
import { regions } from "@/data/content";

// توحيد النص العربي عشان البحث يلاقي النتائج مهما كانت طريقة الكتابة
function normalizeArabic(s: string): string {
  return s
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[ًٌٍَُّْـ]/g, "")
    .trim();
}

const regionAliases: Record<string, string[]> = {
  sahel: ["ساحل", "الساحل", "الساحل الشمالي", "north coast", "مارينا", "سيدي عبد الرحمن"],
  "new-cairo": ["تجمع", "التجمع", "القاهره الجديده", "القاهرة الجديدة", "new cairo", "مدينتي", "المستقبل"],
  zayed: ["زايد", "الشيخ زايد", "اكتوبر", "أكتوبر", "sheikh zayed", "6 october"],
  sokhna: ["سخنه", "السخنه", "العين السخنة", "الجلاله", "الجلالة", "sokhna", "ain sokhna"],
  capital: ["عاصمه", "العاصمه", "العاصمة", "العاصمة الاداريه", "العاصمة الإدارية", "new capital", "administrative capital"],
};

const typeAliases: Record<string, string[]> = {
  "فيلا": ["فيلا", "villa", "فلل", "استاندالون", "standalone"],
  "تاون هاوس": ["تاون", "townhouse", "تاون هاوس"],
  "شاليه": ["شاليه", "chalet", "شاليهات"],
  "شقة": ["شقه", "شقة", "apartment", "شقق"],
  "بنتهاوس": ["بنتهاوس", "penthouse"],
};

export interface SearchResults {
  projects: Project[];
  regionSlug: string | null;
  interpreted: string; // وصف نصي لفهم المساعد للطلب
}

function parseBudget(q: string): number | null {
  // يلتقط «تحت ٩ مليون» / «اقل من 20 مليون» / «بـ 5 مليون»
  const m = normalizeArabic(q).match(/(\d+(?:\.\d+)?)\s*(?:مليون|m\b|million)/);
  if (m) return parseFloat(m[1]);
  return null;
}

// نسخة مستقلة — بتتستخدم من الـ TTS عشان يلخّص النتايج صوتيًا
export function searchResultsFor(query: string): SearchResults {
  return searchProperties(query);
}

export function searchProperties(query: string): SearchResults {
  const q = normalizeArabic(query);
  if (!q) return { projects: [], regionSlug: null, interpreted: "" };

  // تحديد المنطقة
  let regionSlug: string | null = null;
  for (const [slug, aliases] of Object.entries(regionAliases)) {
    if (aliases.some((a) => q.includes(normalizeArabic(a)))) {
      regionSlug = slug;
      break;
    }
  }

  // تحديد نوع الوحدة
  let type: string | null = null;
  for (const [t, aliases] of Object.entries(typeAliases)) {
    if (aliases.some((a) => q.includes(normalizeArabic(a)))) {
      type = t;
      break;
    }
  }

  const budget = parseBudget(q);
  const wantsImmediate = q.includes("فوري") || q.includes("استلام فوري");

  let results = projects.filter((p) => {
    if (regionSlug && p.regionSlug !== regionSlug) return false;
    if (type && p.type !== type) return false;
    if (budget !== null && p.priceM > budget) return false;
    if (wantsImmediate && !p.delivery.includes("فوري")) return false;
    return true;
  });

  // لو الفلاتر كلها مقفّلة، نرجّع نتائج المنطقة بس كاقتراح
  const relaxed =
    results.length === 0 && regionSlug
      ? projects.filter((p) => p.regionSlug === regionSlug)
      : results;

  // وصف الفهم
  const parts: string[] = [];
  if (type) parts.push(type);
  if (regionSlug) parts.push(`في ${regions.find((r) => r.slug === regionSlug)?.name ?? ""}`);
  if (budget !== null) parts.push(`تحت ${budget.toLocaleString("ar-EG")} مليون`);
  if (wantsImmediate) parts.push("استلام فوري");

  return {
    projects: relaxed,
    regionSlug,
    interpreted: parts.length ? `فهمناك: ${parts.join(" · ")}` : "",
  };
}

export function usePropertySearch() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const results = useMemo(() => searchProperties(submitted), [submitted]);

  return {
    query,
    setQuery,
    results,
    hasSearched: submitted.trim().length > 0,
    search: (q?: string) => {
      const final = (q ?? query).trim();
      if (final) {
        setQuery(final);
        setSubmitted(final);
      }
    },
    clear: () => {
      setQuery("");
      setSubmitted("");
    },
  };
}
