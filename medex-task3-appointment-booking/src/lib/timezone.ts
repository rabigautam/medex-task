
import type { Weekday } from "./types";

const TIMEZONE_ALIASES: Record<string, string> = {
  "UTC+05:45": "Asia/Kathmandu",
  "(GMT+5:45)": "Asia/Kathmandu",
  "NEPAL STANDARD TIME": "Asia/Kathmandu",
  "ASIA/KATMANDU": "Asia/Kathmandu",
};

export function getProviderTimeZone(
  timezone: string | undefined,
  country?: string,
): string {
  const normalized = timezone?.trim() ?? "";
  const alias = TIMEZONE_ALIASES[normalized.toUpperCase()];

  if (alias) return alias;

  if (!normalized && country === "IN") {
    return "Asia/Kolkata";
  }

  if (!normalized) {
    return "UTC";
  }

  try {
    // Validate that the value is an IANA timezone accepted by Intl.
    new Intl.DateTimeFormat("en-US", {
      timeZone: normalized,
    }).format();

    return normalized;
  } catch {
    return country === "NP"
      ? "Asia/Kathmandu"
      : country === "IN"
        ? "Asia/Kolkata"
        : "UTC";
  }
}

export function getDateInTimeZone(
  date: Date = new Date(),
  timeZone = "UTC",
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function addDaysToDateKey(
  dateKey: string,
  days: number,
): string {
  const [year, month, day] = dateKey.split("-").map(Number);

  // UTC date arithmetic avoids local daylight-saving shifts.
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function getWeekdayFromDateKey(dateKey: string): Weekday {
  const [year, month, day] = dateKey.split("-").map(Number);

  const weekday = new Date(
    Date.UTC(year, month - 1, day),
  ).getUTCDay();

  const weekdays: Weekday[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  return weekdays[weekday];
}

export function formatDateKey(
  dateKey: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
  },
  locale = "en",
): string {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}


export function resolveTimeZone(
    timezone: string | undefined,
    country?: string,
  ): string {
    return getProviderTimeZone(timezone, country);
  }
  
  export function dateInZone(
    date: Date = new Date(),
    timeZone = "UTC",
  ): string {
    return getDateInTimeZone(date, timeZone);
  }
  
export function minutesOfDay(time: string): number {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  
    if (!match) {
      throw new Error(`Invalid time format: ${time}. Expected HH:mm.`);
    }
  
    return Number(match[1]) * 60 + Number(match[2]);
  }
  
  export function timeFromMinutes(minutes: number): string {
    if (
      !Number.isInteger(minutes) ||
      minutes < 0 ||
      minutes >= 1440
    ) {
      throw new Error(`Invalid minutes of day: ${minutes}. Expected 0–1439.`);
    }
  
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
  
    return `${String(hours).padStart(2, "0")}:${String(
      remainingMinutes,
    ).padStart(2, "0")}`;
  }
  
  /**
 * Gets the weekday for a specific date in a given timezone.
 * Returns: "Monday", "Tuesday", etc.
 */
export function weekdayInZone(date: Date, timeZone: string): string {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
    }).format(date);
  }
  
  /**
   * Converts a local date and time in a timezone into a UTC Date instant.
   * Example: localDateTimeToInstant("2026-10-25", "10:00", "Asia/Kathmandu")
   */
  export function localDateTimeToInstant(
    date: string,
    time: string,
    timeZone: string,
  ): Date {
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
  
    if (
      !year || !month || !day ||
      !Number.isInteger(hour) || hour < 0 || hour > 23 ||
      !Number.isInteger(minute) || minute < 0 || minute > 59
    ) {
      throw new Error("Invalid date or time.");
    }
  
    // Interpret the supplied date/time as UTC initially.
    const targetUtc = Date.UTC(year, month - 1, day, hour, minute);
  
    // Use the timezone's formatted parts to determine its UTC offset.
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
  
    let instant = targetUtc;
  
    // Recalculate to account for timezone offset and daylight saving time.
    for (let i = 0; i < 4; i++) {
      const parts = formatter.formatToParts(new Date(instant));
      const values = Object.fromEntries(
        parts
          .filter((part) => part.type !== "literal")
          .map((part) => [part.type, Number(part.value)]),
      );
  
      const representedUtc = Date.UTC(
        values.year,
        values.month - 1,
        values.day,
        values.hour,
        values.minute,
        values.second,
      );
  
      const offset = representedUtc - instant;
      const nextInstant = targetUtc - offset;
  
      if (nextInstant === instant) break;
      instant = nextInstant;
    }
  
    // Validate that this local time actually exists (DST can skip local times).
    const resultParts = formatter.formatToParts(new Date(instant));
    const result = Object.fromEntries(
      resultParts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    );
  
    if (
      result.year !== year ||
      result.month !== month ||
      result.day !== day ||
      result.hour !== hour ||
      result.minute !== minute
    ) {
      throw new Error("This local time does not exist in the specified timezone.");
    }
  
    return new Date(instant);
  }

export function isSlotInFuture(
    date: string,
    time: string,
    timeZone: string,
    now: Date = new Date(),
  ): boolean {
    const slotInstant = localDateTimeToInstant(date, time, timeZone);
  
    return slotInstant.getTime() > now.getTime();
  }
  
export function addDaysToDate(dateKey: string, days: number): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  
    if (!match) {
      throw new Error(`Invalid date format: ${dateKey}. Expected YYYY-MM-DD.`);
    }
  
    if (!Number.isInteger(days)) {
      throw new Error("Days must be an integer.");
    }
  
    const [, year, month, day] = match;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  
    // Reject invalid calendar dates such as February 30.
    if (
      date.getUTCFullYear() !== Number(year) ||
      date.getUTCMonth() !== Number(month) - 1 ||
      date.getUTCDate() !== Number(day)
    ) {
      throw new Error(`Invalid calendar date: ${dateKey}.`);
    }
  
    date.setUTCDate(date.getUTCDate() + days);
  
    return [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0"),
    ].join("-");
  }

  export function formatInZone(
    instant: Date,
    timeZone: string,
  ): string {
    if (Number.isNaN(instant.getTime())) {
      throw new Error("Invalid date instant.");
    }
  
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZoneName: "short",
    }).format(instant);
  }
    