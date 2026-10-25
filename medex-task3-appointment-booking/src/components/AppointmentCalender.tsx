
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CalendarDay, Provider } from "@/lib/types";

type AppointmentCalendarProps = {
  provider: Provider;
  days: CalendarDay[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
};

const WEEKDAYS = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
] as const;

function dateLabel(
  dateKey: string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const date = new Date(`${dateKey}T12:00:00Z`);

  return new Intl.DateTimeFormat("en", {
    timeZone: "UTC",
    ...options,
  }).format(date);
}

function groupDaysByMonth(days: CalendarDay[]) {
  const groups = new Map<string, CalendarDay[]>();

  for (const day of days) {
    const monthKey = day.date.slice(0, 7);

    if (!groups.has(monthKey)) {
      groups.set(monthKey, []);
    }

    groups.get(monthKey)!.push(day);
  }

  return Array.from(groups.entries()).map(([monthKey, monthDays]) => ({
    monthKey,
    days: monthDays,
  }));
}

function addDays(dateKey: string, amount: number): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export default function AppointmentCalendar({
  provider,
  days,
  selectedDate,
  onSelectDate,
}: AppointmentCalendarProps) {
  const availableDays = useMemo(
    () => days.filter((day) => day.available),
    [days],
  );

  const [focusedDate, setFocusedDate] = useState<string>(
    selectedDate && availableDays.some((day) => day.date === selectedDate)
      ? selectedDate
      : availableDays[0]?.date ?? "",
  );

  const [announcement, setAnnouncement] = useState("");

  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (
      selectedDate &&
      availableDays.some((day) => day.date === selectedDate)
    ) {
      setFocusedDate(selectedDate);
    }
  }, [selectedDate, availableDays]);

  useEffect(() => {
    if (
      focusedDate &&
      !availableDays.some((day) => day.date === focusedDate)
    ) {
      setFocusedDate(availableDays[0]?.date ?? "");
    }
  }, [focusedDate, availableDays]);

  function focusDate(dateKey: string) {
    setFocusedDate(dateKey);

    // The target button may be in another month; refs cover all rendered months.
    requestAnimationFrame(() => {
      buttonRefs.current.get(dateKey)?.focus();
    });
  }

  function moveFocus(currentDate: string, amount: number) {
    const availableSet = new Set(availableDays.map((day) => day.date));
    let candidate = currentDate;

    // Search in the requested direction, skipping closed dates.
    // Bound the search to the displayed 90-day window.
    for (let step = 0; step < days.length; step++) {
      candidate = addDays(candidate, amount);

      if (availableSet.has(candidate)) {
        const fullDate = dateLabel(candidate, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });

        setAnnouncement(`${fullDate}, available`);
        focusDate(candidate);
        return;
      }

      // Stop once we have moved beyond the range in the requested direction.
      if (
        (amount > 0 && candidate > days[days.length - 1].date) ||
        (amount < 0 && candidate < days[0].date)
      ) {
        break;
      }
    }

    setAnnouncement("No other available dates in that direction.");
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    day: CalendarDay,
  ) {
    let targetDate: string | null = null;

    switch (event.key) {
      case "ArrowLeft":
        targetDate = addDays(day.date, -1);
        break;
      case "ArrowRight":
        targetDate = addDays(day.date, 1);
        break;
      case "ArrowUp":
        targetDate = addDays(day.date, -7);
        break;
      case "ArrowDown":
        targetDate = addDays(day.date, 7);
        break;
      case "Home":
      case "End": {
        event.preventDefault();

        const currentDayIndex = days.findIndex(
          (item) => item.date === day.date,
        );

        if (currentDayIndex < 0) return;

        const weekStartIndex = currentDayIndex - (currentDayIndex % 7);
        const weekEndIndex = Math.min(weekStartIndex + 6, days.length - 1);
        const weekDays = days.slice(weekStartIndex, weekEndIndex + 1);
        const candidates =
          event.key === "Home" ? weekDays : [...weekDays].reverse();

        const availableTarget = candidates.find((item) => item.available);

        if (availableTarget) {
          focusDate(availableTarget.date);
          setAnnouncement(
            `${dateLabel(availableTarget.date, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}, available`,
          );
        } else {
          setAnnouncement("No available dates in this week.");
        }

        return;
      }
      default:
        return;
    }

    event.preventDefault();

    if (!targetDate) return;

    const availableSet = new Set(availableDays.map((item) => item.date));

    if (availableSet.has(targetDate)) {
      focusDate(targetDate);
      setAnnouncement(
        `${dateLabel(targetDate, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}, available`,
      );
      return;
    }

    // When the immediately adjacent date is closed, continue in that direction.
    const amount =
      event.key === "ArrowLeft"
        ? -1
        : event.key === "ArrowRight"
          ? 1
          : event.key === "ArrowUp"
            ? -7
            : 7;

    moveFocus(day.date, amount);
  }

  if (days.length === 0) {
    return (
      <div className="empty" role="status">
        <strong>No calendar dates available</strong>
        Availability could not be generated for this provider.
      </div>
    );
  }

  const months = groupDaysByMonth(days);

  return (
    <section aria-labelledby="appointment-calendar-heading">
      <div className="calendar-overview">
        <div>
          <h2 id="appointment-calendar-heading">
            Choose an appointment date
          </h2>
          <p>
            Dates follow {provider.name}&apos;s local calendar. Select an
            available date to continue.
          </p>
          <p className="sr-only" id="calendar-keyboard-help">
            Use the arrow keys to navigate dates. Press Home or End to move to
            the first or last available date in the current week. Press Enter
            or Space to select a date.
          </p>
        </div>

        <span className="pill">{days.length}-day availability</span>
      </div>

      <div className="monthly-calendars">
        {months.map(({ monthKey, days: monthDays }) => {
          const firstWeekdayIndex = WEEKDAYS.findIndex(
            (weekday) => weekday.key === monthDays[0].weekday,
          );

          const cells: Array<CalendarDay | null> = [
            ...Array.from(
              { length: Math.max(0, firstWeekdayIndex) },
              () => null,
            ),
            ...monthDays,
          ];

          const monthTitle = dateLabel(`${monthKey}-15`, {
            month: "long",
            year: "numeric",
          });

          const availableCount = monthDays.filter(
            (day) => day.available,
          ).length;

          return (
            <div className="calendar-wrap month-calendar" key={monthKey}>
              <div className="calendar-header">
                <div>
                  <h3>{monthTitle}</h3>
                  <p className="calendar-range">
                    {monthDays.length} dates in this period
                  </p>
                </div>

                <span className="pill">{availableCount} available</span>
              </div>

              <div className="weekdays" aria-hidden="true">
                {WEEKDAYS.map((weekday) => (
                  <span key={weekday.key}>{weekday.label}</span>
                ))}
              </div>

              <div
                className="days"
                role="group"
                aria-label={`${monthTitle} appointment dates`}
                aria-describedby="calendar-keyboard-help"
              >
                {cells.map((day, index) => {
                  if (!day) {
                    return (
                      <span
                        key={`empty-${monthKey}-${index}`}
                        className="calendar-padding"
                        aria-hidden="true"
                      />
                    );
                  }

                  const selected = day.date === selectedDate;
                  const isTabStop =
                    day.date === focusedDate ||
                    (!focusedDate && day.available && day === availableDays[0]);

                  const className = [
                    "day",
                    day.available ? "available" : "closed",
                    selected ? "selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  const fullDate = dateLabel(day.date, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  });

                  return (
                    <button
                      key={day.date}
                      ref={(node) => {
                        if (node) buttonRefs.current.set(day.date, node);
                        else buttonRefs.current.delete(day.date);
                      }}
                      type="button"
                      className={className}
                      disabled={!day.available}
                      tabIndex={day.available && isTabStop ? 0 : -1}
                      aria-pressed={selected}
                      aria-label={
                        day.available
                          ? `${fullDate}, available`
                          : `${fullDate}, unavailable: ${day.reason}`
                      }
                      title={
                        day.available
                          ? fullDate
                          : `${fullDate} — ${day.reason}`
                      }
                      onFocus={() => setFocusedDate(day.date)}
                      onKeyDown={(event) => handleKeyDown(event, day)}
                      onClick={() => {
                        if (!day.available) return;
                        setFocusedDate(day.date);
                        onSelectDate(day.date);
                        setAnnouncement(`${fullDate} selected.`);
                      }}
                    >
                      <span className="day-number">
                        {Number(day.date.slice(-2))}
                      </span>
                      <small>
                        {day.available ? "Available" : "Unavailable"}
                      </small>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      <div className="legend" aria-label="Calendar legend">
        <span>
          <i className="dot" aria-hidden="true" />
          Available
        </span>
        <span>
          <i className="dot closed" aria-hidden="true" />
          Unavailable
        </span>
      </div>

      {selectedDate && (
        <div className="alert success" aria-live="polite">
          <strong>Selected appointment date</strong>
          <p>
            {dateLabel(selectedDate, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      )}

      <div className="unavailable-list">
        <h3>Why are some dates unavailable?</h3>
        <ul>
          {days
            .filter((day) => !day.available)
            .map((day) => (
              <li key={day.date}>
                <strong>
                  {dateLabel(day.date, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  :
                </strong>{" "}
                {day.reason}
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
}
