import Navbar from "@/sections/Navbar";
import Hero from "@/sections/Hero";
import Projects from "@/sections/Projects";
import Regions from "@/sections/Regions";
import Developers from "@/sections/Developers";
import WhyUs from "@/sections/WhyUs";
import Calculator from "@/sections/Calculator";
import Footer from "@/sections/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f2ea]">
      <Navbar />
      <Hero />
      <Projects />
      <Regions />
      <Developers />
      <WhyUs />
      <Calculator />
      <Footer />
    </main>
  );
}
