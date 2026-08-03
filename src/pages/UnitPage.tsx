import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
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
import { loadUnitPage, type UnitPageData } from "@/lib/unitPages";
import { arabicField } from "@/lib/arabicFields";

const SITE_URL = "https://tycoons-inv.com";
const WHATSAPP_NUMBER = "201200704344";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function setMeta(selector: string, attribute: "content" | "href", value: string) {
  const element = document.head.querySelector(selector);
  if (element) element.setAttribute(attribute, value);
}

export default function UnitPage() {
  const { id = "" } = useParams();
  const [unit, setUnit] = useState<UnitPageData | null>(null);
  const [loadedId, setLoadedId] = useState("");
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    let active = true;
    void loadUnitPage(id)
      .then((data) => active && setUnit(data))
      .catch(() => active && setUnit(null))
      .finally(() => active && setLoadedId(id));
    return () => { active = false; };
  }, [id]);

  const loading = loadedId !== id;

  const images = useMemo(() => {
    if (!unit) return [];
    return [...new Set([
      unit.image_url,
      ...unit.gallery_urls.split(",").map((url) => url.trim()),
    ].filter(Boolean))];
  }, [unit]);

  useEffect(() => {
    if (!unit) return;
    const pageUrl = `${SITE_URL}/units/${unit.id}`;
    const unitType = arabicField(unit.unit_type);
    const title = `${unitType} ${unit.area_sqm} م² في ${unit.project_name} | Tycoons`;
    const description = `${unitType} في ${unit.project_name} بسعر يبدأ من ${formatPrice(unit.starting_price)} جنيه. اعرف المساحة وخطة السداد والتشطيب.`;
    document.title = title;
    setMeta('meta[name="description"]', "content", description);
    setMeta('link[rel="canonical"]', "href", pageUrl);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:url"]', "content", pageUrl);
    window.scrollTo(0, 0);
  }, [unit]);

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#f7f2ea]"><p className="font-bold">جاري تحميل الوحدة…</p></main>;
  if (!unit) return <main className="grid min-h-screen place-items-center bg-[#f7f2ea] px-5 text-center"><div><p className="text-xl font-bold">الوحدة غير متاحة</p><Link to="/" className="mt-4 inline-block text-[#a3854e] underline">ارجع للرئيسية</Link></div></main>;

  const pageUrl = `${SITE_URL}/units/${unit.id}`;
  const unitTypeAr = arabicField(unit.unit_type);
  const projectUrl = unit.project_slug ? `${SITE_URL}/projects/${unit.project_slug}` : SITE_URL;
  const message = encodeURIComponent(
    `Hello Tycoons Investments,\nI am interested in this available unit:\n\nProject: ${unit.project_name}\nDeveloper: ${unit.developer}\nLocation: ${unit.location}\nUnit type: ${unit.unit_type}\nBedrooms: ${unit.bedrooms_text || "Not specified"}\nArea: ${unit.area_sqm} sqm\nStarting price: ${formatPrice(unit.starting_price)} EGP\nDelivery: ${unit.delivery_text}\nFinishing: ${unit.finishing}\n\nURL: ${pageUrl}\nBrochure: ${unit.brochure_url}\n\nPlease send me the latest availability and payment plan.\n\nSource: unit_page\nPage: ${pageUrl}\nTracking ID: wa_${unit.id.slice(0, 8)}`,
  );
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "RealEstateListing",
        "@id": `${pageUrl}#listing`,
        url: pageUrl,
        name: `${unitTypeAr} في ${unit.project_name}`,
        description: unit.description,
        image: images,
        dateModified: unit.last_updated_at,
        offers: { "@type": "Offer", price: unit.starting_price, priceCurrency: "EGP", availability: "https://schema.org/InStock" },
        accommodation: {
          "@type": "Accommodation",
          floorSize: { "@type": "QuantitativeValue", value: unit.area_sqm, unitCode: "MTK" },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: unit.project_name, item: projectUrl },
          { "@type": "ListItem", position: 3, name: unitTypeAr, item: pageUrl },
        ],
      },
    ],
  };

  const move = (step: number) => setImageIndex((current) => (current + step + images.length) % images.length);

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f2ea] text-[#1b2420]">
      <Navbar />
      <section className="bg-[#0d1f18] px-5 pb-12 pt-32 text-white lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link to={unit.project_slug ? `/projects/${unit.project_slug}` : "/"} className="inline-flex items-center gap-2 text-sm text-white/65 hover:text-white"><ArrowRight className="h-4 w-4" />{unit.project_name}</Link>
          <div className="mt-8 grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="flex flex-wrap gap-4 text-sm text-[#d9b87c]"><span className="inline-flex items-center gap-2"><Building2 className="h-4 w-4" />{unit.developer}</span><span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{unit.location}</span></div>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl">{unitTypeAr} {unit.area_sqm} م² في {unit.project_name}</h1>
            </div>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1faa59] px-6 py-3.5 font-bold"><MessageCircle className="h-5 w-5" />تأكيد السعر والمتاح</a>
          </div>
        </div>
      </section>

      {images.length > 0 && <section className="bg-[#0d1f18] px-5 pb-12"><div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-black"><img src={images[imageIndex]} alt={`${unit.project_name} ${unit.unit_type}`} className="aspect-[16/8] w-full object-cover" fetchPriority="high" />{images.length > 1 && <><button type="button" aria-label="الصورة السابقة" onClick={() => move(1)} className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white"><ChevronRight /></button><button type="button" aria-label="الصورة التالية" onClick={() => move(-1)} className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white"><ChevronLeft /></button><span className="absolute bottom-4 left-4 rounded-full bg-black/60 px-3 py-1 text-xs text-white">{imageIndex + 1} / {images.length}</span></>}</div></section>}

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><div className="grid gap-8 lg:grid-cols-[1fr_0.75fr]">
        <article><h2 className="text-3xl font-extrabold">تفاصيل الوحدة</h2><p className="mt-5 font-light leading-loose text-[#5c6a62]">{unit.description || `وحدة ${unitTypeAr} داخل ${unit.project_name} من ${unit.developer}.`}</p><div className="mt-8 grid gap-4 sm:grid-cols-2">{[
          [BedDouble, "الغرف", arabicField(unit.bedrooms_text, "غير محدد")],
          [Maximize2, "المساحة", `${unit.area_sqm} م²`],
          [WalletCards, "خطة السداد", arabicField(unit.installments_text, "حسب آخر تحديث")],
          [Building2, "التشطيب", arabicField(unit.finishing, "حسب نوع الوحدة")],
        ].map(([Icon, label, value]) => { const DetailIcon = Icon as typeof BedDouble; return <div key={String(label)} className="rounded-2xl border border-[#e7ddc8] bg-white/70 p-5"><DetailIcon className="h-5 w-5 text-[#a3854e]" /><p className="mt-3 text-xs text-[#7b877f]">{String(label)}</p><p className="mt-1 font-bold">{String(value)}</p></div>; })}</div></article>
        <aside className="rounded-3xl bg-[#0d1f18] p-7 text-white lg:sticky lg:top-28 lg:self-start"><p className="text-sm text-white/55">السعر يبدأ من</p><p className="mt-2 text-3xl font-extrabold text-[#ecd9ae]">{formatPrice(unit.starting_price)} جنيه</p><p className="mt-5 text-sm text-white/70">{unit.down_payment_text}</p><Link to={unit.project_slug ? `/projects/${unit.project_slug}` : "/"} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#d9b87c]">شوف المشروع بالكامل <ArrowLeft className="h-4 w-4" /></Link></aside>
      </div></section>

      <Calculator initialPrice={unit.starting_price} initialDown={5} initialYears={8} whatsappHref={`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`} />
      <Footer />
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </main>
  );
}
