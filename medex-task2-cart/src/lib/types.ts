export type Currency = "THB" | "NPR" | "INR" | string;
export type GroupType = "package" | "lab_test" | "wellness" | "service" | "insurance" | "unknown";
export type PaymentMethod = "card" | "pay_at_clinic";
export type OrderStatus = "pending" | "paid" | "failed";

export interface WellnessOption {
  id: string;
  durationInMinutes: number;
  amount_after_service_charge: number;
}

export interface Product {
  id?: string;
  title?: string;
  type?: string;
  price?: number | null;
  priceUnknown?: boolean;
  currency?: Currency;
  providerId?: number;
  providerName?: string;
  wellnessPricing?: WellnessOption[];
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  wellnessPricingId?: string;
  product: Product;
}

export interface CartGroup {
  type: string;
  itemCount: number;
  unpricedItems: number;
  subtotals: Record<string, number>;
  items: CartItem[];
}

export interface Cart {
  groups: CartGroup[];
  totalItems: number;
}

export interface CatalogProduct extends Product {
  id: string;
  title: string;
  type: string;
  currency: Currency;
  providerId: number;
  providerName: string;
  price: number | null;
}

export interface GuestCartItem {
  productId: string;
  quantity: number;
  wellnessPricingId?: string;
}

export interface MergeChange {
  kind: "added" | "merged" | "unavailable";
  title: string;
  quantity?: number;
  message: string;
}

export interface Order {
  orderId: string;
  status: OrderStatus;
  groupType: string;
  paymentMethod: PaymentMethod;
  idempotencyKey: string;
  createdAt: string;
  items: CartItem[];
  subtotals: Record<string, number>;

}
