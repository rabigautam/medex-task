import { describe, expect, it } from "vitest";
import { resolveTimeZone, addDaysToDateKey, minutesOfDay, timeFromMinutes } from "../src/lib/timezone";

describe("timezone and date helpers", () => {
  it("resolves IANA zones directly", () => expect(resolveTimeZone("Asia/Bangkok", "TH")).toBe("Asia/Bangkok"));
  it("resolves a Nepal offset string", () => expect(resolveTimeZone(" UTC+05:45", "NP")).toBe("Asia/Kathmandu"));
  it("falls back by country for empty values", () => expect(resolveTimeZone("", "IN")).toBe("Asia/Kolkata"));
  it("handles date rollover", () => expect(addDaysToDateKey("2026-12-31", 1)).toBe("2027-01-01"));
  it("converts time strings to and from minutes", () => {
    expect(minutesOfDay("23:40")).toBe(1420);
    expect(timeFromMinutes(1420)).toBe("23:40");
  });
});
