import { NextResponse } from "next/server";

/** Phase 2 stub — Stripe webhook endpoint */
export async function POST() {
  return NextResponse.json(
    { error: "Stripe billing is not enabled yet. Coming in Phase 2." },
    { status: 501 }
  );
}
