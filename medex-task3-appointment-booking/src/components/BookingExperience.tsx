"use client";

import { useEffect, useMemo, useState } from "react";
import AppointmentCalendar from "./AppointmentCalender";
import TimezoneClocks from "./TimezoneClocks";
import AppointmentSlot from "./AppointmentSlot";
import { getNext90Days } from "@/lib/calender";
import {
    CalendarSkeleton,
    SlotGridSkeleton,
  } from "./BookingSkeleton";
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
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(
    providers[0]?.id ?? null,
  );

  const initialProvider = providers[0];

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

  useEffect(() => {
    const controller = new AbortController();

    async function loadBookingContext() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/booking-context", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to load booking availability.");
        }

        const data: BookingContext = await response.json();

        setClosures(data.closures ?? []);
        setBookedSlots(data.bookedSlots ?? []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;

        setError("Unable to load availability. Please try again.");
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

  function handleRetry() {
    setRetryCount((count) => count + 1);
  }

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
        <div className="empty">
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
                          Consultation:{" "}
                          {item.consultation.startTime} –{" "}
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
        loading ? (
            <SlotGridSkeleton />
        ) : error ? (
            <div className="alert error" role="alert">
            <p>{error}</p>
            <button
                type="button"
                className="secondary"
                onClick={handleRetry}
            >
                Retry
            </button>
            </div>
        ) : (
            <>
            {/* Place your existing selectedDay availability check,
                specialistAvailability section, AppointmentSlot,
                and selection summary here unchanged. */}
            </>
        )
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