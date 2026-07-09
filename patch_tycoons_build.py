from pathlib import Path
import re, json, gzip, base64, shutil, zipfile, os
root = Path(__file__).resolve().parent

# Map asset filenames to root and manifest hashed IDs
asset_map = {
 'asset_6.js':'c81c2ae8-21a6-4a72-985a-f049c3ae6e47',
 'asset_13.js':'aa6c292b-f3d3-47f7-81a2-5de66c2c70be',
 'asset_12.js':'ede3cccd-57e2-4efe-b2e0-581e7d8f396f',
 'asset_9.js':'c774c742-6bc9-4360-b251-c48efef58e73',
 'asset_5.js':'57de0e87-3a9d-4599-a85c-63b2c907cffe',
}

# ---------- Supabase adapter patch ----------
p = root/'asset_6.js'
s = p.read_text()
s = re.sub(r"  function parseGallery\(row\) \{.*?\n  \}\n\n  function parseBedrooms", """  function parseGallery(row) {
    if (!row) return [];
    const out = [];
    function add(url) {
      const u = String(url || '').trim();
      if (u && !out.includes(u)) out.push(u);
    }
    add(row.image_url);
    const raw = row.gallery_urls;
    if (Array.isArray(raw)) raw.forEach(add);
    else if (raw) String(raw).split(',').forEach(add);
    return out;
  }

  function parseBedrooms""", s, flags=re.S)
s = s.replace("""    const locationText = (project && project.location) || '';
    const placeholderType = isPlaceholderType(unit.unit_type);
    const typeText = placeholderType ? '' : (unit.unit_type || '');
    const areaKey = resolveKey(D.AREAS, locationText);
    const typeKey = placeholderType ? null : resolveKey(D.TYPES, typeText);
    const gallery = parseGallery(unit.gallery_urls ? unit : (project || unit));
    const price = unit.starting_price ?? (project && project.min_price) ?? 0;
    const deliveryText = unit.delivery_text || (project && project.delivery_text) || '';
    const compound = (project && project.name) || 'Tycoons project';
    const developer = (project && project.developer) || '—';
    const title = typeText ? `${typeText} ${compound}`.trim() : compound;""", """    const locationText = (project && project.location) || unit.location || '';
    const placeholderType = isPlaceholderType(unit.unit_type);
    const typeText = placeholderType ? '' : (unit.unit_type || '');
    const areaKey = resolveKey(D.AREAS, locationText);
    const typeKey = placeholderType ? null : resolveKey(D.TYPES, typeText);
    const gallery = [...parseGallery(unit), ...parseGallery(project || {})].filter((u, i, a) => u && a.indexOf(u) === i);
    const price = unit.starting_price ?? (project && project.min_price) ?? 0;
    const deliveryText = unit.delivery_text || (project && project.delivery_text) || '';
    const compound = (project && project.name) || unit.project_name || 'Tycoons project';
    const developer = (project && project.developer) || unit.developer || '—';
    const title = typeText ? `${typeText} ${compound}`.trim() : compound;""")
s = s.replace("""      image_url: gallery[0] || unit.image_url || (project && project.image_url) || null,
      gallery: gallery.length ? gallery : (unit.image_url ? [unit.image_url] : []),
      amenities_ar: [], amenities_en: [],""", """      image_url: gallery[0] || unit.image_url || (project && project.image_url) || null,
      gallery: gallery.length ? gallery : (unit.image_url ? [unit.image_url] : []),
      brochure_url: unit.brochure_url || (project && project.brochure_url) || '',
      video_url: unit.video_url || (project && project.video_url) || '',
      finishing: unit.finishing || (project && project.finishing) || '',
      bedrooms_text: unit.bedrooms_text || '',
      area_sqm: unit.area_sqm || '',
      location_text: locationText,
      source_type: unit.source_type || '',
      source_reference: unit.source_reference || '',
      amenities_ar: [], amenities_en: [],""")
