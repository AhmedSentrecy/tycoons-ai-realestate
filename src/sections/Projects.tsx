import { motion } from "framer-motion";
import { BedDouble, Ruler, KeyRound, MessageCircle, ArrowLeft } from "lucide-react";

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
];

export default function Projects() {
  return (
    <section className="relative overflow-hidden bg-[#0d1f18] py-24 lg:py-32">
      {/* subtle glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[#1d4a38]/30 blur-[140px]" />

      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        {/* Heading */}
        <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
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
            <h2 className="text-4xl font-extrabold text-white sm:text-5xl">بتتطرح دلوقتي</h2>
            <p className="mt-4 max-w-md font-light leading-relaxed text-white/60">
              أول فرصة لمشاريع لسه نازلة — من المطوّرين مباشرة، قبل السوق كله.
            </p>
          </motion.div>

          <motion.a
            href="#"
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, delay: 0.15, ease }}
            className="group flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-white/85 transition-colors hover:border-[#d9b87c]/50 hover:text-[#e8d5ae]"
          >
            عرض كل المشاريع
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          </motion.a>
        </div>

        {/* Cards */}
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {projects.map((p, i) => (
            <motion.article
              key={p.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.75, delay: i * 0.12, ease }}
              className="group overflow-hidden rounded-3xl bg-white/[0.04] ring-1 ring-white/10 transition-all duration-500 hover:-translate-y-2 hover:bg-white/[0.07] hover:ring-[#d9b87c]/35"
            >
              {/* Image */}
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={p.image}
                  alt={p.title}
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
              <div className="p-5">
                <div className="text-xs font-medium text-[#d9b87c]">
                  {p.type} · {p.developer}
                </div>
                <h3 className="mt-2 text-[17px] font-bold leading-snug text-white">
                  {p.title}
                </h3>

                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-xs text-white/50">يبدأ من</span>
                  <span className="text-lg font-extrabold text-[#ecd9ae]">{p.price}</span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
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

                <div className="mt-5 flex gap-2">
                  <button className="flex-1 rounded-full border border-white/20 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-white/10">
                    تفاصيل المشروع
                  </button>
                  <a
                    href="https://wa.me/201200704344"
                    target="_blank"
                    rel="noreferrer"
                    className="grid w-11 place-items-center rounded-full bg-[#1faa59] text-white transition-transform hover:scale-105"
                    aria-label="واتساب"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
