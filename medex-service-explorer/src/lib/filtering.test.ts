import { describe, expect, it } from "vitest";
import { filterRecords, readFilters, writeFilters, defaultFilters } from "./filtering";
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
  const records = [make("1", "Bangkok", "THB", "package", 4000), make("2", "Kathmandu", "NPR", "lab_test", 1200)];
  it("filters by location and service type together", () => {
    expect(filterRecords(records, { ...defaultFilters, location: "Bangkok", types: ["package"] })).toHaveLength(1);
  });
  it("does not apply a price threshold across currencies", () => {
    expect(filterRecords(records, { ...defaultFilters, currency: "THB", max: "5000" })).toHaveLength(1);
  });
});