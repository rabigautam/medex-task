import type { BookedSlot, Closure, Provider, Slot, SlotResponse, Specialist } from "@/lib/types";
import { minutesOfDay, dateInZone, timeFromMinutes, localDateTimeToInstant, weekdayInZone } from "./timezone";

export type AppointmentSlot = {
  startTime: string;
  endTime: string;
  isBooked: boolean;
  availableForGroup: boolean;
  isPast: boolean;
};

export type SlotPeriod = "morning" | "afternoon" | "evening";

export type GroupedSlots = Record<SlotPeriod, AppointmentSlot[]>;

export type TimeRange = {
  startTime: string;
  endTime: string;
};

export type BookableHours = TimeRange;

export const SLOT_PERIODS: {
  key: SlotPeriod;
  title: string;
  hours: string;
}[] = [
  { key: "morning", title: "Morning", hours: "Before 12:00 PM" },
  { key: "afternoon", title: "Afternoon", hours: "12:00 PM – 4:59 PM" },
  { key: "evening", title: "Evening", hours: "5:00 PM onward" },
];

/** Converts a valid 24-hour HH:mm time into minutes after midnight. */
export function parseTime(time: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);

  if (!match) {
    throw new Error(`Invalid appointment time: ${time}`);
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function toMinutes(time: string): number {
  return parseTime(time);
}

function toTime(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440) {
    throw new Error(`Invalid minute value: ${minutes}`);
  }

  if (minutes === 1440) return "24:00";

  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60,
  ).padStart(2, "0")}`;
}

/**
 * Returns the overlap between provider opening hours and specialist
 * consultation hours. Returns null if the hours are invalid or do not overlap.
 *
 * The end time is exclusive: an appointment must finish by the closing time.
 */
export function getBookableHours(
  providerHours: TimeRange,
  specialistHours: TimeRange,
): BookableHours | null {
  try {
    const providerStart = toMinutes(providerHours.startTime);
    const providerEnd = toMinutes(providerHours.endTime);
    const specialistStart = toMinutes(specialistHours.startTime);
    const specialistEnd = toMinutes(specialistHours.endTime);

    if (
      providerStart >= providerEnd ||
      specialistStart >= specialistEnd
    ) {
      return null;
    }

    const start = Math.max(providerStart, specialistStart);
    const end = Math.min(providerEnd, specialistEnd);

    if (start >= end) return null;

    return {
      startTime: toTime(start),
      endTime: toTime(end),
    };
  } catch {
    return null;
  }
}

export function getSlotPeriod(startTime: string): SlotPeriod {
  const minutes = parseTime(startTime);

  if (minutes < 12 * 60) return "morning";
  if (minutes < 17 * 60) return "afternoon";

  return "evening";
}

export function groupSlotsByPeriod(
  slots: AppointmentSlot[],
): GroupedSlots {
  const grouped: GroupedSlots = {
    morning: [],
    afternoon: [],
    evening: [],
  };

  for (const slot of slots) {
    grouped[getSlotPeriod(slot.startTime)].push(slot);
  }

  for (const period of Object.values(grouped)) {
    period.sort(
      (a, b) => parseTime(a.startTime) - parseTime(b.startTime),
    );
  }

  return grouped;
}

export function formatSlotTime(time: string): string {
  const totalMinutes = parseTime(time);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const displayHours = hours % 12 || 12;
  const suffix = hours >= 12 ? "PM" : "AM";

  return `${displayHours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

type GenerateSlotsParams = {
  provider: Provider;
  specialistId: string;
  dayOffset: number;
  date: string;
  bookedSlots: BookedSlot[];
};

function parseDate(date: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const result = new Date(Date.UTC(year, month - 1, day));

  if (
    result.getUTCFullYear() !== year ||
    result.getUTCMonth() !== month - 1 ||
    result.getUTCDate() !== day
  ) {
    return null;
  }

  return result;
}

const WEEKDAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function getProviderHoursForDate(
  provider: Provider,
  date: string,
): TimeRange | null {
  const parsedDate = parseDate(date);

  if (!parsedDate) return null;

  return (
    provider.daySchedules[WEEKDAY_NAMES[parsedDate.getUTCDay()]] ?? null
  );
}

/**
 * Gets the provider's current local date and time.
 * Availability must be evaluated in the provider's timezone.
 */
export function getProviderLocalDateTime(timeZone: string): {
  date: string;
  time: string;
} {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());

    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );

    return {
      date: `${values.year}-${values.month}-${values.day}`,
      time: `${values.hour}:${values.minute}`,
    };
  } catch {
    throw new Error(`Invalid provider timezone: ${timeZone}`);
  }
}

export type SpecialistAvailabilityForDate = {
  providerHours: TimeRange | null;
  specialistHours: TimeRange | null;
  bookableHours: BookableHours | null;
  isRestricted: boolean;
};

/**
 * Returns the advertised specialist hours and the actual overlap with
 * provider opening hours for the selected date.
 *
 * Assumption: specialist.consultation.startTime/endTime represent the
 * advertised consultation window.
 */
