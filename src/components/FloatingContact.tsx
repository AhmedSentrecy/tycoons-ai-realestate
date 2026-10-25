import { MessageCircle, Phone } from "lucide-react";

const WHATSAPP_NUMBER = "201110100025";

/**
 * Contact that follows the visitor while scrolling: a bottom bar (WhatsApp + call)
 * on phones, a round WhatsApp button on larger screens. Pages that use it add
 * bottom padding on phones so the bar never covers the footer.
 */
export default function FloatingContact({ message }: { message: string }) {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  return (
    <>
      <div dir="rtl" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-[1fr_auto] gap-2 border-t border-[#e0d3bb] bg-white/95 px-3 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgba(0,0,0,0.08)] backdrop-blur md:hidden">
        <a href={href} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-full bg-[#1faa59] py-3 font-bold text-white">
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          كلّمنا واتساب
        </a>
        <a href={`tel:+${WHATSAPP_NUMBER}`} aria-label="اتصل بنا" className="grid h-12 w-12 place-items-center rounded-full border border-[#0d1f18] text-[#0d1f18]">
          <Phone className="h-5 w-5" aria-hidden="true" />
        </a>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label="تواصل معنا على واتساب"
        className="fixed bottom-6 left-6 z-40 hidden h-14 w-14 place-items-center rounded-full bg-[#1faa59] text-white shadow-xl transition hover:scale-105 md:grid"
      >
        <MessageCircle className="h-7 w-7" aria-hidden="true" />
      </a>
    </>
  );
}
