import { ArrowLeft, ArrowRight } from "lucide-react";
import { isEnglish, tr } from "@/lib/homeLanguage";

/** The "see more" link that closes each homepage section, pointing to the full list. */
export default function SeeMore({ href, label, tone = "light" }: { href: string; label?: string; tone?: "light" | "dark" }) {
  const Arrow = isEnglish() ? ArrowRight : ArrowLeft;
  return (
    <div className="mt-8 flex justify-center">
      <a
        href={href}
        className={`group inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold transition-colors ${
          tone === "dark"
            ? "border border-white/25 text-white hover:border-[#ff5a36] hover:bg-[#ff5a36]"
            : "border border-[#0b1b30]/15 bg-white text-[#0b1b30] hover:border-[#ff5a36] hover:text-[#e0441f]"
        }`}
      >
        {label ?? tr("المزيد")}
        <Arrow aria-hidden="true" className="h-4 w-4 transition-transform group-hover:-translate-x-0.5 ltr:group-hover:translate-x-0.5" />
      </a>
    </div>
  );
}
