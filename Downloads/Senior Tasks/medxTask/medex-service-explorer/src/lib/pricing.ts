import type { Price, Service, Provider, WellnessOption } from "@/types/medex";

function decimal(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function calculate(priceValue: string, discountValue: string, discountType: "percent" | "amount", chargeValue: string, chargeType: "percent" | "amount", currency: string): Price | null {
  const price = decimal(priceValue), discount = decimal(discountValue), charge = decimal(chargeValue);
  if (price === null || discount === null || charge === null || price < 0 || discount < 0 || charge < 0) return null;
  const discountAmount = discountType === "percent" ? price * discount / 100 : discount;
  const afterDiscount = price - discountAmount;
  const chargeAmount = chargeType === "percent" ? afterDiscount * charge / 100 : charge;
  const amount = afterDiscount + chargeAmount;
  if (!Number.isFinite(amount) || amount < 0) return null;
  return { amount, original: price, currency, discounted: amount < price };
}
export function calculateServicePrice(service: Service, provider: Provider): Price | null {
  if (service.type === "wellness") {
    const options = (service.wellnessPricing ?? [])
      .map((o) => calculateOption(o, provider))
      .filter((p): p is Price => p !== null);
    if (!options.length) return null;
    return options.reduce((lowest, p) => p.amount < lowest.amount ? p : lowest);
  }
  if (service.price === null || service.discount === null || service.discountType === null ||
      service.serviceCharge === null || service.serviceChargeType === null) return null;
  return calculate(service.price, service.discount, service.discountType, service.serviceCharge, service.serviceChargeType, provider.providerInformation.currency);
}
function calculateOption(option: WellnessOption, provider: Provider): Price | null {
  return calculate(option.price, option.discount, option.discountType, option.serviceCharge, option.serviceChargeType, provider.providerInformation.currency);
}
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
