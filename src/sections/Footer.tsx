import { motion } from "framer-motion";
import { Link } from "react-router";
import { MessageCircle, Mic, Search } from "lucide-react";
import { regions } from "@/data/content";

const ease = [0.22, 1, 0.36, 1] as const;

export default function Footer() {
  return (
    <footer className="bg-[#08130e]">
      {/* CTA */}
      <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-bl from-[#14352a] to-[#0d1f18] px-6 py-11 text-center sm:px-12"
        >
          <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[480px] -translate-x-1/2 rounded-full bg-[#c49b5f]/15 blur-[100px]" />
          <h2 className="relative mx-auto max-w-2xl text-balance text-2xl font-extrabold leading-snug text-white sm:text-4xl sm:leading-snug">
            عقارك الجاي يبدأ بجملة واحدة
          </h2>
          <p className="relative mx-auto mt-4 max-w-md text-sm font-light leading-relaxed text-white/65">
            ابحث بالذكاء الاصطناعي والصوت — من المطوّرين مباشرة، من غير وسطاء.
          </p>
          <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-2.5 rounded-full bg-[#c49b5f] px-7 py-3 text-sm font-bold text-[#231a0c] transition-transform hover:scale-[1.05]"
            >
              <Search aria-hidden="true" className="h-4 w-4" />
              ابدأ البحث
            </Link>
            <a
              href="https://wa.me/201200704344"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 rounded-full border border-white/25 px-7 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              <MessageCircle aria-hidden="true" className="h-4 w-4" />
              كلمنا واتساب
            </a>
          </div>
          <div className="relative mt-6 flex items-center justify-center gap-2 text-xs text-white/45">
            <Mic aria-hidden="true" className="h-3.5 w-3.5" />
            يدعم البحث الصوتي بالعربي والإنجليزي
          </div>
        </motion.div>
      </div>

      {/* Links */}
      <div className="border-t border-white/10">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#14352a]">
                <img
                  src="/images/logo-badge-gold.png"
                  alt="Tycoons Investments"
                  width={256}
                  height={256}
                  loading="lazy"
                  decoding="async"
                  className="h-6 w-6 object-contain"
                />
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

          <div>
            <h4 className="mb-5 text-sm font-bold tracking-wide text-[#d9b87c]">المنصة</h4>
            <ul className="space-y-3.5">
              {[
                { label: "ابدأ البحث", to: "/" },
                { label: "دليل المشاريع", to: "/ar/", external: true },
                { label: "الأسئلة الشائعة", to: "/faq" },
                { label: "من نحن", to: "/about" },
                { label: "الحاسبة", to: "/" },
              ].map((it) => (
                <li key={it.label}>
                  {it.external ? (
                    <a href={it.to} className="text-sm font-light text-white/55 transition-colors hover:text-white">
                      {it.label}
                    </a>
                  ) : (
                    <Link to={it.to} className="text-sm font-light text-white/55 transition-colors hover:text-white">
                      {it.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-5 text-sm font-bold tracking-wide text-[#d9b87c]">المناطق</h4>
            <ul className="space-y-3.5">
              {regions.map((r) => (
                <li key={r.slug}>
                  <a
                    href={`/ar/areas/${r.areaSlug}`}
                    className="text-sm font-light text-white/55 transition-colors hover:text-white"
                  >
                    {r.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-5 text-sm font-bold tracking-wide text-[#d9b87c]">Tycoons</h4>
            <ul className="space-y-3.5">
              {[
                { label: "من نحن", to: "/about" },
                { label: "الأسئلة الشائعة", to: "/faq" },
                { label: "منهجية البيانات", to: "/methodology", external: true },
                { label: "سياسة التصحيح", to: "/corrections", external: true },
                { label: "تواصل معنا", to: "https://wa.me/201200704344", external: true },
              ].map((it) => (
                <li key={it.label}>
                  {it.external ? (
                    <a
                      href={it.to}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-light text-white/55 transition-colors hover:text-white"
                    >
                      {it.label}
                    </a>
                  ) : (
                    <Link to={it.to} className="text-sm font-light text-white/55 transition-colors hover:text-white">
                      {it.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 py-6 text-center text-xs font-light text-white/40">
          © ٢٠٢٦ تايكونز للاستثمار — كل الحقوق محفوظة
        </div>
      </div>
    </footer>
  );
}
