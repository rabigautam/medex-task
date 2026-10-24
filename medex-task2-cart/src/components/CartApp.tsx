"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Cart, CartGroup, CartItem, Currency, MergeChange, OrderStatus, PaymentMethod } from "@/lib/types";

const currencyOrder = ["THB", "NPR", "INR"];
const labels: Record<string, string> = {
  package: "Health packages", lab_test: "Lab tests", wellness: "Wellness",
  service: "Medical services", insurance: "Insurance", unknown: "Other / unavailable"
};
const money = (amount: number, currency: string) => {
  try { return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount); }
  catch { return `${currency} ${amount.toFixed(2)}`; }
};
type CheckoutState = { status: "ready" | "processing" | "pending" | "paid" | "failed" | "blocked"; orderId?: string; message?: string };

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}

export default function CartApp() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [latency, setLatency] = useState(350);
  const [failNext, setFailNext] = useState(false);
  const [offline, setOffline] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<Record<string, PaymentMethod>>({});
  const [checkoutStates, setCheckoutStates] = useState<Record<string, CheckoutState>>({});
  const [mergeChanges, setMergeChanges] = useState<MergeChange[]>([]);
  const [devOpen, setDevOpen] = useState(false);
  const [pendingByLine, setPendingByLine] = useState<Record<string, number>>({});
  const [busyCheckout, setBusyCheckout] = useState(false);
  const lastFocused = useRef<string | null>(null);
  const mutationQueues = useRef<Record<string, Promise<unknown>>>({});
  const requestUrl = useCallback((path: string) => `${path}?latency=${latency}${offline ? "&offline=1" : ""}`, [latency, offline]);

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (failNext) { headers.set("x-mock-fail", "*"); setFailNext(false); }
    return fetch(requestUrl(path), { ...init, headers });
  }, [failNext, requestUrl]);

  const loadCart = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await api("/api/cart");
      const data = await parseResponse<{ cart: Cart }>(response);
      setCart(data.cart);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load your cart."); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { void loadCart(); }, [loadCart]);

  useEffect(() => {
    const saved = localStorage.getItem("medex.checkout.states");
    if (saved) {
      try { setCheckoutStates(JSON.parse(saved) as Record<string, CheckoutState>); } catch { /* ignore invalid local cache */ }
    }
  }, []);
  useEffect(() => {
    localStorage.setItem("medex.checkout.states", JSON.stringify(checkoutStates));
  }, [checkoutStates]);

  const groups = cart?.groups ?? [];
  const canCheckout = (group: CartGroup) => group.type !== "unknown" &&
    group.items.length > 0 &&
    group.items.every((item) => Boolean(item.product?.title) &&
      (item.product.type !== "wellness" || Boolean(item.wellnessPricingId && item.product.wellnessPricing?.some(o => o.id === item.wellnessPricingId))) &&
      (item.product.type === "wellness" || typeof item.product.price === "number"));

  const groupBlockReason = (group: CartGroup) => {
    if (group.type === "unknown" || group.items.some((item) => !item.product?.title)) return "Remove unavailable services before checkout.";
    if (group.items.some((item) => item.product.type === "wellness" && !item.wellnessPricingId)) return "Choose a duration for each wellness item.";
    return "";
  };

  const subtotalRows = (group: CartGroup) => {
    const totals: Record<string, number> = {};
    for (const item of group.items) {
      const p = item.product;
      if (!p?.title || !p.currency) continue;
      const selected = p.type === "wellness" ? p.wellnessPricing?.find(o => o.id === item.wellnessPricingId)?.amount_after_service_charge : p.price;
      if (typeof selected === "number" && Number.isFinite(selected)) totals[p.currency] = (totals[p.currency] ?? 0) + selected * item.quantity;
    }
    return Object.entries(totals).sort(([a], [b]) => currencyOrder.indexOf(a) - currencyOrder.indexOf(b));
  };

  const queueMutation = (lineId: string, run: () => Promise<void>) => {
    const previous = mutationQueues.current[lineId] ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(run);
    mutationQueues.current[lineId] = next;
    void next.finally(() => {
      if (mutationQueues.current[lineId] === next) delete mutationQueues.current[lineId];
    }).catch(() => undefined);
  };

  const changeQuantity = (item: CartItem, delta: number) => {
    const current = item.quantity;
    const target = Math.max(1, Math.min(99, current + delta));
    if (target === current) return;
    setCart((old) => old ? ({ ...old, groups: old.groups.map(g => ({ ...g, items: g.items.map(i => i.id === item.id ? { ...i, quantity: target } : i) })) }) : old);
    setPendingByLine((old) => ({ ...old, [item.id]: (old[item.id] ?? 0) + 1 }));
    queueMutation(item.id, async () => {
      try {
        const response = await api(`/api/cart/items/${encodeURIComponent(item.id)}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: target })
        });
        const data = await parseResponse<{ cart: Cart }>(response);
        setCart(data.cart);
      } catch (e) {
        await loadCart();
        setNotice(e instanceof Error ? `Quantity change failed: ${e.message}. Cart restored from server.` : "Quantity change failed. Cart restored from server.");
      } finally {
        setPendingByLine((old) => {
          const next = { ...old, [item.id]: Math.max(0, (old[item.id] ?? 1) - 1) };
          if (!next[item.id]) delete next[item.id];
          return next;
        });
      }
    });
  };

  const changeWellness = async (item: CartItem, wellnessPricingId: string) => {
    const previous = item.wellnessPricingId;
    setCart((old) => old ? ({ ...old, groups: old.groups.map(g => ({ ...g, items: g.items.map(i => i.id === item.id ? { ...i, wellnessPricingId } : i) })) }) : old);
    try {
      const response = await api(`/api/cart/items/${encodeURIComponent(item.id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wellnessPricingId })
      });
      const data = await parseResponse<{ cart: Cart }>(response); setCart(data.cart);
    } catch (e) {
      setCart((old) => old ? ({ ...old, groups: old.groups.map(g => ({ ...g, items: g.items.map(i => i.id === item.id ? { ...i, wellnessPricingId: previous } : i) })) }) : old);
      setNotice(e instanceof Error ? `Duration could not be saved: ${e.message}` : "Duration could not be saved.");
    }
  };

  const remove = async (item: CartItem) => {
    lastFocused.current = item.id;
    try {
      const response = await api(`/api/cart/items/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not remove this item.");
      setCart((old) => old ? ({ ...old, groups: old.groups.map(g => ({ ...g, items: g.items.filter(i => i.id !== item.id) })).filter(g => g.items.length), totalItems: Math.max(0, old.totalItems - item.quantity) }) : old);
      setNotice(`${item.product?.title || "Unavailable item"} removed from cart.`);
      requestAnimationFrame(() => document.querySelector<HTMLButtonElement>("[data-add-more]")?.focus());
    } catch (e) { setNotice(e instanceof Error ? e.message : "Could not remove item."); }
  };

  const startCheckout = async (group: CartGroup) => {
    if (!canCheckout(group)) { setNotice(groupBlockReason(group) || "This group cannot be checked out."); return; }
    const paymentMethod = paymentMethods[group.type] ?? "card";
    const keyStorage = `medex.checkout.key.${group.type}`;
    let key = localStorage.getItem(keyStorage);
    if (!key || checkoutStates[group.type]?.status === "paid") {
      key = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
      localStorage.setItem(keyStorage, key);
    }
    setBusyCheckout(true);
    setCheckoutStates((old) => ({ ...old, [group.type]: { status: "processing", message: "Creating this provider order…" } }));
    try {
      const response = await api("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupType: group.type, items: group.items.map(i => ({ lineId: i.id, quantity: i.quantity, wellnessPricingId: i.wellnessPricingId })), paymentMethod, idempotencyKey: key })
      });
      const data = await parseResponse<{ orderId: string; status: OrderStatus }>(response);
      setCheckoutStates((old) => ({ ...old, [group.type]: { status: data.status, orderId: data.orderId, message: `Order ${data.orderId} created. Status: ${data.status}.` } }));
      setNotice(`${labels[group.type] ?? group.type}: order created.`);
      await loadCart();
    } catch (e) {
      setCheckoutStates((old) => ({ ...old, [group.type]: { status: "failed", message: e instanceof Error ? e.message : "Checkout failed. Retry this group." } }));
      setNotice(`${labels[group.type] ?? group.type} checkout failed. Other group orders were not affected.`);
    } finally { setBusyCheckout(false); }
  };

  const checkoutAll = async () => {
    setBusyCheckout(true);
    for (const group of groups) {
      if (canCheckout(group)) await startCheckout(group);
      else setCheckoutStates((old) => ({ ...old, [group.type]: { status: "blocked", message: groupBlockReason(group) || "This group cannot be checked out." } }));
    }
    setBusyCheckout(false);
  };

  const mergeGuest = async () => {
    try {
      const response = await api("/api/cart/merge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: undefined }) });
      const data = await parseResponse<{ cart: Cart; changes: MergeChange[] }>(response);
      setCart(data.cart); setMergeChanges(data.changes);
      setNotice(`Guest cart merged. ${data.changes.length} change(s) reported.`);
    } catch (e) { setNotice(e instanceof Error ? e.message : "Could not merge guest cart."); }
  };

  const totalReady = groups.filter(canCheckout).length;
  const blocked = groups.length - totalReady;

  if (loading && !cart) return <main className="page"><div className="skeleton">Loading your cart…</div></main>;

  return (
    <main className="page">
      <header className="topbar">
        <div><div className="brand">MedEx <span>HEALTH MARKETPLACE</span></div><h1>Your cart</h1><p>Services from different providers are paid for separately.</p></div>
        <div className="top-actions"><button className="secondary" onClick={() => setDevOpen(v => !v)} aria-expanded={devOpen}>Developer controls</button><button className="secondary" onClick={mergeGuest}>Merge guest cart</button></div>
      </header>

      {devOpen && <section className="dev-panel" aria-label="Developer controls">
        <h2>Mock API controls</h2><p>These controls make slow and failed network states reproducible.</p>
        <label>Artificial latency <strong>{latency} ms</strong><input type="range" min="0" max="2500" step="100" value={latency} onChange={e => setLatency(Number(e.target.value))}/></label>
        <label className="check"><input type="checkbox" checked={failNext} onChange={e => setFailNext(e.target.checked)}/> Fail the next API request</label>
        <label className="check"><input type="checkbox" checked={offline} onChange={e => setOffline(e.target.checked)}/> Simulate offline / unavailable API</label>
      </section>}

      {notice && <div className="notice" role="status"><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice("")}>Dismiss</button></div>}
      {error && <div className="error" role="alert"><div><strong>We couldn’t load your cart.</strong><p>{error}</p></div><button onClick={loadCart}>Try again</button></div>}
      {!error && groups.length === 0 && <section className="empty"><div className="empty-icon">✓</div><h2>Your cart is clear</h2><p>All cart groups have been checked out or removed.</p><button data-add-more onClick={loadCart}>Refresh cart</button></section>}

      {!error && groups.length > 0 && <div className="layout">
        <section className="cart-groups" aria-label="Cart groups">
          {groups.map(group => {
            const status = checkoutStates[group.type] ?? { status: "ready" as const };
            const ready = canCheckout(group);
            const totals = subtotalRows(group);
            return <article className="group" key={group.type}>
              <div className="group-head"><div><div className="eyebrow">{group.type.replaceAll("_", " ")}</div><h2>{labels[group.type] ?? group.type}</h2><p>{group.itemCount} item{group.itemCount === 1 ? "" : "s"} · {group.items.length} line{group.items.length === 1 ? "" : "s"}</p></div><span className={`pill ${ready ? "good" : "warn"}`}>{ready ? "Ready for checkout" : "Action needed"}</span></div>
              <div className="items">
                {group.items.map(item => {
                  const p = item.product;
                  const available = Boolean(p?.title);
                  const selected = p?.wellnessPricing?.find(o => o.id === item.wellnessPricingId);
                  const unitPrice = p?.type === "wellness" ? selected?.amount_after_service_charge : p?.price;
                  return <div className={`item ${!available ? "unavailable" : ""}`} key={item.id}>
                    <div className="item-main">
                      <div className="item-symbol">{available ? (p.type === "wellness" ? "✦" : p.type === "lab_test" ? "⌕" : "＋") : "!"}</div>
                      <div className="item-info"><h3>{p?.title || "Service no longer available"}</h3><p>{available ? `${p.providerName || "Provider"} · ${p.type?.replaceAll("_", " ")}` : "This provider removed this service. It can’t be booked."}</p>
                        {p?.type === "wellness" && <label className="duration">Choose duration
                          <select aria-label={`Duration for ${p.title}`} value={item.wellnessPricingId ?? ""} onChange={e => { if (e.target.value) void changeWellness(item, e.target.value); }}>
                            <option value="">Select a duration</option>
                            {(p.wellnessPricing ?? []).map(option => <option value={option.id} key={option.id}>{option.durationInMinutes} minutes — {money(option.amount_after_service_charge, p.currency || "THB")}</option>)}
                          </select>
                        </label>}
                        {!available && <span className="unavailable-tag">Unavailable</span>}
                      </div>
                    </div>
                    <div className="item-price">
                      <strong>{typeof unitPrice === "number" && p?.currency ? money(unitPrice, p.currency) : "Price unknown"}</strong>
                      {typeof unitPrice === "number" && <small>per item</small>}
                    </div>
                    <div className="quantity" aria-label={`Quantity controls for ${p?.title || "unavailable item"}`}>
                      <button aria-label={`Decrease quantity for ${p?.title || "item"}`} disabled={item.quantity <= 1} onClick={() => changeQuantity(item, -1)}>−</button><output aria-live="polite">{item.quantity}</output><button aria-label={`Increase quantity for ${p?.title || "item"}`} disabled={item.quantity >= 99} onClick={() => changeQuantity(item, 1)}>+</button>
                    </div>
                    <button className="remove" onClick={() => void remove(item)}>Remove</button>
                    {pendingByLine[item.id] ? <span className="saving">Saving…</span> : null}
                  </div>;
                })}
              </div>
              <div className="group-footer">
                <div className="subtotal"><span>Group subtotal</span>{totals.length ? totals.map(([currency, amount]) => <strong key={currency}>{money(amount, currency as Currency)}</strong>) : <strong>Not yet available</strong>}{group.unpricedItems > 0 && <small>{group.unpricedItems} unpriced item{group.unpricedItems === 1 ? "" : "s"} excluded until resolved</small>}</div>
                <div className="checkout-controls">
                  <label>Payment method<select value={paymentMethods[group.type] ?? "card"} onChange={e => setPaymentMethods(old => ({ ...old, [group.type]: e.target.value as PaymentMethod }))}><option value="card">Card</option><option value="pay_at_clinic">Pay at clinic</option></select></label>
                  <button className="primary" disabled={!ready || busyCheckout || status.status === "processing"} onClick={() => void startCheckout(group)}>{status.status === "failed" ? "Retry this group" : "Checkout group"}</button>
                </div>
                {status.message && <div className={`checkout-state ${status.status}`} role="status"><strong>{status.status.toUpperCase()}</strong><span>{status.message}</span></div>}
                {!ready && <p className="block-reason">{groupBlockReason(group) || "This group is not ready for checkout."}</p>}
              </div>
            </article>;
          })}
        </section>
        <aside className="summary">
          <div className="summary-heading"><span>CHECKOUT SUMMARY</span><h2>Pay separately</h2><p>Each group creates a separate order. Different currencies are never added together.</p></div>
          <div className="summary-stat"><span>Items in cart</span><strong>{cart?.totalItems ?? 0}</strong></div>
          <div className="summary-stat"><span>Groups ready</span><strong>{totalReady}</strong></div>
          <div className="summary-stat"><span>Need attention</span><strong>{blocked}</strong></div>
          <div className="currency-summary"><h3>Totals by currency</h3>{currencyOrder.map(currency => {
            const total = groups.reduce((sum, group) => sum + (group.subtotals[currency] ?? 0), 0);
            return total > 0 ? <div key={currency}><span>{currency}</span><strong>{money(total, currency)}</strong></div> : null;
          })}{groups.every(g => subtotalRows(g).length === 0) && <p>Choose wellness durations to see priced totals.</p>}</div>
          <button className="primary wide" disabled={!totalReady || busyCheckout} onClick={() => void checkoutAll()}>Checkout all ready groups</button>
          <p className="summary-note">If one group fails, successful orders remain successful. Retry only the failed group.</p>
        </aside>
      </div>}

      {mergeChanges.length > 0 && <section className="merge-results"><h2>Guest cart changes</h2><ul>{mergeChanges.map((change, index) => <li key={`${change.kind}-${index}`}><span className={`change ${change.kind}`}>{change.kind}</span><div><strong>{change.title}</strong><p>{change.message}</p></div></li>)}</ul></section>}
      <footer>MedEx demo · Fictional data · No real payments are processed</footer>
    </main>
  );
}
