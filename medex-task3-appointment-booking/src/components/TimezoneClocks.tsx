"use client";

import { useEffect, useState } from "react";
import { TimezoneClocksSkeleton } from "./BookingSkeleton";

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
    return "Date unavailable";
  }
}

function getIsoTime(date: Date, timeZone: string): string | undefined {
  try {
    // Validate the timezone before exposing the timestamp.
    new Intl.DateTimeFormat("en", { timeZone }).format(date);
    return date.toISOString();
  } catch {
    return undefined;
  }
}

function ClockCard({
  title,
  description,
  date,
  timeZone,
}: {
  title: string;
  description: string;
  date: Date;
  timeZone: string;
}) {
  const clock = formatClock(date, timeZone);
  const isoTime = getIsoTime(date, timeZone);

  return (
    <article className="timezone-clock">
      <h3>{title}</h3>
      <p>{description}</p>

      <p className="timezone-clock__time" aria-live="off">
        {isoTime ? (
          <time dateTime={isoTime}>{clock}</time>
        ) : (
          <span>{clock}</span>
        )}
      </p>

      <p>{formatDate(date, timeZone)}</p>
      <small>Timezone: {timeZone}</small>
    </article>
  );
}

export default function TimezoneClocks({
  providerName,
  providerTimeZone,
}: TimezoneClocksProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [customerTimeZone, setCustomerTimeZone] = useState("UTC");

  useEffect(() => {
    setNow(new Date());

    const detectedTimeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone;

    setCustomerTimeZone(detectedTimeZone || "UTC");

    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  if (!now) {
    return <TimezoneClocksSkeleton />;
  }

  return (
    <section
      className="timezone-clocks-section"
      aria-labelledby="timezone-clocks-heading"
    >
      <h2 id="timezone-clocks-heading">Local times</h2>

      <div className="timezone-clocks">
        <ClockCard
          title={providerName}
          description="Provider local time"
          date={now}
          timeZone={providerTimeZone}
        />

        <ClockCard
          title="Your location"
          description="Customer local time"
          date={now}
          timeZone={customerTimeZone}
        />
      </div>
    </section>
  );
}