s = re.sub(r"  async function loadFromSupabase\(\) \{.*?\n  \}\n\n  loadFromSupabase", """  async function loadFromSupabase() {
    const units = await fetchTable('units', 1000);
    let projects = [];
    try {
      projects = await fetchTable('projects', 300);
    } catch (err) {
      console.warn('[Tycoons] projects table unavailable; using units-only mapping:', err.message);
    }
    const byId = {};
    projects.forEach((p) => { byId[p.id] = p; });

    let mapped = units
      .filter((u) => !isUnreliableRow(u))
      .map((u) => mapRow(u, byId[u.project_id]))
      .filter((p) => p.price > 0);

    const byRecency = [...mapped].sort((a, b) => (b._recency_ts || 0) - (a._recency_ts || 0));
    const launchSet = new Set(byRecency.filter((p) => p._launch_flag));
    for (const p of byRecency) {
      if (launchSet.size >= LAUNCH_COUNT) break;
      launchSet.add(p);
    }
    launchSet.forEach((p) => {
      p.is_launch = true;
      if (!p._launch_flag) { p.launch_en = 'New'; p.launch_ar = 'جديد'; }
    });

    const devCounts = {};
    mapped.forEach((p) => { const d = p.developer || '—'; const key = p.compound || p.id; devCounts[d] = devCounts[d] || new Set(); devCounts[d].add(key); });
    const developers = Object.keys(devCounts)
      .sort((a, b) => devCounts[b].size - devCounts[a].size)
      .slice(0, 8)
      .map((name) => ({ name, ar: name, projects: devCounts[name].size }));

    window.TYCOONS_DATA.PROJECTS = mapped;
    window.TYCOONS_DATA.DEVELOPERS = developers.length ? developers : window.TYCOONS_DATA.DEVELOPERS;
    window.dispatchEvent(new CustomEvent('tycoons:data-ready', { detail: { count: mapped.length, source: projects.length ? 'supabase' : 'supabase-units' } }));
  }

  loadFromSupabase""", s, flags=re.S)
p.write_text(s)

# ---------- ResultCard / Carousel / WA helper patch ----------
p = root/'asset_13.js'
s = p.read_text()
# add counter before dots
s = s.replace("""          <div style={{ position: 'absolute', bottom: 8, insetInlineStart: 0, insetInlineEnd: 0, zIndex: 2, display: 'flex', justifyContent: 'center', gap: 5 }}>
            {imgs.map((_, i) => (""", """          <div style={{ position: 'absolute', top: 8, insetInlineEnd: 8, zIndex: 2, padding: '3px 8px', borderRadius: 999, background: 'rgba(16,24,39,.62)', color: '#fff', fontSize: 11, fontFamily: 'var(--font-body)', border: '1px solid rgba(255,255,255,.18)', backdropFilter: 'blur(8px)' }}>
            {idx + 1} / {imgs.length}
          </div>
          <div style={{ position: 'absolute', bottom: 8, insetInlineStart: 0, insetInlineEnd: 0, zIndex: 2, display: 'flex', justifyContent: 'center', gap: 5 }}>
            {imgs.map((_, i) => (""")
helper = r'''
function TCFormatPlainPrice(n) {
  const v = Number(n || 0);
  return v ? v.toLocaleString('en-US') + ' EGP' : 'Price on request';
}
function TCWhatsAppTrackingId() {
  return 'wa_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}
function TCProjectUrl(p) {
  return (p && (p.image_url || p.brochure_url || p.video_url)) || window.location.href;
}
function TCBuildWhatsAppMessage(p, source) {
  const title = (p && (p.title_en || p.title_ar || p.compound)) || 'Tycoons property';
  const unitType = (p && (p.unit_type_raw || p.unit_type)) || '—';
  const bedrooms = (p && (p.bedrooms_text || (p.bedrooms ? `${p.bedrooms} bedrooms` : '—'))) || '—';
  const area = (p && (p.size_sqm || p.area_sqm)) ? `${p.size_sqm || p.area_sqm} sqm` : '—';
  const delivery = (p && p.delivery) || '—';
  const finishing = (p && p.finishing) || 'تفاصيل التشطيب تختلف حسب المشروع ونوع الوحدة.';
  const brochure = (p && p.brochure_url) || '—';
  const url = TCProjectUrl(p);
  return `Hello Tycoons Investments,
I am interested in this available unit:

Project: ${(p && p.compound) || title}
Developer: ${(p && p.developer) || '—'}
Location: ${(p && (p.location_text || p.area_raw || p.area)) || '—'}
Unit type: ${unitType}
Bedrooms: ${bedrooms}
Area: ${area}
Starting price: ${TCFormatPlainPrice(p && p.price)}
Delivery: ${delivery}
Finishing: ${finishing}

URL: ${url}
Brochure: ${brochure}

Please send me the latest availability and payment plan.

Source: ${source || 'unit_card'}
Page: ${window.location.href}
Tracking ID: ${TCWhatsAppTrackingId()}`;
}
window.TCBuildWhatsAppMessage = TCBuildWhatsAppMessage;
'''
s = s.replace("window.TCImageCarousel = TCImageCarousel;\n", "window.TCImageCarousel = TCImageCarousel;\n" + helper + "\n")
s = re.sub(r"  const waMsg = ar\n    \? `مهتم بـ .*?`;\n  const waHref = `https://wa.me/201200704344\?text=\$\{encodeURIComponent\(waMsg\)\}`;", """  const waMsg = TCBuildWhatsAppMessage(p, 'unit_card');
  const waHref = `https://wa.me/201200704344?text=${encodeURIComponent(waMsg)}`;""", s, flags=re.S)
