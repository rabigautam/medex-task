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
