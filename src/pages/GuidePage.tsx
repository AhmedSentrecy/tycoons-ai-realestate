import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { ArrowLeft, BedDouble, Building2, MapPin, Maximize2, MessageCircle } from "lucide-react";
import Navbar from "@/sections/Navbar";
import Footer from "@/sections/Footer";
import FloatingContact from "@/components/FloatingContact";
import { useInventory } from "@/lib/inventory";
import { areaFor } from "@/lib/unitContent";
import { arabicField } from "@/lib/arabicFields";
import {
  WHATSAPP_NUMBER, guidePath, loadGuide, loadGuideProject, loadProjectGuides, publicMarkdown,
  type GuideLink, type GuideProject, type PublishedGuide,
} from "@/lib/editorialGuides";

import GuideBody from "@/components/GuideBody";
import { unitPath } from "@/lib/unitUrl";

const SITE_URL = "https://tycoons-inv.com";
const formatPrice = (value: number) => new Intl.NumberFormat("en-US").format(value);

function setMeta(selector: string, attribute: "content" | "href", value: string) {
  let element = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!element) {
    element = selector.startsWith("link") ? document.createElement("link") : document.createElement("meta");
    if (selector.includes('rel="canonical"')) element.setAttribute("rel", "canonical");
    const name = selector.match(/name="([^"]+)"/)?.[1];
    if (name) element.setAttribute("name", name);
    const property = selector.match(/property="([^"]+)"/)?.[1];
    if (property) element.setAttribute("property", property);
    document.head.appendChild(element);
  }
  element.setAttribute(attribute, value);
}

