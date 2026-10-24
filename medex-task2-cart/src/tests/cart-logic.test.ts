import { describe, expect, it } from "vitest";

function calculateSubtotals(items: Array<{ currency?: string; price?: number | null; quantity: number; type?: string; optionPrice?: number }>) {
  const totals: Record<string, number> = {};
  for (const item of items) {
    const price = item.type === "wellness" ? item.optionPrice : item.price;
    if (!item.currency || typeof price !== "number" || !Number.isFinite(price)) continue;
    totals[item.currency] = (totals[item.currency] ?? 0) + price * item.quantity;
  }
  return totals;
}

function isCheckoutAllowed(items: Array<{ available: boolean; type: string; selectedDuration?: boolean; price?: number | null }>) {
  return items.length > 0 && items.every(item =>
    item.available && (item.type !== "wellness" || item.selectedDuration) &&
    (item.type === "wellness" || typeof item.price === "number")
  );
}

describe("cart money and checkout rules", () => {
  it("never combines different currencies", () => {
    expect(calculateSubtotals([
      { currency: "THB", price: 100, quantity: 2 },
      { currency: "NPR", price: 500, quantity: 1 }
    ])).toEqual({ THB: 200, NPR: 500 });
  });

  it("does not count an unselected wellness price as zero", () => {
    expect(calculateSubtotals([
      { currency: "THB", type: "wellness", price: null, quantity: 1 }
    ])).toEqual({});
  });

  it("uses selected wellness option amount as final unit price", () => {
    expect(calculateSubtotals([
      { currency: "THB", type: "wellness", price: null, optionPrice: 1800, quantity: 2 }
    ])).toEqual({ THB: 3600 });
  });

  it("blocks checkout until wellness duration is selected", () => {
    expect(isCheckoutAllowed([{ available: true, type: "wellness", selectedDuration: false, price: null }])).toBe(false);
    expect(isCheckoutAllowed([{ available: true, type: "wellness", selectedDuration: true, price: null }])).toBe(true);
  });

  it("blocks unavailable products", () => {
    expect(isCheckoutAllowed([{ available: false, type: "unknown" }])).toBe(false);
  });
});
