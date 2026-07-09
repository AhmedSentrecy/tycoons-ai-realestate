/* Tycoons site — Supabase data adapter.
   Fetches `projects` + `units` via the REST API (anon key, read-only) and
   normalizes rows into the same shape data.js's mock uses, so every
   component keeps working unchanged. Falls back to the bundled mock data
   (already loaded by data.js) if the fetch fails for any reason.

   Schema assumptions (tell me if your columns differ and I'll adjust):
   projects: id, name, developer, location, min_price, image_url,
             gallery_urls (comma-separated URL string), is_new_launch,
             status, delivery_text
   units:    id, project_id, unit_type, bedrooms_text, area_sqm,
             starting_price, image_url, gallery_urls, status,
             delivery_text, down_payment_pct, payment_years
*/
(function () {
  const SUPABASE_URL = 'https://coqnjymekrkoausiiytm.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvcW5qeW1la3Jrb2F1c2lpeXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDg3NjYsImV4cCI6MjA5NzM4NDc2Nn0.EIaGjkVORMuHelyUuMIA8EinAIlyY84sqQpgnEjPxEY';

  function normalizeTxt(s) {
    return String(s || '')
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .toLowerCase().trim();
  }

  // best-effort match of a free-text location/unit-type string against our
  // known AREAS/TYPES dictionaries (data.js). Returns the slug or null.
  function resolveKey(dict, text) {
    const n = normalizeTxt(text);
    if (!n) return null;
    for (const key of Object.keys(dict)) {
      const keys = dict[key].keys || [];
      if (keys.some((k) => n.includes(normalizeTxt(k)))) return key;
    }
    return null;
  }

  function parseGallery(row) {
    const raw = row.gallery_urls;
    if (!raw) return row.image_url ? [row.image_url] : [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    return String(raw).split(',').map((s) => s.trim()).filter(Boolean);
  }

  function parseBedrooms(text) {
    const n = normalizeTxt(text);
    if (!n) return null;
    if (/استوديو|studio/.test(n)) return 1;
    const m = n.match(/\d+/);
    return m ? parseInt(m[0], 10) : null;
  }

  function isReadyDelivery(text) {
    return /ready|جاهز|فور|استلام فوري/i.test(String(text || ''));
  }
  window.TC_HELPERS = { isReadyDelivery, resolveKey, normalizeTxt };

  // "20%", "5% down payment + 5% after 3 months" -> 20 / 5. Falls back to 10.
  function parseDownPct(text) {
    const m = String(text || '').match(/(\d+(?:\.\d+)?)\s*%/);
    return m ? Math.round(parseFloat(m[1])) : 10;
  }
  // "20% on delivery - 5 years", "Installments over 10 years" -> 5 / 10. Falls back to 7.
  function parsePaymentYears(text) {
    const m = String(text || '').match(/(\d+(?:\.\d+)?)\s*(?:year|yr|سن)/i);
    return m ? Math.round(parseFloat(m[1])) : 7;
  }

  function normalizeStatus(s) {
    const n = normalizeTxt(s);
    if (/sold|مباع|اكتمل/.test(n)) return 'sold_out';
    if (/limited|محدود/.test(n)) return 'limited';
    return 'available';
  }

  // Some rows are explicitly marked by the source as not-yet-verified
  // (scraped from chat, pending manual review) — keep them out of the
  // searchable marketplace entirely rather than show incomplete cards.
  function isUnreliableRow(unit) {
    const s = normalizeTxt(unit.availability_status);
    return s === 'review_only' || s === 'not_confirmed';
  }
  function isLaunchSignal(unit) {
    const s = normalizeTxt(unit.availability_status);
    return s === 'new_launch' || s === 'new release';
  }
  // The source uses "Launch / Project Card" as a placeholder unit_type on
  // launch-announcement rows scraped from marketing messages — it isn't a
  // real unit type, so never surface it as one.
  function isPlaceholderType(text) {
    return /launch\s*\/\s*project card/i.test(String(text || ''));
  }

  // Egypt-market defaults when a numeric field genuinely isn't in the row.
  const FALLBACK_DOWN_PCT = 10;
  const FALLBACK_PAYMENT_YEARS = 7;

  // "New Launches" is driven purely by recency now — no fixed date window.
  // Whatever you add to Supabase most recently floats to the top of the
  // section automatically, so it self-refreshes on every insert without any
  // status needing to be toggled or aging out on a timer. Explicitly-flagged
  // launch rows are always included; the rest of the slots fill with the
  // newest listings by timestamp.
  const LAUNCH_COUNT = 9;

  function mostRecentDate(unit, project) {
    const dates = [unit.last_updated_at, unit.created_at, project && project.last_updated_at, project && project.created_at]
      .filter(Boolean).map((d) => new Date(d).getTime()).filter((n) => !isNaN(n));
    return dates.length ? Math.max(...dates) : null;
  }

  async function fetchTable(name, limit) {
    const url = `${SUPABASE_URL}/rest/v1/${name}?select=*&limit=${limit}`;
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!res.ok) throw new Error(`${name} fetch failed: ${res.status}`);
    return res.json();
  }

  function mapRow(unit, project) {
    const D = window.TYCOONS_DATA;
    const locationText = (project && project.location) || '';
    const placeholderType = isPlaceholderType(unit.unit_type);
    const typeText = placeholderType ? '' : (unit.unit_type || '');
    const areaKey = resolveKey(D.AREAS, locationText);
    const typeKey = placeholderType ? null : resolveKey(D.TYPES, typeText);
    const gallery = parseGallery(unit.gallery_urls ? unit : (project || unit));
    const price = unit.starting_price ?? (project && project.min_price) ?? 0;
    const deliveryText = unit.delivery_text || (project && project.delivery_text) || '';
    const compound = (project && project.name) || 'Tycoons project';
    const developer = (project && project.developer) || '—';
    const title = typeText ? `${typeText} ${compound}`.trim() : compound;
    const seaView = /بحر|sea|beach/i.test(locationText + ' ' + compound);
    const downText = unit.down_payment_text || (project && project.down_payment_text) || '';
    const yearsText = unit.installments_text || (project && project.installments_text) || '';
    const status = unit.availability_status || unit.status || (project && project.status);
    const bedrooms = placeholderType ? null : parseBedrooms(unit.bedrooms_text);
    const sizeSqm = unit.area_sqm ? Math.round(unit.area_sqm) : null;
    const recencyTs = mostRecentDate(unit, project);
    const launchFlag = isLaunchSignal(unit);

    return {
      id: `u-${unit.id}`,
      developer,
      compound,
      unit_type: typeKey || (typeText || null),
      unit_type_raw: !typeKey ? (typeText || null) : null,
      area: areaKey || locationText,
      area_raw: !areaKey ? locationText : null,
      title_ar: title, title_en: title,
      price: Number(price) || 0,
      bedrooms,
      size_sqm: sizeSqm,
      delivery: isReadyDelivery(deliveryText) ? 'Ready' : (deliveryText || '—'),
      down_pct: unit.down_payment_pct ?? parseDownPct(downText) ?? FALLBACK_DOWN_PCT,
      payment_years: unit.payment_years ?? parsePaymentYears(yearsText) ?? FALLBACK_PAYMENT_YEARS,
      sea_view: seaView,
      status: normalizeStatus(status),
      is_launch: false,
      _launch_flag: launchFlag,
      _project_id: unit.project_id,
      _recency_ts: recencyTs,
      launch_ar: 'بتتطرح دلوقتي', launch_en: 'Launching Now',
      image_url: gallery[0] || unit.image_url || (project && project.image_url) || null,
      gallery: gallery.length ? gallery : (unit.image_url ? [unit.image_url] : []),
      amenities_ar: [], amenities_en: [],
    };
  }

  async function loadFromSupabase() {
    const [units, projects] = await Promise.all([
      fetchTable('units', 1000),
      fetchTable('projects', 300),
    ]);
    const byId = {};
    projects.forEach((p) => { byId[p.id] = p; });

    let mapped = units
      .filter((u) => !isUnreliableRow(u))
      .map((u) => mapRow(u, byId[u.project_id]))
      .filter((p) => p.price > 0);

    // New Launches = newest additions, self-refreshing on every insert.
    // Explicitly-flagged launch rows always qualify; remaining slots fill
    // with the most-recently-added listings by timestamp. Nothing ages out
    // on a timer — the moment you add a row to Supabase it surfaces here.
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

    // dynamic developer roster (project counts, since units-per-developer
    // would double count multi-unit projects)
    const devCounts = {};
    projects.forEach((p) => { const d = p.developer || '—'; devCounts[d] = (devCounts[d] || 0) + 1; });
    const developers = Object.keys(devCounts)
      .sort((a, b) => devCounts[b] - devCounts[a])
      .slice(0, 8)
      .map((name) => ({ name, ar: name, projects: devCounts[name] }));

    window.TYCOONS_DATA.PROJECTS = mapped;
    window.TYCOONS_DATA.DEVELOPERS = developers.length ? developers : window.TYCOONS_DATA.DEVELOPERS;
    window.dispatchEvent(new CustomEvent('tycoons:data-ready', { detail: { count: mapped.length, source: 'supabase' } }));
  }

  loadFromSupabase().catch((err) => {
    console.warn('[Tycoons] Supabase fetch failed, staying on mock data:', err.message);
    window.dispatchEvent(new CustomEvent('tycoons:data-ready', { detail: { count: window.TYCOONS_DATA.PROJECTS.length, source: 'mock', error: err.message } }));
  });
})();
