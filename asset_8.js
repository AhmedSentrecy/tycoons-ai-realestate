/* Tycoons site — homepage sections below the concierge.
   Each is exported to window and composed by App so the New-Launch
   section's position/layout can be driven by a tweak. */

function TCSectionHead({ eyebrow, title, sub, lang, onDark }) {
  const { Eyebrow } = window.TycoonsInvestmentsDesignSystem_8890c9;
  const ar = lang === 'ar';
  return (
    <div style={{ marginBottom: 22, maxWidth: 640 }}>
      <Eyebrow style={ar ? { letterSpacing: 0, fontFamily: 'var(--font-arabic)' } : null}>{eyebrow}</Eyebrow>
      <h2 style={{ margin: '12px 0 0', color: onDark ? '#fff' : 'var(--navy)', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(24px,3vw,34px)', lineHeight: ar ? 1.2 : 1.06, letterSpacing: ar ? 0 : '-.025em' }}>{title}</h2>
      {sub && <p style={{ margin: '10px 0 0', color: onDark ? 'rgba(255,255,255,.68)' : 'var(--muted)', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)', fontSize: 16, lineHeight: 1.55 }}>{sub}</p>}
    </div>
  );
}

/* mobile-viewport hook — See-more caps apply on phones only */
function useTCMobile() {
  const [m, setM] = React.useState(typeof window !== 'undefined' && window.matchMedia('(max-width:720px)').matches);
  React.useEffect(() => {
    const mq = window.matchMedia('(max-width:720px)');
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

/* ---------- reusable "see more" button (navigates to a listing page) ---------- */
function TCSeeMoreButton({ lang, t, onClick, dark }) {
  const ar = lang === 'ar';
  return (
    <button type="button" onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, margin: '20px auto 0', border: dark ? '1px solid rgba(255,255,255,.28)' : '1px solid var(--line-strong)', background: dark ? 'rgba(255,255,255,.06)' : 'var(--surface)', color: dark ? '#fff' : 'var(--navy)', borderRadius: 999, padding: '12px 22px', cursor: 'pointer', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontSize: 14, fontWeight: 800, boxShadow: dark ? 'none' : 'var(--shadow-sm)', transition: 'border-color .16s var(--ease), color .16s var(--ease)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,.28)' : 'var(--line-strong)'; e.currentTarget.style.color = dark ? '#fff' : 'var(--navy)'; }}>
      {t.seeMore}
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" style={ar ? { transform: 'scaleX(-1)' } : null}><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}

/* ---------- reusable back button (restores scroll via App) ---------- */
function TCBackButton({ lang, t, onBack }) {
  const ar = lang === 'ar';
  return (
    <button type="button" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, margin: '18px 0 16px', border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--navy)', borderRadius: 999, padding: '9px 16px', cursor: 'pointer', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontWeight: 800, fontSize: 13.5, boxShadow: 'var(--shadow-sm)' }}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" style={ar ? null : { transform: 'scaleX(-1)' }}><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      {t.back}
    </button>
  );
}

/* ---------- New Launches (navy band) ---------- */
function TCLaunches({ lang, t, layout, onOpenProject, onSeeMore }) {
  const ar = lang === 'ar';
  const launches = window.TYCOONS_DATA.PROJECTS.filter((p) => p.is_launch)
    .sort((a, b) => (b._recency_ts || 0) - (a._recency_ts || 0));
  const spotlight = layout !== 'grid';
  const feat = launches[0];
  const restCap = spotlight ? 2 : 3;
  const rest = launches.slice(1, 1 + restCap);
  const hasMore = launches.length > 1 + restCap;

  return (
    <section style={{ position: 'relative', margin: '46px 0', padding: 'clamp(26px,4vw,40px)', borderRadius: 'var(--radius-2xl)', overflow: 'hidden', background: 'var(--navy)', backgroundImage: 'radial-gradient(120% 130% at 88% -12%, rgba(184,137,57,.34), transparent 48%), radial-gradient(90% 120% at 6% 120%, rgba(184,137,57,.14), transparent 46%)', color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ maxWidth: 560 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,77,64,.16)', border: '1px solid rgba(255,120,110,.5)', color: '#ff9b91', borderRadius: 999, padding: '4px 11px', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontWeight: 900, fontSize: 11, letterSpacing: ar ? 0 : '.1em', textTransform: ar ? 'none' : 'uppercase' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff6b60', animation: 'tcBlink 1.1s var(--ease) infinite' }} />{ar ? 'مباشر' : 'LIVE'}
            </span>
          </span>
          <h2 style={{ margin: 0, color: '#fff', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(26px,3.4vw,40px)', lineHeight: ar ? 1.18 : 1.06, letterSpacing: ar ? 0 : '-.025em' }}>{t.launchesTitle}</h2>
          <p style={{ margin: '10px 0 0', color: 'rgba(255,255,255,.66)', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)', fontSize: 15.5, lineHeight: 1.55 }}>{t.launchesSub}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: spotlight ? 'minmax(0,1.5fr) minmax(0,1fr)' : 'repeat(auto-fit,minmax(240px,1fr))', gap: 18, marginTop: 26, alignItems: 'stretch' }} className={spotlight ? 'tc-launch-spot' : ''}>
        {feat && <div style={{ display: 'flex' }}><TCResultCard project={feat} lang={lang} variant="big" onOpen={onOpenProject} style={{ width: '100%' }} /></div>}
        {spotlight ? (
          <div style={{ display: 'grid', gridTemplateRows: `repeat(${rest.length},1fr)`, gap: 18 }}>
            {rest.map((p) => <TCResultCard key={p.id} project={p} lang={lang} variant="compact" onOpen={onOpenProject} />)}
          </div>
        ) : rest.map((p) => <TCResultCard key={p.id} project={p} lang={lang} variant="big" onOpen={onOpenProject} />)}
      </div>

      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <TCSeeMoreButton lang={lang} t={t} onClick={() => onSeeMore('launches')} dark />
        </div>
      )}
    </section>
  );
}

/* ---------- Featured areas ---------- */
function TCAreas({ lang, t, onSearch, onSeeMore, forceAll }) {
  const ar = lang === 'ar';
  const D = window.TYCOONS_DATA;
  const mobile = useTCMobile();
  const allKeys = Object.keys(D.AREAS);
  const cap = 3;
  const keys = (forceAll || !mobile) ? allKeys : allKeys.slice(0, cap);
  function countFor(k) { return D.PROJECTS.filter((p) => p.area === k).length; }
  return (
    <section style={{ margin: '46px 0' }}>
      {!forceAll && <TCSectionHead eyebrow={t.areasEyebrow} title={t.areasTitle} sub={t.areasSub} lang={lang} />}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
        {keys.map((k, i) => {
          const a = D.AREAS[k];
          const label = ar ? a.ar : a.en;
          return (
            <button key={k} type="button" onClick={() => onSearch(label)}
              style={{ position: 'relative', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', cursor: 'pointer', padding: 0, height: 150, textAlign: 'start',
                background: `repeating-linear-gradient(${120 + i * 20}deg,#e9edf3,#e9edf3 12px,#f4eddd 12px,#f4eddd 24px)`, transition: 'transform .18s var(--ease), box-shadow .18s var(--ease)' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
              <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(16,24,39,0) 30%,rgba(16,24,39,.72) 100%)' }} />
              <span style={{ position: 'absolute', insetInlineStart: 14, bottom: 12, insetInlineEnd: 14, color: '#fff' }}>
                <span style={{ display: 'block', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>{label}</span>
                <span style={{ display: 'block', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)', fontSize: 12.5, color: 'rgba(255,255,255,.8)', marginTop: 2 }}>{ar ? `${window.TC.toArabicDigits(countFor(k))} مشروع متاح` : `${countFor(k)} projects`}</span>
              </span>
              <span style={{ position: 'absolute', insetInlineEnd: 12, top: 12, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,.85)', display: 'grid', placeItems: 'center', color: 'var(--gold)' }}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" style={ar ? { transform: 'scaleX(-1)' } : null}><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            </button>
          );
        })}
      </div>
      {!forceAll && mobile && allKeys.length > cap && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <TCSeeMoreButton lang={lang} t={t} onClick={() => onSeeMore('areas')} />
        </div>
      )}
    </section>
  );
}

/* ---------- Trusted developers + trust points ---------- */
function TCDevelopers({ lang, t, onSeeMore, forceAll }) {
  const ar = lang === 'ar';
  const D = window.TYCOONS_DATA;
  const mobile = useTCMobile();
  const cap = 4;
  const devs = (forceAll || !mobile) ? D.DEVELOPERS : D.DEVELOPERS.slice(0, cap);
  return (
    <section style={{ margin: '46px 0' }}>
      {!forceAll && <TCSectionHead eyebrow={t.devsEyebrow} title={t.devsTitle} sub={t.devsSub} lang={lang} />}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 26 }}>
        {devs.map((d, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '16px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 17, color: 'var(--navy)' }}>{ar ? d.ar : d.name}</span>
            <span style={{ fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)', fontSize: 12.5, color: 'var(--muted)' }}>{t.devProjects(d.projects)}</span>
          </div>
        ))}
      </div>
      {!forceAll && mobile && D.DEVELOPERS.length > cap && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: -8, marginBottom: 26 }}>
          <TCSeeMoreButton lang={lang} t={t} onClick={() => onSeeMore('developers')} />
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
        {t.trust.map((tr, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '20px', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(140deg,#fff,var(--surface-warm))', border: '1px solid var(--line-gold)' }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--surface-warm)', border: '1px solid var(--line-gold)', display: 'grid', placeItems: 'center', color: 'var(--gold)', marginBottom: 4 }}>
              {i === 0 ? <svg viewBox="0 0 24 24" width="19" height="19" fill="none"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                : i === 1 ? <svg viewBox="0 0 24 24" width="19" height="19" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" /></svg>
                : <svg viewBox="0 0 24 24" width="19" height="19" fill="none"><path d="M4 12a8 8 0 1 1 3.5 6.6L4 20l1.2-3.4A7.9 7.9 0 0 1 4 12z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>}
            </span>
            <span style={{ fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontWeight: 900, fontSize: 16, color: 'var(--navy)' }}>{tr.t}</span>
            <span style={{ fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)', fontSize: 13.5, lineHeight: 1.55, color: 'var(--slate)' }}>{tr.d}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Installment calculator ---------- */
function TCCalculator({ lang, t, initialPrice, initialDown, initialYears, hideHead }) {
  const ar = lang === 'ar';
  const { formatEGPFull, toArabicDigits } = window.TC;
  const [price, setPrice] = React.useState(initialPrice || 8400000);
  const [downPct, setDownPct] = React.useState(initialDown || 10);
  const [years, setYears] = React.useState(initialYears || 8);
  const down = Math.round(price * downPct / 100);
  const monthly = Math.round((price - down) / (years * 12));
  const num = (n) => ar ? toArabicDigits(n) : n;

  const rangeStyle = { width: '100%', accentColor: 'var(--gold)', cursor: 'pointer' };
  const rowLabel = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 };

  return (
    <section style={{ margin: hideHead ? 0 : '46px 0' }}>
      {!hideHead && <TCSectionHead eyebrow={t.calcEyebrow} title={t.calcTitle} sub={t.calcSub} lang={lang} />}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)', gap: 18, alignItems: 'stretch' }} className="tc-calc">
        <div style={{ padding: 'clamp(18px,3vw,26px)', borderRadius: 'var(--radius-xl)', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div>
            <div style={rowLabel}>
              <span style={{ fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontWeight: 800, color: 'var(--navy)', fontSize: 14 }}>{t.calcPrice}</span>
              <strong style={{ fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', color: 'var(--gold-deep)', fontSize: 15 }}>{formatEGPFull(price, lang)}</strong>
            </div>
            <input type="range" min={2000000} max={100000000} step={100000} value={price} onChange={(e) => setPrice(+e.target.value)} style={rangeStyle} />
          </div>
          <div>
            <div style={rowLabel}>
              <span style={{ fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontWeight: 800, color: 'var(--navy)', fontSize: 14 }}>{t.calcDown}</span>
              <strong style={{ fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', color: 'var(--gold-deep)', fontSize: 15 }}>{num(downPct)}%</strong>
            </div>
            <input type="range" min={5} max={40} step={1} value={downPct} onChange={(e) => setDownPct(+e.target.value)} style={rangeStyle} />
          </div>
          <div>
            <div style={rowLabel}>
              <span style={{ fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontWeight: 800, color: 'var(--navy)', fontSize: 14 }}>{t.calcYears}</span>
              <strong style={{ fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', color: 'var(--gold-deep)', fontSize: 15 }}>{t.calcYearsUnit(years)}</strong>
            </div>
            <input type="range" min={3} max={15} step={1} value={years} onChange={(e) => setYears(+e.target.value)} style={rangeStyle} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14, padding: 'clamp(18px,3vw,26px)', borderRadius: 'var(--radius-xl)', background: 'linear-gradient(140deg,var(--navy),var(--navy-600))', color: '#fff', boxShadow: 'var(--shadow-primary)' }}>
          <span style={{ fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--gold-light)' }}>{t.calcMonthly}</span>
          <strong style={{ fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontSize: 'clamp(28px,4vw,38px)', lineHeight: 1 }}>{formatEGPFull(monthly, lang)}</strong>
          <div style={{ height: 1, background: 'rgba(255,255,255,.14)', margin: '4px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)', fontSize: 13.5, color: 'rgba(255,255,255,.78)' }}>
            <span>{t.calcDownAmount}</span><strong style={{ color: '#fff' }}>{formatEGPFull(down, lang)}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Popular quick searches ---------- */
function TCPopular({ lang, t, onSearch, onSeeMore, forceAll }) {
  const ar = lang === 'ar';
  const mobile = useTCMobile();
  const cap = 6;
  const items = (forceAll || !mobile) ? t.popular : t.popular.slice(0, cap);
  return (
    <section style={{ margin: '46px 0' }}>
      {!forceAll && <TCSectionHead eyebrow={t.popularEyebrow} title={t.popularTitle} lang={lang} />}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {items.map((label, i) => (
          <button key={i} type="button" onClick={() => onSearch(label)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--navy)', borderRadius: 999, padding: '11px 18px', cursor: 'pointer', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)', fontSize: 14, fontWeight: 700, boxShadow: 'var(--shadow-sm)', transition: 'border-color .16s var(--ease), color .16s var(--ease)' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line-strong)'; e.currentTarget.style.color = 'var(--navy)'; }}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" /><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            {label}
          </button>
        ))}
      </div>
      {!forceAll && mobile && t.popular.length > cap && (
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 4 }}>
          <TCSeeMoreButton lang={lang} t={t} onClick={() => onSeeMore('popular')} />
        </div>
      )}
    </section>
  );
}

/* ---------- Footer ---------- */
function TCFooter({ lang }) {
  const ar = lang === 'ar';
  const cols = ar
    ? [['المنصة', [['البحث الذكي', '/#tc-console'], ['البحث الصوتي', '/#tc-console'], ['الطرح الجديد', '/#tc-launches'], ['الحاسبة', '/#tc-calc']]], ['المناطق', [['الساحل', '/ar/areas/north-coast'], ['التجمع', '/ar/areas/new-cairo'], ['السخنة', '/ar/areas/ain-sokhna'], ['زايد', '/ar/areas/sheikh-zayed']]], ['Tycoons', [['دليل المشاريع', '/ar/'], ['المطوّرون', '/ar/'], ['تواصل معنا', 'https://wa.me/201200704344']]]]
    : [['Platform', [['AI search', '/#tc-console'], ['Voice search', '/#tc-console'], ['New launches', '/#tc-launches'], ['Calculator', '/#tc-calc']]], ['Areas', [['North Coast', '/en/areas/north-coast'], ['New Cairo', '/en/areas/new-cairo'], ['Ain Sokhna', '/en/areas/ain-sokhna'], ['Zayed', '/en/areas/sheikh-zayed']]], ['Tycoons', [['Project directory', '/en/'], ['Developers', '/en/'], ['Contact', 'https://wa.me/201200704344']]]];
  return (
    <footer style={{ marginTop: 30, background: 'var(--navy)', color: '#fff', borderRadius: 'var(--radius-2xl) var(--radius-2xl) 0 0' }}>
      <div style={{ width: 'min(1240px,calc(100% - 32px))', margin: '0 auto', padding: '40px 0 26px', display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) repeat(3,minmax(0,1fr))', gap: 24 }} className="tc-foot">
        <div>
          <img src="data:image/svg+xml,%3Csvg%20width%3D%22220%22%20height%3D%2252%22%20viewBox%3D%220%200%20220%2052%22%20role%3D%22img%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%20%20%3Ctitle%3ETycoons%20Investments%3C%2Ftitle%3E%0A%20%20%3Crect%20x%3D%2210%22%20y%3D%2210%22%20width%3D%2220%22%20height%3D%222.5%22%20fill%3D%22%23F5F2EE%22%3E%3C%2Frect%3E%0A%20%20%3Crect%20x%3D%2219%22%20y%3D%2210%22%20width%3D%222.5%22%20height%3D%2226%22%20fill%3D%22%23F5F2EE%22%3E%3C%2Frect%3E%0A%20%20%3Crect%20x%3D%2219%22%20y%3D%2239%22%20width%3D%222.5%22%20height%3D%222.5%22%20fill%3D%22%23A09890%22%3E%3C%2Frect%3E%0A%20%20%3Cline%20x1%3D%2246%22%20y1%3D%226%22%20x2%3D%2246%22%20y2%3D%2248%22%20stroke%3D%22%233A3632%22%20stroke-width%3D%220.5%22%3E%3C%2Fline%3E%0A%20%20%3Ctext%20x%3D%2258%22%20y%3D%2231%22%20font-family%3D%22Georgia%2C%20%26%2339%3BTimes%20New%20Roman%26%2339%3B%2C%20serif%22%20font-size%3D%2224%22%20font-weight%3D%22700%22%20letter-spacing%3D%22-0.5%22%20fill%3D%22%23F5F2EE%22%3ETYCOONS%3C%2Ftext%3E%0A%20%20%3Ctext%20x%3D%2258%22%20y%3D%2247%22%20font-family%3D%22Arial%2C%20Helvetica%2C%20sans-serif%22%20font-size%3D%228%22%20letter-spacing%3D%225%22%20fill%3D%22%23A09890%22%3EINVESTMENTS%3C%2Ftext%3E%0A%3C%2Fsvg%3E" alt="Tycoons" style={{ height: 42, marginBottom: 12 }} />
          <p style={{ margin: 0, color: 'rgba(255,255,255,.6)', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)', fontSize: 13.5, lineHeight: 1.6, maxWidth: 280 }}>{ar ? 'ابحث عن عقارك بالذكاء الاصطناعي والصوت — من المطوّرين مباشرة.' : 'Find your property with AI and voice — direct from developers.'}</p>
        </div>
        {cols.map(([head, links], i) => (
          <div key={i}>
            <span style={{ display: 'block', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontWeight: 900, fontSize: 13, color: 'var(--gold-light)', marginBottom: 12 }}>{head}</span>
            {links.map(([label, href], j) => <a key={j} href={href} style={{ display: 'block', color: 'rgba(255,255,255,.72)', textDecoration: 'none', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)', fontSize: 13.5, padding: '5px 0' }}>{label}</a>)}
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,.1)' }}>
        <div style={{ width: 'min(1240px,calc(100% - 32px))', margin: '0 auto', padding: '16px 0', color: 'rgba(255,255,255,.5)', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)', fontSize: 12.5 }}>© {ar ? '٢٠٢٦ تايكونز للاستثمار' : '2026 Tycoons Investments'}</div>
      </div>
    </footer>
  );
}

/* ---------- Full listing page (reached via "See more") ---------- */
function TCListPage({ lang, t, kind, project, onBack, onOpenProject, onSearch }) {
  const ar = lang === 'ar';
  const D = window.TYCOONS_DATA;
  const byRecency = (a, b) => (b._recency_ts || 0) - (a._recency_ts || 0);

  let head = null, body = null;
  if (kind === 'launches') {
    const items = D.PROJECTS.filter((p) => p.is_launch).sort(byRecency);
    head = { eyebrow: t.launchesEyebrow || (ar ? 'الطرح الجديد' : 'New launches'), title: t.launchesTitle, sub: t.launchesSub };
    body = (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
        {items.map((p) => <TCResultCard key={p.id} project={p} lang={lang} variant="big" onOpen={onOpenProject} />)}
      </div>
    );
  } else if (kind === 'similar' && project) {
    const items = D.PROJECTS.filter((x) => x.id !== project.id && (x.area === project.area || x.unit_type === project.unit_type))
      .sort((a, b) => (a.area === project.area ? -1 : 1) - (b.area === project.area ? -1 : 1));
    head = { eyebrow: t.similar, title: t.similar, sub: t.similarSub };
    body = (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
        {items.map((p) => <TCResultCard key={p.id} project={p} lang={lang} variant="big" onOpen={onOpenProject} />)}
      </div>
    );
  } else if (kind === 'areas') {
    head = { eyebrow: t.areasEyebrow, title: t.areasTitle, sub: t.areasSub };
    body = <TCAreas lang={lang} t={t} onSearch={onSearch} forceAll />;
  } else if (kind === 'developers') {
    head = { eyebrow: t.devsEyebrow, title: t.devsTitle, sub: t.devsSub };
    body = <TCDevelopers lang={lang} t={t} forceAll />;
  } else if (kind === 'popular') {
    head = { eyebrow: t.popularEyebrow, title: t.popularTitle };
    body = <TCPopular lang={lang} t={t} onSearch={onSearch} forceAll />;
  }

  return (
    <div style={{ animation: 'tcFade .25s var(--ease) both', paddingBottom: 40 }}>
      <TCBackButton lang={lang} t={t} onBack={onBack} />
      {head && <TCSectionHead eyebrow={head.eyebrow} title={head.title} sub={head.sub} lang={lang} />}
      {body}
    </div>
  );
}

Object.assign(window, { TCSectionHead, TCSeeMoreButton, TCBackButton, TCLaunches, TCAreas, TCDevelopers, TCCalculator, TCPopular, TCListPage, TCFooter });
