
"use client";

import { useEffect, useState } from "react";

type TimezoneClocksProps = {
  providerName: string;
  providerTimeZone: string;
};

function formatClock(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return "Time unavailable";
  }
}

function formatDate(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en", {
      timeZone,
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return "";
  }
}

export default function TimezoneClocks({
  providerName,
  providerTimeZone,
}: TimezoneClocksProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [customerTimeZone, setCustomerTimeZone] = useState("UTC");

  useEffect(() => {
    setNow(new Date());
    setCustomerTimeZone(
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    );

    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  if (!now) {
    return (
      <section aria-label="Local times" aria-busy="true">
        <p>Loading local times…</p>
      </section>
    );
  }

  return (
    <section aria-label="Appointment timezones">
      <h2>Local times</h2>

      <div className="timezone-clocks">
        <article className="timezone-clock">
          <h3>{providerName}</h3>
          <p>Provider local time</p>
          <p className="timezone-clock__time">
            <time>{formatClock(now, providerTimeZone)}</time>
          </p>
          <p>{formatDate(now, providerTimeZone)}</p>
          <small>{providerTimeZone}</small>
        </article>

        <article className="timezone-clock">
          <h3>Your location</h3>
          <p>Customer local time</p>
          <p className="timezone-clock__time">
            <time>{formatClock(now, customerTimeZone)}</time>
          </p>
          <p>{formatDate(now, customerTimeZone)}</p>
          <small>{customerTimeZone}</small>
        </article>
      </div>
    </section>
  );
}
