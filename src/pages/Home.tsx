import Navbar from "@/sections/Navbar";
import Hero from "@/sections/Hero";
import Projects from "@/sections/Projects";
import Regions from "@/sections/Regions";
import AboutSection from "@/sections/AboutSection";
import Developers from "@/sections/Developers";
import WhyUs from "@/sections/WhyUs";
import Calculator from "@/sections/Calculator";
import FaqSection from "@/sections/FaqSection";
import Footer from "@/sections/Footer";
import { useEffect } from "react";
import { isEnglish } from "@/lib/homeLanguage";

export default function Home() {
  const english = isEnglish();
  useEffect(() => {
    document.documentElement.lang = english ? "en" : "ar";
    document.documentElement.dir = english ? "ltr" : "rtl";
  }, [english]);
  return (
    <main lang={english ? "en" : "ar"} dir={english ? "ltr" : "rtl"} className="min-h-screen bg-[#f7f2ea]">
      <Navbar />
      <Hero />
      <Projects />
      <Regions />
      <AboutSection />
      <Developers />
      <WhyUs />
      <Calculator />
      <FaqSection />
      <section aria-labelledby="property-comparison-guides" className="bg-[#f0e8d9] px-5 py-12 text-[#1b2420]">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#8a6630]">
            {english ? "Buyer decision guide" : "دليل قرار الشراء"}
          </p>
          <h2 id="property-comparison-guides" className="mt-3 text-2xl font-bold md:text-3xl">
            {english ? "Compare property projects, not just advertised prices" : "قارن التكلفة الحقيقية مش سعر البداية بس"}
          </h2>
          <p className="mt-4 max-w-4xl leading-relaxed text-[#536056]">
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
              <p className="mt-2 text-sm leading-relaxed text-[#536056]">
                {english
                  ? "Compare available and near-delivery homes, construction and finishing status, nearby services and the developer's delivery record. Choose a shortlist based on the way you plan to use the property."
                  : "ركز على الوحدات الجاهزة أو القريبة من الاستلام، وحالة التشطيب، والخدمات حوالين المشروع، وسجل المطور في التسليم في مواعيده."}
              </p>
            </div>
            <div>
              <h3 className="font-bold">{english ? "Evaluating an investment?" : "بتشتري للاستثمار؟"}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#536056]">
                {english
                  ? "Compare total ownership costs and location demand, not promised returns. Rental yield and resale value are scenarios, not guarantees; a listing price is not evidence of a completed market transaction."
                  : "قارن إجمالي تكلفة الامتلاك والطلب في المنطقة، مش العائد الموعود. العائد الإيجاري وسعر إعادة البيع سيناريوهات تقديرية مش ضمان، وسعر الإعلان مش دليل على سعر بيع فعلي."}
              </p>
            </div>
          </div>
          <p className="mt-7 text-sm leading-relaxed text-[#536056]">
            {english ? "Prices and availability can change. Confirm the exact unit and payment schedule before reserving. Review our " : "الأسعار والتوفر بيتغيروا، فأكد الوحدة ونظام السداد قبل الحجز. اقرا "}
            <a className="underline underline-offset-4" href={english ? "/en/guides/" : "/guides/"}>{english ? "buying guides" : "أدلة شراء العقار"}</a>
            {english ? ", " : "، "}
            <a className="underline underline-offset-4" href="/methodology">{english ? "methodology" : "منهجية البيانات"}</a>
            {english ? " and " : " و"}
            <a className="underline underline-offset-4" href="/corrections">{english ? "corrections policy" : "سياسة التصحيح"}</a>.
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}
