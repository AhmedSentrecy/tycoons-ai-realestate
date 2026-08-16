import { useRef } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { BedDouble, Ruler, KeyRound, MessageCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { projects } from "@/data/projects";
import { openProjectWhatsApp } from "@/lib/whatsapp";

const ease = [0.22, 1, 0.36, 1] as const;



export default function Projects() {
  const scroller = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: number) =>
    scroller.current?.scrollBy({ left: dir * 420, behavior: "smooth" });

  return (
    <section className="relative overflow-hidden bg-[#0d1f18] py-16 lg:py-20">
      {/* subtle glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[#1d4a38]/30 blur-[140px]" />

      <div className="relative mx-auto max-w-6xl px-5 lg:px-8">
        {/* Heading */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease }}
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-400/25 bg-red-400/10 px-3.5 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse-dot" />
              <span className="text-xs font-semibold tracking-wide text-red-300">مباشر</span>
            </div>
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">بتتطرح دلوقتي</h2>
            <p className="mt-3 max-w-md text-sm font-light leading-relaxed text-white/60">
              أول فرصة لمشاريع لسه نازلة — من المطوّرين مباشرة، قبل السوق كله.
            </p>
          </motion.div>

          {/* Scroll controls */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex items-center gap-3"
          >
            <span className="hidden text-xs font-light text-white/40 sm:block">
              اسحب أو استخدم الأسهم
            </span>
            <button
              onClick={() => scrollBy(1)}
              aria-label="السابق"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white transition-all hover:border-[#c49b5f] hover:bg-[#c49b5f] hover:text-[#231a0c]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => scrollBy(-1)}
              aria-label="التالي"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white transition-all hover:border-[#c49b5f] hover:bg-[#c49b5f] hover:text-[#231a0c]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </motion.div>
        </div>
      </div>

      {/* Horizontal scroller */}
      <div
        ref={scroller}
        dir="rtl"
        className="scrollbar-hide relative flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 lg:px-[max(2rem,calc((100vw-72rem)/2+2rem))]"
      >
        {projects.map((p, i) => (
          <motion.article
            key={p.title}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.75, delay: (i % 3) * 0.1, ease }}
            className="group w-[275px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/10 transition-all duration-500 hover:-translate-y-1.5 hover:bg-white/[0.07] hover:ring-[#d9b87c]/35 sm:w-[310px]"
          >
            {/* Image */}
            <div className="relative aspect-[16/10] overflow-hidden">
              <img
                src={p.image}
                alt={p.title}
                width={1012}
                height={733}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
              <span
                className={`absolute right-4 top-4 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-lg ${
                  p.badge === "جديد"
                    ? "bg-[#c49b5f] text-[#231a0c]"
                    : "bg-emerald-500/90 text-white"
                }`}
              >
                {p.badge}
              </span>
              <span className="absolute bottom-4 right-4 rounded-full bg-black/45 px-3.5 py-1.5 text-xs text-white/90 backdrop-blur-sm">
                {p.location}
              </span>
            </div>

            {/* Body */}
            <div className="p-4">
              <div className="text-xs font-medium text-[#d9b87c]">
                {p.type} · {p.developer}
              </div>
              <h3 className="mt-2 text-[17px] font-bold leading-snug text-white">{p.title}</h3>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-xs text-white/50">يبدأ من</span>
                <span className="text-lg font-extrabold text-[#ecd9ae]">{p.price}</span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-center">
                {[
                  { icon: BedDouble, v: p.beds, l: "غرف" },
                  { icon: Ruler, v: p.area, l: "المساحة" },
                  { icon: KeyRound, v: p.delivery, l: "الاستلام" },
                ].map(({ icon: Icon, v, l }) => (
                  <div key={l}>
                    <Icon className="mx-auto h-4 w-4 text-[#c49b5f]/80" />
                    <div className="mt-1.5 text-[13px] font-semibold text-white/90">{v}</div>
                    <div className="text-[10px] text-white/45">{l}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <Link
                  to={p.projectSlug ? `/projects/${p.projectSlug}` : `/regions/${p.regionSlug}`}
                  className="flex flex-1 items-center justify-center rounded-full border border-white/20 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-white/10"
                >
                  تفاصيل المشروع
                </Link>
                <button
                  type="button"
                  onClick={() => openProjectWhatsApp(p)}
                  className="grid w-11 place-items-center rounded-full bg-[#1faa59] text-white transition-transform hover:scale-105"
                  aria-label="واتساب"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
