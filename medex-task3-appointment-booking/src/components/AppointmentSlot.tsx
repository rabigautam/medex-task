"use client";

import type { AppointmentSlot, BookableHours } from "@/lib/slot";
import {
  formatSlotTime,
  groupSlotsByPeriod,
} from "@/lib/slot";

type Props = {
  slots: AppointmentSlot[];
  selectedStartTime: string | null;
  onSelectSlot: (slot: AppointmentSlot) => void;
  specialistHours?: BookableHours | null;
  providerHours?: BookableHours | null;
  bookableHours?: BookableHours | null;
};

const PERIODS = [
  {
    key: "morning",
    title: "Morning",
    hours: "Before 12:00 PM",
    icon: "☀",
  },
  {
    key: "afternoon",
    title: "Afternoon",
    hours: "12:00 PM – 4:59 PM",
    icon: "🌤",
  },
  {
    key: "evening",
    title: "Evening",
    hours: "5:00 PM onward",
    icon: "🌙",
  },
] as const;

export default function AppointmentSlot({
  slots,
  selectedStartTime,
  onSelectSlot,
  specialistHours,
  providerHours,
  bookableHours,
}: Props) {
  const grouped = groupSlotsByPeriod(slots);

  const isUnavailable = (slot: AppointmentSlot) =>
    slot.isBooked || Boolean(slot.isPast);

  const availableCount = slots.filter(
    (slot) => !isUnavailable(slot),
  ).length;

  const hasHoursInfo = Boolean(specialistHours && providerHours);
  const hasNoOverlap = hasHoursInfo && !bookableHours;
  const isRestricted =
    hasHoursInfo &&
    Boolean(bookableHours) &&
    (bookableHours!.startTime !== specialistHours!.startTime ||
      bookableHours!.endTime !== specialistHours!.endTime);

  return (
    <section className="slot-periods" aria-label="Appointment times">
      {hasHoursInfo && (
        <div className="slot-hours-info" role="note">
          <h2>Specialist consultation hours</h2>
          <p>
            Advertised hours: {formatSlotTime(specialistHours!.startTime)} –{" "}
            {formatSlotTime(specialistHours!.endTime)}
          </p>
          {hasNoOverlap ? (
            <p>
              This specialist&apos;s consultation hours do not overlap with
              the provider&apos;s opening hours on this date, so no appointments
              can be booked.
            </p>
          ) : isRestricted ? (
            <p>
              Bookable hours: {formatSlotTime(bookableHours!.startTime)} –{" "}
              {formatSlotTime(bookableHours!.endTime)}. Some advertised hours
              fall outside the provider&apos;s opening hours and are therefore
              unavailable for booking.
            </p>
          ) : (
            <p>
              The specialist&apos;s consultation hours fit within the
              provider&apos;s opening hours.
            </p>
          )}
        </div>
      )}

      <div className="slot-periods-heading">
        <div>
          <h2>Available appointment times</h2>
          <p>Times are displayed in the provider&apos;s local timezone.</p>
        </div>

        <span className="pill">{availableCount} available</span>
      </div>

      {PERIODS.map((period) => {
        const periodSlots = grouped[period.key];

        const periodAvailableCount = periodSlots.filter(
          (slot) => !isUnavailable(slot),
        ).length;

        return (
          <section
            key={period.key}
            className="slot-section"
            aria-labelledby={`period-${period.key}`}
          >
            <div className="slot-period-heading">
              <div className="slot-period-icon" aria-hidden="true">
                {period.icon}
              </div>

              <div>
                <h3 id={`period-${period.key}`}>{period.title}</h3>
                <p>{period.hours}</p>
              </div>

              <span className="slot-period-count">
                {periodAvailableCount} available
              </span>
            </div>

            {periodSlots.length === 0 ? (
              <div className="empty slot-empty">
                No appointment times in this period.
              </div>
            ) : (
              <div className="slots-grid">
                {periodSlots.map((slot) => {
                  const selected = slot.startTime === selectedStartTime;
                  const unavailable = isUnavailable(slot);

                  const status = slot.isBooked
                    ? "booked and unavailable"
                    : slot.isPast
                      ? "appointment time has passed"
                      : selected
                        ? "selected"
                        : "available";

                  return (
                    <button
                      key={`${slot.startTime}-${slot.endTime}`}
                      type="button"
                      className={[
                        "slot",
                        selected ? "selected" : "",
                        slot.isBooked ? "booked" : "",
                        slot.isPast ? "past" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      disabled={unavailable}
                      aria-pressed={selected}
                      aria-label={`${formatSlotTime(slot.startTime)}, ${status}`}
                      title={
                        slot.isBooked
                          ? "This appointment time is already booked"
                          : slot.isPast
                            ? "This appointment time has already passed"
                            : `${formatSlotTime(slot.startTime)} – ${formatSlotTime(slot.endTime)}`
                      }
                      onClick={() => onSelectSlot(slot)}
                    >
                      <strong>{formatSlotTime(slot.startTime)}</strong>
                      <small>
                        {slot.isBooked
                          ? "Booked"
                          : slot.isPast
                            ? "Time passed"
                            : `Until ${formatSlotTime(slot.endTime)}`}
                      </small>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {slots.length === 0 && (
        <div className="empty" role="status">
          No appointment times are available for this date. Please choose
          another date.
        </div>
      )}

      {slots.length > 0 && availableCount === 0 && (
        <div className="empty" role="status">
          No appointment times are currently available. Past and booked
          times cannot be selected. Please choose another date.
        </div>
      )}
    </section>
  );
}