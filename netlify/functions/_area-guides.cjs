"use strict";

// Long-form area guides for New Cairo, the North Coast and Sheikh Zayed (29 Oct 2026).
// Same shape as AREA_SEARCH_CONTENT["mostakbal-city"] in _seo-utils.cjs:
//   { ar|en: { title(), description(), map, sections: [[heading, paragraphs[]]], faq: [[q, a]] } }
// Facts researched 29 Oct 2026 (government announcements, master developers, transport ministry
// statements). Prices, payment plans and project counts come from Tycoons' own inventory on that
// date and are written as "around"; the live list under each guide is always the current one.
// No external website names in the text.

const NEW_CAIRO = {
  ar: {
    title: ({ plural }) => `مشاريع التجمع الخامس 2026 — الأسعار و${plural}`,
    description: ({ minFmt, plural }) => `دليل القاهرة الجديدة والتجمع الخامس 2026: المناطق والطرق والمونوريل وأسعار المتر، و${plural} متاحة بأسعار من ${minFmt} ومقدمات من 3%.`,
    map: { heading: "خريطة القاهرة الجديدة والتجمع الخامس", query: "New Cairo, Cairo Governorate, Egypt", locality: "New Cairo" },
    sections: [
      [
        "القاهرة الجديدة في سطور",
        [
          "القاهرة الجديدة مدينة في شرق القاهرة اتعملت بقرار جمهوري رقم 191 لسنة 2000، اللي جمع التجمع الأول والتجمع التالت والتجمع الخامس في مدينة واحدة تابعة لهيئة المجتمعات العمرانية الجديدة. مساحتها النهاردة حوالي 343 كيلومتر مربع، وده بيخليها من أكبر المدن الجديدة حوالين القاهرة.",
          "لما الناس بتقول \"التجمع\" غالبًا بتقصد التجمع الخامس، وهو الجزء الأكبر والأغلى في المدينة، وفيه أغلب الكمبوندات الجديدة والجامعات والمولات. وعلشان كده الصفحة دي بتتكلم عن القاهرة الجديدة والتجمع الخامس مع بعض، لأن المشتري بيدور عليهم بالاسمين.",
          "في Tycoons عندنا وقت كتابة الصفحة (أكتوبر 2026) حوالي 100 مشروع متاح في القاهرة الجديدة لأكتر من 50 مطور، وأكتر من 400 وحدة بأسعارها. الصفحة دي بتشرح المناطق جوه المدينة، والطرق والمونوريل، والخدمات، ومستويات الأسعار حسب نوع الوحدة، وأنظمة السداد، والاستلام، وإزاي تختار. وتحت الصفحة كل المشاريع المتاحة بأسعارها."
        ]
      ],
      [
        "مناطق القاهرة الجديدة: كل منطقة مختلفة",
        [
          "التجمع الخامس هو قلب المدينة. فيه شارع التسعين الشمالي والجنوبي، وهو المحور التجاري الأساسي اللي عليه البنوك والمولات والمباني الإدارية، وحواليه أحياء زي النرجس واللوتس والياسمين والبنفسج والشويفات وغرب الجولف. الأحياء دي أغلبها فيلات وعمارات اتسكنت من سنين، والكمبوندات الجديدة بتيجي حواليها وفي امتداداتها.",
          "منطقة الجولدن سكوير جنوب التسعين وقريبة من الجامعة الأمريكية، وهي من أكتر المناطق اللي فيها إطلاقات جديدة في آخر سنتين، زي Villette من SODIC وSolay. أسعارها بتختلف جدًا من مشروع للتاني، لأن جنبها مشاريع فاخرة ومشاريع شقق صغيرة بأسعار أقل.",
          "التجمع الأول والتجمع التالت أقدم وأهدى وأرخص في المتر، وأغلبهم إسكان مسكون وخدمات محلية، والمعروض فيهم إعادة بيع أكتر من المشاريع الجديدة. القطامية وقطامية هايتس على الناحية الغربية جنب الطريق الدائري، وفيها كمبوندات قديمة راقية وملاعب جولف.",
          "على الناحية الشرقية فيه امتداد التجمع السادس قرب طريق السويس، وده فيه مشاريع جديدة كتير بمقدمات أقل وتقسيط أطول، زي Crescent Walk من Marakez وEl Patio Vida وEl Patio Riva من La Vista وNest. المنطقة دي لسه بتكمل خدماتها، فالفرق بين مشروع جاهز ومشروع لسه بيتبني فيها كبير. ومستقبل سيتي بعدها على طريق السويس مدينة منفصلة ليها صفحتها الخاصة عندنا."
        ]
      ],
      [
        "الطرق والمواصلات والمونوريل",
        [
          "القاهرة الجديدة محاطة بطرق رئيسية من كل ناحية: الطريق الدائري من الغرب، وطريق القاهرة–السويس من الشمال، وطريق العين السخنة من الجنوب. وجوه المدينة شارع التسعين ومحور محمد بن زايد ومحور المشير طنطاوي بيربطوا الأحياء ببعض وبالطرق دي.",
          "المسافات التقريبية بالعربية في الأيام العادية: حوالي 20 دقيقة لمطار القاهرة، وحوالي 20 لـ30 دقيقة لمدينة نصر ومصر الجديدة، وحوالي 30 دقيقة للعاصمة الإدارية، ومن 40 دقيقة لساعة لوسط البلد حسب الزحمة. وحوالي ساعة وربع للعين السخنة عن طريق السخنة.",
          "أهم تغيير في 2026 هو المونوريل. المرحلة الأولى من مونوريل شرق النيل بدأت تشتغل يوم 6 مايو 2026، بـ16 محطة من محطة المشير طنطاوي لحد محطة مدينة العدالة في العاصمة الإدارية، ومواعيد التشغيل المعلنة وقت الافتتاح من 6 الصبح لـ6 المغرب. ده بيخلي المشاريع القريبة من المحطات أسهل في التنقل اليومي وفي الإيجار.",
          "قبل ما تختار مشروع، شوف المسافة الحقيقية من بوابة الكمبوند لأقرب محور رئيسي ولأقرب محطة مونوريل، مش المسافة المكتوبة في البروشور. خمس دقايق زيادة في الزحمة بتفرق كل يوم."
        ]
      ],
      [
        "الخدمات: ليه القاهرة الجديدة غالية؟",
        [
          "سعر القاهرة الجديدة جاي من إن الخدمات فيها شغالة فعلًا مش لسه مخطط ليها. فيها الجامعة الأمريكية بالقاهرة، والجامعة الألمانية، وجامعة المستقبل، وعدد كبير من المدارس الدولية واللغات، وده من أهم أسباب الطلب عليها من العيلات.",
          "وفيها مولات ومناطق تجارية كبيرة زي كايرو فيستيفال سيتي على مدخل المدينة (حوالي 700 فدان فيها مول وحدائق ومكاتب)، والمولات اللي على شارع التسعين، وكمان مستشفيات كبيرة زي مستشفى القوات الجوية التخصصي. ده غير الخدمات اللي جوه الكمبوندات الكبيرة نفسها.",
          "النتيجة إن القاهرة الجديدة من أعلى مناطق شرق القاهرة في الطلب على الإيجار وإعادة البيع، خصوصًا للشقق المتوسطة في كمبوندات معروفة وقريبة من التسعين. وده اللي بيخلي سعر المتر فيها أعلى من مستقبل سيتي والشروق والعاصمة."
        ]
      ],
      [
        "أسعار الشقق والفلل في التجمع الخامس 2026",
        [
          "الأرقام دي من الوحدات المتاحة عندنا وقت كتابة الصفحة (أكتوبر 2026)، وهي أسعار بداية بالتقسيط، مش سعر نهائي. استخدمها علشان تعرف المستوى، وبعدين قارن الوحدات نفسها في القائمة تحت.",
          "الاستوديو والشقق الصغيرة بتبدأ من حوالي 2.8 لـ 4 مليون في مشاريع زي Notion وSolay. الشقة المتوسطة عندنا حوالي 127 متر، وفي نص الشقق المتاحة سعرها حوالي 12 مليون، يعني سعر متر حوالي 100 ألف جنيه. وفي كمبوندات المطورين الكبار زي Palm Hills New Cairo وMountain View iCity New Cairo وHyde Park New Cairo الشقق بتبدأ من حوالي 9 لـ 16 مليون.",
          "الدوبلكس بيبدأ من حوالي 10 مليون. التاون هاوس والتوين هاوس بيبدأوا من حوالي 13 مليون، وفي نص المعروض حوالي 30 مليون لمساحة حوالي 220 متر. والفلل المستقلة من حوالي 13 مليون في مشاريع محدودة، لكن أغلبها بين 30 و60 مليون، وفي نص المعروض حوالي 48 مليون.",
          "الفرق في السعر داخل التجمع نفسه كبير: نفس المساحة ممكن يبقى سعرها الضعف بين مشروع جنب التسعين بمطور كبير ومشروع على الأطراف بمطور جديد. علشان كده المقارنة الصح تبقى بين وحدات من نفس النوع والمساحة والتشطيب وموعد الاستلام."
        ]
      ],
      [
        "أنظمة السداد والاستلام",
        [
          "أغلب المشاريع الجديدة في القاهرة الجديدة بمقدم 5% وتقسيط من 8 لـ 10 سنين. وفيه مطورين بيقدموا مقدمات أقل: Palm Hills New Cairo بمقدم 3% على 10 سنين، وMountain View iCity New Cairo بمقدم 3% على 12 سنة، و97 Hills بمقدم حوالي 2.8%. وفيه مشاريع تقسيطها أطول، زي The Mornings من الأهلي صبور لحد 14 سنة.",
          "خد بالك إن مقدم 5% كتير بيبقى بعده دفعة تانية بعد شهور قليلة، زي \"5% + 5% بعد 3 شهور\"، وإن فيه دفعة استلام في بعض المشاريع. اسأل عن الجدول الكامل مش المقدم بس، واحسب إجمالي اللي هتدفعه أول سنة.",
          "لو محتاج تسكن قريب، فيه وحدات جاهزة أو قريبة من الاستلام: Mountain View 1.1 وMountain View iCity New Cairo فيهم وحدات استلام فوري، وHyde Park New Cairo فيه وحدات استلام خلال سنة. الوحدات الجاهزة غالبًا مقدمها أعلى ومدة تقسيطها أقصر، بس بتوفر عليك الإيجار ومخاطرة التأخير.",
          "المشاريع اللي استلامها بعد 3 لـ 4 سنين بتبقى أرخص في البداية وتقسيطها أطول. بس راجع سجل المطور في التسليم في مشاريعه اللي فاتت، لأن ده أهم من خصم أو مقدم أقل."
        ]
      ],
      [
        "تشتري في القاهرة الجديدة للسكن ولا للاستثمار؟",
        [
          "للسكن: القاهرة الجديدة مناسبة جدًا لو شغلك أو مدارس ولادك في شرق القاهرة، ولو عايز خدمات شغالة من أول يوم. ركز على المسافة للتسعين أو للمحور اللي هتستخدمه كل يوم، وعلى المدارس اللي جنبك، وعلى مستوى الصيانة في الكمبوند.",
          "للإيجار: الشقق المتوسطة (2 و3 أوض) في كمبوندات معروفة وقريبة من الجامعات والتسعين هي الأسهل في الإيجار. الفلل الكبيرة إيجارها أصعب نسبيًا مقارنة بسعرها.",
          "لإعادة البيع: الوحدات في مشاريع مطورين كبار ومشاريع اتسلمت واتسكنت بتتباع أسرع. المشاريع الجديدة على الأطراف ممكن تكسب أكتر لو المنطقة كملت، بس محتاجة صبر ومخاطرتها أعلى. وفي كل الحالات العائد مش مضمون."
        ]
      ],
      [
        "إزاي تقارن أسعار مشاريع القاهرة الجديدة؟",
        [
          "ثبّت نوع الوحدة والمساحة والتشطيب وموعد الاستلام، وبعدين قارن السعر الكلي بالتقسيط، والمقدم، والدفعات الإضافية، ومدة التقسيط، ووديعة الصيانة. سعر البداية أو سعر المتر لوحده مش كفاية للحكم على الصفقة.",
          "اسأل عن مكان الوحدة جوه الكمبوند (على لاند سكيب ولا على شارع)، والدور، والاتجاه، ومساحة الجنينة أو الروف لو موجودة، لأن دي بتغير السعر جوه المشروع نفسه. وابعتلنا الوحدات اللي محتار بينها ونقارنها لك بنفس الطريقة."
        ]
      ],
      [
        "مشروعات القاهرة الجديدة حسب المطور",
        [
          "تحت هتلاقي المطورين ومشاريعهم في القاهرة الجديدة، وكل مشروع مربوط بوحداته وأسعاره الظاهرة حاليًا. الأسعار والتوفر بيتأكدوا مع المطور وقت الطلب لأن القوائم بتتغير."
        ]
      ]
    ],
    faq: [
      ["القاهرة الجديدة والتجمع الخامس هما نفس الحاجة؟", "التجمع الخامس جزء من مدينة القاهرة الجديدة، وهو الأكبر والأشهر فيها. المدينة اتعملت سنة 2000 بقرار جمع التجمع الأول والتالت والخامس، ومساحتها حوالي 343 كيلومتر مربع."],
      ["أسعار الشقق في التجمع الخامس بتبدأ من كام في 2026؟", "عندنا استوديوهات وشقق صغيرة من حوالي 2.8 لـ 4 مليون، والشقة المتوسطة حوالي 127 متر بحوالي 12 مليون، يعني متر حوالي 100 ألف جنيه. وفي كمبوندات المطورين الكبار الشقق بتبدأ من حوالي 9 لـ 16 مليون. الأسعار بتتأكد وقت الطلب."],
      ["أسعار الفلل والتاون هاوس في القاهرة الجديدة كام؟", "التاون هاوس والتوين هاوس من حوالي 13 مليون، وفي نص المعروض حوالي 30 مليون. والفلل المستقلة أغلبها بين 30 و60 مليون، وفيه فلل في مشاريع محدودة من حوالي 13 مليون."],
      ["أقل مقدم في مشاريع التجمع الخامس كام؟", "أغلب المشاريع بمقدم 5%، وفيه مشاريع بمقدم 3% زي Palm Hills New Cairo على 10 سنين وMountain View iCity New Cairo على 12 سنة. وفيه تقسيط لحد 14 سنة في The Mornings."],
      ["فيه وحدات استلام فوري في القاهرة الجديدة؟", "أيوه، زي Mountain View 1.1 وMountain View iCity New Cairo، وفيه وحدات استلام خلال سنة في Hyde Park New Cairo. الجاهز غالبًا مقدمه أعلى وتقسيطه أقصر."],
      ["المونوريل بيعدي على القاهرة الجديدة؟", "أيوه. المرحلة الأولى من مونوريل شرق النيل اشتغلت يوم 6 مايو 2026 بـ16 محطة، من محطة المشير طنطاوي لحد مدينة العدالة في العاصمة الإدارية، ومارة بالقاهرة الجديدة."],
      ["القاهرة الجديدة بعيدة عن المطار ووسط البلد قد إيه؟", "حوالي 20 دقيقة لمطار القاهرة، و20 لـ30 دقيقة لمدينة نصر ومصر الجديدة، و30 دقيقة للعاصمة الإدارية، ومن 40 دقيقة لساعة لوسط البلد حسب الزحمة."],
      ["إيه أحسن منطقة في التجمع للسكن؟", "الأحياء القريبة من شارع التسعين والجامعات زي النرجس واللوتس والجولدن سكوير أكمل في الخدمات وأغلى. التجمع الأول والتالت أرخص وأهدى. وامتداد التجمع السادس أرخص في المشاريع الجديدة بس لسه بيكمل خدماته. الاختيار حسب شغلك ومدارس ولادك وميزانيتك."],
      ["التجمع الخامس ولا مستقبل سيتي؟", "التجمع أكمل في الخدمات والجامعات والإيجار بس أغلى. مستقبل سيتي أرخص في المتر ومقدماتها أقل، بس محتاجة صبر لحد ما الخدمات تكمل."],
      ["الاستثمار في التجمع الخامس مناسب؟", "التجمع من أعلى مناطق شرق القاهرة في طلب الإيجار وإعادة البيع، خصوصًا للشقق المتوسطة في كمبوندات معروفة. بس العائد مش مضمون، واختيار المطور والموقع ونوع الوحدة بيفرق أكتر من المنطقة نفسها."]
    ]
  },
  en: {
    title: ({ plural }) => `New Cairo Projects 2026 — Prices & ${plural}`,
    description: ({ minFmt, plural }) => `New Cairo & Fifth Settlement guide 2026: districts, roads, monorail, price per m² and ${plural} from ${minFmt}, with plans from 3% down.`,
    map: { heading: "New Cairo map", query: "New Cairo, Cairo Governorate, Egypt", locality: "New Cairo" },
    sections: [
      [
        "New Cairo at a glance",
        [
          "New Cairo is a city in East Cairo created by Presidential Decree 191 of 2000, which merged the First, Third and Fifth Settlements into one city under the New Urban Communities Authority. It covers about 343 km², which makes it one of the largest new cities around Cairo.",
          "When people say \"El Tagamoa\" they usually mean the Fifth Settlement, the largest and most expensive part of the city, home to most new compounds, universities and malls. This guide covers New Cairo and the Fifth Settlement together, because buyers search for both names.",
          "As of October 2026, Tycoons lists around 100 available projects in New Cairo from more than 50 developers, with more than 400 priced units. Below you will find the districts, roads and monorail, services, price levels by unit type, payment plans, delivery and how to choose, followed by every available project."
        ]
      ],
      [
        "New Cairo districts",
        [
          "The Fifth Settlement is the core of the city. North and South 90th Street is the main commercial spine, lined with banks, malls and office buildings, surrounded by established districts such as El Narges, El Lotus, El Yasmeen, El Banafseg, El Choueifat and West Golf.",
          "The Golden Square, south of 90th Street near the American University in Cairo, has seen many of the newest launches, such as SODIC's Villette and Solay. Prices there vary widely because luxury compounds sit next to smaller-apartment projects.",
          "The First and Third Settlements are older, quieter and cheaper per square metre, with more resale stock than new launches. Katameya and Katameya Heights on the western side near the Ring Road hold older upscale compounds and golf courses.",
          "To the east, the Sixth Settlement extension near the Suez Road has many new projects with lower down payments and longer plans, such as Crescent Walk by Marakez, El Patio Vida and El Patio Riva by La Vista, and Nest. Services there are still being completed. Mostakbal City, further along the Suez Road, is a separate city with its own guide."
        ]
      ],
      [
        "Roads, transport and the monorail",
        [
          "New Cairo is surrounded by major roads: the Ring Road to the west, the Cairo–Suez Road to the north and the Ain Sokhna Road to the south. Inside the city, 90th Street, the Mohamed Bin Zayed axis and the El Moshir Tantawy axis connect the districts.",
          "Typical driving times on a normal day: about 20 minutes to Cairo Airport, 20–30 minutes to Nasr City and Heliopolis, about 30 minutes to the New Administrative Capital and 40–60 minutes to Downtown Cairo depending on traffic.",
          "The biggest change in 2026 is the monorail. Phase one of the East Nile monorail opened on 6 May 2026 with 16 stations, from El Moshir Tantawy station to Madinet El Adala in the New Capital, running 6 am to 6 pm at launch. Projects near the stations become easier for daily commuting and for renting out."
        ]
      ],
      [
        "Why New Cairo costs more",
        [
          "New Cairo's prices reflect services that already operate: the American University in Cairo, the German University in Cairo, Future University, many international schools, Cairo Festival City at the city entrance (about 700 acres with a mall, parks and offices), the malls along 90th Street and large hospitals such as the Air Force Specialized Hospital.",
          "As a result, New Cairo has some of the strongest rental and resale demand in East Cairo, especially for mid-size apartments in known compounds near 90th Street, and its price per square metre is higher than Mostakbal City, El Shorouk or the New Capital."
        ]
      ],
      [
        "How to compare New Cairo property prices",
        [
          "Figures below come from units listed by Tycoons in October 2026 and are starting prices on installments, not final prices.",
          "Studios and small apartments start at about EGP 2.8–4 million in projects such as Notion and Solay. The typical apartment is about 127 m² at around EGP 12 million, roughly EGP 100,000 per m². In major developers' compounds such as Palm Hills New Cairo, Mountain View iCity New Cairo and Hyde Park New Cairo, apartments start at about EGP 9–16 million.",
          "Townhouses and twin houses start at about EGP 13 million, with a typical price around EGP 30 million for about 220 m². Most standalone villas are between EGP 30 and 60 million.",
          "Compare units with the same type, size, finishing and delivery date, then review the total installment price, down payment and additional payments. A starting price or price per square metre alone does not describe the full deal."
        ]
      ],
      [
        "Payment plans and delivery",
        [
          "Most new New Cairo projects ask for 5% down over 8–10 years. Some offer less: Palm Hills New Cairo at 3% over 10 years, Mountain View iCity New Cairo at 3% over 12 years and 97 Hills at about 2.8%. The Mornings by Al Ahly Sabbour runs up to 14 years.",
          "A 5% down payment is often followed by a second payment a few months later, and some projects add a delivery payment, so ask for the full schedule. Ready or near-ready units are available in Mountain View 1.1, Mountain View iCity New Cairo and Hyde Park New Cairo; they usually need a higher down payment and a shorter plan.",
          "For projects delivering in 3–4 years, check the developer's delivery record on past projects; it matters more than a discount."
        ]
      ],
      [
        "New Cairo projects by developer",
        [
          "The directory below groups developers and their New Cairo projects and links each project to its currently listed units and prices. Prices and availability are reconfirmed with the developer because inventory changes."
        ]
      ]
    ],
    faq: [
      ["Are New Cairo and the Fifth Settlement the same?", "The Fifth Settlement is the largest and best-known part of New Cairo. The city was created in 2000 by merging the First, Third and Fifth Settlements and covers about 343 km²."],
      ["How much does an apartment cost in New Cairo in 2026?", "Studios and small apartments start at about EGP 2.8–4 million. The typical apartment is about 127 m² at around EGP 12 million (about EGP 100,000 per m²). In major developers' compounds apartments start at about EGP 9–16 million. Prices are confirmed at inquiry time."],
      ["What is the lowest down payment in New Cairo?", "Most projects ask for 5%. Palm Hills New Cairo offers 3% over 10 years and Mountain View iCity New Cairo 3% over 12 years."],
      ["Are there ready-to-move units in New Cairo?", "Yes, for example in Mountain View 1.1 and Mountain View iCity New Cairo, with units delivering within a year in Hyde Park New Cairo."],
      ["Does the monorail serve New Cairo?", "Yes. Phase one of the East Nile monorail opened on 6 May 2026 with 16 stations from El Moshir Tantawy station to Madinet El Adala in the New Capital, passing through New Cairo."],
      ["How far is New Cairo from the airport?", "About 20 minutes by car to Cairo Airport, 20–30 minutes to Nasr City and Heliopolis and about 30 minutes to the New Capital."],
      ["How can I compare New Cairo property prices fairly?", "Keep the unit type, size, finishing and delivery date consistent, then compare the total price, down payment, installment term, extra payments and maintenance. Comparing units with different delivery or finishing can be misleading."],
      ["Where can I find New Cairo projects by developer?", "This page groups New Cairo developers and projects and links each project to its available units. Use the list to compare alternatives, then reconfirm price and availability before reserving."]
    ]
  }
};