export function getSpecialistAvailabilityForDate({
  provider,
  specialistId,
  date,
}: {
  provider: Provider;
  specialistId: string;
  date: string;
}): SpecialistAvailabilityForDate {
  const providerHours = getProviderHoursForDate(provider, date);
  const specialist = provider.specialists.find(
    (item) => item.id === specialistId,
  );

  const specialistHours: TimeRange | null = specialist
    ? {
        startTime: specialist.consultation.startTime,
        endTime: specialist.consultation.endTime,
      }
    : null;

  if (!providerHours || !specialistHours) {
    return {
      providerHours,
      specialistHours,
      bookableHours: null,
      isRestricted: false,
    };
  }

  const bookableHours = getBookableHours(
    providerHours,
    specialistHours,
  );

  return {
    providerHours,
    specialistHours,
    bookableHours,
    isRestricted:
      !bookableHours ||
      bookableHours.startTime !== specialistHours.startTime ||
      bookableHours.endTime !== specialistHours.endTime,
  };
}

export function generateAppointmentSlots({
  provider,
  specialistId,
  dayOffset,
  date,
  bookedSlots,
}: GenerateSlotsParams): AppointmentSlot[] {
  if (!parseDate(date)) return [];

  const specialist = provider.specialists.find(
    (item) => item.id === specialistId,
  );

  if (!specialist) return [];

  const availability = getSpecialistAvailabilityForDate({
    provider,
    specialistId,
    date,
  });

  const { bookableHours } = availability;

  if (!bookableHours) return [];

  const opening = toMinutes(bookableHours.startTime);
  const closing = toMinutes(bookableHours.endTime);

  const duration = specialist.consultation.durationInMinutes;
  const buffer = specialist.consultation.bufferInMinutes;
  const step = duration + buffer;

  if (
    !Number.isFinite(duration) ||
    !Number.isFinite(buffer) ||
    !Number.isInteger(duration) ||
    !Number.isInteger(buffer) ||
    duration <= 0 ||
    buffer < 0 ||
    step <= 0 ||
    closing <= opening
  ) {
    return [];
  }

  const bookingsForDay = bookedSlots.filter(
    (booking) =>
      booking.providerId === provider.id &&
      booking.specialistId === specialistId &&
      (booking.date
        ? booking.date === date
        : booking.dayOffset === dayOffset),
  );

  const bookedTimes = new Set(
    bookingsForDay.map((booking) => booking.startTime),
  );

  let providerNow: ReturnType<typeof getProviderLocalDateTime>;

  try {
    providerNow = getProviderLocalDateTime(provider.timezone);
  } catch {
    return [];
  }

  const isPastDate = date < providerNow.date;
  const isToday = date === providerNow.date;
  const currentMinutes = toMinutes(providerNow.time);

  const slots: AppointmentSlot[] = [];

  for (
    let start = opening;
    start + duration <= closing;
    start += step
  ) {
    const startTime = toTime(start);
    const endTime = toTime(start + duration);
    const isBooked = bookedTimes.has(startTime);
    const isPast = isPastDate || (isToday && start <= currentMinutes);

    slots.push({
      startTime,
      endTime,
      isBooked,
      isPast,
      availableForGroup: !isBooked && !isPast,
    });
  }

  return slots;
}

type BuildSlotsArgs = {
  provider: Provider;
  specialist: Specialist;
  date: string;
  bookedSlots: BookedSlot[];
  closures: Closure[];
  now?: Date;
};

export function buildSlots({
  provider, specialist, date, bookedSlots, closures, now = new Date()
}: BuildSlotsArgs): SlotResponse {
  const closure = closures.find(c => c.providerId === provider.id && c.date === date);
  if (closure) return { slots: [], reason: closure.reason };

  const zone = provider.timezone;
  const weekday = weekdayInZone(new Date(`${date}T12:00:00Z`), zone);
  const clinicHours = provider.daySchedules["monday"];
  if (!clinicHours) return { slots: [], reason: "The clinic is closed on this day." };

  const start = Math.max(
    minutesOfDay(clinicHours.startTime),
    minutesOfDay(specialist.consultation.startTime)
  );
  const end = Math.min(
    minutesOfDay(clinicHours.endTime),
    minutesOfDay(specialist.consultation.endTime)
  );
  const duration = specialist.consultation.durationInMinutes;
  const step = duration + specialist.consultation.bufferInMinutes;
  if (end - start < duration || step <= 0) return { slots: [], reason: "No appointment times fit within both schedules." };

  const providerToday = dateInZone(now, zone);
  const nowParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(now);
  const currentHour = Number(nowParts.find(part => part.type === "hour")?.value ?? 0);
  const currentMinute = Number(nowParts.find(part => part.type === "minute")?.value ?? 0);
  const nowMinutes = currentHour * 60 + currentMinute;
  const booked = new Set(bookedSlots
    .filter(b => b.providerId === provider.id && b.specialistId === specialist.id && b.date === date)
    .map(b => b.startTime));

  const slots: Slot[] = [];
  for (let startMinute = start; startMinute + duration <= end; startMinute += step) {
    const startTime = timeFromMinutes(startMinute);
    if (date === providerToday && startMinute <= nowMinutes) continue;
    // Past-date filtering is also applied by the UI; keep the API defensive.
    if (date < providerToday) continue;
    slots.push({
        startTime,
        endTime: timeFromMinutes(startMinute + duration),
        isBooked: booked.has(startTime),
        availableForGroup: false
    });
  }
  return { slots };
}

export function isSlotInFuture(date: string, time: string, timeZone: string, now = new Date()): boolean {
  return localDateTimeToInstant(date, time, timeZone).getTime() > now.getTime();
}