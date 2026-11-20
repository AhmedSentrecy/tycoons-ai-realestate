import { useEffect } from "react";
import { useSiteSky } from "@/lib/useSiteSky";
import { Link, useParams } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, MessageCircle, BadgeCheck, Banknote } from "lucide-react";
import Navbar from "@/sections/Navbar";
import Footer from "@/sections/Footer";
import { regions } from "@/data/content";
import { arabicAreaPath } from "@/lib/areaPaths";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const ease = [0.22, 1, 0.36, 1] as const;

export default function RegionPage() {
  useSiteSky();
  const { slug } = useParams();
  const region = regions.find((r) => r.slug === slug);

  useEffect(() => {
    if (region) {
      document.title = `عقارات ${region.name} — شقق وفلل من المطور مباشرة | تايكونز`;
      window.scrollTo(0, 0);
    }
  }, [region]);

  if (!region) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f6fa]">
        <div className="text-center">
          <p className="text-xl font-bold text-[#0f1724]">المنطقة دي مش موجودة</p>
          <Link to="/" className="mt-4 inline-block text-[#b47c17] underline">
            ارجع للرئيسية
          </Link>
        </div>
      </main>
    );
  }

  const others = regions.filter((r) => r.slug !== slug);

  return (
    <main data-sky-page className="min-h-screen bg-[#f4f6fa]">
      <Navbar />

      {/* Hero */}
      <section className="relative flex min-h-[52svh] items-end overflow-hidden">
        <motion.img
          src={region.image}
          alt={`عقارات ${region.name}`}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease }}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060f1c]/90 via-[#060f1c]/35 to-[#060f1c]/40" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-10 pt-32 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease }}
          >
            <Link
              to="/"
              className="mb-6 inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
            >
              <ArrowRight className="h-4 w-4" />
              كل المناطق
            </Link>
            <h1 className="text-4xl font-extrabold text-white sm:text-5xl">
              عقارات {region.name}
            </h1>
            <p className="mt-4 flex items-center gap-3 text-lg font-light text-white/75">
              <span className="rounded-full bg-[#d99a2b] px-4 py-1.5 text-sm font-bold text-[#231a0c]">
                {region.count}
              </span>
              من المطور مباشرة — من غير وسطاء
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-6xl px-5 py-14 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-3">
          {/* Main article */}
          <div className="lg:col-span-2">
            <motion.p
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease }}
              className="text-xl font-light leading-loose text-[#37453d]"
            >
              {region.intro}
            </motion.p>

            {region.paragraphs.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: 0.08 * i, ease }}
                className="mt-12"
              >
                <h2 className="text-2xl font-extrabold text-[#0f1724] sm:text-3xl">{p.title}</h2>
                <p className="mt-4 font-light leading-loose text-[#556070]">{p.body}</p>
              </motion.div>
            ))}

            {/* Region FAQ */}
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.75, ease }}
              className="mt-16"
            >
              <h2 className="text-2xl font-extrabold text-[#0f1724] sm:text-3xl">
                أسئلة شائعة عن {region.name}
              </h2>
              <Accordion type="single" collapsible className="mt-6 space-y-4">
                {region.faqs.map((f, i) => (
                  <AccordionItem
                    key={i}
                    value={`rfaq-${i}`}
                    className="rounded-2xl border border-[#dde4ee] bg-white/70 px-6 data-[state=open]:border-[#d99a2b]/50 data-[state=open]:bg-white"
                  >
                    <AccordionTrigger className="py-5 text-right text-[16px] font-bold text-[#0f1724] hover:no-underline [&>svg]:text-[#d99a2b]">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 font-light leading-relaxed text-[#556070]">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </div>

          {/* Sidebar */}
          <motion.aside
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="space-y-6 lg:sticky lg:top-28 lg:self-start"
          >
            <div className="rounded-3xl bg-[#0a1628] p-7">
              <div className="flex items-center gap-3">
                <Banknote className="h-5 w-5 text-[#f0bd4f]" />
                <h3 className="font-bold text-white">مستوى الأسعار</h3>
              </div>
              <p className="mt-3 text-sm font-light leading-relaxed text-white/70">
                {region.priceNote}
              </p>
              <a
                href="https://wa.me/201110100025"
                target="_blank"
                rel="noreferrer"
                className="mt-6 flex items-center justify-center gap-2 rounded-full bg-[#1faa59] px-5 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.03]"
              >
                <MessageCircle className="h-4 w-4" />
                اسأل عن المتاح في {region.name}
              </a>
            </div>

            <div className="rounded-3xl border border-[#dde4ee] bg-white/70 p-7">
              <div className="flex items-center gap-3">
                <BadgeCheck className="h-5 w-5 text-[#b47c17]" />
                <h3 className="font-bold text-[#0f1724]">أبرز المطورين هنا</h3>
              </div>
              <ul className="mt-4 space-y-3">
                {region.developers.map((d) => (
                  <li key={d} className="flex items-center gap-2.5 text-sm text-[#556070]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#d99a2b]" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </motion.aside>
        </div>
      </section>

      {/* Other regions */}
      <section className="border-t border-[#dde4ee] bg-[#e8edf5] py-16">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <h2 className="mb-8 text-2xl font-extrabold text-[#0f1724]">استكشف مناطق تانية</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((r) => (
              <Link
                key={r.slug}
                to={arabicAreaPath(r.slug)}
                className="group relative min-h-[170px] overflow-hidden rounded-2xl"
              >
                <img
                  src={r.image}
                  alt={r.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07111f]/85 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
                  <div>
                    <div className="font-bold text-white">{r.name}</div>
                    <div className="mt-0.5 text-xs text-white/65">{r.count}</div>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-white/80 transition-transform group-hover:-translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
