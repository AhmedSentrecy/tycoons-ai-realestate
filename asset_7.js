/* Tycoons site — AI Concierge: the conversational voice/text search.
   The whole point: results render INSIDE the assistant's reply (a rail
   attached under the message), so the answer never detaches from the
   conversation and the user never has to scroll to a separate section. */
const TC_REFINE_KEYS = ['cheaper', 'ready', 'sea', 'beds2', 'longplan'];

function TCOrb({ state, size = 46 }) {
  const active = state === 'listening' || state === 'speaking';
  const ring = (i) => ({
    position: 'absolute', inset: 0, borderRadius: '50%',
    border: '2px solid ' + (state === 'listening' ? 'rgba(32,177,90,.9)' : 'var(--gold)'),
    opacity: 0, animation: active ? `tcRing 1.6s var(--ease) ${i * 0.5}s infinite` : 'none',
  });
  return (
    <span style={{ position: 'relative', flex: `0 0 ${size}px`, width: size, height: size, borderRadius: '50%',
      background: 'radial-gradient(circle at 32% 28%, #2a3a58, var(--navy))', display: 'grid', placeItems: 'center',
      boxShadow: '0 8px 18px rgba(16,24,39,.28)' }}>
      <svg viewBox="0 0 24 24" width={size * 0.42} height={size * 0.42} fill="none" aria-hidden="true">
        <path d="M12 3v18M7 7v10M17 7v10M3.5 10v4M20.5 10v4" stroke={state === 'listening' ? '#7ee0a6' : '#d2aa62'} strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span style={ring(0)} /><span style={ring(1)} />
    </span>
  );
}

function TCEq({ on, color = 'var(--gold)', bars = 6, h = 20 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, height: h }} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} style={{
          width: 3.5, borderRadius: 999, background: color, height: on ? '30%' : '22%',
          animation: on ? `tcEq .85s var(--ease) ${(i % 4) * 0.12}s infinite` : 'none',
        }} />
      ))}
    </span>
  );
}

