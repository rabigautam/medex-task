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

export async function createBooking(payload: {
    providerId: number;
    specialistId: string;
    date: string;
    startTimes: string[];
    numberOfPeople: number;
  }) {
    const data = await getData();
  
    if (
      !Number.isInteger(payload.numberOfPeople) ||
      payload.numberOfPeople < 1 ||
      payload.numberOfPeople > 4
    ) {
      return {
        status: 400 as const,
        message: "Number of people must be between 1 and 4.",
      };
    }
  
    if (
      !Array.isArray(payload.startTimes) ||
      payload.startTimes.length !== payload.numberOfPeople
    ) {
      return {
        status: 400 as const,
        message: "Select one appointment slot for each person.",
      };
    }
  
    if (new Set(payload.startTimes).size !== payload.startTimes.length) {
      return {
        status: 400 as const,
        message: "Selected appointment times must be unique.",
      };
    }
  
    if (process.env.MOCK_API_CONFLICT === "1") {
      return {
        status: 409 as const,
        message:
          "That slot was just taken. Please choose another available slot.",
      };
    }
  
    const hasConflict = payload.startTimes.some((startTime) =>
      data.bookedSlots.some(
        (slot) =>
          slot.providerId === payload.providerId &&
          slot.specialistId === payload.specialistId &&
          slot.date === payload.date &&
          slot.startTime === startTime
      )
    );
  
    if (hasConflict) {
      return {
        status: 409 as const,
        message:
          "One or more selected slots are no longer available. Please choose alternatives.",
      };
    }
  
    const bookingId = `BK-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;
  
    state.__medexBookings ??= [];
  
    state.__medexBookings.push({
      ...payload,
      startTimes: [...payload.startTimes],
      bookingId,
    });
  
    for (const startTime of payload.startTimes) {
      data.bookedSlots.push({
        providerId: payload.providerId,
        specialistId: payload.specialistId,
        date: payload.date,
        dayOffset: 0,
        startTime,
      });
    }
  
    return {
      status: 201 as const,
      bookingId,
      numberOfPeople: payload.numberOfPeople,
      startTimes: payload.startTimes,
    };
  }

export async function rescheduleBooking(id: string, payload: { date: string; startTime: string }) {
  await getData();
  if (process.env.MOCK_API_CONFLICT === "1") return { status: 409 as const, message: "That slot was just taken. Your existing booking has not changed." };
  return { status: 200 as const, bookingId: id };
}
export class BookingConflictError extends Error {
    constructor(
      message = "One or more selected appointment slots are no longer available.",
    ) {
      super(message);
      this.name = "BookingConflictError";
    }
  }
  
  export class BookingNotFoundError extends Error {
    constructor(message = "Booking not found.") {
      super(message);
      this.name = "BookingNotFoundError";
    }
  }
  
  export class BookingValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "BookingValidationError";
    }
  }
  

export async function getBooking(id: string) {
    await getData();
  
    state.__medexBookings ??= [];
  
    const booking = state.__medexBookings.find(
      (item) => item.bookingId === id,
    );
  
    if (!booking) {
      throw new BookingNotFoundError();
    }
  
    return structuredClone(booking);
  }
  
  export async function updateBooking(
    id: string,
    payload: {
      providerId: number;
      specialistId: string;
      date: string;
      startTimes: string[];
    },
  ) {
    const data = await getData();
  
    state.__medexBookings ??= [];
  
    const bookingIndex = state.__medexBookings.findIndex(
      (item) => item.bookingId === id,
    );
  
    if (bookingIndex === -1) {
      throw new BookingNotFoundError();
    }
  
    if (
      !Number.isInteger(payload.providerId) ||
      !payload.specialistId ||
      !payload.date ||
      !Array.isArray(payload.startTimes) ||
      payload.startTimes.length === 0 ||
      payload.startTimes.some(
        (time) => typeof time !== "string" || !time.trim(),
      ) ||
      new Set(payload.startTimes).size !== payload.startTimes.length
    ) {
      throw new BookingValidationError(
        "Please provide a valid provider, specialist, date, and unique appointment times.",
      );
    }
  
    const provider = data.providers.find(
      (item) => item.id === payload.providerId,
    );
  
    if (!provider) {
      throw new BookingValidationError("Provider not found.");
    }
  
    const specialistExists = provider.specialists.some(
      (item) => item.id === payload.specialistId,
    );
  
    if (!specialistExists) {
      throw new BookingValidationError(
        "The selected specialist does not belong to this provider.",
      );
    }
  
    const currentBooking = state.__medexBookings[bookingIndex] as Record<
      string,
      unknown
    > & {
      providerId: number;
      specialistId: string;
      date: string;
      startTimes: string[];
      bookingId: string;
    };
  
    // Exclude the current booking's slots when checking for conflicts.
    const hasConflict = payload.startTimes.some((startTime) =>
      data.bookedSlots.some(
        (slot) =>
          slot.providerId === payload.providerId &&
          slot.specialistId === payload.specialistId &&
          slot.date === payload.date &&
          slot.startTime === startTime &&
          !(
            currentBooking.providerId === slot.providerId &&
            currentBooking.specialistId === slot.specialistId &&
            currentBooking.date === slot.date &&
            currentBooking.startTimes.includes(slot.startTime)
          ),
      ),
    );
  
    if (process.env.MOCK_API_CONFLICT === "1" || hasConflict) {
      throw new BookingConflictError(
        "One or more selected slots are no longer available. Your existing booking has not changed.",
      );
    }
  
    // Remove the old booking's slots from availability.
    data.bookedSlots = data.bookedSlots.filter(
      (slot) =>
        !(
          slot.providerId === currentBooking.providerId &&
          slot.specialistId === currentBooking.specialistId &&
          slot.date === currentBooking.date &&
          currentBooking.startTimes.includes(slot.startTime)
        ),
    );
  
    const updatedBooking = {
      ...currentBooking,
      providerId: payload.providerId,
      specialistId: payload.specialistId,
      date: payload.date,
      startTimes: [...payload.startTimes],
    };
  
    state.__medexBookings[bookingIndex] = updatedBooking;
  
    // Mark the new slots as booked.
    for (const startTime of payload.startTimes) {
      data.bookedSlots.push({
        providerId: payload.providerId,
        specialistId: payload.specialistId,
        date: payload.date,
        dayOffset: 0,
        startTime,
      });
    }
  
    return {
      status: 200 as const,
      bookingId: id,
      providerId: payload.providerId,
      specialistId: payload.specialistId,
      date: payload.date,
      startTimes: [...payload.startTimes],
    };
  }
  