import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session-token";

/**
 * POST /api/payment/process
 * Processes commission payments server-side.
 * Handles: manual (vodafone_cash, instapay), fawry, paymob_card
 */
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { amount, method, adId, payerId, session_token, description, commission_type } = body as {
      amount: number;
      method: string;
      adId: string;
      payerId: string;
      session_token?: string;
      description: string;
      commission_type?: string;
    };

    // Authentication (session_token required)
    if (!session_token) {
      return NextResponse.json({ error: "مطلوب تسجيل الدخول" }, { status: 401 });
    }
    const tokenResult = verifySessionToken(session_token);
    if (!tokenResult.valid) {
      return NextResponse.json({ error: tokenResult.error }, { status: 401 });
    }
    const authenticatedPayerId = tokenResult.userId;

    if (!amount || amount <= 0 || !method || !authenticatedPayerId) {
      return NextResponse.json({ error: "البيانات ناقصة" }, { status: 400 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // ── Manual payments (Vodafone Cash / InstaPay) ──
    if (method === "vodafone_cash" || method === "instapay") {
      const { data, error } = await adminClient
        .from("commissions")
        .insert({
          ad_id: adId || null,
          payer_id: authenticatedPayerId,
          amount,
          payment_method: method,
          status: "pending",
          commission_type: commission_type || "post_transaction",
        })
        .select("id")
        .single();

      if (error) {
        console.error("Commission insert error:", error);
        return NextResponse.json({ error: "حصل مشكلة في تسجيل الدفع" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        transactionId: data.id,
      });
    }

    // ── Fawry payment via Paymob ──
    if (method === "fawry") {
      const paymobApiKey = process.env.PAYMOB_API_KEY;
      const fawryIntegrationId = process.env.PAYMOB_FAWRY_INTEGRATION_ID;

      if (!paymobApiKey || !fawryIntegrationId) {
        return NextResponse.json({ error: "طريقة الدفع غير متاحة حالياً" }, { status: 503 });
      }

      const result = await processPaymobFawry({
        amount,
        description: description || "عمولة مكسب",
        apiKey: paymobApiKey,
        integrationId: fawryIntegrationId,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      // Record in DB with payment_reference for webhook matching
      await adminClient.from("commissions").insert({
        ad_id: adId || null,
        payer_id: authenticatedPayerId,
        amount,
        payment_method: "fawry",
        status: "pending",
        commission_type: commission_type || "post_transaction",
        payment_reference: result.transactionId || null,
      });

      return NextResponse.json({
        success: true,
        referenceNumber: result.referenceNumber,
        transactionId: result.transactionId,
      });
    }

    // ── Paymob Card payment ──
    if (method === "paymob_card") {
      const paymobApiKey = process.env.PAYMOB_API_KEY;
      const cardIntegrationId = process.env.PAYMOB_CARD_INTEGRATION_ID;
      const iframeId = process.env.PAYMOB_IFRAME_ID;

      if (!paymobApiKey || !cardIntegrationId || !iframeId) {
        return NextResponse.json({ error: "طريقة الدفع غير متاحة حالياً" }, { status: 503 });
      }

      const result = await processPaymobCard({
        amount,
        description: description || "عمولة مكسب",
        apiKey: paymobApiKey,
        integrationId: cardIntegrationId,
        iframeId,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      // Record pending in DB with payment_reference for webhook matching
      await adminClient.from("commissions").insert({
        ad_id: adId || null,
        payer_id: authenticatedPayerId,
        amount,
        payment_method: "paymob_card",
        status: "pending",
        commission_type: commission_type || "post_transaction",
        payment_reference: result.transactionId || null,
      });

      return NextResponse.json({
        success: true,
        redirectUrl: result.redirectUrl,
        transactionId: result.transactionId,
      });
    }

    return NextResponse.json({ error: "طريقة دفع غير معروفة" }, { status: 400 });
  } catch (err) {
    console.error("Payment processing error:", err);
    return NextResponse.json({ error: "حصل مشكلة، جرب تاني" }, { status: 500 });
  }
}

// ── Paymob Fawry Helper ──

async function processPaymobFawry(params: {
  amount: number;
  description: string;
  apiKey: string;
  integrationId: string;
}): Promise<{ success: boolean; referenceNumber?: string; transactionId?: string; error?: string }> {
  try {
    // Step 1: Authenticate with Paymob
    const authRes = await fetch("https://accept.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: params.apiKey }),
    });
    if (!authRes.ok) return { success: false, error: "فشل الاتصال ببوابة الدفع" };
    const { token } = await authRes.json();

    // Step 2: Create order
    const orderRes = await fetch("https://accept.paymob.com/api/ecommerce/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: false,
        amount_cents: Math.round(params.amount * 100),
        currency: "EGP",
        items: [{
          name: "عمولة مكسب",
          description: params.description,
          amount_cents: Math.round(params.amount * 100),
          quantity: 1,
        }],
      }),
    });
    if (!orderRes.ok) return { success: false, error: "فشل إنشاء الطلب" };
    const order = await orderRes.json();

    // Step 3: Generate payment key
    const keyRes = await fetch("https://accept.paymob.com/api/acceptance/payment_keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: token,
        order_id: order.id,
        amount_cents: Math.round(params.amount * 100),
        currency: "EGP",
        expiration: 3600,
        integration_id: params.integrationId,
        billing_data: {
          first_name: "مكسب", last_name: "مستخدم",
          email: "user@maksab.app", phone_number: "01000000000",
          country: "EG", city: "Cairo", street: "N/A",
          building: "N/A", floor: "N/A", apartment: "N/A",
          state: "Cairo", shipping_method: "N/A", postal_code: "N/A",
        },
      }),
    });
    if (!keyRes.ok) return { success: false, error: "فشل إنشاء مفتاح الدفع" };
    const { token: paymentKey } = await keyRes.json();

    // Step 4: Pay with Fawry
    const fawryRes = await fetch("https://accept.paymob.com/api/acceptance/payments/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: { identifier: "AGGREGATOR", subtype: "AGGREGATOR" },
        payment_token: paymentKey,
      }),
    });
    if (!fawryRes.ok) return { success: false, error: "فشل إنشاء كود الفوري" };
    const fawryResult = await fawryRes.json();

    return {
      success: true,
      referenceNumber: fawryResult.data?.bill_reference || fawryResult.pending,
      transactionId: String(order.id),
    };
  } catch (err) {
    console.error("Fawry payment error:", err);
    return { success: false, error: "حصل مشكلة في إنشاء كود الفوري" };
  }
}

