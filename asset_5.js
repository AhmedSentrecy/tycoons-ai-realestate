/* Tycoons site — app shell: header, routing, language, voice + query
   engine, tweaks. Composes DS components + the site modules. */
const { useState, useEffect, useRef } = React;

const TC_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "searchMode": "fullscreen",
  "cardStyle": "compact",
  "launchLayout": "grid",
  "palette": "default"
}/*EDITMODE-END*/;

// Runtime token overrides for the "Royal Sapphire & Brass" direction.
// Applied on documentElement so it cascades to every component AND body
// bg-wash — without editing the design-system token files.
const TC_PALETTES = {
  sapphire: {
    '--navy': '#11213f', '--navy-700': '#1b2f52', '--navy-600': '#1d3155',
    '--gold': '#b98a46', '--gold-deep': '#8e6a34', '--gold-bright': '#cba15f',
    '--gold-light': '#cba15f', '--gold-soft': '#ebdcb8',
    '--bg': '#eef1f6', '--surface': '#ffffff', '--surface-soft': '#f3f5f9', '--surface-warm': '#f4efe3',
    '--line': '#e0e5ee', '--line-strong': '#cfd6e2', '--line-gold': '#e2d0a6',
    '--bg-wash': 'radial-gradient(circle at 16% 0%, rgba(185,138,70,.12), transparent 34%), linear-gradient(180deg,#f2f4f8 0%,#eef1f6 100%)',
    '--shadow-md': '0 14px 34px rgba(17,33,63,.10)', '--shadow-primary': '0 12px 24px rgba(17,33,63,.16)',
    '--shadow-gold': '0 8px 18px rgba(185,138,70,.22)',
    '--focus-ring': '0 0 0 4px rgba(185,138,70,.10)', '--focus-border': 'rgba(185,138,70,.65)',
  },
};

function TCHeader({ lang, setLang, onHome, t }) {
  const { WhatsAppButton, LanguageSwitch } = window.TycoonsInvestmentsDesignSystem_8890c9;
  const ar = lang === 'ar';
  const anchors = ['#tc-console', '#tc-launches', '#tc-areas', '#tc-calc', '#tc-foot'];
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 40, minHeight: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px clamp(16px,4vw,48px)', background: 'var(--glass-bg)', borderBottom: '1px solid var(--glass-border)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)' }}>
      <a href="#top" onClick={(e) => { e.preventDefault(); onHome(); }} style={{ display: 'flex', alignItems: 'center' }}>
        <img src="data:image/svg+xml,%3Csvg%20width%3D%22220%22%20height%3D%2252%22%20viewBox%3D%220%200%20220%2052%22%20role%3D%22img%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%20%20%3Ctitle%3ETycoons%20Investments%3C%2Ftitle%3E%0A%20%20%3Crect%20x%3D%2210%22%20y%3D%2210%22%20width%3D%2220%22%20height%3D%222.5%22%20fill%3D%22%231A1714%22%3E%3C%2Frect%3E%0A%20%20%3Crect%20x%3D%2219%22%20y%3D%2210%22%20width%3D%222.5%22%20height%3D%2226%22%20fill%3D%22%231A1714%22%3E%3C%2Frect%3E%0A%20%20%3Crect%20x%3D%2219%22%20y%3D%2239%22%20width%3D%222.5%22%20height%3D%222.5%22%20fill%3D%22%237A7470%22%3E%3C%2Frect%3E%0A%20%20%3Cline%20x1%3D%2246%22%20y1%3D%226%22%20x2%3D%2246%22%20y2%3D%2248%22%20stroke%3D%22%23C8C4BE%22%20stroke-width%3D%220.5%22%3E%3C%2Fline%3E%0A%20%20%3Ctext%20x%3D%2258%22%20y%3D%2231%22%20font-family%3D%22Georgia%2C%20%26%2339%3BTimes%20New%20Roman%26%2339%3B%2C%20serif%22%20font-size%3D%2224%22%20font-weight%3D%22700%22%20letter-spacing%3D%22-0.5%22%20fill%3D%22%231A1714%22%3ETYCOONS%3C%2Ftext%3E%0A%20%20%3Ctext%20x%3D%2258%22%20y%3D%2247%22%20font-family%3D%22Arial%2C%20Helvetica%2C%20sans-serif%22%20font-size%3D%228%22%20letter-spacing%3D%225%22%20fill%3D%22%237A7470%22%3EINVESTMENTS%3C%2Ftext%3E%0A%3C%2Fsvg%3E" alt="Tycoons Investments" style={{ height: 40 }} />
      </a>
      <nav className="tc-nav" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {t.nav.map((n, i) => <a key={i} href={anchors[i]} onClick={onHome} style={{ color: 'var(--muted)', textDecoration: 'none', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontSize: 13.5, fontWeight: 700, padding: '9px 12px', borderRadius: 999 }}>{n}</a>)}
      </nav>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <LanguageSwitch value={lang} onChange={setLang} />
        <WhatsAppButton href="https://wa.me/201200704344" style={{ minHeight: 40, fontSize: 13.5, padding: '0 13px' }}>{t.wa}</WhatsAppButton>
      </div>
    </header>
  );
}

