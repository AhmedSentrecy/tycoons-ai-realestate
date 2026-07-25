import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView, animate } from "framer-motion";
import { ChevronDown } from "lucide-react";
import SmartSearchBar from "@/components/SmartSearchBar";

const chips = ["شاليه في الساحل", "آي فيلا في التجمع", "شقة تحت ٧ مليون", "استلام فوري"];

const stats = [
  { value: 644, suffix: "+", label: "مشروع متاح" },
  { value: 5, suffix: "", label: "مناطق رئيسية" },
  { value: 8, suffix: "", label: "مطوّرون موثوقون" },
  { value: 10, suffix: "", label: "سنين تقسيط" },
];

function Counter({ target, suffix }: { target: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, target, {
      duration: 1.8,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, target]);

  return (
    <span ref={ref} className="tabular-nums">
      {val.toLocaleString("ar-EG")}
      {suffix}
    </span>
  );
}

const ease = [0.22, 1, 0.36, 1] as const;

function LiquidSearchBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.82);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -70, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -70, opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 top-24 z-40 flex justify-center px-5"
        >
          <div className="liquid-glass w-full max-w-2xl rounded-[2rem] p-2 shadow-[0_25px_70px_-18px_rgba(10,25,18,0.55)]">
            <SmartSearchBar compact />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Hero() {
  return (
    <section className="relative min-h-[100svh] overflow-hidden">
      <LiquidSearchBar />
      {/* Background */}
      <motion.img
        src="/images/hero.webp"
        alt="فيلا فاخرة على الساحل الشمالي"
        initial={{ scale: 1.12 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.2, ease }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#08130e]/70 via-[#08130e]/35 to-[#08130e]/85" />
      <div className="absolute inset-0 bg-gradient-to-l from-[#08130e]/45 to-transparent" />

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-center px-5 pb-28 pt-32 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.9, ease }}
          className="mb-7 flex items-center gap-2.5"
        >
          <span className="h-2 w-2 rounded-full bg-[#d9b87c] animate-pulse-dot" />
          <span className="text-sm font-medium tracking-wide text-[#e3cfa0]">
            بحث عقاري بالذكاء الاصطناعي
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 34 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1, ease }}
          className="max-w-3xl text-balance text-[42px] font-extrabold leading-[1.25] text-white sm:text-6xl lg:text-[72px] lg:leading-[1.2]"
        >
          ابحث بصوتك بأي حاجة تيجي في بالك،
          <span className="gold-gradient-text block">وإحنا نوصّلك للعقار المناسب.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.9, ease }}
          className="mt-6 max-w-xl text-base font-light leading-relaxed text-white/75 sm:text-lg"
        >
          اكتب أو اتكلم بطريقتك — «عايز شاليه في الساحل تحت ٩ مليون» — والنتائج تظهر جوه
          المحادثة على طول، من غير ما تدوّر.
        </motion.p>

        {/* Search panel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 1, ease }}
          className="glass mt-10 max-w-2xl rounded-3xl p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)]"
        >
          <SmartSearchBar />
          <div className="mt-3 flex flex-wrap items-center gap-2 px-2 pb-1">
            <span className="text-xs text-white/55">جرّب:</span>
            {chips.map((c) => (
              <button
                key={c}
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("tycoons:quick-search", { detail: c }))
                }
                className="rounded-full border border-white/20 px-3.5 py-1.5 text-xs text-white/85 transition-colors hover:border-[#d9b87c]/60 hover:bg-white/10 hover:text-white"
              >
                {c}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.15, duration: 1, ease }}
          className="mt-14 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4"
        >
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-bold text-white sm:text-4xl">
                <Counter target={s.value} suffix={s.suffix} />
              </div>
              <div className="mt-1.5 text-[13px] font-light text-white/60">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll hint */}
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
