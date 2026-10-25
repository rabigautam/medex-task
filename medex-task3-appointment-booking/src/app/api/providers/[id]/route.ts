import { NextResponse } from "next/server";
import { getProvider } from "@/lib/mock-api";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const provider = await getProvider(Number(id));
    return provider ? NextResponse.json(provider) : NextResponse.json({ message: "Provider not found." }, { status: 404 });
  } catch { return NextResponse.json({ message: "Unable to load provider." }, { status: 500 }); }
}
