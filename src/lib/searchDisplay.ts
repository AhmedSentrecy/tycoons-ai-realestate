import type { InventoryUnit } from "@/lib/inventory";
import type { RankedInventoryUnit } from "@/lib/propertySearch";

/** «3.3 مليون» أو «850 ألف» بدل EGP 3,300,000 */
export function formatMillions(value: number): string {
  if (!value || !Number.isFinite(value)) return "";
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    const text = m >= 100 ? Math.round(m).toString() : (Math.round(m * 10) / 10).toString();
    return `${text} مليون`;
  }
  if (value >= 1_000) return `${Math.round(value / 1_000)} ألف`;
  return new Intl.NumberFormat("en-EG").format(value);
}

export function formatMillionsRange(min: number, max: number): string {
  if (!min) return "";
  if (!max || max <= min) return formatMillions(min);
  return `${formatMillions(min)} – ${formatMillions(max)}`;
}

const TYPE_MAP: Record<string, string> = {
  apartment: "شقة",
  studio: "ستوديو",
  duplex: "دوبلكس",
  penthouse: "بنتهاوس",
  chalet: "شاليه",
  "standalone villa": "فيلا مستقلة",
  villa: "فيلا",
  "twin house": "توين هاوس",
  twinhouse: "توين هاوس",
  townhouse: "تاون هاوس",
  "town house": "تاون هاوس",
  office: "مكتب",
  clinic: "عيادة",
  retail: "محل",
  "commercial unit": "وحدة تجارية",
  cabin: "كابينة",
  loft: "لوفت",
  ivilla: "آي فيلا",
  "i-villa": "آي فيلا",
};

export function arabicType(value: string): string {
  const key = (value || "").trim().toLowerCase();
  if (!key) return "";
  if (TYPE_MAP[key]) return TYPE_MAP[key];
  for (const [en, ar] of Object.entries(TYPE_MAP)) {
    if (key.includes(en)) return ar;
  }
  return value.trim();
}

export function arabicTypePlural(value: string): string {
  const single = arabicType(value);
  const plural: Record<string, string> = {
    "شقة": "شقق", "ستوديو": "ستوديوهات", "شاليه": "شاليهات", "فيلا": "فيلات",
    "فيلا مستقلة": "فيلات مستقلة", "تاون هاوس": "تاون هاوس", "توين هاوس": "توين هاوس",
    "دوبلكس": "دوبلكسات", "بنتهاوس": "بنتهاوس", "مكتب": "مكاتب", "عيادة": "عيادات", "محل": "محلات",
  };
  return plural[single] ?? single;
}

export function arabicBeds(value: string): string {
  const raw = (value || "").trim();
  if (!raw) return "";
  const n = Number(raw.replace(/[^0-9]/g, ""));
  if (/studio/i.test(raw)) return "ستوديو";
  if (!n) return raw;
  if (n === 1) return "غرفة";
  if (n === 2) return "غرفتين";
  if (n <= 10) return `${n} غرف`;
  return `${n} غرفة`;
}

export function arabicBedsRange(values: string[]): string {
  const nums = [...new Set(values.map((v) => Number((v || "").replace(/[^0-9]/g, ""))).filter(Boolean))].sort((a, b) => a - b);
  if (!nums.length) return "";
  if (nums.length === 1) return arabicBeds(String(nums[0]));
  return `${arabicBeds(String(nums[0]))}–${arabicBeds(String(nums[nums.length - 1]))}`;
}

/** «استلام فوري» / «استلام 2030» / «استلام خلال 3 سنوات» */
export function arabicDelivery(value: string): string {
  const raw = (value || "").trim();
  if (!raw) return "";
  if (/immediate|ready to move|فوري/i.test(raw)) return "استلام فوري";
  const year = raw.match(/(20\d{2})/);
  if (year) return `استلام ${year[1]}`;
  const years = raw.match(/(\d+(?:\.\d+)?)\s*(?:years?|سن)/i);
  if (years) {
    const n = Number(years[1]);
    if (n === 1) return "استلام خلال سنة";
    if (n === 2) return "استلام خلال سنتين";
    return `استلام خلال ${years[1]} سنوات`;
  }
  if (/سنة|سنوات|سنتين|استلام/.test(raw)) return raw;
  return raw;
}

