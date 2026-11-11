import { describe, expect, it } from "vitest";
import { formatINR, moneyPaiseSchema, rupeesToPaise } from "./money";

describe("moneyPaiseSchema", () => {
  it("accepts non-negative integers", () => {
    expect(moneyPaiseSchema.parse(0)).toBe(0);
    expect(moneyPaiseSchema.parse(250000)).toBe(250000);
  });

  it("rejects floats, negatives and non-numbers", () => {
    expect(moneyPaiseSchema.safeParse(10.5).success).toBe(false);
    expect(moneyPaiseSchema.safeParse(-1).success).toBe(false);
    expect(moneyPaiseSchema.safeParse("100").success).toBe(false);
  });
});

describe("formatINR", () => {
  it("formats with Indian digit grouping", () => {
    expect(formatINR(12345678)).toBe("₹1,23,456.78");
    expect(formatINR(10000000000)).toBe("₹10,00,00,000.00");
  });

  it("handles small and zero amounts", () => {
    expect(formatINR(0)).toBe("₹0.00");
    expect(formatINR(5)).toBe("₹0.05");
    expect(formatINR(99)).toBe("₹0.99");
  });

  it("handles negative amounts (refunds/adjustments)", () => {
    expect(formatINR(-150050)).toBe("-₹1,500.50");
  });

  it("throws on non-integer input", () => {
    expect(() => formatINR(10.5)).toThrow(RangeError);
  });
});

describe("rupeesToPaise", () => {
  it("converts without floating point errors", () => {
    expect(rupeesToPaise("0.1")).toBe(10);
    expect(rupeesToPaise("1234.5")).toBe(123450);
    expect(rupeesToPaise("19.99")).toBe(1999);
    expect(rupeesToPaise("2500")).toBe(250000);
  });

  it("rejects invalid input", () => {
    expect(() => rupeesToPaise("abc")).toThrow();
    expect(() => rupeesToPaise("1.234")).toThrow();
    expect(() => rupeesToPaise("-5")).toThrow();
  });
});
