import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Clock, Newspaper } from "lucide-react";
import { isEnglish, tr } from "@/lib/homeLanguage";
import { guidePath, loadHomeNews, type HomeNewsItem } from "@/lib/editorialGuides";

const ease = [0.22, 1, 0.36, 1] as const;

// One request feeds both news blocks on the homepage.
const MAIN_COUNT = 5;
let newsRequest: Promise<HomeNewsItem[]> | null = null;
function useHomeNews(english: boolean) {
  const [items, setItems] = useState<HomeNewsItem[] | null>(null);
  useEffect(() => {
    let active = true;
    newsRequest ??= loadHomeNews(english ? "en" : "ar", 11).catch(() => []);
    newsRequest.then((rows) => { if (active) setItems(rows); });
    return () => { active = false; };
  }, [english]);
  return items;
}

function formatDate(value: string, english: boolean) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(english ? "en-GB" : "ar-EG", { day: "numeric", month: "long", year: "numeric" });
}

function isFresh(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) && Date.now() - time < 14 * 24 * 60 * 60 * 1000;
}

function SkeletonCard({ big = false }: { big?: boolean }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_18px_50px_-30px_rgba(11,27,48,0.35)]">
      <div className={`animate-pulse bg-[#e3e8f1] ${big ? "aspect-[16/9]" : "aspect-[16/10]"}`} />
      <div className="space-y-3 p-5">
        <div className="h-4 w-3/4 animate-pulse rounded bg-[#e3e8f1]" />
        <div className="h-3 w-full animate-pulse rounded bg-[#eef1f6]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-[#eef1f6]" />
      </div>
    </div>
  );
}

