import { OFFER_LABELS_AR, untilAr, type ProjectOffer } from "@/lib/projectOffers";

/**
 * «أحدث العروض والتحديثات في <project>»: the project's live offers / launches / price changes, at the top
 * of the article. Same words and classes as the pre-rendered page (netlify/functions/_project-offers.cjs).
 */
export default function ProjectOffersSection({ offers, projectName }: { offers: ProjectOffer[]; projectName: string }) {
  if (!offers.length) return null;
  return (
    <section className="mb-12" id="offers">
      <h2 className="text-3xl font-extrabold">أحدث العروض والتحديثات في {projectName}</h2>
      <p className="mt-3 text-sm text-[#556070]">من المطور مباشرة — اسألنا عن الوحدات اللي عليها العرض قبل ما يخلص.</p>
      <ul className="mt-2">
        {offers.map((offer) => (
          <li key={`${offer.kind}-${offer.created_at}`} className="mt-4 rounded-2xl border border-[#f0d9a8] bg-[#fffaf1] p-5">
            <p className="font-extrabold">
              <span className="me-2 rounded-full bg-[#b47c17] px-3 py-1 text-xs text-white">{OFFER_LABELS_AR[offer.kind] ?? OFFER_LABELS_AR.other}</span>
              {offer.title_ar}
            </p>
            {offer.body_ar && <p className="mt-3 leading-loose text-[#556070]">{offer.body_ar}</p>}
            {untilAr(offer.valid_until) && <p className="mt-2 text-sm text-[#8a6a2f]">العرض ساري لحد {untilAr(offer.valid_until)}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Small badge for project cards: «🔥 عرض: …» (the newest live offer of the project). */
export function ProjectOfferBadge({ offers }: { offers: ProjectOffer[] }) {
  const offer = offers[0];
  if (!offer) return null;
  return (
    <p className="mt-2 line-clamp-2 rounded-xl bg-[#fffaf1] px-3 py-2 text-xs font-bold text-[#8a6a2f]">
      🔥 {OFFER_LABELS_AR[offer.kind] ?? OFFER_LABELS_AR.other}: {offer.title_ar}
    </p>
  );
}
