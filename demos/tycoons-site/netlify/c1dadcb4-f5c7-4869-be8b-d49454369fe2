/* Tycoons site — natural-language query parser (AR + EN).
   window.TC_INTENT.search(query, projects, lang) -> { items, filters, areaLabel }
   Pure client-side heuristic parse. On the real site this maps to the
   LLM tool-call that builds the same filter object against Supabase. */
(function () {
  const AR2LAT = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
  function normalize(q) {
    return String(q || '')
      .replace(/[٠-٩]/g, (d) => AR2LAT[d])
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .toLowerCase().trim();
  }

  function matchDict(dict, q) {
    for (const key of Object.keys(dict)) {
      const entry = dict[key];
      const keys = entry.keys || [];
      for (const k of keys) {
        if (q.includes(normalize(k))) return key;
      }
    }
    return null;
  }

  // budget words → EGP multiplier
  function parseBudget(q) {
    // capture "N million/مليون" or bare "N m"
    let max = null, min = null;
    const milMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:m|مليون|million|mil)/);
    let val = null;
    if (milMatch) val = parseFloat(milMatch[1]) * 1000000;
    else {
      const kMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:k|الف|ألف|thousand)/);
      if (kMatch) val = parseFloat(kMatch[1]) * 1000;
    }
    if (val != null) {
      const underWords = ['تحت', 'اقل من', 'اقل', 'حدود', 'في حدود', 'لحد', 'under', 'below', 'less than', 'max', 'up to', 'budget'];
      const overWords = ['فوق', 'اكتر من', 'اكثر من', 'من', 'over', 'above', 'more than', 'min', 'starting'];
      const isOver = overWords.some((w) => q.includes(normalize(w))) && !underWords.some((w) => q.includes(normalize(w)));
      if (isOver) min = val; else max = val;
    }
    return { max, min };
  }

  function parseBedrooms(q) {
    if (/(استوديو|studio)/.test(q)) return 1;
    if (/(غرفتين|روم?تين|2\s*(?:bed|bedroom|br|غرف|غرفه|غرفة))/.test(q)) return 2;
    if (/(3\s*(?:bed|bedroom|br|غرف|غرفه|غرفة)|تلات غرف|ثلاث غرف|تلاته غرف)/.test(q)) return 3;
    if (/(4\s*(?:bed|bedroom|br|غرف|غرفه|غرفة)|اربع غرف|أربع غرف)/.test(q)) return 4;
    if (/(5\s*(?:bed|bedroom|br|غرف|غرفه|غرفة)|خمس غرف)/.test(q)) return 5;
    return null;
  }

  function parseQuery(rawQuery) {
    const q = normalize(rawQuery);
    const D = window.TYCOONS_DATA;
    const area = matchDict(D.AREAS, q);
    const type = matchDict(D.TYPES, q);
    const { max, min } = parseBudget(q);
    const bedrooms = parseBedrooms(q);
    const ready = /(استلام فوري|استلام فورى|فوري|جاهز|جاهزه|ready|move now|immediate)/.test(q);
    const seaView = /(بحر|سي فيو|اطلاله بحر|إطلالة بحر|sea|beach|beachfront|waterfront)/.test(q);
    return { area, type, maxPrice: max, minPrice: min, bedrooms, ready, seaView };
  }

  // apply refine chips onto an existing filter set
  function applyRefine(filters, refineKey) {
    const f = { ...filters };
    switch (refineKey) {
      case 'cheaper':
        f.maxPrice = f.maxPrice ? Math.round(f.maxPrice * 0.8) : 7000000; break;
      case 'ready': f.ready = true; break;
      case 'sea': f.seaView = true; break;
      case 'beds2': f.bedrooms = 2; break;
      case 'longplan': f.minYears = 8; break;
      default: break;
    }
    return f;
  }

  function passes(p, f) {
    if (f.area && p.area !== f.area) return false;
    if (f.type && p.unit_type !== f.type) return false;
    if (f.maxPrice && p.price > f.maxPrice) return false;
    if (f.minPrice && p.price < f.minPrice) return false;
    if (f.bedrooms && p.bedrooms !== f.bedrooms) return false;
    if (f.ready && !(p.delivery === 'Ready' || (window.TC_HELPERS && window.TC_HELPERS.isReadyDelivery(p.delivery)))) return false;
    if (f.seaView && !p.sea_view) return false;
    if (f.minYears && p.payment_years < f.minYears) return false;
    return true;
  }

  // progressive relaxation so we (almost) always return something sensible
  function search(rawQuery, projects, lang, presetFilters) {
    const filters = presetFilters || parseQuery(rawQuery);
    const relaxOrder = ['minYears', 'seaView', 'bedrooms', 'ready', 'maxPrice', 'minPrice', 'type'];
    let active = { ...filters };
    let items = projects.filter((p) => passes(p, active));
    let relaxed = [];
    for (const key of relaxOrder) {
      if (items.length >= 2) break;
      if (active[key] != null && active[key] !== false) {
        relaxed.push(key);
        active = { ...active, [key]: (typeof active[key] === 'boolean' ? false : null) };
        items = projects.filter((p) => passes(p, active));
      }
    }
    // rank: launches first, then price ascending
    items = items.slice().sort((a, b) => (b.is_launch - a.is_launch) || (a.price - b.price));

    const D = window.TYCOONS_DATA;
    const areaLabel = filters.area ? D.AREAS[filters.area][lang === 'ar' ? 'ar' : 'en'] : null;
    return { items, filters, areaLabel, relaxed };
  }

  window.TC_INTENT = { parseQuery, search, applyRefine, normalize };
})();
