import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import GuideOrb, { nudgeOrb } from "@/components/home/GuideOrb";
import { isEnglish } from "@/lib/homeLanguage";
import { useInventory } from "@/lib/inventory";
import { useHomeNews } from "@/sections/News";
import { guideWhatsAppUrl } from "@/lib/whatsapp";

/**
 * The homepage guide: a small ball of light that follows the reader down the page and, each time
 * they stop scrolling, says one new thing about the part of the page they are looking at.
 * Numbers come from the live inventory and the news list; it has no visible name.
 */

type Action = { label: string; kind: "search" | "wa" | "top"; value?: string };
type Line = { text: string; actions?: Action[] };

const READY = /ready|immediate|فوري|جاهز/i;
const SAHEL = /north coast|sahel|alamein|ras el|الساحل|العلمين/i;
const NEW_CAIRO = /new cairo|fifth settlement|tagamo|التجمع|القاهرة الجديدة/i;
const CHALET = /chalet|شاليه/i;

export default function PageGuide() {
  const english = isEnglish();
  const { units, stats } = useInventory();
  const news = useHomeNews(english);
  const [open, setOpen] = useState(false);
  const [closed, setClosed] = useState(false);
  const [typing, setTyping] = useState(false);
  const [line, setLine] = useState<Line | null>(null);
  const zone = useRef("");
  const spoken = useRef<{ zone: string; index: Record<string, number> }>({ zone: "", index: {} });
  const moved = useRef(0);

  const n = useCallback((value: number) => (english ? value.toLocaleString("en-US") : value.toLocaleString("ar-EG")), [english]);

  const lines = useMemo<Record<string, Line[]>>(() => {
    const ready = units.filter((u) => READY.test(u.delivery_text)).length;
    const sahelChalets = units.filter((u) => SAHEL.test(u.location) && CHALET.test(u.unit_type)).length;
    const newCairo = units.filter((u) => NEW_CAIRO.test(u.location)).length;
    const under10 = units.filter((u) => u.starting_price > 0 && u.starting_price < 10_000_000).length;
    const newsCount = news?.length ?? 0;
    const ar = !english;
    const L = (arText: string, enText: string, actions?: Action[]): Line => ({ text: ar ? arText : enText, actions });
    const search = (arLabel: string, enLabel: string, arQ: string, enQ: string): Action => ({ label: ar ? arLabel : enLabel, kind: "search", value: ar ? arQ : enQ });
    const wa = (arLabel: string, enLabel: string, topic: string): Action => ({ label: ar ? arLabel : enLabel, kind: "wa", value: topic });
    const top: Action = { label: ar ? "ابدأ البحث" : "Start searching", kind: "top" };

    return {
      "s-news": [
        L("صباح الخير. هفضل معاك لحد آخر الصفحة وأقولك على المهم في كل جزء.", "Good morning. I'll stay with you down the page and point out what matters in each part.", [top]),
        ...(newsCount ? [L(`فيه ${n(newsCount)} ${newsCount === 1 ? "خبر" : "أخبار"} جديدة في آخر شهر عن المشاريع والأسعار.`, `${n(newsCount)} new ${newsCount === 1 ? "story" : "stories"} this month on projects and prices.`)] : []),
        L("تحب يوصلك ملخص الأخبار على واتساب؟", "Want a summary of the news on WhatsApp?", [wa("أيوه ابعتلي", "Yes, send it", "Please send me a summary of the latest property news.")]),
      ],
      "s-launch": [
        L("الضهر قرب. أحسن وقت تعاين فيه الوحدات الصبح بدري قبل الزحمة.", "Nearly noon. Early morning is the best time for a site visit, before the traffic.", [wa("احجز معاينة", "Book a visit", "I'd like to book a site visit.")]),
        ...(under10 ? [L(`فيه ${n(under10)} وحدة تحت ١٠ مليون. أطلعهالك؟`, `${n(under10)} units are under 10 million EGP. Show them?`, [search("تحت ١٠ مليون", "Under 10M", "وحدة تحت 10 مليون", "unit under 10 million")])] : []),
        ...(ready ? [L(`فيه ${n(ready)} وحدة استلام فوري دلوقتي.`, `${n(ready)} units are ready to move into now.`, [search("استلام فوري", "Ready now", "استلام فوري", "ready to move")])] : []),
      ],
      "s-areas": [
        L("شايف الغروب ده؟ الساحل وقت الغروب حكاية تانية.", "See that sunset? The North Coast at sunset is something else.", sahelChalets ? [search(`${n(sahelChalets)} شاليه في الساحل`, `${n(sahelChalets)} North Coast chalets`, "شاليه في الساحل", "chalet in north coast")] : undefined),
        ...(newCairo ? [L(`في التجمع لوحده ${n(newCairo)} وحدة متاحة.`, `New Cairo alone has ${n(newCairo)} available units.`, [search("وحدات التجمع", "New Cairo units", "شقة في التجمع", "apartment in new cairo")])] : []),
        L("لو بتدوّر للسكن، قارن المسافة للشغل والمدارس قبل السعر.", "Buying to live in? Compare the distance to work and schools before the price."),
      ],
      "s-devs": [
        L("الدنيا بتليّل. لسه بدري تلاقي عقارك النهارده.", "Evening already. Still time to find your place today."),
        ...(stats.developers ? [L(`بنعرض وحدات ${n(stats.developers)} مطوّر، والأسعار وطرق الدفع بتتحدّث أول بأول.`, `We list units from ${n(stats.developers)} developers, with prices and payment plans kept up to date.`)] : []),
        L("عايز تقارن بين مطوّرين في التسليم وخطط السداد؟", "Want to compare developers on delivery and payment plans?", [wa("قارنلي", "Compare for me", "Please help me compare developers on delivery record and payment plans.")]),
      ],
      "s-faq": [
        L("أغلب الأسئلة عن المقدم والقسط. ابعتلنا الوحدة ونحسبهولك.", "Most questions are about the down payment. Send us the unit and we'll work out the instalments.", [wa("احسبلي القسط", "Work it out", "Please calculate the down payment and instalments for a unit I'm interested in.")]),
        L("لو سؤالك مش هنا، اكتبه في البحث فوق.", "If your question isn't here, type it in the search at the top.", [top]),
      ],
      "s-end": [
        L("الشبابيك كلها نوّرت. لقيت حاجة عجبتك؟", "Every window's lit. Found something you like?", [top, wa("كلّموني", "Contact me", "I'd like help choosing a property.")]),
        L("أرجعك للبحث؟", "Back to the search?", [top]),
      ],
    };
  }, [units, stats.developers, news, english, n]);

  const speak = useCallback(
    (force = false) => {
      const pool = lines[zone.current];
      if (!pool?.length) return;
      const state = spoken.current;
      const last = state.index[zone.current] ?? -1;
      if (!force && state.zone === zone.current && last >= pool.length - 1) return; // said everything here
      const next = (last + 1) % pool.length;
      state.index[zone.current] = next;
      state.zone = zone.current;
      nudgeOrb(1.4);
      setTyping(true);
      window.setTimeout(() => {
        setLine(pool[next]);
        setTyping(false);
      }, 520);
    },
    [lines],
  );

  useEffect(() => {
    const zones = Array.from(document.querySelectorAll<HTMLElement>("[data-sky-zone]"));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((entry) => { if (entry.isIntersecting) zone.current = entry.target.getAttribute("data-sky-zone") || ""; }),
      { rootMargin: "-48% 0px -48% 0px" },
    );
    zones.forEach((z) => io.observe(z));
    let lastY = window.scrollY;
    let timer = 0;
    const onScroll = () => {
      const dy = Math.abs(window.scrollY - lastY);
      lastY = window.scrollY;
      moved.current += dy;
      nudgeOrb(dy / 300);
      setOpen(window.scrollY > window.innerHeight * 0.35);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (window.scrollY <= window.innerHeight * 0.35) return;
        if (spoken.current.zone !== zone.current || moved.current > 160) {
          moved.current = 0;
          speak();
        }
      }, 280);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, [speak, news]);

  const run = (action: Action) => {
    if (action.kind === "search" && action.value) {
      window.dispatchEvent(new CustomEvent("tycoons:quick-search", { detail: action.value }));
    } else if (action.kind === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.setTimeout(() => document.getElementById("tycoons-search-query")?.focus(), 600);
    }
  };

  if (!open) return null;

  if (closed) {
    return (
      <button
        type="button"
        aria-label={english ? "Open tips" : "افتح الرسايل"}
        onClick={() => { setClosed(false); speak(true); }}
        className="fixed bottom-[max(12px,env(safe-area-inset-bottom))] start-3 z-50 rounded-full"
      >
        <GuideOrb size={54} />
      </button>
    );
  }

  return (
    <div role="status" aria-live="polite" className="fixed bottom-[max(12px,env(safe-area-inset-bottom))] start-3 z-50 flex max-w-[min(370px,calc(100vw-24px))] items-end gap-2">
      <button type="button" aria-label={english ? "Next tip" : "قولّي حاجة تانية"} onClick={() => speak(true)} className="shrink-0 rounded-full">
        <GuideOrb size={60} />
      </button>
      {(typing || line) && (
        <div className="min-w-0 rounded-[18px] rounded-ee-[4px] bg-white px-3.5 py-2.5 text-[13.5px] leading-relaxed text-[#0f1724] shadow-[0_20px_50px_-20px_rgba(6,15,28,0.55)]">
          {typing ? (
            <span className="inline-flex gap-1 py-1.5" aria-label={english ? "Typing" : "بيكتب"}>
              {[0, 1, 2].map((i) => (
                <i key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#b8c1cf]" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </span>
          ) : (
            line && (
              <>
                <button type="button" aria-label={english ? "Close" : "اقفل الرسايل"} onClick={() => setClosed(true)} className="float-end -me-1 ms-2 text-[#8a93a3] hover:text-[#0f1724]">
                  <X className="h-4 w-4" />
                </button>
                {line.text}
                {line.actions?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {line.actions.map((action) =>
                      action.kind === "wa" ? (
                        <a
                          key={action.label}
                          href={guideWhatsAppUrl(action.value || "")}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-[#1faa59]/40 bg-[#1faa59]/10 px-3 py-1 text-xs font-bold text-[#147a40] hover:bg-[#1faa59]/20"
                        >
                          {action.label}
                        </a>
                      ) : (
                        <button
                          key={action.label}
                          type="button"
                          onClick={() => run(action)}
                          className="rounded-full border border-[#e3e9f2] bg-[#f4f6fa] px-3 py-1 text-xs font-bold text-[#0b1b30] hover:border-[#ff5a36] hover:text-[#e0441f]"
                        >
                          {action.label}
                        </button>
                      ),
                    )}
                  </div>
                ) : null}
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}
