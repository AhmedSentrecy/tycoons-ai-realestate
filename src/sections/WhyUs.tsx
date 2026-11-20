import { tr } from "@/lib/homeLanguage";
import { motion } from "framer-motion";
import { ShieldCheck, Wallet, MessageCircle } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const features = [
  {
    icon: ShieldCheck,
    title: tr("موثّق من المطوّر"),
    desc: tr("كل وحدة مباشرة من الشركة المطوّرة — مفيش إعلانات مكررة ولا أسعار وهمية."),
  },
  {
    icon: Wallet,
    title: tr("أقساط تناسبك"),
    desc: tr("خطط سداد لحد ١٠ سنين، مكتوبة بوضوح على كل مشروع."),
  },
  {
    icon: MessageCircle,
    title: tr("رد فوري على واتساب"),
    desc: tr("المساعد بيكمّل معاك على واتساب بتفاصيل الوحدة اللي عايزها."),
  },
];

export default function WhyUs() {
  return (
    <section className="bg-[#f4f6fa] py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 34 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.75, delay: i * 0.13, ease }}
              className="group rounded-2xl border border-[#dde4ee] bg-white/60 p-6 transition-all duration-500 hover:-translate-y-1.5 hover:border-[#d99a2b]/45 hover:shadow-[0_24px_60px_-24px_rgba(60,48,25,0.28)]"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#0b1b30] text-[#f3dca8] transition-transform duration-500 group-hover:rotate-6 group-hover:scale-105">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-extrabold text-[#0f1724]">{f.title}</h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-[#6b7585]">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
