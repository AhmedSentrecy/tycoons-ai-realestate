"use strict";

const assert = require("node:assert/strict");
const { stripInternalNotes, arabicDisplay, arabicProse, unitsAr, projectsAr, isCommercialUnit } = require("../netlify/functions/_display-text.cjs");

let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks += 1; };

// Internal data-entry notes never reach a page.
const badya = "Badya Value By Years option: 10Y / 8Y / 6Y columns shown in source PDF; first payments start Mar-2026 in fetched PDFs.";
check(!/source|fetched|pdf|columns/i.test(stripInternalNotes(badya)), "source/PDF notes removed");
check(arabicDisplay("10% + 5% contract payment as shown in source") === "10% + 5% عند التعاقد", "down payment kept, provenance dropped");
check(stripInternalNotes("Detailed payment schedule available in source PDF") === "", "a note-only value becomes empty");
check(stripInternalNotes("5% DP") === "5% DP", "normal values untouched");

// Arabic payment / delivery labels.
check(arabicDisplay("Up to 10 years") === "حتى 10 سنوات", "up to N years");
check(arabicDisplay("Installments over 12 years") === "تقسيط على 12 سنة", "12 years uses singular");
check(arabicDisplay("Delivery: June 2028") === "الاستلام: يونيو 2028", "delivery with month");
// Delivery formats stored in the inventory (Nov 2026): no English left on Arabic pages.
for (const [stored, shown] of [
  ["Delivery in 4.5 years", "الاستلام خلال 4.5 سنوات"],
  ["Delivery within 3 months", "الاستلام خلال 3 شهور"],
  ["Within 2 years", "الاستلام خلال سنتين"],
  ["Delivery in 3-4 years", "الاستلام خلال 3 لـ 4 سنين"],
  ["Delivery in 2027", "الاستلام في 2027"],
  ["Varies by phase", "حسب المرحلة"],
  ["9 Months", "9 شهور"],
  ["3–12 Months", "من 3 لـ 12 شهر"],
  ["1.5 years", "سنة ونص"],
  ["2.5 Years", "سنتين ونص"],
  ["Delivery in 1 year (constructed)", "الاستلام خلال سنة (مبني)"],
  ["10% over 8 years (10% discount)", "10% على 8 سنوات (خصم 10%)"],
  ["up to 10 Years with 15% Down Payment", "حتى 10 سنوات مع مقدم 15%"],
  ["Ready To Move", "استلام فوري"],
]) check(arabicDisplay(stored) === shown, `${stored} → ${shown} (got ${arabicDisplay(stored)})`);
check(arabicDisplay("5% Down Payment") === "مقدم 5%", "down payment");
check(arabicDisplay("8 or 10 Years") === "8 أو 10 سنوات", "or");
check(arabicProse("نؤكد آخر Availability") === "نؤكد آخر التوفر", "Availability in prose");

// Arabic counts.
check(unitsAr(1) === "وحدة واحدة" && unitsAr(2) === "وحدتين" && unitsAr(3) === "3 وحدات" && unitsAr(16) === "16 وحدة", "unit counts");
check(projectsAr(1) === "مشروع واحد" && projectsAr(2) === "مشروعين" && projectsAr(4) === "4 مشاريع" && projectsAr(27) === "27 مشروع", "project counts");

// Commercial units are kept out of home price ranges.
check(isCommercialUnit({ unit_type: "Vast Building" }) && isCommercialUnit({ unit_type: "Admin Office" }) && !isCommercialUnit({ unit_type: "Villa" }), "commercial detection");

console.log(`Display text tests passed (${checks} checks).`);
