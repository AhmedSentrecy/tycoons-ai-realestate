import type { InventoryUnit } from "@/lib/inventory";

export interface SearchCriteria {
  regionLabel: string;
  regionTerms: string[];
  unitType: string;
  typeAliases: string[];
  budgetMax: number | null;
  bedrooms: number | null;
  areaMin: number | null;
  areaMax: number | null;
  immediateDelivery: boolean;
  deliveryYearsMax: number | null;
  installmentsYearsMin: number | null;
  downPaymentMax: number | null;
  finishing: "finished" | "core-shell" | "";
  freeTokens: string[];
}

export interface RankedInventoryUnit {
  unit: InventoryUnit;
  score: number;
  exact: boolean;
  matchReasons: string[];
  differences: string[];
}

export interface SearchOutput {
  query: string;
  interpreted: string;
  exact: RankedInventoryUnit[];
  alternatives: RankedInventoryUnit[];
  totalExact: number;
  totalAlternatives: number;
  criteria: SearchCriteria;
}

const REGION_GROUPS = [
  {
    label: "الساحل الشمالي",
    aliases: ["الساحل", "الساحل الشمالي", "north coast", "sahel", "راس الحكمه", "رأس الحكمة", "ras el hekma", "sidi abdel rahman", "العلمين"],
  },
  {
    label: "القاهرة الجديدة ومستقبل سيتي",
    aliases: ["التجمع", "القاهره الجديده", "القاهرة الجديدة", "new cairo", "fifth settlement", "mostakbal", "مستقبل سيتي", "المستقبل"],
  },
  {
    label: "الشيخ زايد وأكتوبر",
    aliases: ["زايد", "الشيخ زايد", "sheikh zayed", "october", "اكتوبر", "أكتوبر", "6 october", "6th of october"],
  },
  {
    label: "العين السخنة",
    aliases: ["السخنه", "السخنة", "العين السخنه", "العين السخنة", "ain sokhna", "sokhna", "الجلاله", "الجلالة", "galala"],
  },
  {
    label: "العاصمة الإدارية",
    aliases: ["العاصمه", "العاصمة", "العاصمه الاداريه", "العاصمة الإدارية", "new capital", "administrative capital"],
  },
  {
    label: "الشروق وهليوبوليس",
    aliases: ["الشروق", "shorouk", "heliopolis", "هليوبوليس", "مصر الجديده", "مصر الجديدة"],
  },
];

const TYPE_GROUPS = [
  { label: "iVilla", aliases: ["ivilla", "i villa", "اي فيلا", "آي فيلا", "اى فيلا"] },
  { label: "Standalone Villa", aliases: ["standalone", "stand alone", "ستاندالون", "فيلا مستقله", "فيلا مستقلة"] },
  { label: "Twin House", aliases: ["twin house", "توين هاوس", "توين"] },
  { label: "Townhouse", aliases: ["townhouse", "town house", "تاون هاوس", "تاون"] },
  { label: "Duplex", aliases: ["duplex", "دوبلكس", "دوبليكس"] },
  { label: "Penthouse", aliases: ["penthouse", "بنتهاوس", "بنت هاوس"] },
  { label: "Chalet", aliases: ["chalet", "شاليه", "شاليهات", "cabin", "كابن", "كابينه", "كابينة"] },
  { label: "Apartment", aliases: ["apartment", "شقه", "شقة", "شقق", "flat"] },
  { label: "Villa", aliases: ["villa", "فيلا", "فلل"] },
  { label: "Studio", aliases: ["studio", "ستوديو"] },
  { label: "Office", aliases: ["office", "مكتب", "اداري", "إداري", "administrative"] },
  { label: "Clinic", aliases: ["clinic", "عياده", "عيادة", "medical"] },
  { label: "Retail", aliases: ["retail", "shop", "محل", "تجاري", "commercial"] },
];

