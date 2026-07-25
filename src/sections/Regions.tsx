import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpLeft } from "lucide-react";
import { Link } from "react-router";

const ease = [0.22, 1, 0.36, 1] as const;

const regions = [
  { name: "الساحل الشمالي", count: "١٣٧ مشروع متاح", image: "/images/region-sahel.webp", slug: "sahel", num: "٠١" },
  { name: "التجمع / القاهرة الجديدة", count: "٣١٤ مشروع متاح", image: "/images/region-newcairo.webp", slug: "new-cairo", num: "٠٢" },
  { name: "الشيخ زايد", count: "١٤٩ مشروع متاح", image: "/images/region-zayed.webp", slug: "zayed", num: "٠٣" },
  { name: "العين السخنة", count: "٧ مشاريع متاحة", image: "/images/region-sokhna.webp", slug: "sokhna", num: "٠٤" },
  { name: "العاصمة الإدارية", count: "٣٧ مشروع متاح", image: "/images/region-capital.webp", slug: "capital", num: "٠٥" },
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
          className="mb-12 flex items-start gap-6"
        >
          <span className="text-stroke-ink hidden text-8xl font-black leading-none lg:block">02</span>
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-[#c49b5f]" />
              <span className="text-sm font-medium text-[#a3854e]">استكشف بالمنطقة</span>
            </div>
            <h2 className="text-4xl font-black text-[#1b2420] sm:text-5xl">مناطق مميّزة</h2>
            <p className="mt-4 max-w-md font-light leading-relaxed text-[#6d7a72]">
              عدّي على أي سطر — الصورة بتظهرلك قبل ما تدوس.
            </p>
          </div>
        </motion.div>

        {/* Editorial list */}
        <div className="border-t border-[#e7ddc8]">
          {regions.map((r, i) => (
            <motion.div
              key={r.slug}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: i * 0.07, ease }}
            >
              <Link
                to={`/regions/${r.slug}`}
                className="group relative flex items-center justify-between gap-4 border-b border-[#e7ddc8] py-7 transition-colors sm:py-9"
              >
                {/* hover bg sweep */}
                <span className="absolute inset-0 origin-bottom scale-y-0 bg-[#0d1f18] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-y-100" />

                <div className="relative z-10 flex items-center gap-5 sm:gap-8">
                  <span className="text-sm font-bold text-[#a3854e] transition-colors duration-300 group-hover:text-[#d9b87c]">
                    {r.num}
                  </span>

                  {/* mobile thumb */}
                  <img
                    src={r.image}
                    alt={r.name}
                    className="h-16 w-24 rounded-xl object-cover sm:hidden"
                  />

                  <div>
                    <h3 className="text-2xl font-black text-[#1b2420] transition-all duration-300 group-hover:-translate-x-2 group-hover:text-white sm:text-4xl">
                      {r.name}
                    </h3>
                    <p className="mt-1 text-sm font-light text-[#6d7a72] transition-colors duration-300 group-hover:text-white/60">
                      {r.count}
                    </p>
                  </div>
                </div>

                {/* floating image preview (desktop) */}
                <div className="pointer-events-none absolute left-28 top-1/2 z-20 hidden w-64 -translate-y-1/2 rotate-3 scale-75 overflow-hidden rounded-2xl opacity-0 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-0 group-hover:scale-100 group-hover:opacity-100 lg:block">
                  <img src={r.image} alt="" className="aspect-[3/2] w-full object-cover" />
                </div>

                <span className="relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#e7ddc8] text-[#1b2420] transition-all duration-300 group-hover:border-[#c49b5f] group-hover:bg-[#c49b5f] group-hover:text-[#231a0c]">
                  <ArrowUpLeft className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:-translate-x-0.5" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-8 flex items-center gap-2 text-sm font-light text-[#6d7a72]"
        >
          <ArrowLeft className="h-4 w-4 text-[#c49b5f]" />
          كل منطقة ليها صفحة كاملة بأسعارها ومطوريها وأسئلتها الشائعة
        </motion.div>
      </div>
    </section>
  );
}
