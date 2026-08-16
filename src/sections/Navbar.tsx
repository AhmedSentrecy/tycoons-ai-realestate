import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

const links = [
  { label: "الرئيسية", to: "/", external: false },
  { label: "دليل المشاريع", to: "/ar/", external: true },
  { label: "المطورون", to: "/ar/#developers", external: true },
  { label: "من نحن", to: "/about", external: false },
  { label: "الأسئلة الشائعة", to: "/faq", external: false },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "glass-light shadow-[0_8px_40px_-12px_rgba(20,30,25,0.25)]" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[64px] max-w-6xl items-center justify-between px-5 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <span
            className={`grid h-10 w-10 place-items-center rounded-xl transition-colors ${
              scrolled ? "bg-[#14352a]" : "glass"
            }`}
          >
            <img
              src="/images/logo-badge-gold.png"
              alt="Tycoons Investments"
              width={256}
              height={256}
              decoding="async"
              className="h-6 w-6 object-contain"
            />
          </span>
          <span className="leading-tight">
            <span
              className={`block text-[17px] font-bold tracking-[0.18em] transition-colors ${
                scrolled ? "text-[#182420]" : "text-white"
              }`}
            >
              TYCOONS
            </span>
            <span
              className={`block text-[10px] font-light tracking-[0.42em] transition-colors ${
                scrolled ? "text-[#8a7a58]" : "text-white/60"
              }`}
            >
              INVESTMENTS
            </span>
          </span>
        </Link>

        {/* Links */}
        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((l) =>
            l.external ? (
              <a
                key={l.to}
                href={l.to}
                className={`text-sm font-medium transition-colors hover:text-[#c49b5f] ${
                  scrolled ? "text-[#3d4a43]" : "text-white/85"
                }`}
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.to}
                to={l.to}
                className={`text-sm font-medium transition-colors hover:text-[#c49b5f] ${
                  scrolled ? "text-[#3d4a43]" : "text-white/85"
                }`}
              >
                {l.label}
              </Link>
            )
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <a
            href="/en/"
            hrefLang="en"
            lang="en"
            aria-label="English project directory"
            className={`hidden rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-colors sm:block ${
              scrolled ? "bg-[#ece3d0] text-[#5c4f33]" : "glass text-white/90"
            }`}
          >
            EN
          </a>
          <a
            href="https://wa.me/201200704344"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-full bg-[#1faa59] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(31,170,89,0.6)] transition-transform hover:scale-[1.04]"
          >
            <MessageCircle className="h-4 w-4" />
            واتساب
          </a>
        </div>
      </div>
    </motion.header>
  );
}
