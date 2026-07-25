import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const developers = [
  "La Vista Developments",
  "Mountain View",
  "SODIC",
  "Palm Hills",
  "PRE Group",
  "Hydepark Developments",
  "Tatweer Misr",
  "Dubai Misr Developments",
];

export default function Developers() {
  const row = [...developers, ...developers];

  return (
    <section className="overflow-hidden border-y border-[#ddd7c8] bg-[#ece8dd] py-16">
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8, ease }}
        className="mb-10 text-center"
      >
        <div className="mb-3 flex items-center justify-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-[#e0703c]" />
          <span className="text-sm font-medium text-[#c4532a]">شركاء موثوقون</span>
        </div>
        <h2 className="text-3xl font-black text-[#14181f] sm:text-4xl">مطوّرون موثوقون</h2>
        <p className="mx-auto mt-3 max-w-md font-light text-[#6e6a5f]">
          كل الوحدات مباشرة من المطوّر — بيانات وأسعار موثّقة، من غير وسطاء وهميين.
        </p>
      </motion.div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-[#ece8dd] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-[#ece8dd] to-transparent" />
        <div className="flex w-max animate-marquee gap-14 pl-14">
          {row.map((d, i) => (
            <div key={i} className="flex items-center gap-14">
              <span className="whitespace-nowrap text-2xl font-black tracking-wide text-[#14181f]/35 transition-colors hover:text-[#e0703c]">
                {d}
              </span>
              <span className="h-2 w-2 rotate-45 bg-[#e0703c]/50" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
