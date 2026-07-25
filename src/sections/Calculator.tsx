import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calculator as CalcIcon, MessageCircle } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

function fmt(n: number) {
  return Math.round(n).toLocaleString("ar-EG");
}

export default function Calculator() {
  const [price, setPrice] = useState(8_400_000);
  const [down, setDown] = useState(10);
  const [years, setYears] = useState(8);

  const { downAmount, monthly } = useMemo(() => {
    const downAmount = (price * down) / 100;
    const monthly = (price - downAmount) / (years * 12);
    return { downAmount, monthly };
  }, [price, down, years]);

  return (
    <section className="relative overflow-hidden bg-[#0d1f18] py-24 lg:py-32">
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-[#c49b5f]/10 blur-[130px] animate-glow-drift" />

      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          {/* Heading + result */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease }}
          >
            <div className="mb-4 flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-[#c49b5f]" />
              <span className="text-sm font-medium text-[#d9b87c]">خطّط قبل ما تسأل</span>
            </div>
            <h2 className="text-4xl font-black text-white sm:text-5xl">حاسبة الأقساط</h2>
            <p className="mt-4 max-w-md font-light leading-relaxed text-white/60">
              اعرف القسط الشهري التقريبي قبل ما تكلّم أي حد — حرّك المؤشرات وشوف النتيجة لحظيًا.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-4">
              <motion.div
                layout
                className="rounded-3xl bg-gradient-to-br from-[#d9b87c] to-[#c49b5f] p-6 shadow-[0_24px_60px_-20px_rgba(224,112,60,0.5)]"
              >
                <div className="text-[13px] font-medium text-[#231a0c]/70">القسط الشهري التقريبي</div>
                <div className="mt-2 text-3xl font-black text-[#231a0c] sm:text-4xl">
                  {fmt(monthly)}
                  <span className="mr-1 text-base font-bold">ج.م</span>
                </div>
              </motion.div>
              <div className="rounded-3xl border border-white/12 bg-white/[0.05] p-6">
                <div className="text-[13px] font-medium text-white/55">قيمة المقدم</div>
                <div className="mt-2 text-3xl font-black text-white sm:text-4xl">
                  {fmt(downAmount)}
                  <span className="mr-1 text-base font-bold text-white/70">ج.م</span>
                </div>
              </div>
            </div>

            <a
              href="https://wa.me/201200704344"
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex items-center gap-2.5 rounded-full bg-[#1faa59] px-7 py-3.5 text-sm font-bold text-white shadow-[0_14px_40px_-10px_rgba(31,170,89,0.6)] transition-transform hover:scale-[1.04]"
            >
              <MessageCircle className="h-4 w-4" />
              اسأل عن خطة السداد على واتساب
            </a>
          </motion.div>

          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, y: 34 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.85, delay: 0.12, ease }}
            className="glass-dark rounded-[2rem] p-8 sm:p-10"
          >
            <div className="mb-8 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#c49b5f]/18 text-[#d9b87c]">
                <CalcIcon className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold text-white">جرّب بنفسك</span>
            </div>

            {[
              {
                label: "سعر الوحدة",
                value: `${fmt(price)} ج.م`,
                min: 1_000_000,
                max: 100_000_000,
                step: 500_000,
                v: price,
                set: setPrice,
              },
              {
                label: "المقدم",
                value: `${down.toLocaleString("ar-EG")}٪`,
                min: 5,
                max: 50,
                step: 1,
                v: down,
                set: setDown,
              },
              {
                label: "مدة التقسيط",
                value: `${years.toLocaleString("ar-EG")} سنين`,
                min: 1,
                max: 10,
                step: 1,
                v: years,
                set: setYears,
              },
            ].map((s) => (
              <div key={s.label} className="mb-8 last:mb-0">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-white/70">{s.label}</span>
                  <span className="rounded-full bg-[#c49b5f]/15 px-4 py-1.5 text-sm font-bold text-[#d9b87c]">
                    {s.value}
                  </span>
                </div>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={s.v}
                  onChange={(e) => s.set(Number(e.target.value))}
                  className="slider w-full"
                  dir="ltr"
                />
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