function App() {
  // Design locked in from the explored Tweaks — this is the committed build.
  // (Recoverable palette variants live in TC_PALETTES above.)
  const t = { searchMode: 'fullscreen', cardStyle: 'compact', launchLayout: 'grid', palette: 'default' };
  const [lang, setLang] = useState('ar');
  const [route, setRoute] = useState('home');
  const [activeProject, setActiveProject] = useState(null);
  const [listKind, setListKind] = useState(null);
  const navStack = useRef([]);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([]);
  const [voiceState, setVoiceState] = useState('idle');
  const [fsOpen, setFsOpen] = useState(false);
  const lastFilters = useRef(null);
  const stopListen = useRef(null);
  const consoleRef = useRef(null);
  const copy = window.TC.COPY[lang];
  const [dataTick, setDataTick] = useState(0);
  const [dataSource, setDataSource] = useState(null);

  useEffect(() => {
    function onReady(e) { setDataTick((n) => n + 1); setDataSource(e.detail); }
    window.addEventListener('tycoons:data-ready', onReady);
    return () => window.removeEventListener('tycoons:data-ready', onReady);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  function scrollToConsole() {
    if (consoleRef.current) window.scrollTo({ top: consoleRef.current.getBoundingClientRect().top + window.scrollY - 78, behavior: 'smooth' });
  }

  function runQuery(text, opts) {
    const o = opts || {};
    const userText = o.refineLabel || text;
    const filters = o.refineKey ? window.TC_INTENT.applyRefine(lastFilters.current || {}, o.refineKey) : window.TC_INTENT.parseQuery(text);
    setMessages((m) => [...m, { role: 'user', text: userText }]);
    setDraft('');
    if (t.searchMode === 'fullscreen') setFsOpen(true);
    window.TC_VOICE.stopSpeaking();
    setVoiceState('thinking');
    setTimeout(() => {
      const res = window.TC_INTENT.search(text, window.TYCOONS_DATA.PROJECTS, lang, filters);
      lastFilters.current = res.filters;
      const reply = res.items.length ? copy.resultsLead(res.items.length, res.areaLabel) : copy.noResults;
      setMessages((m) => [...m, { role: 'assistant', text: reply, items: res.items }]);
      setVoiceState('speaking');
      window.TC_VOICE.speak(reply, lang, () => setVoiceState('idle'));
    }, 720);
  }

  function externalSearch(label) {
    if (route !== 'home') setRoute('home');
    setTimeout(scrollToConsole, route !== 'home' ? 60 : 0);
    runQuery(label);
  }

  function onMic() {
    if (voiceState === 'listening') { stopListen.current && stopListen.current(); setVoiceState('idle'); return; }
    window.TC_VOICE.stopSpeaking();
    if (!window.TC_VOICE.sttSupported()) {
      // fallback: demo phrase typed then searched
      const demo = lang === 'ar' ? 'عايز شاليه في الساحل تحت ٩ مليون' : 'a chalet on the North Coast under 9 million';
      setVoiceState('listening');
      let i = 0;
      const iv = setInterval(() => {
        i++; setDraft(demo.slice(0, i));
        if (i >= demo.length) { clearInterval(iv); setVoiceState('idle'); runQuery(demo); }
      }, 45);
      return;
    }
    setVoiceState('listening');
    stopListen.current = window.TC_VOICE.listen({
      lang,
      onInterim: (txt) => setDraft(txt),
      onFinal: (txt) => setDraft(txt),
      onEnd: (final) => { setVoiceState('idle'); if (final && final.trim()) runQuery(final.trim()); },
      onError: () => { setVoiceState('idle'); },
    });
  }

  // ---- navigation with scroll memory ----------------------------------
  // Pushing the current view (route + scroll position + context) onto a
  // stack before navigating lets the back button drop the user back exactly
  // where they were — same page, same scroll offset.
  function pushNav() {
    navStack.current.push({ route, scroll: window.scrollY, activeProject, listKind });
  }
  function restoreScroll(y) {
    // wait for the destination to render + images to reserve height, then jump
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.scrollTo({ top: y || 0, behavior: 'auto' });
      setTimeout(() => window.scrollTo({ top: y || 0, behavior: 'auto' }), 120);
    }));
  }
  function openProject(p) { pushNav(); setActiveProject(p); setRoute('project'); window.scrollTo({ top: 0, behavior: 'auto' }); }
  function openList(kind) { pushNav(); setListKind(kind); setRoute('list'); window.scrollTo({ top: 0, behavior: 'auto' }); }
  function goBack() {
    const prev = navStack.current.pop();
    if (!prev) { setRoute('home'); return; }
    setRoute(prev.route); setActiveProject(prev.activeProject); setListKind(prev.listKind);
    restoreScroll(prev.scroll);
  }
  function goHome() { navStack.current = []; setRoute('home'); }

  const conciergeProps = {
    lang, t: copy, mode: t.searchMode, cardStyle: t.cardStyle, messages, voiceState, draft,
    onDraft: setDraft, onSubmit: (txt) => runQuery(txt), onRefine: (key, label) => runQuery('', { refineKey: key, refineLabel: label }),
    onMic, micSupported: window.TC_VOICE.sttSupported(), onOpenProject: openProject,
    fsOpen, onCloseFullscreen: () => setFsOpen(false),
  };

  return (
    <>
      <TCHeader lang={lang} setLang={setLang} onHome={goHome} t={copy} />

      {route === 'home' ? (
        <main style={{ width: 'min(1240px,calc(100% - 32px))', margin: '0 auto' }} id="top">
          {/* Hero + concierge */}
          <section id="tc-console" ref={consoleRef} style={{ padding: '30px 0 8px' }}>
            <div style={{ marginBottom: 22, maxWidth: 780 }}>
              <window.EyebrowWrap lang={lang}>{copy.eyebrow}</window.EyebrowWrap>
              <h1 style={{ margin: '14px 0 12px', color: 'var(--navy)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(26px,3.6vw,42px)', lineHeight: lang === 'ar' ? 1.18 : 0.98, letterSpacing: lang === 'ar' ? 0 : '-.04em' }}>
                {copy.h1a}<br />{copy.h1b}
              </h1>
              <p style={{ maxWidth: 640, margin: 0, color: 'var(--muted)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-body)', fontSize: 17, lineHeight: 1.6 }}>{copy.lede}</p>
            </div>
            <window.TCConcierge {...conciergeProps} />
          </section>

          <div id="tc-launches"><window.TCLaunches lang={lang} t={copy} layout={t.launchLayout} onOpenProject={openProject} onSeeMore={openList} /></div>
          <div id="tc-areas"><window.TCAreas lang={lang} t={copy} onSearch={externalSearch} onSeeMore={openList} /></div>
          <window.TCDevelopers lang={lang} t={copy} onSeeMore={openList} />
          <div id="tc-calc"><window.TCCalculator lang={lang} t={copy} /></div>
          <window.TCPopular lang={lang} t={copy} onSearch={externalSearch} onSeeMore={openList} />
        </main>
      ) : route === 'list' ? (
        <main style={{ width: 'min(1240px,calc(100% - 32px))', margin: '0 auto' }}>
          <window.TCListPage lang={lang} t={copy} kind={listKind} project={activeProject} onBack={goBack} onOpenProject={openProject} onSearch={externalSearch} />
        </main>
      ) : (
        <main style={{ width: 'min(1100px,calc(100% - 32px))', margin: '0 auto' }}>
          <window.TCProjectPage lang={lang} t={copy} project={activeProject} onBack={goBack} onOpenProject={openProject} onSeeMore={openList} />
        </main>
      )}

      <div id="tc-foot"><window.TCFooter lang={lang} /></div>

      {/* Floating WhatsApp */}
      <div style={{ position: 'fixed', left: 18, bottom: 18, zIndex: 60 }}>
        {(() => { const { WhatsAppButton } = window.TycoonsInvestmentsDesignSystem_8890c9; return <WhatsAppButton shape="fab" href="https://wa.me/201200704344" />; })()}
      </div>
    </>
  );
}

// small eyebrow wrapper that honours Arabic tracking
function EyebrowWrap({ children, lang }) {
  const { Eyebrow } = window.TycoonsInvestmentsDesignSystem_8890c9;
  return <Eyebrow style={lang === 'ar' ? { letterSpacing: 0, fontFamily: 'var(--font-arabic)' } : null}>{children}</Eyebrow>;
}
window.EyebrowWrap = EyebrowWrap;

const rootEl = document.getElementById('root');
const tcRoot = window.__tcRoot || (window.__tcRoot = ReactDOM.createRoot(rootEl));
tcRoot.render(<App />);
