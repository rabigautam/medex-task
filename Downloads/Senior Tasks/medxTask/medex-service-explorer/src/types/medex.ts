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