p.write_text(s)

# ---------- Project page WA patch ----------
p = root/'asset_12.js'
s = p.read_text()
s = re.sub(r"  const waMsg = ar\n    \? `مهتم بـ .*?`;\n  const waHref = `https://wa.me/201200704344\?text=\$\{encodeURIComponent\(waMsg\)\}`;", """  const waMsg = window.TCBuildWhatsAppMessage ? window.TCBuildWhatsAppMessage(p, 'project_detail') : `Hello Tycoons Investments,\nI am interested in ${title}.`;
  const waHref = `https://wa.me/201200704344?text=${encodeURIComponent(waMsg)}`;""", s, flags=re.S)
p.write_text(s)

# ---------- Voice layer patch ----------
p = root/'asset_9.js'
s = p.read_text()
s = s.replace("""  function sttSupported() { return !!SR; }
  function ttsSupported() { return !!synth; }""", """  function sttSupported() { return !!SR; }
  function ttsSupported() { return !!synth; }
  function unsupportedReason() {
    if (SR) return '';
    return 'SpeechRecognition is not available in this browser. Use Chrome on desktop/Android for live voice search, or use text search here.';
  }""")
s = s.replace("""    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let finalText = '';""", """    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;
    let finalText = '';
    let lastText = '';
    let silenceTimer = null;
    function finishSoon() {
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => { try { rec.stop(); } catch (_) {} }, 1200);
    }""")
s = s.replace("""      if (interim) opts.onInterim && opts.onInterim((finalText + ' ' + interim).trim());
      if (finalText) opts.onFinal && opts.onFinal(finalText.trim());""", """      const combined = (finalText + ' ' + interim).trim();
      if (combined) lastText = combined;
      if (interim) opts.onInterim && opts.onInterim(combined);
      if (finalText) opts.onFinal && opts.onFinal(finalText.trim());
      if (combined) finishSoon();""")
s = s.replace("""    rec.onerror = (e) => opts.onError && opts.onError(e.error || 'error');
    rec.onend = () => opts.onEnd && opts.onEnd(finalText.trim());
    try { rec.start(); } catch (_) {}
    return () => { try { rec.stop(); } catch (_) {} };""", """    rec.onerror = (e) => { clearTimeout(silenceTimer); opts.onError && opts.onError(e.error || 'error'); };
    rec.onend = () => { clearTimeout(silenceTimer); opts.onEnd && opts.onEnd((finalText || lastText || '').trim()); };
    try { rec.start(); } catch (err) { opts.onError && opts.onError(err.message || 'start_failed'); }
    return () => { clearTimeout(silenceTimer); try { rec.stop(); } catch (_) {} };""")
s = s.replace("window.TC_VOICE = { sttSupported, ttsSupported, listen, speak, stopSpeaking, setSpeaker };", "window.TC_VOICE = { sttSupported, ttsSupported, unsupportedReason, listen, speak, stopSpeaking, setSpeaker };")
p.write_text(s)

