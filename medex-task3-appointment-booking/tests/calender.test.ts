import { describe, it, expect } from "vitest";
import { getNext90Days } from "../src/lib/calender";
import type { Provider, ProviderClosure } from "../src/lib/types";

describe("getNext90Days", () => {
  const provider: Provider = {
    id: 1,
    name: "Bangkok Medical Center",
    country: "TH",
    timezone: "Asia/Bangkok",
    daySchedules: {
      monday: { startTime: "09:00", endTime: "17:00" },
      tuesday: { startTime: "09:00", endTime: "17:00" },
      wednesday: { startTime: "09:00", endTime: "17:00" },
      thursday: { startTime: "09:00", endTime: "17:00" },
      friday: { startTime: "09:00", endTime: "17:00" },
    },
    specialists: [],
  };

  const now = new Date("2026-10-26T05:00:00.000Z");

  it("returns 90 days by default", () => {
    const result = getNext90Days(provider, [], { now });

    expect(result).toHaveLength(90);
  });

  it("starts with today's date in the provider's timezone", () => {
    const result = getNext90Days(provider, [], {
      now: new Date("2026-10-26T05:00:00.000Z"),
    });

    expect(result[0].date).toBe("2026-10-26");
    expect(result[0].dayOffset).toBe(0);
  });

  it("generates consecutive calendar dates", () => {
    const result = getNext90Days(provider, [], {
      now,
      numberOfDays: 3,
    });

    expect(result.map((day) => day.date)).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
    ]);
  });

  it("marks scheduled weekdays as available", () => {
    const result = getNext90Days(provider, [], {
      now,
      numberOfDays: 1,
    });

    expect(result[0]).toMatchObject({
      date: "2026-10-26",
      weekday: "monday",
      available: true,
    });
  });

  it("marks days without a schedule as unavailable", () => {
    const result = getNext90Days(provider, [], {
      now,
      numberOfDays: 6,
    });

    expect(result[5]).toMatchObject({
      date: "2026-10-31",
      weekday: "saturday",
      available: false,
      reason: "The clinic is closed on this day.",
    });
  });

  it("marks provider closure dates as unavailable with a reason", () => {
    const closures: ProviderClosure[] = [
      {
        providerId: 1,
        dayOffset: 0,
        reason: "Public holiday",
      },
    ];

    const result = getNext90Days(provider, closures, {
      now,
      numberOfDays: 1,
    });

    expect(result[0]).toMatchObject({
      available: false,
      reason: "Public holiday",
    });
  });

  it("ignores closures belonging to other providers", () => {
    const closures: ProviderClosure[] = [
      {
        providerId: 2,
        dayOffset: 0,
        reason: "Other provider closure",
      },
    ];

    const result = getNext90Days(provider, closures, {
      now,
      numberOfDays: 1,
    });

    expect(result[0].available).toBe(true);
  });

  it("throws when numberOfDays is not a positive integer", () => {
    expect(() =>
      getNext90Days(provider, [], { now, numberOfDays: 0 }),
    ).toThrow("numberOfDays must be a positive integer.");

    expect(() =>
      getNext90Days(provider, [], { now, numberOfDays: -1 }),
    ).toThrow("numberOfDays must be a positive integer.");

    expect(() =>
      getNext90Days(provider, [], { now, numberOfDays: 1.5 }),
    ).toThrow("numberOfDays must be a positive integer.");
  });
});