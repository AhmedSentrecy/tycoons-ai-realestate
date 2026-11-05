// «في سطور»: the project facts box under the H1. Same facts and classes as the pre-rendered page
// (netlify/functions/_project-facts.cjs builds both), so the page reads the same before and after JS.
export interface ProjectFact { label: string; value: string; href?: string; datetime?: string }

export default function ProjectFacts({ facts, title }: { facts: ProjectFact[]; title: string }) {
  if (facts.length < 2) return null;
  return (
    <section className="mt-8 max-w-4xl rounded-2xl border border-white/15 bg-white/5 p-5" aria-label={title}>
      <h2 className="text-sm font-bold text-[#d9b87c]">{title}</h2>
      <dl className="mt-3 grid gap-4 sm:grid-cols-3">
        {facts.map((fact) => {
          const value = fact.datetime ? <time dateTime={fact.datetime}>{fact.value}</time> : fact.value;
          return (
            <div key={fact.label}>
              <dt className="text-xs text-white/55">{fact.label}</dt>
              <dd className="mt-1 font-bold text-white">
                {fact.href ? <a className="underline decoration-white/30 underline-offset-4 hover:text-[#ecd9ae]" href={fact.href}>{value}</a> : value}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
