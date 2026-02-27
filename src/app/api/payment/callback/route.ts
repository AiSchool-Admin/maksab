import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * POST /api/payment/callback
 * Handles Paymob transaction processed callback (webhook).
 * Called by Paymob when a payment is completed (Fawry or Card).
 *
 * GET /api/payment/callback
 * Handles the redirect back from Paymob iframe after card payment.
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Verify HMAC if configured
    const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
    if (hmacSecret && body.hmac) {
      const obj = body.obj;
      // Paymob HMAC concatenation order
      const concatenated = [
        obj.amount_cents,
        obj.created_at,
        obj.currency,
        obj.error_occured,
        obj.has_parent_transaction,
        obj.id,
        obj.integration_id,
        obj.is_3d_secure,
        obj.is_auth,
        obj.is_capture,
        obj.is_refunded,
        obj.is_standalone_payment,
        obj.is_voided,
        obj.order?.id || obj.order,
        obj.owner,
        obj.pending,
        obj.source_data?.pan || "",
        obj.source_data?.sub_type || "",
        obj.source_data?.type || "",
        obj.success,
      ].join("");

      const computed = crypto
        .createHmac("sha512", hmacSecret)
        .update(concatenated)
        .digest("hex");

      if (computed !== body.hmac) {
        console.error("Paymob HMAC verification failed");
        return NextResponse.json({ error: "Invalid HMAC" }, { status: 403 });
      }
    }

    const transaction = body.obj;
    const isSuccess = transaction?.success === true;
    const orderId = String(transaction?.order?.id || transaction?.order || "");

    if (!orderId) {
      return NextResponse.json({ received: true });
    }

    // Update commission status in DB
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      });

      // Find the matching commission by Paymob order_id and update its status.
      // The order_id should have been stored in commissions.payment_reference
      // when the payment was initiated.
      if (isSuccess && orderId) {
        const { data: updated, error: updateErr } = await adminClient
          .from("commissions")
          .update({ status: "paid", payment_reference: orderId } as never)
          .eq("payment_reference", orderId)
          .eq("status", "pending")
          .select("id")
          .maybeSingle();

        // Fallback: if no commission matched by order_id (legacy data), match by method + pending
        if (!updated && !updateErr) {
          await adminClient
            .from("commissions")
            .update({ status: "paid", payment_reference: orderId } as never)
            .in("payment_method", ["fawry", "paymob_card"])
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(1);
        }
      }
    }

    return NextResponse.json({ received: true, success: isSuccess });
  } catch (err) {
    console.error("Payment callback error:", err);
    return NextResponse.json({ received: true });
  }
}

/**
 * GET callback — redirect from Paymob iframe after card payment.
 * Redirects user back to app with success/failure indication.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const success = searchParams.get("success") === "true";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://maksab.app";

  if (success) {
    return NextResponse.redirect(`${siteUrl}/?payment=success`);
  }
  return NextResponse.redirect(`${siteUrl}/?payment=failed`);
}
