/**
 * Booking amount in EGP: the first down-payment percentage of the unit price.
 *
 * "5%"            -> 5% of the price (the whole down payment is paid at booking)
 * "2% + 2% + 2%"  -> 2% of the price (only the first part is paid at booking)
 *
 * Returns null when the text is vague ("تبدأ من", "varies", "حسب ..."), has no percentage,
 * or the percentage is not a real booking share (0% or 50% and above), so the card shows nothing
 * rather than a wrong number.
 */
const VAGUE = /حسب|قد تصل|تبدأ من|يبدأ من|starts? from|up to|varies|options?|depending|where applicable/i;

export function bookingAmount(price: unknown, downText: unknown): number | null {
  const value = Number(price);
  const text = String(downText ?? "").trim();
  if (!Number.isFinite(value) || value <= 0 || !text || VAGUE.test(text)) return null;
  const first = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!first) return null;
  const percent = Number(first[1]);
  if (!(percent > 0 && percent < 50)) return null;
  return Math.round((value * percent) / 100);
}

export function bookingLabel(price: unknown, downText: unknown): string {
  const amount = bookingAmount(price, downText);
  return amount ? `تحجز بـ ${new Intl.NumberFormat("en-US").format(amount)} جنيه` : "";
}
