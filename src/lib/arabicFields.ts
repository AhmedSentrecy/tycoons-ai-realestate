const exactTranslations: Record<string, string> = {
  apartment: "شقة",
  studio: "ستوديو",
  duplex: "دوبلكس",
  penthouse: "بنتهاوس",
  chalet: "شاليه",
  "standalone villa": "فيلا مستقلة",
  "twin house": "توين هاوس",
  townhouse: "تاون هاوس",
  "town house": "تاون هاوس",
  office: "مكتب إداري",
  clinic: "عيادة",
  "commercial unit": "وحدة تجارية",
  retail: "محل تجاري",
  "core & shell": "نصف تشطيب",
  "core and shell": "نصف تشطيب",
  "fully finished": "تشطيب كامل",
  finished: "متشطب",
  "immediate delivery": "استلام فوري",
  "ready to move": "جاهز للاستلام",
};

// Same wording as netlify/functions/_display-text.cjs (server pages), so a field reads the same
// before and after the page loads.
const MONTHS_AR: Record<string, string> = { jan: "يناير", feb: "فبراير", mar: "مارس", apr: "أبريل", may: "مايو", jun: "يونيو", jul: "يوليو", aug: "أغسطس", sep: "سبتمبر", oct: "أكتوبر", nov: "نوفمبر", dec: "ديسمبر" };

export function yearsAr(n: string) {
  const value = Number(n);
  if (value === 1) return "سنة";
  if (value === 1.5) return "سنة ونص";
  if (value === 2) return "سنتين";
  if (value === 2.5) return "سنتين ونص";
  if (Number.isInteger(value) && value >= 3 && value <= 10) return `${value} سنوات`;
  return Number.isInteger(value) ? `${value} سنة` : `${n} سنوات`;
}
function monthsAr(n: string) {
  const value = Number(n);
  if (value === 1) return "شهر";
  if (value === 2) return "شهرين";
  if (Number.isInteger(value) && value >= 3 && value <= 10) return `${value} شهور`;
  return `${n} شهر`;
}

export function arabicField(value: unknown, fallback = "") {
  const source = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  if (!source) return fallback;
  const exact = exactTranslations[source.toLowerCase()];
  if (exact) return exact;

  return source
    .replace(/^\s*delivery\s*:\s*/i, "الاستلام: ")
    .replace(/\b(?:delivery\s+)?(?:in|within)\s+(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*years?\b/gi, "الاستلام خلال $1 لـ $2 سنين")
    .replace(/\b(?:delivery\s+)?(?:in|within)\s+(\d+(?:\.\d+)?)\s*years?\b/gi, (_, n: string) => `الاستلام خلال ${yearsAr(n)}`)
    .replace(/\b(?:delivery\s+)?(?:in|within)\s+(\d+)\s*months?\b/gi, (_, n: string) => `الاستلام خلال ${monthsAr(n)}`)
    .replace(/\bdelivery\s+in\s+(20\d\d)\b/gi, "الاستلام في $1")
    .replace(/\b(?:immediate delivery|ready to move)\b/gi, "استلام فوري")
    .replace(/\bvaries\s+by\s+phase\b/gi, "حسب المرحلة")
    .replace(/\(\s*constructed\s*\)/gi, "(مبني)")
    .replace(/\brest\s+over\s+(\d+(?:\.\d+)?)\s*(?:years?|y)\s*(?:equal\s+)?(?:installments?)?/gi, (_, n: string) => `والباقي على ${yearsAr(n)} أقساط متساوية`)
    .replace(/\binstallments?\s+over\s+/gi, "تقسيط على ")
    .replace(/\bfirst\s+installment\b/gi, "أول قسط")
    .replace(/\bsecond\s+installment\b/gi, "تاني قسط")
    .replace(/\bsecond\b/gi, "تاني")
    .replace(/\bon\s+delivery\b/gi, "عند الاستلام")
    .replace(/\bon\s+contract(?:ing)?\b/gi, "عند التعاقد")
    .replace(/\bequal\s+installments?\b/gi, "أقساط متساوية")
    .replace(/\bmaintenance\b/gi, "صيانة")
    .replace(/\bcash\b/gi, "كاش")
    .replace(/(\d+(?:\.\d+)?)\s*%\s*(?:down\s*payment|dp)\b/gi, "مقدم $1%")
    .replace(/\bdown\s*payment\b/gi, "مقدم")
    .replace(/\b(20\d\d)-(\d\d)-\d\d\b/g, (_, y: string, m: string) => `${Object.values(MONTHS_AR)[Number(m) - 1] || m} ${y}`)
    .replace(/\bup\s+to\s+/gi, "حتى ")
    .replace(/(\d+(?:\.\d+)?)\s*years?\b/gi, (_, n: string) => yearsAr(n))
    .replace(/(\d+)\s*[-–]\s*(\d+)\s*months?\b/gi, "من $1 لـ $2 شهر")
    .replace(/(\d+)\s*months?\b/gi, (_, n: string) => monthsAr(n))
    .replace(/\bQ([1-4])\s*(20\d\d)\b/gi, (_, q: string, y: string) => `الربع ${["الأول", "التاني", "التالت", "الرابع"][Number(q) - 1]} ${y}`)
    .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?(?:\s*-\s*|\s+)(20\d\d)\b/gi, (_, m: string, y: string) => `${MONTHS_AR[m.toLowerCase()]} ${y}`)
    .replace(/(\d+)\s+bedrooms?/gi, "$1 غرف نوم")
    .replace(/\bstandalone villa\b/gi, "فيلا مستقلة")
    .replace(/\btwin house\b/gi, "توين هاوس")
    .replace(/\btown\s*house\b/gi, "تاون هاوس")
    .replace(/\bapartment\b/gi, "شقة")
    .replace(/\bpenthouse\b/gi, "بنتهاوس")
    .replace(/\bduplex\b/gi, "دوبلكس")
    .replace(/\bchalet\b/gi, "شاليه")
    .replace(/\bcore\s*(?:&|and)\s*shell\b/gi, "نصف تشطيب")
    .replace(/\bfully finished\b/gi, "تشطيب كامل");
}

/** Down payment in one form everywhere: a bare "5%" becomes "مقدم 5%"; other text goes through arabicField. */
export function downPaymentAr(value: unknown, fallback = ""): string {
  const raw = String(value ?? "").trim();
  if (/^\d+(?:\.\d+)?\s*%$/.test(raw)) return `مقدم ${raw.replace(/\s+/g, "")}`;
  return arabicField(raw, fallback);
}