const STOP_WORDS = new Set(
  [
    "عايز",
    "عاوزه",
    "عايزة",
    "محتاج",
    "محتاجه",
    "بدور",
    "على",
    "في",
    "من",
    "الي",
    "إلى",
    "او",
    "أو",
    "و",
    "لي",
    "ليا",
    "عقار",
    "وحده",
    "وحدة",
    "property",
    "unit",
    "want",
    "need",
    "looking",
    "for",
    "in",
    "with",
    "under",
    "below",
    "million",
    "مليون",
    "جنيه",
    "egp",
    "غرف",
    "غرفه",
    "غرفة",
    "bedroom",
    "bedrooms",
    "متر",
    "sqm",
    "m2",
    "سنه",
    "سنة",
    "سنين",
    "years",
    "year",
  ].map((word) => normalizeText(word)),
);

function arabicDigitToLatin(character: string): string {
  const index = "٠١٢٣٤٥٦٧٨٩".indexOf(character);
  return index >= 0 ? String(index) : character;
}

export function normalizeText(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[٠-٩]/g, arabicDigitToLatin)
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[ؤ]/g, "و")
    .replace(/[ئ]/g, "ي")
    .replace(/[ًٌٍَُّْـ]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff.%+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text: string, aliases: string[]): boolean {
  return aliases.some((alias) => text.includes(normalizeText(alias)));
}

function parseNumber(value: string): number {
  return Number(value.replace(/,/g, "."));
}

function parseBudget(normalized: string): number | null {
  const million = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:مليون|million|mn|m\b)/);
  if (million) return parseNumber(million[1]) * 1_000_000;

  const raw = normalized.match(/(?:تحت|اقل من|اقل|حتى|max|maximum|under|below)\s*(\d[\d,]{5,})/);
  if (raw) return Number(raw[1].replace(/,/g, ""));

  return null;
}

function parseBedrooms(normalized: string): number | null {
  const numeric = normalized.match(/(\d+)\s*(?:غرفه|غرف|bedroom|bedrooms|br\b)/);
  if (numeric) return Number(numeric[1]);

  const words: Array<[number, string[]]> = [
    [1, ["غرفه واحده", "غرفة واحدة", "one bedroom", "1br"]],
    [2, ["غرفتين", "غرفتان", "two bedrooms", "2br"]],
    [3, ["3 غرف", "ثلاث غرف", "three bedrooms", "3br"]],
    [4, ["4 غرف", "اربع غرف", "أربع غرف", "four bedrooms", "4br"]],
    [5, ["5 غرف", "خمس غرف", "five bedrooms", "5br"]],
  ];
  return words.find(([, aliases]) => includesAny(normalized, aliases))?.[0] ?? null;
}

function parseArea(normalized: string): { min: number | null; max: number | null } {
  const range = normalized.match(/(\d{2,4})\s*(?:-|ل|الى|إلى|to)\s*(\d{2,4})\s*(?:متر|sqm|m2|م²)?/);
  if (range) {
    const first = Number(range[1]);
    const second = Number(range[2]);
    return { min: Math.min(first, second), max: Math.max(first, second) };
  }

  const max = normalized.match(/(?:تحت|اقل من|اقل|حتى|under|below|max)\s*(\d{2,4})\s*(?:متر|sqm|m2|م²)/);
  if (max) return { min: null, max: Number(max[1]) };

  const min = normalized.match(/(?:فوق|اكتر من|اكثر من|over|above|min)\s*(\d{2,4})\s*(?:متر|sqm|m2|م²)/);
  if (min) return { min: Number(min[1]), max: null };

  const exact = normalized.match(/(\d{2,4})\s*(?:متر|sqm|m2|م²)/);
  if (exact) {
    const area = Number(exact[1]);
    return { min: Math.max(0, area - 10), max: area + 10 };
  }

  return { min: null, max: null };
}

function parseYears(normalized: string, keywords: string[]): number | null {
  for (const keyword of keywords) {
    const after = normalized.match(new RegExp(`${keyword}[^0-9]{0,12}(\\d{1,2})\\s*(?:سنه|سنة|سنين|year|years)`));
    if (after) return Number(after[1]);
  }
  return null;
}

