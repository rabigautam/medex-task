
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
  