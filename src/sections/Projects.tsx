import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { BedDouble, Ruler, KeyRound, MessageCircle, ChevronRight, ChevronLeft } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const projects = [
  {
    image: "/images/project-villa.webp",
    badge: "جديد",
    type: "فيلا",
    developer: "Hydepark Developments",
    title: "Standalone Villa Hydepark New Cairo",
    location: "التجمع / القاهرة الجديدة",
    price: "٧٤.٣ مليون جنيه",
    beds: "٥",
    area: "٣٢٨ م²",
    delivery: "سنة واحدة",
  },
  {
    image: "/images/project-townhouse.webp",
    badge: "جديد",
    type: "Townhouse",
    developer: "Hydepark Developments",
    title: "Townhouse Hydepark New Cairo",
    location: "التجمع / القاهرة الجديدة",
    price: "٢٩.٤ مليون جنيه",
    beds: "٣",
    area: "١٥٩ م²",
    delivery: "سنة واحدة",
  },
  {
    image: "/images/project-chalet.webp",
    badge: "متاح",
    type: "شاليه",
    developer: "La Vista Developments",
    title: "Chalet La Vista North Coast",
    location: "الساحل الشمالي",
    price: "١٨.٩ مليون جنيه",
    beds: "٣",
    area: "١٤٥ م²",
    delivery: "استلام فوري",
  },
  {
    image: "/images/project-apartment.webp",
    badge: "متاح",
    type: "شقة",
    developer: "SODIC",
    title: "Apartment SODIC West Zayed",
    location: "الشيخ زايد",
    price: "٦.٨ مليون جنيه",
    beds: "٢",
    area: "١٢٠ م²",
    delivery: "سنتين",
  },
  {
    image: "/images/region-newcairo.webp",
    badge: "جديد",
    type: "بنتهاوس",
    developer: "Mountain View",
    title: "Penthouse MV Grand Valleys",
    location: "التجمع / القاهرة الجديدة",
    price: "٢٢.٥ مليون جنيه",
    beds: "٤",
    area: "٢١٠ م²",
    delivery: "سنتين",
  },
  {
    image: "/images/region-capital.webp",
    badge: "متاح",
    type: "شقة",
    developer: "PRE Group",
    title: "Apartment Capital Heights",
    location: "العاصمة الإدارية",
    price: "٢.٤ مليون جنيه",
    beds: "٢",
    area: "١١٠ م²",
    delivery: "٣ سنين",
  },
];

function TiltCard({ p, i }: { p: (typeof projects)[number]; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [6, -6]), { stiffness: 200, damping: 22 });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-6, 6]), { stiffness: 200, damping: 22 });

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay: (i % 3) * 0.12, ease }}
      className="w-[320px] shrink-0 snap-start sm:w-[360px]"
      style={{ perspective: 1200 }}
    >
      <motion.article
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={() => {
          mx.set(0.5);
          my.set(0.5);
        }}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="group overflow-hidden rounded-3xl bg-white/[0.04] ring-1 ring-white/10 transition-colors duration-500 hover:bg-white/[0.07] hover:ring-[#e0703c]/40"
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={p.image}
            alt={p.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <span
            className={`absolute right-4 top-4 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-lg ${
              p.badge === "جديد" ? "bg-[#e0703c] text-[#1a0f08]" : "bg-emerald-500/90 text-white"
            }`}
          >
            {p.badge}
          </span>
          <span className="absolute bottom-4 right-4 rounded-full bg-black/50 px-3.5 py-1.5 text-xs text-white/90 backdrop-blur-sm">
            {p.location}
          </span>
        </div>

        {/* Body */}
        <div className="p-5">
          <div className="text-xs font-medium text-[#f2b07e]">
            {p.type} · {p.developer}
          </div>
          <h3 className="mt-2 text-[17px] font-bold leading-snug text-white">{p.title}</h3>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-xs text-white/50">يبدأ من</span>
            <span className="text-lg font-black text-[#f2b07e]">{p.price}</span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
            {[
              { icon: BedDouble, v: p.beds, l: "غرف" },
              { icon: Ruler, v: p.area, l: "المساحة" },
              { icon: KeyRound, v: p.delivery, l: "الاستلام" },
            ].map(({ icon: Icon, v, l }) => (
              <div key={l}>
                <Icon className="mx-auto h-4 w-4 text-[#e0703c]/80" />
                <div className="mt-1.5 text-[13px] font-semibold text-white/90">{v}</div>
                <div className="text-[10px] text-white/45">{l}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex gap-2">
            <button className="flex-1 rounded-full border border-white/20 py-2.5 text-[13px] font-semibold text-white transition-colors hover:border-[#e0703c]/60 hover:bg-[#e0703c]/10">
              تفاصيل المشروع
            </button>
            <a
              href="https://wa.me/201200704344"
              target="_blank"
              rel="noreferrer"
              className="grid w-11 place-items-center rounded-full bg-[#e0703c] text-[#1a0f08] transition-transform hover:scale-105"
              aria-label="واتساب"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          </div>
        </div>
      </motion.article>
    </motion.div>
  );
}

export default function Projects() {
  const scroller = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: number) =>
    scroller.current?.scrollBy({ left: dir * 400, behavior: "smooth" });

  return (
    <section className="relative overflow-hidden bg-[#0c0f14] py-24 lg:py-32">
      <div className="pointer-events-none absolute left-0 top-0 h-72 w-72 rounded-full bg-[#e0703c]/8 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        {/* Heading */}
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease }}
            className="flex items-start gap-6"
          >
            <span className="text-stroke-bone hidden text-8xl font-black leading-none lg:block">
              01            </span>
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-400/25 bg-red-400/10 px-3.5 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse-dot" />
                <span className="text-xs font-semibold tracking-wide text-red-300">مباشر</span>
              </div>
              <h2 className="text-4xl font-black text-white sm:text-5xl">بتتطرح دلوقتي</h2>
              <p className="mt-4 max-w-md font-light leading-relaxed text-white/60">
                أول فرصة لمشاريع لسه نازلة — من المطوّرين مباشرة، قبل السوق كله.
              </p>
            </div>
          </motion.div>

          {/* Scroll controls */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex gap-3"
          >
            <button
              onClick={() => scrollBy(1)}
              aria-label="السابق"
              className="grid h-12 w-12 place-items-center rounded-full border border-white/15 text-white transition-all hover:border-[#e0703c] hover:bg-[#e0703c] hover:text-[#1a0f08]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => scrollBy(-1)}
              aria-label="التالي"
              className="grid h-12 w-12 place-items-center rounded-full border border-white/15 text-white transition-all hover:border-[#e0703c] hover:bg-[#e0703c] hover:text-[#1a0f08]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </motion.div>
        </div>
      </div>

      {/* Horizontal scroller */}
      <div
        ref={scroller}
        className="scrollbar-hide flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 pb-4 lg:px-[max(2rem,calc((100vw-80rem)/2+2rem))]"
        dir="rtl"
      >
        {projects.map((p, i) => (
          <TiltCard key={p.title} p={p} i={i} />
        ))}
      </div>
    </section>
  );
}
