
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Dataset,
  FilterPanelProps,
  Filters,
  ServiceType,
  ServiceWithProvider,
} from "@/types/medex";

import {
  defaultFilters,
  filterRecords,
  facetCount,
  readFilters,
  uniqueCurrencies,
  uniqueLocations,
  writeFilters,
} from "@/lib/filtering";

import { visibleRecords } from "@/lib/data";
import { calculateServicePrice, formatMoney } from "@/lib/pricing";

// ============================================================================
// CONFIGURATION
// ============================================================================
const PAGE_SIZE = 12;


function normalizeFilters(searchParams?: URLSearchParams): Filters {
  return {
    ...defaultFilters,
    ...(searchParams ? readFilters(searchParams) : {}),
  } as Filters;
}

const typeLabels: Record<ServiceType, string> = {
  package: "Health packages",
  lab_test: "Lab tests",
  wellness: "Wellness",
  service: "Services",
  insurance: "Insurance",
};



function FiltersPanel({
  filters,
  setFilter,
  records,
  categories,
  locations,
  currencies,
  onReset,
}: FilterPanelProps) {

  const [providerSearch, setProviderSearch] = useState("");

  const providers = useMemo(() => {
    const unique = new Map<string, ServiceWithProvider["provider"]>();

    records.forEach((record) => {
      unique.set(String(record.provider.id), record.provider);
    });

    return [...unique.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [records]);

  const matchingProviders = providers.filter((provider) =>
    provider.name.toLowerCase().includes(providerSearch.toLowerCase()),
  );


  const getFacetCount = (key: keyof Filters, value?: string) =>
    facetCount(records, filters, key, value);

  const selectedProviderIds = Array.isArray(filters.providers)
    ? filters.providers.map(String)
    : [];

   const selectedTypes = Array.isArray(filters.types)
    ? filters.types.map(String)
    : [];


  const selectedCategory = categories.find(
    (category) => String(category.id) === String(filters.category ?? ""),
  ) as unknown as
    | {
        subcategories?: Array<string | { id?: string | number; name?: string; title?: string }>;
        children?: Array<string | { id?: string | number; name?: string; title?: string }>;
      }
    | undefined;

  const subcategories = (selectedCategory?.subcategories ?? selectedCategory?.children ?? [])
    .map((item) => {
      if (typeof item === "string") return { value: item, label: item };
      const value = String(item.id ?? item.name ?? item.title ?? "");
      const label = item.title ?? item.name ?? value;
      return { value, label };
    })
    .filter((item) => item.value.length > 0);

 
  return (
    <div className="panel filter-panel">
      <div className="filter-heading">
        <h2>Filters</h2>
        <button className="text-button" type="button" onClick={onReset}>
          Clear all
        </button>
      </div>

      <div className="filter-section">
        <label className="filter-label" htmlFor="filter-location">
          Country / location
        </label>
        <select
          id="filter-location"
          className="field"
          value={filters.location ?? ""}
          onChange={(event) => setFilter("location", event.target.value)}
        >
          <option value="">All locations</option>
          {locations.map((location) => {
            const count = getFacetCount("location", location);
            return (
              <option
                key={location}
                value={location}
                disabled={count === 0 && filters.location !== location}
              >
                {location} ({count})
              </option>
            );
          })}
        </select>
      </div>

      <div className="filter-section">
        <label className="filter-label" htmlFor="filter-category">
          Category
        </label>
        <select
          id="filter-category"
          className="field"
          value={filters.category ?? ""}
          onChange={(event) => setFilter("category", event.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((category) => {
            const id = String(category.id);
            const count = getFacetCount("category", id);
            return (
              <option
                key={id}
                value={id}
                disabled={count === 0 && String(filters.category ?? "") !== id}
              >
                {category.title} ({count})
              </option>
            );
          })}
        </select>
      </div>

      <div className="filter-section">
        <label className="filter-label" htmlFor="filter-subcategory">
          Subcategory
        </label>
        <select
          id="filter-subcategory"
          className="field"
          value={filters.subcategory ?? ""}
          disabled={!filters.category || subcategories.length === 0}
          onChange={(event) => setFilter("subcategory", event.target.value)}
        >
          <option value="">All subcategories</option>
          {subcategories.map((subcategory) => (
            <option key={subcategory.value} value={subcategory.value}>
              {subcategory.label}
            </option>
          ))}
        </select>
        {!filters.category && (
          <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>
            Choose a category first.
          </p>
        )}
      </div>

      <div className="filter-section">
        <span className="filter-label">Service type</span>
        {(
          Object.entries(typeLabels) as [ServiceType, string][]
        ).map(([type, label]) => (
          <label className="check-row" key={type}>
            <input
              type="checkbox"
              checked={selectedTypes.includes(type)}
              onChange={(event) => {
                const next = event.target.checked
                  ? [...selectedTypes, type]
                  : selectedTypes.filter((item) => item !== type);

                setFilter("types", next);
              }}
            />
            <span>{label} ({getFacetCount("types", type)})</span>
          </label>
        ))}
      </div>

      <div className="filter-section">
        <label className="filter-label" htmlFor="filter-currency">
          Currency
        </label>
        <select
          id="filter-currency"
          className="field"
          value={filters.currency ?? ""}
          onChange={(event) => setFilter("currency", event.target.value)}
        >
          <option value="">All currencies</option>
          {currencies.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-section">
        <label className="filter-label" htmlFor="filter-provider-search">
          Providers
        </label>
        <input
          id="filter-provider-search"
          className="field"
          placeholder="Search providers"
          value={providerSearch}
          onChange={(event) => setProviderSearch(event.target.value)}
        />

        <div className="provider-filter-list">
          {matchingProviders.map((provider) => {
            const id = String(provider.id);

            return (
              <label className="check-row" key={id}>
                <input
                  type="checkbox"
                  checked={selectedProviderIds.includes(id)}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...selectedProviderIds, id]
                      : selectedProviderIds.filter((item) => item !== id);

                    setFilter("providers", next);
                  }}
                />
                <span>
                  {provider.name} ({getFacetCount("providers", id)})
                </span>
              </label>
            );
          })}

          {matchingProviders.length === 0 && (
            <p className="muted" style={{ fontSize: 12 }}>
              No providers found.
            </p>
          )}
        </div>
      </div>

      <div className="filter-section">
        <label className="filter-label" htmlFor="filter-min-price">
          Minimum price
        </label>
        <input
          id="filter-min-price"
          className="field"
          type="number"
          min="0"
          placeholder="No minimum"
          value={filters.min ?? ""}
          onChange={(event) => setFilter("min", event.target.value)}
        />
      </div>

      <div className="filter-section">
        <label className="filter-label" htmlFor="filter-max-price">
          Maximum price
        </label>
        <input
          id="filter-max-price"
          className="field"
          type="number"
          min="0"
          placeholder="No maximum"
          value={filters.max ?? ""}
          onChange={(event) => setFilter("max", event.target.value)}
        />
      </div>

      <button
        className="secondary"
        type="button"
        style={{ width: "100%", marginTop: 8 }}
        onClick={onReset}
      >
        Reset filters
      </button>
    </div>
  );
}


export default function ServiceExplorer() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pending, setPending] = useState<Filters>(defaultFilters);
  const [expanded, setExpanded] = useState<string[]>([]);

  // ==========================================================================
  // DATA LOADING
  // Fetch the categories, providers, and services needed by the explorer.
  // ==========================================================================
  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const responses = await Promise.all(
        [
          "/api/categories",
          "/api/providers",
          "/api/services",
        ].map(async (url) => {
          const response = await fetch(url);

          if (!response.ok) {
            throw new Error(
              `Could not load data (${response.status}). Please retry.`,
            );
          }

          return response.json();
        }),
      );

      setDataset({
        categories: responses[0],
        providers: responses[1],
        services: responses[2],
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Data-loading lifecycle ---
  useEffect(() => {
    void load();
  }, [load]);

  // ==========================================================================
  // URL SYNCHRONIZATION
  // Restore filter state on initial render and browser back/forward navigation.
  // ==========================================================================
  useEffect(() => {
    const sync = () => {
      const next = normalizeFilters(
        new URLSearchParams(window.location.search),
      );
      setFilters(next);
      setPending(next);
    };

    sync();
    window.addEventListener("popstate", sync);

    return () => window.removeEventListener("popstate", sync);
  }, []);


  // Writes current filters into the query string without adding duplicate entries.
  const updateUrl = useCallback((next: Filters) => {
    const query = writeFilters(next);
    const nextUrl = `${window.location.pathname}${
      query ? `?${query}` : ""
    }`;
  
    const currentUrl = `${window.location.pathname}${window.location.search}`;
  
    // Avoid creating duplicate history entries.
    if (nextUrl !== currentUrl) {
      window.history.pushState({}, "", nextUrl);
    }
  }, []);
  
  // Shared immediate filter handler for desktop controls and search/sort controls.
  // Any filter change resets pagination; changing category clears subcategory.
  const setFilter = useCallback(
    (key: keyof Filters, value: unknown) => {
      // Calculate the next state outside the state updater.
      const next = {
        ...filters,
        [key]: value,
        page: key === "page" ? Number(value) : 1,
        ...(key === "category" ? { subcategory: "" } : {}),
      } as Filters;
  
      // State update and URL side effect are separate operations.
      setFilters(next);
      updateUrl(next);
    },
    [filters, updateUrl],
  );
  



  // ==========================================================================
  // PRICING + NORMALIZED DATA
  // Calculate each service's display/filter price once per dataset change.
  // useMemo avoids recalculating prices on unrelated UI state changes.
  // ==========================================================================
  const rawRecords = useMemo(
    () =>
      dataset
        ? visibleRecords(dataset).map((record) => ({
            ...record,
            price: calculateServicePrice(
              record.service,
              record.provider,
            ),
          }))
        : [],
    [dataset],
  );

  // ==========================================================================
  // FILTERING + FACET OPTIONS
  // Apply active filters to records and derive available location/currency options.
  // ==========================================================================
  const records = useMemo(
    () => filterRecords(rawRecords, filters),
    [rawRecords, filters],
  );

  const locations = useMemo(
    () => uniqueLocations(rawRecords),
    [rawRecords],
  );

  const currencies = useMemo(
    () => uniqueCurrencies(rawRecords),
    [rawRecords],
  );

  const categories = dataset?.categories ?? [];

  // ==========================================================================
  // SORTING + PROVIDER GROUPING
  // Group filtered services by provider, then order provider groups by the
  // selected sort mode (rating, lowest price, highest price, or relevance).
  // ==========================================================================
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      {
        provider: ServiceWithProvider["provider"];
        items: ServiceWithProvider[];
      }
    >();

    records.forEach((record) => {
      const id = String(record.provider.id);

      if (!map.has(id)) {
        map.set(id, {
          provider: record.provider,
          items: [],
        });
      }

      map.get(id)!.items.push(record);
    });

    return [...map.entries()].sort((a, b) => {
      if (filters.sort === "rating") {
        return (
          (b[1].provider.providerInformation.rating ?? -1) -
          (a[1].provider.providerInformation.rating ?? -1)
        );
      }

      if (filters.sort === "price-asc") {
        const priceA = Math.min(
          ...a[1].items.map((item) => item.price?.amount ?? Infinity),
        );
        const priceB = Math.min(
          ...b[1].items.map((item) => item.price?.amount ?? Infinity),
        );

        return priceA - priceB;
      }

      if (filters.sort === "price-desc") {
        const priceA = Math.max(
          ...a[1].items.map((item) => item.price?.amount ?? -Infinity),
        );
        const priceB = Math.max(
          ...b[1].items.map((item) => item.price?.amount ?? -Infinity),
        );

        return priceB - priceA;
      }

      return b[1].items.length - a[1].items.length;
    });
  }, [records, filters.sort]);

  // ==========================================================================
  // PAGINATION
  // Pagination applies to provider groups, not individual service rows.
  // ==========================================================================
  const paged = grouped.slice(
    (filters.page - 1) * PAGE_SIZE,
    filters.page * PAGE_SIZE,
  );

  // ==========================================================================
  // MOBILE DRAWER FILTER STATE
  // Changes stay pending until the user presses “Show results”.
  // ==========================================================================
  const setPendingFilter = (key: keyof Filters, value: unknown) => {
    setPending((old) => ({
      ...old,
      [key]: value,
      page: 1,
      ...(key === "category" ? { subcategory: "" } : {}),
    }));
  };

  // Preview the result count for the pending mobile filters.
  const pendingCount = useMemo(
    () => (dataset ? filterRecords(rawRecords, pending).length : 0),
    [dataset, rawRecords, pending],
  );

  // Keep the current page valid if filtering/sorting reduces the result count.
  useEffect(() => {
    const lastPage = Math.max(
      1,
      Math.ceil(grouped.length / PAGE_SIZE),
    );

    if (filters.page > lastPage) {
      setFilter("page", 1);
    }
  }, [filters.page, grouped.length, setFilter]);

  // Reset both applied and pending filters and keep the URL in sync.
  const resetFilters = () => {
    const next = { ...defaultFilters } as Filters;
    setFilters(next);
    setPending(next);
    updateUrl(next);
  };

  // ==========================================================================
  // PAGE RENDERING
  // Header/hero, results toolbar, service cards, mobile drawer, and footer.
  // ==========================================================================
  return (
    <main>
      <header className="topbar">
        <div
          className="shell"
          style={{
            padding: "18px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div className="brand">
              MedEx<span style={{ color: "#17211f" }}>.</span>
            </div>
            <div
              className="muted"
              style={{ fontSize: 12, marginTop: 3 }}
            >
              Healthcare service explorer
            </div>
          </div>
          <span className="chip">Compare with confidence</span>
        </div>
      </header>

      <section
        style={{
          background: "linear-gradient(120deg,#e4f6ee,#f7fbf9)",
          borderBottom: "1px solid #dcebe4",
        }}
      >
        <div className="shell" style={{ padding: "34px 0 28px" }}>
          <p className="chip">HEALTHCARE, MADE CLEARER</p>
          <h1
            style={{
              fontSize: "clamp(28px,4vw,42px)",
              letterSpacing: "-1.4px",
              margin: "12px 0 8px",
              maxWidth: 720,
            }}
          >
            Find the right care. Compare your options.
          </h1>
          <p
            className="muted"
            style={{ maxWidth: 650, lineHeight: 1.6, margin: 0 }}
          >
            Explore health packages, lab tests, and wellness services
            from providers across Thailand, Nepal, and India.
          </p>

          <div
            style={{
              display: "flex",
              gap: 10,
              maxWidth: 760,
              marginTop: 22,
            }}
          >
            <input
              className="field"
              aria-label="Search services, providers, or categories"
              placeholder="Try “full body check-up” or a hospital name"
              value={filters.q ?? ""}
              onChange={(event) => setFilter("q", event.target.value)}
            />
            <button
              className="primary"
              onClick={() => setFilter("page", 1)}
            >
              Search
            </button>
          </div>
        </div>
      </section>

      <div className="shell" style={{ padding: "26px 0 60px" }}>
        <div className="layout">
          <aside className="desktop-filters">
            <FiltersPanel
              filters={filters}
              setFilter={setFilter}
              records={rawRecords}
              categories={categories}
              locations={locations}
              currencies={currencies}
              onReset={resetFilters}
            />
          </aside>

      <section aria-busy={loading} aria-label="Search results">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 16,
              }}
            >
              <div>
                <h2 style={{ fontSize: 21, margin: 0 }}>
                  {loading
                    ? "Finding services…"
                    : `${records.length.toLocaleString()} matching services`}
                </h2>
                <p
                  className="muted"
                  style={{ fontSize: 13, margin: "5px 0 0" }}
                >
                  Grouped by provider · Up to 3 services shown per provider
                </p>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="secondary mobile-filter-button"
                  onClick={() => {
                    setPending(filters);
                    setDrawerOpen(true);
                  }}
                >
                  Filters
                </button>

                <label className="muted" style={{ fontSize: 12 }}>
                  Sort by
                  <select
                    aria-label="Sort results"
                    className="field"
                    style={{
                      width: "auto",
                      display: "inline-block",
                      marginLeft: 6,
                    }}
                    value={filters.sort ?? "relevance"}
                    onChange={(event) =>
                      setFilter("sort", event.target.value)
                    }
                  >
                    <option value="relevance">Relevance</option>
                    <option value="price-asc">Price: low to high</option>
                    <option value="price-desc">Price: high to low</option>
                    <option value="rating">Rating</option>
                  </select>
                </label>
              </div>
            </div>

            <div
              aria-live="polite"
              aria-atomic="true"
              className="muted"
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                overflow: "hidden",
                clipPath: "inset(50%)",
              }}
            >
              {records.length} matching services
            </div>

            {loading && (
              <div style={{ display: "grid", gap: 14 }}>
                <div className="skeleton" />
                <div className="skeleton" />
                <div className="skeleton" />
              </div>
            )}

            {!loading && error && (
              <div
                className="panel"
                role="alert"
                style={{ padding: 28 }}
              >
                <h3>We couldn’t load services</h3>
                <p className="muted">{error}</p>
                <button
                  className="primary"
                  onClick={() => void load()}
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && records.length === 0 && (
              <div className="panel" style={{ padding: 30 }}>
                <h3>No matching services</h3>
                <p className="muted">
                  Try broadening your search or removing a filter.
                </p>
                <button className="primary" onClick={resetFilters}>
                  Clear all filters
                </button>
              </div>
            )}

            {!loading &&
              !error &&
              records.length > 0 &&
              paged.map(([id, group]) => (
                <article
                  className="panel provider-card"
                  key={id}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "start",
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: 17, margin: 0 }}>
                        {group.provider.name}
                      </h3>

                      <p
                        className="muted"
                        style={{ fontSize: 12, margin: "6px 0" }}
                      >
                        {[
                          group.provider.providerInformation.city?.name,
                          group.provider.providerInformation.country?.name,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                        {" · "}
                        {group.provider.providerInformation.currency}
                      </p>

                      <p style={{ fontSize: 12, margin: 0 }}>
                        {group.provider.providerInformation.rating != null ? (
                          <>
                            <span
                              aria-label={`Rating ${group.provider.providerInformation.rating} out of 5`}
                            >
                              ★{" "}
                              {group.provider.providerInformation.rating.toFixed(
                                1,
                              )}
                            </span>
                            {" "}
                            <span className="muted">
                              (
                              {group.provider.providerInformation.reviewCount ??
                                0}{" "}
                              reviews)
                            </span>
                          </>
                        ) : (
                          <span className="muted">Not rated yet</span>
                        )}
                      </p>
                    </div>

                    <span className="chip">
                      {group.items.length} matching{" "}
                      {group.items.length === 1 ? "service" : "services"}
                    </span>
                  </div>

                  {(expanded.includes(id)
                    ? group.items
                    : group.items.slice(0, 3)
                  ).map((record) => (
                    <div
                      className="service-row"
                      key={record.service.id}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, lineHeight: 1.4 }}>
                          {record.service.title}
                        </div>

                        <div
                          className="muted"
                          style={{ fontSize: 12, marginTop: 6 }}
                        >
                          {typeLabels[record.service.type]}
                          {record.category
                            ? ` · ${record.category.title}`
                            : ""}
                          {record.service.testAtHome
                            ? " · Home testing available"
                            : ""}
                        </div>

                        {record.service.type === "wellness" && (
                          <div
                            className="muted"
                            style={{ fontSize: 12, marginTop: 4 }}
                          >
                            Starting price · lowest available duration
                          </div>
                        )}
                      </div>

                      <div style={{ textAlign: "right" }}>
                        {record.price ? (
                          <>
                            <div className="price">
                              {formatMoney(
                                record.price.amount,
                                record.price.currency,
                              )}
                            </div>
                            {record.price.discounted && (
                              <div
                                className="muted"
                                style={{
                                  fontSize: 12,
                                  textDecoration: "line-through",
                                }}
                              >
                                {formatMoney(
                                  record.price.original,
                                  record.price.currency,
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="muted">Price unavailable</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {group.items.length > 3 && (
                    <button
                      className="secondary"
                      onClick={() =>
                        setExpanded((old) =>
                          old.includes(id)
                            ? old.filter((item) => item !== id)
                            : [...old, id],
                        )
                      }
                    >
                      {expanded.includes(id)
                        ? "Show fewer"
                        : `View all ${group.items.length} services`}
                    </button>
                  )}
                </article>
              ))}

            {!loading && !error && grouped.length > PAGE_SIZE && (
              <nav
                aria-label="Results pages"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 20,
                }}
              >
                <button
                  className="secondary"
                  disabled={filters.page <= 1}
                  onClick={() => setFilter("page", filters.page - 1)}
                >
                  Previous
                </button>

                <span className="muted" style={{ fontSize: 13 }}>
                  Page {filters.page} of{" "}
                  {Math.ceil(grouped.length / PAGE_SIZE)}
                </span>

                <button
                  className="secondary"
                  disabled={
                    filters.page >=
                    Math.ceil(grouped.length / PAGE_SIZE)
                  }
                  onClick={() => setFilter("page", filters.page + 1)}
                >
                  Next
                </button>
              </nav>
            )}
          </section>
        </div>
      </div>

      {/* MOBILE FILTER DRAWER: edits pending filters, then applies them on submit. */}
      {drawerOpen && (
        <div
          className="drawer-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDrawerOpen(false);
            }
          }}
        >
          <div
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h2 style={{ margin: 0 }}>Filters</h2>
              <button
                className="secondary"
                onClick={() => setDrawerOpen(false)}
              >
                Close
              </button>
            </div>

            <FiltersPanel
              filters={pending}
              setFilter={setPendingFilter}
              records={rawRecords}
              categories={categories}
              locations={locations}
              currencies={currencies}
              onReset={() => setPending({ ...defaultFilters } as Filters)}
            />

            <button
              className="primary"
              style={{ width: "100%", marginTop: 16 }}
              onClick={() => {
                setFilters(pending);
                updateUrl(pending);
                setDrawerOpen(false);
              }}
            >
              Show {pendingCount.toLocaleString()} results
            </button>
          </div>
        </div>
      )}

      <footer
        style={{
          borderTop: "1px solid #e2e8e5",
          background: "white",
        }}
      >
        <div
          className="shell muted"
          style={{ padding: "22px 0", fontSize: 12 }}
        >
          MedEx Service Explorer · Demo marketplace · Prices shown in the
          provider’s currency
        </div>
      </footer>
    </main>
  );
}