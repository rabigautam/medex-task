
"use client";

import type { CalendarDay, Provider } from "@/lib/types";
import { formatDateKey } from "@/lib/timezone";

type AppointmentCalendarProps = {
  provider: Provider;
  days: CalendarDay[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AppointmentCalendar({
  provider,
  days,
  selectedDate,
  onSelectDate,
}: AppointmentCalendarProps) {
  if (days.length === 0) {
    return <p>No calendar dates are available.</p>;
  }

  // Align the first date under its correct weekday column.
  const firstWeekday = days[0].weekday;
  const mondayFirstIndex = ([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ] as const).indexOf(firstWeekday);

  const cells: Array<CalendarDay | null> = [
    ...Array.from({ length: mondayFirstIndex }, () => null),
    ...days,
  ];

  return (
    <section
      aria-labelledby="appointment-calendar-heading"
      className="space-y-4"
    >
      <div>
        <h2
          id="appointment-calendar-heading"
          className="text-lg font-semibold"
        >
          Choose an appointment date
        </h2>

        <p className="mt-1 text-sm text-gray-600">
          Dates are shown in {provider.name}&apos;s local calendar.
          Select an available date to continue.
        </p>
      </div>

      <div className="grid grid-cols-7 gap-2" role="group" aria-label="Appointment dates">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="py-2 text-center text-xs font-semibold text-gray-500"
            aria-hidden="true"
          >
            {weekday}
          </div>
        ))}

        {cells.map((day, index) => {
          if (!day) {
            return (
              <div
                key={`padding-${index}`}
                aria-hidden="true"
                className="min-h-16"
              />
            );
          }

          const selected = day.date === selectedDate;
          const label = formatDateKey(day.date, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          const description = day.available
            ? `${label}, available`
            : `${label}, unavailable: ${day.reason}`;

          return (
            <button
              key={day.date}
              type="button"
              disabled={!day.available}
              aria-pressed={selected}
              aria-label={description}
              title={!day.available ? day.reason : label}
              onClick={() => onSelectDate(day.date)}
              className={[
                "min-h-16 rounded-lg border p-2 text-left transition",
                "focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-blue-600 focus-visible:ring-offset-2",
                selected
                  ? "border-blue-700 bg-blue-700 text-white"
                  : day.available
                    ? "border-gray-200 bg-white hover:border-blue-500 hover:bg-blue-50"
                    : "cursor-not-allowed border-gray-100 bg-gray-100 text-gray-400",
              ].join(" ")}
            >
              <span className="block text-sm font-semibold">
                {Number(day.date.slice(-2))}
              </span>

              <span className="mt-1 block text-xs">
                {day.available ? "Available" : "Unavailable"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-gray-300 bg-white" />
          Available
        </span>

        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-gray-200" />
          Unavailable
        </span>
      </div>

      {selectedDate && (
        <p aria-live="polite" className="text-sm text-gray-700">
          Selected date:{" "}
          <strong>
            {formatDateKey(selectedDate, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </strong>
        </p>
      )}

      <ul className="space-y-1 text-sm text-gray-600">
        {days
          .filter((day) => !day.available)
          .map((day) => (
            <li key={day.date}>
              <span className="font-medium">
                {formatDateKey(day.date)}:
              </span>{" "}
              {day.reason}
            </li>
          ))}
      </ul>
    </section>
  );
}
