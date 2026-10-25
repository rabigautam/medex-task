import rawData from "../../data/task3-booking.json";
import type { BookingData, Provider, Specialist } from "./types";
import { addDaysToDateKey, dateInZone, resolveTimeZone } from "./timezone";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const state = globalThis as typeof globalThis & { __medexData?: BookingData; __medexBookings?: Array<Record<string, unknown>> };

function initialise(): BookingData {
  if (state.__medexData) return state.__medexData;
  const data = structuredClone(rawData) as unknown as BookingData;
  const now = new Date();
  data.providers = data.providers.map(provider => {
    const zone = resolveTimeZone(provider.timezone, provider.country);
    const providerToday = dateInZone(now, zone);
    return { ...provider, timezone: zone, __today: providerToday } as Provider & { __today: string };
  });
  const todayFor = (providerId: number) => {
    const p = data.providers.find(p => p.id === providerId) as (Provider & { __today?: string }) | undefined;
    return p?.__today ?? dateInZone(now, "UTC");
  };
  data.closures = data.closures.map(c => ({ ...c, date: addDaysToDateKey(todayFor(c.providerId), c.dayOffset) }));
  data.bookedSlots = data.bookedSlots.map(s => ({ ...s, date: addDaysToDateKey(todayFor(s.providerId), s.dayOffset) }));
  data.existingBooking.date = addDaysToDateKey(todayFor(data.existingBooking.providerId), data.existingBooking.dayOffset);
  state.__medexData = data;
  state.__medexBookings = [];
  return data;
}

export async function getData() {
  const data = initialise();
  const latency = Number(process.env.MOCK_API_LATENCY_MS ?? 350);
  await delay(Math.max(0, latency));
  if (process.env.NEXT_PUBLIC_MOCK_API_FAIL === "1" || (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("apiFail"))) {
    throw new Error("The mock service is temporarily unavailable.");
  }
  return data;
}

export async function getProvider(id: number) {
  const data = await getData();
  return data.providers.find(p => p.id === id);
}

export async function createBooking(payload: { providerId: number; specialistId: string; date: string; startTime: string; numberOfPeople: number }) {
  const data = await getData();
  const conflict = process.env.MOCK_API_CONFLICT === "1";
  const duplicate = data.bookedSlots.some(s => s.providerId === payload.providerId && s.specialistId === payload.specialistId && s.date === payload.date && s.startTime === payload.startTime);
  if (conflict || duplicate) return { status: 409 as const, message: "That slot was just taken. Please choose one of the alternatives." };
  const bookingId = `BK-${Date.now().toString(36).toUpperCase()}`;
  state.__medexBookings?.push({ ...payload, bookingId });
  for (let i = 0; i < payload.numberOfPeople; i++) {
    data.bookedSlots.push({ providerId: payload.providerId, specialistId: payload.specialistId, date: payload.date, dayOffset: -1, startTime: payload.startTime });
  }
  return { status: 201 as const, bookingId };
}

export async function rescheduleBooking(id: string, payload: { date: string; startTime: string }) {
  await getData();
  if (process.env.MOCK_API_CONFLICT === "1") return { status: 409 as const, message: "That slot was just taken. Your existing booking has not changed." };
  return { status: 200 as const, bookingId: id };
}