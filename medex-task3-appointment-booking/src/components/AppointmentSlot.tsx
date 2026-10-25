"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { AppointmentSlot, BookableHours } from "@/lib/slot";
import { formatSlotTime, groupSlotsByPeriod } from "@/lib/slot";

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

type PeriodKey = (typeof PERIODS)[number]["key"];

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

  const availableSlots = useMemo(
    () => slots.filter((slot) => !isUnavailable(slot)),
    [slots],
  );

  const availableCount = availableSlots.length;

  const firstAvailableStartTime = availableSlots[0]?.startTime ?? null;

  const [focusedStartTime, setFocusedStartTime] = useState<string | null>(
    selectedStartTime ?? firstAvailableStartTime,
  );

  const [announcement, setAnnouncement] = useState("");

  const slotRefs = useRef(new Map<string, HTMLButtonElement>());

  // Keep the roving tab stop valid if the selected date or availability changes.
  useEffect(() => {
    const focusedStillAvailable = availableSlots.some(
      (slot) => slot.startTime === focusedStartTime,
    );

    const selectedStillAvailable = availableSlots.some(
      (slot) => slot.startTime === selectedStartTime,
    );

    if (!focusedStillAvailable) {
      setFocusedStartTime(
        selectedStillAvailable
          ? selectedStartTime
          : firstAvailableStartTime,
      );
    }
  }, [
    availableSlots,
    focusedStartTime,
    selectedStartTime,
    firstAvailableStartTime,
  ]);

  const tabStopStartTime =
    availableSlots.find((slot) => slot.startTime === focusedStartTime)
      ?.startTime ??
    availableSlots.find((slot) => slot.startTime === selectedStartTime)
      ?.startTime ??
    firstAvailableStartTime;

  const hasHoursInfo = Boolean(specialistHours && providerHours);
  const hasNoOverlap = hasHoursInfo && !bookableHours;

  const isRestricted =
    hasHoursInfo &&
    Boolean(bookableHours) &&
    (bookableHours!.startTime !== specialistHours!.startTime ||
      bookableHours!.endTime !== specialistHours!.endTime);

  function focusSlot(slot: AppointmentSlot | undefined) {
    if (!slot || isUnavailable(slot)) return;

    setFocusedStartTime(slot.startTime);
    setAnnouncement(
      `${formatSlotTime(slot.startTime)} selected as the focused appointment time.`,
    );

    // Focus after React has had a chance to update the roving tab index.
    requestAnimationFrame(() => {
      slotRefs.current.get(slot.startTime)?.focus();
    });
  }

  function handleSlotKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    slot: AppointmentSlot,
    periodKey: PeriodKey,
  ) {
    const currentPeriodIndex = PERIODS.findIndex(
      (period) => period.key === periodKey,
    );

    const currentPeriodSlots = grouped[periodKey].filter(
      (item) => !isUnavailable(item),
    );

    const currentIndex = currentPeriodSlots.findIndex(
      (item) => item.startTime === slot.startTime,
    );

    let target: AppointmentSlot | undefined;

    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        target = availableSlots[
          Math.max(0, availableSlots.findIndex(
            (item) => item.startTime === slot.startTime,
          ) - 1)
        ];
        break;

      case "ArrowRight": {
        event.preventDefault();
        const index = availableSlots.findIndex(
          (item) => item.startTime === slot.startTime,
        );
        target = availableSlots[Math.min(index + 1, availableSlots.length - 1)];
        break;
      }

      case "ArrowUp":
      case "ArrowDown": {
        event.preventDefault();

        const direction = event.key === "ArrowUp" ? -1 : 1;
        const targetPeriod = PERIODS[currentPeriodIndex + direction];

        if (targetPeriod) {
          const targetPeriodSlots = grouped[targetPeriod.key].filter(
            (item) => !isUnavailable(item),
          );

          if (targetPeriodSlots.length > 0) {
            // Keep a similar position in the adjacent time period.
            const targetIndex = Math.min(
              Math.max(currentIndex, 0),
              targetPeriodSlots.length - 1,
            );
            target = targetPeriodSlots[targetIndex];
          }
        }
        break;
      }

      case "Home":
        event.preventDefault();
        target = availableSlots[0];
        break;

      case "End":
        event.preventDefault();
        target = availableSlots[availableSlots.length - 1];
        break;

      default:
        return;
    }

    focusSlot(target);
  }

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

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

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
              <div
                className="slots-grid"
                role="group"
                aria-label={`${period.title} appointment times`}
              >
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
                      ref={(element) => {
                        if (element) {
                          slotRefs.current.set(slot.startTime, element);
                        } else {
                          slotRefs.current.delete(slot.startTime);
                        }
                      }}
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
                      tabIndex={
                        !unavailable && slot.startTime === tabStopStartTime
                          ? 0
                          : -1
                      }
                      aria-pressed={selected}
                      aria-label={`${formatSlotTime(slot.startTime)}, ${status}`}
                      title={
                        slot.isBooked
                          ? "This appointment time is already booked"
                          : slot.isPast
                            ? "This appointment time has already passed"
                            : `${formatSlotTime(slot.startTime)} – ${formatSlotTime(slot.endTime)}`
                      }
                      onFocus={() => setFocusedStartTime(slot.startTime)}
                      onKeyDown={(event) =>
                        handleSlotKeyDown(event, slot, period.key)
                      }
                      onClick={() => {
                        setFocusedStartTime(slot.startTime);
                        setAnnouncement(
                          `${formatSlotTime(slot.startTime)} appointment time selected.`,
                        );
                        onSelectSlot(slot);
                      }}
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