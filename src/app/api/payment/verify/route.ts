import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session-token";

/**
 * POST /api/payment/verify
 *
 * Three verification flows:
 *
 * 1. user_confirmed — User says they transferred money.
 *    For manual payments (InstaPay, Vodafone Cash):
 *      → Sets status to "pending_verification" (NOT "paid")
 *      → Screenshot required via /api/payment/screenshot
 *      → Benefits NOT granted until admin verifies
 *
 * 2. admin_verified — Admin confirms the payment after checking bank records.
 *      → Sets status to "paid"
 *      → Grants badges and boosts
 *
 * 3. admin_rejected — Admin determines payment was not received.
 *      → Sets status to "cancelled"
 *      → Notifies user
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
      admin_notes,
    } = body as {
      commission_id: string;
      instapay_reference?: string;
      session_token?: string;
      action?: "user_confirmed" | "admin_verified" | "admin_rejected";
      admin_notes?: string;
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

    // ── User confirms their manual transfer ──
    // IMPORTANT: This does NOT mark as "paid" — only "pending_verification"
    // Benefits are granted ONLY when admin verifies.
    if (verifyAction === "user_confirmed") {
      if (commission.payer_id !== userId) {
        return NextResponse.json({ error: "غير مسموح" }, { status: 403 });
      }

      // Set to pending_verification — NOT paid
      await adminClient
        .from("commissions")
        .update({
          status: "pending_verification",
          instapay_reference: instapay_reference || null,
          verified_by: "user_confirmed",
        } as never)
        .eq("id", commission_id);

      // Log the action
      await adminClient.from("payment_verification_log").insert({
        commission_id,
        action: "user_confirmed",
        notes: instapay_reference
          ? `المستخدم أكد التحويل — رقم مرجع: ${instapay_reference}`
          : "المستخدم أكد التحويل بدون رقم مرجع",
        performed_by: userId,
      });

      // Send acknowledgment notification (not thank-you yet — that comes after verification)
      await adminClient.from("notifications").insert({
        user_id: userId,
        type: "commission_pending_verification",
        title: "تم استلام طلب الدفع 📋",
        body: `تم تسجيل دعمك بقيمة ${commission.unique_amount || commission.amount} جنيه. هنتحقق من التحويل ونبعتلك تأكيد خلال 24 ساعة.`,
        ad_id: commission.ad_id || null,
        data: JSON.stringify({ amount: commission.amount, commission_id }),
      });

      return NextResponse.json({
        success: true,
        status: "pending_verification",
        message: "تم تسجيل الدفع. هنتحقق من التحويل ونبعتلك تأكيد قريب.",
      });
    }

    // ── Admin verification ──
    if (verifyAction === "admin_verified" || verifyAction === "admin_rejected") {
      // Check if user is admin
      const { data: profile } = await adminClient
        .from("profiles")
        .select("seller_type")
        .eq("id", userId)
        .maybeSingle();

      const isAdmin = (profile as Record<string, unknown> | null)?.seller_type === "admin";
      if (!isAdmin) {
        return NextResponse.json({ error: "غير مسموح — للمسؤولين فقط" }, { status: 403 });
      }

      if (verifyAction === "admin_verified") {
        // ── ADMIN VERIFIED: Now we actually grant benefits ──
        await adminClient
          .from("commissions")
          .update({
            status: "paid",
            verified_by: "admin_verified",
            verified_at: new Date().toISOString(),
            admin_notes: admin_notes || null,
          } as never)
          .eq("id", commission_id);

        // NOW grant the "داعم مكسب" badge
        await adminClient
          .from("profiles")
          .update({ is_commission_supporter: true } as never)
          .eq("id", commission.payer_id);

        // If pre-payment, NOW boost the ad
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

        // Log admin action
        await adminClient.from("payment_verification_log").insert({
          commission_id,
          action: "admin_verified",
          notes: admin_notes || "تم التحقق من الدفع بواسطة المسؤول",
          performed_by: userId,
        });

        // Send thank-you notification to the payer
        await adminClient.from("notifications").insert({
          user_id: commission.payer_id,
          type: "commission_verified",
          title: "تم تأكيد دفعك! ✅💚",
          body: `تم التحقق من دعمك بقيمة ${commission.amount} جنيه. أنت دلوقتي "داعم مكسب" 💚 وإعلاناتك هتظهر بشارة موثوق!`,
          ad_id: commission.ad_id || null,
          data: JSON.stringify({ amount: commission.amount, commission_id }),
        });

        return NextResponse.json({
          success: true,
          status: "paid",
        });
      }

      // ── ADMIN REJECTED ──
      await adminClient
        .from("commissions")
        .update({
          status: "cancelled",
          verified_by: "admin_rejected",
          verified_at: new Date().toISOString(),
          admin_notes: admin_notes || null,
        } as never)
        .eq("id", commission_id);

      // Log admin action
      await adminClient.from("payment_verification_log").insert({
        commission_id,
        action: "admin_rejected",
        notes: admin_notes || "تم رفض الدفع — لم يتم استلام التحويل",
        performed_by: userId,
      });

      // Notify the payer
      await adminClient.from("notifications").insert({
        user_id: commission.payer_id,
        type: "commission_rejected",
        title: "مشكلة في الدفع ❌",
        body: `مقدرناش نتحقق من تحويل ${commission.unique_amount || commission.amount} جنيه. لو حوّلت فعلاً، تواصل معانا أو جرب تاني.`,
        ad_id: commission.ad_id || null,
        data: JSON.stringify({ amount: commission.amount, commission_id }),
      });

      return NextResponse.json({
        success: true,
        status: "cancelled",
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
    .select("id, status, amount, unique_amount, payment_method, commission_type, verified_at, verified_by, instapay_reference, screenshot_url, created_at")
    .eq("id", commissionId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "سجل الدفع مش موجود" }, { status: 404 });
  }

  return NextResponse.json({ commission: data });
}
