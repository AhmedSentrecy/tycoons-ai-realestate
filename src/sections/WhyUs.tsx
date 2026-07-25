import { motion } from "framer-motion";
import { ShieldCheck, Wallet, MessageCircle } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const features = [
  {
    icon: ShieldCheck,
    title: "موثّق من المطوّر",
    desc: "كل وحدة مباشرة من الشركة المطوّرة — مفيش إعلانات مكررة ولا أسعار وهمية.",
    tall: false,
  },
  {
    icon: Wallet,
    title: "أقساط تناسبك",
    desc: "خطط سداد لحد ١٠ سنين، وحاسبة قسط شفافة على كل مشروع. اعرف التزامك الشهري قبل ما ترفع سماعة التليفون — بأرقام من المطور نفسه مش تقديرات سماسرة.",
    tall: true,
  },
  {
    icon: MessageCircle,
    title: "رد فوري على واتساب",
    desc: "المساعد بيكمّل معاك على واتساب بتفاصيل الوحدة اللي عايزها.",
    tall: false,
  },
];

export default function WhyUs() {
  return (
    <section className="bg-[#f7f2ea] py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 34 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.75, delay: i * 0.13, ease }}
              className={`group relative overflow-hidden rounded-3xl border border-[#e7ddc8] bg-white/60 p-8 transition-all duration-500 hover:-translate-y-1.5 hover:border-[#c49b5f]/45 hover:shadow-[0_28px_70px_-28px_rgba(120,60,30,0.35)] ${
                f.tall ? "md:row-span-2 md:flex md:flex-col md:justify-center" : ""
              }`}
            >
              {/* corner glow on hover */}
              <span className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-[#c49b5f]/0 blur-3xl transition-all duration-500 group-hover:bg-[#c49b5f]/15" />

              <div className="relative">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#0d1f18] text-[#d9b87c] transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className={`mt-6 font-black text-[#1b2420] ${f.tall ? "text-2xl" : "text-xl"}`}>
                  {f.title}
                </h3>
                <p className="mt-3 font-light leading-loose text-[#6d7a72]">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