// ── Paymob Card Helper ──

async function processPaymobCard(params: {
  amount: number;
  description: string;
  apiKey: string;
  integrationId: string;
  iframeId: string;
}): Promise<{ success: boolean; redirectUrl?: string; transactionId?: string; error?: string }> {
  try {
    // Step 1: Authenticate
    const authRes = await fetch("https://accept.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: params.apiKey }),
    });
    if (!authRes.ok) return { success: false, error: "فشل الاتصال ببوابة الدفع" };
    const { token } = await authRes.json();

    // Step 2: Create order
    const orderRes = await fetch("https://accept.paymob.com/api/ecommerce/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: false,
        amount_cents: Math.round(params.amount * 100),
        currency: "EGP",
        items: [{
          name: "عمولة مكسب",
          description: params.description,
          amount_cents: Math.round(params.amount * 100),
          quantity: 1,
        }],
      }),
    });
    if (!orderRes.ok) return { success: false, error: "فشل إنشاء الطلب" };
    const order = await orderRes.json();

    // Step 3: Generate payment key for card
    const keyRes = await fetch("https://accept.paymob.com/api/acceptance/payment_keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: token,
        order_id: order.id,
        amount_cents: Math.round(params.amount * 100),
        currency: "EGP",
        expiration: 3600,
        integration_id: params.integrationId,
        billing_data: {
          first_name: "مكسب", last_name: "مستخدم",
          email: "user@maksab.app", phone_number: "01000000000",
          country: "EG", city: "Cairo", street: "N/A",
          building: "N/A", floor: "N/A", apartment: "N/A",
          state: "Cairo", shipping_method: "N/A", postal_code: "N/A",
        },
      }),
    });
    if (!keyRes.ok) return { success: false, error: "فشل إنشاء مفتاح الدفع" };
    const { token: paymentKey } = await keyRes.json();

    return {
      success: true,
      redirectUrl: `https://accept.paymob.com/api/acceptance/iframes/${params.iframeId}?payment_token=${paymentKey}`,
      transactionId: String(order.id),
    };
  } catch (err) {
    console.error("Paymob card payment error:", err);
    return { success: false, error: "حصل مشكلة في فتح صفحة الدفع" };
  }
}
