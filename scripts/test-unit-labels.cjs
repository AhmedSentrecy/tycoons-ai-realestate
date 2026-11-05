"use strict";
// Arabic unit labels on project pages (audit 5 Nov 2026, District 5: "Typical شقة", "1.0", "1.082 م²").
const assert = require("node:assert/strict");
const { unitTypeAr, bedroomsAr, arabicHeroLine, hasLatinWords } = require("../netlify/functions/_unit-labels.cjs");
let n = 0;
const eq = (a, b) => { assert.equal(a, b); n += 1; };
eq(unitTypeAr("Typical Apartment"), "شقة");
eq(unitTypeAr("Garden Apartment"), "شقة بجاردن");
eq(unitTypeAr("Typical Loft"), "لوفت");
eq(unitTypeAr("Duplex"), "دوبلكس");
eq(unitTypeAr("شقة"), "شقة");
eq(bedroomsAr("1.0"), "غرفة نوم واحدة");
eq(bedroomsAr("2.0"), "غرفتين نوم");
eq(bedroomsAr("3 Bedrooms + Nanny"), "3 غرف نوم + غرفة مربية");
eq(bedroomsAr("2BR"), "غرفتين نوم");
eq(bedroomsAr("Studio"), "ستوديو");
eq(bedroomsAr("Not specified"), "");
eq(bedroomsAr("0"), "");
eq(bedroomsAr("Villa"), "");
const hero = arabicHeroLine("اعرف أسعار ومساحات DISTRICT 5 وخطط السداد والوحدات المتاحة في South New Cairo, New Cairo.", {
  name: "DISTRICT 5", nameAr: "ديستريكت 5", location: "South New Cairo, New Cairo", areaAr: "القاهرة الجديدة والتجمع",
});
eq(hero, "اعرف أسعار ومساحات ديستريكت 5 وخطط السداد والوحدات المتاحة في القاهرة الجديدة والتجمع.");
eq(hasLatinWords(hero), false);
eq(hasLatinWords("بنأكد آخر Availability"), true);
console.log(`Unit label tests passed (${n} checks).`);
