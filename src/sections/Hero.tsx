import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView } from "framer-motion";
import { ChevronDown } from "lucide-react";
import SmartSearchBar from "@/components/SmartSearchBar";
import { HOME_H1_ACCENT, HOME_H1_LEAD } from "@/lib/homeSeo";
import { useInventory } from "@/lib/inventory";

const chips = [
  "شاليه في الساحل تحت 20 مليون",
  "آي فيلا في التجمع 3 غرف",
  "شقة تحت 7 مليون",
  "استلام فوري متشطب",
];

function Counter({ target, suffix }: { target: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, target, {
      duration: 1.8,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (next) => setValue(Math.round(next)),
    });
    return () => controls.stop();
  }, [inView, target]);

  return (
    <span ref={ref} className="tabular-nums">
      {value.toLocaleString("ar-EG")}
      {suffix}
    </span>
  );
}

const ease = [0.22, 1, 0.36, 1] as const;

export default function Hero() {
  const { stats } = useInventory();
  const liveStats = [
    { value: stats.units, suffix: "+", label: "وحدة متاحة" },
    { value: stats.projects, suffix: "", label: "مشروع" },
    { value: stats.developers, suffix: "", label: "مطوّر" },
    { value: stats.locations, suffix: "", label: "منطقة وموقع" },
  ];

  return (
    <section className="relative min-h-[86svh] overflow-hidden">
      <motion.img
        src="/images/hero.webp"
        alt="فيلا فاخرة على الساحل الشمالي"
        width={1767}
        height={1080}
        decoding="async"
        {...({ fetchpriority: "high" } as Record<string, string>)}
        initial={{ scale: 1.12 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.2, ease }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#08130e]/70 via-[#08130e]/35 to-[#08130e]/85" />
      <div className="absolute inset-0 bg-gradient-to-l from-[#08130e]/45 to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-[86svh] max-w-6xl flex-col justify-center px-5 pb-14 pt-24 sm:pb-16 sm:pt-28 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.9, ease }}
          className="mb-7 flex items-center gap-2.5"
        >
          <span className="h-2 w-2 animate-pulse-dot rounded-full bg-[#d9b87c]" />
          <span className="text-sm font-medium tracking-wide text-[#e3cfa0]">
            بحث عقاري بالذكاء الاصطناعي
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 34 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1, ease }}
          className="max-w-3xl text-balance text-[32px] font-extrabold leading-[1.25] text-white sm:text-5xl lg:text-[54px] lg:leading-[1.2]"
        >
          {HOME_H1_LEAD}
          <span className="gold-gradient-text block">{HOME_H1_ACCENT}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.9, ease }}
          className="mt-4 max-w-xl text-sm font-light leading-relaxed text-white/75 sm:text-base"
        >
          اكتب أو اتكلم بطريقتك — «عايز شاليه في الساحل تحت 20 مليون» — وشوف الوحدات
          المطابقة والبدائل القريبة من المخزون المحدث.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 1, ease }}
          className="glass mt-7 max-w-2xl rounded-2xl p-2.5 shadow-[0_24px_65px_-20px_rgba(0,0,0,0.55)] sm:p-3"
        >
          <SmartSearchBar />
          <p className="mt-3 px-2 text-xs leading-relaxed text-white/65">
            هتنتقل لصفحة نتائج كاملة تعرض المشاريع المطابقة والبدائل والفروق عن طلبك.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 px-2 pb-1">
            <span className="text-xs text-white/55">جرّب:</span>
            {chips.map((chip) => (
              <button
                type="button"
                key={chip}
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("tycoons:quick-search", { detail: chip }))
                }
                className="rounded-full border border-white/20 px-3.5 py-1.5 text-xs text-white/85 transition-colors hover:border-[#d9b87c]/60 hover:bg-white/10 hover:text-white"
              >
                {chip}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.15, duration: 1, ease }}
          className="mt-7 grid max-w-2xl grid-cols-2 gap-x-6 gap-y-4 border-t border-white/15 pt-5 sm:grid-cols-4"
        >
          {liveStats.map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-bold text-white sm:text-3xl">
                <Counter target={stat.value} suffix={stat.suffix} />
              </div>
              <div className="mt-1.5 text-[13px] font-light text-white/60">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="absolute bottom-7 left-1/2 z-10 -translate-x-1/2 text-white/60"
      >
        <ChevronDown className="h-6 w-6 animate-float-slow" />
      </motion.div>
    </section>
  );
}