export function arabicDownPayment(value: string): string {
  const raw = (value || "").trim();
  if (!raw) return "";
  const pct = raw.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pct) return `مقدم ${pct[1]}%`;
  return raw;
}

export function arabicInstallments(value: string): string {
  const raw = (value || "").trim();
  if (!raw) return "";
  const years = raw.match(/(\d+(?:\.\d+)?)\s*(?:years?|سن)/i);
  if (years) return `تقسيط ${years[1]} سنة`;
  return raw;
}

export function shortLocation(value: string): string {
  const raw = (value || "").trim();
  if (!raw) return "";
  const first = raw.split(/[,،/|-]/)[0].trim();
  return first.length > 26 ? `${first.slice(0, 24)}…` : first;
}

/** تحويل «الفرق» لنص رقمي مختصر عند الإمكان */
export function shortDifference(difference: string, budgetGapHint?: number): string {
  if (budgetGapHint && budgetGapHint > 0) return `أعلى من ميزانيتك بـ ${formatMillions(budgetGapHint)}`;
  return difference;
}

export interface GroupedResult {
  key: string;
  projectName: string;
  developer: string;
  location: string;
  projectSlug: string;
  image: string;
  exact: boolean;
  unitsCount: number;
  minPrice: number;
  maxPrice: number;
  minArea: number;
  maxArea: number;
  types: string[];
  bedsRange: string;
  best: RankedInventoryUnit;
}

/** تجميع النتائج حسب المشروع مع الاحتفاظ بترتيب أفضل نتيجة */
export function groupByProject(items: RankedInventoryUnit[]): GroupedResult[] {
  const map = new Map<string, GroupedResult>();
  for (const item of items) {
    const unit: InventoryUnit = item.unit;
    const key = `${unit.project_name}|${unit.developer}`.toLowerCase();
    const price = unit.starting_price || 0;
    const area = unit.area_sqm || 0;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        key,
        projectName: unit.project_name,
        developer: unit.developer,
        location: unit.location,
        projectSlug: unit.project_slug,
        image: unit.images[0] || "",
        exact: item.exact,
        unitsCount: 1,
        minPrice: price,
        maxPrice: price,
        minArea: area,
        maxArea: area,
        types: unit.unit_type ? [unit.unit_type] : [],
        bedsRange: arabicBedsRange([unit.bedrooms_text]),
        best: item,
      });
      continue;
    }
    existing.unitsCount += 1;
    existing.exact = existing.exact || item.exact;
    if (price) {
      existing.minPrice = existing.minPrice ? Math.min(existing.minPrice, price) : price;
      existing.maxPrice = Math.max(existing.maxPrice, price);
    }
    if (area) {
      existing.minArea = existing.minArea ? Math.min(existing.minArea, area) : area;
      existing.maxArea = Math.max(existing.maxArea, area);
    }
    if (unit.unit_type && !existing.types.includes(unit.unit_type)) existing.types.push(unit.unit_type);
    if (!existing.image && unit.images[0]) existing.image = unit.images[0];
    if (!existing.projectSlug && unit.project_slug) existing.projectSlug = unit.project_slug;
    existing.bedsRange = arabicBedsRange([
      ...(existing.bedsRange ? [] : []),
      existing.best.unit.bedrooms_text,
      unit.bedrooms_text,
    ]) || existing.bedsRange;
  }
  return [...map.values()];
}

export function typesSummary(group: GroupedResult): string {
  const arType = group.unitsCount > 1 ? arabicTypePlural(group.types[0] || "") : arabicType(group.types[0] || "");
  const area = group.minArea
    ? group.maxArea > group.minArea
      ? `${group.minArea}–${group.maxArea} م²`
      : `${group.minArea} م²`
    : "";
  return [arType, area].filter(Boolean).join(" ");
}

export function unitsCountLabel(count: number): string {
  if (count === 1) return "وحدة واحدة";
  if (count === 2) return "وحدتان";
  if (count <= 10) return `${count} وحدات متاحة`;
  return `${count} وحدة متاحة`;
}
