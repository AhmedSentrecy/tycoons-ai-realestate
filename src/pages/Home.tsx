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
      {english && (
        <section aria-labelledby="property-comparison-guides" className="bg-[#f0e8d9] px-5 py-12 text-[#1b2420]">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-[#8a6630]">Buyer decision guide</p>
            <h2 id="property-comparison-guides" className="mt-3 text-2xl font-bold md:text-3xl">
              Compare property projects, not just advertised prices
            </h2>
            <p className="mt-4 max-w-4xl leading-relaxed text-[#536056]">
              Find a home in Egypt by location, developer, property type and size. Compare the total price, down payment,
              instalment schedule, delivery timing and finishing condition before choosing a project. A lower initial payment
              does not always mean a lower total purchase cost. Check maintenance fees and contract terms as well.
            </p>
            <h3 className="mt-7 text-lg font-bold">Explore areas and developers</h3>
            <nav aria-label="English property research links" className="mt-3 flex flex-wrap gap-3 text-sm">
              <a className="underline underline-offset-4" href="/en/areas/new-cairo">New Cairo</a>
              <a className="underline underline-offset-4" href="/en/areas/mostakbal-city">Mostakbal City and map</a>
              <a className="underline underline-offset-4" href="/en/areas/north-coast">North Coast</a>
              <a className="underline underline-offset-4" href="/en/areas/sheikh-zayed">Sheikh Zayed</a>
              <a className="underline underline-offset-4" href="/en/areas/ain-sokhna">Ain Sokhna</a>
              <a className="underline underline-offset-4" href="/en/areas/new-capital">New Capital</a>
              <a className="underline underline-offset-4" href="/en/developers/mountain-view">Mountain View</a>
              <a className="underline underline-offset-4" href="/en/developers/sodic">SODIC</a>
              <a className="underline underline-offset-4" href="/en/developers/marasem">Marasem</a>
              <a className="underline underline-offset-4" href="/en/developers/orascom">Orascom</a>
              <a className="underline underline-offset-4" href="/en/directory/">Full project directory</a>
            </nav>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="font-bold">Buying for your own home?</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#536056]">
                  Compare available and near-delivery homes, construction and finishing status, nearby services and the
                  developer's delivery record. Choose a shortlist based on the way you plan to use the property.
                </p>
              </div>
              <div>
                <h3 className="font-bold">Evaluating an investment?</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#536056]">
                  Compare total ownership costs and location demand, not promised returns. Rental yield and resale value
                  are scenarios, not guarantees; a listing price is not evidence of a completed market transaction.
                </p>
              </div>
            </div>
            <p className="mt-7 text-sm leading-relaxed text-[#536056]">
              Prices and availability can change. Confirm the exact unit and payment schedule before reserving.
              Review our <a className="underline underline-offset-4" href="/en/guides/new-cairo-property-prices/">New Cairo prices guide</a>,
              {" "}<a className="underline underline-offset-4" href="/methodology">methodology</a>,
              {" "}<a className="underline underline-offset-4" href="/corrections">corrections policy</a> and
              {" "}<a className="underline underline-offset-4" href="/contact">contact details</a>.
            </p>
          </div>
        </section>
      )}
      <Footer />
    </main>
  );
}
