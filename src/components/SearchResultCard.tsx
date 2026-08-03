import { useMemo, useRef, useState } from "react";
import { Link } from "react-router";
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
import { fallbackImageFor } from "@/lib/inventory";
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
  const images = useMemo(
    () => (unit.images.length ? unit.images : [fallbackImageFor(unit)]),
    [unit],
  );
  const [imageIndex, setImageIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const moveImage = (direction: number) => {
    setImageIndex((current) => (current + direction + images.length) % images.length);
  };

  const finishSwipe = (endX: number) => {
    if (touchStartX.current == null) return;
    const distance = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) < 45) return;
    moveImage(distance > 0 ? -1 : 1);
  };

  const primaryDifference = result.differences[0] || "اختيار قريب من طلبك";

  return (
    <article
      className={`h-full overflow-hidden rounded-2xl border transition-all ${
        result.exact
          ? "border-[#d9cfb9] bg-white hover:border-[#c49b5f]/70"
          : "border-amber-200 bg-amber-50/55 hover:border-amber-300"
      }`}
    >
      <div
        className="relative aspect-[16/9] w-full touch-pan-y overflow-hidden bg-[#eee8dc]"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => finishSwipe(event.changedTouches[0]?.clientX ?? 0)}
      >
        <img
          src={images[imageIndex]}
          alt={`${unit.project_name} ${unit.unit_type}`}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          width={800}
          height={450}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

        <span
          className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-extrabold shadow-sm ${
            result.exact ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
          }`}
        >
          {result.exact ? "مطابقة" : "بديل قريب"}
        </span>

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="الصورة السابقة"
              onClick={() => moveImage(-1)}
              className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="الصورة التالية"
              onClick={() => moveImage(1)}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold text-white">
              {imageIndex + 1} / {images.length}
            </span>
            <div
              className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5"
              aria-label="اختيار صورة"
            >
              {images.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  aria-label={`الصورة ${index + 1}`}
                  aria-current={index === imageIndex}
                  onClick={() => setImageIndex(index)}
                  className={`h-1.5 rounded-full shadow-sm transition-all ${
                    index === imageIndex ? "w-4 bg-white" : "w-1.5 bg-white/55"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="p-3.5 sm:p-4">
        {!result.exact && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-100/70 px-3 py-2 text-[11px] font-bold leading-relaxed text-amber-950">
            أقرب بديل — {primaryDifference}
          </div>
        )}

        <div>
          <h4 className="break-words text-[15px] font-black leading-snug text-[#18251f]">
            {unit.project_name}
          </h4>
          <p className="mt-1 break-words text-[11px] leading-relaxed text-[#6d7a72]">
            {detail(unit.developer)}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#536058]">
          <span className="flex min-w-0 items-start gap-1.5 rounded-lg bg-[#f6f2e9] px-2.5 py-2 leading-relaxed">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="break-words">{detail(unit.location)}</span>
          </span>
          <span className="flex min-w-0 items-start gap-1.5 rounded-lg bg-[#f6f2e9] px-2.5 py-2 leading-relaxed">
            <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="break-words">{unit.unit_type}</span>
          </span>
          <span className="flex min-w-0 items-start gap-1.5 rounded-lg bg-[#f6f2e9] px-2.5 py-2 leading-relaxed">
            <BedDouble className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="break-words">{detail(unit.bedrooms_text)}</span>
          </span>
          <span className="flex min-w-0 items-start gap-1.5 rounded-lg bg-[#f6f2e9] px-2.5 py-2 leading-relaxed">
            <Ruler className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{unit.area_sqm ? `${unit.area_sqm} م²` : "غير محدد"}</span>
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-[#eee6d7] pt-3">
          <div>
            <div className="text-[10px] text-[#7b877f]">يبدأ من</div>
            <div className="text-lg font-black text-[#9b793f]">{formatPrice(unit.starting_price)}</div>
          </div>
          <div className="flex max-w-full items-start gap-1.5 text-[11px] leading-relaxed text-[#5d6b63]">
            <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="break-words">{detail(unit.delivery_text)}</span>
          </div>
        </div>

        {unit.id && (
          <Link
            to={`/units/${unit.id}`}
            className="mt-3 inline-flex text-xs font-extrabold text-[#8a6630] hover:underline"
          >
            افتح صفحة الوحدة
          </Link>
        )}

        {(result.matchReasons.length > 0 || result.differences.length > 1) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {result.matchReasons.slice(0, 3).map((reason) => (
              <span key={reason} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] text-emerald-800">
                {reason}
              </span>
            ))}
            {result.differences.slice(result.exact ? 0 : 1, result.exact ? 2 : 3).map((difference) => (
              <span key={difference} className="rounded-full bg-amber-100/80 px-2.5 py-1 text-[10px] text-amber-950">
                {difference}
              </span>
            ))}
          </div>
        )}

        {expanded && (
          <div className="mt-3 grid gap-2 rounded-xl border border-[#e8dfcd] bg-[#fbf8f1] p-3 text-[11px] leading-relaxed text-[#536058] sm:grid-cols-2">
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

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onToggle}
            className="rounded-full border border-[#d8ccb4] px-3 py-2.5 text-xs font-bold text-[#5e5139] transition-colors hover:bg-[#f4efe2]"
          >
            {expanded ? "اقفل التفاصيل" : "عرض التفاصيل"}
          </button>
          <button
            type="button"
            onClick={() => openUnitWhatsApp(unit, query)}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#1faa59] px-3 py-2.5 text-xs font-bold text-white transition-transform hover:scale-[1.02]"
          >
            <MessageCircle className="h-3.5 w-3.5" /> واتساب
          </button>
        </div>
      </div>
    </article>
  );
}
