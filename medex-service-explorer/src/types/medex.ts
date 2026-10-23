export type ServiceType = "package" | "lab_test" | "wellness" | "service" | "insurance";
export type Currency = "THB" | "NPR" | "INR" | string;

export interface Category {
  id: string;
  title: string;
  slug: string;
  type: ServiceType;
  position?: number;
  status: boolean;
  parentId: string | null;
  children?: Category[];
}
export interface Provider {
  id: number | string;
  name: string;
  username?: string;
  status: string;
  providerInformation: {
    companyName?: string;
    slug?: string;
    types?: ServiceType[];
    currency: Currency;
    city?: { id?: string; name: string; slug?: string };
    country?: { id?: number | string; name: string; alphaCode?: string };
    rating?: number | null;
    reviewCount?: number | null;
  };
}

export interface Service {
  id: string;
  title: string;
  slug?: string;
  type: ServiceType;
  userId: number | string;
  categoryId?: string | null;
  subCategoryId?: string | null;
  price: string | null;
  discount: string | null;
  discountType: "percent" | "amount" | null;
  serviceCharge: string | null;
  serviceChargeType: "percent" | "amount" | null;
  status: boolean;
  testAtHome?: boolean;
  homeTestCharge?: string | null;
  wellnessPricing?: WellnessOption[];
  createdAt?: string;
}
export interface Dataset { categories: Category[]; providers: Provider[]; services: Service[]; }
export interface Price { amount: number; original: number; currency: Currency; discounted: boolean; }
export interface Filters {
    [x: string]: string;
  q: string; types: ServiceType[]; category: string; subcategory: string;
  providers: string[]; location: string; currency: Currency; min: string; max: string;
  home: boolean; sort: "relevance" | "price-asc" | "price-desc" | "rating"; page: number;
}
export interface ServiceWithProvider { service: Service; provider: Provider; category?: Category; subcategory?: Category; price: Price | null; }
export interface WellnessOption {
    id: string;
    durationInMinutes: number;
    price: string;
    discount: string;
    discountType: "percent" | "amount";
    serviceCharge: string;
    serviceChargeType: "percent" | "amount";
  }
export type FilterPanelProps = {
    filters: Filters;
    setFilter: (key: keyof Filters, value: unknown) => void;
    records: ServiceWithProvider[];
    categories: Dataset["categories"];
    locations: string[];
    currencies: string[];
    onReset: () => void;
  };
  