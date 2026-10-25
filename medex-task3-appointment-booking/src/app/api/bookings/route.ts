import { NextResponse } from "next/server";
import { BookingConflictError, createBooking } from "@/lib/mock-api";

function isValidPayload(body: Record<string, unknown>) {
  const startTimes = Array.isArray(body.startTimes)
    ? body.startTimes
    : typeof body.startTime === "string"
      ? [body.startTime]
      : [];

  return {
    valid:
      Number.isInteger(body.providerId) &&
      typeof body.specialistId === "string" && body.specialistId.length > 0 &&
      typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) &&
      startTimes.length >= 1 && startTimes.length <= 4 &&
      startTimes.every((time: unknown) => typeof time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(time)),
    startTimes: startTimes as string[],
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const payload = isValidPayload(body);
    if (!payload.valid) {
      return NextResponse.json(
        { message: "Valid provider, specialist, date and one to four appointment times are required." },
        { status: 400 },
      );
    }

    const result = await createBooking({
        providerId: body.providerId as number,
        specialistId: body.specialistId as string,
        date: body.date as string,
        startTimes: payload.startTimes,
        numberOfPeople: body.numberOfPeople as number || payload.startTimes.length,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Booking could not be confirmed.";
    if (error instanceof BookingConflictError) {
      return NextResponse.json({ message, code: "SLOT_CONFLICT" }, { status: 409 });
    }
    const status = message.includes("consecutive") || message.includes("unique") || message.includes("one to four") || message.includes("Provide a valid") ? 400 : message.includes("Provider or specialist not found") ? 404 : 500;
    return NextResponse.json({ message }, { status });
  }
}
