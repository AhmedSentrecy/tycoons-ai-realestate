import { Link } from "react-router";
import { MessageCircle } from "lucide-react";
import { fallbackImageFor } from "@/lib/inventory";
import type { GroupedResult } from "@/lib/searchDisplay";
import {
  arabicBeds,
  arabicDelivery,
  arabicDownPayment,
  arabicInstallments,
  arabicType,
  formatMillions,
  formatMillionsRange,
  typesSummary,
  unitsCountLabel,
} from "@/lib/searchDisplay";
import { openUnitWhatsApp } from "@/lib/whatsapp";
import { parseSearchQuery } from "@/lib/propertySearch";

interface Props {
  group: GroupedResult;
  query: string;
}

export default function ProjectResultCard({ group, query }: Props) {
  const unit = group.best.unit;
  const criteria = parseSearchQuery(query);
  const showPaymentEstimate = Boolean(criteria.monthlyInstallmentMax || criteria.downPaymentCashMax);
  const payment = group.best.paymentEstimate;
  const image = group.image || fallbackImageFor(unit);
  const facts: string[] = [];
  const types = typesSummary(group);
  if (types) facts.push(types);
  if (group.bedsRange) facts.push(group.bedsRange);
  const dp = arabicDownPayment(unit.down_payment_text);
  if (dp) facts.push(dp);
  const inst = arabicInstallments(unit.installments_text);
  if (inst) facts.push(inst);
  const delivery = arabicDelivery(unit.delivery_text);
  if (delivery && facts.length < 4) facts.push(delivery);

  const diff = !group.best.exact && group.best.differences[0];
  const bestLabel = [arabicType(unit.unit_type), unit.area_sqm ? `${unit.area_sqm} م²` : "", arabicBeds(unit.bedrooms_text)]
    .filter(Boolean)
    .join(" · ");
  const projectPath = group.projectSlug ? `/projects/${group.projectSlug}` : unit.id ? `/units/${unit.id}` : "";

  return (
    <article className="overflow-hidden rounded-2xl border border-[#e7ddc8] bg-white">
      <div className="relative h-[125px] bg-gradient-to-br from-[#2a4a3a] to-[#0d1f18]">
        <img src={image} alt={group.projectName} loading="lazy" className="h-full w-full object-cover" />
        <span
          className={`absolute right-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${
            group.exact ? "bg-[#d3f5e2] text-[#0b6b3a]" : "bg-[#fdeeca] text-[#8a6a1f]"
          }`}
        >
          {group.exact ? "مطابقة" : "بديل قريب"}
        </span>
        <span className="absolute bottom-2.5 left-2.5 rounded-full bg-[#0d1f18]/85 px-2.5 py-1 text-[11px] font-bold text-[#ecd9ae]">
          {unitsCountLabel(group.unitsCount)}
        </span>
      </div>
      <div className="p-3.5">
        <div className="text-lg font-black text-[#9b793f]">
          {formatMillionsRange(group.minPrice, group.maxPrice)}
          <span className="mr-1 text-[11px] font-semibold text-[#6d7a72]"> جنيه{group.maxPrice <= group.minPrice ? " · يبدأ من" : ""}</span>
        </div>
        <h3 className="mt-0.5 text-[15px] font-extrabold text-[#0d1f18]">{group.projectName}</h3>
        <p className="text-xs text-[#6d7a72]">
          {group.developer} · {group.location}
        </p>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {facts.map((fact) => (
            <span key={fact} className="rounded-[10px] bg-[#f6f2e9] px-2 py-1 text-[11px] font-semibold text-[#536058]">
              {fact}
            </span>
          ))}
        </div>

        {diff ? (
          <div className="mt-2.5 rounded-xl border border-[#f3dfae] bg-[#fff7e6] px-2.5 py-1.5 text-[11.5px] font-bold text-[#7c5f1c]">
            الفرق عن طلبك: {diff}
          </div>
        ) : (
          bestLabel && (
            <div className="mt-2.5 flex items-center justify-between border-t border-dashed border-[#e8dfcd] pt-2 text-xs text-[#536058]">
              <span>أقرب وحدة لطلبك:</span>
              <b className="text-[#0d1f18]">
                {bestLabel} · {formatMillions(unit.starting_price)}
              </b>
            </div>
          )
        )}

        {showPaymentEstimate && payment && (
          <div className="mt-2.5 rounded-xl border border-[#cfe6d8] bg-[#edf8f1] px-3 py-2 text-[#24583d]">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold">القسط الشهري التقريبي</span>
              <b className="text-sm text-[#123c29]">{new Intl.NumberFormat("en-EG", { maximumFractionDigits: 0 }).format(payment.monthlyInstallment)} جنيه</b>
            </div>
            <p className="mt-1 text-[10.5px] text-[#557263]">
              على {payment.installmentYears} سنين · مقدم محسوب {new Intl.NumberFormat("en-EG", { maximumFractionDigits: 0 }).format(payment.downPaymentValue)} جنيه · بدون دفعات أو مصاريف إضافية
            </p>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          {projectPath && (
            <Link
              to={projectPath}
              className="flex-1 rounded-full bg-[#14352a] py-2.5 text-center text-[12.5px] font-extrabold text-[#efe3c6] transition-transform hover:scale-[1.02]"
            >
              صفحة المشروع والوحدات
            </Link>
          )}
          <button
            type="button"
            onClick={() => openUnitWhatsApp(unit, query)}
            aria-label="واتساب"
            className="grid w-11 shrink-0 place-items-center rounded-full bg-[#1faa59] text-white"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
