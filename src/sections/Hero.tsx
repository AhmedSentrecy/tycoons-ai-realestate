import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform, animate } from "framer-motion";
import { Mic, Search, Sparkles, ChevronDown } from "lucide-react";

const chips = ["شاليه في الساحل", "آي فيلا في التجمع", "شقة تحت ٧ مليون", "استلام فوري"];

const stats = [
  { value: 644, suffix: "+", label: "مشروع متاح" },
  { value: 5, suffix: "", label: "مناطق رئيسية" },
  { value: 8, suffix: "", label: "مطوّرون موثوقون" },
  { value: 10, suffix: "", label: "سنين تقسيط" },
];

const tickerItems = [
  "الساحل الشمالي · ١٣٧ مشروع",
  "التجمع · ٣١٤ مشروع",
  "الشيخ زايد · ١٤٩ مشروع",
  "العين السخنة · ٧ مشاريع",
  "العاصمة الإدارية · ٣٧ مشروع",
];

const line1 = "ابحث بصوتك بأي حاجة";
const line2 = "تيجي في بالك —";
const line3 = "ونوصّلك للعقار المناسب.";

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

function Words({ text, delay, className }: { text: string; delay: number; className?: string }) {
  return (
    <span className={className}>
      {text.split(" ").map((w, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 34, rotate: 2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ delay: delay + i * 0.09, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block"
        >
          {w}
          {i < text.split(" ").length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </span>
  );
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 900], [0, 260]);
  const bgScale = useTransform(scrollY, [0, 900], [1, 1.12]);
  const fade = useTransform(scrollY, [0, 650], [1, 0]);

  return (
    <section ref={sectionRef} className="relative min-h-[100svh] overflow-hidden bg-[#0d1f18]">
      {/* Parallax background */}
      <motion.div style={{ y: bgY, scale: bgScale }} className="absolute inset-0">
        <img
          src="/images/hero.webp"
          alt="فيلا فاخرة على الساحل الشمالي"
          className="h-full w-full object-cover"
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d1f18]/80 via-[#0d1f18]/40 to-[#0d1f18]" />
      <div className="absolute inset-0 bg-gradient-to-l from-[#0d1f18]/50 to-transparent" />

      {/* Drifting glows */}
      <div className="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-[#c49b5f]/14 blur-[130px] animate-glow-drift" />
      <div
        className="pointer-events-none absolute -right-24 top-16 h-80 w-80 rounded-full bg-[#d9b87c]/10 blur-[120px] animate-glow-drift"
        style={{ animationDelay: "-6s" }}
      />

      {/* Content */}
      <motion.div
        style={{ opacity: fade }}
        className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-center px-5 pb-36 pt-32 lg:px-8"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mb-7 inline-flex w-fit items-center gap-2.5 rounded-full border border-[#c49b5f]/30 bg-[#c49b5f]/10 px-4 py-2"
        >
          <span className="h-2 w-2 rounded-full bg-[#c49b5f] animate-pulse-dot" />
          <span className="text-sm font-medium text-[#d9b87c]">بحث عقاري بالذكاء الاصطناعي</span>
        </motion.div>

        <h1 className="max-w-4xl text-balance text-[44px] font-black leading-[1.3] text-white sm:text-6xl lg:text-[80px] lg:leading-[1.25]">
          <Words text={line1} delay={0.45} />
          <Words text={line2} delay={0.85} className="block" />
          <Words text={line3} delay={1.25} className="gold-gradient-text block" />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7, duration: 0.8 }}
          className="mt-6 max-w-xl text-base font-light leading-relaxed text-white/70 sm:text-lg"
        >
          اكتب أو اتكلم بطريقتك — «عايز شاليه في الساحل تحت ٩ مليون» — والنتائج تظهر جوه
          المحادثة على طول، من غير ما تدوّر.
        </motion.p>

        {/* Search panel */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 1.9, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="glass-dark mt-10 max-w-2xl rounded-3xl p-3 shadow-[0_40px_100px_-25px_rgba(0,0,0,0.8)]"
        >
          <div className="flex items-center gap-3 rounded-2xl bg-[#f7f2ea] px-4 py-3.5">
            <Sparkles className="h-5 w-5 shrink-0 text-[#c49b5f]" />
            <input
              type="text"
              placeholder="عايز شاليه في الساحل أو آي فيلا في التجمع..."
              className="w-full bg-transparent text-[15px] text-[#1a1d24] outline-none placeholder:text-[#8a867b]"
            />
            <button
              aria-label="بحث صوتي"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#e7ddc8] text-[#a06a48] transition-colors hover:bg-[#eee9dd]"
            >
              <Mic className="h-5 w-5" />
            </button>
            <button className="flex shrink-0 items-center gap-2 rounded-full bg-[#0d1f18] px-6 py-3 text-sm font-bold text-[#f7f2ea] transition-all hover:scale-[1.04] hover:bg-[#c49b5f] hover:text-[#231a0c]">
              <Search className="h-4 w-4" />
              ابحث
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 px-2 pb-1">
            <span className="text-xs text-white/50">جرّب:</span>
            {chips.map((c) => (
              <button
                key={c}
                className="rounded-full border border-white/15 px-3.5 py-1.5 text-xs text-white/80 transition-all hover:border-[#c49b5f]/60 hover:bg-[#c49b5f]/15 hover:text-white"
              >
                {c}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.15, duration: 0.9 }}
          className="mt-14 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4"
        >
          {stats.map((s) => (
            <div key={s.label} className="border-r-2 border-[#c49b5f]/40 pr-4">
              <div className="text-3xl font-black text-white sm:text-4xl">
                <Counter target={s.value} suffix={s.suffix} />
              </div>
              <div className="mt-1.5 text-[13px] font-light text-white/55">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.6 }}
        className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2 text-white/50"
      >
        <ChevronDown className="h-6 w-6 animate-float-slow" />
      </motion.div>

      {/* Ticker */}
      <div className="absolute inset-x-0 bottom-0 z-10 border-t border-white/10 bg-[#0d1f18]/80 py-4 backdrop-blur-md">
        <div className="flex w-max animate-marquee-fast gap-0">
          {[...tickerItems, ...tickerItems].map((t, i) => (
            <span key={i} className="flex items-center whitespace-nowrap text-sm font-medium text-white/60">
              <span className="px-6">{t}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#c49b5f]" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
