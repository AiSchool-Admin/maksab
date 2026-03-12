/**
 * Outreach Stats API
 * GET — Today's outreach stats + funnel data
 */

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";

export async function GET() {
  const supabase = getServiceClient();

  try {
    const today = new Date().toISOString().split("T")[0];

    // Run all queries in parallel
    const [
      msgSentRes,
      msgReceivedRes,
      signupsRes,
      totalConvsRes,
      // Funnel data
      sellersDiscoveredRes,
      sellersWithPhoneRes,
      sellersContactedRes,
      convsWithResponseRes,
      convsSignedUpRes,
      convsActiveRes,
    ] = await Promise.all([
      // Messages sent today
      supabase
        .from("wa_messages")
        .select("id", { count: "exact", head: true })
        .eq("direction", "outbound")
        .gte("created_at", `${today}T00:00:00`),
      // Responses today
      supabase
        .from("wa_messages")
        .select("id", { count: "exact", head: true })
        .eq("direction", "inbound")
        .gte("created_at", `${today}T00:00:00`),
      // Signups today
      supabase
        .from("wa_conversations")
        .select("id", { count: "exact", head: true })
        .eq("stage", "signup")
        .gte("created_at", `${today}T00:00:00`),
      // Total conversations with responses (for rate calc)
      supabase
        .from("wa_conversations")
        .select("id", { count: "exact", head: true })
        .gt("messages_received", 0),
      // === Funnel ===
      // Discovered
      supabase
        .from("ahe_sellers")
        .select("id", { count: "exact", head: true }),
      // With phone
      supabase
        .from("ahe_sellers")
        .select("id", { count: "exact", head: true })
        .not("phone", "is", null),
      // Contacted
      supabase
        .from("wa_conversations")
        .select("id", { count: "exact", head: true }),
      // Responded
      supabase
        .from("wa_conversations")
        .select("id", { count: "exact", head: true })
        .gt("messages_received", 0),
      // Signed up
      supabase
        .from("wa_conversations")
        .select("id", { count: "exact", head: true })
        .in("stage", ["signup", "onboarding", "active_user"]),
      // Active
      supabase
        .from("wa_conversations")
        .select("id", { count: "exact", head: true })
        .eq("stage", "active_user"),
    ]);

    const messagesSent = msgSentRes.count || 0;
    const responses = msgReceivedRes.count || 0;
    const totalConvs = totalConvsRes.count || 0;
    const convsWithResponse = convsWithResponseRes.count || 0;

    const responseRate = totalConvs > 0
      ? Math.round((convsWithResponse / totalConvs) * 100)
      : 0;

    return NextResponse.json({
      today: {
        messages_sent: messagesSent,
        responses,
        signups: signupsRes.count || 0,
        response_rate: responseRate,
      },
      funnel: [
        { name: 'اكتشفوا', count: sellersDiscoveredRes.count || 0, color: '#6B7280' },
        { name: 'عندهم رقم', count: sellersWithPhoneRes.count || 0, color: '#3B82F6' },
        { name: 'تم التواصل', count: sellersContactedRes.count || 0, color: '#8B5CF6' },
        { name: 'ردّوا', count: convsWithResponseRes.count || 0, color: '#F59E0B' },
        { name: 'سجّلوا', count: convsSignedUpRes.count || 0, color: '#10B981' },
        { name: 'نشروا', count: convsActiveRes.count || 0, color: '#1B7A3D' },
      ],
    });
  } catch (err: any) {
    console.error("[Outreach Stats] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "خطأ في تحميل إحصائيات التواصل" },
      { status: 500 }
    );
  }
}
