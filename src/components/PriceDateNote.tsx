import { priceDateNoteHtml } from "../../netlify/functions/_article-render.cjs";

/**
 * "Prices in this guide are from <review date>" with a link to the live unit list. Same HTML as
 * the static and server pages (audit SEO-09), rendered only when the guide quotes prices.
 */
export default function PriceDateNote({ markdown, reviewedAt, ar = true, unitsHref = "" }: {
  markdown: string; reviewedAt?: string | null; ar?: boolean; unitsHref?: string;
}) {
  const html = priceDateNoteHtml({ markdown, reviewedAt, ar, unitsHref });
  if (!html) return null;
  return <div className="mt-6 rounded-2xl border border-[#e7ddc8] bg-[#fffaf1] p-4 text-[#5c6a62] [&_a]:font-bold [&_a]:text-[#a3854e] [&_a]:underline" dangerouslySetInnerHTML={{ __html: html }} />;
}
