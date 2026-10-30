"use strict";

// Fixed buyer guides served at /guides/<slug>/ and /en/guides/<slug>/ (rewritten 30 Oct 2026).
// Each guide: { title (H1), seo_title, description, summary, modified, sections: [[heading, paragraphs[]]],
// faq: [[q, a]] }. Worked examples use round illustrative numbers; market figures come from
// Tycoons' own inventory in October 2026 and are labelled as such. No external site names.
//
// Retired 30 Oct 2026 (merged into the area guides, see netlify.toml):
//   /guides/new-cairo-property-prices/ and /en/guides/new-cairo-property-prices/ -> New Cairo area page
//   /guides/north-coast-chalet-guide/ -> North Coast area page

const GUIDES = {
  "payment-plan-comparison": {
    title: "إزاي تقارن خطط سداد العقارات؟",
    seo_title: "إزاي تقارن خطط سداد العقارات 2026 — مقدم 3% ولا 10%؟",
    description: "دليل عملي لمقارنة أنظمة السداد في مصر 2026: المقدم الحقيقي، والقسط، والفلوس اللي محتاجها أول سنتين، وخصم المدة الأقصر، بأمثلة بالأرقام.",
    summary: "حوّل كل نظام سداد لجدول فلوس: المقدم والدفعات اللي بعده، والقسط السنوي والشهري، والفلوس اللي محتاجها أول سنتين، والسعر الكلي. المقدم الأقل مش دايمًا الأرخص، والمدة الأقصر غالبًا بتيجي بخصم كبير.",
    modified: "2026-10-30",
    sections: [
      ["ليه المقارنة دي مهمة؟", [
        "في السوق المصري دلوقتي، نفس الوحدة ممكن تتعرض بأكتر من نظام سداد: مقدم 3% على 12 سنة، أو 5% + 5% على 8 سنين، أو 10% على 6 سنين، أو كاش بخصم. الاختلاف بين الأنظمة دي ممكن يفرق ملايين في السعر الكلي، وأكتر من كده في الضغط على ميزانيتك كل شهر.",
        "المشتري غالبًا بيبص على المقدم بس، لأنه أول رقم بيسمعه. بس المقدم هو أصغر جزء في القرار. الدليل ده بيوريك تقارن بـ 5 أرقام: المقدم الحقيقي، والقسط، والفلوس اللي محتاجها أول سنتين، والسعر الكلي، والمخاطر."
      ]],
      ["الرقم الأول: المقدم الحقيقي", [
        "المقدم الحقيقي هو كل اللي هتدفعه قبل أول قسط عادي: جدية الحجز + المقدم + أي دفعة تانية بعد شهور قليلة. نظام \"5% + 5% بعد 3 شهور\" معناه إن المقدم الحقيقي 10% مش 5%.",
        "في المخزون عندنا (أكتوبر 2026) أنظمة كتير بالشكل ده: Rivers وMarBay وFouka Bay بنظام 5% + 5%، وJirian بنظام 5% حجز + 5% تعاقد، وZomra East بمقدم 2.5% وبعده 2.5% بعد شهر و5% بعد 6 شهور و5% عند الاستلام. يعني \"2.5%\" في الإعلان بيبقى 15% على مدار الأقساط الأولى والاستلام.",
        "اسأل دايمًا: إيه المبلغ اللي هدفعه بالجنيه في أول 6 شهور؟"
      ]],
      ["الرقم التاني: القسط", [
        "خلينا ناخد وحدة سعرها 10 مليون جنيه بالتقسيط، ونقارن 3 أنظمة شائعة (أرقام توضيحية بأقساط متساوية):",
        "نظام (أ) مقدم 3% على 12 سنة: المقدم 300 ألف، والباقي 9.7 مليون على 12 سنة، يعني حوالي 808 ألف في السنة، أو حوالي 202 ألف كل 3 شهور، أو حوالي 67 ألف في الشهر.",
        "نظام (ب) مقدم 5% + 5% على 8 سنين: المقدم الحقيقي مليون في أول 3 شهور، والباقي 9 مليون على 8 سنين، يعني حوالي 1.125 مليون في السنة، أو حوالي 281 ألف كل 3 شهور، أو حوالي 94 ألف في الشهر.",
        "نظام (ج) مقدم 10% على 6 سنين: المقدم مليون، والباقي 9 مليون على 6 سنين، يعني 1.5 مليون في السنة، أو 375 ألف كل 3 شهور، أو 125 ألف في الشهر.",
        "الفرق في القسط الشهري بين (أ) و(ج) حوالي 58 ألف جنيه. ده الرقم اللي لازم تقارنه بدخلك الحقيقي، مش بالمقدم."
      ]],
      ["الرقم التالت: الفلوس اللي محتاجها أول سنتين", [
        "أول سنتين هما أصعب فترة، لأن فيهم المقدم وأول أقساط، وغالبًا مصاريف تانية زي جدية الحجز والتشطيب لو الوحدة قريبة من الاستلام. على نفس الوحدة اللي بـ 10 مليون:",
        "نظام (أ): حوالي 1.92 مليون (300 ألف مقدم + سنتين أقساط). نظام (ب): حوالي 3.25 مليون. نظام (ج): حوالي 4 مليون.",
        "لو الفلوس اللي معاك ودخلك في السنتين دول ميغطوش الرقم ده بهامش أمان، يبقى النظام ده مش مناسب ليك حتى لو المقدم صغير."
      ]],
      ["الرقم الرابع: السعر الكلي وخصم المدة الأقصر", [
        "كتير من المطورين بيدّوا خصم كبير لو اخترت مدة أقصر، لأن الفلوس اللي بتوصلهم بدري ليها قيمة أكبر. مثال حقيقي من المخزون عندنا: في 97 Hills من بالم هيلز، النظام الأصلي مقدم 2.8% على 10 سنين، وفيه أنظمة بمقدم حوالي 2.83% وخصم حوالي 15% على 9 سنين، و19% على 8 سنين، و24% على 7 سنين، و29% على 6 سنين.",
        "على وحدة سعرها 10 مليون في النظام الأصلي: على 10 سنين هتدفع حوالي 972 ألف في السنة. على 6 سنين بخصم 29% السعر بيبقى حوالي 7.1 مليون، والقسط حوالي 1.15 مليون في السنة. يعني بتدفع حوالي 178 ألف زيادة في السنة، وبتوفر حوالي 2.9 مليون في السعر الكلي.",
        "القاعدة: لو تقدر تتحمل القسط الأعلى بأمان، المدة الأقصر بخصم غالبًا أوفر بكتير. ولو مش متأكد من دخلك، المدة الأطول بتديك أمان أكتر حتى لو أغلى."
      ]],
      ["الرقم الخامس: المخاطر", [
        "اختبر النظام تحت سيناريو صعب: لو دخلك قل 20%، أو اتأخرت في بيع وحدة تانية، أو احتجت فلوس للطوارئ. هل هتقدر تكمل الأقساط؟ لو الإجابة لأ، النظام ده مخاطرته عالية عليك.",
        "اسأل كمان عن غرامة التأخير في الأقساط، وعن إمكانية التعجيل بخصم، وعن شروط إلغاء التعاقد والمبلغ اللي بيرجع."
      ]],
      ["دفعات ممكن تكون مخفية في الجدول", [
        "دفعة الاستلام: بعض المشاريع بتطلب 5% أو 10% عند الاستلام، زي Azad Walk (10% مقدم + 10% عند الاستلام) وZomra East (5% عند الاستلام).",
        "وديعة الصيانة: غالبًا بين 8% و10% من سعر الوحدة، وبتتدفع قبل الاستلام أو معاه. في الساحل ممكن تبقى أعلى.",
        "الدفعات السنوية: بعض الأنظمة فيها قسط ربع سنوي + دفعة سنوية أكبر، وده بيغير الضغط على ميزانيتك.",
        "الجراج ونادي الكمبوند: في بعض المشاريع بيتدفعوا لوحدهم."
      ]],
      ["إيه الأنسب ليك؟", [
        "لو معاك فلوس قليلة دلوقتي ودخلك ثابت: نظام مقدم صغير ومدة طويلة (زي 3% على 12 سنة في مشاريع ماونتن فيو، أو 2.5% في Hacienda Blue).",
        "لو معاك سيولة كويسة: المدة الأقصر بخصم، أو الكاش لو الخصم كبير.",
        "لو بتشتري للاستثمار وهتبيع قبل الاستلام: اسأل عن رسوم التنازل، وخلي في بالك إن سعر إعادة البيع قبل الاستلام بيتأثر بالأقساط اللي لسه فاضلة.",
        "ابعتلنا الوحدة وأنظمة السداد المعروضة عليك، ونطلعلك جدول مقارنة بالأرقام الخمسة دي."
      ]]
    ],
    faq: [
      ["مقدم 3% على 12 سنة ولا 10% على 6 سنين أحسن؟", "على وحدة بـ 10 مليون: 3% على 12 سنة قسطها حوالي 67 ألف في الشهر ومحتاجة حوالي 1.9 مليون أول سنتين، و10% على 6 سنين قسطها 125 ألف في الشهر ومحتاجة حوالي 4 مليون أول سنتين. الأول أسهل على الميزانية، والتاني غالبًا أرخص في السعر الكلي لو فيه خصم."],
      ["يعني إيه 5% + 5%؟", "إن المقدم الحقيقي 10%: 5% عند الحجز و5% تانية بعد فترة قصيرة (غالبًا 3 شهور أو مع أول قسط)."],
      ["المدة الأقصر بتوفر قد إيه؟", "حسب المطور. مثال من 97 Hills: خصم حوالي 29% لو اخترت 6 سنين بدل 10، يعني على وحدة بـ 10 مليون بتوفر حوالي 2.9 مليون مقابل قسط سنوي أعلى بحوالي 178 ألف."],
      ["وديعة الصيانة بتتدفع إمتى؟", "غالبًا قبل الاستلام أو معاه، ونسبتها في أغلب المشاريع بين 8% و10% من سعر الوحدة. اطلبها مكتوبة في العقد."],
      ["إزاي أعرف النظام مناسب لدخلي؟", "احسب الفلوس اللي محتاجها أول سنتين والقسط الشهري، واختبرهم لو دخلك قل 20%. لو مش هتقدر تكمل، اختار مدة أطول أو وحدة أصغر."],
      ["هل التقسيط الطويل فيه فوايد؟", "أغلب المطورين بيقولوا \"بدون فوايد\"، بس سعر التقسيط نفسه أعلى من سعر الكاش أو المدة الأقصر. الفرق ده هو تكلفة التمويل."]
    ]
  },

  "off-plan-buying-checklist": {
    title: "دليل شراء عقار تحت الإنشاء (Off-plan) في مصر",
    seo_title: "شراء عقار تحت الإنشاء في مصر 2026 — قائمة المراجعة الكاملة",
    description: "قائمة مراجعة كاملة قبل شراء وحدة تحت الإنشاء في مصر 2026: المطور، والأرض والتراخيص، والعقد، والمساحة، والتشطيب، والاستلام، والسداد، والصيانة.",
    summary: "قبل ما تدفع جدية حجز في وحدة تحت الإنشاء، راجع 8 حاجات: سجل المطور في التسليم، وملكية الأرض والتراخيص، وبنود العقد، وتعريف المساحة، ومواصفات التشطيب، وميعاد الاستلام وغرامة التأخير، وجدول السداد الكامل، والمصاريف بعد الاستلام.",
    modified: "2026-10-30",
    sections: [
      ["ليه الشراء تحت الإنشاء مختلف؟", [
        "أغلب المعروض الجديد في مصر بيتباع تحت الإنشاء (Off-plan)، يعني بتشتري وحدة لسه ماتبنتش، بمقدم صغير وتقسيط طويل. ده بيخلي الشراء أسهل في الأول، بس بيخليك معتمد على المطور لسنين لحد ما تستلم.",
        "المخاطر الأساسية: تأخير الاستلام، أو وحدة مختلفة عن الكلام اللي اتقال، أو مصاريف ماكنتش محسوبة، أو صعوبة إعادة البيع قبل الاستلام. القائمة دي معمولة علشان تقلل المخاطر دي قبل ما تدفع أي فلوس."
      ]],
      ["1. سجل المطور", [
        "اسأل عن مشاريع المطور اللي اتسلمت فعلًا، وزور واحد منها. شوف التشطيب والصيانة وحالة الخدمات، واتكلم مع سكان لو تقدر.",
        "قارن ميعاد التسليم اللي كان معلن في مشاريعه القديمة بالميعاد الفعلي. مطور سلّم متأخر سنة في مشروعين قبل كده، غالبًا هيتأخر تاني.",
        "المطورين الكبار المقيدين في البورصة زي Palm Hills وSODIC وMadinet Masr بينشروا أرقام مبيعات وتسليمات، وده بيديك صورة أوضح. ومطورين زي Mountain View بيعلنوا أرقام التسليم، زي تسليم حوالي 1,800 وحدة في النص الأول من 2026."
      ]],
      ["2. الأرض والتراخيص", [
        "اسأل: الأرض ملك المطور ولا شراكة مع جهة تانية (زي هيئة المجتمعات العمرانية أو مطور رئيسي زي مدار في مستقبل سيتي أو مدن في رأس الحكمة)؟ ولو شراكة، إيه نوعها؟",
        "اطلب تشوف القرار الوزاري للمشروع ورخصة البناء للمرحلة اللي فيها وحدتك. المرحلة اللي لسه ماخدتش رخصة مخاطرتها أعلى في التأخير.",
        "لو حاسس إن الموضوع معقد، خلي محامي مستقل يراجع الأوراق دي قبل التعاقد."
      ]],
      ["3. بنود العقد", [
        "اقرا العقد كله قبل ما تمضي، مش ملخص السيلز. أهم البنود: ميعاد الاستلام وفترة السماح، والتعويض لو المطور اتأخر، وغرامة تأخيرك انت في الأقساط، وشروط الإلغاء والمبلغ اللي بيرجع، ورسوم التنازل لو حبيت تبيع قبل الاستلام.",
        "فترة السماح بعد ميعاد الاستلام غالبًا بين 6 شهور وسنة. لو العقد مفيهوش تعويض واضح بعد فترة السماح، ده بند لازم تتفاوض عليه.",
        "اتأكد إن كل وعد من السيلز (تشطيب، جنينة، إطلالة، خصم) مكتوب في العقد أو ملحق مختوم."
      ]],
      ["4. المساحة: إجمالي ولا صافي؟", [
        "أغلب المساحات في مصر بتتباع \"إجمالي\"، يعني بتشمل نصيبك من السلم والممرات والجدران (نسبة التحميل). نسبة التحميل غالبًا بين 15% و25% في الشقق.",
        "وحدة 150 متر إجمالي بنسبة تحميل 20% صافيها حوالي 120 متر. علشان كده قارن سعر المتر بالصافي لو تقدر، واطلب المساحة الصافية مكتوبة.",
        "في الفلل والتاون هاوس، اسأل عن مساحة الأرض ومساحة المباني ومساحة الجنينة كل واحدة لوحدها."
      ]],
      ["5. التشطيب والمواصفات", [
        "فيه 4 مستويات شائعة: كور آند شل (من غير تشطيب داخلي)، ونص تشطيب، وتشطيب كامل، وتشطيب كامل بتكييفات أو مطبخ. الفرق بينهم ممكن يوصل لـ 15 أو 20 ألف جنيه للمتر.",
        "اطلب ملحق المواصفات: نوع الأرضيات والأبواب والشبابيك والسباكة والكهربا. \"تشطيب سوبر لوكس\" من غير مواصفات مكتوبة مش معناه حاجة.",
        "مثال: في Mountain View 1.1 الشقق نص تشطيب، والآي فيلا كور آند شل، والفلل الجاهزة تشطيب كامل. يعني نفس الكمبوند فيه 3 مستويات."
      ]],
      ["6. ميعاد الاستلام", [
        "اسأل عن نسبة التنفيذ في المرحلة بتاعتك، وزور الموقع بنفسك. مشروع لسه في الحفر ومكتوب إن استلامه بعد سنتين، غالبًا هيتأخر.",
        "المشاريع اللي فيها مراحل اتسلمت بتديك ثقة أكبر في ميعاد المراحل الجاية. ولو محتاج تسكن في ميعاد محدد، اشتري وحدة استلامها أقرب بكتير من الميعاد ده."
      ]],
      ["7. جدول السداد الكامل", [
        "اطلب جدول السداد بالجنيه مش بالنسب: كل دفعة وميعادها. ودور على الدفعات المخفية: الدفعة التانية بعد المقدم، ودفعة الاستلام، والدفعات السنوية.",
        "عندنا دليل منفصل عن مقارنة أنظمة السداد بأمثلة بالأرقام: إزاي تقارن خطط سداد العقارات."
      ]],
      ["8. المصاريف بعد الاستلام", [
        "وديعة الصيانة غالبًا بين 8% و10% من سعر الوحدة، ورسوم الكلوب هاوس، والجراج لو منفصل، وعدادات الكهربا والمية والغاز، والتشطيب لو الوحدة مش متشطبة.",
        "وعند البيع بعدين فيه ضريبة التصرفات العقارية 2.5% من قيمة البيع، ورسوم التنازل عند المطور لو بتبيع قبل التسجيل.",
        "احسب المصاريف دي من الأول، لأنها ممكن توصل لـ 15% أو أكتر من سعر الوحدة."
      ]],
      ["خطوات الشراء بالترتيب", [
        "الاختيار والمقارنة، وبعدين جدية الحجز (EOI) وغالبًا بترجع لو مااتعملش تعاقد، وبعدين الحجز ودفع المقدم، وبعدين العقد. ماتدفعش المقدم كامل قبل ما تقرا العقد.",
        "خلي كل الإيصالات والمراسلات مع المطور مكتوبة ومحفوظة. ولو عايز مساعدة في مقارنة العروض أو مراجعة الجدول، ابعتلنا."
      ]]
    ],
    faq: [
      ["إيه أهم حاجة أراجعها قبل شراء وحدة تحت الإنشاء؟", "سجل المطور في التسليم: زور مشروع مسلّم ليه، وقارن مواعيد التسليم المعلنة بالفعلية. بعدها العقد، خصوصًا ميعاد الاستلام والتعويض عن التأخير."],
      ["يعني إيه نسبة التحميل؟", "نصيبك من السلم والممرات والجدران المحسوب في مساحة الوحدة. غالبًا بين 15% و25% في الشقق، يعني وحدة 150 متر ممكن صافيها حوالي 120 متر."],
      ["فترة السماح في الاستلام قد إيه؟", "غالبًا بين 6 شهور وسنة بعد الميعاد المكتوب. اتأكد إن العقد فيه تعويض واضح لو المطور اتأخر بعدها."],
      ["وديعة الصيانة كام؟", "في أغلب المشاريع بين 8% و10% من سعر الوحدة، وبتتدفع قبل الاستلام أو معاه."],
      ["أقدر أبيع الوحدة قبل الاستلام؟", "أيوه في أغلب المشاريع، بس غالبًا فيه رسوم تنازل عند المطور، وشرط إنك تكون دافع نسبة معينة من الأقساط."],
      ["جدية الحجز بترجع؟", "غالبًا بترجع لو ماكملتش التعاقد في المدة المحددة، بس الشروط بتختلف من مطور للتاني، فاسأل عنها مكتوبة قبل الدفع."],
      ["فيه ضرايب على بيع الشقة بعدين؟", "أيوه، ضريبة التصرفات العقارية 2.5% من قيمة البيع."]
    ]
  },

  "new-capital-vs-new-cairo": {
    title: "العاصمة الإدارية ولا القاهرة الجديدة؟",
    seo_title: "العاصمة الإدارية ولا التجمع الخامس 2026؟ مقارنة بالأرقام",
    description: "مقارنة 2026 بين العاصمة الإدارية والقاهرة الجديدة: سعر المتر، والخدمات، والمواصلات (المونوريل والقطار الكهربائي)، والإيجار، وإعادة البيع، ومين تناسبه كل منطقة.",
    summary: "القاهرة الجديدة أكمل في الخدمات والإيجار وإعادة البيع، وأغلى. العاصمة أرخص في المتر بحوالي الثلت في المخزون عندنا، وبقت متوصلة أحسن بالمونوريل والقطار الكهربائي، بس محتاجة صبر أطول لحد ما السكن والخدمات يكملوا.",
    modified: "2026-10-30",
    sections: [
      ["المقارنة في سطرين", [
        "القاهرة الجديدة والتجمع الخامس مدينة مكتملة ومسكونة من أكتر من 20 سنة، فيها جامعات ومدارس ومولات ومستشفيات شغالة، وطلب إيجار عالي. العاصمة الإدارية الجديدة مدينة بتتبني، فيها الحي الحكومي والوزارات والبرج الأيقوني، والسكن فيها لسه في مراحله الأولى في أغلب المناطق.",
        "الاختيار مش \"أنهي أحسن\"، لكن \"أنهي أنسب ليك\": هتسكن إمتى، وشغلك فين، وميزانيتك قد إيه، وبتشتري للسكن ولا للاستثمار."
      ]],
      ["سعر المتر بالأرقام", [
        "من الوحدات السكنية المتاحة عندنا (أكتوبر 2026): في القاهرة الجديدة حوالي 100 مشروع، والشقة المتوسطة حوالي 127 متر بحوالي 12 مليون، يعني حوالي 100 ألف جنيه للمتر في الشقق، وحوالي 116 ألف للمتر لكل أنواع الوحدات.",
        "في العاصمة الإدارية عندنا حوالي 13 مشروع، والشقة المتوسطة حوالي 146 متر بحوالي 9.1 مليون، وسعر المتر حوالي 78 ألف جنيه لكل الأنواع. يعني العاصمة أرخص في المتر بحوالي 30% لـ 35%، والشقق فيها مساحاتها أكبر بنفس الميزانية.",
        "خد بالك إن الأرقام دي متوسطات. فيه مشاريع في التجمع أرخص من متوسط العاصمة، زي Solay وNotion (حوالي 63 لـ 67 ألف للمتر)، وفيه مشاريع في العاصمة أغلى من متوسط التجمع."
      ]],
      ["المواصلات: إيه اللي اتغير في 2026؟", [
        "أكبر تغيير إن المرحلة الأولى من مونوريل شرق النيل اشتغلت يوم 6 مايو 2026، بـ 16 محطة من محطة المشير طنطاوي في القاهرة الجديدة لحد محطة مدينة العدالة في العاصمة. ده بيربط المدينتين ببعض مباشرة.",
        "وكمان القطار الكهربائي الخفيف (LRT) بيربط العاصمة بالسلام وشرق القاهرة. وبالعربية، العاصمة على حوالي 30 دقيقة من التجمع، والتجمع على حوالي 20 دقيقة من مطار القاهرة.",
        "لو شغلك في الوزارات أو الحي الحكومي، العاصمة بتوفر عليك وقت كل يوم. ولو شغلك في مدينة نصر أو مصر الجديدة أو وسط البلد، التجمع أقرب بوضوح."
      ]],
      ["الخدمات", [
        "القاهرة الجديدة فيها الجامعة الأمريكية والجامعة الألمانية وجامعة المستقبل، ومدارس دولية كتير، ومولات زي كايرو فيستيفال سيتي، ومستشفيات كبيرة. الخدمات دي شغالة النهاردة.",
        "العاصمة فيها خدمات حكومية كبيرة، وجامعات ومستشفيات بتفتح، والحي المالي والبرج الأيقوني. بس الخدمات اليومية حوالين السكن (سوبر ماركت، مدارس قريبة، مطاعم) لسه بتكمل في أغلب المناطق السكنية."
      ]],
      ["الإيجار وإعادة البيع", [
        "التجمع من أعلى مناطق شرق القاهرة في الطلب على الإيجار، خصوصًا الشقق المتوسطة في كمبوندات معروفة جنب التسعين والجامعات. وإعادة البيع فيه أسهل لأن عدد المشترين أكبر.",
        "في العاصمة الطلب على الإيجار بيزيد مع انتقال الموظفين، بس المعروض كمان كبير جدًا، ولما مشاريع كتير تتسلم في نفس الوقت الإيجار ممكن يبقى تحت ضغط. ده بيخلي الاستثمار في العاصمة محتاج أفق أطول.",
        "في الحالتين العائد مش مضمون، واختيار المشروع والمطور بيفرق أكتر من المنطقة."
      ]],
      ["أنظمة السداد", [
        "المنطقتين فيهم أنظمة سداد طويلة. في التجمع أغلب المشاريع بمقدم 5% على 8 لـ 10 سنين، وفيه 3% على 10 و12 سنة في مشاريع زي Palm Hills New Cairo وMountain View iCity New Cairo. والعاصمة فيها مقدمات قريبة أو أقل في مشاريع كتير.",
        "الفرق الأكبر في ميعاد الاستلام وفي إن التجمع فيه وحدات جاهزة أكتر، زي Mountain View 1.1 وHyde Park New Cairo."
      ]],
      ["مين تناسبه كل منطقة؟", [
        "القاهرة الجديدة: لو هتسكن خلال سنة أو سنتين، أو ولادك في مدارس شرق القاهرة، أو بتدور على إيجار وإعادة بيع أسهل، أو شغلك في مدينة نصر ومصر الجديدة.",
        "العاصمة الإدارية: لو شغلك في الحي الحكومي أو الوزارات، أو عايز مساحة أكبر بنفس الميزانية، أو بتستثمر لـ 5 سنين أو أكتر وتقبل مخاطرة أعلى.",
        "وفيه حل وسط: مستقبل سيتي بين المدينتين، أرخص من التجمع (حوالي 90 ألف للمتر عندنا) وأقرب للعاصمة. عندنا دليل كامل عنها."
      ]],
      ["إزاي تقارن بشكل عادل؟", [
        "قارن وحدتين بنفس النوع والمساحة والتشطيب وميعاد الاستلام، وبنفس نظام السداد. ماتقارنش شقة جاهزة في التجمع بشقة استلامها بعد 4 سنين في العاصمة على السعر بس.",
        "ابعتلنا ميزانيتك ومحتاج تسكن إمتى، ونطلعلك 3 بدائل في كل منطقة بنفس الشروط."
      ]]
    ],
    faq: [
      ["العاصمة الإدارية أرخص من التجمع بكام؟", "في الوحدات المتاحة عندنا (أكتوبر 2026) سعر المتر في العاصمة حوالي 78 ألف جنيه، وفي القاهرة الجديدة حوالي 116 ألف، يعني العاصمة أرخص بحوالي 30% لـ 35% في المتوسط."],
      ["فيه مواصلات بين التجمع والعاصمة؟", "أيوه. مونوريل شرق النيل اشتغل في 6 مايو 2026 بـ 16 محطة من محطة المشير طنطاوي لحد مدينة العدالة في العاصمة، وكمان القطار الكهربائي الخفيف بيوصل العاصمة بالسلام."],
      ["أشتري في التجمع ولا العاصمة للاستثمار؟", "التجمع أسهل في الإيجار وإعادة البيع وأقل مخاطرة. العاصمة أرخص وممكن تكسب أكتر على المدى الطويل، بس محتاجة صبر لأن المعروض كبير والخدمات لسه بتكمل. والعائد مش مضمون في الحالتين."],
      ["المسافة بين التجمع والعاصمة قد إيه؟", "حوالي 30 دقيقة بالعربية في الأيام العادية، وبالمونوريل من محطة المشير طنطاوي لمدينة العدالة."],
      ["فيه حل وسط بين التجمع والعاصمة؟", "مستقبل سيتي بين المدينتين على طريق السويس، سعر المتر فيها حوالي 90 ألف جنيه في المخزون عندنا، وأقرب للعاصمة من التجمع."],
      ["فيه وحدات جاهزة في التجمع؟", "أيوه، زي Mountain View 1.1 وMountain View iCity New Cairo، ووحدات استلام خلال سنة في Hyde Park New Cairo."]
    ]
  },

  "real-estate-investment-egypt": {
    title: "أساسيات الاستثمار العقاري في مصر",
    seo_title: "الاستثمار العقاري في مصر 2026 — العائد والمخاطر وأحسن مناطق",
    description: "دليل الاستثمار العقاري في مصر 2026: إزاي تحسب عائد الإيجار الصافي، والفرق بين زيادة السعر والدخل، والسيولة، والمخاطر، وأسعار المتر في كل منطقة بالأرقام.",
    summary: "الاستثمار العقاري الكويس بيتقاس بـ 4 حاجات: التكلفة الكاملة، والعائد الصافي من الإيجار، وسهولة إعادة البيع، والمخاطر. احسب كل واحدة بالأرقام، واعمل سيناريو متحفظ، وماتعتمدش على إن السعر هيزيد وبس.",
    modified: "2026-10-30",
    sections: [
      ["ليه المصريين بيستثمروا في العقار؟", [
        "العقار في مصر بيستخدم كمخزن للقيمة، خصوصًا بعد فترات تراجع الجنيه، زي التعويم في مارس 2024. في الفترات دي أسعار العقارات بالجنيه زادت بسرعة، لأن تكلفة البناء والأرض زادت، ولأن الناس بتدور على حاجة تحافظ على قيمة فلوسها.",
        "بس \"العقار مبيخسرش\" مش قاعدة مضمونة. فيه وحدات بتتباع بخسارة لو اتشرت غالية، أو في مكان مافيهوش طلب، أو من مطور اتأخر. الدليل ده بيوريك تحسب بالأرقام بدل ما تعتمد على الإحساس."
      ]],
      ["مصدرين للعائد: زيادة السعر والإيجار", [
        "زيادة السعر (Capital gain): الفرق بين سعر الشراء وسعر البيع بعدين. ده بيعتمد على المنطقة والمشروع والتضخم وحالة السوق، ومش مضمون.",
        "الإيجار: دخل شهري أو موسمي بعد الاستلام. ده أوضح في الحساب، بس محتاج وحدة جاهزة ومكان عليه طلب.",
        "أحسن استثمار غالبًا بيجمع الاتنين: وحدة في مكان عليه طلب إيجار حقيقي، وبسعر دخول معقول يخلي فيه مساحة للزيادة."
      ]],
      ["إزاي تحسب عائد الإيجار الصافي؟", [
        "العائد الإجمالي = الإيجار السنوي ÷ سعر الشراء. بس الرقم ده مضلل لوحده. العائد الصافي = (الإيجار السنوي − المصاريف) ÷ التكلفة الكاملة.",
        "مثال توضيحي: شقة اشتريتها بـ 10 مليون، وتكلفة التشطيب والفرش مليون، يعني التكلفة الكاملة 11 مليون. لو الإيجار 50 ألف في الشهر، يعني 600 ألف في السنة. لو الوحدة فضيت شهرين في السنة، الإيجار الفعلي 500 ألف. ولو المصاريف السنوية (صيانة وتصليحات وعمولة سمسار) حوالي 50 ألف، يبقى الصافي 450 ألف.",
        "العائد الصافي = 450 ألف ÷ 11 مليون = حوالي 4.1% في السنة، مع إن العائد الإجمالي على الورق كان 6%. ده الفرق اللي لازم تحسبه قبل ما تشتري."
      ]],
      ["التكلفة الكاملة مش سعر الوحدة بس", [
        "ضيف على السعر: وديعة الصيانة (غالبًا 8% لـ 10%)، والتشطيب لو الوحدة مش متشطبة، والفرش لو هتأجر مفروش، والجراج والنادي لو منفصلين، ومصاريف التسجيل.",
        "وعند البيع: ضريبة التصرفات العقارية 2.5% من قيمة البيع، ورسوم التنازل لو بتبيع قبل التسجيل، وعمولة السمسار.",
        "المصاريف دي ممكن تاكل جزء كبير من الربح لو الفترة قصيرة. علشان كده الاستثمار العقاري غالبًا مناسب لفترة 5 سنين أو أكتر."
      ]],
      ["السيولة: هتقدر تبيع إمتى وبكام؟", [
        "العقار مش زي الدهب أو الأسهم، بيعه بياخد وقت. الوحدات الأسهل في البيع: الشقق المتوسطة (2 و3 أوض) في كمبوندات معروفة ومسكونة، والشاليهات الصغيرة في قرى الساحل المعروفة.",
        "الأصعب: الفلل الكبيرة جدًا، والوحدات في مشاريع لمطورين صغار أو متأخرين، والوحدات اللي سعرها أعلى بكتير من متوسط المنطقة.",
        "قبل ما تشتري، اسأل نفسك: لو احتجت أبيع بعد سنتين، مين اللي هيشتري مني، وبكام؟"
      ]],
      ["أسعار المتر في المناطق الرئيسية", [
        "من الوحدات السكنية المتاحة عندنا (أكتوبر 2026)، متوسط سعر المتر تقريبًا: مستقبل سيتي حوالي 90 ألف جنيه، والعاصمة الإدارية حوالي 78 ألف، و6 أكتوبر حوالي 110 ألف، والقاهرة الجديدة حوالي 116 ألف، والشيخ زايد وزايد الجديدة حوالي 125 ألف، والساحل الشمالي حوالي 178 ألف.",
        "المناطق الأرخص (مستقبل سيتي والعاصمة) فيها مساحة أكبر للزيادة لو اكتملت، بس مخاطرتها أعلى. والمناطق المكتملة (التجمع وزايد) أغلى بس أسهل في الإيجار وإعادة البيع. والساحل استثمار موسمي: الإيجار مركز في حوالي 3 شهور في الصيف.",
        "عندنا أدلة كاملة لكل منطقة: القاهرة الجديدة، والشيخ زايد، والساحل الشمالي، ومستقبل سيتي."
      ]],
      ["مخاطر لازم تحسبها", [
        "مخاطر التنفيذ: المطور يتأخر في التسليم، أو يغير المواصفات. قللها باختيار مطور بسجل تسليم كويس.",
        "مخاطر السوق: المعروض في منطقة يزيد جدًا وقت الاستلام، فالإيجار والأسعار يتضغطوا.",
        "مخاطر السيولة: تحتاج فلوس ومش لاقي مشتري بسعر كويس.",
        "مخاطر التمويل: الأقساط تبقى تقيلة لو دخلك قل. اختبر قدرتك على السداد تحت سيناريو صعب."
      ]],
      ["اعمل 3 سيناريوهات", [
        "قبل أي قرار، احسب 3 سيناريوهات: متحفظ (السعر ثابت تقريبًا والإيجار أقل من المتوقع والوحدة بتفضى أكتر)، وأساسي، ومتفائل. لو السيناريو المتحفظ يخليك في خسارة كبيرة أو مش قادر تكمل الأقساط، الاستثمار ده مخاطرته أعلى من اللازم عليك.",
        "ماتعتمدش على رقم واحد كأنه وعد، حتى لو جاي من مطور أو سمسار. وعندنا دليل عن مقارنة أنظمة السداد بالأرقام، ودليل عن شراء وحدة تحت الإنشاء."
      ]]
    ],
    faq: [
      ["الاستثمار العقاري في مصر لسه مربح في 2026؟", "ممكن يكون مربح لو اخترت وحدة بسعر معقول في مكان عليه طلب حقيقي، ومن مطور بسجل تسليم كويس، ولفترة 5 سنين أو أكتر. بس العائد مش مضمون، ولازم تحسب المصاريف والمخاطر."],
      ["إزاي أحسب عائد الإيجار؟", "العائد الصافي = (الإيجار السنوي الفعلي بعد فترات الفراغ − المصاريف) ÷ التكلفة الكاملة للوحدة بالتشطيب والفرش. غالبًا بيطلع أقل من العائد الإجمالي بنقطتين أو أكتر."],
      ["أحسن منطقة للاستثمار العقاري في مصر؟", "مفيش إجابة واحدة. التجمع وزايد أسهل في الإيجار وإعادة البيع، ومستقبل سيتي والعاصمة أرخص وفيهم مساحة للزيادة بمخاطرة أعلى، والساحل مناسب للإيجار الموسمي."],
      ["أشتري جاهز ولا تحت الإنشاء للاستثمار؟", "الجاهز بيدخل إيجار على طول ومخاطرته أقل بس أغلى ومقدمه أعلى. تحت الإنشاء أرخص ومقدمه أصغر وممكن يكسب أكتر، بس مفيش دخل لحد الاستلام وفيه مخاطرة تأخير."],
      ["فيه ضرايب على بيع العقار؟", "أيوه، ضريبة التصرفات العقارية 2.5% من قيمة البيع، وغالبًا رسوم تنازل عند المطور لو بتبيع قبل التسجيل."],
      ["أقل مدة مناسبة للاستثمار العقاري؟", "غالبًا 5 سنين أو أكتر، لأن مصاريف الشراء والبيع والضرايب بتاكل جزء كبير من الربح في الفترات القصيرة."]
    ]
  }
};

