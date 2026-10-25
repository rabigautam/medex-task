
import { NextResponse } from "next/server";
import { getData } from "@/lib/mock-api";

export async function GET() {
  try {
    const data = await getData();

    return NextResponse.json({
      closures: data.closures ?? [],
      bookedSlots: data.bookedSlots ?? [],
      existingBooking: data.existingBooking ?? null,
    });
  } catch {
    return NextResponse.json(
      { message: "Unable to load booking context." },
      { status: 500 },
    );
  }
}
