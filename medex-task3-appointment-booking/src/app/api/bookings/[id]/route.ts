import { NextResponse } from "next/server";
import {
  BookingConflictError,
  BookingNotFoundError,
  getBooking,
  updateBooking,
} from "@/lib/mock-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const booking = await getBooking(id);
  if (!booking) {
    return NextResponse.json({ message: "Booking not found." }, { status: 404 });
  }
  return NextResponse.json(booking);
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await request.json() as Record<string, unknown>;
    const startTimes = Array.isArray(body.startTimes)
      ? body.startTimes
      : typeof body.startTime === "string"
        ? [body.startTime]
        : [];

    if (
      !Number.isInteger(body.providerId) ||
      typeof body.specialistId !== "string" || !body.specialistId ||
      typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) ||
      startTimes.length < 1 || startTimes.length > 4 ||
      startTimes.some((time: unknown) => typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    ) {
      return NextResponse.json(
        { message: "Valid provider, specialist, date and one to four appointment times are required." },
        { status: 400 },
      );
    }

    const result = await updateBooking(id, {
      providerId: body.providerId as number,
      specialistId: body.specialistId as string,
      date: body.date as string,
      startTimes: startTimes as string[],
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Booking could not be updated.";
    if (error instanceof BookingConflictError) {
      return NextResponse.json({ message, code: "SLOT_CONFLICT" }, { status: 409 });
    }
    if (error instanceof BookingNotFoundError) {
      return NextResponse.json({ message }, { status: 404 });
    }
    const status = message.includes("consecutive") || message.includes("unique") || message.includes("one to four") || message.includes("Provide a valid") ? 400 : message.includes("Provider or specialist not found") ? 404 : 500;
    return NextResponse.json({ message }, { status });
  }
}
