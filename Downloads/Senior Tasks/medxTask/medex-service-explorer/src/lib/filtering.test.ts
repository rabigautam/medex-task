import { describe, expect, it } from "vitest";
import { readFilters, writeFilters, defaultFilters } from "./filtering";
import type { ServiceWithProvider } from "@/types/medex";
const make = (id: string, city: string, currency: string, type: "package" | "lab_test", amount: number): ServiceWithProvider => ({
  service: { id, title: `${type} ${id}`, type, userId: id, price: String(amount), discount: "0", discountType: "amount", serviceCharge: "0", serviceChargeType: "amount", status: true },
  provider: { id, name: `Provider ${id}`, status: "active", providerInformation: { currency, city: { name: city } } },
  price: { amount, original: amount, currency, discounted: false }
});
describe("filterRecords and URL state", () => {
  it("round-trips filters through URL parameters", () => {
    const f = { ...defaultFilters, q: "check up", types: ["package" as const], currency: "THB", max: "5000", page: 2 };
    expect(readFilters(new URLSearchParams(writeFilters(f)))).toEqual(f);
  });
});