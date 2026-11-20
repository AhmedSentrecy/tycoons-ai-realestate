import { tr, localeHref } from "@/lib/homeLanguage";
import SeeMore from "@/components/home/SeeMore";
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
    <section id="developers" className="overflow-hidden border-y border-[#d9e0eb] bg-[#e8edf5] py-11">
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8, ease }}
        className="mb-7 text-center"
      >
        <div className="mb-3 flex items-center justify-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-[#d99a2b]" />
          <span className="text-sm font-medium text-[#b47c17]">{tr("شركاء موثوقون")}</span>
        </div>
        <h2 className="text-2xl font-extrabold text-[#0f1724] sm:text-3xl">{tr("مطوّرون موثوقون")}</h2>
        <p className="mx-auto mt-3 max-w-md font-light text-[#6b7585]">
          {tr("كل الوحدات مباشرة من المطوّر — بيانات وأسعار موثّقة، من غير وسطاء وهميين.")}</p>
      </motion.div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-[#e8edf5] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-[#e8edf5] to-transparent" />
        <div className="flex w-max animate-marquee gap-14 pl-14">
          {row.map((d, i) => (
            <div key={i} className="flex items-center gap-14">
              <a href={localeHref(`/ar/developers/${slugify(d)}`)} className="whitespace-nowrap text-xl font-bold tracking-wide text-[#384558]/55 transition-colors hover:text-[#0b1b30]">
                {d}
              </a>
              <span className="h-2 w-2 rotate-45 bg-[#d99a2b]/50" />
            </div>
          ))}
        </div>
      </div>

      <div className="px-5">
        <SeeMore href={localeHref("/ar/#developers")} label={tr("المزيد من المطورين")} />
      </div>
    </section>
  );
}
