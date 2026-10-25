
"use client";

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      className={`skeleton-block ${className}`}
      aria-hidden="true"
    />
  );
}

export function CalendarSkeleton() {
  return (
    <section
      className="calendar-skeleton"
      aria-label="Loading appointment calendar"
      aria-busy="true"
      role="status"
    >
      <span className="sr-only">Loading appointment calendar…</span>

      <div className="skeleton-heading">
        <div className="skeleton-heading-copy">
          <Skeleton className="skeleton-title" />
          <Skeleton className="skeleton-subtitle" />
        </div>
        <Skeleton className="skeleton-pill" />
      </div>

      <div className="skeleton-month">
        <div className="skeleton-month-heading">
          <Skeleton className="skeleton-month-title" />
          <Skeleton className="skeleton-pill" />
        </div>

        <div className="skeleton-weekdays">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="skeleton-weekday" />
          ))}
        </div>

        <div className="skeleton-calendar-grid">
          {Array.from({ length: 35 }, (_, i) => (
            <Skeleton key={i} className="skeleton-day" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function SlotGridSkeleton() {
  return (
    <section
      className="slot-skeleton"
      aria-label="Loading appointment times"
      aria-busy="true"
      role="status"
    >
      <span className="sr-only">Loading appointment times…</span>

      <div className="skeleton-heading">
        <div className="skeleton-heading-copy">
          <Skeleton className="skeleton-title" />
          <Skeleton className="skeleton-subtitle" />
        </div>
        <Skeleton className="skeleton-pill" />
      </div>

      {["Morning", "Afternoon", "Evening"].map((period) => (
        <div className="skeleton-slot-period" key={period}>
          <div className="skeleton-period-heading">
            <Skeleton className="skeleton-period-icon" />
            <div className="skeleton-period-copy">
              <Skeleton className="skeleton-period-title" />
              <Skeleton className="skeleton-subtitle" />
            </div>
          </div>

          <div className="skeleton-slots-grid">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="skeleton-slot" />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export function TimezoneClocksSkeleton() {
  return (
    <section
      className="timezone-loading"
      aria-label="Loading local times"
      aria-busy="true"
      role="status"
    >
      <span className="sr-only">Loading local times…</span>

      {[0, 1].map((item) => (
        <article className="timezone-clock" key={item}>
          <Skeleton className="clock-skeleton-title" />
          <Skeleton className="clock-skeleton-subtitle" />
          <Skeleton className="clock-skeleton-time" />
          <Skeleton className="clock-skeleton-date" />
          <Skeleton className="clock-skeleton-zone" />
        </article>
      ))}
    </section>
  );
}
