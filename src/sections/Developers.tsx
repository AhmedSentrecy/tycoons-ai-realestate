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
    <section className="overflow-hidden border-y border-[#e7ddc8] bg-[#efe7d8] py-16">
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8, ease }}
        className="mb-10 text-center"
      >
        <div className="mb-3 flex items-center justify-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-[#c49b5f]" />
          <span className="text-sm font-medium text-[#a3854e]">شركاء موثوقون</span>
        </div>
        <h2 className="text-3xl font-black text-[#1b2420] sm:text-4xl">مطوّرون موثوقون</h2>
        <p className="mx-auto mt-3 max-w-md font-light text-[#6d7a72]">
          كل الوحدات مباشرة من المطوّر — بيانات وأسعار موثّقة، من غير وسطاء وهميين.
        </p>
      </motion.div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-[#efe7d8] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-[#efe7d8] to-transparent" />
        <div className="flex w-max animate-marquee gap-14 pl-14">
          {row.map((d, i) => (
            <div key={i} className="flex items-center gap-14">
              <span className="whitespace-nowrap text-2xl font-black tracking-wide text-[#1b2420]/35 transition-colors hover:text-[#c49b5f]">
                {d}
              </span>
              <span className="h-2 w-2 rotate-45 bg-[#c49b5f]/50" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
