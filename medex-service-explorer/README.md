# MedEx Service Explorer

A Next.js + React + TypeScript implementation starter for the MedEx .

## Important: add the assessment data

Put the provided file at:

`data/task1-service-explorer.json`
The project currently includes a tiny fictional dataset so the UI can run immediately.
## Run locally

Requirements: Node.js 20.9+ recommended.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Run tests:

```bash
npm test
```

Production build:

```bash
npm run build
npm start
```


## Project structure


## Design decisions and trade-offs

### Data visibility and normalization

The UI never imports the source JSON. The Next.js route handlers use a mock API module with configurable latency. Categories are flattened by ID, providers are joined by `userId`, and services are normalized before being returned. A service is visible only when its own status is true, its provider is active, and any linked category/subcategory is active. Services with no category remain visible, because the brief says a category must be active only if the service has one. Unknown provider IDs are not expected in the provided dataset; services without a usable provider are not shown in provider groups.

Category identity is based on IDs, never slugs. This matters because two top-level categories can share the `ultrasound` slug.

### Pricing and currencies

Money values are parsed from decimal strings. Discount is applied before service charge, exactly as described in the brief. Intermediate calculations are not rounded; display formatting rounds to two decimal places. Wellness has no single base price, so the UI displays the lowest valid duration option as “From …” and labels it as a duration-based starting price. The exact selected duration is not implied.

Currency belongs to the provider. A customer must select THB, NPR, or INR before setting a numeric price range or sorting by price. No exchange rate is assumed and prices from different currencies are never compared. Services whose price cannot be calculated are excluded from numeric price-range matches and sort after priced services.

### Facet behavior

Facet counts are computed by applying all active filters except the facet being counted. Zero-result options are disabled rather than hidden, so users can see the available dimensions and understand why an option cannot currently be selected. Category and subcategory selection uses IDs; subcategory choices are narrowed when a parent category is selected.

### Search, sort and pagination

Search matches service title, provider name, category and subcategory. Relevance sorting moves exact title matches first and then title-prefix matches first; the remaining matches retain their existing order. Price sorting is enabled only after a currency is selected. Results are grouped by provider, with a maximum of three services shown by default and a “View all” action. Pagination is over provider cards to keep groups intact.

The URL stores query, service types, category/subcategory IDs, providers, location, currency, price range, home-test flag, sort and page. Non-search filter changes create browser history entries; query typing updates the current entry to avoid one history entry per keystroke. Back/forward navigation restores URL state.

### UX and accessibility

- Skeletons are shown while the three endpoints load.
- API errors have a retry action.
- Empty results offer clear-all and, where relevant, remove-price-filter actions.
- On small screens, filters are shown in a drawer; its button estimates the pending result count before applying.
- Inputs have labels, controls are keyboard-operable, and a polite live region announces result-count changes.
- Reduced-motion preferences are respected.

## Mock API failure state

Copy `.env.example` to `.env.local`, then set:

```dotenv
NEXT_PUBLIC_MOCK_API_FAIL=true
```

Restart the dev server to see the error state. Set it back to `false` to restore normal behavior. `MOCK_API_LATENCY_MS` controls the simulated delay for each endpoint.

## Tests

The included Vitest tests cover percentage and fixed adjustments, missing prices, precision without intermediate rounding, combined filters, currency-aware price filtering, excluding a facet's own dimension, and pagination. Run with `npm test`.

## Performance measurement

The dataset is loaded once from three mock endpoints. Filtering and facet calculations are memoized, and the search query uses React's `useDeferredValue` so text input is not coupled to every synchronous render. Facet counts are derived from the full visible service set and all active dimensions except the dimension being counted.

Before submission, measure this in the target browser rather than claiming an unverified benchmark:

1. Run `npm run dev` and load the full dataset.
2. Open Chrome DevTools Performance, record a filter change and a series of search keystrokes, then inspect scripting/rendering time.
3. Repeat after selecting several filters and check that result cards do not jump vertically while the list updates.
4. Record browser version, device/CPU, number of visible services, and observed timings here after measurement.

This project does not claim a verified 100 ms benchmark yet. If profiling shows facet computation exceeds the target, the next step is to pre-index service IDs by facet value and compute counts with bitsets or cached intersections, then profile again.

#### Testing Approach

Tests use representative datasets and expected outputs to validate business logic independently of the UI where practical. This helps identify regressions in filtering, pricing, and other core functionality.

### Known Limitations

Some integration and end-to-end scenarios may require additional coverage, including API failure recovery, browser navigation, mobile filter interactions, and complete booking or checkout flows. These should be listed as pending only if they are not already covered by the existing tests.
## AI assistance disclosure

AI assistance was used to help draft parts like test cases , issue related help ,  implementation of utils function and documentation. 

# DEMO LINK AVAILABLE HERE:
https://www.loom.com/share/df084c86974a41d6968f34d817ed504e