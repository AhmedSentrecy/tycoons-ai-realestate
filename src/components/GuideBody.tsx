import { renderSafeMarkdown } from "../../netlify/functions/_article-render.cjs";

export default function GuideBody({ markdown }: { markdown: string }) {
  return <div className="[&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-bold [&_p]:mt-4 [&_p]:text-lg [&_p]:leading-loose [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:ps-6 [&_li]:leading-loose [&_a]:font-bold [&_a]:text-[#a3854e] [&_a]:underline [&_table]:mt-6 [&_table]:w-full [&_table]:min-w-[480px] [&_table]:border-collapse [&_th]:bg-[#efe7d8] [&_th]:p-4 [&_th]:text-start [&_td]:border-b [&_td]:border-[#e0d3bb] [&_td]:p-4"
    dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(markdown) }} />;
}
