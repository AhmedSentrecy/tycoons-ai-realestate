import type { NumbersFaqItem } from "../../netlify/functions/_numbers-faq.cjs";

const dayAr = (value: string) =>
  /^\d{4}-\d{2}-\d{2}/.test(value) ? new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "";

/** «أسئلة بالأرقام عن <project>» — same markup as the pre-rendered page, so crawlers see it before and after JavaScript. */
export default function ProjectNumbersSection({ items, projectName, updated }: { items: NumbersFaqItem[]; projectName: string; updated: string }) {
  if (!items.length) return null;
  const when = dayAr(updated);
  return (
    <section className="mb-12" id="numbers">
      <h2 className="text-3xl font-extrabold">أسئلة بالأرقام عن {projectName}</h2>
      {when && <p className="mt-3 text-sm text-[#556070]">آخر تحديث: {when}. الأرقام بتتأكد وقت الحجز.</p>}
      {items.map((item) => (
        <div key={item.question} className="mt-4 rounded-2xl border border-[#e3e9f2] bg-white/80 p-5">
          <h3 className="font-extrabold">{item.question}</h3>
          <p className="mt-3 leading-loose text-[#556070]">{item.answer}</p>
        </div>
      ))}
    </section>
  );
}
