
"use client";

import type { AppointmentSlot } from "@/lib/slot";
import {
  formatSlotTime,
  groupSlotsByPeriod,
} from "@/lib/slot";

type Props = {
  slots: AppointmentSlot[];
  selectedStartTime: string | null;
  onSelectSlot: (slot: AppointmentSlot) => void;
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

export default function AppointmentSlotGroups({
  slots,
  selectedStartTime,
  onSelectSlot,
}: Props) {
  const grouped = groupSlotsByPeriod(slots);
  const availableCount = slots.filter((slot) => !slot.isBooked).length;

  return (
    <section className="slot-periods" aria-label="Appointment times">
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
          (slot) => !slot.isBooked,
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

                  return (
                    <button
                      key={`${slot.startTime}-${slot.endTime}`}
                      type="button"
                      className={[
                        "slot",
                        selected ? "selected" : "",
                        slot.isBooked ? "booked" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      disabled={slot.isBooked}
                      aria-pressed={selected}
                      title={
                        slot.isBooked
                          ? "This appointment time is already booked"
                          : `${formatSlotTime(slot.startTime)} – ${formatSlotTime(slot.endTime)}`
                      }
                      onClick={() => onSelectSlot(slot)}
                    >
                      <strong>{formatSlotTime(slot.startTime)}</strong>

                      <small>
                        {slot.isBooked
                          ? "Booked"
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
          All appointment times for this date are booked. Please choose
          another date.
        </div>
      )}
    </section>
  );
}
