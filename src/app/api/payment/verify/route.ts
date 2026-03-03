import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session-token";

/**
 * POST /api/payment/verify
 *
 * User confirms they completed an InstaPay transfer by providing
 * a reference number. The system records it and sends a thank-you
 * notification. An admin can later verify the actual transfer.
 *
 * Also used by the system/admin to mark payments as verified.
 */
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const {
      commission_id,
      instapay_reference,
      session_token,
      action,
    } = body as {
      commission_id: string;
      instapay_reference?: string;
      session_token?: string;
      action?: "user_confirmed" | "admin_verified" | "admin_rejected";
    };

    if (!session_token) {
      return NextResponse.json({ error: "مطلوب تسجيل الدخول" }, { status: 401 });
    }

    const tokenResult = verifySessionToken(session_token);
    if (!tokenResult.valid) {
      return NextResponse.json({ error: tokenResult.error }, { status: 401 });
    }

    const userId = tokenResult.userId;

    if (!commission_id) {
      return NextResponse.json({ error: "البيانات ناقصة" }, { status: 400 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Fetch the commission record
    const { data: commission, error: fetchErr } = await adminClient
      .from("commissions")
      .select("*")
      .eq("id", commission_id)
      .maybeSingle();

    if (fetchErr || !commission) {
      return NextResponse.json({ error: "سجل الدفع مش موجود" }, { status: 404 });
    }

    const verifyAction = action || "user_confirmed";

    // ── User confirms their InstaPay transfer ──
    if (verifyAction === "user_confirmed") {
      // Only the payer can confirm their own payment
      if (commission.payer_id !== userId) {
        return NextResponse.json({ error: "غير مسموح" }, { status: 403 });
      }

      // Update commission with reference and mark as paid
      await adminClient
        .from("commissions")
        .update({
          status: "paid",
          instapay_reference: instapay_reference || null,
          verified_by: "user_confirmed",
          verified_at: new Date().toISOString(),
        } as never)
        .eq("id", commission_id);

      // Log the verification
      await adminClient.from("payment_verification_log").insert({
        commission_id,
        action: "user_confirmed",
        notes: instapay_reference
          ? `رقم مرجع إنستاباي: ${instapay_reference}`
          : "المستخدم أكد التحويل بدون رقم مرجع",
        performed_by: userId,
      });

      // Send thank-you notification
      await adminClient.from("notifications").insert({
        user_id: userId,
        type: "commission_thank_you",
        title: "شكراً لدعمك! 💚",
        body: `تم استلام دعمك بقيمة ${commission.amount} جنيه. أنت دلوقتي "داعم مكسب" وإعلاناتك هتظهر بشارة موثوق!`,
        ad_id: commission.ad_id || null,
        data: JSON.stringify({ amount: commission.amount, commission_id }),
      });

      // Update user profile as commission supporter
      await adminClient
        .from("profiles")
        .update({ is_commission_supporter: true } as never)
        .eq("id", userId);

      // If pre-payment, boost the ad
      if (commission.commission_type === "pre_payment" && commission.ad_id) {
        await adminClient
          .from("ads")
          .update({
            is_boosted: true,
            is_trusted: true,
            boosted_at: new Date().toISOString(),
          } as never)
          .eq("id", commission.ad_id);
      }

      return NextResponse.json({
        success: true,
        message: "شكراً لدعمك! 💚",
      });
    }

    // ── Admin verification (for manual review) ──
    if (verifyAction === "admin_verified" || verifyAction === "admin_rejected") {
      // Check if user is admin
      const { data: profile } = await adminClient
        .from("profiles")
        .select("seller_type")
        .eq("id", userId)
        .maybeSingle();

      // Simple admin check — in production use a proper role system
      const isAdmin = (profile as Record<string, unknown> | null)?.seller_type === "admin";
      if (!isAdmin) {
        return NextResponse.json({ error: "غير مسموح — للمسؤولين فقط" }, { status: 403 });
      }

      const newStatus = verifyAction === "admin_verified" ? "paid" : "cancelled";

      await adminClient
        .from("commissions")
        .update({
          status: newStatus,
          verified_by: verifyAction,
          verified_at: new Date().toISOString(),
        } as never)
        .eq("id", commission_id);

      // Log admin action
      await adminClient.from("payment_verification_log").insert({
        commission_id,
        action: verifyAction,
        notes: verifyAction === "admin_verified"
          ? "تم التحقق من الدفع بواسطة المسؤول"
          : "تم رفض الدفع بواسطة المسؤول",
        performed_by: userId,
      });

      // Notify the payer
      if (verifyAction === "admin_verified") {
        await adminClient.from("notifications").insert({
          user_id: commission.payer_id,
          type: "commission_verified",
          title: "تم تأكيد دفعك! ✅",
          body: `تم التحقق من دعمك بقيمة ${commission.amount} جنيه. شكراً ليك! 💚`,
          ad_id: commission.ad_id || null,
          data: JSON.stringify({ amount: commission.amount, commission_id }),
        });
      }

      return NextResponse.json({
        success: true,
        status: newStatus,
      });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (err) {
    console.error("Payment verify error:", err);
    return NextResponse.json({ error: "حصل مشكلة، جرب تاني" }, { status: 500 });
  }
}

/**
 * GET /api/payment/verify?commission_id=xxx
 *
 * Check the verification status of a commission payment.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const commissionId = searchParams.get("commission_id");

  if (!commissionId) {
    return NextResponse.json({ error: "commission_id مطلوب" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await adminClient
    .from("commissions")
    .select("id, status, amount, payment_method, commission_type, verified_at, verified_by, instapay_reference, created_at")
    .eq("id", commissionId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "سجل الدفع مش موجود" }, { status: 404 });
  }

  return NextResponse.json({ commission: data });
}