export default function News() {
  const english = isEnglish();
  const all = useHomeNews(english);
  const items = all ? all.slice(0, MAIN_COUNT) : null;

  // Nothing published (or the request failed): leave the section out rather than show an empty box.
  if (items && !items.length) return null;

  const [featured, ...rest] = items ?? [];
  const side = rest.slice(0, 4);
  const Arrow = english ? ArrowRight : ArrowLeft;
  const allHref = english ? "/en/guides/" : "/guides/";

  return (
    <section id="news" aria-labelledby="home-news-title" className="relative overflow-hidden bg-[#f4f6fa] py-16 lg:py-20">
      <div className="pointer-events-none absolute -top-32 end-[-10%] h-[420px] w-[420px] rounded-full bg-[#ff5a36]/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-20%] start-[-10%] h-[380px] w-[380px] rounded-full bg-[#e0a93b]/15 blur-[120px]" />

      <div className="relative mx-auto max-w-6xl px-5 lg:px-8">
        {/* Breaking ticker */}
        {items && items.length > 1 && (
          <div className="mb-8 flex items-center overflow-hidden rounded-full bg-[#0b1b30] text-white shadow-[0_14px_40px_-18px_rgba(11,27,48,0.7)]">
            <span className="z-10 flex shrink-0 items-center gap-2 rounded-full bg-[#ff5a36] px-4 py-2.5 text-xs font-extrabold tracking-wide">
              <span className="h-2 w-2 animate-pulse-dot rounded-full bg-white" />
              {tr("عاجل")}
            </span>
            <div className="relative min-w-0 flex-1 overflow-hidden" dir="rtl">
              <div className={`flex w-max gap-10 whitespace-nowrap px-6 text-sm text-white/85 ${english ? "" : "animate-marquee"}`}>
                {[...items, ...items].map((item, index) => (
                  <a key={`${item.slug}-${index}`} href={guidePath(item)} className="transition-colors hover:text-[#ffb59f]" dir={english ? "ltr" : "rtl"}>
                    <span className="me-3 text-[#e0a93b]">◆</span>{item.title}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Heading */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease }}
          >
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#ff5a36]/10 px-3.5 py-1.5 text-xs font-bold text-[#e0441f]">
              <Newspaper className="h-3.5 w-3.5" />
              {tr("أخبار وتحديثات السوق")}
            </div>
            <h2 id="home-news-title" className="text-3xl font-extrabold text-[#0f1724] sm:text-4xl">
              {tr("آخر الأخبار العقارية")}
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#556070]">
              {tr("إطلاقات جديدة، أسعار محدثة وأنظمة سداد — مكتوبة ببساطة ومراجعة من فريقنا.")}
            </p>
          </motion.div>
          <a href={allHref} className="group inline-flex items-center gap-2 rounded-full border border-[#0b1b30]/15 bg-white px-5 py-2.5 text-sm font-bold text-[#0b1b30] transition-colors hover:border-[#ff5a36] hover:text-[#e0441f]">
            {tr("كل الأخبار")}
            <Arrow className="h-4 w-4 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-[-2px]" />
          </a>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Featured story */}
          <div className="lg:col-span-3">
            {!featured ? (
              <SkeletonCard big />
            ) : (
              <motion.a
                href={guidePath(featured)}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.8, ease }}
                className="group block h-full overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_-30px_rgba(11,27,48,0.45)] ring-1 ring-[#0b1b30]/5 transition-shadow hover:shadow-[0_30px_70px_-28px_rgba(255,90,54,0.45)]"
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img
                    src={featured.image}
                    alt={featured.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#07111f]/55 via-transparent to-transparent" />
                  <div className="absolute start-4 top-4 flex items-center gap-2">
                    <span className="rounded-full bg-[#ff5a36] px-3 py-1 text-xs font-extrabold text-white shadow-lg">
                      {isFresh(featured.published_at) ? tr("جديد") : tr("مميز")}
                    </span>
                    {featured.project_name && (
                      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#0b1b30] backdrop-blur">
                        {featured.project_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-6 sm:p-7">
                  <div className="mb-3 flex items-center gap-1.5 text-xs text-[#8a93a3]">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDate(featured.published_at, english)}
                  </div>
                  <h3 className="text-xl font-extrabold leading-snug text-[#0f1724] transition-colors group-hover:text-[#e0441f] sm:text-2xl">
                    {featured.title}
                  </h3>
                  {featured.excerpt && (
                    <p className="mt-3 line-clamp-3 leading-relaxed text-[#4a5568]">{featured.excerpt}</p>
                  )}
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#e0441f]">
                    {tr("اقرأ الخبر")}
                    <Arrow className="h-4 w-4" />
                  </span>
                </div>
              </motion.a>
            )}
          </div>

          {/* More stories */}
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-1">
            {(items ? side : [0, 1, 2, 3]).map((item, index) =>
              typeof item === "number" ? (
                <div key={item} className="flex gap-4 rounded-2xl bg-white p-3">
                  <div className="h-24 w-28 shrink-0 animate-pulse rounded-xl bg-[#e3e8f1]" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3.5 w-full animate-pulse rounded bg-[#e3e8f1]" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-[#eef1f6]" />
                  </div>
                </div>
              ) : (
                <motion.a
                  key={item.slug}
                  href={guidePath(item)}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.6, delay: index * 0.08, ease }}
                  className="group flex gap-4 rounded-2xl bg-white p-3 ring-1 ring-[#0b1b30]/5 transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(11,27,48,0.45)]"
                >
                  <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl">
                    <img src={item.image} alt={item.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    {isFresh(item.published_at) && (
                      <span className="absolute start-1.5 top-1.5 rounded-full bg-[#ff5a36] px-2 py-0.5 text-[10px] font-extrabold text-white">{tr("جديد")}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 py-0.5">
                    <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-[#0f1724] transition-colors group-hover:text-[#e0441f]">
                      {item.title}
                    </h3>
                    {item.excerpt && <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#556070]">{item.excerpt}</p>}
                    <div className="mt-1.5 text-[11px] text-[#8a93a3]">{formatDate(item.published_at, english)}</div>
                  </div>
                </motion.a>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Second news row (older stories), placed further down the homepage. */
export function NewsMore() {
  const english = isEnglish();
  const all = useHomeNews(english);
  const more = all ? all.slice(MAIN_COUNT) : [];
  if (more.length < 2) return null;
  const Arrow = english ? ArrowRight : ArrowLeft;
  return (
    <section aria-labelledby="home-news-more" className="bg-[#f4f6fa] py-14 lg:py-16">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 id="home-news-more" className="text-2xl font-extrabold text-[#0f1724] sm:text-3xl">{tr("تحديثات تانية تهمك")}</h2>
          <a href={english ? "/en/guides/" : "/guides/"} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#e0441f] hover:underline">
            {tr("كل الأخبار")}<Arrow className="h-4 w-4" />
          </a>
        </div>
        <div className="scrollbar-hide -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {more.slice(0, 6).map((item, index) => (
            <motion.a
              key={item.slug}
              href={guidePath(item)}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: index * 0.08, ease }}
              className="group w-[80%] shrink-0 snap-start overflow-hidden rounded-2xl bg-white ring-1 ring-[#0b1b30]/5 transition-all hover:-translate-y-1 hover:shadow-[0_22px_50px_-26px_rgba(11,27,48,0.5)] sm:w-auto"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <img src={item.image} alt={item.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                {isFresh(item.published_at) && (
                  <span className="absolute start-3 top-3 rounded-full bg-[#ff5a36] px-2.5 py-0.5 text-[11px] font-extrabold text-white">{tr("جديد")}</span>
                )}
              </div>
              <div className="p-4">
                <div className="text-[11px] text-[#8a93a3]">{formatDate(item.published_at, english)}</div>
                <h3 className="mt-1.5 line-clamp-2 font-bold leading-snug text-[#0f1724] transition-colors group-hover:text-[#e0441f]">{item.title}</h3>
                {item.excerpt && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[#556070]">{item.excerpt}</p>}
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
