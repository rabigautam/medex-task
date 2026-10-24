# MedEx Task 2 — Multi-provider Cart and Split Checkout

A React + TypeScript + Next.js implementation of the MedEx cart assessment. The supplied fictional JSON is kept behind API routes; UI components do not import the data file directly.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Run tests and production build:

```bash
npm test
npm run build
```


## Features implemented

- Cart grouped by service type; currency subtotals remain separate and there is no mixed-currency grand total.
- Wellness options use `amount_after_service_charge` as the final unit price. Until a duration is chosen, price remains unknown and checkout is blocked for that group.
- Removed/unavailable catalog products are clearly marked and removable.
- Quantity updates optimistically. Per-line mutations are serialized, so quick increments/decrements do not race and overwrite newer changes.
- Per-group or all-group split checkout, with card or pay-at-clinic method per group.
- Idempotency keys are persisted in local storage per checkout attempt; completed and failed outcomes remain visible after refresh.
- Guest-cart merge reports merged, added, or unavailable items.
- Mock API supports artificial latency and failure injection through the Dev controls panel or query flags.
- Keyboard-friendly buttons, labels, focus restoration after removal, and live status announcements.

## Key decisions and trade-offs

1. **Currency safety:** subtotal by currency inside each service-type group. Never add THB, NPR and INR together.
2. **Unknown prices:** a wellness item without a selected duration has no numeric total. It is never treated as zero.
3. **Server authority:** the mock API owns the cart, checkout records and idempotency map. In-memory state resets when the dev server restarts; this simulates server behavior for a local exercise but is not durable production storage.
4. **Quantity race prevention:** each line has a client-side promise queue. The visible quantity updates immediately, while requests for the same line are sent sequentially.
5. **Checkout model:** each group has an independent order status: ready, processing, pending, paid, failed or blocked. Each group receives a stable idempotency key for its current attempt. Retrying a failed request reuses that key to avoid duplicate orders.
6. **Guest merge:** duplicate products merge by product ID; quantities are added; a guest wellness choice is used if the server line has no duration choice. Unknown catalog products are reported and skipped rather than silently creating unusable lines.
7. **Data cleanup:** empty products are retained as unavailable lines until the user removes them. Unknown group types are shown in an “Other / unavailable” section and cannot be checked out.
8. **Mock failures:** use the built-in Dev controls panel to change latency or fail the next matching request. The panel is intentionally visible for assessment review.

## Checkout state model

```text
ready -> processing -> pending -> paid
                   \-> failed -> retry (same idempotency key)
ready -> blocked (unpriced wellness, unavailable item, or unsupported group)
```

Checkout runs per group. “Check out all” attempts eligible groups independently and reports each result. A successful group is not rolled back if another group fails.

## API routes

- `GET /api/cart`
- `PATCH /api/cart/items/:lineId` with `{ "quantity": number }` or `{ "wellnessPricingId": string }`
- `DELETE /api/cart/items/:lineId`
- `POST /api/cart/merge` with `{ "items": guestCart }`
- `POST /api/checkout` with `{ "groupType", "items", "paymentMethod", "idempotencyKey" }`
- `GET /api/orders/:orderId`

The API uses an in-memory store loaded from `data/task2-cart.json` at server startup. This is deliberate for the time-boxed assessment. A production implementation would persist cart/order/idempotency data in a database and use payment-provider idempotency support.

## AI usage

AI assistance was used to draft and review portions of the initial project structure and implementation. The author should review, test, and be able to explain every line before submission.

# DEMO LINK AVAILABLE HERE:
https://www.loom.com/share/ea9a814a352c401ca534537aeff6ef3d