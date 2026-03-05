/**
 * POST /api/loyalty/referral
 * Apply a referral code for a new user.
 *
 * Body: { userId, referralCode, session_token }
 * Returns: { success, referrerName?, error? }
 */

import { NextRequest, NextResponse } from "next/server";
import { applyReferralCode } from "@/lib/loyalty/loyalty-service";
import { verifySessionToken } from "@/lib/auth/session-token";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, referralCode, session_token } = body as {
      userId: string;
      referralCode: string;
      session_token?: string;
    };

    if (!referralCode) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    // Verify authentication via session token
    let verifiedUserId: string;
    if (session_token) {
      const tokenResult = verifySessionToken(session_token);
      if (!tokenResult.valid) {
        return NextResponse.json({ error: tokenResult.error }, { status: 401 });
      }
      verifiedUserId = tokenResult.userId;
    } else if (userId) {
      // Fallback for backward compatibility
      verifiedUserId = userId;
    } else {
      return NextResponse.json({ error: "لازم تسجل دخول الأول" }, { status: 401 });
    }

    const result = await applyReferralCode(verifiedUserId, referralCode);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "حصلت مشكلة" }, { status: 500 });
  }
}
