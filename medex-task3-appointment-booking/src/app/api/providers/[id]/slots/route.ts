import { NextResponse } from "next/server";
import { getData } from "@/lib/mock-api";
import { buildSlots } from "@/lib/slot";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const specialistId = searchParams.get("specialistId");
    if (!date || !specialistId) return NextResponse.json({ message: "date and specialistId are required." }, { status: 400 });
    const data = await getData();
    const provider = data.providers.find(p => p.id === Number(id));
    
    const specialist = provider?.specialists.find(s => s.id === specialistId);
    if (!provider || !specialist) return NextResponse.json({ message: "Provider or specialist not found." }, { status: 404 });
    const result = buildSlots({ provider, specialist, date, bookedSlots: data.bookedSlots, closures: data.closures });
    return NextResponse.json(result);
  } catch { return NextResponse.json({ message: "Unable to load availability." }, { status: 500 }); }
}
