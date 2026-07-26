import { NextRequest, NextResponse } from "next/server";
import { geocodeAddress } from "@/lib/pdok";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ error: "q is verplicht" }, { status: 400 });
  }

  const result = await geocodeAddress(q);
  if (!result) {
    return NextResponse.json({ error: "niet gevonden" }, { status: 404 });
  }

  return NextResponse.json(result);
}
