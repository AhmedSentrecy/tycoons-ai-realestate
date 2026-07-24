import { motion } from "framer-motion";
import { ShieldCheck, Wallet, MessageCircle } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const features = [
  {
    icon: ShieldCheck,
    title: "موثّق من المطوّر",
    desc: "كل وحدة مباشرة من الشركة المطوّرة — مفيش إعلانات مكررة ولا أسعار وهمية.",
  },
  {
    icon: Wallet,
    title: "أقساط تناسبك",
    desc: "خطط سداد لحد ١٠ سنين، وحاسبة قسط شفافة على كل مشروع.",
  },
  {
    icon: MessageCircle,
    title: "رد فوري على واتساب",
    desc: "المساعد بيكمّل معاك على واتساب بتفاصيل الوحدة اللي عايزها.",
  },
];

export default function WhyUs() {
  return (
    <section className="bg-[#f7f2ea] py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 34 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.75, delay: i * 0.13, ease }}
              className="group rounded-3xl border border-[#e7ddc8] bg-white/60 p-8 transition-all duration-500 hover:-translate-y-1.5 hover:border-[#c49b5f]/45 hover:shadow-[0_24px_60px_-24px_rgba(60,48,25,0.28)]"
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#14352a] text-[#e8d5ae] transition-transform duration-500 group-hover:rotate-6 group-hover:scale-105">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-extrabold text-[#1b2420]">{f.title}</h3>
              <p className="mt-3 font-light leading-relaxed text-[#6d7a72]">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
