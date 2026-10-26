"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Provider, Slot, SlotResponse } from "@/lib/types";
import { addDaysToDate, dateInZone, formatInZone, resolveTimeZone, weekdayInZone, localDateTimeToInstant } from "@/lib/timezone";

const CUSTOMER_ZONE = "Asia/Kathmandu";
const pad = (n: number) => String(n).padStart(2, "0");
const dateLabel = (date: string) => new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", timeZone: "UTC"
}).format(new Date(`${date}T12:00:00Z`));

export default function BookingExperience() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerId, setProviderId] = useState(48);
  const [specialistId, setSpecialistId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  // Runtime guard in case an API response or stale state is unexpectedly undefined.
  const availableSlots: Slot[] = Array.isArray(slots) ? slots : [];
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [groupSize, setGroupSize] = useState(1);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState("");
  const [monthOffset, setMonthOffset] = useState(0);
  const slotsRequestId = useRef(0);

  const loadProviders = useCallback(async (signal?: AbortSignal) => {
    setLoadingProviders(true);
    setError("");

    try {
      const response = await fetch("/api/providers", {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
      });
      const body: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof body === "object" && body !== null && "message" in body &&
          typeof body.message === "string"
            ? body.message
            : "Unable to load providers.";
        throw new Error(message);
      }

      if (!Array.isArray(body)) {
        throw new Error("The provider API returned an invalid response.");
      }

      const data = body as Provider[];
      setProviders(data);

      setProviderId(currentId => {
        const selectedProvider = data.find(item => item.id === currentId) ?? data[0];
        if (!selectedProvider) {
          setSpecialistId("");
          return 0;
        }

        setSpecialistId(currentSpecialistId =>
          selectedProvider.specialists.some(item => item.id === currentSpecialistId)
            ? currentSpecialistId
            : selectedProvider.specialists[0]?.id ?? "",
        );

        return selectedProvider.id;
      });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Unable to load providers.");
    } finally {
      if (!signal?.aborted) setLoadingProviders(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadProviders(controller.signal);
    return () => controller.abort();
  }, [loadProviders]);

  const provider = providers.find(p => p.id === providerId);
  const specialist = provider?.specialists.find(s => s.id === specialistId);
  const providerZone = provider ? resolveTimeZone(provider.timezone, provider.country) : "Asia/Bangkok";
  const now = new Date();
  const providerToday = dateInZone(now, providerZone);
  const customerToday = dateInZone(now, CUSTOMER_ZONE);
  const maxDate = addDaysToDate(providerToday, 89);

  useEffect(() => {
    if (!provider) return;
    const next = provider.specialists.some(s => s.id === specialistId)
      ? specialistId : provider.specialists[0]?.id ?? "";
    setSpecialistId(next);
    setSelectedDate(providerToday);
    setSelectedTimes([]);
    setSlots([]);
    setMonthOffset(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId, provider?.id]);

  const fetchSlots = useCallback(async (date: string, pId = providerId, sId = specialistId) => {
    const requestId = ++slotsRequestId.current;

    if (!sId || !date || !pId) {
      setSlots([]);
      setSelectedTimes([]);
      setLoadingSlots(false);
      return;
    }

    setLoadingSlots(true);
    setError("");
    setSelectedTimes([]);
    setSlots([]);

    try {
      const params = new URLSearchParams({ date, specialistId: sId });
      const response = await fetch(`/api/providers/${pId}/slots?${params.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new Error("The slots API returned an invalid JSON response.");
      }

      if (!response.ok) {
        const message =
          typeof body === "object" && body !== null && "message" in body && typeof body.message === "string"
            ? body.message
            : typeof body === "object" && body !== null && "reason" in body && typeof body.reason === "string"
              ? body.reason
              : "Unable to load appointment times.";
        throw new Error(message);
      }

      // The slots-list endpoint should return { slots: Slot[], reason?: string }.
      if (typeof body !== "object" || body === null || !("slots" in body) || !Array.isArray(body.slots)) {
        throw new Error("The slots API returned an invalid response. Expected { slots: [...] }.");
      }

      const result = body as SlotResponse;
      const validSlots = result.slots.filter((slot): slot is Slot =>
        Boolean(slot) && typeof slot.startTime === "string" && typeof slot.endTime === "string" && typeof slot.isBooked === "boolean"
      );

      if (requestId !== slotsRequestId.current) return;
      setSlots(validSlots);
      if (result.reason && validSlots.length === 0) setError(result.reason);
    } catch (e) {
      if (requestId !== slotsRequestId.current) return;
      setError(e instanceof Error ? e.message : "Unable to load appointment times.");
      setSlots([]);
      setSelectedTimes([]);
    } finally {
      if (requestId === slotsRequestId.current) setLoadingSlots(false);
    }
  }, [providerId, specialistId]);

  useEffect(() => {
    if (provider && specialist && selectedDate) void fetchSlots(selectedDate);
  }, [provider?.id, specialist?.id, selectedDate, fetchSlots]);

  const monthDate = useMemo(() => {
    const date = new Date(`${providerToday}T12:00:00Z`);
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + monthOffset);
    return date;
  }, [providerToday, monthOffset]);

  const monthStart = `${monthDate.getUTCFullYear()}-${pad(monthDate.getUTCMonth() + 1)}-01`;
  const daysInMonth = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0)).getUTCDate();
  const firstWeekday = new Date(`${monthStart}T12:00:00Z`).getUTCDay();
  const calendarDays: Array<string | null> = Array.from(
    { length: firstWeekday + daysInMonth },
    (_, index) =>
      index < firstWeekday
        ? null
        : `${monthDate.getUTCFullYear()}-${pad(monthDate.getUTCMonth() + 1)}-${pad(index - firstWeekday + 1)}`
  );

  const dayStatus = (date: string) => {
    if (date < providerToday) return { unavailable: true, label: "Past date" };
    if (date > maxDate) return { unavailable: true, label: "Outside the 90-day window" };
    if (!provider) return { unavailable: true, label: "Provider loading" };

    const dateObj = new Date(`${date}T12:00:00Z`);
    const dayOfWeek = dateObj.getUTCDay(); // 0 = Sunday, 6 = Saturday

    // Optional: If you want to force Saturdays (6) and Sundays (0) to always show as Closed:
    if (dayOfWeek === 6 || dayOfWeek === 0) {
      return { unavailable: true, label: "Weekend closed" };
    }

    if (provider.daySchedules) {
      const weekday = weekdayInZone(dateObj, providerZone);
      const schedule = 
        provider.daySchedules[weekday] ?? 
        provider.daySchedules[String(weekday)] ??
        provider.daySchedules[String(weekday).toLowerCase()];

      if ( schedule === null) {
        return { unavailable: true, label: "Clinic closed" };
      }
    }

    return { unavailable: false, label: "Available clinic day" };
  };
  const grouped = useMemo(() => {
    // Keep rendering safe while the API is loading or returns unexpected data.
    const safeSlots = availableSlots.filter(slot => slot && typeof slot.startTime === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(slot.startTime));

    return {
      morning: safeSlots.filter(slot => Number(slot.startTime.slice(0, 2)) < 12),
      afternoon: safeSlots.filter(slot => {
        const hour = Number(slot.startTime.slice(0, 2));
        return hour >= 12 && hour < 17;
      }),
      evening: safeSlots.filter(slot => Number(slot.startTime.slice(0, 2)) >= 17),
    };
  }, [availableSlots]);

  async function confirmBooking() {
    if (!provider || !specialist || !selectedDate || selectedTimes.length === 0) return;
    setError("");
    setConfirmed("");
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, specialistId, date: selectedDate, startTimes: selectedTimes })
      });
      const body = await response.json();
      if (response.status === 409) {
        setSelectedTimes([]);
        await fetchSlots(selectedDate);
        setError("A selected slot was just booked by someone else. Availability has been refreshed; please choose another time.");
        return;
      }
      if (!response.ok) throw new Error(body.message ?? "Booking could not be confirmed.");
      setConfirmed(`Booking confirmed: ${body.bookingId} · ${body.numberOfPeople} slot${body.numberOfPeople === 1 ? "" : "s"} reserved`);
      setSelectedTimes([]);
      await fetchSlots(selectedDate);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking could not be confirmed.");
    }
  }

  // A start time is selectable only when the full requested group is free
  // and every slot is exactly one consultation+buffer step after the previous.
  const canStartGroupAt = (startTime: string) => {
    if (!specialist) return false;
    const index = availableSlots.findIndex(slot => slot.startTime === startTime);
    if (index < 0) return false;

    const chosen = availableSlots.slice(index, index + groupSize);
    if (chosen.length !== groupSize || chosen.some(slot => slot.isBooked)) return false;

    const step = specialist.consultation.durationInMinutes + specialist.consultation.bufferInMinutes;
    return chosen.every((slot, position) => {
      if (position === 0) return true;
      const previous = chosen[position - 1];
      const previousMinutes = Number(previous.startTime.slice(0, 2)) * 60 + Number(previous.startTime.slice(3, 5));
      const currentMinutes = Number(slot.startTime.slice(0, 2)) * 60 + Number(slot.startTime.slice(3, 5));
      return currentMinutes - previousMinutes === step;
    });
  };

  function renderSlotGroup(title: string, groupSlots: Slot[]) {
    if (!groupSlots.length) return null;
    return <section className="slot-section" key={title}>
      <h3>{title}</h3>
      <div className="slots-grid">
        {groupSlots.map(slot => {
          const instant = localDateTimeToInstant(selectedDate, slot.startTime, providerZone);
          const customerLabel = formatInZone(instant, CUSTOMER_ZONE);
          return <button
            key={slot.startTime}
            type="button"
            className={`slot ${slot.isBooked ? "booked" : ""} ${!slot.isBooked && !canStartGroupAt(slot.startTime) ? "unavailable" : ""} ${selectedTimes.includes(slot.startTime) ? "selected" : ""}`}
            disabled={slot.isBooked || loadingSlots || !canStartGroupAt(slot.startTime)}
            aria-pressed={selectedTimes.includes(slot.startTime)}
            aria-label={`${slot.startTime}, ${slot.isBooked ? "booked" : canStartGroupAt(slot.startTime) ? `available for ${groupSize} ${groupSize === 1 ? "person" : "people"}` : `not enough consecutive slots for ${groupSize} ${groupSize === 1 ? "person" : "people"}`}`}
            title={slot.isBooked ? "Already booked" : !canStartGroupAt(slot.startTime) ? `Unavailable as a start time for a group of ${groupSize}` : `Book ${groupSize} consecutive slot${groupSize === 1 ? "" : "s"} starting here`}
            onClick={() => {
              const index = availableSlots.findIndex(item => item.startTime === slot.startTime);
              const chosen = availableSlots.slice(index, index + groupSize);
              setError("");
              setSelectedTimes(chosen.map(item => item.startTime));
            }}
          >
            <strong>{slot.startTime}{slot.isBooked ? " · Booked" : !canStartGroupAt(slot.startTime) ? " · Unavailable for group" : ""}</strong>
            <small>Your time: {customerLabel}</small>
          </button>;
        })}
      </div>
    </section>;
  }

  const maxMonth = new Date(`${maxDate}T12:00:00Z`);
  const canGoNext = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1)) <
    new Date(Date.UTC(maxMonth.getUTCFullYear(), maxMonth.getUTCMonth(), 1));

  return <main className="shell">
    <header className="topbar">
      <div className="brand">medex<span>.</span></div>
      <span className="secure">Secure appointment booking</span>
    </header>
    <section className="hero">
      <p className="eyebrow">CARE, WITHOUT BORDERS</p>
      <h1>Find a time that works<br />for both time zones.</h1>
      <p>Choose a specialist, compare clinic and Nepal time, and book an appointment.</p>
    </section>

    <div className="layout">
      <aside className="panel sidebar">
        <p className="section-label">01 · Choose a clinic</p>
        {loadingProviders ? (
          <p role="status" aria-live="polite">Loading clinics…</p>
        ) : error && providers.length === 0 ? (
          <div role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => void loadProviders()}>
              Retry loading clinics
            </button>
          </div>
        ) : providers.length === 0 ? (
          <p>No clinics are currently available.</p>
        ) : (
          <>
            {error && <div className="alert error" role="alert">{error}</div>}
            <div className="provider-list">
              {providers.map(item => <button
                type="button"
                key={item.id}
                className={`provider-option ${providerId === item.id ? "selected" : ""}`}
                aria-pressed={providerId === item.id}
                onClick={() => {
                  setProviderId(item.id);
                  setMonthOffset(0);
                  setSelectedTimes([]);
                  setError("");
                }}
              >
                <span className="provider-icon" aria-hidden="true">{item.country}</span>
                <span><strong>{item.name}</strong><small>{resolveTimeZone(item.timezone, item.country)}</small></span>
              </button>)}
            </div>
          </>
        )}

        <div className="field">
          <label htmlFor="specialist">02 · Select a specialist</label>
          <select id="specialist" value={specialistId} onChange={event => { setSpecialistId(event.target.value); setSelectedTimes([]); }} disabled={!provider || loadingProviders}>
            {provider?.specialists.map(item => <option key={item.id} value={item.id}>{item.name} — {item.speciality}</option>)}
          </select>
        </div>

        {provider && specialist && <div className="timezone-note">
          <strong>Appointment duration</strong><br />
          {specialist.consultation.durationInMinutes} min consultation + {specialist.consultation.bufferInMinutes} min buffer.
          <br /><br />Only times inside clinic and specialist hours are offered.
        </div>}
      </aside>

      <section className="panel mainpanel">
        <div className="panel-head">
          <div><h2>{provider?.name ?? "Choose a clinic"}</h2><p>{specialist ? `${specialist.name} · ${specialist.speciality}` : "Select a specialist to see availability."}</p></div>
          <span className="pill">Next 90 days</span>
        </div>

        {provider && <div className="clock-row">
          <div className="clock"><span>Clinic local time</span><strong>{formatInZone(now, providerZone)}</strong><small>{providerZone}</small></div>
          <div className="clock"><span>Your local time · Nepal</span><strong>{formatInZone(now, CUSTOMER_ZONE)}</strong><small>{customerToday} · {CUSTOMER_ZONE}</small></div>
        </div>}

        <div className="calendar-wrap multi-month-wrap">
          {[0, 1, 2].map(monthIndex => {
            // Compute start & days for each of the 3 months dynamically
            const mDate = new Date(`${providerToday}T12:00:00Z`);
            mDate.setUTCDate(1);
            mDate.setUTCMonth(mDate.getUTCMonth() + monthIndex);

            const mStart = `${mDate.getUTCFullYear()}-${pad(mDate.getUTCMonth() + 1)}-01`;
            const dInMonth = new Date(Date.UTC(mDate.getUTCFullYear(), mDate.getUTCMonth() + 1, 0)).getUTCDate();
            const fWeekday = new Date(`${mStart}T12:00:00Z`).getUTCDay();
            const cDays: Array<string | null> = Array.from(
              { length: fWeekday + dInMonth },
              (_, index) => index < fWeekday ? null : `${mDate.getUTCFullYear()}-${pad(mDate.getUTCMonth() + 1)}-${pad(index - fWeekday + 1)}`
            );

            return (
              <div className="month-block" key={monthIndex} style={{ marginBottom: "2rem" }}>
                <div className="calendar-header">
                  <h3>{new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(mDate)}</h3>
                </div>
                <div className="weekdays" aria-hidden="true">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <span key={day}>{day}</span>)}
                </div>
                <div className="days" role="group" aria-label={`Appointment calendar for ${mDate.getUTCMonth() + 1}`}>
                  {cDays.map((date, index) => date === null ? <span key={`blank-${index}`} /> : (
                    <button
                      type="button"
                      key={date}
                      className={`day ${date === selectedDate ? "selected" : ""} ${dayStatus(date).unavailable ? "closed" : ""}`}
                      disabled={dayStatus(date).unavailable}
                      onClick={() => { setSelectedDate(date); setSelectedTimes([]); }}
                      aria-pressed={date === selectedDate}
                      aria-label={`${dateLabel(date)}: ${dayStatus(date).label}`}
                      title={dayStatus(date).label}
                    >
                      <span>{Number(date.slice(-2))}</span>
                      <small>{dayStatus(date).unavailable ? "Closed" : "Available"}</small>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="legend">
            <span><i className="dot" />Available clinic day</span>
            <span><i className="dot closed" />Closed / unavailable</span>
          </div>
        </div>

        <section className="slot-section">
          <h3>Available appointment times</h3>
          <p>{selectedDate ? `${dateLabel(selectedDate)} · clinic time first, Nepal time second` : "Choose a date."}</p>
          <div className="field group-size-field">
            <label htmlFor="groupSize">Booking size</label>
            <select id="groupSize" value={groupSize} onChange={event => { setGroupSize(Number(event.target.value)); setSelectedTimes([]); setError(""); }}>
              <option value={1}>1 appointment (individual)</option>
              <option value={2}>2 consecutive appointments</option>
              <option value={3}>3 consecutive appointments</option>
              <option value={4}>4 consecutive appointments</option>
            </select>
          </div>
        </section>

        {error && <div className="alert error" role="alert">{error}</div>}
        {confirmed && <div className="alert success" role="status">{confirmed}</div>}

        {loadingSlots ? <p role="status">Loading appointment times…</p> :
          !selectedDate ? <p className="empty">Choose a date to see available times.</p> :
          availableSlots.length === 0 ? <p className="empty">No available times for this date. Try another date.</p> :
          <>{renderSlotGroup("Morning", grouped.morning)}{renderSlotGroup("Afternoon", grouped.afternoon)}{renderSlotGroup("Evening", grouped.evening)}</>}

        <div className="actions">
          <p>{selectedTimes.length ? `Selected: ${selectedDate} · ${selectedTimes.join(", ")} clinic time` : "Select a start time to continue."}</p>
          <button type="button" className="primary" disabled={!selectedTimes.length || loadingSlots || Boolean(error)} onClick={() => void confirmBooking()}>Confirm {selectedTimes.length || groupSize} booking{(selectedTimes.length || groupSize) === 1 ? "" : "s"}</button>
        </div>
        <p className="footer-note">Group bookings reserve up to four consecutive slots. Availability is checked again when the booking is submitted.</p>
      </section>
    </div>
  </main>;
}
