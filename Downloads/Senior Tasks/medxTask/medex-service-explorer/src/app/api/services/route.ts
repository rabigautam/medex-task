import { NextResponse } from "next/server";
import { getDataset } from "@/lib/data";
export async function GET() {
  if (process.env.MEDEX_MOCK_API_FAIL === "1") return NextResponse.json({ error: "Mock service API failure" }, { status: 503 });
  await new Promise((resolve) => setTimeout(resolve, Number(process.env.MEDEX_MOCK_API_DELAY ?? 350)));
  return NextResponse.json(getDataset().services);
}