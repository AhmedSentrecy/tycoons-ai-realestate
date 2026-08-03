import { Link } from "react-router";
import { MessageCircle } from "lucide-react";
import { fallbackImageFor } from "@/lib/inventory";
import type { GroupedResult } from "@/lib/searchDisplay";
import {
  arabicDelivery,
  arabicDownPayment,
  formatMillions,
  shortLocation,
  typesSummary,
  unitsCountLabel,
} from "@/lib/searchDisplay";
import { openUnitWhatsApp } from "@/lib/whatsapp";

interface Props {
  group: GroupedResult;
  query: string;
  onNavigate?: () => void;
}

export default function SearchResultRow({ group, query, onNavigate }: Props) {
  const unit = group.best.unit;
  const image = group.image || fallbackImageFor(unit);
  const chips: string[] = [];
  const types = typesSummary(group);
  if (types) chips.push(group.bedsRange ? `${types} · ${group.bedsRange}` : types);
  const loc = shortLocation(unit.location);
  if (loc) chips.push(loc);
  const extra = arabicDownPayment(unit.down_payment_text) || arabicDelivery(unit.delivery_text);
  if (extra) chips.push(extra);
  const diff = !group.best.exact && group.best.differences[0];

  const projectPath = group.projectSlug ? `/projects/${group.projectSlug}` : unit.id ? `/units/${unit.id}` : "";

  return (
    <div className="flex items-center gap-3 border-b border-[#f1ead9] px-4 py-3 transition-colors hover:bg-[#f6f1e4]">
      <img
        src={image}
        alt={group.projectName}
        loading="lazy"
        width={74}
        height={56}
        className="h-14 w-[74px] shrink-0 rounded-xl object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-extrabold text-[#0d1f18]">
          {group.projectName}
          <span className="mr-1 text-[11px] font-semibold text-[#6d7a72]">
            {" "}· {group.developer}
            {group.unitsCount > 1 ? ` · ${unitsCountLabel(group.unitsCount)}` : ""}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span key={chip} className="rounded-full bg-[#f1ebdc] px-2 py-0.5 text-[10.5px] text-[#536058]">
              {chip}
            </span>
          ))}
          {diff && (
            <span className="rounded-full bg-[#fdf0d5] px-2 py-0.5 text-[10.5px] font-bold text-[#8a6a1f]">
              {diff}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-left">
        <div className="whitespace-nowrap text-[15px] font-black text-[#9b793f]">
          {formatMillions(group.minPrice)}
          <span className="block text-[10px] font-semibold text-[#6d7a72]">يبدأ من · جنيه</span>
        </div>
        <div className="mt-1 flex justify-end gap-1.5">
          {projectPath && (
            <Link
              to={projectPath}
              onClick={onNavigate}
              className="rounded-full border border-[#d8ccb4] bg-white px-2.5 py-1 text-[10.5px] font-extrabold text-[#5e5139]"
            >
              المشروع
            </Link>
          )}
          <button
            type="button"
            onClick={() => openUnitWhatsApp(unit, query)}
            className="inline-flex items-center gap-1 rounded-full bg-[#1faa59] px-2.5 py-1 text-[10.5px] font-extrabold text-white"
          >
            <MessageCircle className="h-3 w-3" /> واتساب
          </button>
        </div>
      </div>
    </div>
  );
}
