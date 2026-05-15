import { NextResponse } from "next/server";
import { findActivePickupCode } from "@/lib/pickup-codes";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const pickupCode = await findActivePickupCode(code.toUpperCase());

  if (!pickupCode) {
    return NextResponse.json(
      { error: "Pickup code does not exist or has expired" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    code: pickupCode.code,
    expiresAt: pickupCode.expiresAt,
    tasks: pickupCode.tasks
  });
}
