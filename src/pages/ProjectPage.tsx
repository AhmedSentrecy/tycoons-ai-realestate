import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BedDouble,
  Building2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Maximize2,
  MessageCircle,
  WalletCards,
} from "lucide-react";
import Navbar from "@/sections/Navbar";
import Footer from "@/sections/Footer";
import Calculator from "@/sections/Calculator";
import { fallbackImageFor, useInventory, type InventoryUnit } from "@/lib/inventory";

const SITE_URL = "https://tycoons-inv.com";
const WHATSAPP_NUMBER = "201200704344";

function slugify(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ar-EG").format(value);
}

function setMeta(selector: string, attribute: "content" | "href", value: string) {
  let element = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!element) {
    element = selector.startsWith("link") ? document.createElement("link") : document.createElement("meta");
    if (selector.includes('rel="canonical"')) element.setAttribute("rel", "canonical");
    if (selector.includes('name="description"')) element.setAttribute("name", "description");
    if (selector.includes('property="og:')) {
      const property = selector.match(/property="([^"]+)"/)?.[1];
      if (property) element.setAttribute("property", property);
    }
    document.head.appendChild(element);
  }
  element.setAttribute(attribute, value);
}

function uniqueUnits(units: InventoryUnit[]) {
  return [
    ...new Map(
      units.map((unit) => [
        [unit.unit_type, unit.bedrooms_text, unit.area_sqm, unit.starting_price].join("|"),
        unit,
      ]),
    ).values(),
  ];
}

