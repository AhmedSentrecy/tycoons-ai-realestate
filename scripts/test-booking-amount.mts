import assert from "node:assert/strict";
import { bookingAmount, bookingLabel } from "../src/lib/booking.ts";

// Single down payment: the whole percentage is the booking amount.
assert.equal(bookingAmount(10_000_000, "5%"), 500_000);
assert.equal(bookingAmount(10_000_000, "10% Down Payment"), 1_000_000);
// Split down payment: only the first part is paid at booking (Mountain View Mega Offer 2% + 2% + 2%).
assert.equal(bookingAmount(8_507_289, "2% + 2% + 2%"), 170_146);
assert.equal(bookingAmount(10_000_000, "5% + 5% after 3 months"), 500_000);
assert.equal(bookingAmount(10_000_000, "1.5% Mar-2026 + 1.5% Apr-2026"), 150_000);
// Vague or invalid text shows nothing.
assert.equal(bookingAmount(10_000_000, "المقدمات تبدأ من 3% في بعض المشاريع، حسب المشروع وموعد الاستلام."), null);
assert.equal(bookingAmount(10_000_000, "Varies by selected plan"), null);
assert.equal(bookingAmount(10_000_000, "420500"), null);
assert.equal(bookingAmount(10_000_000, "0%"), null);
assert.equal(bookingAmount(10_000_000, "90%"), null);
assert.equal(bookingAmount(0, "5%"), null);
assert.equal(bookingAmount(10_000_000, ""), null);
// Label
assert.equal(bookingLabel(8_507_289, "2% + 2% + 2%"), "تحجز بـ 170,146 جنيه");
assert.equal(bookingLabel(10_000_000, "Varies by selected plan"), "");
console.log("booking amount: 14 checks passed");
