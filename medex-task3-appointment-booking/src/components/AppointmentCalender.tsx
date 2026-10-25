
"use client";

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

export default function AppointmentCalendar({
  provider,
  days,
  selectedDate,
  onSelectDate,
}: AppointmentCalendarProps) {
  if (days.length === 0) {
    return (
      <div className="empty">
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

                <span className="pill">
                  {availableCount} available
                </span>
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
                      type="button"
                      className={className}
                      disabled={!day.available}
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
                      onClick={() => onSelectDate(day.date)}
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