export default function GuidePage() {
  const { slug = "" } = useParams();
  const { pathname } = useLocation();
  const language: "ar" | "en" = pathname.startsWith("/en/") ? "en" : "ar";
  const ar = language === "ar";
  const t = (arabic: string, english: string) => ar ? arabic : english;
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = ar ? "rtl" : "ltr";
  }, [language, ar]);
  const [guide, setGuide] = useState<PublishedGuide | null>(null);
  const [project, setProject] = useState<GuideProject | null>(null);
  const [related, setRelated] = useState<GuideLink[]>([]);
  // The newest guide about a project is shown in full on the project page; that page is its canonical.
  const [embeddedInProject, setEmbeddedInProject] = useState(false);
  // Status belongs to the slug it was loaded for; a new slug reads as loading.
  const [loaded, setLoaded] = useState<{ key: string; status: "ready" | "missing" }>({ key: "", status: "missing" });
  const key = `${language}:${slug}`;
  const state = loaded.key === key ? loaded.status : "loading";
  const { units } = useInventory();

  useEffect(() => {
    let active = true;
    const setState = (status: "ready" | "missing") => setLoaded({ key, status });
    setEmbeddedInProject(false);
    void (async () => {
      try {
        const next = await loadGuide(slug, language);
        if (!active) return;
        if (!next) { setState("missing"); return; }
        setGuide(next);
        if (next.project_id) {
          const [row, guides] = await Promise.all([loadGuideProject(next.project_id), loadProjectGuides(next.project_id, language)]);
          if (!active) return;
          setProject(row);
          setRelated(guides.filter((item) => item.slug !== next.slug));
          setEmbeddedInProject(Boolean(row?.slug) && guides[0]?.slug === next.slug);
        }
        setState("ready");
      } catch {
        if (active) setState("missing");
      }
    })();
    return () => { active = false; };
  }, [slug, language, key]);

  const projectUnits = useMemo(() => project
    ? units.filter((unit) => unit.project_slug === project.slug).sort((a, b) => a.starting_price - b.starting_price)
    : [], [project, units]);
  const minPrice = projectUnits.find((unit) => unit.starting_price > 0)?.starting_price ?? 0;
  const area = areaFor(project?.location || guide?.area_name || "");
  const path = guide ? guidePath(guide) : "";

  useEffect(() => {
    if (!guide) return;
    const title = guide.meta_title || `${guide.title} | Tycoons Investments`;
    document.title = title;
    setMeta('meta[name="description"]', "content", guide.meta_description || guide.excerpt);
    const canonicalPath = embeddedInProject && project?.slug ? `${language === "en" ? "/en" : ""}/projects/${project.slug}` : path;
    setMeta('link[rel="canonical"]', "href", `${SITE_URL}${canonicalPath}`);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", guide.meta_description || guide.excerpt);
    setMeta('meta[property="og:url"]', "content", `${SITE_URL}${path}`);
    setMeta('meta[property="og:locale"]', "content", language === "en" ? "en_US" : "ar_EG");
    window.scrollTo(0, 0);
  }, [guide, path, language, embeddedInProject, project]);

  if (state === "loading") {
    return <main className="grid min-h-screen place-items-center bg-[#f7f2ea]"><p className="font-bold text-[#1b2420]">{t('جاري تحميل المقال…', 'Loading article…')}</p></main>;
  }
  if (state === "missing" || !guide) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f2ea] px-5 text-center">
        <div><p className="text-xl font-bold text-[#1b2420]">{t('المقال ده مش متاح', 'This article is not available')}</p><Link to="/" className="mt-4 inline-block text-[#a3854e] underline">{t('ارجع للرئيسية', 'Back to home')}</Link></div>
      </main>
    );
  }

  const takeaways = (guide.key_takeaways ?? []).filter(Boolean);
  const faq = (guide.faq ?? []).filter((item) => item.question && item.answer);
  const sources = (guide.source_refs ?? []).filter((ref) => ref.type === "web" && /^https:\/\//.test(ref.url) && ref.label);
  const image = guide.hero_image_url || project?.image_url || "";
  const projectHref = project ? `${ar ? "" : "/en"}/projects/${project.slug}` : "";
  const message = ar ? `السلام عليكم Tycoons،\nقريت مقال: ${guide.title}\n${project ? `ومهتم بمشروع ${project.name}.\n` : ""}ممكن تبعتولي أحدث الأسعار والوحدات المتاحة؟\n\nالصفحة: ${SITE_URL}${path}` : `Hello Tycoons, I read: ${guide.title}. Please share the latest availability and payment plans.\n\nPage: ${SITE_URL}${path}`;
  const crumbs = [
    { name: t("الرئيسية", "Home"), href: ar ? "/" : "/en/" },
    ...(area.indexable ? [{ name: ar ? area.ar : area.en, href: `/${language}/areas/${area.slug}` }] : []),
    ...(project ? [{ name: project.name, href: projectHref }] : []),
  ];

  return (
    <main lang={language} dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-[#f7f2ea] pb-24 text-[#1b2420] md:pb-0">
      <Navbar />

      <section className="bg-[#0d1f18] px-5 pb-12 pt-32 text-white lg:px-8">
        <div className="mx-auto max-w-4xl">
          <nav aria-label={t("مسار الصفحة", "Breadcrumb")} className="flex flex-wrap items-center gap-2 text-sm text-white/65">
            {crumbs.map((crumb) => (
              <span key={crumb.href} className="inline-flex items-center gap-2">
                <a href={crumb.href} className="hover:text-white">{crumb.name}</a>
                <span aria-hidden="true">›</span>
              </span>
            ))}
            <span className="text-white/90">{guide.title}</span>
          </nav>
          <p className="mt-8 text-sm font-bold text-[#d9b87c]">{t('أسئلة المشترين', 'Buyer questions')}</p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">{guide.title}</h1>
          <p className="mt-5 text-lg font-light text-white/75">{guide.excerpt}</p>
        </div>
      </section>

      {project && (
        <section className="mx-auto -mt-6 max-w-4xl px-5 lg:px-8">
          <div className="grid gap-5 overflow-hidden rounded-3xl border border-[#e0d3bb] bg-white p-4 shadow-lg sm:grid-cols-[180px_1fr_auto] sm:items-center">
            {image && <img src={image} alt={project.name} className="h-40 w-full rounded-2xl object-cover sm:h-28" loading="eager" />}
            <div>
              <p className="text-xs font-bold text-[#a3854e]">{t('المقال ده عن', 'About this project')}</p>
              <a href={projectHref} className="mt-1 block text-2xl font-extrabold hover:text-[#a3854e]">{project.name}</a>
              <p className="mt-2 flex flex-wrap gap-4 text-sm text-[#5c6a62]">
                <span className="inline-flex items-center gap-1"><Building2 className="h-4 w-4" />{project.developer}</span>
                <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{area.indexable ? (ar ? area.ar : area.en) : project.location}</span>
              </p>
              {minPrice > 0 && <p className="mt-2 font-bold">{t("الأسعار تبدأ من", "Prices from")} <span className="text-[#a3854e]">{formatPrice(minPrice)} {t("جنيه", "EGP")}</span></p>}
            </div>
            <div className="flex flex-col gap-2">
              <a href={projectHref} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0d1f18] px-5 py-3 text-sm font-bold text-white">
                {t("شوف الوحدات المتاحة", "View available units")} {projectUnits.length > 0 && `(${projectUnits.length})`}<ArrowLeft className="h-4 w-4" />
              </a>
              <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1faa59] px-5 py-3 text-sm font-bold text-white">
                <MessageCircle className="h-4 w-4" />{t("اسأل على واتساب", "Ask on WhatsApp")}
              </a>
            </div>
          </div>
        </section>
      )}

      <article className="mx-auto max-w-4xl px-5 py-12 lg:px-8">
        {guide.hero_image_url && !project && <img src={guide.hero_image_url} alt={guide.title} className="mb-8 w-full rounded-3xl object-cover" />}
        {takeaways.length > 0 && (
          <section id="key-takeaways" className="rounded-3xl border border-[#e0d3bb] bg-[#efe7d8] p-6">
            <h2 className="text-xl font-extrabold">{t('الخلاصة', 'Key takeaways')}</h2>
            <ul className="mt-4 list-disc space-y-2 ps-6 leading-loose">{takeaways.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        )}

        <GuideBody markdown={publicMarkdown(guide.body_markdown, ar)} />

        {projectUnits.length > 0 && project && (
          <section className="mt-14" aria-labelledby="guide-units">
            <h2 id="guide-units" className="text-2xl font-extrabold">{t("وحدات متاحة دلوقتي في", "Available units at")} {project.name}</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {projectUnits.slice(0, 4).map((unit) => (
                <a key={unit.id} href={unitPath(unit)} className="group overflow-hidden rounded-3xl border border-[#e0d3bb] bg-white transition hover:shadow-lg">
                  {unit.images[0] && <img src={unit.images[0]} alt={`${ar ? arabicField(unit.unit_type) : unit.unit_type} في ${project.name}`} className="h-40 w-full object-cover" loading="lazy" />}
                  <div className="p-5">
                    <p className="text-lg font-extrabold group-hover:text-[#a3854e]">{ar ? arabicField(unit.unit_type) : unit.unit_type}</p>
                    <p className="mt-2 flex flex-wrap gap-4 text-sm text-[#5c6a62]">
                      {unit.area_sqm ? <span className="inline-flex items-center gap-1"><Maximize2 className="h-4 w-4" />{unit.area_sqm} {t("م²", "m²")}</span> : null}
                      {unit.bedrooms_text && <span className="inline-flex items-center gap-1"><BedDouble className="h-4 w-4" />{ar ? arabicField(unit.bedrooms_text) : unit.bedrooms_text}</span>}
                    </p>
                    {unit.starting_price > 0 && <p className="mt-3 font-bold">{formatPrice(unit.starting_price)} {t("جنيه", "EGP")}</p>}
                  </div>
                </a>
              ))}
            </div>
            {projectUnits.length > 4 && <a href={projectHref} className="mt-5 inline-flex items-center gap-2 font-bold text-[#a3854e] underline underline-offset-4">{t("شوف كل الوحدات", "View all units")} ({projectUnits.length})<ArrowLeft className="h-4 w-4" /></a>}
          </section>
        )}

        {faq.length > 0 && (
          <section className="mt-14" aria-labelledby="guide-faq">
            <h2 id="guide-faq" className="text-2xl font-extrabold">{t('أسئلة شائعة', 'Frequently asked questions')}</h2>
            <div className="mt-6 space-y-4">
              {faq.map((item) => (
                <details key={item.question} className="rounded-2xl border border-[#e7ddc8] bg-white/70 p-5">
                  <summary className="cursor-pointer list-none font-bold">{item.question}</summary>
                  <p className="mt-3 font-light leading-relaxed text-[#5c6a62]">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {related.length > 0 && project && (
          <section className="mt-14" aria-labelledby="guide-related">
            <h2 id="guide-related" className="text-2xl font-extrabold">{t("أسئلة تانية عن", "More about")} {project.name}</h2>
            <ul className="mt-5 space-y-3">
              {related.map((item) => (
                <li key={item.slug}><a href={guidePath(item)} className="block rounded-2xl border border-[#e0d3bb] bg-white p-4 font-bold hover:text-[#a3854e]">{item.title}</a></li>
              ))}
            </ul>
          </section>
        )}

        {sources.length > 0 && (
          <section className="mt-14" aria-labelledby="guide-sources">
            <h2 id="guide-sources" className="text-xl font-extrabold">{t('المصادر', 'Sources')}</h2>
            <ul className="mt-4 list-disc space-y-2 ps-6 text-sm">
              {sources.map((ref) => <li key={ref.url}>{ref.label}</li>)}
            </ul>
          </section>
        )}

        <section className="mt-14 rounded-3xl bg-[#0d1f18] p-8 text-center text-white">
          <h2 className="text-2xl font-extrabold">{t('عايز تعرف الأسعار والمتاح النهارده؟', 'Looking for current prices and availability?')}</h2>
          <p className="mt-3 font-light text-white/70">{t('الأسعار والمتاح بيتغيروا، وفريق Tycoons بيأكدلك آخر تحديث قبل أي قرار.', 'Prices and availability can change. The Tycoons team confirms the latest unit details before you decide.')}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {project && <a href={projectHref} className="rounded-full border border-white/40 px-6 py-3 font-bold">{t("صفحة", "Explore")} {project.name}</a>}
            <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" className="rounded-full bg-[#1faa59] px-6 py-3 font-bold">{t('تواصل على واتساب', 'Contact us on WhatsApp')}</a>
          </div>
        </section>
      </article>

      <Footer />
      <FloatingContact message={message} />
    </main>
  );
}
