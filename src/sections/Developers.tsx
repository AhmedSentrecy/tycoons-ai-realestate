import { motion } from "framer-motion";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
    <section className="overflow-hidden border-y border-[#e3d9c4] bg-[#efe7d8] py-11">
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8, ease }}
        className="mb-7 text-center"
      >
        <div className="mb-3 flex items-center justify-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-[#c49b5f]" />
          <span className="text-sm font-medium text-[#a3854e]">شركاء موثوقون</span>
        </div>
        <h2 className="text-2xl font-extrabold text-[#1b2420] sm:text-3xl">مطوّرون موثوقون</h2>
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
              <a href={`/ar/developers/${slugify(d)}`} className="whitespace-nowrap text-xl font-bold tracking-wide text-[#3a4a41]/55 transition-colors hover:text-[#14352a]">
                {d}
              </a>
              <span className="h-2 w-2 rotate-45 bg-[#c49b5f]/50" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