const ENGLISH_GUIDES = {
  "payment-plan-comparison": {
    title: "How to Compare Property Payment Plans in Egypt",
    seo_title: "Compare Egypt Property Payment Plans 2026 — 3% or 10% Down?",
    description: "A practical 2026 guide to comparing Egyptian property payment plans: the real down payment, installments, cash needed in the first two years and short-term discounts, with worked numbers.",
    summary: "Turn every payment plan into a cash schedule: down payment and follow-up payments, yearly and monthly installments, cash needed in the first two years, and the total price. The lowest down payment is not always the cheapest, and shorter plans often carry large discounts.",
    modified: "2026-10-30",
    sections: [
      ["Why the comparison matters", [
        "The same unit in Egypt is often offered on several plans: 3% down over 12 years, 5% + 5% over 8 years, 10% over 6 years, or cash at a discount. The differences can change the total price by millions and your monthly budget even more. Buyers tend to focus on the down payment because it is the first number they hear, but it is the smallest part of the decision. Compare five numbers instead."
      ]],
      ["1. The real down payment", [
        "The real down payment is everything you pay before the first regular installment: the reservation deposit, the down payment and any follow-up payment within months. \"5% + 5% after three months\" means 10%, not 5%. In our October 2026 inventory, Rivers, MarBay and Fouka Bay use 5% + 5%, Jirian 5% at reservation plus 5% at contract, and Zomra East 2.5% plus 2.5% after a month, 5% after six months and 5% on delivery — 15% in total behind a 2.5% headline."
      ]],
      ["2. The installment", [
        "Take a EGP 10 million unit and three common plans (illustrative, equal installments). Plan A, 3% over 12 years: EGP 300,000 down, then about EGP 808,000 a year, or about EGP 67,000 a month. Plan B, 5% + 5% over 8 years: EGP 1 million within three months, then about EGP 1.125 million a year, or about EGP 94,000 a month. Plan C, 10% over 6 years: EGP 1 million down, then EGP 1.5 million a year, or EGP 125,000 a month. The monthly gap between A and C is about EGP 58,000 — compare that with your real income."
      ]],
      ["3. Cash needed in the first two years", [
        "The first two years are the hardest. On the same unit, Plan A needs about EGP 1.92 million, Plan B about EGP 3.25 million and Plan C about EGP 4 million. If your savings and income for those two years do not cover the figure with a safety margin, the plan does not suit you, however small the down payment."
      ]],
      ["4. Total price and short-plan discounts", [
        "Many developers discount shorter plans heavily. A real example from our inventory: 97 Hills by Palm Hills offers 2.8% down over 10 years, or about 2.83% down with discounts of about 15% (9 years), 19% (8 years), 24% (7 years) and 29% (6 years). On a EGP 10 million unit, the 10-year plan costs about EGP 972,000 a year; the 6-year plan at 29% off brings the price to about EGP 7.1 million at about EGP 1.15 million a year — roughly EGP 178,000 more a year to save about EGP 2.9 million."
      ]],
      ["5. Risk and hidden payments", [
        "Test the plan against a hard scenario: income down 20%, a delayed sale, an emergency. Ask about late-payment penalties, early-payment discounts and cancellation terms. Watch for hidden payments: delivery payments (10% in Azad Walk, 5% in Zomra East), maintenance deposits usually 8–10% of the price, annual lump sums on top of quarterly installments, and separate garage or club fees."
      ]],
      ["Which plan suits you?", [
        "Little cash now and a stable income: a small down payment over a long term, such as 3% over 12 years in Mountain View projects or 2.5% in Hacienda Blue. Good liquidity: a shorter plan with a discount, or cash if the discount is large. Buying to resell before delivery: ask about transfer fees, and remember that resale prices before delivery reflect the installments still due. Send us the plans you were offered and we will lay them out on these five numbers."
      ]]
    ],
    faq: [
      ["3% over 12 years or 10% over 6 years?", "On a EGP 10 million unit, 3% over 12 years is about EGP 67,000 a month and needs about EGP 1.9 million in the first two years; 10% over 6 years is EGP 125,000 a month and needs about EGP 4 million. The first is easier on the budget; the second is usually cheaper in total if it carries a discount."],
      ["What does 5% + 5% mean?", "A real down payment of 10%: 5% at reservation and another 5% shortly after, usually three months later or with the first installment."],
      ["How much does a shorter plan save?", "It depends on the developer. In 97 Hills, choosing 6 years instead of 10 carries about a 29% discount — about EGP 2.9 million on a EGP 10 million unit for about EGP 178,000 more a year."],
      ["When is the maintenance deposit paid?", "Usually before or at delivery, typically 8–10% of the unit price. Get it in writing in the contract."],
      ["Are long installment plans interest-free?", "Developers usually say so, but the installment price itself is higher than the cash or short-plan price; that difference is the financing cost."]
    ]
  },

  "off-plan-buying-checklist": {
    title: "Buying Off-Plan Property in Egypt: The Full Checklist",
    seo_title: "Buying Off-Plan Property in Egypt 2026 — Full Checklist",
    description: "A complete 2026 checklist before buying off-plan property in Egypt: developer track record, land and permits, contract terms, gross vs net area, finishing, delivery, payments and running costs.",
    summary: "Before paying a reservation deposit on an off-plan unit, check eight things: the developer's delivery record, land ownership and permits, contract terms, how the area is measured, finishing specifications, delivery date and delay compensation, the full payment schedule, and post-delivery costs.",
    modified: "2026-10-30",
    sections: [
      ["Why off-plan is different", [
        "Most new supply in Egypt is sold off-plan: you buy a home that is not yet built, with a small down payment and a long plan. That makes buying easier at first but leaves you depending on the developer for years. The main risks are late delivery, a unit that differs from what was promised, costs you did not plan for, and difficulty reselling before delivery."
      ]],
      ["1. Developer track record and 2. land and permits", [
        "Ask which projects the developer has actually delivered and visit one: check finishing, maintenance and services, and talk to residents if you can. Compare announced and actual delivery dates on past projects. Listed developers such as Palm Hills, SODIC and Madinet Masr publish sales and delivery figures, and Mountain View announced about 1,800 deliveries in the first half of 2026.",
        "Ask whether the land is owned by the developer or held in partnership with another party, such as the New Urban Communities Authority or a master developer like MIDAR in Mostakbal City or Modon in Ras El Hekma. Ask to see the ministerial decree and the building permit for your phase; phases without permits carry more delay risk. Have an independent lawyer review the papers if in doubt."
      ]],
      ["3. Contract terms", [
        "Read the whole contract, not the sales summary. The key clauses are the delivery date and grace period (usually six months to a year), compensation if the developer is late, your own late-payment penalties, cancellation terms and refunds, and transfer fees if you resell before delivery. Make sure every sales promise — finishing, garden, view, discount — is written into the contract or a stamped annex."
      ]],
      ["4. Gross vs net area and 5. finishing", [
        "Most Egyptian units are sold by gross area, which includes your share of stairs, corridors and walls (the loading ratio, usually 15–25% for apartments). A 150 m² gross unit at 20% loading is about 120 m² net, so compare price per net square metre where possible. For villas and townhouses, ask for land, built-up and garden areas separately.",
        "Finishing comes in four common levels — core and shell, semi-finished, fully finished, and fully finished with air conditioning or kitchen — and the gap can reach EGP 15,000–20,000 per square metre. Ask for the specification annex. In Mountain View 1.1, for example, apartments are semi-finished, i-villas core and shell and ready villas fully finished — three levels in one compound."
      ]],
      ["6. Delivery, 7. payments and 8. running costs", [
        "Ask for construction progress in your phase and visit the site; a project still excavating with delivery promised in two years is likely to slip. Request the payment schedule in pounds, not percentages, including follow-up payments, delivery payments and annual lump sums.",
        "Budget for the maintenance deposit (usually 8–10% of the price), club fees, a separate garage if any, utility meters and finishing if the unit is not finished. On a later sale, the 2.5% real estate disposal tax applies, plus the developer's transfer fee before registration. These costs can reach 15% or more of the unit price."
      ]],
      ["The steps in order", [
        "Shortlist and compare; pay an expression of interest (usually refundable if no contract follows); reserve and pay the down payment; sign the contract. Do not pay the full down payment before reading the contract, and keep every receipt and message in writing. Send us the offers you are weighing and we will compare them on the same terms."
      ]]
    ],
    faq: [
      ["What matters most before buying off-plan?", "The developer's delivery record: visit a delivered project and compare announced and actual dates. Then the contract, especially the delivery date and delay compensation."],
      ["What is the loading ratio?", "Your share of stairs, corridors and walls included in the sold area, usually 15–25% for apartments, so a 150 m² unit may be about 120 m² net."],
      ["How long is the delivery grace period?", "Usually six months to a year after the contract date; make sure compensation applies after it."],
      ["How much is the maintenance deposit?", "Usually 8–10% of the unit price, paid before or at delivery."],
      ["Can I resell before delivery?", "In most projects yes, usually with a developer transfer fee and after paying a minimum share of the installments."]
    ]
  }
};

module.exports = { GUIDES, ENGLISH_GUIDES };
