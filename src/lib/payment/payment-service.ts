/**
 * Payment service for voluntary commission payments.
 *
 * Supports:
 * - Vodafone Cash (manual transfer + confirmation)
 * - InstaPay (manual transfer + confirmation)
 * - Fawry (reference code generation via Paymob)
 * - Paymob Card (redirect to payment page)
 *
 * For MVP: Vodafone Cash and InstaPay are manual (show transfer details).
 * Fawry and Paymob Card require API integration (enabled when PAYMOB_API_KEY is set).
 */

import type {
  PaymentMethod,
  PaymentMethodInfo,
  PaymentRequest,
  PaymentResult,
} from "./types";

// ── Payment Methods Configuration ─────────────────────────────────────

// Replace these with real values for production
const VODAFONE_CASH_NUMBER = "01012345678";
const INSTAPAY_ACCOUNT = "maksab@instapay";

export const PAYMENT_METHODS: PaymentMethodInfo[] = [
  {
    id: "vodafone_cash",
    name: "فودافون كاش",
    icon: "📱",
    description: `حوّل المبلغ على رقم ${VODAFONE_CASH_NUMBER}`,
    details: VODAFONE_CASH_NUMBER,
    enabled: true,
  },
  {
    id: "instapay",
    name: "إنستاباي",
    icon: "🏦",
    description: `حوّل على حساب ${INSTAPAY_ACCOUNT}`,
    details: INSTAPAY_ACCOUNT,
    enabled: true,
  },
  {
    id: "fawry",
    name: "فوري",
    icon: "💳",
    description: "ادفع بكود فوري من أي منفذ",
    enabled: !!process.env.NEXT_PUBLIC_PAYMOB_ENABLED,
  },
  {
    id: "paymob_card",
    name: "بطاقة بنكية",
    icon: "💳",
    description: "ادفع بالفيزا أو الماستركارد",
    enabled: !!process.env.NEXT_PUBLIC_PAYMOB_ENABLED,
  },
];

/**
 * Get enabled payment methods.
 */
export function getAvailablePaymentMethods(): PaymentMethodInfo[] {
  return PAYMENT_METHODS.filter((m) => m.enabled);
}

/**
 * Process a commission payment.
 */
export async function processPayment(
  request: PaymentRequest,
): Promise<PaymentResult> {
  switch (request.method) {
    case "vodafone_cash":
    case "instapay":
      return processManualPayment(request);
    case "fawry":
      return processFawryPayment(request);
    case "paymob_card":
      return processPaymobCardPayment(request);
    default:
      return { success: false, error: "طريقة دفع غير معروفة" };
  }
}

/**
 * Manual payment (Vodafone Cash / InstaPay):
 * Record the intent and mark as pending confirmation.
 */
async function processManualPayment(
  request: PaymentRequest,
): Promise<PaymentResult> {
  try {
    const { supabase } = await import("@/lib/supabase/client");

    const { data, error } = await supabase
      .from("commissions")
      .insert({
        ad_id: request.adId,
        payer_id: request.payerId,
        amount: request.amount,
        payment_method: request.method,
        status: "pending",
      } as never)
      .select("id")
      .single();

    if (error) return { success: false, error: "حصل مشكلة في تسجيل الدفع" };

    return {
      success: true,
      transactionId: (data as { id: string }).id,
    };
  } catch {
    return { success: false, error: "حصل مشكلة، جرب تاني" };
  }
}

/**
 * Fawry payment via Paymob integration.
 * Generates a Fawry reference code that the user pays at any Fawry outlet.
 */
async function processFawryPayment(
  request: PaymentRequest,
): Promise<PaymentResult> {
  try {
    // Step 1: Authenticate with Paymob
    const authResponse = await fetch("https://accept.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY }),
    });
    const { token } = await authResponse.json();

    // Step 2: Create order
    const orderResponse = await fetch("https://accept.paymob.com/api/ecommerce/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: false,
        amount_cents: Math.round(request.amount * 100),
        currency: "EGP",
        items: [
          {
            name: "عمولة مكسب",
            description: request.description,
            amount_cents: Math.round(request.amount * 100),
            quantity: 1,
          },
        ],
      }),
    });
    const order = await orderResponse.json();

    // Step 3: Generate payment key
    const paymentKeyResponse = await fetch(
      "https://accept.paymob.com/api/acceptance/payment_keys",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth_token: token,
          order_id: order.id,
          amount_cents: Math.round(request.amount * 100),
          currency: "EGP",
          expiration: 3600,
          integration_id: process.env.PAYMOB_FAWRY_INTEGRATION_ID,
          billing_data: {
            first_name: "مكسب",
            last_name: "مستخدم",
            email: "user@maksab.app",
            phone_number: "01000000000",
            country: "EG",
            city: "Cairo",
            street: "N/A",
            building: "N/A",
            floor: "N/A",
            apartment: "N/A",
            state: "Cairo",
            shipping_method: "N/A",
            postal_code: "N/A",
          },
        }),
      },
    );
    const { token: paymentKey } = await paymentKeyResponse.json();

    // Step 4: Pay with Fawry
    const fawryResponse = await fetch("https://accept.paymob.com/api/acceptance/payments/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: { identifier: "AGGREGATOR", subtype: "AGGREGATOR" },
        payment_token: paymentKey,
      }),
    });
    const fawryResult = await fawryResponse.json();

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

/**
 * Paymob Card payment.
 * Returns a redirect URL to the Paymob hosted checkout page.
 */
async function processPaymobCardPayment(
  request: PaymentRequest,
): Promise<PaymentResult> {
  try {
    // Step 1: Authenticate
    const authResponse = await fetch("https://accept.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY }),
    });
    const { token } = await authResponse.json();

    // Step 2: Create order
    const orderResponse = await fetch("https://accept.paymob.com/api/ecommerce/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: false,
        amount_cents: Math.round(request.amount * 100),
        currency: "EGP",
        items: [
          {
            name: "عمولة مكسب",
            description: request.description,
            amount_cents: Math.round(request.amount * 100),
            quantity: 1,
          },
        ],
      }),
    });
    const order = await orderResponse.json();

    // Step 3: Generate payment key for card
    const paymentKeyResponse = await fetch(
      "https://accept.paymob.com/api/acceptance/payment_keys",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth_token: token,
          order_id: order.id,
          amount_cents: Math.round(request.amount * 100),
          currency: "EGP",
          expiration: 3600,
          integration_id: process.env.PAYMOB_CARD_INTEGRATION_ID,
          billing_data: {
            first_name: "مكسب",
            last_name: "مستخدم",
            email: "user@maksab.app",
            phone_number: "01000000000",
            country: "EG",
            city: "Cairo",
            street: "N/A",
            building: "N/A",
            floor: "N/A",
            apartment: "N/A",
            state: "Cairo",
            shipping_method: "N/A",
            postal_code: "N/A",
          },
        }),
      },
    );
    const { token: paymentKey } = await paymentKeyResponse.json();

    // Step 4: Return the iframe URL
    const iframeId = process.env.PAYMOB_IFRAME_ID;
    return {
      success: true,
      redirectUrl: `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`,
      transactionId: String(order.id),
    };
  } catch (err) {
    console.error("Paymob card payment error:", err);
    return { success: false, error: "حصل مشكلة في فتح صفحة الدفع" };
  }
}
