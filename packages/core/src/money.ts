import { z } from "zod";

/**
 * Money is always stored and passed around as integer paise (1 INR = 100 paise).
 * Never use floats for money. Max is well within Number.MAX_SAFE_INTEGER.
 */
export const moneyPaiseSchema = z
  .number()
  .int("Amount must be a whole number of paise")
  .min(0, "Amount cannot be negative")
  .max(Number.MAX_SAFE_INTEGER);

export type MoneyPaise = z.infer<typeof moneyPaiseSchema>;

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format integer paise as Indian Rupees with Indian digit grouping.
 * @example formatINR(12345678) // "₹1,23,456.78"
 */
export function formatINR(paise: number): string {
  if (!Number.isSafeInteger(paise)) {
    throw new RangeError(`formatINR expects integer paise, got ${paise}`);
  }
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  const rupees = Math.trunc(abs / 100);
  const remainder = abs % 100;
  // Format the rupee part with Intl, then append exact paise digits (no float maths).
  const formatted = inrFormatter.format(rupees).replace(/\.00$/, "");
  return `${sign}${formatted}.${remainder.toString().padStart(2, "0")}`;
}

/** Convert a rupee amount string such as "1234.5" to integer paise without float errors. */
export function rupeesToPaise(rupees: string): MoneyPaise {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(rupees.trim());
  if (!match) {
    throw new RangeError(`Invalid rupee amount: "${rupees}"`);
  }
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  return moneyPaiseSchema.parse(whole * 100 + fraction);
}
