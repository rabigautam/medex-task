export type TimeRange = { startTime: string; endTime: string };
export type Specialist = {
  id: string;
  name: string;
  speciality: string;
  consultation: TimeRange & { durationInMinutes: number; bufferInMinutes: number };
};
export type Provider = {
  id: number;
  name: string;
  country: string;
  timezone: string;
  daySchedules: Record<string, TimeRange>;
  specialists: Specialist[];
};
export type Closure = { providerId: number; dayOffset: number; reason: string; date?: string };
export type BookedSlot = { providerId: number; specialistId: string; dayOffset: number; startTime: string; date?: string };
export type BookingData = {
  providers: Provider[];
  closures: Closure[];
  bookedSlots: BookedSlot[];
  existingBooking: {
    bookingId: string; providerId: number; specialistId: string;
    dayOffset: number; startTime: string; numberOfPeople: number; date?: string;
  };
};
export type Slot = { startTime: string; endTime: string; isBooked: boolean; availableForGroup: boolean };

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type DaySchedule = {
  startTime: string;
  endTime: string;
};




export type ProviderClosure = {
  providerId: number;
  dayOffset: number;
  reason: string;
};



export type ExistingBooking = {
  bookingId: string;
  providerId: number;
  specialistId: string;
  dayOffset: number;
  startTime: string;
  numberOfPeople: number;
};

export type BookingDataset = {
  _readme: string;
  providers: Provider[];
  closures: ProviderClosure[];
  bookedSlots: BookedSlot[];
  existingBooking: ExistingBooking;
};

export type CalendarDay = {
  date: string;
  dayOffset: number;
  weekday: Weekday;
  available: boolean;
  reason?: string;
};
