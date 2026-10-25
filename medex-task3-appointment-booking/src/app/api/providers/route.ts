import { NextResponse } from "next/server";
import { getData } from "@/lib/mock-api";
export async function GET() {
  try { const data = await getData(); return NextResponse.json(data.providers); }
  catch { return NextResponse.json({ message: "Unable to load providers." }, { status: 500 }); }
}
