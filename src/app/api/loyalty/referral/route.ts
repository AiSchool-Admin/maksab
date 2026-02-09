/**
 * POST /api/loyalty/referral
 * Apply a referral code for a new user.
 *
 * Body: { userId, referralCode }
 * Returns: { success, referrerName?, error? }
 */

import { NextRequest, NextResponse } from "next/server";
import { applyReferralCode } from "@/lib/loyalty/loyalty-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, referralCode } = body as {
      userId: string;
      referralCode: string;
    };

    if (!userId || !referralCode) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const result = await applyReferralCode(userId, referralCode);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "حصلت مشكلة" }, { status: 500 });
  }
}
