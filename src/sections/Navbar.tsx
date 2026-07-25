import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion, useScroll, useSpring } from "framer-motion";
import { MessageCircle } from "lucide-react";

const links = [
  { label: "الرئيسية", to: "/" },
  { label: "المناطق", to: "/regions/sahel" },
  { label: "من نحن", to: "/about" },
  { label: "الأسئلة الشائعة", to: "/faq" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Scroll progress */}
      <motion.div
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-right bg-gradient-to-l from-[#d9b87c] to-[#c49b5f]"
      />

      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled
            ? "glass-dark shadow-[0_10px_50px_-12px_rgba(0,0,0,0.6)]"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">
          {/* Logo */}
          <Link to="/" className="group flex items-center gap-3">
            <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-[#d9b87c] to-[#c49b5f] text-lg font-black text-[#231a0c] transition-transform duration-300 group-hover:rotate-6">
              T
            </span>
            <span className="leading-tight">
              <span className="block text-[17px] font-bold tracking-[0.18em] text-white">
                TYCOONS
              </span>
              <span className="block text-[10px] font-light tracking-[0.42em] text-[#d9b87c]/80">
                INVESTMENTS
              </span>
            </span>
          </Link>

          {/* Links */}
          <nav className="hidden items-center gap-8 lg:flex">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="group relative text-sm font-medium text-white/80 transition-colors hover:text-white"
              >
                {l.label}
                <span className="absolute -bottom-1.5 right-0 h-[2px] w-0 rounded-full bg-[#c49b5f] transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button className="hidden rounded-full border border-white/15 px-4 py-2 text-xs font-semibold tracking-wide text-white/85 transition-colors hover:border-[#c49b5f]/60 hover:text-white sm:block">
              EN
            </button>
            <a
              href="https://wa.me/201200704344"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-full bg-[#c49b5f] px-5 py-2.5 text-sm font-bold text-[#231a0c] shadow-[0_12px_35px_-10px_rgba(224,112,60,0.7)] transition-all hover:scale-[1.05] hover:bg-[#d9b87c]"
            >
              <MessageCircle className="h-4 w-4" />
              واتساب
            </a>
          </div>
        </div>
      </motion.header>
    </>
  );
}
