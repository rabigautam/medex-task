
import { describe, expect, it } from "vitest";
import {
  resolveTimeZone,
  addDaysToDateKey,
  minutesOfDay,
  timeFromMinutes,
  weekdayInZone,
  localDateTimeToInstant,
  isSlotInFuture,
} from "../src/lib/timezone";

describe("timezone and date helpers", () => {
  it("resolves IANA zones directly", () => {
    expect(resolveTimeZone("Asia/Bangkok", "TH")).toBe("Asia/Bangkok");
  });

  it("resolves a Nepal offset string", () => {
    expect(resolveTimeZone(" UTC+05:45", "NP")).toBe("Asia/Kathmandu");
  });

  it("falls back by country for empty values", () => {
    expect(resolveTimeZone("", "IN")).toBe("Asia/Kolkata");
  });

  it("handles date rollover", () => {
    expect(addDaysToDateKey("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("converts time strings to and from minutes", () => {
    expect(minutesOfDay("23:40")).toBe(1420);
    expect(timeFromMinutes(1420)).toBe("23:40");
  });

  it("gets the weekday in the provider timezone", () => {
    expect(
      weekdayInZone(new Date("2026-10-25T12:00:00Z"), "Asia/Bangkok"),
    ).toBe("Sunday");
  });

  it("converts Kathmandu local time to the correct UTC instant", () => {
    expect(
      localDateTimeToInstant(
        "2026-10-25",
        "10:00",
        "Asia/Kathmandu",
      ).toISOString(),
    ).toBe("2026-10-25T04:15:00.000Z");
  });

  it("compares appointments against the current instant", () => {
    expect(
      isSlotInFuture(
        "2026-10-25",
        "10:00",
        "Asia/Kathmandu",
        new Date("2026-10-25T04:00:00Z"),
      ),
    ).toBe(true);
  });
});
