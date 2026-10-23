import type { Filters, ServiceType, ServiceWithProvider } from "@/types/medex";

export const defaultFilters: Filters = {
  q: "",
  types: [],
  category: "",
  subcategory: "",
  providers: [],
  location: "",
  currency: "",
  min: "",
  max: "",
  home: false,
  sort: "relevance",
  page: 1,
};

export function readFilters(params: URLSearchParams): Filters {
  const types = params
    .getAll("type")
    .filter((v): v is ServiceType =>
      ["package", "lab_test", "wellness", "service", "insurance"].includes(v),
    );

  return {
    q: params.get("q") ?? "",
    types,
    category: params.get("category") ?? "",
    subcategory: params.get("subcategory") ?? "",
    providers: params.getAll("provider"),
    location: params.get("location") ?? "",
    currency: params.get("currency") ?? "",
    min: params.get("min") ?? "",
    max: params.get("max") ?? "",
    home: params.get("home") === "1",
    sort: (
      ["relevance", "price-asc", "price-desc", "rating"].includes(
        params.get("sort") ?? "",
      )
        ? params.get("sort")
        : "relevance"
    ) as Filters["sort"],
    page: Math.max(1, Number(params.get("page") || 1) || 1),
  };
}

export function writeFilters(filters: Filters): string {
  const p = new URLSearchParams();

  if (filters.q) p.set("q", filters.q);
  filters.types.forEach((t) => p.append("type", t));
  if (filters.category) p.set("category", filters.category);
  if (filters.subcategory) p.set("subcategory", filters.subcategory);
  filters.providers.forEach((v) => p.append("provider", v));
  if (filters.location) p.set("location", filters.location);
  if (filters.currency) p.set("currency", filters.currency);
  if (filters.min !== "") p.set("min", filters.min);
  if (filters.max !== "") p.set("max", filters.max);
  if (filters.home) p.set("home", "1");
  if (filters.sort !== "relevance") p.set("sort", filters.sort);
  if (filters.page > 1) p.set("page", String(filters.page));

  return p.toString();
}

