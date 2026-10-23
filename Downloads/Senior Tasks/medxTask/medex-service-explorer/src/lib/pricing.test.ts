import { describe, expect, it } from "vitest";
import { calculateServicePrice } from "./pricing";
import type { Provider, Service } from "@/types/medex";
const provider: Provider = { id: 1, name: "Example", status: "active", providerInformation: { currency: "THB" } };
const base: Service = { id: "1", title: "Test", type: "package", userId: 1, price: "6200.00", discount: "10.00", discountType: "percent", serviceCharge: "7.00", serviceChargeType: "percent", status: true };
describe("calculateServicePrice", () => {
  it("applies discount before service charge without intermediate rounding", () => {
    expect(calculateServicePrice(base, provider)?.amount).toBeCloseTo(5977.8);
  });
  it("uses the lowest wellness option and its currency", () => {
    const service: Service = { ...base, type: "wellness", price: null, discount: null, discountType: null, serviceCharge: null, serviceChargeType: null, wellnessPricing: [
      { id: "a", durationInMinutes: 60, price: "1800.00", discount: "0.00", discountType: "amount", serviceCharge: "0.00", serviceChargeType: "amount" },
      { id: "b", durationInMinutes: 90, price: "2400.00", discount: "15.00", discountType: "percent", serviceCharge: "0.00", serviceChargeType: "amount" }
    ] };
    expect(calculateServicePrice(service, provider)?.amount).toBe(1800);
  });
  it("returns null for malformed prices", () => {
    expect(calculateServicePrice({ ...base, price: "not-a-number" }, provider)).toBeNull();
  });
});