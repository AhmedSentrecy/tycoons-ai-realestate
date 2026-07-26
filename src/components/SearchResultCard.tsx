import { useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  MapPin,
  MessageCircle,
  Ruler,
} from "lucide-react";
import { fallbackImageFor, inventoryUnitKey } from "@/lib/inventory";
import type { RankedInventoryUnit } from "@/lib/propertySearch";
import { openUnitWhatsApp } from "@/lib/whatsapp";

interface Props {
  result: RankedInventoryUnit;
  query: string;
  expanded: boolean;
  onToggle: () => void;
}

function formatPrice(value: number): string {
  return `${new Intl.NumberFormat("en-EG", { maximumFractionDigits: 0 }).format(value)} EGP`;
}

function detail(value: string): string {
  return value?.trim() || "غير محدد";
}

export default function SearchResultCard({ result, query, expanded, onToggle }: Props) {
  const { unit } = result;
  const key = inventoryUnitKey(unit);
  const images = useMemo(
    () => (unit.images.length ? unit.images : [fallbackImageFor(unit)]),
    [unit],
  );
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => setImageIndex(0), [key]);

  const moveImage = (direction: number) => {
    setImageIndex((current) => (current + direction + images.length) % images.length);
  };

  return (
    <article
      className={`rounded-2xl border p-3 transition-all ${
        result.exact
          ? "border-[#d9cfb9] bg-white hover:border-[#c49b5f]/70"
          : "border-amber-200 bg-amber-50/45 hover:border-amber-300"
      }`}
    >
      <div className="flex gap-3">
        <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-[#eee8dc]">
          <img
            src={images[imageIndex]}
            alt={`${unit.project_name} ${unit.unit_type}`}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="الصورة السابقة"
                onClick={() => moveImage(-1)}
                className="absolute left-1 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="الصورة التالية"
                onClick={() => moveImage(1)}
                className="absolute right-1 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <span className="absolute bottom-1 right-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] text-white">
                {imageIndex + 1}/{images.length}
              </span>
            </>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold text-[#18251f]">{unit.project_name}</div>
              <div className="mt-0.5 truncate text-[11px] text-[#6d7a72]">{detail(unit.developer)}</div>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                result.exact ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
              }`}
            >
              {result.exact ? "مطابقة" : "بديل قريب"}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-[#5d6b63]">
            <span className="flex min-w-0 items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" /> {detail(unit.location)}
            </span>
            <span className="flex min-w-0 items-center gap-1 truncate">
              <Building2 className="h-3 w-3 shrink-0" /> {unit.unit_type}
            </span>
            <span className="flex items-center gap-1">
              <BedDouble className="h-3 w-3" /> {detail(unit.bedrooms_text)}
            </span>
            <span className="flex items-center gap-1">
              <Ruler className="h-3 w-3" /> {unit.area_sqm ? `${unit.area_sqm} م²` : "غير محدد"}
            </span>
          </div>

          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <div className="text-[10px] text-[#7b877f]">يبدأ من</div>
              <div className="text-sm font-black text-[#a3854e]">{formatPrice(unit.starting_price)}</div>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[#6d7a72]">
              <Clock3 className="h-3 w-3" /> {detail(unit.delivery_text)}
            </div>
          </div>
        </div>
      </div>

      {(result.matchReasons.length > 0 || result.differences.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {result.matchReasons.slice(0, 3).map((reason) => (
            <span key={reason} className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] text-emerald-800">
              {reason}
            </span>
          ))}
          {result.differences.slice(0, 2).map((difference) => (
            <span key={difference} className="rounded-full bg-amber-100/70 px-2 py-1 text-[10px] text-amber-900">
              {difference}
            </span>
          ))}
        </div>
      )}

      {expanded && (
        <div className="mt-3 grid gap-2 rounded-xl border border-[#e8dfcd] bg-[#fbf8f1] p-3 text-[11px] text-[#536058] sm:grid-cols-2">
          <div><strong className="text-[#233129]">المقدم:</strong> {detail(unit.down_payment_text)}</div>
          <div><strong className="text-[#233129]">التقسيط:</strong> {detail(unit.installments_text)}</div>
          <div><strong className="text-[#233129]">التشطيب:</strong> {detail(unit.finishing)}</div>
          <div><strong className="text-[#233129]">آخر تحديث:</strong> {detail(unit.last_updated_at)}</div>
          {unit.description && <p className="sm:col-span-2">{unit.description}</p>}
          {unit.brochure_url && (
            <a
              href={unit.brochure_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-bold text-[#8d6f3d] underline underline-offset-4"
            >
              <FileText className="h-3.5 w-3.5" /> افتح البروشور
            </a>
          )}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 rounded-full border border-[#d8ccb4] px-4 py-2 text-xs font-bold text-[#5e5139] transition-colors hover:bg-[#f4efe2]"
        >
          {expanded ? "اقفل التفاصيل" : "عرض التفاصيل"}
        </button>
        <button
          type="button"
          onClick={() => openUnitWhatsApp(unit, query)}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#1faa59] px-4 py-2 text-xs font-bold text-white transition-transform hover:scale-[1.02]"
        >
          <MessageCircle className="h-3.5 w-3.5" /> واتساب
        </button>
      </div>
    </article>
  );
}
