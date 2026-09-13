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
      <Footer />
    </main>
  );
}
