import { NextResponse } from "next/server";
import { createPickupCode } from "@/lib/pickup-codes";

export async function POST() {
  const pickupCode = await createPickupCode();

  return NextResponse.json({
    code: pickupCode.code,
    expiresAt: pickupCode.expiresAt
  });
}
