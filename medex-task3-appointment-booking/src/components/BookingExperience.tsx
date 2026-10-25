
"use client";

import { useEffect, useMemo, useState } from "react";
import AppointmentCalendar from "./AppointmentCalender";
import TimezoneClocks from "./TimezoneClocks";
import { getNext90Days } from "@/lib/calender";
import type { Provider, ProviderClosure } from "@/lib/types";

type BookingContext = {
  closures: ProviderClosure[];
  existingBooking: unknown;
};

type Props = {
  providers: Provider[];
};

export default function BookingExperience({ providers }: Props) {
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(
    providers[0]?.id ?? null,
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [closures, setClosures] = useState<ProviderClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError("Unable to load availability. Please try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadBookingContext();
    return () => controller.abort();
  }, []);

  const provider = providers.find(
    (item) => item.id === selectedProviderId,
  );

  const calendarDays = useMemo(() => {
    if (!provider) return [];
    return getNext90Days(provider, closures);
  }, [provider, closures]);

  function retry() {
    window.location.reload();
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brandmark" aria-hidden="true">✚</span>
          <span>MedEx</span>
        </div>
        <span className="secure">Secure appointment booking</span>
      </header>

      <section className="hero">
        <span className="eyebrow">Find the right care</span>
        <h1>Book your appointment</h1>
        <p>
          Choose a healthcare provider, find a suitable date, and continue
          to appointment availability.
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
                  onClick={() => {
                    setSelectedProviderId(item.id);
                    setSelectedDate(null);
                  }}
                >
                  <span className="provider-icon" aria-hidden="true">
                    {["✚", "✦", "＋", "✚", "✦", "＋"][index % 6]}
                  </span>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{selected ? "Selected provider" : "Healthcare provider"}</small>
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
            <div role="status" aria-live="polite">
              <p>Loading appointment availability…</p>
              <div className="skeleton" />
              <div className="skeleton" style={{ marginTop: 10 }} />
            </div>
          ) : error ? (
            <div className="alert error" role="alert">
              <p>{error}</p>
              <button type="button" className="secondary" onClick={retry}>
                Retry
              </button>
            </div>
          ) : provider ? (
            <AppointmentCalendar
              provider={provider}
              days={calendarDays}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          ) : (
            <div className="empty">
              <strong>No provider selected</strong>
              Choose a provider to view appointment dates.
            </div>
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