function parseDownPayment(normalized: string): number | null {
  const match = normalized.match(/(?:مقدم|down payment|dp)\s*(\d+(?:[.,]\d+)?)\s*%/);
  return match ? parseNumber(match[1]) : null;
}

function meaningfulTokens(normalized: string): string[] {
  return [...new Set(
    normalized
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token) && !/^\d+(?:\.\d+)?%?$/.test(token)),
  )];
}

export function parseSearchQuery(query: string): SearchCriteria {
  const normalized = normalizeText(query);
  const region = REGION_GROUPS.find((group) => includesAny(normalized, group.aliases));
  const unitType = TYPE_GROUPS.find((group) => includesAny(normalized, group.aliases));
  const area = parseArea(normalized);
  const finishing = includesAny(normalized, ["fully finished", "finished", "متشطب", "تشطيب كامل", "كامل التشطيب"])
    ? "finished"
    : includesAny(normalized, ["core shell", "core & shell", "نصف تشطيب", "بدون تشطيب"])
      ? "core-shell"
      : "";

  return {
    regionLabel: region?.label ?? "",
    regionTerms: region?.aliases.map(normalizeText) ?? [],
    unitType: unitType?.label ?? "",
    typeAliases: unitType?.aliases.map(normalizeText) ?? [],
    budgetMax: parseBudget(normalized),
    bedrooms: parseBedrooms(normalized),
    areaMin: area.min,
    areaMax: area.max,
    immediateDelivery: includesAny(normalized, ["استلام فوري", "فوري", "ready to move", "ready now", "immediate delivery"]),
    deliveryYearsMax: parseYears(normalized, ["استلام", "delivery", "تسليم"]),
    installmentsYearsMin: parseYears(normalized, ["تقسيط", "installments", "payment plan", "قسط"]),
    downPaymentMax: parseDownPayment(normalized),
    finishing,
    freeTokens: meaningfulTokens(normalized),
  };
}

function searchableText(unit: InventoryUnit): string {
  return normalizeText(
    [
      unit.project_name,
      unit.developer,
      unit.location,
      unit.unit_type,
      unit.bedrooms_text,
      unit.finishing,
      unit.delivery_text,
      unit.description,
    ].join(" "),
  );
}

