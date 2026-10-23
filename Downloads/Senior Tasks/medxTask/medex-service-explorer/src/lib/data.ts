import type { Category, Dataset, Provider, Service, ServiceType } from "@/types/medex";
import raw from "../../data/task1-service-explorer.json";

const dataset = raw as Dataset;
export const getDataset = (): Dataset => dataset;
export const flattenCategories = (categories: Category[]) => categories.flatMap((c) => [c, ...(c.children ?? [])]);
export function visibleRecords(data: Dataset) {
  const categories = flattenCategories(data.categories);
  const categoryById = new Map(categories.map((c) => [String(c.id), c]));
  const providers = new Map(data.providers.map((p) => [String(p.id), p]));
  return data.services.flatMap((service) => {
    const provider = providers.get(String(service.userId));
    if (!provider || service.status !== true || provider.status !== "active") return [];
    const category = service.categoryId ? categoryById.get(String(service.categoryId)) : undefined;
    const subcategory = service.subCategoryId ? categoryById.get(String(service.subCategoryId)) : undefined;
    if (service.categoryId && (!category || category.status !== true)) return [];
    if (service.subCategoryId && (!subcategory || subcategory.status !== true)) return [];
    return [{ service, provider, category, subcategory }];
  });
}
export const serviceTypes: ServiceType[] = ["package", "lab_test", "wellness", "service", "insurance"];
