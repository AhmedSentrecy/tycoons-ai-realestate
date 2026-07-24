import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const regions = [
  { name: "الساحل الشمالي", count: "١٣٧ مشروع متاح", image: "/images/region-sahel.webp", wide: true },
  { name: "التجمع / القاهرة الجديدة", count: "٣١٤ مشروع متاح", image: "/images/region-newcairo.webp", wide: false },
  { name: "الشيخ زايد", count: "١٤٩ مشروع متاح", image: "/images/region-zayed.webp", wide: false },
  { name: "العين السخنة", count: "٧ مشاريع متاحة", image: "/images/region-sokhna.webp", wide: false },
  { name: "العاصمة الإدارية", count: "٣٧ مشروع متاح", image: "/images/region-capital.webp", wide: false },
];

export default function Regions() {
  return (
    <section className="bg-[#f7f2ea] py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease }}
          className="mb-14 max-w-xl"
        >
          <div className="mb-4 flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-[#c49b5f]" />
            <span className="text-sm font-medium text-[#a3854e]">استكشف بالمنطقة</span>
          </div>
          <h2 className="text-4xl font-extrabold text-[#1b2420] sm:text-5xl">مناطق مميّزة</h2>
          <p className="mt-4 font-light leading-relaxed text-[#6d7a72]">
            اختار منطقة والمساعد يبدأ البحث فيها فورًا.
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {regions.map((r, i) => (
            <motion.a
              key={r.name}
              href="#"
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.75, delay: i * 0.1, ease }}
              className={`group relative overflow-hidden rounded-3xl ${
                r.wide ? "sm:col-span-2 lg:row-span-2 lg:h-full" : ""
              } ${r.wide ? "min-h-[280px] lg:min-h-[560px]" : "min-h-[260px]"}`}
            >
              <img
                src={r.image}
                alt={r.name}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.08]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a140f]/85 via-[#0a140f]/15 to-transparent transition-opacity duration-500 group-hover:from-[#0a140f]/92" />

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6">
                <div>
                  <h3 className={`font-extrabold text-white ${r.wide ? "text-3xl" : "text-xl"}`}>
                    {r.name}
                  </h3>
                  <p className="mt-1.5 text-sm font-light text-white/70">{r.count}</p>
                </div>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/12 text-white backdrop-blur-sm transition-all duration-300 group-hover:bg-[#c49b5f] group-hover:text-[#231a0c]">
                  <ArrowLeft className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-0.5" />
                </span>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
