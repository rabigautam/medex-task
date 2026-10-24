import initialData from "../../data/task2-cart.json";
import type {
  Cart, CartGroup, CartItem, CatalogProduct, GroupType, MergeChange,
  Order, PaymentMethod, Product, WellnessOption, GuestCartItem
} from "./types";

const data = initialData as {
  catalog: CatalogProduct[];
  serverCart: Cart;
  guestCart: GuestCartItem[];
};

let cart: Cart = structuredClone(data.serverCart);
const catalog = new Map<string, CatalogProduct>(data.catalog.map((p) => [p.id, p]));
const ordersByKey = new Map<string, Order>();
const ordersById = new Map<string, Order>();
let nextLine = 1;

export function getCatalog() { return data.catalog; }
export function getGuestCart() { return data.guestCart; }
export function getCart(): Cart { return structuredClone(cart); }

function chosenOption(item: CartItem): WellnessOption | undefined {
  return item.product.wellnessPricing?.find((option) => option.id === item.wellnessPricingId);
}

function isPriced(item: CartItem): boolean {
  if (!item.product || !item.product.title) return false;
  if (item.product.type === "wellness") return Boolean(chosenOption(item));
  return typeof item.product.price === "number" && Number.isFinite(item.product.price);
}

function recalculate() {
  const groups = new Map<string, CartItem[]>();
  for (const group of cart.groups) {
    for (const item of group.items) {
      const type = item.product?.type || group.type || "unknown";
      const rows = groups.get(type) ?? [];
      rows.push(item);
      groups.set(type, rows);
    }
  }
  cart.groups = [...groups.entries()].map(([type, items]) => {
    const subtotals: Record<string, number> = {};
    let unpricedItems = 0;
    let itemCount = 0;
    for (const item of items) {
      itemCount += Math.max(0, item.quantity || 0);
      if (!isPriced(item)) {
        unpricedItems += 1;
        continue;
      }
      const currency = item.product.currency;
      if (!currency) {
        unpricedItems += 1;
        continue;
      }
      const unit = item.product.type === "wellness"
        ? (chosenOption(item)?.amount_after_service_charge)
        : item.product.price;
      if (typeof unit !== "number" || !Number.isFinite(unit)) {
        unpricedItems += 1;
        continue;
      }
      subtotals[currency] = (subtotals[currency] ?? 0) + unit * item.quantity;
    }
    return { type, itemCount, unpricedItems, subtotals, items };
  });
  cart.totalItems = cart.groups.reduce((sum, group) => sum + group.itemCount, 0);
}

function findItem(lineId: string): { group: CartGroup; item: CartItem } | null {
  for (const group of cart.groups) {
    const item = group.items.find((row) => row.id === lineId);
    if (item) return { group, item };
  }
  return null;
}

export function updateQuantity(lineId: string, quantity: number): Cart | null {
  const found = findItem(lineId);
  if (!found) return null;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    throw new Error("Quantity must be between 1 and 99.");
  }
  found.item.quantity = quantity;
  recalculate();
  return getCart();
}

export function updateWellness(lineId: string, wellnessPricingId: string): Cart | null {
  const found = findItem(lineId);
  if (!found) return null;
  const options = found.item.product.wellnessPricing ?? [];
  if (!options.some((option) => option.id === wellnessPricingId)) {
    throw new Error("That duration option is no longer available.");
  }
  found.item.wellnessPricingId = wellnessPricingId;
  recalculate();
  return getCart();
}

