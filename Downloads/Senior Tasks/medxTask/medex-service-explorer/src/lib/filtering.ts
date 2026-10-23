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

function matchesExcept(
  record: ServiceWithProvider,
  f: Filters,
  except: keyof Filters,
): boolean {
  const s = record.service;
  const p = record.provider;
  const search = f.q.trim().toLowerCase();

  if (except !== "types" && f.types.length && !f.types.includes(s.type)) {
    return false;
  }

  if (
    except !== "category" &&
    f.category &&
    record.category?.id !== f.category
  ) {
    return false;
  }

  if (
    except !== "subcategory" &&
    f.subcategory &&
    record.subcategory?.id !== f.subcategory
  ) {
    return false;
  }

  if (
    except !== "providers" &&
    f.providers.length &&
    !f.providers.includes(String(p.id))
  ) {
    return false;
  }

  if (except !== "location" && f.location) {
    const loc =
      `${p.providerInformation.city?.name ?? ""} ${
        p.providerInformation.country?.name ?? ""
      }`.toLowerCase();

    if (!loc.includes(f.location.toLowerCase())) return false;
  }

  if (
    except !== "currency" &&
    f.currency &&
    p.providerInformation.currency !== f.currency
  ) {
    return false;
  }

  if (except !== "home" && f.home && !s.testAtHome) {
    return false;
  }

  if (except !== "q" && search) {
    const haystack =
      `${s.title} ${p.name} ${record.category?.title ?? ""} ${
        record.subcategory?.title ?? ""
      }`.toLowerCase();

    if (!haystack.includes(search)) return false;
  }

  // Prices are compared numerically. Currency selection is handled by the
  // separate currency filter above; select a currency before comparing
  // prices across providers that may use different currencies.
  if (except !== "min" && f.min.trim() !== "") {
    const min = Number(f.min);

    if (Number.isFinite(min)) {
      if (record.price == null || record.price.amount < min) return false;
    }
  }

  if (except !== "max" && f.max.trim() !== "") {
    const max = Number(f.max);

    if (Number.isFinite(max)) {
      if (record.price == null || record.price.amount > max) return false;
    }
  }

  return true;
}

export function filterRecords(
  records: ServiceWithProvider[],
  f: Filters,
  except?: keyof Filters,
) {
  let result = records.filter((r) =>
    matchesExcept(r, f, except ?? "page"),
  );

  if (f.sort === "price-asc") {
    result = result
      .slice()
      .sort(
        (a, b) =>
          (a.price?.amount ?? Infinity) - (b.price?.amount ?? Infinity),
      );
  }

  if (f.sort === "price-desc") {
    result = result
      .slice()
      .sort(
        (a, b) =>
          (b.price?.amount ?? -Infinity) - (a.price?.amount ?? -Infinity),
      );
  }

  if (f.sort === "rating") {
    result = result
      .slice()
      .sort(
        (a, b) =>
          (b.provider.providerInformation.rating ?? -1) -
          (a.provider.providerInformation.rating ?? -1),
      );
  }

  if (f.sort === "relevance" && f.q.trim()) {
    const q = f.q.toLowerCase();

    result = result.slice().sort((a, b) => {
      const score = (r: ServiceWithProvider) =>
        (r.service.title.toLowerCase().includes(q) ? 3 : 0) +
        (r.provider.name.toLowerCase().includes(q) ? 2 : 0) +
        ((r.category?.title ?? "").toLowerCase().includes(q) ? 1 : 0);

      return score(b) - score(a);
    });
  }

  return result;
}

export function facetCount(
  records: ServiceWithProvider[],
  f: Filters,
  key: keyof Filters,
  value?: string,
): number {
  const next = { ...f };

  if (key === "types") {
    next.types = value ? [value as ServiceType] : [];
  } else if (key === "providers") {
    next.providers = value ? [value] : [];
  } else if (key === "location") {
    next.location = value ?? "";
  } else if (key === "home") {
    next.home = Boolean(value);
  } else if (key === "category") {
    next.category = value ?? "";
    next.subcategory = "";
  } else if (key === "subcategory") {
    next.subcategory = value ?? "";
  }

  return filterRecords(records, next, key).length;
}

export function uniqueLocations(records: ServiceWithProvider[]) {
  return [
    ...new Set(
      records
        .flatMap(({ provider }) => [
          provider.providerInformation.city?.name,
          provider.providerInformation.country?.name,
        ])
        .filter((v): v is string => Boolean(v)),
    ),
  ].sort();
}

export function uniqueCurrencies(records: ServiceWithProvider[]) {
  return [
    ...new Set(
      records.map((r) => r.provider.providerInformation.currency),
    ),
  ].sort();
}