/* eslint-disable @typescript-eslint/ban-ts-comment */
import initialData from "../../data/task2-cart.json";
import type {
  Cart, CartGroup, CartItem, CatalogProduct, MergeChange,
  Order, Product, WellnessOption, GuestCartItem,
  PaymentMethod
} from "./types";
// @ts-expect-error
const data = initialData as {
  catalog: CatalogProduct[];
  serverCart: Cart;
  guestCart: GuestCartItem[];
};

const cart: Cart = structuredClone(data.serverCart);
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

export function removeItem(lineId: string): boolean {
  let removed = false;
  cart.groups = cart.groups.map((group) => {
    const items = group.items.filter((item) => {
      if (item.id === lineId) { removed = true; return false; }
      return true;
    });
    return { ...group, items };
  }).filter((group) => group.items.length > 0);
  recalculate();
  return removed;
}

export function mergeGuestItems(items: GuestCartItem[]): { cart: Cart; changes: MergeChange[] } {
  const changes: MergeChange[] = [];
  for (const guest of items) {
    const product = catalog.get(guest.productId);
    if (!product) {
      changes.push({ kind: "unavailable", title: "Unknown service", message: "This service is no longer available and was not added." });
      continue;
    }
    let existing: CartItem | undefined;
    for (const group of cart.groups) {
      existing = group.items.find((item) => item.productId === guest.productId);
      if (existing) break;
    }
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + Math.max(1, guest.quantity));
      if (product.type === "wellness" && !existing.wellnessPricingId && guest.wellnessPricingId) {
        existing.wellnessPricingId = guest.wellnessPricingId;
      }
      changes.push({ kind: "merged", title: product.title, quantity: existing.quantity, message: `Combined with the existing cart quantity. New quantity: ${existing.quantity}.` });
    } else {
      const line: CartItem = {
        id: `guest-merged-${nextLine++}`,
        productId: product.id,
        quantity: Math.min(99, Math.max(1, guest.quantity)),
        wellnessPricingId: guest.wellnessPricingId,
        product: structuredClone(product as Product)
      };
      const group = cart.groups.find((g) => g.type === product.type);
      if (group) group.items.push(line);
      else cart.groups.push({ type: product.type, itemCount: 0, unpricedItems: 0, subtotals: {}, items: [line] });
      changes.push({ kind: "added", title: product.title, quantity: line.quantity, message: "Added from your guest cart." });
    }
  }
  recalculate();
  return { cart: getCart(), changes };
}
export function checkoutGroup(
    groupType: string,
    paymentMethod: PaymentMethod,
    idempotencyKey: string
  ): Order {
    // 1. Check if an order with this idempotency key already exists (to handle retries safely)
    if (ordersByKey.has(idempotencyKey)) {
      return ordersByKey.get(idempotencyKey)!;
    }
  
    // 2. Find the specific group in the cart
    const group = cart.groups.find((g) => g.type === groupType);
    if (!group || group.items.length === 0) {
      throw new Error("No items found in this group to checkout.");
    }
  
    if (group.unpricedItems > 0) {
      throw new Error("Cannot checkout a group with unpriced items.");
    }
  
    // 3. Generate order details
    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const order: Order = {
        orderId,
        status: paymentMethod === "pay_at_clinic" ? "paid" : "pending",
        groupType,
        paymentMethod,
        items: structuredClone(group.items),
        subtotals: structuredClone(group.subtotals),
        createdAt: new Date().toISOString(),
        idempotencyKey
    };
  
    // 4. Save to maps
    ordersByKey.set(idempotencyKey, order);
    ordersById.set(orderId, order);
  
    // 5. Remove the checked-out group from the active cart and recalculate
    cart.groups = cart.groups.filter((g) => g.type !== groupType);
    recalculate();
  
    return order;
  }
  export function getOrder(orderId: string): Order | null {
    return ordersById.get(orderId) ?? null;
  }