function ProjectGallery({
  images,
  videos,
  name,
}: {
  images: string[];
  videos: string[];
  name: string;
}) {
  const media = [
    ...images.map((src) => ({ type: "image" as const, src })),
    ...videos.map((src) => ({ type: "video" as const, src })),
  ];
  const [index, setIndex] = useState(0);
  const current = media[index];

  const move = (step: number) =>
    setIndex((previous) => (previous + step + media.length) % media.length);

  if (!current) return null;

  return (
    <section className="mx-auto max-w-7xl px-5 pb-10 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl bg-[#0d1f18] shadow-2xl">
        <div className="aspect-[4/3] sm:aspect-[16/8]">
          {current.type === "video" ? (
            <video
              src={current.src}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
          ) : (
            <img
              src={current.src}
              alt={`${name} — صورة ${index + 1}`}
              className="h-full w-full object-cover"
              fetchPriority={index === 0 ? "high" : "auto"}
            />
          )}
        </div>
        {media.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="الصورة السابقة"
              className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/70 sm:right-5"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="الصورة التالية"
              className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/70 sm:left-5"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <span className="absolute bottom-4 left-4 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
              {index + 1} / {media.length}
            </span>
            <div className="absolute bottom-5 right-1/2 flex max-w-[60%] translate-x-1/2 gap-1.5 overflow-hidden">
              {media.slice(Math.max(0, index - 3), Math.min(media.length, index + 4)).map((item) => {
                const itemIndex = media.indexOf(item);
                return (
                  <button
                    key={`${item.type}-${item.src}`}
                    type="button"
                    onClick={() => setIndex(itemIndex)}
                    aria-label={`افتح الوسيط ${itemIndex + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      itemIndex === index ? "w-6 bg-white" : "w-1.5 bg-white/45"
                    }`}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default function ProjectPage() {
  const { slug = "" } = useParams();
  const { units, loading, error } = useInventory();
  const projectUnits = useMemo(
    () => uniqueUnits(units.filter((unit) => slugify(unit.project_name) === slug)),
    [slug, units],
  );
  const project = projectUnits[0];

  useEffect(() => {
    if (!project) return;
    const pageUrl = `${SITE_URL}/projects/${slug}`;
    const title = "Hyde Park New Cairo New Launch | الأسعار والمساحات 2026";
    const description =
      "تعرف على أسعار Hyde Park New Cairo New Launch 2026، المساحات المتاحة للشقق والدوبلكس، مقدم 5% + 5% وتقسيط 8 سنوات، واحسب القسط وتواصل مع Tycoons.";
    document.title = title;
    setMeta('meta[name="description"]', "content", description);
    setMeta('link[rel="canonical"]', "href", pageUrl);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:url"]', "content", pageUrl);
    window.scrollTo(0, 0);
  }, [project, slug]);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f2ea]">
        <p className="font-bold text-[#1b2420]">جاري تحميل تفاصيل المشروع…</p>
      </main>
    );
  }

  if (error || !project) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f2ea] px-5 text-center">
        <div>
          <p className="text-xl font-bold text-[#1b2420]">تعذّر فتح المشروع</p>
          <Link to="/" className="mt-4 inline-block text-[#a3854e] underline">
            ارجع للرئيسية
          </Link>
        </div>
      </main>
    );
  }

  const images = [
    ...new Set(
      projectUnits.flatMap((unit) =>
        unit.images.length ? unit.images : [unit.image_url || fallbackImageFor(unit)],
      ),
    ),
  ].filter(Boolean);
  const videos = [
    ...new Set(
      projectUnits.flatMap((unit) =>
        unit.video_url
          .split(",")
          .map((url) => url.trim())
          .filter(Boolean),
      ),
    ),
  ];
  const minPrice = Math.min(...projectUnits.map((unit) => unit.starting_price));
  const pageUrl = `${SITE_URL}/projects/${slug}`;
  const message = encodeURIComponent(
    `Hello Tycoons Investments,\nI am interested in this project:\n\nProject: ${project.project_name}\nDeveloper: ${project.developer}\nLocation: ${project.location}\nStarting price: ${formatPrice(minPrice)} EGP\nStatus: Available\n\nURL: ${pageUrl}\n\nPlease send me available options and details.\n\nSource: project_page\nPage: ${pageUrl}`,
  );

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f2ea] text-[#1b2420]">
      <Navbar />

      <section className="bg-[#0d1f18] px-5 pb-12 pt-32 text-white lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/65 hover:text-white">
            <ArrowRight className="h-4 w-4" />
            الرئيسية
          </Link>
          <div className="mt-8 grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-[#d9b87c]">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {project.developer}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {project.location}
                </span>
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-extrabold leading-tight sm:text-5xl">
                {project.project_name}
              </h1>
              <p className="mt-5 text-lg font-light text-white/70">
                طرح سكني جديد داخل مجتمع قائم في قلب القاهرة الجديدة.
              </p>
            </div>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1faa59] px-6 py-3.5 font-bold text-white shadow-lg transition hover:scale-[1.02]"
            >
              <MessageCircle className="h-5 w-5" />
              اطلب آخر الأسعار والمتاح
            </a>
          </div>
        </div>
      </section>

      <div className="-mt-px bg-[#0d1f18] pb-4">
        <ProjectGallery images={images} videos={videos} name={project.project_name} />
      </div>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_0.8fr]">
          <article>
            <h2 className="text-3xl font-extrabold">عن Hyde Park New Cairo – New Launch</h2>
            <p className="mt-6 text-lg font-light leading-loose text-[#4d5c53]">
              الطرح الجديد داخل Hyde Park New Cairo بيوفر فرصة للسكن داخل واحد من أكبر
              المجتمعات المتكاملة في القاهرة الجديدة، في موقع على شارع التسعين وقريب من
              الحديقة الرئيسية وأهم وجهات التجمع الخامس.
            </p>
            <p className="mt-5 font-light leading-loose text-[#5c6a62]">
              المشروع مجتمع قائم بالفعل وبيجمع بين المساحات الخضراء والخدمات والمناطق
              الاجتماعية والترفيهية، مع تنوع في الوحدات بين شقق ودوبلكس. ده يخلي الاختيار
              مناسب للعائلات اللي بتدور على سكن داخل كمبوند متكامل، وللمشتري اللي مهتم
              بالحفاظ على قيمة العقار على المدى الطويل.
            </p>
            <h2 className="mt-12 text-2xl font-extrabold">موقع هايد بارك التجمع الخامس</h2>
            <p className="mt-5 font-light leading-loose text-[#5c6a62]">
              موقع هايد بارك القاهرة الجديدة على شارع التسعين الجنوبي بيدي السكان وصول
              مباشر لأهم مناطق التجمع الخامس، مع قربه من الجامعة الأمريكية ومحاور القاهرة
              الجديدة. موقع الكمبوند ومساحته الكبيرة والخدمات القائمة بيخلوا الطرح الجديد
              اختيار مناسب للسكن والاستثمار العقاري طويل الأجل.
            </p>

            <h2 className="mt-12 text-2xl font-extrabold">
              أسعار هايد بارك التجمع الخامس 2026
            </h2>
            <p className="mt-5 font-light leading-loose text-[#5c6a62]">
              أسعار Hyde Park New Cairo New Launch بتبدأ حاليًا من {formatPrice(minPrice)}
              جنيه، وبتختلف حسب نوع الوحدة والمساحة وموقعها داخل المشروع. الطرح بيضم شقق
              ودوبلكس للبيع بمساحات من 80 إلى 190 متر مربع، مع مقدم 5% ثم 5% لاحقًا
              وتقسيط الباقي على 8 سنوات. الأسعار والتوافر المعروضين بيانات مبدئية لازم يتم
              تأكيدها وقت الحجز.
            </p>

            <h2 className="mt-12 text-2xl font-extrabold">
              شقق ودوبلكس للبيع في Hyde Park New Cairo
            </h2>
            <p className="mt-5 font-light leading-loose text-[#5c6a62]">
              تنوع المساحات بيساعدك تقارن بين الوحدة المناسبة للسكن العائلي والوحدة الأنسب
              للاستثمار. كل الوحدات في الطرح الحالي بنظام Core &amp; Shell، وتقدر تستخدم
              حاسبة الأقساط الموجودة في الصفحة لمقارنة السعر والمقدم والقسط الشهري قبل
              التواصل مع مستشار Tycoons لتأكيد أحدث Availability وPayment Plan.
            </p>

            <h2 className="mt-12 text-2xl font-extrabold">تفاصيل الطرح الحالي</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                "مقدم 5% ثم 5% لاحقًا",
                "تقسيط على 8 سنوات",
                "شقق ودوبلكس بمساحات مختلفة",
                "التشطيب Core & Shell",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-[#e7ddc8] bg-white/70 p-4"
                >
                  <BadgeCheck className="h-5 w-5 shrink-0 text-[#a3854e]" />
                  <span className="font-semibold">{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 rounded-2xl bg-[#efe7d8] p-5 text-sm leading-relaxed text-[#5c6a62]">
              الأسعار والمساحات والتوافر بيتغيروا حسب وقت الحجز، لذلك بنأكد آخر
              Availability وPayment Plan قبل اتخاذ القرار.
            </p>
            <section className="mt-14" aria-labelledby="hyde-park-faq">
              <h2 id="hyde-park-faq" className="text-2xl font-extrabold">
                أسئلة شائعة عن Hyde Park New Cairo New Launch
              </h2>
              <div className="mt-6 space-y-4">
                {[
                  {
                    question: "ما أسعار هايد بارك التجمع الخامس 2026؟",
                    answer: `الأسعار في الطرح الجديد تبدأ من ${formatPrice(minPrice)} جنيه، وبتختلف حسب نوع الوحدة والمساحة والتوافر وقت الحجز.`,
                  },
                  {
                    question: "ما نظام سداد Hyde Park New Cairo New Launch؟",
                    answer: "مقدم 5% ثم 5% لاحقًا، وتقسيط باقي قيمة الوحدة على 8 سنوات.",
                  },
                  {
                    question: "ما أنواع ومساحات الوحدات المتاحة؟",
                    answer: "الطرح الحالي يضم شقق ودوبلكس بمساحات تقريبية من 80 إلى 190 متر مربع.",
                  },
                  {
                    question: "ما نوع تشطيب الوحدات؟",
                    answer: "الوحدات المعروضة في الطرح الحالي بنظام Core & Shell.",
                  },
                  {
                    question: "إزاي أتأكد من أحدث سعر ووحدة متاحة؟",
                    answer: "استخدم زر واتساب في الصفحة لإرسال اسم المشروع والرابط مباشرة إلى Tycoons وتأكيد السعر والتوافر وخطة السداد.",
                  },
                ].map((item) => (
                  <details key={item.question} className="group rounded-2xl border border-[#e7ddc8] bg-white/70 p-5">
                    <summary className="cursor-pointer list-none font-bold">{item.question}</summary>
                    <p className="mt-3 font-light leading-relaxed text-[#5c6a62]">{item.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          </article>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-3xl bg-[#0d1f18] p-7 text-white">
              <p className="text-sm text-white/55">الأسعار تبدأ من</p>
              <p className="mt-2 text-3xl font-extrabold text-[#ecd9ae]">
                {formatPrice(minPrice)} جنيه
              </p>
              <div className="mt-6 space-y-4 border-t border-white/10 pt-6 text-sm">
                <div className="flex items-center gap-3">
                  <WalletCards className="h-5 w-5 text-[#d9b87c]" />
                  5% + 5%، والباقي على 8 سنوات
                </div>
                <div className="flex items-center gap-3">
                  <Maximize2 className="h-5 w-5 text-[#d9b87c]" />
                  مساحات من 80 إلى 190 م²
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-y border-[#e7ddc8] bg-[#efe7d8] py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#a3854e]">الوحدات المتاحة</p>
              <h2 className="mt-2 text-3xl font-extrabold">اختار المساحة المناسبة</h2>
            </div>
            <span className="text-sm text-[#5c6a62]">{projectUnits.length} اختيارات</span>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {projectUnits.map((unit) => (
              <article
                key={[unit.unit_type, unit.bedrooms_text, unit.area_sqm].join("|")}
                className="rounded-3xl border border-[#e0d3bb] bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-[#8a7a58]">{unit.unit_type}</p>
                    <h3 className="mt-1 text-xl font-extrabold">
                      {unit.bedrooms_text || "Duplex"}
                    </h3>
                  </div>
                  <span className="rounded-full bg-[#e8f5ed] px-3 py-1 text-xs font-bold text-[#14733c]">
                    متاح
                  </span>
                </div>
                <div className="mt-5 flex items-center gap-5 text-sm text-[#5c6a62]">
                  {unit.bedrooms_text && (
                    <span className="inline-flex items-center gap-2">
                      <BedDouble className="h-4 w-4 text-[#a3854e]" />
                      {unit.bedrooms_text}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-2">
                    <Maximize2 className="h-4 w-4 text-[#a3854e]" />
                    {unit.area_sqm} م²
                  </span>
                </div>
                <div className="mt-6 border-t border-[#eee5d6] pt-5">
                  <p className="text-xs text-[#7b877f]">يبدأ من</p>
                  <p className="mt-1 text-2xl font-extrabold text-[#14352a]">
                    {formatPrice(unit.starting_price)} جنيه
                  </p>
                  <p className="mt-2 text-sm text-[#5c6a62]">{unit.down_payment_text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Calculator
        initialPrice={minPrice}
        initialDown={5}
        initialYears={8}
        whatsappHref={`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`}
      />

      <section className="mx-auto max-w-4xl px-5 py-16 text-center">
        <h2 className="text-3xl font-extrabold">عايز تقارن الوحدات وخطة السداد؟</h2>
        <p className="mt-4 font-light text-[#5c6a62]">
          ابعتلنا على واتساب وهنأكد لك أحدث توافر وأسعار قبل الحجز.
        </p>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`}
          target="_blank"
          rel="noreferrer"
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#1faa59] px-7 py-3.5 font-bold text-white"
        >
          <MessageCircle className="h-5 w-5" />
          تواصل على واتساب
          <ArrowLeft className="h-4 w-4" />
        </a>
      </section>

      <Footer />
    </main>
  );
}
