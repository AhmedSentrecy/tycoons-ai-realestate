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

export function arabicField(value: unknown, fallback = "") {
  const source = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  if (!source) return fallback;
  const exact = exactTranslations[source.toLowerCase()];
  if (exact) return exact;

  return source
    .replace(/delivery\s+in\s+(\d+)\s+years?/gi, "الاستلام خلال $1 سنوات")
    .replace(/(\d+)\s+years?/gi, "$1 سنوات")
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
