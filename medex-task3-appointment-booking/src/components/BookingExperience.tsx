"use client";

import { useEffect, useMemo, useState } from "react";
import AppointmentCalendar from "./AppointmentCalender";
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
        setClosures(data.closures);
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

  const provider = providers.find((item) => item.id === selectedProviderId);

  const calendarDays = useMemo(() => {
    if (!provider) return [];
    return getNext90Days(provider, closures);
  }, [provider, closures]);

  if (loading) {
    return <p role="status">Loading appointment calendar…</p>;
  }

  if (error) {
    return (
      <div>
        <p role="alert">{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!provider) {
    return <p>Please select a provider.</p>;
  }

  return (
    <section>
      <label htmlFor="provider-select">Choose a provider</label>
      <select
        id="provider-select"
        value={selectedProviderId ?? ""}
        onChange={(event) => {
          setSelectedProviderId(Number(event.target.value));
          setSelectedDate(null);
        }}
      >
        {providers.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>

      <AppointmentCalendar
        provider={provider}
        days={calendarDays}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />
    </section>
  );
}