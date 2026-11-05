"use strict";
// Arabic unit labels on project pages (audit 5 Nov 2026): "Typical شقة", "1.0", "Offices",
// "iCity October - Lake House", "فيرست رو" (Arabic words wherever Arabic has one).
const assert = require("node:assert/strict");
const { tidyArabicName, arabicKeywords, unitTypeAr, unitBaseAr, bedroomsAr, arabicHeroLine, defaultHeroLine, hasLatinWords, unitsCountAr } = require("../netlify/functions/_unit-labels.cjs");
let n = 0;
const eq = (a, b) => { assert.equal(a, b); n += 1; };
eq(unitTypeAr("Typical Apartment"), "شقة في دور متكرر");
eq(unitTypeAr("Garden Apartment"), "شقة بحديقة");
eq(unitTypeAr("First Row Garden Chalet"), "شاليه صف أول بحديقة");
eq(unitTypeAr("Ras El Hekma - First Row Loft"), "لوفت صف أول");
eq(unitTypeAr("iCity October - Lake House"), "ليك هاوس");
eq(unitTypeAr("iCity October - Garden Millennial"), "ميلينيال بحديقة");
eq(unitTypeAr("Offices"), "مكتب إداري");
eq(unitTypeAr("Townhouse Middle"), "تاون هاوس وسط");
eq(unitTypeAr("Town House Corner"), "تاون هاوس طرفي");
eq(unitTypeAr("Ground Chalet Sea View"), "شاليه أرضي بإطلالة على البحر");
eq(unitTypeAr("Type N"), "وحدة");
eq(unitTypeAr("شقة"), "شقة");
eq(unitBaseAr("First Row Garden Chalet"), "شاليه");
for (const type of ["Typical Apartment", "First Row Penthouse Chalet", "iCity New Cairo - Palace", "Launch / Project Card", "CLEO 3B Garden"]) {
  assert.ok(!/[A-Za-z]/.test(unitTypeAr(type)), type); n += 1;
  assert.ok(!/فيرست|تيبيكال|جاردن/.test(unitTypeAr(type)), type); n += 1;
}
eq(bedroomsAr("1.0"), "غرفة نوم واحدة");
eq(bedroomsAr("2.0"), "غرفتين نوم");
eq(bedroomsAr("3 Bedrooms + Nanny"), "3 غرف نوم + غرفة مربية");
eq(bedroomsAr("2BR"), "غرفتين نوم");
eq(bedroomsAr("Studio"), "ستوديو");
eq(bedroomsAr("Not specified"), "");
eq(bedroomsAr("0"), "");
eq(unitsCountAr(1), "وحدة واحدة");
eq(unitsCountAr(2), "وحدتين");
eq(unitsCountAr(5), "5 وحدات");
eq(unitsCountAr(12), "12 وحدة");
eq(defaultHeroLine("قرية فوكا باي الساحل الشمالي", "الساحل الشمالي"), "اعرف أسعار ومساحات قرية فوكا باي الساحل الشمالي وخطط السداد والوحدات المتاحة.");
eq(defaultHeroLine("كمبوند ماونتن فيو", "الشيخ زايد"), "اعرف أسعار ومساحات كمبوند ماونتن فيو وخطط السداد والوحدات المتاحة في الشيخ زايد.");
const hero = arabicHeroLine("مشروع DISTRICT 5 في South New Cairo, New Cairo.", {
  name: "DISTRICT 5", nameAr: "ديستريكت 5", location: "South New Cairo, New Cairo", areaAr: "القاهرة الجديدة والتجمع",
});
eq(hero, "مشروع ديستريكت 5 في القاهرة الجديدة والتجمع.");
eq(hasLatinWords(hero), false);
eq(hasLatinWords("بنأكد آخر Availability"), true);
eq(tidyArabicName("ماونتن فيو آي سيتي أكتوبر السادس من أكتوبر"), "ماونتن فيو آي سيتي أكتوبر");
eq(tidyArabicName("نيوم أكتوبر السادس من أكتوبر"), "نيوم أكتوبر");
eq(tidyArabicName("ماونتن فيو آي سيتي التجمع الخامس القاهرة الجديدة"), "ماونتن فيو آي سيتي التجمع الخامس");
eq(tidyArabicName("ماونتن فيو الساحل الشمالي رأس الحكمة"), "ماونتن فيو الساحل الشمالي رأس الحكمة");
eq(tidyArabicName("كمبوند ديستريكت 5 التجمع"), "كمبوند ديستريكت 5 التجمع");
eq(arabicKeywords(["وحدات للبيع في Mountain View iCity October"], { areaAr: "السادس من أكتوبر", name: "Mountain View iCity October" })[0], "وحدات للبيع في Mountain View iCity October");
eq(arabicKeywords(["شقق للبيع في Sheikh Zayed", "Mountain View iCity October prices 2026", "مشروعات Mountain View"], { areaAr: "السادس من أكتوبر", developer: "Mountain View", developerAr: "ماونتن فيو" }).join("|"), "شقق للبيع في السادس من أكتوبر|Mountain View iCity October prices 2026|مشروعات ماونتن فيو");
console.log(`Unit label tests passed (${n} checks).`);
