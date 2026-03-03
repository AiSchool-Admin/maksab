/**
 * Railway Background Worker: Payment Reminder Cron
 *
 * Runs every 6 hours to:
 * 1. Send gentle reminders for pending InstaPay/manual payments
 * 2. Check and expire old pending payments (after 3 reminders + 48h)
 *
 * Rules:
 * - First reminder after 24 hours
 * - Maximum 3 reminders per commission
 * - At least 48 hours between reminders
 * - Friendly, non-pressuring tone
 * - After 3 reminders, stop and mark as "later"
 *
 * Environment variables required:
 * - SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
 * - SUPABASE_SERVICE_ROLE_KEY
 * - INSTAPAY_LINK (optional — included in reminder messages)
 *
 * Deploy: Railway cron service (every 6 hours)
 *   Command: npx tsx workers/payment-reminder-cron.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const INSTAPAY_LINK = process.env.INSTAPAY_LINK || process.env.NEXT_PUBLIC_INSTAPAY_LINK || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── Friendly reminder messages (rotate through them) ──
const REMINDER_MESSAGES = [
  {
    title: "تذكير لطيف 💚",
    body: (amount: number) =>
      `لسه مستنيين دعمك بقيمة ${amount} جنيه عبر إنستاباي. دعمك بيفرق معانا كتير! 🙏`,
  },
  {
    title: "إعلانك نجح! 🎉",
    body: (amount: number) =>
      `صفقتك تمت بنجاح! لو حابب تدعم مكسب بـ ${amount} جنيه عبر إنستاباي، هنقدر نكبر ونخدمك أحسن 💚`,
  },
  {
    title: "آخر تذكير 🌟",
    body: (amount: number) =>
      `ده آخر تذكير بدعم مكسب بـ ${amount} جنيه عبر إنستاباي. مفيش ضغط — مكسب هيفضل مجاني ليك دايماً! 💚`,
  },
];

const MIN_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours before first reminder
const MIN_GAP_MS = 48 * 60 * 60 * 1000; // 48 hours between reminders
const MAX_REMINDERS = 3;

async function sendPaymentReminders() {
  const now = new Date();
  console.log(`[payment-reminder] Starting at ${now.toISOString()}`);

  // Find pending commissions that need reminders
  const { data: pendingCommissions, error } = await supabase
    .from("commissions")
    .select(`
      id, ad_id, payer_id, amount, commission_type,
      reminder_count, last_reminder_at, created_at
    `)
    .eq("status", "pending")
    .lt("reminder_count", MAX_REMINDERS)
    .lt("created_at", new Date(now.getTime() - MIN_AGE_MS).toISOString())
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    console.error("[payment-reminder] Fetch error:", error.message);
    return;
  }

  if (!pendingCommissions || pendingCommissions.length === 0) {
    console.log("[payment-reminder] No pending commissions to remind.");
    return;
  }

  console.log(`[payment-reminder] Found ${pendingCommissions.length} pending commissions`);

  let sentCount = 0;

  for (const commission of pendingCommissions) {
    const lastReminder = commission.last_reminder_at
      ? new Date(commission.last_reminder_at).getTime()
      : 0;

    // Check minimum gap between reminders
    if (lastReminder && now.getTime() - lastReminder < MIN_GAP_MS) {
      continue;
    }

    const reminderIndex = Math.min(
      commission.reminder_count || 0,
      REMINDER_MESSAGES.length - 1,
    );
    const message = REMINDER_MESSAGES[reminderIndex];

    // Send in-app notification
    const { error: notifErr } = await supabase.from("notifications").insert({
      user_id: commission.payer_id,
      type: "commission_reminder",
      title: message.title,
      body: message.body(commission.amount),
      ad_id: commission.ad_id || null,
      data: JSON.stringify({
        commission_id: commission.id,
        amount: commission.amount,
        instapay_link: INSTAPAY_LINK,
        commission_type: commission.commission_type,
      }),
    });

    if (notifErr) {
      console.error(`[payment-reminder] Notification insert failed for ${commission.id}:`, notifErr.message);
      continue;
    }

    // Update reminder count
    await supabase
      .from("commissions")
      .update({
        reminder_count: (commission.reminder_count || 0) + 1,
        last_reminder_at: now.toISOString(),
      } as never)
      .eq("id", commission.id);

    // Log the reminder
    await supabase.from("payment_verification_log").insert({
      commission_id: commission.id,
      action: "reminder_sent",
      notes: `تذكير رقم ${(commission.reminder_count || 0) + 1}`,
    });

    sentCount++;
    console.log(`[payment-reminder] Sent reminder #${(commission.reminder_count || 0) + 1} for commission ${commission.id} (${commission.amount} EGP)`);
  }

  // Handle expired commissions (3 reminders sent + 48h passed since last)
  const { data: expiredCommissions } = await supabase
    .from("commissions")
    .select("id, payer_id, amount, ad_id")
    .eq("status", "pending")
    .gte("reminder_count", MAX_REMINDERS)
    .lt("last_reminder_at", new Date(now.getTime() - MIN_GAP_MS).toISOString());

  let expiredCount = 0;

  if (expiredCommissions && expiredCommissions.length > 0) {
    for (const commission of expiredCommissions) {
      // Mark as "later" (not cancelled — they can still pay voluntarily)
      await supabase
        .from("commissions")
        .update({ status: "later" } as never)
        .eq("id", commission.id);

      // Log expiry
      await supabase.from("payment_verification_log").insert({
        commission_id: commission.id,
        action: "expired",
        notes: "تم إيقاف التذكيرات بعد 3 محاولات",
      });

      expiredCount++;
    }
  }

  console.log(`[payment-reminder] Done: ${sentCount} reminders sent, ${expiredCount} expired.`);
}

// Run immediately
sendPaymentReminders()
  .then(() => {
    console.log("[payment-reminder] Job completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[payment-reminder] Job failed:", err);
    process.exit(1);
  });
