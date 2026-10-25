
import type { BookedSlot, Provider } from "@/lib/types";

export type AppointmentSlot = {
  startTime: string;
  endTime: string;
  isBooked: boolean;
  availableForGroup: boolean;
};

export type SlotPeriod = "morning" | "afternoon" | "evening";

export type GroupedSlots = Record<SlotPeriod, AppointmentSlot[]>;

export const SLOT_PERIODS: {
  key: SlotPeriod;
  title: string;
  hours: string;
}[] = [
  { key: "morning", title: "Morning", hours: "Before 12:00 PM" },
  { key: "afternoon", title: "Afternoon", hours: "12:00 PM – 4:59 PM" },
  { key: "evening", title: "Evening", hours: "5:00 PM onward" },
];

function parseTime(time: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);

  if (!match) {
    throw new Error(`Invalid appointment time: ${time}`);
  }

  return Number(match[1]) * 60 + Number(match[2]);
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

function toMinutes(time: string): number {
  return parseTime(time);
}

function toTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60,
  ).padStart(2, "0")}`;
}

export function generateAppointmentSlots({
  provider,
  specialistId,
  dayOffset,
  date,
  bookedSlots,
}: GenerateSlotsParams): AppointmentSlot[] {
  // Validate YYYY-MM-DD and calculate the weekday in UTC
  // to avoid local timezone shifts.
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!dateMatch) return [];

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const dateObject = new Date(Date.UTC(year, month - 1, day));

  if (
    dateObject.getUTCFullYear() !== year ||
    dateObject.getUTCMonth() !== month - 1 ||
    dateObject.getUTCDate() !== day
  ) {
    return [];
  }

  const weekdayIndex = dateObject.getUTCDay();
  const weekdayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  const schedule = provider.daySchedules[weekdayNames[weekdayIndex]];
  const specialist = provider.specialists.find(
    (item) => item.id === specialistId,
  );

  if (!schedule || !specialist) return [];

  const opening = toMinutes(schedule.startTime);
  const closing = toMinutes(schedule.endTime);
  const duration = specialist.consultation.durationInMinutes;
  const buffer = specialist.consultation.bufferInMinutes;
  const step = duration + buffer;

  if (
    !Number.isFinite(duration) ||
    !Number.isFinite(buffer) ||
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

  const slots: AppointmentSlot[] = [];

  for (
    let start = opening;
    start + duration <= closing;
    start += step
  ) {
    const startTime = toTime(start);
    const endTime = toTime(start + duration);
    const isBooked = bookedTimes.has(startTime);

    slots.push({
      startTime,
      endTime,
      isBooked,
      availableForGroup: !isBooked,
    });
  }

  return slots;
}
