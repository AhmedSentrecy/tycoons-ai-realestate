/* Tycoons site — project detail page + similar units. */
function TCProjectPage({ lang, t, project: p, onBack, onOpenProject, onSeeMore }) {
  const { Badge, WhatsAppButton, Button } = window.TycoonsInvestmentsDesignSystem_8890c9;
  const { formatEGPFull, toArabicDigits } = window.TC;
  const D = window.TYCOONS_DATA;
  const ar = lang === 'ar';

  const areaLabel = D.AREAS[p.area] ? D.AREAS[p.area][ar ? 'ar' : 'en'] : (p.area_raw || p.area || '');
  const typeLabel = D.TYPES[p.unit_type] ? D.TYPES[p.unit_type][ar ? 'ar' : 'en'] : (p.unit_type_raw || p.unit_type || '');
  const title = ar ? p.title_ar : p.title_en;
  const developer = ar ? (D.DEVELOPERS.find(d => d.name === p.developer)?.ar || p.developer) : p.developer;
  const isReady = p.delivery === 'Ready' || (window.TC_HELPERS && window.TC_HELPERS.isReadyDelivery(p.delivery));
  const deliveryLabel = isReady ? t.ready : p.delivery;
  const amenities = (ar ? p.amenities_ar : p.amenities_en) || [];

  const waMsg = ar
    ? `مهتم بـ ${p.compound} — ${title} (${formatEGPFull(p.price, 'ar')}). ممكن تفاصيل أكتر؟`
    : `Interested in ${p.compound} — ${title} (${formatEGPFull(p.price, 'en')}). Could you share more?`;
  const waHref = `https://wa.me/201200704344?text=${encodeURIComponent(waMsg)}`;

  const allSimilar = D.PROJECTS.filter((x) => x.id !== p.id && (x.area === p.area || x.unit_type === p.unit_type))
    .sort((a, b) => (a.area === p.area ? -1 : 1) - (b.area === p.area ? -1 : 1));
  const similar = allSimilar.slice(0, 3);

  const facts = [
    { l: t.fArea, v: p.size_sqm ? (ar ? toArabicDigits(p.size_sqm) : p.size_sqm) + (ar ? ' م²' : ' m²') : '—' },
    { l: t.fBeds, v: p.bedrooms ? (ar ? toArabicDigits(p.bedrooms) : p.bedrooms) : '—' },
    { l: t.fDelivery, v: deliveryLabel },
    { l: t.fDown, v: (ar ? toArabicDigits(p.down_pct) : p.down_pct) + '%' },
    { l: t.fType, v: typeLabel || '—' },
    { l: t.fDeveloper, v: developer },
  ];

  return (
    <div style={{ animation: 'tcFade .25s var(--ease) both' }}>
      <TCBackButton lang={lang} t={t} onBack={onBack} />

      {/* Hero image */}
      <div style={{ position: 'relative', height: 'clamp(220px,38vw,380px)', borderRadius: 'var(--radius-2xl)', overflow: 'hidden' }}>
        <window.TCImageCarousel images={p.gallery && p.gallery.length ? p.gallery : (p.image_url ? [p.image_url] : [])} height={'100%'} ar={ar} alt={`${title} — ${p.compound}`} />
        {(!p.gallery || !p.gallery.length) && !p.image_url && (
          <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--faint)', letterSpacing: '.1em', textTransform: 'uppercase', background: 'rgba(255,255,255,.75)', padding: '6px 12px', borderRadius: 999 }}>{p.compound} — {t.galleryNote}</span>
          </span>
        )}
        <span style={{ position: 'absolute', inset: 0, background: 'var(--img-scrim)', pointerEvents: 'none' }} />
        {p.is_launch && (
          <span style={{ position: 'absolute', insetInlineStart: 16, top: 16, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 999, color: '#fff', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontWeight: 900, fontSize: 12, background: 'linear-gradient(135deg,#d7a748,#b88939 46%,#9c7529)', boxShadow: '0 8px 20px rgba(184,137,57,.5), inset 0 1px 0 rgba(255,255,255,.45)', border: '1px solid rgba(255,255,255,.4)' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', boxShadow: '0 0 9px #fff', animation: 'tcSpark 2.1s var(--ease) infinite' }} />{ar ? p.launch_ar : p.launch_en}</span>
        )}
        <span style={{ position: 'absolute', insetInlineStart: 16, bottom: 16, background: 'rgba(16,24,39,.72)', color: '#fff', border: '1px solid rgba(255,255,255,.18)', borderRadius: 999, padding: '7px 13px', fontSize: 13, fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)', backdropFilter: 'blur(8px)', whiteSpace: 'nowrap' }}>{areaLabel}</span>
      </div>

      {/* Title + price */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 20, alignItems: 'start', marginTop: 24 }} className="tc-proj-head">
        <div>
          <span style={{ color: 'var(--gold)', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontSize: 12.5, fontWeight: 900, letterSpacing: ar ? 0 : '.06em', textTransform: ar ? 'none' : 'uppercase' }}>{typeLabel ? `${typeLabel} · ` : ''}{developer} · {p.compound}</span>
          <h1 style={{ margin: '8px 0 0', color: 'var(--navy)', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(24px,3.2vw,38px)', lineHeight: ar ? 1.2 : 1.05, letterSpacing: ar ? 0 : '-.03em' }}>{title}</h1>
          {/* Key facts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 22 }} className="tc-facts">
            {facts.map((f, i) => (
              <div key={i} style={{ border: '1px solid var(--line)', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', padding: '13px 14px', boxShadow: 'var(--shadow-sm)' }}>
                <span style={{ display: 'block', color: 'var(--faint)', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontSize: 10.5, fontWeight: 900, letterSpacing: ar ? 0 : '.06em', textTransform: ar ? 'none' : 'uppercase', marginBottom: 5 }}>{f.l}</span>
                <strong style={{ color: 'var(--navy)', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontSize: 15 }}>{f.v}</strong>
              </div>
            ))}
          </div>
          {/* Amenities */}
          {amenities.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <span style={{ display: 'block', color: 'var(--navy)', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontWeight: 900, fontSize: 14, marginBottom: 10 }}>{t.amenities}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {amenities.map((a, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: '1px solid var(--line-gold)', background: 'var(--surface-warm)', color: '#7f6c49', borderRadius: 999, padding: '8px 14px', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)', fontSize: 13, fontWeight: 700 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)' }} />{a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky price card */}
        <div style={{ position: 'sticky', top: 88, display: 'flex', flexDirection: 'column', gap: 14, padding: 'clamp(18px,3vw,24px)', borderRadius: 'var(--radius-xl)', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Badge tone={p.status === 'available' ? 'available' : p.status === 'sold_out' ? 'soldout' : 'gold'} style={ar ? { fontFamily: 'var(--font-arabic)', letterSpacing: 0, textTransform: 'none' } : null}>{t.status[p.status]}</Badge>
          </div>
          <div>
            <span style={{ display: 'block', color: '#7f6c49', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontWeight: 900, fontSize: 11.5, letterSpacing: ar ? 0 : '.06em', textTransform: ar ? 'none' : 'uppercase', marginBottom: 6 }}>{t.startPrice}</span>
            <strong style={{ display: 'block', color: 'var(--navy)', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontSize: 'clamp(24px,3.4vw,32px)', lineHeight: 1 }}>{formatEGPFull(p.price, lang)}</strong>
          </div>
          <WhatsAppButton href={waHref} style={{ width: '100%', minHeight: 50, fontSize: 15 }}>{t.askWa}</WhatsAppButton>
        </div>
      </div>

      {/* Installment calculator seeded with this unit */}
      <div style={{ marginTop: 34 }}>
        <span style={{ display: 'block', color: 'var(--navy)', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontWeight: 800, fontSize: 20, marginBottom: 16 }}>{t.calcTitle}</span>
        <TCCalculator lang={lang} t={t} initialPrice={p.price} initialDown={p.down_pct} initialYears={p.payment_years} hideHead />
      </div>

      {/* Similar units */}
      {similar.length > 0 && (
        <section style={{ margin: '40px 0 10px' }}>
          <TCSectionHead eyebrow={t.similar} title={t.similar} sub={t.similarSub} lang={lang} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
            {similar.map((s) => <TCResultCard key={s.id} project={s} lang={lang} variant="big" onOpen={onOpenProject} />)}
          </div>
          {allSimilar.length > 3 && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <TCSeeMoreButton lang={lang} t={t} onClick={() => onSeeMore('similar')} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
window.TCProjectPage = TCProjectPage;
