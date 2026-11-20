import { isEnglish, tr } from "@/lib/homeLanguage";
import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView } from "framer-motion";
import SmartSearchBar from "@/components/SmartSearchBar";
import GuideOrb, { nudgeOrb, orbEnergy, wakeOrbs } from "@/components/home/GuideOrb";
import { HOME_H1_ACCENT, HOME_H1_LEAD } from "@/lib/homeSeo";
import { useInventory } from "@/lib/inventory";

// Unit-type tabs fill the search box with a starting word; the visitor finishes the sentence.
const tabs = [
  { label: tr("الكل"), fill: "" },
  { label: tr("شقق"), fill: tr("شقة ") },
  { label: tr("فيلات"), fill: tr("فيلا ") },
  { label: tr("تاون هاوس"), fill: tr("تاون هاوس ") },
  { label: tr("شاليهات"), fill: tr("شاليه ") },
  { label: tr("استلام فوري"), fill: tr("استلام فوري ") },
];

const chips = [
  tr("شاليه في الساحل تحت 20 مليون"),
  tr("آي فيلا في التجمع 3 غرف"),
  tr("شقة تحت 7 مليون"),
  tr("استلام فوري متشطب"),
];

function Counter({ target, suffix }: { target: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, target, { duration: 1.6, ease: [0.22, 1, 0.36, 1], onUpdate: (next) => setValue(Math.round(next)) });
    return () => controls.stop();
  }, [inView, target]);
  return (
    <span ref={ref} className="tabular-nums">
      {value.toLocaleString(isEnglish() ? "en-US" : "ar-EG")}
      {suffix}
    </span>
  );
}

const ease = [0.22, 1, 0.36, 1] as const;

export default function Hero() {
  const { stats } = useInventory();
  const [tab, setTab] = useState(0);
  const [orbSize, setOrbSize] = useState(150);
  useEffect(() => {
    const fit = () => setOrbSize(window.innerWidth < 640 ? 112 : 150);
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const liveStats = [
    { value: stats.units, suffix: "+", label: tr("وحدة متاحة") },
    { value: stats.projects, suffix: "", label: tr("مشروع") },
    { value: stats.developers, suffix: "", label: tr("مطوّر") },
    { value: stats.locations, suffix: "", label: tr("منطقة وموقع") },
  ];
  const loaded = stats.units > 0;

  return (
    <section className="relative px-4 pb-8 pt-6 text-center text-white sm:px-8 sm:pb-10 sm:pt-8">
      <div
        className="mx-auto max-w-3xl"
        onInput={() => nudgeOrb()}
        onFocus={() => nudgeOrb(1)}
        onClick={(event) => {
          // The mic button makes the orb ripple while it listens.
          if ((event.target as HTMLElement).closest('form button[aria-pressed]')) { orbEnergy.listening = !orbEnergy.listening; wakeOrbs(); }
        }}
      >
        <GuideOrb size={orbSize} className="mx-auto -mb-2" />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[12.5px] backdrop-blur"
        >
          <span className="h-2 w-2 rounded-full bg-[#3ee07f] shadow-[0_0_0_4px_rgba(62,224,127,0.2)]" />
          {loaded ? <>{stats.units.toLocaleString(isEnglish() ? "en-US" : "ar-EG")}+ {tr("وحدة متاحة من المطوّرين — الأسعار وطرق الدفع بتتحدّث أول بأول")}</> : tr("بحث عقاري بالذكاء الاصطناعي")}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.8, ease }}
          className="mx-auto mt-4 text-balance text-[28px] font-extrabold leading-[1.3] sm:text-[44px] lg:text-[50px] lg:leading-[1.25]"
        >
          {tr(HOME_H1_LEAD)}
          <span className="gold-gradient-text block">{tr(HOME_H1_ACCENT)}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease }}
          className="mx-auto mt-3 max-w-xl text-sm font-light leading-relaxed text-white/80 sm:text-base"
        >
          {tr("اكتب أو اتكلم زي ما بتكلم صاحبك — المنطقة والميزانية وعدد الغرف — وهنطلعلك الوحدات المطابقة والبدائل القريبة فورًا.")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease }}
          className="mt-6 rounded-3xl bg-white p-2.5 text-start text-[#0f1724] shadow-[0_30px_80px_-25px_rgba(0,0,0,0.6)]"
        >
          <div role="group" aria-label={tr("نوع الوحدة")} className="scrollbar-hide flex gap-1.5 overflow-x-auto px-1 pb-2.5 pt-1">
            {tabs.map((item, index) => (
              <button
                key={item.label}
                type="button"
                aria-pressed={tab === index}
                onClick={() => {
                  setTab(index);
                  window.dispatchEvent(new CustomEvent("tycoons:prefill-search", { detail: item.fill }));
                  document.getElementById("tycoons-search-query")?.focus();
                }}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                  tab === index ? "bg-[#0b1b30] text-white" : "bg-[#f1f4f9] text-[#3b4658] hover:bg-[#e3e9f2]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <SmartSearchBar placeholder={tr("مثال: شقة 3 غرف في التجمع تحت 10 مليون")} />
          <div className="flex flex-wrap items-center gap-2 px-1.5 pb-1 pt-3">
            <span className="text-xs text-[#8a93a3]">{tr("أو جرّب:")}</span>
            {chips.map((chip) => (
              <button
                type="button"
                key={chip}
                onClick={() => window.dispatchEvent(new CustomEvent("tycoons:quick-search", { detail: chip }))}
                className="rounded-full border border-[#e3e9f2] px-3 py-1.5 text-xs text-[#3b4658] transition-colors hover:border-[#ff5a36] hover:text-[#e0441f]"
              >
                {chip}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Only once the live numbers are in (no "—" placeholders). */}
        {loaded && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
            className="mt-5 grid grid-cols-4 overflow-hidden rounded-2xl border border-white/15 bg-white/[0.07] backdrop-blur"
          >
            {liveStats.map((stat, index) => (
              <div key={stat.label} className={`px-1 py-3 ${index ? "border-s border-white/10" : ""}`}>
                <div className="text-lg font-extrabold sm:text-2xl">
                  <Counter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="mt-0.5 text-[10.5px] text-white/65 sm:text-xs">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
