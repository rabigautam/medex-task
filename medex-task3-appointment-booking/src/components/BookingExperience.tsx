
"use client";

import { useEffect, useMemo, useState } from "react";
import AppointmentCalendar from "./AppointmentCalender";
import TimezoneClocks from "./TimezoneClocks";
import AppointmentSlot from "./AppointmentSlot";
import { getNext90Days } from "@/lib/calender";
import { CalendarSkeleton, SlotGridSkeleton } from "./BookingSkeleton";
import {
  generateAppointmentSlots,
  getSpecialistAvailabilityForDate,
} from "@/lib/slot";
import type {
  BookedSlot,
  Provider,
  ProviderClosure,
} from "@/lib/types";

type BookingContext = {
  closures: ProviderClosure[];
  bookedSlots: BookedSlot[];
  existingBooking: unknown;
};

type Props = {
  providers: Provider[];
};

export default function BookingExperience({ providers }: Props) {
  const initialProvider = providers[0];

  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(
    initialProvider?.id ?? null,
  );

  const [selectedSpecialistId, setSelectedSpecialistId] = useState<
    string | null
  >(initialProvider?.specialists[0]?.id ?? null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(
    null,
  );

  const [closures, setClosures] = useState<ProviderClosure[]>([]);
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // Keep network status separate from the customer's booking selections.
  useEffect(() => {
    function updateNetworkStatus() {
      setIsOnline(navigator.onLine);
    }

    updateNetworkStatus();

    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);

    return () => {
      window.removeEventListener("online", updateNetworkStatus);
      window.removeEventListener("offline", updateNetworkStatus);
    };
  }, []);

  // Refresh availability without resetting provider, specialist, date, or time.
  useEffect(() => {
    const controller = new AbortController();

    async function loadBookingContext() {
      setLoading(true);
      setError(null);

      try {
        if (!navigator.onLine) {
          throw new Error("OFFLINE");
        }

        const response = await fetch("/api/booking-context", {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load appointment availability.");
        }

        const data: BookingContext = await response.json();

        if (!Array.isArray(data.closures) || !Array.isArray(data.bookedSlots)) {
          throw new Error("The availability response is invalid.");
        }

        setClosures(data.closures);
        setBookedSlots(data.bookedSlots);
      } catch (err) {
        if (controller.signal.aborted) return;

        if (err instanceof Error && err.message === "OFFLINE") {
          setError("You are offline. Reconnect to refresh availability.");
        } else {
          setError(
            "Unable to refresh availability. Your selections have been kept. Please try again.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadBookingContext();

    return () => controller.abort();
  }, [retryCount]);

  const provider = providers.find(
    (item) => item.id === selectedProviderId,
  );

  const specialist = provider?.specialists.find(
    (item) => item.id === selectedSpecialistId,
  );

  const calendarDays = useMemo(() => {
    if (!provider) return [];
    return getNext90Days(provider, closures);
  }, [provider, closures]);

  const selectedDay = calendarDays.find(
    (day) => day.date === selectedDate,
  );

  const specialistAvailability = useMemo(() => {
    if (!provider || !specialist || !selectedDate) return null;

    return getSpecialistAvailabilityForDate({
      provider,
      specialistId: specialist.id,
      date: selectedDate,
    });
  }, [provider, specialist, selectedDate]);

  const filteredSlots = useMemo(() => {
    if (
      !provider ||
      !specialist ||
      !selectedDate ||
      !selectedDay ||
      !selectedDay.available ||
      !specialistAvailability ||
      loading ||
      error
    ) {
      return [];
    }

    return generateAppointmentSlots({
      provider,
      specialistId: specialist.id,
      dayOffset: selectedDay.dayOffset,
      date: selectedDay.date,
      bookedSlots,
    });
  }, [
    provider,
    specialist,
    selectedDate,
    selectedDay,
    specialistAvailability,
    bookedSlots,
    loading,
    error,
  ]);

  function handleProviderSelect(providerId: number) {
    const nextProvider = providers.find((item) => item.id === providerId);

    setSelectedProviderId(providerId);
    setSelectedSpecialistId(nextProvider?.specialists[0]?.id ?? null);
    setSelectedDate(null);
    setSelectedStartTime(null);
  }

  function handleSpecialistSelect(specialistId: string) {
    setSelectedSpecialistId(specialistId);
    setSelectedStartTime(null);
  }

  function handleDateSelect(date: string | null) {
    setSelectedDate(date);
    setSelectedStartTime(null);
  }
  function handleSlotSelect(slot: import("@/lib/slot").AppointmentSlot) {
    if (!isOnline || loading || error) return;
    setSelectedStartTime(slot.startTime);
  }
  function handleRetry() {
    if (!navigator.onLine) {
      setIsOnline(false);
      setError("You are offline. Reconnect before retrying.");
      return;
    }

    setError(null);
    setRetryCount((count) => count + 1);
  }

  const selectedSlotIsAvailable = filteredSlots.some(
    (slot) =>
      slot.startTime === selectedStartTime &&
      !slot.isBooked,
  );

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brandmark" aria-hidden="true">
            ✚
          </span>
          <span>MedEx</span>
        </div>
        <span className="secure">Secure appointment booking</span>
      </header>

      <section className="hero">
        <span className="eyebrow">Find the right care</span>
        <h1>Book your appointment</h1>
        <p>
          Choose a healthcare provider and specialist, find a suitable date,
          and select an available appointment time.
        </p>
      </section>

      {!isOnline && (
        <div className="alert warning" role="alert">
          <strong>You are offline.</strong>
          <p>
            Your current selections are preserved, but availability may be
            outdated. Reconnect before continuing.
          </p>
          <button
            type="button"
            className="secondary"
            onClick={handleRetry}
            disabled={loading}
          >
            Retry availability
          </button>
        </div>
      )}

      <div className="layout">
        <aside className="panel sidebar">
          <h2 className="section-label">Choose a provider</h2>

          <div className="provider-list">
            {providers.map((item, index) => {
              const selected = item.id === selectedProviderId;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`provider-option${selected ? " selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => handleProviderSelect(item.id)}
                >
                  <span className="provider-icon" aria-hidden="true">
                    {["✚", "✦", "＋", "✚", "✦", "＋"][index % 6]}
                  </span>

                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {selected ? "Selected provider" : "Healthcare provider"}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>

          {provider && (
            <div className="timezone-note">
              <strong>Provider local time</strong>
              <p>
                Dates and appointment availability follow the local calendar
                of {provider.name}.
              </p>
              <small>{provider.timezone}</small>
            </div>
          )}
        </aside>

        <section className="panel mainpanel">
          <div className="panel-head">
            <div>
              <h2>Choose an appointment date</h2>
              <p>
                Dates are shown in {provider?.name ?? "your provider"}&apos;s
                local calendar. Select an available date to continue.
              </p>
            </div>
            <span className="pill">90-day availability</span>
          </div>

          {provider && (
            <TimezoneClocks
              providerName={provider.name}
              providerTimeZone={provider.timezone}
            />
          )}

          {loading ? (
            <CalendarSkeleton />
          ) : error ? (
            <div className="alert error" role="alert">
              <p>{error}</p>
              <button
                type="button"
                className="secondary"
                onClick={handleRetry}
                disabled={!isOnline || loading}
              >
                Retry
              </button>
            </div>
          ) : provider ? (
            <AppointmentCalendar
              provider={provider}
              days={calendarDays}
              selectedDate={selectedDate}
              onSelectDate={handleDateSelect}
            />
          ) : (
            <div className="empty" role="status">
              <strong>No provider selected</strong>
              <p>Choose a provider to view appointment dates.</p>
            </div>
          )}

          {provider && !loading && !error && (
            <section className="specialist-picker">
              <h2>Choose a specialist</h2>

              {provider.specialists.length === 0 ? (
                <div className="empty" role="status">
                  No specialists are currently available for this provider.
                </div>
              ) : (
                <div className="specialist-list">
                  {provider.specialists.map((item) => {
                    const selected = item.id === selectedSpecialistId;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`specialist-option${selected ? " selected" : ""}`}
                        aria-pressed={selected}
                        onClick={() => handleSpecialistSelect(item.id)}
                      >
                        <strong>{item.name}</strong>
                        <span>{item.speciality}</span>
                        <small>
                          Consultation: {item.consultation.startTime} –{" "}
                          {item.consultation.endTime}
                        </small>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {selectedDate && provider && (
            <section className="appointment-times" aria-labelledby="times-heading">
              <h2 id="times-heading">Available appointment times</h2>

              <p>
                Selected date: <strong>{selectedDate}</strong>
                {specialist ? ` · ${specialist.name}` : ""}
              </p>

              {loading ? (
                <SlotGridSkeleton />
              ) : error ? (
                <div className="alert error" role="alert">
                  <p>Appointment times could not be refreshed.</p>
                  <button
                    type="button"
                    className="secondary"
                    onClick={handleRetry}
                    disabled={!isOnline}
                  >
                    Retry
                  </button>
                </div>
              ) : !specialist ? (
                <div className="empty" role="status">
                  Choose a specialist to view available times.
                </div>
              ) : !selectedDay ? (
                <div className="empty" role="status">
                  This date is outside the current availability window.
                  Please select another date.
                </div>
              ) : !selectedDay.available ? (
                <div className="empty" role="status">
                  No appointments are available on this date. Please select
                  another date.
                </div>
              ) : !specialistAvailability ? (
                <div className="empty" role="status">
                  This specialist is not available on the selected date.
                  Please choose another date or specialist.
                </div>
              ) : filteredSlots.length === 0 ? (
                <div className="empty" role="status">
                  No appointment times are available for this date. Please
                  choose another date.
                </div>
              ) : (
                <AppointmentSlot
                  slots={filteredSlots}
                  selectedStartTime={selectedStartTime}
                  onSelectSlot={handleSlotSelect}
                />
              )}

              {selectedStartTime && selectedSlotIsAvailable && (
                <div className="selection-summary" aria-live="polite">
                  <h3>Your selection</h3>
                  <p>
                    <strong>Provider:</strong> {provider.name}
                  </p>
                  <p>
                    <strong>Specialist:</strong> {specialist?.name}
                  </p>
                  <p>
                    <strong>Date:</strong> {selectedDate}
                  </p>
                  <p>
                    <strong>Time:</strong> {selectedStartTime}
                  </p>
                  <p>
                    This is a selection only. Your appointment is not yet
                    confirmed.
                  </p>
                </div>
              )}

              {selectedStartTime && !selectedSlotIsAvailable && !loading && !error && (
                <div className="alert warning" role="status">
                  Your previously selected time is no longer available.
                  Please choose another appointment time.
                </div>
              )}
            </section>
          )}

          <p className="footer-note">
            Availability can change while you book. Your appointment is not
            confirmed until the booking process succeeds.
          </p>
        </section>
      </div>
    </main>
  );
}
