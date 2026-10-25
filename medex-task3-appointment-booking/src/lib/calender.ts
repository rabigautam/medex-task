
import type {
    CalendarDay,
    Provider,
    ProviderClosure,
  } from "./types";
  
  import {
    addDaysToDateKey,
    getDateInTimeZone,
    getProviderTimeZone,
    getWeekdayFromDateKey,
  } from "./timezone";
  
  type CalendarOptions = {
    now?: Date;
    numberOfDays?: number;
  };
  
  export function getNext90Days(
    provider: Provider,
    closures: ProviderClosure[],
    options: CalendarOptions = {},
  ): CalendarDay[] {
    const {
      now = new Date(),
      numberOfDays = 90,
    } = options;
  
    if (!Number.isInteger(numberOfDays) || numberOfDays < 1) {
      throw new Error("numberOfDays must be a positive integer.");
    }
  
    const timeZone = getProviderTimeZone(
      provider.timezone,
      provider.country,
    );
  
    const providerToday = getDateInTimeZone(now, timeZone);
  
    const providerClosures = new Map(
      closures
        .filter((closure) => closure.providerId === provider.id)
        .map((closure) => [closure.dayOffset, closure.reason]),
    );
  
    return Array.from({ length: numberOfDays }, (_, dayOffset) => {
      const date = addDaysToDateKey(providerToday, dayOffset);
      const weekday = getWeekdayFromDateKey(date);
      const schedule = provider.daySchedules[weekday];
      const closureReason = providerClosures.get(dayOffset);
  
      if (closureReason) {
        return {
          date,
          dayOffset,
          weekday,
          available: false,
          reason: closureReason,
        };
      }
  
      if (!schedule) {
        return {
          date,
          dayOffset,
          weekday,
          available: false,
          reason: "The clinic is closed on this day.",
        };
      }
  
      return {
        date,
        dayOffset,
        weekday,
        available: true,
      };
    });
  }
  