# ---------- App mic UX patch ----------
p = root/'asset_5.js'
s = p.read_text()
s = s.replace("""    if (!window.TC_VOICE.sttSupported()) {
      // fallback: demo phrase typed then searched
      const demo = lang === 'ar' ? 'عايز شاليه في الساحل تحت ٩ مليون' : 'a chalet on the North Coast under 9 million';
      setVoiceState('listening');
      let i = 0;
      const iv = setInterval(() => {
        i++; setDraft(demo.slice(0, i));
        if (i >= demo.length) { clearInterval(iv); setVoiceState('idle'); runQuery(demo); }
      }, 45);
      return;
    }""", """    if (!window.TC_VOICE.sttSupported()) {
      const msg = lang === 'ar'
        ? 'البحث الصوتي المباشر محتاج متصفح بيدعم Speech Recognition. جرّبه على Chrome من الكمبيوتر أو Android، أو اكتب طلبك هنا وهيشتغل البحث عادي.'
        : 'Live voice search needs a browser with Speech Recognition. Try Chrome on desktop/Android, or type your request here and search will work normally.';
      setMessages((m) => [...m, { role: 'assistant', text: msg }]);
      setFsOpen(true);
      setVoiceState('idle');
      return;
    }""")
s = s.replace("""      onEnd: (final) => { setVoiceState('idle'); if (final && final.trim()) runQuery(final.trim()); },
      onError: () => { setVoiceState('idle'); },""", """      onEnd: (final) => { setVoiceState('idle'); if (final && final.trim()) runQuery(final.trim()); },
      onError: (err) => {
        setVoiceState('idle');
        const msg = lang === 'ar'
          ? `الميكروفون وقف أو مفيش سماح للصوت. السبب: ${err || 'غير معروف'}. افتح صلاحية الميكروفون وجرب تاني.`
          : `Microphone stopped or permission was denied. Reason: ${err || 'unknown'}. Allow microphone access and try again.`;
        setMessages((m) => [...m, { role: 'assistant', text: msg }]);
        setFsOpen(true);
      },""")
p.write_text(s)

# Copy patched root asset contents to hashed files in demos netlify
for asset, h in asset_map.items():
    src = root/asset
    dst = root/'demos/tycoons-site/netlify'/h
    if dst.exists():
        dst.write_text(src.read_text())

# Patch manifest content inside index.html and demos index.html using patched assets
def patch_manifest(html_path):
    text = html_path.read_text()
    m = re.search(r'<script type="__bundler/manifest">(.*?)</script>', text, re.S)
    if not m:
        return
    manifest = json.loads(m.group(1))
    for asset, h in asset_map.items():
        if h in manifest:
            raw = (root/asset).read_bytes()
            data = gzip.compress(raw, compresslevel=9)
            manifest[h]['data'] = base64.b64encode(data).decode('ascii')
            manifest[h]['compressed'] = True
            manifest[h]['mime'] = manifest[h].get('mime') or 'text/javascript'
    new_json = json.dumps(manifest, separators=(',', ':'))
    text2 = text[:m.start(1)] + new_json + text[m.end(1):]
    html_path.write_text(text2)

patch_manifest(root/'index.html')
patch_manifest(root/'demos/tycoons-site/netlify/index.html')

# Add readme
readme = root/'README_TYCOONS_NEW_DESIGN_PATCH.txt'
readme.write_text('''Tycoons new design patch - carousel + Supabase units mapping + organized WhatsApp + voice UX\n\nFiles changed:\n- index.html embedded bundle manifest\n- asset_5.js App voice handling\n- asset_6.js Supabase adapter\n- asset_9.js voice layer\n- asset_12.js project detail WhatsApp message\n- asset_13.js image carousel + unit card WhatsApp message\n- matching hashed files inside demos/tycoons-site/netlify\n\nWhat changed:\n1. Keeps the new design intact.\n2. Supabase can now work from the existing units table even if projects/project_id is missing.\n3. Carousel now merges image_url as first image + gallery_urls as remaining images, with arrows, dots, and 1 / N counter.\n4. WhatsApp messages are now organized and include Project, Developer, Location, Unit type, Bedrooms, Area, Starting price, Delivery, Finishing, URL, Brochure, Source, Page, Tracking ID.\n5. Voice search handling is safer: no fake demo fallback; unsupported browsers show a clear message, and supported browsers keep the final/interim transcript more reliably.\n\nImportant voice note:\nLive browser speech recognition depends on browser support and mic permission. It works best on Chrome desktop/Android. iPhone Safari may not support the Web Speech Recognition API.\n\nUpload instruction:\nUpload the package contents to GitHub as the new site files, then deploy through Netlify. No Supabase/GitHub upload was performed by ChatGPT.\n''')

print('Tycoons build patch applied: carousel + WhatsApp + Supabase mapping + voice UX')