function unitBedrooms(unit: InventoryUnit): number | null {
  const match = normalizeText(unit.bedrooms_text).match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function firstNumber(value: string): number | null {
  const match = normalizeText(value).match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function paymentPercent(value: string): number | null {
  const match = normalizeText(value).match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? Number(match[1]) : null;
}

function formatMoney(value: number): string {
  return `${new Intl.NumberFormat("en-EG", { maximumFractionDigits: 0 }).format(value)} EGP`;
}

function dedupeUnits(units: InventoryUnit[]): InventoryUnit[] {
  const grouped = new Map<string, InventoryUnit>();
  for (const unit of units) {
    const key = normalizeText([unit.project_name, unit.unit_type, unit.bedrooms_text].join("|"));
    const current = grouped.get(key);
    if (!current || unit.starting_price < current.starting_price) grouped.set(key, unit);
  }
  return [...grouped.values()];
}

function rankUnit(unit: InventoryUnit, criteria: SearchCriteria, normalizedQuery: string): RankedInventoryUnit {
  const haystack = searchableText(unit);
  const matchReasons: string[] = [];
  const differences: string[] = [];
  let score = 0;

  const normalizedProject = normalizeText(unit.project_name);
  const normalizedDeveloper = normalizeText(unit.developer);
  const normalizedLocation = normalizeText(unit.location);
  const normalizedType = normalizeText(unit.unit_type);

  if (normalizedProject && normalizedQuery.includes(normalizedProject)) {
    score += 120;
    matchReasons.push("اسم المشروع مطابق");
  }
  if (normalizedDeveloper && normalizedQuery.includes(normalizedDeveloper)) {
    score += 85;
    matchReasons.push("المطوّر مطابق");
  }
  if (normalizedLocation && normalizedQuery.includes(normalizedLocation)) {
    score += 70;
    matchReasons.push("الموقع مطابق");
  }

  const tokenMatches = criteria.freeTokens.filter((token) => haystack.includes(token));
  const tokenCoverage = criteria.freeTokens.length ? tokenMatches.length / criteria.freeTokens.length : 1;
  score += tokenMatches.length * 12;

  if (criteria.regionTerms.length) {
    if (criteria.regionTerms.some((term) => normalizedLocation.includes(term) || haystack.includes(term))) {
      score += 42;
      matchReasons.push(`في ${criteria.regionLabel}`);
    } else {
      differences.push(`الموقع مختلف عن ${criteria.regionLabel}`);
    }
  }

  if (criteria.typeAliases.length) {
    if (criteria.typeAliases.some((alias) => normalizedType.includes(alias) || haystack.includes(alias))) {
      score += 45;
      matchReasons.push(`نوع الوحدة ${criteria.unitType}`);
    } else {
      differences.push(`نوع الوحدة ${unit.unit_type || "مختلف"}`);
    }
  }

  if (criteria.budgetMax !== null) {
    if (unit.starting_price <= criteria.budgetMax) {
      score += 38;
      matchReasons.push("داخل الميزانية");
    } else {
      differences.push(`أعلى من الميزانية بـ ${formatMoney(unit.starting_price - criteria.budgetMax)}`);
      score -= Math.min(35, ((unit.starting_price - criteria.budgetMax) / criteria.budgetMax) * 50);
    }
  }

  if (criteria.bedrooms !== null) {
    const bedrooms = unitBedrooms(unit);
    if (bedrooms === criteria.bedrooms) {
      score += 28;
      matchReasons.push(`${criteria.bedrooms} غرف`);
    } else {
      differences.push(bedrooms ? `${bedrooms} غرف بدل ${criteria.bedrooms}` : "عدد الغرف غير محدد");
    }
  }

  if (criteria.areaMin !== null || criteria.areaMax !== null) {
    const area = unit.area_sqm;
    const inRange =
      area !== null &&
      (criteria.areaMin === null || area >= criteria.areaMin) &&
      (criteria.areaMax === null || area <= criteria.areaMax);
    if (inRange) {
      score += 25;
      matchReasons.push("المساحة مناسبة");
    } else {
      differences.push(area ? `المساحة ${area} م²` : "المساحة غير محددة");
    }
  }

  if (criteria.immediateDelivery) {
    if (includesAny(normalizeText(unit.delivery_text), ["فوري", "ready", "immediate", "6 months", "6 شهور"])) {
      score += 30;
      matchReasons.push("استلام قريب أو فوري");
    } else {
      differences.push(`الاستلام: ${unit.delivery_text || "غير محدد"}`);
    }
  }

  if (criteria.deliveryYearsMax !== null) {
    const years = firstNumber(unit.delivery_text);
    if (years !== null && years <= criteria.deliveryYearsMax) {
      score += 20;
      matchReasons.push("موعد الاستلام مناسب");
    } else {
      differences.push(`الاستلام: ${unit.delivery_text || "غير محدد"}`);
    }
  }

  if (criteria.installmentsYearsMin !== null) {
    const years = firstNumber(unit.installments_text);
    if (years !== null && years >= criteria.installmentsYearsMin) {
      score += 18;
      matchReasons.push("مدة التقسيط مناسبة");
    } else {
      differences.push(`التقسيط: ${unit.installments_text || "غير محدد"}`);
    }
  }

  if (criteria.downPaymentMax !== null) {
    const downPayment = paymentPercent(unit.down_payment_text);
    if (downPayment !== null && downPayment <= criteria.downPaymentMax) {
      score += 18;
      matchReasons.push("المقدم مناسب");
    } else {
      differences.push(`المقدم: ${unit.down_payment_text || "غير محدد"}`);
    }
  }

  if (criteria.finishing) {
    const finishing = normalizeText(unit.finishing);
    const matches =
      criteria.finishing === "finished"
        ? includesAny(finishing, ["finished", "متشطب", "تشطيب كامل", "fully"])
        : includesAny(finishing, ["core shell", "core & shell", "بدون تشطيب", "نصف تشطيب"]);
    if (matches) {
      score += 20;
      matchReasons.push(criteria.finishing === "finished" ? "متشطب" : "Core & Shell");
    } else {
      differences.push(`التشطيب: ${unit.finishing || "غير محدد"}`);
    }
  }

  const hasStructuredCriteria = Boolean(
    criteria.regionTerms.length ||
      criteria.typeAliases.length ||
      criteria.budgetMax !== null ||
      criteria.bedrooms !== null ||
      criteria.areaMin !== null ||
      criteria.areaMax !== null ||
      criteria.immediateDelivery ||
      criteria.deliveryYearsMax !== null ||
      criteria.installmentsYearsMin !== null ||
      criteria.downPaymentMax !== null ||
      criteria.finishing,
  );

  if (criteria.freeTokens.length && tokenCoverage < 0.5 && !hasStructuredCriteria) {
    differences.push("الاسم أو الوصف مش مطابق بشكل كافي");
  }

  const exact = differences.length === 0 && (criteria.freeTokens.length === 0 || tokenCoverage >= 0.5);
  return { unit, score, exact, matchReasons: [...new Set(matchReasons)], differences: [...new Set(differences)] };
}

function criteriaSummary(criteria: SearchCriteria): string {
  const parts: string[] = [];
  if (criteria.unitType) parts.push(criteria.unitType);
  if (criteria.regionLabel) parts.push(criteria.regionLabel);
  if (criteria.budgetMax !== null) parts.push(`حد أقصى ${formatMoney(criteria.budgetMax)}`);
  if (criteria.bedrooms !== null) parts.push(`${criteria.bedrooms} غرف`);
  if (criteria.areaMin !== null || criteria.areaMax !== null) {
    parts.push(
      criteria.areaMin !== null && criteria.areaMax !== null
        ? `${criteria.areaMin}–${criteria.areaMax} م²`
        : criteria.areaMin !== null
          ? `من ${criteria.areaMin} م²`
          : `حتى ${criteria.areaMax} م²`,
    );
  }
  if (criteria.immediateDelivery) parts.push("استلام فوري");
  if (criteria.deliveryYearsMax !== null) parts.push(`استلام خلال ${criteria.deliveryYearsMax} سنة`);
  if (criteria.installmentsYearsMin !== null) parts.push(`تقسيط ${criteria.installmentsYearsMin} سنة أو أكتر`);
  if (criteria.downPaymentMax !== null) parts.push(`مقدم حتى ${criteria.downPaymentMax}%`);
  if (criteria.finishing) parts.push(criteria.finishing === "finished" ? "متشطب" : "Core & Shell");
  return parts.length ? `فهمنا طلبك: ${parts.join(" · ")}` : "رتبنا النتائج حسب أقرب تطابق لكلامك";
}

export function searchInventory(units: InventoryUnit[], query: string): SearchOutput {
  const normalizedQuery = normalizeText(query);
  const criteria = parseSearchQuery(query);
  if (!normalizedQuery) {
    return {
      query,
      interpreted: "",
      exact: [],
      alternatives: [],
      totalExact: 0,
      totalAlternatives: 0,
      criteria,
    };
  }

  const ranked = dedupeUnits(units)
    .map((unit) => rankUnit(unit, criteria, normalizedQuery))
    .filter((result) => result.score > 0 || result.exact)
    .sort((a, b) => b.score - a.score || a.unit.starting_price - b.unit.starting_price);

  const exactAll = ranked.filter((result) => result.exact);
  const alternativesAll = ranked
    .filter((result) => !result.exact)
    .sort(
      (a, b) =>
        a.differences.length - b.differences.length ||
        b.score - a.score ||
        a.unit.starting_price - b.unit.starting_price,
    );

  return {
    query,
    interpreted: criteriaSummary(criteria),
    exact: exactAll.slice(0, 16),
    alternatives: alternativesAll.slice(0, 8),
    totalExact: exactAll.length,
    totalAlternatives: alternativesAll.length,
    criteria,
  };
}
