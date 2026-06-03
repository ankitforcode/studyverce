import { NextResponse } from "next/server";
import { rateLimitOrNull } from "@/lib/rate-limit/route-guard";

/** Phase 2 stub — Stripe webhook endpoint */
export async function POST(request: Request) {
  const limited = await rateLimitOrNull(request);
  if (limited) return limited;
  return NextResponse.json(
    { error: "Stripe billing is not enabled yet. Coming in Phase 2." },
    { status: 501 }
  );
}
