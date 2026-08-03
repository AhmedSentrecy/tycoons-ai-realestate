import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calculator as CalcIcon, MessageCircle } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

function fmt(n: number) {
  return Math.round(n).toLocaleString("en-US");
}

interface CalculatorProps {
  initialPrice?: number;
  initialDown?: number;
  initialYears?: number;
  whatsappHref?: string;
}

export default function Calculator({
  initialPrice = 8_400_000,
  initialDown = 10,
  initialYears = 8,
  whatsappHref = "https://wa.me/201200704344",
}: CalculatorProps) {
  const [price, setPrice] = useState(initialPrice);
  const [down, setDown] = useState(initialDown);
  const [years, setYears] = useState(initialYears);

  const { downAmount, monthly } = useMemo(() => {
    const downAmount = (price * down) / 100;
    const monthly = (price - downAmount) / (years * 12);
    return { downAmount, monthly };
  }, [price, down, years]);

  return (
    <section className="bg-[#0d1f18] py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          {/* Heading + result */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease }}
          >
            <div className="mb-4 flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-[#d9b87c]" />
              <span className="text-sm font-medium text-[#d9b87c]">خطّط قبل ما تسأل</span>
            </div>
            <h2 className="text-4xl font-extrabold text-white sm:text-5xl">حاسبة الأقساط</h2>
            <p className="mt-4 max-w-md font-light leading-relaxed text-white/60">
              اعرف القسط الشهري التقريبي قبل ما تكلّم أي حد — حرّك المؤشرات وشوف النتيجة لحظيًا.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-4">
              <div className="rounded-3xl bg-gradient-to-br from-[#c49b5f] to-[#a37c43] p-6 shadow-[0_24px_60px_-20px_rgba(196,155,95,0.45)]">
                <div className="text-[13px] font-medium text-[#2b2113]/75">القسط الشهري التقريبي</div>
                <div
                  dir="ltr"
                  className="mt-2 text-3xl font-extrabold text-[#1d1608] sm:text-4xl"
                >
                  {fmt(monthly)}
                  <span className="ml-1 text-base font-semibold">ج.م</span>
                </div>
              </div>
              <div className="rounded-3xl border border-white/12 bg-white/[0.05] p-6">
                <div className="text-[13px] font-medium text-white/55">قيمة المقدم</div>
                <div
                  dir="ltr"
                  className="mt-2 text-3xl font-extrabold text-white sm:text-4xl"
                >
                  {fmt(downAmount)}
                  <span className="ml-1 text-base font-semibold text-white/70">ج.م</span>
                </div>
              </div>
            </div>

            <a
              href={whatsappHref}
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
            className="glass rounded-[2rem] p-8 sm:p-10"
          >
            <div className="mb-8 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#c49b5f]/20 text-[#d9b87c]">
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
                value: `${down.toLocaleString("en-US")}%`,
                min: 5,
                max: 50,
                step: 1,
                v: down,
                set: setDown,
              },
              {
                label: "مدة التقسيط",
                value: `${years.toLocaleString("en-US")} سنين`,
                min: 1,
                max: 15,
                step: 1,
                v: years,
                set: setYears,
              },
            ].map((s) => (
              <div key={s.label} className="mb-8 last:mb-0">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-white/70">{s.label}</span>
                  <span
                    dir="ltr"
                    className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-bold text-[#ecd9ae]"
                  >
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
