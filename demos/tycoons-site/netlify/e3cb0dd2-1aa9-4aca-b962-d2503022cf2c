/* ============================================================
   TYCOONS — sample inventory, shaped to a Supabase `projects` table.
   Swap window.TYCOONS_DATA for a fetch from Supabase later; keep the
   same column names and the rest of the app works unchanged.

   Suggested Supabase schema (table: projects)
   ------------------------------------------------------------
   id            bigint (pk)
   developer     text
   compound      text
   unit_type     text     -- chalet | ivilla | apartment | villa | studio | penthouse
   area          text     -- slug: north-coast | new-cairo | ain-sokhna | sheikh-zayed | new-capital
   title_ar      text
   title_en      text
   price         bigint   -- EGP, numeric for range filtering
   bedrooms      int
   size_sqm      int
   delivery      text     -- 'Ready' | year
   down_pct      int
   payment_years int
   sea_view      bool
   status        text     -- available | limited | sold_out
   is_launch     bool
   launch_ar     text     -- null unless is_launch
   launch_en     text
   image_url     text     -- CDN/Supabase storage URL (null -> striped placeholder)
   gallery       text[]
   amenities_ar  text[]
   amenities_en  text[]
   ============================================================ */
(function () {
  const AREAS = {
    'north-coast': { ar: 'الساحل الشمالي', en: 'North Coast', keys: ['ساحل', 'north coast', 'coast', 'sahel'] },
    'new-cairo':   { ar: 'التجمع / القاهرة الجديدة', en: 'New Cairo', keys: ['تجمع', 'قاهرة جديدة', 'new cairo', 'cairo'] },
    'ain-sokhna':  { ar: 'العين السخنة', en: 'Ain Sokhna', keys: ['سخنة', 'sokhna', 'sukhna'] },
    'sheikh-zayed':{ ar: 'الشيخ زايد', en: 'Sheikh Zayed', keys: ['زايد', 'zayed', 'zayd'] },
    'new-capital': { ar: 'العاصمة الإدارية', en: 'New Capital', keys: ['عاصمة', 'اداريه', 'capital', 'administrative'] },
  };

  const TYPES = {
    chalet:    { ar: 'شاليه', en: 'Chalet', keys: ['شاليه', 'chalet'] },
    ivilla:    { ar: 'آي فيلا', en: 'iVilla', keys: ['اي فيلا', 'آي فيلا', 'ivilla', 'i villa'] },
    apartment: { ar: 'شقة', en: 'Apartment', keys: ['شقة', 'شقه', 'apartment', 'apart', 'flat'] },
    villa:     { ar: 'فيلا', en: 'Villa', keys: ['فيلا', 'فيلة', 'villa'] },
    studio:    { ar: 'استوديو', en: 'Studio', keys: ['استوديو', 'studio'] },
    penthouse: { ar: 'بنتهاوس', en: 'Penthouse', keys: ['بنتهاوس', 'penthouse'] },
  };

  const DEVELOPERS = [
    { name: 'La Vista', ar: 'لافيستا', projects: 42 },
    { name: 'Mountain View', ar: 'ماونتن ڤيو', projects: 38 },
    { name: 'Tatweer Misr', ar: 'تطوير مصر', projects: 21 },
    { name: 'Palm Hills', ar: 'بالم هيلز', projects: 55 },
    { name: 'Ora', ar: 'أورا', projects: 12 },
    { name: 'SODIC', ar: 'سوديك', projects: 34 },
    { name: 'Emaar Misr', ar: 'إعمار مصر', projects: 18 },
    { name: 'Hyde Park', ar: 'هايد بارك', projects: 15 },
  ];

  // price is a real number (EGP) so natural-language budget filters work.
  const P = [
    {
      id: 1, developer: 'La Vista', compound: 'La Vista Bay East', unit_type: 'chalet', area: 'north-coast',
      title_ar: 'شاليه بإطلالة بحر — أول مرحلة', title_en: 'Sea-view chalet — first release',
      price: 8400000, bedrooms: 3, size_sqm: 140, delivery: '2027', down_pct: 5, payment_years: 8,
      sea_view: true, status: 'available', is_launch: true, launch_ar: 'بتتطرح دلوقتي', launch_en: 'Launching Now',
      image_url: null, amenities_ar: ['بيتش فرونت', 'حمام سباحة', 'كلوب هاوس', 'أمن ٢٤/٧'], amenities_en: ['Beachfront', 'Pool', 'Clubhouse', '24/7 security'],
    },
    {
      id: 2, developer: 'Mountain View', compound: 'Mountain View iCity', unit_type: 'ivilla', area: 'new-cairo',
      title_ar: 'آي فيلا في التجمع — لقطة جديدة', title_en: 'iVilla in New Cairo — new phase',
      price: 12900000, bedrooms: 4, size_sqm: 210, delivery: 'Ready', down_pct: 10, payment_years: 6,
      sea_view: false, status: 'available', is_launch: true, launch_ar: 'جديد', launch_en: 'New',
      image_url: null, amenities_ar: ['حديقة خاصة', 'لاند سكيب', 'مسارات جري', 'مول تجاري'], amenities_en: ['Private garden', 'Landscape', 'Running tracks', 'Retail mall'],
    },
    {
      id: 3, developer: 'Tatweer Misr', compound: 'IL Monte Galala', unit_type: 'apartment', area: 'ain-sokhna',
      title_ar: 'شقة بإطلالة على الجبل والبحر', title_en: 'Apartment with mountain & sea view',
      price: 6200000, bedrooms: 2, size_sqm: 95, delivery: '2026', down_pct: 5, payment_years: 7,
      sea_view: true, status: 'available', is_launch: true, launch_ar: 'جديد', launch_en: 'New',
      image_url: null, amenities_ar: ['فنيكيولار', 'شاطئ خاص', 'أكوا بارك'], amenities_en: ['Funicular', 'Private beach', 'Aqua park'],
    },
    {
      id: 4, developer: 'Palm Hills', compound: 'Palm Hills New Cairo', unit_type: 'apartment', area: 'new-cairo',
      title_ar: 'شقة بتشطيب كامل بجاردن', title_en: 'Fully-finished apartment with garden',
      price: 8900000, bedrooms: 3, size_sqm: 140, delivery: '2028', down_pct: 5, payment_years: 8,
      sea_view: false, status: 'available', is_launch: false,
      image_url: null, amenities_ar: ['تشطيب كامل', 'جيم', 'كلوب هاوس'], amenities_en: ['Fully finished', 'Gym', 'Clubhouse'],
    },
    {
      id: 5, developer: 'La Vista', compound: 'Direction White', unit_type: 'ivilla', area: 'north-coast',
      title_ar: 'آي فيلا جاردن على البحر', title_en: 'iVilla Garden by the sea',
      price: 15400000, bedrooms: 4, size_sqm: 230, delivery: '2029', down_pct: 10, payment_years: 9,
      sea_view: true, status: 'limited', is_launch: false,
      image_url: null, amenities_ar: ['لاجونات', 'مارينا', 'بيتش كلوب'], amenities_en: ['Lagoons', 'Marina', 'Beach club'],
    },
    {
      id: 6, developer: 'La Vista', compound: 'La Vista Sokhna', unit_type: 'chalet', area: 'ain-sokhna',
      title_ar: 'شاليه استلام فوري بإطلالة بحر', title_en: 'Ready chalet with sea view',
      price: 5600000, bedrooms: 2, size_sqm: 88, delivery: 'Ready', down_pct: 5, payment_years: 5,
      sea_view: true, status: 'available', is_launch: false,
      image_url: null, amenities_ar: ['استلام فوري', 'حمام سباحة', 'شاطئ'], amenities_en: ['Ready to move', 'Pool', 'Beach'],
    },
    {
      id: 7, developer: 'SODIC', compound: 'SODIC West', unit_type: 'villa', area: 'sheikh-zayed',
      title_ar: 'فيلا مستقلة بحديقة كبيرة', title_en: 'Standalone villa with large garden',
      price: 22500000, bedrooms: 5, size_sqm: 340, delivery: '2027', down_pct: 10, payment_years: 8,
      sea_view: false, status: 'available', is_launch: false,
      image_url: null, amenities_ar: ['حديقة ٤٠٠م', 'حمام سباحة خاص', 'جراج'], amenities_en: ['400m garden', 'Private pool', 'Garage'],
    },
    {
      id: 8, developer: 'Hyde Park', compound: 'Hyde Park New Cairo', unit_type: 'studio', area: 'new-cairo',
      title_ar: 'استوديو بعائد إيجاري عالي', title_en: 'Studio with high rental yield',
      price: 3900000, bedrooms: 1, size_sqm: 55, delivery: '2026', down_pct: 5, payment_years: 6,
      sea_view: false, status: 'available', is_launch: false,
      image_url: null, amenities_ar: ['بيزنس هَب', 'مطاعم', 'كوَرك سبيس'], amenities_en: ['Business hub', 'Dining', 'Co-work'],
    },
    {
      id: 9, developer: 'Ora', compound: 'ZED East', unit_type: 'apartment', area: 'new-cairo',
      title_ar: 'شقة بانوراما في كمباوند متكامل', title_en: 'Panorama apartment in a full compound',
      price: 11200000, bedrooms: 3, size_sqm: 165, delivery: '2028', down_pct: 10, payment_years: 8,
      sea_view: false, status: 'limited', is_launch: false,
      image_url: null, amenities_ar: ['سبورتنج كلوب', 'مدارس', 'مول'], amenities_en: ['Sporting club', 'Schools', 'Mall'],
    },
    {
      id: 10, developer: 'Emaar Misr', compound: 'Marassi', unit_type: 'chalet', area: 'north-coast',
      title_ar: 'شاليه في مارينا مارَسي', title_en: 'Chalet at Marassi Marina',
      price: 9800000, bedrooms: 3, size_sqm: 130, delivery: '2027', down_pct: 5, payment_years: 7,
      sea_view: true, status: 'available', is_launch: false,
      image_url: null, amenities_ar: ['مارينا يخوت', 'جولف', 'فنادق'], amenities_en: ['Yacht marina', 'Golf', 'Hotels'],
    },
    {
      id: 11, developer: 'SODIC', compound: 'SODIC East', unit_type: 'penthouse', area: 'new-capital',
      title_ar: 'بنتهاوس بروف جاردن في العاصمة', title_en: 'Penthouse with roof garden, New Capital',
      price: 14700000, bedrooms: 4, size_sqm: 220, delivery: '2029', down_pct: 10, payment_years: 10,
      sea_view: false, status: 'available', is_launch: true, launch_ar: 'بتتطرح دلوقتي', launch_en: 'Launching Now',
      image_url: null, amenities_ar: ['روف جاردن', 'سمارت هوم', 'نهر أخضر'], amenities_en: ['Roof garden', 'Smart home', 'Green river'],
    },
    {
      id: 12, developer: 'Palm Hills', compound: 'Badya', unit_type: 'apartment', area: 'sheikh-zayed',
      title_ar: 'شقة في بادية بأقساط ٩ سنين', title_en: 'Apartment in Badya, 9-year plan',
      price: 7300000, bedrooms: 2, size_sqm: 110, delivery: '2028', down_pct: 5, payment_years: 9,
      sea_view: false, status: 'available', is_launch: false,
      image_url: null, amenities_ar: ['مدينة ذكية', 'مسارات دراجات', 'بحيرات'], amenities_en: ['Smart city', 'Bike lanes', 'Lakes'],
    },
  ];

  window.TYCOONS_DATA = { PROJECTS: P, AREAS, TYPES, DEVELOPERS };
})();
