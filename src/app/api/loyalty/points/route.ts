/**
 * POST /api/loyalty/points
 * Award points for an action.
 *
 * Body: { userId, action, referenceId? }
 * Returns: { success, pointsAwarded, newTotal, levelUp? }
 */

import { NextRequest, NextResponse } from "next/server";
import { awardPoints } from "@/lib/loyalty/loyalty-service";
import { POINT_ACTIONS, type PointAction } from "@/lib/loyalty/types";
import { verifySessionToken } from "@/lib/auth/session-token";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_token, action, referenceId } = body as {
      session_token?: string;
      action: string;
      referenceId?: string;
    };

    // Authentication (session_token required)
    if (!session_token) {
      return NextResponse.json({ error: "مطلوب تسجيل الدخول" }, { status: 401 });
    }
    const tokenResult = verifySessionToken(session_token);
    if (!tokenResult.valid) {
      return NextResponse.json({ error: tokenResult.error }, { status: 401 });
    }
    const userId = tokenResult.userId;

    if (!action) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    if (!POINT_ACTIONS[action as PointAction]) {
      return NextResponse.json({ error: "نوع العملية مش صحيح" }, { status: 400 });
    }

    const result = await awardPoints(userId, action as PointAction, referenceId);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "حصلت مشكلة" }, { status: 500 });
  }
}
