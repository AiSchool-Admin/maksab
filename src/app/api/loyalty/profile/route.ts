/**
 * GET /api/loyalty/profile?userId=xxx
 * Returns the user's loyalty profile with level, points, and recent activity.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserLoyaltyProfile } from "@/lib/loyalty/loyalty-service";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId مطلوب" }, { status: 400 });
    }

    const profile = getUserLoyaltyProfile(userId);
    return NextResponse.json(profile);
  } catch {
    return NextResponse.json({ error: "حصلت مشكلة" }, { status: 500 });
  }
}
