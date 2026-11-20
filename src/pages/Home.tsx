import Navbar from "@/sections/Navbar";
import Hero from "@/sections/Hero";
import News, { NewsMore } from "@/sections/News";
import Projects from "@/sections/Projects";
import Regions from "@/sections/Regions";
import Developers from "@/sections/Developers";
import FaqSection from "@/sections/FaqSection";
import Footer from "@/sections/Footer";
import DaySky from "@/components/home/DaySky";
import SkyPanel from "@/components/home/SkyPanel";
import PageGuide from "@/components/home/PageGuide";
import { useEffect } from "react";
import { isEnglish, tr } from "@/lib/homeLanguage";
import { ArrowLeft, ChevronDown } from "lucide-react";
import englishHomeSections from "@/content/english-home-sections.json";

export default function Home() {
  const english = isEnglish();
  useEffect(() => {
    document.documentElement.lang = english ? "en" : "ar";
    document.documentElement.dir = english ? "ltr" : "rtl";
  }, [english]);
  return (
    <main lang={english ? "en" : "ar"} dir={english ? "ltr" : "rtl"} className="relative min-h-screen pt-[70px]">
      {/* One sky behind the whole page, sunrise at the top to night at the footer; each section is a glass panel over it. */}
      <DaySky />
      <Navbar solid />
      <SkyPanel id="s-hero" tone="dark"><Hero /></SkyPanel>
      {/* Order: search → news (only when there's news from the last month) → launches → more news → areas → developers → FAQ → buyer guide (collapsed) → about line → footer. */}
      <News />
      <SkyPanel id="s-launch" tone="dark"><Projects /></SkyPanel>
      <NewsMore />
      <SkyPanel id="s-areas"><Regions /></SkyPanel>
      <SkyPanel id="s-devs"><Developers /></SkyPanel>
      <SkyPanel id="s-faq"><FaqSection /></SkyPanel>
      {/* Buyer guide: kept in the page for search engines, folded so it doesn't take the screen. */}
      <SkyPanel id="s-guide">
      <section aria-label={tr("دليل قرار الشراء")} className="p-3 sm:p-5">
        <details className="group mx-auto max-w-6xl overflow-hidden rounded-2xl bg-white ring-1 ring-[#0b1b30]/10">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="block text-xs font-bold uppercase tracking-wider text-[#b47c17]">{tr("دليل قرار الشراء")}</span>
              <span className="mt-1 block text-lg font-extrabold text-[#0f1724] sm:text-xl">{tr("قارن التكلفة الحقيقية قبل ما تختار — مناطق، مطورين، وإيه اللي تسأل عنه")}</span>
            </span>
            <ChevronDown aria-hidden="true" className="h-6 w-6 shrink-0 text-[#0b1b30] transition-transform duration-300 group-open:rotate-180" />
          </summary>
          <div className="border-t border-[#dde4ee]">
      {english && (
        // Same buyer sections as the crawlable /en/ HTML (prices per m², 13 project guides,
        // payment plans, who writes the guides), so they stay after JavaScript loads (audit SEO-01).
        <section
          aria-label="Buyer guide"
          className="px-5 py-8 text-[#0f1724] sm:px-6"
        >
          <div
            className="mx-auto max-w-6xl leading-relaxed text-[#4a5568] [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-[#0f1724] first:[&_h2]:mt-0 md:[&_h2]:text-3xl [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:ps-6 [&_li]:mt-2 [&_nav]:mt-4 [&_nav]:leading-loose [&_a]:font-semibold [&_a]:text-[#9a640f] [&_a]:underline [&_a]:underline-offset-4"
            dangerouslySetInnerHTML={{ __html: englishHomeSections.html }}
          />
        </section>
      )}
      <section aria-labelledby="property-comparison-guides" className="px-5 py-8 text-[#0f1724] sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#9a640f]">
            {english ? "Buyer decision guide" : "دليل قرار الشراء"}
          </p>
          <h2 id="property-comparison-guides" className="mt-3 text-2xl font-bold md:text-3xl">
            {english ? "Compare property projects, not just advertised prices" : "قارن التكلفة الحقيقية مش سعر البداية بس"}
          </h2>
          <p className="mt-4 max-w-4xl leading-relaxed text-[#4a5568]">
            {english
              ? "Find a home in Egypt by location, developer, property type and size. Compare the total price, down payment, instalment schedule, delivery timing and finishing condition before choosing a project. A lower initial payment does not always mean a lower total purchase cost. Check maintenance fees and contract terms as well."
              : "لما تقارن بين وحدتين، بص على السعر الإجمالي والمقدم وعدد سنين التقسيط ومساحة الوحدة وسعر المتر ونوع التشطيب وموعد الاستلام مع بعض. المقدم الأقل مش معناه إن الوحدة أرخص في الآخر، واسأل دايمًا عن وديعة الصيانة والجراج والنادي وأي مصاريف مش داخلة في السعر المعلن."}
          </p>
          <h3 className="mt-7 text-lg font-bold">{english ? "Explore areas and developers" : "تصفح المناطق والمطورين"}</h3>
          <nav aria-label={english ? "Property research links" : "روابط المناطق والمطورين"} className="mt-3 flex flex-wrap gap-3 text-sm">
            {(english
              ? [
                  ["/en/areas/new-cairo", "New Cairo"], ["/en/areas/mostakbal-city", "Mostakbal City and map"], ["/en/areas/north-coast", "North Coast"],
                  ["/en/areas/sheikh-zayed", "Sheikh Zayed"], ["/en/areas/new-capital", "New Capital"], ["/en/areas/ain-sokhna", "Ain Sokhna"],
                  ["/en/developers/mountain-view", "Mountain View"], ["/en/developers/sodic", "SODIC"], ["/en/developers/palm-hills-developments", "Palm Hills"],
                  ["/en/developers/la-vista-developments", "La Vista"], ["/en/developers/hyde-park-developments", "Hyde Park"], ["/en/developers/ora-developers", "Ora"],
                  ["/en/developers/madinet-masr", "Madinet Masr"], ["/en/directory/", "Full project directory"],
                ]
              : [
                  ["/ar/areas/new-cairo", "التجمع الخامس"], ["/ar/areas/mostakbal-city", "مستقبل سيتي وخريطتها"], ["/ar/areas/north-coast", "الساحل الشمالي"],
                  ["/ar/areas/sheikh-zayed", "الشيخ زايد"], ["/ar/areas/new-capital", "العاصمة الإدارية"], ["/ar/areas/ain-sokhna", "العين السخنة"],
                  ["/ar/developers/mountain-view", "ماونتن فيو"], ["/ar/developers/sodic", "سوديك"], ["/ar/developers/palm-hills-developments", "بالم هيلز"],
                  ["/ar/developers/la-vista-developments", "لافيستا"], ["/ar/developers/hyde-park-developments", "هايد بارك"], ["/ar/developers/ora-developers", "أورا"],
                  ["/ar/developers/madinet-masr", "مدينة مصر"], ["/ar/", "دليل كل المشاريع"],
                ]
            ).map(([href, label]) => (
              <a key={href} className="underline underline-offset-4" href={href}>{label}</a>
            ))}
          </nav>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-bold">{english ? "Buying for your own home?" : "بتشتري عشان تسكن؟"}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#4a5568]">
                {english
                  ? "Compare available and near-delivery homes, construction and finishing status, nearby services and the developer's delivery record. Choose a shortlist based on the way you plan to use the property."
                  : "ركز على الوحدات الجاهزة أو القريبة من الاستلام، وحالة التشطيب، والخدمات حوالين المشروع، وسجل المطور في التسليم في مواعيده."}
              </p>
            </div>
            <div>
              <h3 className="font-bold">{english ? "Evaluating an investment?" : "بتشتري للاستثمار؟"}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#4a5568]">
                {english
                  ? "Compare total ownership costs and location demand, not promised returns. Rental yield and resale value are scenarios, not guarantees; a listing price is not evidence of a completed market transaction."
                  : "قارن إجمالي تكلفة الامتلاك والطلب في المنطقة، مش العائد الموعود. العائد الإيجاري وسعر إعادة البيع سيناريوهات تقديرية مش ضمان، وسعر الإعلان مش دليل على سعر بيع فعلي."}
              </p>
            </div>
          </div>
          <p className="mt-7 text-sm leading-relaxed text-[#4a5568]">
            {english ? "Prices and availability can change. Confirm the exact unit and payment schedule before reserving. Review our " : "الأسعار والتوفر بيتغيروا، فأكد الوحدة ونظام السداد قبل الحجز. اقرا "}
            <a className="underline underline-offset-4" href={english ? "/en/guides/" : "/guides/"}>{english ? "buying guides" : "أدلة شراء العقار"}</a>
            {english ? ", " : "، "}
            <a className="underline underline-offset-4" href="/methodology">{english ? "methodology" : "منهجية البيانات"}</a>
            {english ? " and " : " و"}
            <a className="underline underline-offset-4" href="/corrections">{english ? "corrections policy" : "سياسة التصحيح"}</a>.
          </p>
        </div>
      </section>
          </div>
        </details>
      </section>
      </SkyPanel>
      <SkyPanel id="s-end" tone="dark">
      {/* Short "who we are" line; keeps the #about anchor the navigation links to. */}
      <section id="about" className="scroll-mt-20 border-b border-white/10 px-5 py-7 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <p className="max-w-3xl text-sm leading-relaxed text-white/75">
            {tr("مش موقع إعلانات — مساعد شراء عقاري. بنجمع الوحدات من المطوّر مباشرة ونوصّلك للوحدة الصح بجملة واحدة.")}
          </p>
          {!english && (
            <a href="/about" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm font-bold text-[#f0bd4f] hover:bg-white/10">
              {tr("اعرف أكتر عن تايكونز")}
              <ArrowLeft className="h-4 w-4" />
            </a>
          )}
        </div>
      </section>
      <Footer cta={false} />
      </SkyPanel>
      {/* A little open night sky under the footer, where the city lights up. */}
      <div aria-hidden="true" className="h-[22vh]" />
      <PageGuide />
    </main>
  );
}
