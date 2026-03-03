import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * POST /api/payment/remind
 *
 * Called by a background worker (Railway cron) to send gentle payment
 * reminders to users with pending commissions.
 *
 * Rules:
 * - Only remind after 24 hours from commission creation
 * - Maximum 3 reminders per commission
 * - At least 48 hours between reminders
 * - Friendly, non-pressuring tone
 * - After 3 reminders without payment, stop and mark as expired
 *
 * Protected by CRON_SECRET header.
 */
export async function POST(request: Request) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const instapayLink = process.env.NEXT_PUBLIC_INSTAPAY_LINK || "";

  try {
    // Find pending commissions that need reminders
    const { data: pendingCommissions, error } = await adminClient
      .from("commissions")
      .select(`
        id, ad_id, payer_id, amount, commission_type,
        reminder_count, last_reminder_at, created_at
      `)
      .eq("status", "pending")
      .lt("reminder_count", 3) // Max 3 reminders
      .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // At least 24h old
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      console.error("Fetch pending commissions error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!pendingCommissions || pendingCommissions.length === 0) {
      return NextResponse.json({ sent: 0, expired: 0 });
    }

    let sentCount = 0;
    let expiredCount = 0;
    const now = new Date();
    const minReminderGap = 48 * 60 * 60 * 1000; // 48 hours between reminders

    // Friendly reminder messages — rotate through them
    const reminderMessages = [
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

    for (const commission of pendingCommissions) {
      const lastReminder = commission.last_reminder_at
        ? new Date(commission.last_reminder_at).getTime()
        : 0;

      // Check minimum gap between reminders
      if (lastReminder && now.getTime() - lastReminder < minReminderGap) {
        continue;
      }

      const reminderIndex = Math.min(
        (commission.reminder_count || 0),
        reminderMessages.length - 1,
      );
      const message = reminderMessages[reminderIndex];

      // Send in-app notification
      await adminClient.from("notifications").insert({
        user_id: commission.payer_id,
        type: "commission_reminder",
        title: message.title,
        body: message.body(commission.amount),
        ad_id: commission.ad_id || null,
        data: JSON.stringify({
          commission_id: commission.id,
          amount: commission.amount,
          instapay_link: instapayLink,
          commission_type: commission.commission_type,
        }),
      });

      // Update reminder count
      await adminClient
        .from("commissions")
        .update({
          reminder_count: (commission.reminder_count || 0) + 1,
          last_reminder_at: now.toISOString(),
        } as never)
        .eq("id", commission.id);

      // Log the reminder
      await adminClient.from("payment_verification_log").insert({
        commission_id: commission.id,
        action: "reminder_sent",
        notes: `تذكير رقم ${(commission.reminder_count || 0) + 1}`,
      });

      sentCount++;

      // If this was the 3rd reminder, mark for expiry on next run
      if ((commission.reminder_count || 0) + 1 >= 3) {
        // Don't expire immediately — give them time after last reminder
        // The next cron run after 48h will handle expiry
      }
    }

    // Handle expired commissions (3 reminders sent, 48h passed since last)
    const { data: expiredCommissions } = await adminClient
      .from("commissions")
      .select("id, payer_id, amount, ad_id")
      .eq("status", "pending")
      .gte("reminder_count", 3)
      .lt("last_reminder_at", new Date(Date.now() - minReminderGap).toISOString());

    if (expiredCommissions && expiredCommissions.length > 0) {
      for (const commission of expiredCommissions) {
        // Mark as later (not cancelled — they can still pay voluntarily)
        await adminClient
          .from("commissions")
          .update({ status: "later" } as never)
          .eq("id", commission.id);

        // Log expiry
        await adminClient.from("payment_verification_log").insert({
          commission_id: commission.id,
          action: "expired",
          notes: "تم إيقاف التذكيرات بعد 3 محاولات",
        });

        expiredCount++;
      }
    }

    return NextResponse.json({
      sent: sentCount,
      expired: expiredCount,
      total_pending: pendingCommissions.length,
    });
  } catch (err) {
    console.error("Payment reminder error:", err);
    return NextResponse.json({ error: "حصل مشكلة" }, { status: 500 });
  }
}
