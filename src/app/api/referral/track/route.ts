import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/referral/track
 *
 * Track referral events (click, signup, first_ad, first_sale).
 * Body: { code: string, event_type: string, referred_user_id?: string, metadata?: object }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, event_type, referred_user_id, metadata } = body;

    if (!code || !event_type) {
      return NextResponse.json(
        { error: "code و event_type مطلوبين" },
        { status: 400 },
      );
    }

    const validTypes = ["click", "signup", "first_ad", "first_sale"];
    if (!validTypes.includes(event_type)) {
      return NextResponse.json(
        { error: "نوع الحدث غير صالح" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    // Verify the referral code exists
    const { data: codeRow } = await supabase
      .from("referral_codes" as never)
      .select("user_id")
      .eq("code" as never, code as never)
      .maybeSingle();

    if (!codeRow) {
      return NextResponse.json(
        { error: "كود الإحالة غير موجود" },
        { status: 404 },
      );
    }

    // Insert the event
    await supabase.from("referral_events" as never).insert({
      referral_code: code,
      event_type,
      referred_user_id: referred_user_id || null,
      metadata: metadata || {},
    } as never);

    // Award points to referrer for non-click events
    const pointsMap: Record<string, number> = {
      signup: 10,
      first_ad: 25,
      first_sale: 50,
    };

    const points = pointsMap[event_type];
    if (points) {
      const referrerId = (codeRow as Record<string, unknown>).user_id as string;
      await supabase.rpc("add_referral_points" as never, {
        p_user_id: referrerId,
        p_points: points,
        p_reason: `referral_${event_type}`,
      } as never);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "حصل مشكلة، جرب تاني" },
      { status: 500 },
    );
  }
}
