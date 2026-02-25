/**
 * Payment service for voluntary commission payments.
 *
 * Supports:
 * - Vodafone Cash (manual transfer — show account details)
 * - InstaPay (manual transfer — show account details)
 * - Fawry (reference code generation via Paymob — server-side)
 * - Paymob Card (redirect to payment page — server-side)
 *
 * Manual payments show transfer details. Paymob payments are processed
 * through the /api/payment/process API route (server-side) to keep
 * API keys secure.
 */

import type {
  PaymentMethod,
  PaymentMethodInfo,
  PaymentRequest,
  PaymentResult,
} from "./types";

// ── Payment Methods Configuration ─────────────────────────────────────

const VODAFONE_CASH_NUMBER =
  process.env.NEXT_PUBLIC_VODAFONE_CASH_NUMBER || "01064348782";
const INSTAPAY_PHONE =
  process.env.NEXT_PUBLIC_INSTAPAY_PHONE || "01064348782";
const INSTAPAY_LINK =
  process.env.NEXT_PUBLIC_INSTAPAY_LINK ||
  "https://ipn.eg/S/mamdouhragab1707/instapay/0i4IIx";

export const PAYMENT_METHODS: PaymentMethodInfo[] = [
  {
    id: "instapay",
    name: "إنستاباي",
    icon: "🏦",
    description: "ادفع فوراً بإنستاباي — أسرع وأسهل طريقة",
    details: INSTAPAY_PHONE,
    paymentLink: INSTAPAY_LINK,
    enabled: true,
  },
  {
    id: "vodafone_cash",
    name: "فودافون كاش",
    icon: "📱",
    description: `حوّل المبلغ على رقم ${VODAFONE_CASH_NUMBER}`,
    details: VODAFONE_CASH_NUMBER,
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
 * All payment methods go through the server-side API route
 * to keep Paymob API keys secure and ensure DB writes succeed.
 */
export async function processPayment(
  request: PaymentRequest,
): Promise<PaymentResult> {
  try {
    const { getSessionToken } = await import("@/lib/supabase/auth");
    const res = await fetch("/api/payment/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: request.amount,
        method: request.method,
        adId: request.adId,
        payerId: request.payerId,
        session_token: getSessionToken(),
        description: request.description,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || "حصل مشكلة في عملية الدفع",
      };
    }

    const data = await res.json();
    return {
      success: data.success === true,
      transactionId: data.transactionId,
      redirectUrl: data.redirectUrl,
      referenceNumber: data.referenceNumber,
      error: data.error,
    };
  } catch {
    return { success: false, error: "حصل مشكلة في الاتصال، جرب تاني" };
  }
}