function TCConversation({ lang, t, cardStyle, messages, voiceState, onOpenProject, compact }) {
  const ar = lang === 'ar';
  const endRef = React.useRef(null);
  React.useEffect(() => {
    if (endRef.current) endRef.current.parentNode.scrollTop = endRef.current.offsetTop;
  }, [messages, voiceState]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: compact ? 'none' : 460, overflowY: 'auto', paddingInlineEnd: 4 }} className="tc-scroll">
      {messages.map((m, i) => m.role === 'user' ? (
        <div key={i} style={{ alignSelf: ar ? 'flex-start' : 'flex-end', maxWidth: '82%', animation: 'tcRise .3s var(--ease) both' }}>
          <div style={{ background: 'linear-gradient(135deg,var(--navy),var(--navy-600))', color: '#fff', borderRadius: '16px 16px 4px 16px', padding: '11px 15px', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)', fontSize: 15, lineHeight: 1.5, boxShadow: 'var(--shadow-primary)' }}>{m.text}</div>
        </div>
      ) : (
        <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', animation: 'tcRise .3s var(--ease) both' }}>
          <TCOrb state={i === messages.length - 1 ? voiceState : 'idle'} size={34} />
          <div style={{ position: 'relative', flex: 1, minWidth: 0, paddingInlineStart: 2 }}>
            <div style={{ background: 'var(--surface-warm)', border: '1px solid var(--line-gold)', color: 'var(--navy)', borderRadius: ar ? '16px 16px 16px 4px' : '16px 16px 4px 16px', padding: '11px 15px', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)', fontSize: 15, lineHeight: 1.55, display: 'inline-block' }}>{m.text}</div>
            {m.items && m.items.length > 0 && (
              <div className="tc-rail" style={{ display: 'flex', gap: 13, marginTop: 12, overflowX: 'auto', paddingBottom: 6, scrollSnapType: 'x mandatory' }}>
                {m.items.map((p) => (
                  <div key={p.id} style={{ flex: `0 0 ${cardStyle === 'compact' ? 244 : 286}px`, scrollSnapAlign: 'start' }}>
                    <TCResultCard project={p} lang={lang} variant={cardStyle === 'compact' ? 'compact' : 'big'} onOpen={onOpenProject} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      {voiceState === 'thinking' && (
        <div style={{ display: 'flex', gap: 11, alignItems: 'center', animation: 'tcRise .3s var(--ease) both' }}>
          <TCOrb state="speaking" size={34} />
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'var(--surface-soft)', border: '1px solid var(--line)', borderRadius: 999, padding: '9px 15px', color: 'var(--muted)', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)', fontSize: 14 }}>
            <span className="tc-dots"><span></span><span></span><span></span></span>{t.thinking}
          </div>
        </div>
      )}
      <div ref={endRef} style={{ height: 1 }} />
    </div>
  );
}

function TCInputRow({ lang, t, draft, onDraft, onSubmit, onMic, micSupported, voiceState }) {
  const ar = lang === 'ar';
  const listening = voiceState === 'listening';
  function submit() { const v = (draft || '').trim(); if (v) onSubmit(v); }
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 'var(--radius-lg)', padding: '6px 6px 6px 16px', boxShadow: 'var(--shadow-sm)' }}>
        <textarea
          rows={1} value={draft} placeholder={listening ? t.listening : t.inputPlaceholder}
          onChange={(e) => onDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', background: 'transparent', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)', fontSize: 15.5, color: 'var(--navy)', lineHeight: 1.5, padding: '8px 0', maxHeight: 90 }}
        />
        {/* mic */}
        <button type="button" onClick={onMic} aria-label={t.tapToTalk} title={micSupported ? t.tapToTalk : 'mic unavailable — using demo voice'}
          style={{ flex: '0 0 44px', width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
            display: 'grid', placeItems: 'center', transition: 'all .16s var(--ease)',
            background: listening ? 'var(--wa)' : 'var(--surface-warm)', color: listening ? '#fff' : 'var(--gold)',
            border: listening ? '1px solid var(--wa)' : '1px solid var(--line-gold)',
            boxShadow: listening ? '0 0 0 6px rgba(32,177,90,.16)' : 'none',
            animation: listening ? 'tcPulse 1.4s var(--ease) infinite' : 'none' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect x="9" y="3" width="6" height="12" rx="3" fill="currentColor" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </div>
      <button type="button" onClick={submit}
        style={{ flex: '0 0 auto', minHeight: 56, padding: '0 22px', borderRadius: 'var(--radius-lg)', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,var(--gold),var(--gold-light))', color: '#fff', boxShadow: 'var(--shadow-gold)',
          fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontWeight: 900, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {t.send}
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" style={ar ? { transform: 'scaleX(-1)' } : null}><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </div>
  );
}

function TCChips({ lang, t, active, onSubmit, onRefine }) {
  const ar = lang === 'ar';
  const items = active ? t.refines : t.popular.slice(0, 4);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ color: 'var(--muted)', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontSize: 12.5, fontWeight: 800 }}>{active ? t.refineHint : t.examplesLabel}</span>
      {items.map((label, i) => (
        <button key={i} type="button" onClick={() => active ? onRefine(TC_REFINE_KEYS[i], label) : onSubmit(label)}
          style={{ border: '1px solid rgba(184,137,57,.28)', background: 'rgba(255,255,255,.75)', color: 'var(--navy)', borderRadius: 999, padding: '7px 14px', cursor: 'pointer', fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)', fontSize: 13, fontWeight: 700, transition: 'border-color .16s var(--ease), background .16s var(--ease)' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.background = '#fff8e9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(184,137,57,.28)'; e.currentTarget.style.background = 'rgba(255,255,255,.75)'; }}>
          {label}
        </button>
      ))}
    </div>
  );
}

function TCConcierge(props) {
  const { lang, t, mode, cardStyle, messages, voiceState, draft, onDraft, onSubmit, onRefine, onMic, micSupported, onOpenProject, onCloseFullscreen, fsOpen } = props;
  const ar = lang === 'ar';
  const active = messages.length > 0;
  const statusText = voiceState === 'listening' ? t.listening : voiceState === 'thinking' ? t.thinking : voiceState === 'speaking' ? '' : (ar ? 'جاهز يسمعك' : 'Ready when you are');

  const identity = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <TCOrb state={voiceState} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
        <span style={{ fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-display)', fontWeight: 900, fontSize: 13.5, color: 'var(--gold-deep)' }}>{ar ? 'المساعد الذكي' : 'AI Assistant'}</span>
        <span style={{ fontFamily: ar ? 'var(--font-arabic)' : 'var(--font-body)', fontSize: 13, color: 'var(--muted)' }}>{statusText}</span>
      </div>
      <TCEq on={voiceState === 'listening' || voiceState === 'speaking'} color={voiceState === 'listening' ? 'var(--wa)' : 'var(--gold)'} />
    </div>
  );

  const body = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {identity}
      {active && <TCConversation lang={lang} t={t} cardStyle={cardStyle} messages={messages} voiceState={voiceState} onOpenProject={onOpenProject} compact={mode === 'fullscreen'} />}
      <TCInputRow lang={lang} t={t} draft={draft} onDraft={onDraft} onSubmit={onSubmit} onMic={onMic} micSupported={micSupported} voiceState={voiceState} />
      <TCChips lang={lang} t={t} active={active} onSubmit={onSubmit} onRefine={onRefine} />
    </div>
  );

  // Fullscreen overlay variant
  if (mode === 'fullscreen' && fsOpen) {
    return (
      <>
        <TCConsoleShell lang={lang} t={t}>{
          <TCInputRow lang={lang} t={t} draft={draft} onDraft={onDraft} onSubmit={onSubmit} onMic={onMic} micSupported={micSupported} voiceState={voiceState} />
        }</TCConsoleShell>
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(16,24,39,.55)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: 'clamp(12px,3vw,40px)', animation: 'tcFade .2s var(--ease) both' }}
          onClick={(e) => { if (e.target === e.currentTarget && onCloseFullscreen) onCloseFullscreen(); }}>
          <div style={{ position: 'relative', width: 'min(920px,100%)', maxHeight: '92vh', overflow: 'auto', background: 'var(--surface)', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-lg)', padding: 'clamp(18px,3vw,28px)' }}>
            <button type="button" onClick={onCloseFullscreen} aria-label="close" style={{ position: 'absolute', insetInlineEnd: 14, top: 14, zIndex: 2, width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--surface-soft)', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
            {body}
          </div>
        </div>
      </>
    );
  }

  return <TCConsoleShell lang={lang} t={t} bare={mode === 'bar' && !active}>{body}</TCConsoleShell>;
}

function TCConsoleShell({ children, bare }) {
  return (
    <div style={{
      background: bare ? 'transparent' : 'linear-gradient(140deg,#fff 0%,#fff 56%,var(--surface-warm) 100%)',
      border: bare ? 'none' : '1px solid var(--line)', borderRadius: 'var(--radius-2xl)',
      padding: bare ? 0 : 'clamp(18px,3vw,30px)', boxShadow: bare ? 'none' : 'var(--shadow-md)',
    }}>{children}</div>
  );
}

window.TCConcierge = TCConcierge;
