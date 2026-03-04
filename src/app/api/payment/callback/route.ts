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

    // Verify HMAC — mandatory in ALL environments to prevent webhook spoofing
    const hmacSecret = process.env.PAYMOB_HMAC_SECRET;

    if (!hmacSecret) {
      console.error("PAYMOB_HMAC_SECRET not configured — rejecting webhook");
      return NextResponse.json({ error: "Webhook verification not configured" }, { status: 500 });
    }

    {
      if (!body.hmac || !body.obj) {
        console.error("Paymob callback missing HMAC or obj");
        return NextResponse.json({ error: "Missing HMAC signature" }, { status: 403 });
      }

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

      const computedBuf = Buffer.from(computed, "hex");
      const receivedBuf = Buffer.from(body.hmac || "", "hex");
      if (computedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(computedBuf, receivedBuf)) {
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
      // Paymob payments (Fawry, Card) are webhook-verified — grant benefits immediately.
      if (isSuccess && orderId) {
        const { data: updated, error: updateErr } = await adminClient
          .from("commissions")
          .update({
            status: "paid",
            payment_reference: orderId,
            verified_by: "paymob_webhook",
            verified_at: new Date().toISOString(),
          } as never)
          .eq("payment_reference", orderId)
          .eq("status", "pending")
          .select("id, payer_id, amount, commission_type, ad_id")
          .maybeSingle();

        if (updated) {
          // Grant supporter badge
          await adminClient
            .from("profiles")
            .update({ is_commission_supporter: true } as never)
            .eq("id", updated.payer_id);

          // If pre-payment, boost the ad
          if (updated.commission_type === "pre_payment" && updated.ad_id) {
            await adminClient
              .from("ads")
              .update({
                is_boosted: true,
                is_trusted: true,
                boosted_at: new Date().toISOString(),
              } as never)
              .eq("id", updated.ad_id);
          }

          // Send thank-you notification
          await adminClient.from("notifications").insert({
            user_id: updated.payer_id,
            type: "commission_verified",
            title: "تم تأكيد دفعك! ✅💚",
            body: `تم التحقق من دعمك بقيمة ${updated.amount} جنيه. أنت دلوقتي "داعم مكسب" 💚`,
            ad_id: updated.ad_id || null,
            data: JSON.stringify({ amount: updated.amount, commission_id: updated.id }),
          });

          // Log the verification
          await adminClient.from("payment_verification_log").insert({
            commission_id: updated.id,
            action: "auto_verified",
            notes: `تم التحقق تلقائياً عبر Paymob webhook — order_id: ${orderId}`,
          });
        } else if (!updateErr) {
          console.warn(`[payment/callback] No commission matched for order_id=${orderId}. Manual review needed.`);
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
