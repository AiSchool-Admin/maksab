/**
 * Nora Daily Report Worker
 * Generates and saves a daily summary report to ai_daily_reports.
 * Designed to run once daily (e.g., via Railway cron at 08:00 Egypt time).
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("[NORA] Missing Supabase env vars");
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function generateDailyReport() {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  console.log(`[NORA] Generating daily report for ${today}...`);

  // Gather metrics
  const metrics: Record<string, any> = {};

  // 1. New users today
  const { count: newUsers } = await sb
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .gte("created_at", today);
  metrics.new_users = newUsers || 0;

  // 2. New ads today
  const { count: newAds } = await sb
    .from("ads")
    .select("*", { count: "exact", head: true })
    .gte("created_at", today);
  metrics.new_ads = newAds || 0;

  // 3. Active auctions
  const { count: activeAuctions } = await sb
    .from("ads")
    .select("*", { count: "exact", head: true })
    .eq("sale_type", "auction")
    .eq("status", "active");
  metrics.active_auctions = activeAuctions || 0;

  // 4. CS conversations today
  const { count: csConversations } = await sb
    .from("cs_conversations")
    .select("*", { count: "exact", head: true })
    .gte("created_at", today);
  metrics.cs_conversations = csConversations || 0;

  // 5. Escalations pending
  const { count: pendingEscalations } = await sb
    .from("admin_alerts")
    .select("*", { count: "exact", head: true })
    .eq("type", "cs_escalation")
    .eq("resolved", false);
  metrics.pending_escalations = pendingEscalations || 0;

  // 6. Outreach sent today
  const { count: outreachSent } = await sb
    .from("ai_interactions")
    .select("*", { count: "exact", head: true })
    .eq("agent", "waleed")
    .gte("created_at", today);
  metrics.outreach_sent = outreachSent || 0;

  // 7. Moderation pending
  const { count: moderationPending } = await sb
    .from("listing_moderation")
    .select("*", { count: "exact", head: true })
    .eq("decision", "review")
    .is("human_decision", null);
  metrics.moderation_pending = moderationPending || 0;

  // 8. Sara interactions today
  const { count: saraToday } = await sb
    .from("ai_interactions")
    .select("*", { count: "exact", head: true })
    .eq("agent", "sara")
    .gte("created_at", today);
  metrics.sara_interactions = saraToday || 0;

  // Build report text
  const reportText = `📊 تقرير نورا اليومي — ${today}

🔢 الأرقام الرئيسية:
• مستخدمين جدد: ${metrics.new_users}
• إعلانات جديدة: ${metrics.new_ads}
• مزادات نشطة: ${metrics.active_auctions}

👩‍💼 سارة (خدمة العملاء):
• محادثات اليوم: ${metrics.cs_conversations}
• تفاعلات AI: ${metrics.sara_interactions}
• تصعيدات معلّقة: ${metrics.pending_escalations}

👨‍💼 وليد (المبيعات):
• رسائل أُرسلت: ${metrics.outreach_sent}

🛡️ مازن (المراجعة):
• إعلانات في الانتظار: ${metrics.moderation_pending}

${metrics.pending_escalations > 0 ? "⚠️ يوجد تصعيدات تحتاج تدخلك!" : "✅ لا توجد تصعيدات معلّقة"}
${metrics.moderation_pending > 5 ? "⚠️ قائمة المراجعة فيها أكتر من 5 إعلانات!" : ""}`;

  // Save to ai_daily_reports (upsert by date)
  const { error } = await sb
    .from("ai_daily_reports")
    .upsert(
      {
        date: today,
        report_text: reportText,
        raw_data: metrics,
        sent_to_admin: true,
      },
      { onConflict: "date" }
    );

  if (error) {
    console.error("[NORA] Failed to save report:", error.message);
  } else {
    console.log("[NORA] Report saved successfully for", today);
  }

  // Also create an admin alert for the report
  await sb.from("admin_alerts").insert({
    type: "nora_daily_report",
    priority: metrics.pending_escalations > 0 || metrics.moderation_pending > 5 ? "high" : "low",
    message: `تقرير نورا اليومي جاهز — ${metrics.new_users} مستخدم جديد، ${metrics.new_ads} إعلان`,
    resolved: false,
  });

  return { reportText, metrics };
}

// Main execution
(async () => {
  try {
    const result = await generateDailyReport();
    console.log("[NORA] Done!", result.metrics);
    process.exit(0);
  } catch (err: any) {
    console.error("[NORA] Fatal error:", err.message);
    process.exit(1);
  }
})();
