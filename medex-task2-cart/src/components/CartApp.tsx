"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Cart, CartGroup, CartItem, MergeChange, OrderStatus, PaymentMethod } from "@/lib/types";

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
  const [latency, setLatency] = useState(350);
  const [failNext, setFailNext] = useState(false);
  const [offline, setOffline] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<Record<string, PaymentMethod>>({});
  const [checkoutStates, setCheckoutStates] = useState<Record<string, CheckoutState>>({});
 
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

  

  

  

  
}
