/* Tycoons site — result card. Composes DS Badge / Tag / WhatsAppButton / Button.
   Two densities via `variant`: 'big' (large photo) and 'compact'.
   Used both inside the conversation rail and on the project page. */

// Small swipeable image carousel — used by both the card and the project
// hero. Falls back to a single striped placeholder when there's no photo.
function TCImageCarousel({ images, height, ar }) {
  const [idx, setIdx] = React.useState(0);
  const imgs = images && images.length ? images : [];
  const has = imgs.length > 0;
  const many = imgs.length > 1;
  function go(dir) { return (e) => { e.stopPropagation(); setIdx((i) => (i + dir + imgs.length) % imgs.length); }; }
  return (
    <div style={{ position: 'relative', height, overflow: 'hidden',
      background: has ? '#eef1f5' : 'repeating-linear-gradient(135deg,#edf0f5,#edf0f5 11px,#f5eede 11px,#f5eede 22px)' }}>
      {has ? (
        <img src={imgs[idx]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : null}
      {many && (
        <>
          <button type="button" onClick={go(-1)} aria-label="prev" style={{
            position: 'absolute', insetInlineStart: 6, top: '50%', transform: 'translateY(-50%)', zIndex: 2,
            width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'rgba(16,24,39,.5)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13,
          }}>‹</button>
          <button type="button" onClick={go(1)} aria-label="next" style={{
            position: 'absolute', insetInlineEnd: 6, top: '50%', transform: 'translateY(-50%)', zIndex: 2,
            width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'rgba(16,24,39,.5)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13,
          }}>›</button>
          <div style={{ position: 'absolute', bottom: 8, insetInlineStart: 0, insetInlineEnd: 0, zIndex: 2, display: 'flex', justifyContent: 'center', gap: 5 }}>
            {imgs.map((_, i) => (
              <span key={i} style={{ width: i === idx ? 14 : 5, height: 5, borderRadius: 999, background: i === idx ? '#fff' : 'rgba(255,255,255,.5)', transition: 'width .15s var(--ease)' }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
window.TCImageCarousel = TCImageCarousel;

function TCResultCard({ project: p, lang, variant = 'big', onOpen, style }) {
  const { Badge, Tag, WhatsAppButton, Button } = window.TycoonsInvestmentsDesignSystem_8890c9;
  const { COPY, formatEGP } = window.TC;
  const t = COPY[lang];
  const D = window.TYCOONS_DATA;
  const ar = lang === 'ar';
  const [hover, setHover] = React.useState(false);

  const areaLabel = D.AREAS[p.area] ? D.AREAS[p.area][ar ? 'ar' : 'en'] : (p.area_raw || p.area || '');
  const typeLabel = D.TYPES[p.unit_type] ? D.TYPES[p.unit_type][ar ? 'ar' : 'en'] : (p.unit_type_raw || p.unit_type || '');
  const title = ar ? p.title_ar : p.title_en;
  const developer = ar ? (D.DEVELOPERS.find(d => d.name === p.developer)?.ar || p.developer) : p.developer;
  const isReady = p.delivery === 'Ready' || (window.TC_HELPERS && window.TC_HELPERS.isReadyDelivery(p.delivery));
  const deliveryLabel = isReady ? t.ready : p.delivery;
  const imgH = variant === 'big' ? 168 : 120;

  const waMsg = ar
    ? `مهتم بـ ${p.compound} — ${title} (${formatEGP(p.price, 'ar')}). ممكن تفاصيل أكتر؟`
    : `Interested in ${p.compound} — ${title} (${formatEGP(p.price, 'en')}). Could you share more details?`;
  const waHref = `https://wa.me/201200704344?text=${encodeURIComponent(waMsg)}`;

  const metrics = [
    { label: t.fBeds, value: p.bedrooms ? (ar ? window.TC.toArabicDigits(p.bedrooms) : String(p.bedrooms)) : '—' },
    { label: t.fArea, value: p.size_sqm ? (ar ? window.TC.toArabicDigits(p.size_sqm) : p.size_sqm) + (ar ? ' م²' : ' m²') : '—' },
    { label: t.fDelivery, value: deliveryLabel },
  ];

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column',
        background: 'var(--surface)', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        border: `1px solid ${hover ? 'var(--line-strong)' : 'var(--line)'}`,
        boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: hover ? 'translateY(-3px)' : 'none',
        transition: 'transform .18s var(--ease), box-shadow .18s var(--ease), border-color .18s var(--ease)',
        ...style,
      }}
    >
      {/* Image */}
      <div role="button" tabIndex={0} onClick={() => onOpen && onOpen(p)}
        onKeyDown={(e) => { if (e.key === 'Enter') onOpen && onOpen(p); }}
        style={{ position: 'relative', height: imgH, cursor: 'pointer', width: '100%', overflow: 'hidden' }}>
        <TCImageCarousel images={p.gallery && p.gallery.length ? p.gallery : (p.image_url ? [p.image_url] : [])} height={imgH} ar={ar} />
        {(!p.gallery || !p.gallery.length) && !p.image_url && (
          <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)', letterSpacing: '.08em', textTransform: 'uppercase', background: 'rgba(255,255,255,.72)', padding: '4px 9px', borderRadius: 999 }}>{p.compound}</span>
          </span>
        )}
        <span style={{ position: 'absolute', inset: 0, background: 'var(--img-scrim)', pointerEvents: 'none' }} />
        {p.is_launch && (
          <span style={{
            position: 'absolute', insetInlineStart: 10, top: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 11px', borderRadius: 999, color: '#fff',
            fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontWeight: 900, fontSize: 11, whiteSpace: 'nowrap',
            background: 'linear-gradient(135deg,#d7a748,#b88939 46%,#9c7529)',
            boxShadow: '0 6px 16px rgba(184,137,57,.45), inset 0 1px 0 rgba(255,255,255,.4)',
            border: '1px solid rgba(255,255,255,.4)',
          }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', boxShadow: '0 0 8px #fff' }} />{ar ? p.launch_ar : p.launch_en}</span>
        )}
        <span style={{
          position: 'absolute', insetInlineStart: 10, bottom: 10, background: 'rgba(16,24,39,.72)', color: '#fff',
          border: '1px solid rgba(255,255,255,.18)', borderRadius: 999, padding: '5px 10px', fontSize: 11.5,
          fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)', backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
        }}>{areaLabel}</span>
      </div>

      {/* Body */}
      <div style={{ padding: variant === 'big' ? 15 : 13, display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--gold)', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontSize: 11.5, fontWeight: 900, letterSpacing: ar ? 0 : '.06em', textTransform: ar ? 'none' : 'uppercase' }}>{typeLabel ? `${typeLabel} · ` : ''}{developer}</span>
          <Badge tone={p.status === 'available' ? 'available' : p.status === 'sold_out' ? 'soldout' : 'gold'} style={ar ? { fontFamily: 'var(--font-arabic)', letterSpacing: 0, textTransform: 'none' } : null}>{t.status[p.status]}</Badge>
        </div>

        <button type="button" onClick={() => onOpen && onOpen(p)} style={{
          textAlign: ar ? 'right' : 'left', border: 'none', background: 'none', padding: 0, cursor: 'pointer',
          color: 'var(--navy)', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontWeight: 700,
          fontSize: variant === 'big' ? 17 : 15.5, lineHeight: ar ? 1.35 : 1.22, letterSpacing: ar ? 0 : '-.02em',
        }}>{title}</button>

        {/* price row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-warm)', border: '1px solid var(--line-gold)' }}>
          <span style={{ color: '#7f6c49', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontWeight: 900, fontSize: 10.5, letterSpacing: ar ? 0 : '.06em', textTransform: ar ? 'none' : 'uppercase' }}>{t.startPrice}</span>
          <strong style={{ color: 'var(--navy)', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontSize: variant === 'big' ? 16 : 14.5, whiteSpace: 'nowrap' }}>{formatEGP(p.price, lang)}</strong>
        </div>

        {/* metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7 }}>
          {metrics.map((m, i) => (
            <div key={i} style={{ border: '1px solid var(--line)', background: 'var(--surface-soft)', borderRadius: 12, padding: '7px 8px', minWidth: 0 }}>
              <span style={{ display: 'block', color: 'var(--faint)', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontSize: 10, fontWeight: 900, letterSpacing: ar ? 0 : '.05em', textTransform: ar ? 'none' : 'uppercase', marginBottom: 3 }}>{m.label}</span>
              <strong style={{ color: 'var(--navy)', display: 'block', fontSize: 12, fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.value}</strong>
            </div>
          ))}
        </div>

        {/* actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          <Button variant="secondary" size="sm" onClick={() => onOpen && onOpen(p)} style={{ flex: 1, fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)' }}>{t.viewProject}</Button>
          <WhatsAppButton href={waHref} style={{ flex: '0 0 auto', minHeight: 36, padding: '0 14px', fontSize: 13 }}>{t.wa}</WhatsAppButton>
        </div>
      </div>
    </div>
  );
}
window.TCResultCard = TCResultCard;
