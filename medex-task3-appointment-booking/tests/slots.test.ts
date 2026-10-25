
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

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
      isPast: false,
      availableForGroup: true,
    },
    {
      startTime: "09:30",
      endTime: "10:00",
      isBooked: false,
      isPast: false,
      availableForGroup: true,
    },
    {
      startTime: "13:00",
      endTime: "13:30",
      isBooked: true,
      isPast: false,
      availableForGroup: false,
    },
    {
      startTime: "08:30",
      endTime: "09:00",
      isBooked: false,
      isPast: false,
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
        isPast: false,
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

  beforeEach(() => {
    vi.useFakeTimers();
    // Bangkok time: Sunday, October 25, 2026, at 07:00.
    // October 26 is therefore a future appointment date.
    vi.setSystemTime(new Date("2026-10-25T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("generates slots based on specialist duration and buffer", () => {
    const slots = generateAppointmentSlots({
      provider,
      specialistId: "spec-1",
      date: "2026-10-26",
      dayOffset: 1,
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
        dayOffset: 1,
        startTime: "09:30",
      },
    ];

    const slots = generateAppointmentSlots({
      provider,
      specialistId: "spec-1",
      date: "2026-10-26",
      dayOffset: 1,
      bookedSlots: bookings,
    });

    expect(slots[1]).toMatchObject({
      startTime: "09:30",
      isBooked: true,
      isPast: false,
      availableForGroup: false,
    });
  });

  it("does not mark a slot booked for another date", () => {
    const bookings: BookedSlot[] = [
      {
        providerId: 1,
        specialistId: "spec-1",
        date: "2026-10-27",
        dayOffset: 2,
        startTime: "09:30",
      },
    ];

    const slots = generateAppointmentSlots({
      provider,
      specialistId: "spec-1",
      date: "2026-10-26",
      dayOffset: 1,
      bookedSlots: bookings,
    });

    expect(slots[1]).toMatchObject({
      isBooked: false,
      availableForGroup: true,
    });
  });

  it("does not mark a slot booked for another specialist", () => {
    const bookings: BookedSlot[] = [
      {
        providerId: 1,
        specialistId: "spec-2",
        date: "2026-10-26",
        dayOffset: 1,
        startTime: "09:30",
      },
    ];

    const slots = generateAppointmentSlots({
      provider,
      specialistId: "spec-1",
      date: "2026-10-26",
      dayOffset: 1,
      bookedSlots: bookings,
    });

    expect(slots[1]).toMatchObject({
      isBooked: false,
      availableForGroup: true,
    });
  });

  it("returns no slots for an unknown specialist", () => {
    const slots = generateAppointmentSlots({
      provider,
      specialistId: "unknown",
      date: "2026-10-26",
      dayOffset: 1,
      bookedSlots,
    });

    expect(slots).toEqual([]);
  });

  it("returns no slots on a day without a provider schedule", () => {
    const slots = generateAppointmentSlots({
      provider,
      specialistId: "spec-1",
      date: "2026-10-27",
      dayOffset: 2,
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
      dayOffset: 1,
      bookedSlots,
    });

    expect(slots).toEqual([]);
  });

  it("marks yesterday's appointment slots as past", () => {
    // Bangkok time is Monday, October 26, at 11:00.
    vi.setSystemTime(new Date("2026-10-26T04:00:00.000Z"));

    const slots = generateAppointmentSlots({
      provider,
      specialistId: "spec-1",
      date: "2026-10-26",
      dayOffset: 1,
      bookedSlots,
    });

    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((slot) => slot.isPast)).toBe(true);
    expect(slots.every((slot) => !slot.availableForGroup)).toBe(true);
  });

  it("keeps future appointment times available today", () => {
    // Bangkok time is Monday, October 26, at 08:00.
    vi.setSystemTime(new Date("2026-10-26T01:00:00.000Z"));

    const slots = generateAppointmentSlots({
      provider,
      specialistId: "spec-1",
      date: "2026-10-26",
      dayOffset: 1,
      bookedSlots,
    });

    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((slot) => !slot.isPast)).toBe(true);
    expect(slots.every((slot) => slot.availableForGroup)).toBe(true);
  });

  it("respects the overlap between provider and specialist working hours", () => {
    const restrictedProvider: Provider = {
      ...provider,
      daySchedules: {
        monday: {
          startTime: "09:00",
          endTime: "11:00",
        },
      },
      specialists: [
        {
          ...provider.specialists[0],
          consultation: {
            ...provider.specialists[0].consultation,
            startTime: "09:30",
            endTime: "10:30",
          },
        },
      ],
    };

    const slots = generateAppointmentSlots({
      provider: restrictedProvider,
      specialistId: "spec-1",
      date: "2026-10-26",
      dayOffset: 1,
      bookedSlots,
    });

    expect(slots.map((slot) => slot.startTime)).toEqual([
      "09:30",
      "10:00",
    ]);

    expect(slots.every((slot) => slot.startTime >= "09:30")).toBe(true);
    expect(slots.every((slot) => slot.endTime <= "10:30")).toBe(true);
  });

  it("returns no slots when provider and specialist hours do not overlap", () => {
    const restrictedProvider: Provider = {
      ...provider,
      daySchedules: {
        monday: {
          startTime: "09:00",
          endTime: "10:00",
        },
      },
      specialists: [
        {
          ...provider.specialists[0],
          consultation: {
            ...provider.specialists[0].consultation,
            startTime: "10:30",
            endTime: "11:30",
          },
        },
      ],
    };

    const slots = generateAppointmentSlots({
      provider: restrictedProvider,
      specialistId: "spec-1",
      date: "2026-10-26",
      dayOffset: 1,
      bookedSlots,
    });

    expect(slots).toEqual([]);
  });

  it("returns no slots for an invalid calendar date", () => {
    const slots = generateAppointmentSlots({
      provider,
      specialistId: "spec-1",
      date: "2026-02-30",
      dayOffset: 1,
      bookedSlots,
    });

    expect(slots).toEqual([]);
  });
});