const NORTH_COAST = {
  ar: {
    title: ({ plural }) => `مشاريع الساحل الشمالي 2026 — أسعار الشاليهات و${plural}`,
    description: ({ minFmt, plural }) => `دليل الساحل الشمالي 2026: المناطق من العلمين لرأس الحكمة، والطرق والقطار السريع، وأسعار الشاليهات والفلل، و${plural} من ${minFmt} بمقدمات من 2.5%.`,
    map: { heading: "خريطة الساحل الشمالي", query: "North Coast, Matrouh Governorate, Egypt", locality: "North Coast" },
    sections: [
      [
        "الساحل الشمالي في سطور",
        [
          "الساحل الشمالي هو شريط القرى والمدن السياحية على البحر المتوسط غرب الإسكندرية، على طول طريق الإسكندرية–مطروح الدولي. أغلب الوحدات فيه شاليهات وتاون هاوس وفلل للمصيف، وبتتباع بنظام الحجز المبكر قبل الصيف بتقسيط طويل.",
          "الساحل اتغير كتير في آخر كام سنة. بقى فيه مدن للسكن طول السنة زي العلمين الجديدة، ومشروع ضخم في رأس الحكمة، وطرق أسرع من القاهرة، وقطار سريع جاي. علشان كده المناطق جواه بقت مختلفة جدًا في السعر والاستخدام.",
          "في Tycoons عندنا وقت كتابة الصفحة (أكتوبر 2026) حوالي 40 مشروع متاح في الساحل لأكتر من 20 مطور، وحوالي 260 وحدة بأسعارها. الصفحة دي بتشرح المناطق، والوصول، ومستويات الأسعار حسب نوع الوحدة، وأنظمة السداد، والإيجار الموسمي، وإزاي تختار. وتحت الصفحة كل المشاريع المتاحة."
        ]
      ],
      [
        "مناطق الساحل الشمالي من الشرق للغرب",
        [
          "العلمين ومارينا: أقرب منطقة للإسكندرية والقاهرة في الساحل الجديد. فيها العلمين الجديدة، وهي مدينة للسكن طول السنة فيها أبراج وجامعات وخدمات، وليها صفحة خاصة عندنا. وحواليها مشاريع زي Downtown New Alamein وIl Latini وBlu Stays - The Island.",
          "سيدي عبد الرحمن وغزالة باي: من أقدم مناطق الساحل الراقي، شواطئها معروفة بالرمل الأبيض والمية الهادية، وفيها مشاريع زي Mountain View Crysta وBianchi Ilios وZoya Ghazala Bay وLa Vista Cascada. أسعارها عالية لأن جزء كبير منها اتسلم واتسكن.",
          "الضبعة: منطقة بتكبر بسرعة بعد طريق الضبعة اللي قرب المسافة من القاهرة، وفيها مشاريع زي Seazen وD.O.S.E وLa Vista Bay East. أسعارها لسه أقل من رأس الحكمة في كتير من المشاريع.",
          "رأس الحكمة: أكتر منطقة عليها طلب دلوقتي، بسبب مشروع مدينة رأس الحكمة الكبير. فيها مشاريع كتير لمطورين كبار زي Fouka Bay وSalt من Tatweer Misr، وHacienda Ras El Hekma من Palm Hills، وMountain View Ras El Hekma، وJefaira، وThe Med، وDirection White من Arabella، وLa Vista Ras El Hikma. وكل ما تروح غرب أكتر ناحية مطروح الأسعار بتقل والمسافة بتزيد."
        ]
      ],
      [
        "مشروع مدينة رأس الحكمة وتأثيره على الأسعار",
        [
          "في فبراير 2024 مصر وقعت مع شركة ADQ الإماراتية صفقة تطوير مدينة رأس الحكمة، واتعينت شركة مدن القابضة مطور رئيسي للمشروع. المساحة الكلية حوالي 170 مليون متر مربع، والمرحلة الأولى حوالي 50 مليون متر، والمستهدف إن الاستثمارات توصل لحوالي 110 مليار دولار بحلول 2045.",
          "المخطط فيه مناطق سكنية ومكاتب وفنادق ومارينا دولية ومنطقة حرة، ومطار دولي من أولويات المراحل الأولى، وربط بالقطار السريع. ده معناه إن رأس الحكمة ممكن تتحول من مصيف لمدينة شغالة طول السنة.",
          "الصفقة رفعت أسعار رأس الحكمة والمناطق القريبة منها بشكل واضح من 2024. بس خد بالك: المشاريع اللي بتتباع دلوقتي في رأس الحكمة أغلبها قرى لمطورين تانيين حوالين المشروع، مش جوه مدينة مدن نفسها، وتطوير المدينة الكاملة هياخد سنين."
        ]
      ],
      [
        "الطرق والمطارات والقطار السريع",
        [
          "الطريق الأساسي جوه الساحل هو طريق الإسكندرية–مطروح الدولي، وكل القرى عليه بالكيلو. من القاهرة فيه طريقين: طريق القاهرة–الإسكندرية الصحراوي ثم طريق العلمين، أو طريق الضبعة الجديد اللي بيوصل مباشرة لمنطقة الضبعة ورأس الحكمة.",
          "المسافات التقريبية بالعربية من غرب القاهرة في الأيام العادية: حوالي ساعتين ونص لـ3 ساعات للعلمين وسيدي عبد الرحمن، وحوالي 3 لـ3.5 ساعة لرأس الحكمة. في الويك إند وأيام الصيف المدة بتزيد.",
          "المطارات القريبة: مطار العلمين الدولي، ومطار برج العرب في الإسكندرية، ومطار مرسى مطروح. ومخطط مطار دولي جديد في رأس الحكمة.",
          "القطار الكهربائي السريع (الخط الأول من العين السخنة للعلمين ومطروح، طوله حوالي 660 كيلو و21 محطة) لسه تحت التشغيل التجريبي، ووزير النقل أعلن إن المستهدف تشغيله للركاب في يوليو 2027، والزمن المتوقع من القاهرة لمطروح من ساعتين لساعتين ونص. لو ده اتنفذ في ميعاده هيفرق جدًا في السكن طول السنة."
        ]
      ],
      [
        "أسعار الشاليهات والفلل في الساحل الشمالي 2026",
        [
          "الأرقام دي من الوحدات المتاحة عندنا وقت كتابة الصفحة (أكتوبر 2026)، وهي أسعار بداية بالتقسيط. الساحل أغلى في المتر من القاهرة الجديدة لأن الوحدات غالبًا متشطبة بالكامل وجنب البحر.",
          "الاستوديو والشقة الصغيرة بتبدأ من حوالي 4 مليون في مشاريع زي Sadaf وIl Latini. الشاليه هو أكتر نوع معروض: بيبدأ من حوالي 5 مليون في D.O.S.E، وفي نص المعروض سعره حوالي 22 مليون لمساحة حوالي 136 متر، يعني متر حوالي 170 ألف جنيه.",
          "التاون هاوس والتوين هاوس من حوالي 13 مليون، وفي نص المعروض حوالي 36 مليون. والفلل المستقلة أغلبها من 40 لأكتر من 100 مليون، وفي نص المعروض حوالي 76 مليون.",
          "أكتر حاجات بتغير السعر في الساحل: الصف (أول صف على البحر ولا على اللاجون ولا ورا)، والمسافة من الشاطئ، والدور (أرضي بجنينة ولا روف)، ومنطقة القرية نفسها. نفس مساحة الشاليه ممكن سعرها يفرق 50% بين صف أول وصف تالت."
        ]
      ],
      [
        "أنظمة السداد والاستلام في الساحل",
        [
          "أغلب مشاريع الساحل بمقدم 5% وتقسيط من 8 لـ 10 سنين. وفيه مقدمات أقل: مشاريع Mountain View في الساحل زي Crysta وRas El Hekma وLVLS بمقدم 3% على 12 سنة، وHacienda Blue من Palm Hills بمقدم 2.5% على 12 سنة.",
          "كتير من المشاريع بيبقى فيها دفعة تانية بعد المقدم بشهور (زي 5% + 5% بعد 3 شهور)، وبعضها فيه دفعة استلام. والمشاريع الجاهزة أو القريبة من الاستلام غالبًا مقدمها أعلى ومدتها أقصر، زي La Vista Ras El Hikma بمقدم 20% على 4 سنين.",
          "فيه وحدات استلام فوري أو قريب في Mountain View Ras El Hekma وLa Vista Ras El Hikma وLa Vista Cascada وDowntown New Alamein. ومعظم المشاريع الجديدة استلامها بين 2027 و2030.",
          "متنساش وديعة الصيانة: في الساحل بتبقى أعلى من القاهرة لأنها بتغطي الشواطئ وحمامات السباحة والأمن طول السنة، وفي بعض المشاريع بتوصل 10% من سعر الوحدة. اسأل عنها قبل الحجز."
        ]
      ],
      [
        "مصيف ولا استثمار ولا سكن طول السنة؟",
        [
          "للمصيف الشخصي: اختار المنطقة على حسب المسافة اللي هتسوقها كل ويك إند، ونوع الشاطئ اللي بتحبه، والخدمات اللي بتشتغل بره الموسم. العلمين وسيدي عبد الرحمن أقرب، ورأس الحكمة أبعد بس أحدث.",
          "للإيجار الموسمي: الطلب بيتركز في حوالي 3 شهور من يونيو لسبتمبر، والشاليهات الصغيرة القريبة من البحر في قرى معروفة هي الأسهل في الإيجار. احسب العائد على الموسم بس، وخصم منه الصيانة والفرش والإدارة. وفيه مشاريع فيها شقق فندقية بإدارة فندقية زي Swissotel Residences والوحدات الفندقية في Rituals Village Zoya، ودي بتريحك من الإدارة.",
          "للسكن طول السنة: العلمين الجديدة هي الأوضح لحد دلوقتي، ورأس الحكمة ممكن تبقى كده مع تطوير المدينة والمطار والقطار. وفي كل الحالات العائد مش مضمون."
        ]
      ],
      [
        "إزاي تختار مشروع في الساحل الشمالي؟",
        [
          "ابدأ بالمنطقة والمسافة، بعدها المطور وسجله في الساحل (فيه مطورين قراهم اتسلمت ومسكونة من سنين)، بعدها مكان الوحدة جوه القرية، وفي الآخر نظام السداد. المقدم الأقل مش دايمًا الصفقة الأحسن لو الوحدة في صف بعيد أو القرية لسه أرض.",
          "اسأل عن طبيعة الشاطئ (رملي ولا صخري، المية عميقة ولا هادية)، ومواعيد تشغيل الخدمات في الشتا، ووديعة الصيانة، والتشطيب (متشطب بالكامل ولا بتكييفات ولا مفروش). وابعتلنا المشاريع اللي محتار بينها ونقارنها لك."
        ]
      ]
    ],
    faq: [
      ["أسعار الشاليهات في الساحل الشمالي بتبدأ من كام في 2026؟", "الشاليه بيبدأ من حوالي 5 مليون، وفي نص المعروض عندنا حوالي 22 مليون لمساحة حوالي 136 متر، يعني متر حوالي 170 ألف جنيه. والاستوديو والشقة الصغيرة من حوالي 4 مليون. الأسعار بتتأكد وقت الطلب."],
      ["أسعار الفلل في الساحل الشمالي كام؟", "التاون هاوس والتوين هاوس من حوالي 13 مليون وفي نص المعروض حوالي 36 مليون، والفلل المستقلة أغلبها من 40 لأكتر من 100 مليون."],
      ["أقل مقدم في مشاريع الساحل كام؟", "فيه مشاريع بمقدم 2.5% زي Hacienda Blue على 12 سنة، ومشاريع Mountain View في الساحل بمقدم 3% على 12 سنة. وأغلب المشاريع بمقدم 5% على 8 لـ 10 سنين."],
      ["إيه أحسن منطقة في الساحل الشمالي؟", "على حسب هدفك: العلمين وسيدي عبد الرحمن أقرب ومسكونة أكتر، والضبعة لسه أسعارها أقل نسبيًا، ورأس الحكمة الأحدث وعليها أعلى طلب بسبب مشروع مدينة رأس الحكمة، بس أبعد."],
      ["إيه هو مشروع رأس الحكمة؟", "صفقة اتوقعت في فبراير 2024 مع شركة ADQ الإماراتية لتطوير مدينة على حوالي 170 مليون متر مربع، ومدن القابضة هي المطور الرئيسي. المخطط فيه سكن وفنادق ومارينا ومنطقة حرة ومطار دولي، والاستثمارات المستهدفة حوالي 110 مليار دولار بحلول 2045."],
      ["الساحل الشمالي بعيد عن القاهرة قد إيه؟", "حوالي ساعتين ونص لـ3 ساعات بالعربية للعلمين وسيدي عبد الرحمن، وحوالي 3 لـ3.5 ساعة لرأس الحكمة عن طريق الضبعة، في الأيام العادية."],
      ["القطار السريع هيوصل الساحل إمتى؟", "الخط الأول من العين السخنة للعلمين ومطروح لسه تحت التشغيل التجريبي، ووزير النقل أعلن إن المستهدف تشغيله للركاب في يوليو 2027، والزمن المتوقع من القاهرة لمطروح ساعتين لساعتين ونص."],
      ["فيه وحدات استلام فوري في الساحل؟", "أيوه، في Mountain View Ras El Hekma وLa Vista Ras El Hikma وLa Vista Cascada وDowntown New Alamein. الجاهز غالبًا مقدمه أعلى وتقسيطه أقصر."],
      ["الإيجار في الساحل الشمالي مربح؟", "الطلب بيتركز في حوالي 3 شهور في الصيف. الشاليهات الصغيرة القريبة من البحر في قرى معروفة الأسهل في الإيجار، بس احسب العائد بعد الصيانة والفرش والإدارة، والعائد مش مضمون."],
      ["وديعة الصيانة في الساحل كام؟", "بتختلف حسب المشروع، وفي الساحل غالبًا أعلى من القاهرة، وفي بعض المشاريع بتوصل 10% من سعر الوحدة. اسأل عنها قبل الحجز."]
    ]
  },
  en: {
    title: ({ plural }) => `North Coast Projects 2026 — Chalet Prices & ${plural}`,
    description: ({ minFmt, plural }) => `North Coast guide 2026: Alamein to Ras El Hekma, roads, high-speed rail and chalet prices, with ${plural} from ${minFmt} and 2.5% down plans.`,
    map: { heading: "North Coast map", query: "North Coast, Matrouh Governorate, Egypt", locality: "North Coast" },
    sections: [
      [
        "The North Coast at a glance",
        [
          "Egypt's North Coast (Sahel) is the strip of holiday villages and new cities on the Mediterranean west of Alexandria, along the Alexandria–Matrouh road. Most units are chalets, townhouses and villas for summer use, sold off-plan in early-booking phases with long payment plans.",
          "The coast has changed a lot: there are now year-round cities such as New Alamein, a major new city at Ras El Hekma, faster roads from Cairo and a high-speed railway on the way. Areas along the coast now differ widely in price and use.",
          "As of October 2026, Tycoons lists around 40 available North Coast projects from more than 20 developers, with about 260 priced units. Below you will find the areas, access, prices by unit type, payment plans, seasonal rental and how to choose, followed by every available project."
        ]
      ],
      [
        "North Coast areas from east to west",
        [
          "Alamein and Marina: the closest part of the new coast to Alexandria and Cairo, including New Alamein, a year-round city with towers, universities and services (it has its own guide). Projects nearby include Downtown New Alamein, Il Latini and Blu Stays - The Island.",
          "Sidi Abdel Rahman and Ghazala Bay: among the oldest upscale stretches, known for white sand and calm water, with projects such as Mountain View Crysta, Bianchi Ilios, Zoya Ghazala Bay and La Vista Cascada.",
          "El Dabaa: growing fast since the Dabaa road shortened the drive from Cairo, with projects such as Seazen, D.O.S.E and La Vista Bay East, often cheaper than Ras El Hekma.",
          "Ras El Hekma: the area in highest demand, driven by the Ras El Hekma city project, with Fouka Bay and Salt by Tatweer Misr, Hacienda Ras El Hekma by Palm Hills, Mountain View Ras El Hekma, Jefaira, The Med, Direction White by Arabella and La Vista Ras El Hikma."
        ]
      ],
      [
        "The Ras El Hekma city project",
        [
          "In February 2024 Egypt signed the Ras El Hekma development deal with Abu Dhabi's ADQ, which appointed Modon Holding as master developer. The project covers about 170 million m², with a first phase of about 50 million m², and targets about USD 110 billion in investment by 2045.",
          "The plan includes residential districts, offices, hotels, an international marina, a free zone, an international airport as an early priority and a high-speed rail link. The deal has pushed prices up in Ras El Hekma and nearby since 2024, but most projects on sale today are villages by other developers around the project, and the full city will take years."
        ]
      ],
      [
        "Roads, airports and high-speed rail",
        [
          "Inside the coast, every village sits on the Alexandria–Matrouh road by kilometre marker. From Cairo you drive either via the Cairo–Alexandria desert road and the Alamein road, or the newer Dabaa road straight to El Dabaa and Ras El Hekma. Typical times from West Cairo are about 2.5–3 hours to Alamein and Sidi Abdel Rahman and 3–3.5 hours to Ras El Hekma.",
          "Nearby airports are El Alamein International, Borg El Arab in Alexandria and Marsa Matrouh, with a new international airport planned at Ras El Hekma.",
          "The first high-speed electric rail line, from Ain Sokhna to Alamein and Marsa Matrouh (about 660 km, 21 stations), is in trial operation, and the Transport Minister has said passenger service is targeted for July 2027, with Cairo to Matrouh expected in 2–2.5 hours."
        ]
      ],
      [
        "North Coast prices in 2026",
        [
          "Figures come from units listed by Tycoons in October 2026 and are starting prices on installments. The coast costs more per square metre than New Cairo because units are usually fully finished and close to the sea.",
          "Studios and small apartments start at about EGP 4 million. Chalets are the most common unit: from about EGP 5 million in D.O.S.E, with a typical chalet around EGP 22 million for about 136 m² (roughly EGP 170,000 per m²). Townhouses and twin houses start at about EGP 13 million (typical around EGP 36 million), and most standalone villas range from EGP 40 million to over 100 million.",
          "The row (first row on the sea, on a lagoon or further back), distance to the beach and floor change prices the most: the same chalet size can differ by 50% between the first and third row."
        ]
      ],
      [
        "Payment plans, delivery and maintenance",
        [
          "Most North Coast projects ask for 5% down over 8–10 years. Mountain View's coastal projects (Crysta, Ras El Hekma, LVLS) offer 3% over 12 years and Palm Hills' Hacienda Blue 2.5% over 12 years. Ready or near-ready units exist in Mountain View Ras El Hekma, La Vista Ras El Hikma, La Vista Cascada and Downtown New Alamein, usually with a higher down payment and shorter plan; most new projects deliver between 2027 and 2030.",
          "Maintenance deposits on the coast are usually higher than in Cairo and reach 10% of the unit price in some projects, so ask before reserving."
        ]
      ],
      [
        "Holiday home, investment or year-round living?",
        [
          "For personal use, choose by driving distance, beach type and which services run off-season. For seasonal rental, demand is concentrated in roughly three months (June to September); small chalets close to the sea in known villages rent most easily, and hotel-managed units such as Swissotel Residences or the serviced units in Rituals Village Zoya remove the management work. For year-round living, New Alamein is the clearest option today. Returns are never guaranteed."
        ]
      ]
    ],
    faq: [
      ["How much does a chalet cost on the North Coast in 2026?", "Chalets start at about EGP 5 million; the typical chalet we list is around EGP 22 million for about 136 m² (roughly EGP 170,000 per m²). Studios and small apartments start at about EGP 4 million. Prices are confirmed at inquiry time."],
      ["What is the lowest down payment on the North Coast?", "Hacienda Blue by Palm Hills offers 2.5% over 12 years, and Mountain View's coastal projects 3% over 12 years. Most projects ask for 5% over 8–10 years."],
      ["Which North Coast area is best?", "Alamein and Sidi Abdel Rahman are closer and more established, El Dabaa is relatively cheaper, and Ras El Hekma is the newest and in highest demand but furthest from Cairo."],
      ["What is the Ras El Hekma project?", "A city development signed in February 2024 with Abu Dhabi's ADQ on about 170 million m², with Modon Holding as master developer, planned housing, hotels, a marina, a free zone and an international airport, targeting about USD 110 billion of investment by 2045."],
      ["How far is the North Coast from Cairo?", "About 2.5–3 hours by car to Alamein and Sidi Abdel Rahman, and 3–3.5 hours to Ras El Hekma via the Dabaa road, on a normal day."],
      ["When will the high-speed train reach the North Coast?", "The Ain Sokhna–Alamein–Matrouh line is in trial operation, and passenger service is targeted for July 2027 according to the Transport Minister."],
      ["Are there ready-to-move units on the North Coast?", "Yes, in Mountain View Ras El Hekma, La Vista Ras El Hikma, La Vista Cascada and Downtown New Alamein."],
      ["Is renting out a North Coast chalet profitable?", "Demand is concentrated in about three summer months. Small chalets near the sea in known villages rent best, but calculate returns after maintenance, furnishing and management; returns are not guaranteed."]
    ]
  }
};

