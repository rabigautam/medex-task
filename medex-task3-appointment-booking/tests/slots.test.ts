
import { describe, expect, it } from "vitest";
import {
    getSlotPeriod,
    groupSlotsByPeriod,
    formatSlotTime,
    generateAppointmentSlots,
    type AppointmentSlot,
  } from "../src/lib/slot";
  
  import type { BookedSlot, Provider } from "../src/lib/types";
  
  describe("getSlotPeriod", () => {
    it("classifies morning slots", () => {
      expect(getSlotPeriod("08:30")).toBe("morning");
      expect(getSlotPeriod("11:59")).toBe("morning");
    });
  
    it("classifies afternoon slots", () => {
      expect(getSlotPeriod("12:00")).toBe("afternoon");
      expect(getSlotPeriod("16:59")).toBe("afternoon");
    });
  
    it("classifies evening slots", () => {
      expect(getSlotPeriod("17:00")).toBe("evening");
      expect(getSlotPeriod("21:30")).toBe("evening");
    });
  
    it("throws for invalid time strings", () => {
      expect(() => getSlotPeriod("25:00")).toThrow(
        "Invalid appointment time: 25:00",
      );
      expect(() => getSlotPeriod("invalid")).toThrow();
    });
  });
  
  describe("groupSlotsByPeriod", () => {
    const slots: AppointmentSlot[] = [
      {
        startTime: "17:00",
        endTime: "17:30",
        isBooked: false,
        availableForGroup: true,
      },
      {
        startTime: "09:30",
        endTime: "10:00",
        isBooked: false,
        availableForGroup: true,
      },
      {
        startTime: "13:00",
        endTime: "13:30",
        isBooked: true,
        availableForGroup: false,
      },
      {
        startTime: "08:30",
        endTime: "09:00",
        isBooked: false,
        availableForGroup: true,
      },
    ];
  
    it("groups slots into morning, afternoon, and evening", () => {
      const grouped = groupSlotsByPeriod(slots);
  
      expect(grouped.morning).toHaveLength(2);
      expect(grouped.afternoon).toHaveLength(1);
      expect(grouped.evening).toHaveLength(1);
    });
  
    it("sorts slots chronologically within each group", () => {
      const grouped = groupSlotsByPeriod(slots);
  
      expect(grouped.morning.map((slot) => slot.startTime)).toEqual([
        "08:30",
        "09:30",
      ]);
    });
  
    it("preserves booked and group-availability flags", () => {
      const grouped = groupSlotsByPeriod(slots);
  
      expect(grouped.afternoon[0]).toMatchObject({
        isBooked: true,
        availableForGroup: false,
      });
    });
  
    it("returns empty arrays for periods with no slots", () => {
      const grouped = groupSlotsByPeriod([
        {
          startTime: "09:00",
          endTime: "09:30",
          isBooked: false,
          availableForGroup: true,
        },
      ]);
  
      expect(grouped.afternoon).toEqual([]);
      expect(grouped.evening).toEqual([]);
    });
  });
  
  describe("formatSlotTime", () => {
    it("formats morning times", () => {
      expect(formatSlotTime("09:05")).toBe("9:05 AM");
    });
  
    it("formats noon and afternoon times", () => {
      expect(formatSlotTime("12:00")).toBe("12:00 PM");
      expect(formatSlotTime("14:30")).toBe("2:30 PM");
    });
  
    it("formats midnight correctly", () => {
      expect(formatSlotTime("00:00")).toBe("12:00 AM");
    });
  
    it("throws for invalid times", () => {
      expect(() => formatSlotTime("24:00")).toThrow();
    });
  });
  
  describe("generateAppointmentSlots", () => {
    const provider: Provider = {
      id: 1,
      name: "Test Clinic",
      country: "TH",
      timezone: "Asia/Bangkok",
      daySchedules: {
        monday: {
          startTime: "09:00",
          endTime: "11:00",
        },
      },
      specialists: [
        {
          id: "spec-1",
          name: "Test Specialist",
          speciality: "General Medicine",
          consultation: {
            startTime: "09:00",
            endTime: "11:00",
            durationInMinutes: 30,
            bufferInMinutes: 0,
          },
        },
      ],
    };
  
    const bookedSlots: BookedSlot[] = [];
  
    it("generates slots based on the specialist duration and buffer", () => {
      const slots = generateAppointmentSlots({
        provider,
        specialistId: "spec-1",
        date: "2026-10-26",
        dayOffset: 0,
        bookedSlots,
      });
  
      expect(slots.map((slot) => slot.startTime)).toEqual([
        "09:00",
        "09:30",
        "10:00",
        "10:30",
      ]);
  
      expect(slots[0].endTime).toBe("09:30");
    });
  
    it("marks booked slots as unavailable", () => {
      const bookings: BookedSlot[] = [
        {
          providerId: 1,
          specialistId: "spec-1",
          date: "2026-10-26",
          dayOffset: 0,
          startTime: "09:30",
        },
      ];
  
      const slots = generateAppointmentSlots({
        provider,
        specialistId: "spec-1",
        date: "2026-10-26",
        dayOffset: 0,
        bookedSlots: bookings,
      });
  
      expect(slots[1]).toMatchObject({
        startTime: "09:30",
        isBooked: true,
        availableForGroup: false,
      });
    });
  
    it("returns no slots for an unknown specialist", () => {
      const slots = generateAppointmentSlots({
        provider,
        specialistId: "unknown",
        date: "2026-10-26",
        dayOffset: 0,
        bookedSlots,
      });
  
      expect(slots).toEqual([]);
    });
  
    it("returns no slots on a day without a schedule", () => {
      const slots = generateAppointmentSlots({
        provider,
        specialistId: "spec-1",
        date: "2026-10-27",
        dayOffset: 1,
        bookedSlots,
      });
  
      expect(slots).toEqual([]);
    });
  
    it("returns no slots for invalid consultation durations", () => {
      const invalidProvider: Provider = {
        ...provider,
        specialists: [
          {
            ...provider.specialists[0],
            consultation: {
              ...provider.specialists[0].consultation,
              durationInMinutes: 0,
            },
          },
        ],
      };
  
      const slots = generateAppointmentSlots({
        provider: invalidProvider,
        specialistId: "spec-1",
        date: "2026-10-26",
        dayOffset: 0,
        bookedSlots,
      });
  
      expect(slots).toEqual([]);
    });

it("disables a slot that is already booked", () => {
    const bookings: BookedSlot[] = [
      {
        providerId: 1,
        specialistId: "spec-1",
        date: "2026-10-26",
        dayOffset: 0,
        startTime: "09:30",
      },
    ];
  
    const slots = generateAppointmentSlots({
      provider,
      specialistId: "spec-1",
      date: "2026-10-26",
      dayOffset: 0,
      bookedSlots: bookings,
    });
  
    expect(slots.find((slot) => slot.startTime === "09:30"))
      .toMatchObject({
        isBooked: true,
        availableForGroup: false,
      });
  });
  
  it("does not mark a slot booked for a different date", () => {
    const bookings: BookedSlot[] = [
      {
        providerId: 1,
        specialistId: "spec-1",
        date: "2026-10-27",
        dayOffset: 1,
        startTime: "09:30",
      },
    ];
  
    const slots = generateAppointmentSlots({
      provider,
      specialistId: "spec-1",
      date: "2026-10-26",
      dayOffset: 0,
      bookedSlots: bookings,
    });
  
    expect(slots.find((slot) => slot.startTime === "09:30"))
      .toMatchObject({
        isBooked: false,
        availableForGroup: true,
      });
  });
  
  it("does not mark a slot booked for a different specialist", () => {
    const bookings: BookedSlot[] = [
      {
        providerId: 1,
        specialistId: "spec-2",
        date: "2026-10-26",
        dayOffset: 0,
        startTime: "09:30",
      },
    ];
  
    const slots = generateAppointmentSlots({
      provider,
      specialistId: "spec-1",
      date: "2026-10-26",
      dayOffset: 0,
      bookedSlots: bookings,
    });
  
    expect(slots.find((slot) => slot.startTime === "09:30"))
      .toMatchObject({
        isBooked: false,
        availableForGroup: true,
      });
  });
  
  });
  