import { motion } from "framer-motion";
import { MessageCircle, Mic, Search } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

export default function Footer() {
  return (
    <footer className="bg-[#08130e]">
      {/* CTA */}
      <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-28">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease }}
          className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-bl from-[#14352a] to-[#0d1f18] px-8 py-16 text-center sm:px-16"
        >
          <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[480px] -translate-x-1/2 rounded-full bg-[#c49b5f]/15 blur-[100px]" />
          <h2 className="relative mx-auto max-w-2xl text-balance text-3xl font-extrabold leading-snug text-white sm:text-5xl sm:leading-snug">
            عقارك الجاي يبدأ بجملة واحدة
          </h2>
          <p className="relative mx-auto mt-5 max-w-md font-light leading-relaxed text-white/65">
            ابحث بالذكاء الاصطناعي والصوت — من المطوّرين مباشرة، من غير وسطاء.
          </p>
          <div className="relative mt-9 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#"
              className="flex items-center gap-2.5 rounded-full bg-[#c49b5f] px-8 py-4 text-sm font-bold text-[#231a0c] transition-transform hover:scale-[1.05]"
            >
              <Search className="h-4 w-4" />
              ابدأ البحث الذكي
            </a>
            <a
              href="https://wa.me/201200704344"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 rounded-full border border-white/25 px-8 py-4 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              <MessageCircle className="h-4 w-4" />
              كلمنا واتساب
            </a>
          </div>
          <div className="relative mt-8 flex items-center justify-center gap-2 text-xs text-white/45">
            <Mic className="h-3.5 w-3.5" />
            يدعم البحث الصوتي بالعربي والإنجليزي
          </div>
        </motion.div>
      </div>

      {/* Links */}
      <div className="border-t border-white/10">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#14352a] text-lg font-bold text-[#e8d5ae]">
                T
              </span>
              <span className="leading-tight">
                <span className="block text-[15px] font-bold tracking-[0.18em] text-white">TYCOONS</span>
                <span className="block text-[9px] font-light tracking-[0.42em] text-white/50">
                  INVESTMENTS
                </span>
              </span>
            </div>
            <p className="mt-5 max-w-xs text-sm font-light leading-relaxed text-white/50">
              ابحث عن عقارك بالذكاء الاصطناعي والصوت — من المطوّرين مباشرة.
            </p>
          </div>

          {[
            { h: "المنصة", items: ["البحث الذكي", "البحث الصوتي", "الطرح الجديد", "الحاسبة"] },
            { h: "المناطق", items: ["الساحل الشمالي", "التجمع", "العين السخنة", "الشيخ زايد"] },
            { h: "Tycoons", items: ["دليل المشاريع", "المطوّرون", "تواصل معنا"] },
          ].map((col) => (
            <div key={col.h}>
              <h4 className="mb-5 text-sm font-bold tracking-wide text-[#d9b87c]">{col.h}</h4>
              <ul className="space-y-3.5">
                {col.items.map((it) => (
                  <li key={it}>
                    <a href="#" className="text-sm font-light text-white/55 transition-colors hover:text-white">
                      {it}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 py-6 text-center text-xs font-light text-white/40">
          © ٢٠٢٦ تايكونز للاستثمار — كل الحقوق محفوظة
        </div>
      </div>
    </footer>
  );
}