const SHEIKH_ZAYED = {
  ar: {
    title: ({ plural }) => `كمبوندات الشيخ زايد 2026 — الأسعار و${plural}`,
    description: ({ minFmt, plural }) => `دليل الشيخ زايد وزايد الجديدة 2026: المناطق والطرق والمونوريل والخدمات وأسعار المتر، و${plural} متاحة بأسعار من ${minFmt} ومقدمات من 3%.`,
    map: { heading: "خريطة الشيخ زايد", query: "Sheikh Zayed City, Giza Governorate, Egypt", locality: "Sheikh Zayed City" },
    sections: [
      [
        "الشيخ زايد في سطور",
        [
          "مدينة الشيخ زايد في غرب القاهرة الكبرى، تابعة لمحافظة الجيزة، واتأسست في منتصف التسعينات. حدها من الشمال طريق القاهرة–الإسكندرية الصحراوي، ومن الجنوب محور 26 يوليو، وجنبها مدينة 6 أكتوبر. وبعيدة حوالي 20 كيلو عن المهندسين وحوالي 28 كيلو عن ميدان التحرير.",
          "المدينة القديمة أغلبها أحياء وكمبوندات اتسكنت من سنين، وعلشان كده خدماتها مكتملة وطلبها السكني ثابت. والمشاريع الجديدة أغلبها في توسعات المدينة اللي اسمها زايد الجديدة، ومساحتها حوالي 10 آلاف فدان حسب وزارة الإسكان.",
          "في Tycoons عندنا وقت كتابة الصفحة (أكتوبر 2026) حوالي 26 مشروع متاح في الشيخ زايد وزايد الجديدة لمطورين زي SODIC وPalm Hills وMountain View وTatweer Misr وHyde Park وOra، وحوالي 170 وحدة بأسعارها. الصفحة دي بتشرح المناطق والطرق والخدمات والأسعار وأنظمة السداد وإزاي تختار، وتحت الصفحة كل المشاريع المتاحة."
        ]
      ],
      [
        "الشيخ زايد القديمة وزايد الجديدة",
        [
          "الشيخ زايد القديمة متقسمة لأحياء ومجاورات، وفيها كمبوندات معروفة اتسلمت من سنين ومولات ومستشفيات ومدارس. المعروض فيها جديد قليل، وأغلبه إعادة بيع أو مراحل أخيرة في مشاريع قايمة، زي Allegria Residence وForty West من SODIC وMountain View 4 اللي فيه وحدات جاهزة.",
          "زايد الجديدة هي امتداد المدينة، وفيها أغلب الإطلاقات الجديدة لكبار المطورين: The Estates وVYE وKarmell وSODIC 464 Acre من SODIC، وJirian من Palm Hills، وRivers من Tatweer Misr، وSolana West من Ora. المنطقة دي بتتبني بسرعة، والمشاريع فيها أرخص في البداية من المدينة القديمة وتقسيطها أطول.",
          "الفرق بين المنطقتين زي الفرق بين التجمع الخامس القديم وامتداداته: القديم أكمل وأغلى في إعادة البيع، والجديد أرخص ومحتاج وقت لحد ما الخدمات تكمل. اسأل دايمًا المشروع في أنهي جزء بالظبط."
        ]
      ],
      [
        "الطرق والمواصلات والمونوريل",
        [
          "أهم الطرق: محور 26 يوليو اللي بيوصل زايد بالمهندسين ووسط البلد، وطريق القاهرة–الإسكندرية الصحراوي، ووصلة دهشور، والطريق الدائري، ومحور روض الفرج اللي بيربط غرب القاهرة بشمالها. محور 26 يوليو هو الأزحم، وعليه أعمال تطوير ومونوريل.",
          "المسافات التقريبية بالعربية في الأيام العادية: حوالي 25 لـ40 دقيقة للمهندسين والزمالك حسب الزحمة، وحوالي 20 دقيقة لمطار سفنكس، وحوالي 25 دقيقة للمتحف المصري الكبير والأهرامات، وساعة لساعة وربع لمطار القاهرة.",
          "مونوريل غرب النيل (مونوريل 6 أكتوبر) قرب يبدأ التشغيل التجريبي، والمحطات الأولى المعلنة فيها محطة مدينة الشيخ زايد ووصلة دهشور وطريق الإسكندرية الصحراوي، وبيربط أكتوبر وزايد بوادي النيل. لما يشتغل هيخفف الاعتماد على محور 26 يوليو، والمشاريع القريبة من المحطات هتستفيد."
        ]
      ],
      [
        "الخدمات في الشيخ زايد",
        [
          "زايد من أكمل مناطق غرب القاهرة في الخدمات. فيها جامعة النيل، وكلية الهندسة بجامعة القاهرة فرع زايد، والأكاديمية العربية للعلوم والتكنولوجيا، ومدارس دولية كبيرة زي المدرسة البريطانية والمدرسة الأمريكية الدولية.",
          "وفيها مولات ومناطق تجارية كتير زي أركان بلازا وجاليريا 40 وهايبر وان، وقريبة من مول العرب على محور 26 يوليو. ومستشفيات زي مستشفى الشيخ زايد التخصصي. ده غير النوادي والخدمات اللي جوه الكمبوندات الكبيرة.",
          "علشان كده الطلب السكني في زايد ثابت، والمشاريع القريبة من المحاور الرئيسية بتحافظ على سيولة إعادة بيع عالية."
        ]
      ],
      [
        "أسعار الشقق والفلل في الشيخ زايد 2026",
        [
          "الأرقام دي من الوحدات المتاحة عندنا وقت كتابة الصفحة (أكتوبر 2026)، وهي أسعار بداية بالتقسيط.",
          "الشقق بتبدأ من حوالي 5.5 مليون في Rivers، ومن حوالي 6.5 لـ 7 مليون في Signature وGarden Lakes من Hyde Park وVillage West. الشقة المتوسطة عندنا حوالي 146 متر، وفي نص المعروض سعرها حوالي 17 مليون، يعني متر حوالي 120 ألف جنيه. وده أعلى شوية من التجمع الخامس لأن مساحات الشقق في زايد أكبر ونسبة كمبوندات المطورين الكبار أعلى.",
          "الدوبلكس من حوالي 11.5 مليون. التاون هاوس والتوين هاوس من حوالي 14.5 مليون، وفي نص المعروض حوالي 26 مليون. والفلل المستقلة من حوالي 16.5 مليون، وفي نص المعروض حوالي 43 مليون، وفي مشاريع زي The Estates بتعدي 70 مليون.",
          "زي أي منطقة، المقارنة الصح بين وحدات من نفس النوع والمساحة والتشطيب والاستلام، مش بين سعر البداية في مشروع وسعر وحدة كبيرة في مشروع تاني."
        ]
      ],
      [
        "أنظمة السداد والاستلام",
        [
          "أغلب مشاريع زايد بمقدم 5% وتقسيط من 8 لـ 10 سنين، زي Jirian من Palm Hills (5% على 8 سنين) وRivers من Tatweer Misr (5% + 5% بعد 3 شهور على 10 سنين) ومشاريع SODIC (من 5% لـ 10% على 10 سنين). ومشاريع Mountain View في زايد بمقدم 3% وتقسيط لحد 12 سنة.",
          "للي محتاج يسكن قريب: Mountain View 4 فيه وحدات جاهزة، وSODIC 464 Acre وVYE استلامهم المعلن في 2026، ومشاريع Hyde Park في زايد استلامها خلال حوالي سنتين. والمشاريع الجديدة في زايد الجديدة أغلب استلامها بين 2028 و2030.",
          "اسأل عن الجدول الكامل: الدفعة التانية بعد المقدم، ودفعة الاستلام لو موجودة، ووديعة الصيانة، وموعد الاستلام في العقد مش في الإعلان."
        ]
      ],
      [
        "الشيخ زايد ولا التجمع الخامس؟",
        [
          "الاتنين مناطق مكتملة الخدمات وأسعارهم متقاربة. الاختيار الحقيقي بيبقى على مكان شغلك وحياتك: لو شغلك وعيلتك في غرب القاهرة أو المهندسين أو الدقي، زايد أوفر في الوقت. ولو في مدينة نصر ومصر الجديدة والعاصمة، التجمع أنسب.",
          "زايد أهدى ومساحاتها أوسع، والتجمع فيه اختيارات أكتر بكتير ومشاريع أكتر في كل مستوى سعر. وفي الاتنين، الكمبوندات القريبة من المحاور الرئيسية والخدمات الشغالة هي الأسهل في الإيجار وإعادة البيع."
        ]
      ],
      [
        "إزاي تختار مشروع في الشيخ زايد؟",
        [
          "حدد الأول: زايد القديمة ولا زايد الجديدة، وجاهز ولا تحت الإنشاء. بعدها قارن المطورين بسجل التسليم، وبعدين المسافة للمحور اللي هتستخدمه (26 يوليو ولا الصحراوي ولا دهشور)، وفي الآخر نظام السداد.",
          "ابعتلنا الوحدات اللي محتار بينها، ونقارنها لك بنفس النوع والمساحة والتشطيب والاستلام، ونأكدلك السعر والتوفر مع المطور."
        ]
      ]
    ],
    faq: [
      ["أسعار الشقق في الشيخ زايد بتبدأ من كام في 2026؟", "الشقق عندنا بتبدأ من حوالي 5.5 مليون، والشقة المتوسطة حوالي 146 متر بحوالي 17 مليون، يعني متر حوالي 120 ألف جنيه. الأسعار بتتأكد وقت الطلب."],
      ["أسعار الفلل والتاون هاوس في زايد كام؟", "التاون هاوس والتوين هاوس من حوالي 14.5 مليون وفي نص المعروض حوالي 26 مليون، والفلل المستقلة من حوالي 16.5 مليون وفي نص المعروض حوالي 43 مليون."],
      ["إيه الفرق بين الشيخ زايد وزايد الجديدة؟", "الشيخ زايد القديمة مسكونة وخدماتها مكتملة والمعروض فيها أغلبه إعادة بيع أو مراحل أخيرة. زايد الجديدة امتداد المدينة على حوالي 10 آلاف فدان، وفيها أغلب الإطلاقات الجديدة، وأرخص في البداية وتقسيطها أطول."],
      ["أقل مقدم في كمبوندات الشيخ زايد كام؟", "مشاريع Mountain View في زايد بمقدم 3% وتقسيط لحد 12 سنة، وأغلب المشاريع التانية بمقدم 5% على 8 لـ 10 سنين."],
      ["فيه وحدات استلام فوري في الشيخ زايد؟", "أيوه، زي Mountain View 4، وفيه مشاريع استلامها المعلن في 2026 زي SODIC 464 Acre وVYE."],
      ["فيه مونوريل في الشيخ زايد؟", "مونوريل غرب النيل قرب يبدأ التشغيل التجريبي، ومن محطاته المعلنة محطة مدينة الشيخ زايد ووصلة دهشور، وبيربط أكتوبر وزايد بوادي النيل."],
      ["الشيخ زايد بعيدة عن وسط البلد قد إيه؟", "حوالي 28 كيلو عن ميدان التحرير و20 كيلو عن المهندسين، يعني من 25 لـ40 دقيقة للمهندسين بالعربية حسب الزحمة على محور 26 يوليو."],
      ["الشيخ زايد ولا التجمع الخامس؟", "الاتنين مكتملين والأسعار متقاربة. لو شغلك وحياتك في غرب القاهرة زايد أوفر في الوقت، ولو في شرق القاهرة التجمع أنسب. التجمع فيه اختيارات ومشاريع أكتر."],
      ["الاستثمار في الشيخ زايد مناسب؟", "الطلب السكني في زايد ثابت، والمشاريع القريبة من المحاور والخدمات بتحافظ على سيولة إعادة بيع عالية. بس العائد مش مضمون، واختيار المطور والموقع بيفرق."]
    ]
  },
  en: {
    title: ({ plural }) => `Sheikh Zayed Compounds 2026 — Prices & ${plural}`,
    description: ({ minFmt, plural }) => `Sheikh Zayed & New Zayed guide 2026: districts, roads, monorail, services and price per m², with ${plural} from ${minFmt} and plans from 3% down.`,
    map: { heading: "Sheikh Zayed map", query: "Sheikh Zayed City, Giza Governorate, Egypt", locality: "Sheikh Zayed City" },
    sections: [
      [
        "Sheikh Zayed at a glance",
        [
          "Sheikh Zayed City is in West Greater Cairo, in Giza Governorate, founded in the mid-1990s. The Cairo–Alexandria desert road forms its northern edge and the 26th of July corridor its southern edge, next to 6th of October City, about 20 km from Mohandessin and 28 km from Tahrir Square.",
          "The original city is mostly established districts and compounds with complete services and steady demand. Most new projects are in the city's extension, New Zayed, which covers about 10,000 feddans according to the Housing Ministry.",
          "As of October 2026, Tycoons lists around 26 available projects in Sheikh Zayed and New Zayed from developers including SODIC, Palm Hills, Mountain View, Tatweer Misr, Hyde Park and Ora, with about 170 priced units."
        ]
      ],
      [
        "Old Sheikh Zayed vs New Zayed",
        [
          "Old Sheikh Zayed has long-delivered compounds, malls, hospitals and schools; new supply is limited and mostly resale or final phases, such as SODIC's Allegria Residence and Forty West, and Mountain View 4 with ready units.",
          "New Zayed holds most new launches: The Estates, VYE, Karmell and SODIC 464 Acre by SODIC, Jirian by Palm Hills, Rivers by Tatweer Misr and Solana West by Ora. It is cheaper at launch with longer plans, but services are still being completed."
        ]
      ],
      [
        "Roads, transport and the monorail",
        [
          "Key roads are the 26th of July corridor to Mohandessin and Downtown, the Cairo–Alexandria desert road, the Dahshur link, the Ring Road and the Rod El Farag axis. Typical driving times: 25–40 minutes to Mohandessin and Zamalek, about 20 minutes to Sphinx Airport, about 25 minutes to the Grand Egyptian Museum and the Pyramids, and 60–75 minutes to Cairo Airport.",
          "The West Nile (6th of October) monorail is close to trial operation; its first announced stations include Sheikh Zayed City, the Dahshur link and the Alexandria desert road, connecting October and Zayed to the Nile valley. Once running, it should ease reliance on the 26th of July corridor."
        ]
      ],
      [
        "Services in Sheikh Zayed",
        [
          "Sheikh Zayed is one of West Cairo's most complete areas: Nile University, Cairo University's engineering campus, the Arab Academy for Science and Technology, international schools such as The British School and the American International School, malls such as Arkan Plaza, Galleria 40 and Hyper One, Mall of Arabia nearby on the 26th of July corridor, and Sheikh Zayed Specialized Hospital."
        ]
      ],
      [
        "Sheikh Zayed prices in 2026",
        [
          "Figures come from units listed by Tycoons in October 2026 and are starting prices on installments. Apartments start at about EGP 5.5 million in Rivers and EGP 6.5–7 million in Signature, Garden Lakes and Village West. The typical apartment is about 146 m² at around EGP 17 million, roughly EGP 120,000 per m².",
          "Duplexes start at about EGP 11.5 million, townhouses and twin houses at about EGP 14.5 million (typical around EGP 26 million) and standalone villas at about EGP 16.5 million (typical around EGP 43 million, above EGP 70 million in The Estates)."
        ]
      ],
      [
        "Payment plans and delivery",
        [
          "Most Sheikh Zayed projects ask for 5% down over 8–10 years, such as Jirian (5% over 8 years), Rivers (5% + 5% after 3 months over 10 years) and SODIC projects (5–10% over 10 years). Mountain View's Zayed projects offer 3% over up to 12 years.",
          "Mountain View 4 has ready units, SODIC 464 Acre and VYE have announced 2026 delivery, and Hyde Park's Zayed projects deliver in about two years. Most New Zayed launches deliver between 2028 and 2030."
        ]
      ],
      [
        "Sheikh Zayed or New Cairo?",
        [
          "Both are complete areas with similar prices. If your work and family are in West Cairo, Mohandessin or Dokki, Zayed saves time; if they are in Nasr City, Heliopolis or the New Capital, New Cairo fits better. Zayed is quieter with larger units, while New Cairo offers many more projects at every price level."
        ]
      ]
    ],
    faq: [
      ["How much does an apartment cost in Sheikh Zayed in 2026?", "Apartments start at about EGP 5.5 million; the typical apartment is about 146 m² at around EGP 17 million (about EGP 120,000 per m²). Prices are confirmed at inquiry time."],
      ["What is the difference between Sheikh Zayed and New Zayed?", "Old Sheikh Zayed is established with complete services and mostly resale supply. New Zayed is the city's extension of about 10,000 feddans, with most new launches, lower entry prices and longer plans."],
      ["What is the lowest down payment in Sheikh Zayed?", "Mountain View's Zayed projects offer 3% over up to 12 years; most other projects ask for 5% over 8–10 years."],
      ["Are there ready-to-move units in Sheikh Zayed?", "Yes, for example Mountain View 4, while SODIC 464 Acre and VYE have announced 2026 delivery."],
      ["Is there a monorail in Sheikh Zayed?", "The West Nile monorail is close to trial operation, with announced stations including Sheikh Zayed City and the Dahshur link."],
      ["How far is Sheikh Zayed from Downtown Cairo?", "About 28 km from Tahrir Square and 20 km from Mohandessin, roughly 25–40 minutes to Mohandessin by car depending on traffic."],
      ["Sheikh Zayed or New Cairo?", "Both are complete with similar prices. Choose Zayed if your life is in West Cairo and New Cairo if it is in East Cairo; New Cairo has more projects to choose from."]
    ]
  }
};

module.exports = { AREA_GUIDES: { "new-cairo": NEW_CAIRO, "north-coast": NORTH_COAST, "sheikh-zayed": SHEIKH_ZAYED } };
