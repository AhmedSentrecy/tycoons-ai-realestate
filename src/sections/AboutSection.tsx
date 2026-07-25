import { motion } from "framer-motion";
import { ArrowLeft, Mic, FileCheck, Handshake } from "lucide-react";
import { Link } from "react-router";

const ease = [0.22, 1, 0.36, 1] as const;

const points = [
  { icon: Mic, text: "بحث صوتي وذكي بالعربي والإنجليزي" },
  { icon: FileCheck, text: "وحدات موثقة من المطور مباشرة" },
  { icon: Handshake, text: "مرافقة كاملة لحد التعاقد" },
];

export default function AboutSection() {
  return (
    <section className="relative overflow-hidden bg-[#14352a] py-24 lg:py-32">
      {/* watermark */}
      <span className="text-stroke-bone pointer-events-none absolute -top-8 left-0 select-none whitespace-nowrap text-[16rem] font-black leading-none opacity-60">
        TYCOONS
      </span>

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-2 lg:px-8">
        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease }}
        >
          <div className="mb-4 flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-[#c49b5f]" />
            <span className="text-sm font-medium text-[#d9b87c]">مين إحنا؟</span>
          </div>
          <h2 className="text-4xl font-black leading-snug text-white sm:text-5xl sm:leading-snug">
            مش موقع إعلانات.
            <span className="gold-gradient-text block">مساعد شراء عقاري.</span>
          </h2>
          <p className="mt-6 max-w-lg font-light leading-loose text-white/65">
            تايكونز اتعملت عشان تحل المشكلة اللي كلنا عدينا بيها: آلاف الإعلانات المكررة،
            سماسرة بأسعار وهمية، وساعات ضايعة في المكالمات. إحنا بنجمع الوحدات من المطوّر
            مباشرة، ونخليك توصف اللي عايزه بجملة واحدة — والمساعد الذكي يوصّلك للوحدة الصح.
          </p>

          <div className="mt-8 space-y-4">
            {points.map((p, i) => (
              <motion.div
                key={p.text}
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.12, ease }}
                className="flex items-center gap-4"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#c49b5f]/12 text-[#d9b87c] ring-1 ring-[#c49b5f]/25">
                  <p.icon className="h-5 w-5" />
                </span>
                <span className="font-medium text-white/85">{p.text}</span>
              </motion.div>
            ))}
          </div>

          <Link
            to="/about"
            className="group mt-10 inline-flex items-center gap-2 rounded-full bg-[#c49b5f] px-7 py-3.5 text-sm font-bold text-[#231a0c] transition-all hover:scale-[1.04] hover:bg-[#d9b87c]"
          >
            اعرف أكتر عن تايكونز
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
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
          <div className="overflow-hidden rounded-[2rem] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.7)]">
            <img
              src="/images/project-villa.webp"
              alt="كمباوند فاخر في القاهرة الجديدة"
              className="aspect-[4/5] w-full object-cover"
            />
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5, ease }}
            className="glass-dark absolute -bottom-6 right-6 rounded-2xl px-7 py-5 shadow-xl sm:right-10"
          >
            <div className="text-3xl font-black text-[#d9b87c]">٢٠٢٤</div>
            <div className="mt-1 text-sm font-light text-white/60">سنة التأسيس</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.65, ease }}
            className="absolute -top-6 left-6 rounded-2xl bg-[#c49b5f] px-7 py-5 shadow-xl sm:left-10"
          >
            <div className="text-3xl font-black text-[#231a0c]">+١٢٠٠</div>
            <div className="mt-1 text-sm font-medium text-[#231a0c]/70">عميل اتوصّل لوحدته</div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
