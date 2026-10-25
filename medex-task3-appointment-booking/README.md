# MedEx — Task 3: Appointment Booking Across Time Zones

A standalone Next.js + TypeScript implementation for the appointment booking take-home. This project is separate from Tasks 1 and 2.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm test
npm run build
```
## Implementation status

| # | Requirement | Status | Notes |
|---|---|---|---|
| 1 | Calendar for the next 90 days | Implemented | Past dates, provider closure days, and dates without free slots are shown as unavailable with reasons where available. |
| 2 | Provider and customer clocks | Implemented | Displays provider-local time alongside the customer's local time, with timezone labels to distinguish them. |
| 3 | Appointment slots | Implemented | Shows appointment options for the selected date. |
| 4 | Group slots by time of day | Implemented | Slots are grouped into morning, afternoon, and evening sections. |
| 5 | Booked slots visible but not selectable | Implemented | Booked slots remain visible and disabled. |
| 6 | Disable slots that have already started | Implemented | Today's past/started slots are unavailable using provider-local time. |
| 7 | Specialist hours and provider opening hours | Implemented | Bookable hours are restricted to the overlap; the UI explains when specialist hours extend beyond provider hours. |
| 8 | Group booking for up to four people using consecutive free slots | **Not implemented** | Deferred due to time constraints. |
| 9 | Handle a slot being taken during confirmation (`409 Conflict`) | **Not implemented** | Preserve the current form and offer alternatives after a conflict is not completed. |
| 10 | Reschedule an existing booking | **Not implemented** | The rescheduling experience and confirmation of old-versus-new slot are deferred. |
| 11 | Booking and availability states | Implemented | Supports the implemented loading, error, and availability states. |
| 12 | Skeleton loading states | Implemented | Uses skeletons for calendar and appointment-slot loading rather than spinners. |
| 13 | No-availability explanations and next-step guidance | **Not implemented** | Dedicated explanations and next-available-date/specialist guidance are deferred. |
| 14 | Retry API failures without losing selections | Implemented | Retry keeps the customer's current selections. |
| 15 | Slow network and offline handling | Implemented | Shows loading/offline feedback and prevents confirmation when the booking outcome is unknown. |
| 16 | Keyboard and screen-reader accessibility | Implemented | Calendar, provider selection, and slot selection include keyboard navigation and accessible labels/status announcements. |
| 17 | Unit tests for timezone and slot logic | Implemented | Unit tests cover timezone and slot calculations, including edge cases. |


## Known limitations

Requirements **8, 9, 10, and 13** remain outstanding because of the time constraint. 