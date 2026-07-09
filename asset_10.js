/* Tycoons site — bilingual copy + formatting helpers (global: window.TC). */
(function () {
  const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  function toArabicDigits(s) {
    return String(s).replace(/[0-9]/g, (d) => AR_DIGITS[+d]);
  }

  // EGP formatter. Compact for large numbers; lang controls digits + label side.
  function formatEGP(n, lang) {
    const ar = lang === 'ar';
    let out;
    if (n >= 1000000) {
      const m = n / 1000000;
      const val = Number.isInteger(m) ? m.toFixed(0) : m.toFixed(1);
      out = ar ? `${toArabicDigits(val)} مليون جنيه` : `EGP ${val}M`;
    } else if (n >= 1000) {
      const k = Math.round(n / 1000);
      out = ar ? `${toArabicDigits(k)} ألف جنيه` : `EGP ${k}K`;
    } else {
      out = ar ? `${toArabicDigits(n)} جنيه` : `EGP ${n}`;
    }
    return out;
  }

  // full price with separators for the detail page
  function formatEGPFull(n, lang) {
    const grouped = n.toLocaleString('en-US');
    return lang === 'ar' ? `${toArabicDigits(grouped)} ج.م` : `EGP ${grouped}`;
  }

  const COPY = {
    ar: {
      nav: ['البحث', 'المشاريع', 'الطرح الجديد', 'الحاسبة', 'تواصل'],
      wa: 'واتساب',
      // concierge
      eyebrow: 'بحث عقاري بالذكاء الاصطناعي',
      h1a: 'ابحث بصوتك بأي حاجة تيجي في بالك،',
      h1b: 'وإحنا نوصّلك للعقار المناسب.',
      lede: 'اكتب أو اتكلم بطريقتك — «عايز شاليه في الساحل تحت ٩ مليون» — والنتائج تظهر هنا جوه المحادثة على طول، من غير ما تدوّر.',
      inputPlaceholder: 'عايز شاليه في الساحل أو آي فيلا في التجمع…',
      send: 'ابحث',
      listening: 'بسمعك…',
      tapToTalk: 'اضغط وابدأ اتكلم',
      thinking: 'بدوّر في مخزون Tycoons…',
      resultsLead: (n, area) => {
        const phrase = n === 1 ? 'نتيجة واحدة مناسبة' : n === 2 ? 'نتيجتين مناسبين' : `${toArabicDigits(n)} نتايج مناسبة`;
        return `لقيتلك ${phrase}${area ? ' في ' + area : ''}. دي أقرب الوحدات لطلبك:`;
      },
      noResults: 'مفيش نتيجة مطابقة تمامًا — جرّب توسّع الميزانية أو المنطقة، أو قولّي بطريقة تانية.',
      refineHint: 'عدّل طلبك:',
      refines: ['أرخص شوية', 'استلام فوري', 'قريّب من البحر', 'غرفتين بس', 'أقساط أطول'],
      viewProject: 'تفاصيل المشروع',
      examplesLabel: 'جرّب:',
      // sections
      launchesEyebrow: 'الطرح الجديد',
      launchesTitle: 'بتتطرح دلوقتي',
      launchesSub: 'أول فرصة لمشاريع لسه نازلة — من المطوّرين مباشرة، قبل السوق كله.',
      areasEyebrow: 'استكشف بالمنطقة',
      areasTitle: 'مناطق مميزة',
      areasSub: 'اختار منطقة والمساعد يبدأ البحث فيها فورًا.',
      devsEyebrow: 'شركاء موثوقون',
      devsTitle: 'مطوّرون موثوقون',
      devsSub: 'كل الوحدات مباشرة من المطوّر — بيانات وأسعار موثّقة، من غير وسطاء وهميين.',
      devProjects: (n) => `${toArabicDigits(n)} مشروع`,
      calcEyebrow: 'خطّط قبل ما تسأل',
      calcTitle: 'حاسبة الأقساط',
      calcSub: 'اعرف القسط الشهري التقريبي قبل ما تكلّم أي حد.',
      calcPrice: 'سعر الوحدة',
      calcDown: 'المقدم',
      calcYears: 'مدة التقسيط',
      calcMonthly: 'القسط الشهري التقريبي',
      calcYearsUnit: (y) => {
        const word = y === 1 ? 'سنة' : y === 2 ? 'سنتين' : y <= 10 ? 'سنين' : 'سنة';
        return `${toArabicDigits(y)} ${word}`;
      },
      calcDownAmount: 'قيمة المقدم',
      popularEyebrow: 'الأكثر بحثًا',
      popularTitle: 'بحث سريع',
      popular: ['شاليه في الساحل', 'آي فيلا في التجمع', 'شقة تحت ٧ مليون', 'استلام فوري', 'فيلا في زايد', 'بنتهاوس في العاصمة'],
      trust: [
        { t: 'موثّق من المطوّر', d: 'كل وحدة مباشرة من الشركة المطوّرة — مفيش إعلانات مكررة ولا أسعار وهمية.' },
        { t: 'أقساط تناسبك', d: 'خطط سداد لحد ١٠ سنين، وحاسبة قسط شفافة على كل مشروع.' },
        { t: 'رد فوري على واتساب', d: 'المساعد بيكمّل معاك على واتساب بتفاصيل الوحدة اللي عايزها.' },
      ],
      // project page
      back: 'رجوع',
      keyFacts: 'أهم التفاصيل',
      fArea: 'المساحة', fBeds: 'غرف النوم', fDelivery: 'الاستلام', fDown: 'المقدم', fType: 'النوع', fDeveloper: 'المطوّر',
      amenities: 'المميزات',
      similar: 'وحدات مشابهة',
      similarSub: 'نفس المنطقة أو النوع — قريبة من اللي بتدوّر عليه.',
      startPrice: 'يبدأ من',
      askWa: 'كن الأول — اسأل على واتساب',
      askWaShort: 'اسأل على واتساب',
      ready: 'استلام فوري',
      galleryNote: 'صور المشروع',
      status: { available: 'متاح', limited: 'كميات محدودة', sold_out: 'اكتمل الحجز' },
      seeMore: 'عرض المزيد',
      showLess: 'عرض أقل',
    },
    en: {
      nav: ['Search', 'Projects', 'New Launches', 'Calculator', 'Contact'],
      wa: 'WhatsApp',
      eyebrow: 'AI-powered property search',
      h1a: 'Search by voice for anything on your mind,',
      h1b: 'we’ll get you to the right property.',
      lede: 'Type or talk your way — “a chalet on the North Coast under 9M” — and results appear right here inside the conversation, no scrolling required.',
      inputPlaceholder: 'a chalet on the North Coast, or an iVilla in New Cairo…',
      send: 'Search',
      listening: 'Listening…',
      tapToTalk: 'Tap and start talking',
      thinking: 'Searching Tycoons inventory…',
      resultsLead: (n, area) => `Found ${n} ${n === 1 ? 'match' : 'matches'}${area ? ' in ' + area : ''}. Here are the closest units to your request:`,
      noResults: 'No exact match — try widening your budget or area, or rephrase it for me.',
      refineHint: 'Refine:',
      refines: ['Cheaper', 'Ready to move', 'Closer to the sea', '2 bedrooms', 'Longer plan'],
      viewProject: 'View project',
      examplesLabel: 'Try:',
      launchesEyebrow: 'New launches',
      launchesTitle: 'Launching Now',
      launchesSub: 'First access to brand-new projects — straight from developers, before the general market.',
      areasEyebrow: 'Explore by area',
      areasTitle: 'Featured areas',
      areasSub: 'Pick an area and the assistant starts searching it instantly.',
      devsEyebrow: 'Trusted partners',
      devsTitle: 'Trusted developers',
      devsSub: 'Every unit direct from the developer — verified data and prices, no fake middlemen.',
      devProjects: (n) => `${n} projects`,
      calcEyebrow: 'Plan before you ask',
      calcTitle: 'Installment calculator',
      calcSub: 'Know the approximate monthly installment before you talk to anyone.',
      calcPrice: 'Unit price',
      calcDown: 'Down payment',
      calcYears: 'Plan length',
      calcMonthly: 'Approx. monthly installment',
      calcYearsUnit: (y) => `${y} years`,
      calcDownAmount: 'Down payment amount',
      popularEyebrow: 'Most searched',
      popularTitle: 'Quick search',
      popular: ['Chalet on the North Coast', 'iVilla in New Cairo', 'Apartment under 7M', 'Ready to move', 'Villa in Zayed', 'Penthouse in New Capital'],
      trust: [
        { t: 'Developer-verified', d: 'Every unit is direct from the developer — no duplicate ads, no fake prices.' },
        { t: 'Plans that fit', d: 'Payment plans up to 10 years, with a transparent installment calculator on every project.' },
        { t: 'Instant on WhatsApp', d: 'The assistant continues on WhatsApp with the exact unit details you want.' },
      ],
      back: 'Back',
      keyFacts: 'Key facts',
      fArea: 'Size', fBeds: 'Bedrooms', fDelivery: 'Delivery', fDown: 'Down pmt', fType: 'Type', fDeveloper: 'Developer',
      amenities: 'Amenities',
      similar: 'Similar units',
      similarSub: 'Same area or type — close to what you’re looking for.',
      startPrice: 'Starting price',
      askWa: 'Be first — ask on WhatsApp',
      askWaShort: 'Ask on WhatsApp',
      ready: 'Ready to move',
      galleryNote: 'Project imagery',
      status: { available: 'Available', limited: 'Limited', sold_out: 'Sold out' },
      seeMore: 'See more',
      showLess: 'Show less',
    },
  };

  window.TC = { COPY, formatEGP, formatEGPFull, toArabicDigits };
})();
