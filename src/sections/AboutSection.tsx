import { tr } from "@/lib/homeLanguage";
import { motion } from "framer-motion";
import { ArrowLeft, Mic, FileCheck, Handshake } from "lucide-react";
import { Link } from "react-router";
import { useInventory } from "@/lib/inventory";

const ease = [0.22, 1, 0.36, 1] as const;

const points = [
  { icon: Mic, text: tr("بحث صوتي وذكي بالعربي والإنجليزي") },
  { icon: FileCheck, text: tr("وحدات موثقة من المطور مباشرة") },
  { icon: Handshake, text: tr("مرافقة كاملة لحد التعاقد") },
];

export default function AboutSection() {
  // Live count from the same inventory as /ar/ (was a fixed "+٧٦٠" that no longer matched the site).
  const { stats } = useInventory();
  const unitsLabel = stats.units > 0 ? `+${stats.units.toLocaleString("en-US")}` : "+1,300";
  return (
    <section id="about" className="scroll-mt-20 overflow-hidden bg-[#f4f6fa] py-16 lg:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 lg:grid-cols-2 lg:px-8">
        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease }}
        >
          <div className="mb-4 flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-[#d99a2b]" />
            <span className="text-sm font-medium text-[#b47c17]">{tr("مين إحنا؟")}</span>
          </div>
          <h2 className="text-3xl font-extrabold leading-snug text-[#0f1724] sm:text-4xl sm:leading-snug">
            {tr("مش موقع إعلانات.")}<span className="block text-[#b47c17]">{tr("مساعد شراء عقاري.")}</span>
          </h2>
          <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-[#556070]">
            {tr("تايكونز اتعملت عشان تحل المشكلة اللي كلنا عدينا بيها: آلاف الإعلانات المكررة، سماسرة بأسعار وهمية، وساعات ضايعة في المكالمات. إحنا بنجمع الوحدات من المطوّر مباشرة، ونخليك توصف اللي عايزه بجملة واحدة — والمساعد يوصّلك للوحدة الصح.")}</p>

          <div className="mt-6 space-y-3">
            {points.map((p, i) => (
              <motion.div
                key={p.text}
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.12, ease }}
                className="flex items-center gap-4"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#0b1b30]/10 text-[#0b1b30] ring-1 ring-[#0b1b30]/15">
                  <p.icon className="h-5 w-5" />
                </span>
                <span className="font-medium text-[#283447]">{p.text}</span>
              </motion.div>
            ))}
          </div>

          <Link
            to="/about"
            className="group mt-7 inline-flex items-center gap-2 rounded-full bg-[#0b1b30] px-6 py-3 text-sm font-bold text-[#fbeccb] transition-transform hover:scale-[1.04]"
          >
            {tr("اعرف أكتر عن تايكونز")}<ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          </Link>
        </motion.div>

        {/* Visual */}
        <motion.div
          initial={{ opacity: 0, y: 34 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, delay: 0.15, ease }}
          className="relative"
        >
          <div className="overflow-hidden rounded-[2rem] shadow-[0_40px_90px_-30px_rgba(30,42,36,0.4)]">
            <img
              src="/images/project-villa.webp"
              alt={tr("كمباوند فاخر في القاهرة الجديدة")}
              width={1012}
              height={733}
              loading="lazy"
              decoding="async"
              className="max-h-[520px] w-full object-cover"
            />
          </div>
          <div className="glass-light absolute -bottom-6 right-6 rounded-2xl px-7 py-5 shadow-xl sm:right-10">
            <div className="text-3xl font-extrabold text-[#0b1b30]">{tr("٢٠٢٤")}</div>
            <div className="mt-1 text-sm font-light text-[#6b7585]">{tr("سنة التأسيس")}</div>
          </div>
          <div className="glass-light absolute -top-6 left-6 rounded-2xl px-7 py-5 shadow-xl sm:left-10">
            <div className="text-3xl font-extrabold text-[#0b1b30]">{unitsLabel}</div>
            <div className="mt-1 text-sm font-light text-[#6b7585]">{tr("وحدة متاحة بآخر مراجعة")}</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
