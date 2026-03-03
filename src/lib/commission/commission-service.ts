/**
 * Commission service — voluntary commission calculation and submission.
 *
 * Two commission models:
 * 1. Post-transaction (default): 1% after deal is done (min 10, max 200 EGP)
 * 2. Pre-payment: 0.5% paid upfront when creating an ad — rewards:
 *    - "موثوق" (Trusted) badge on the ad and seller profile
 *    - Priority ad placement (boosted in search results and home feed)
 */

export type CommissionType = "post_transaction" | "pre_payment";

/**
 * Calculate the suggested commission amount (1% of transaction, min 10, max 200 EGP)
 */
export function calculateSuggestedCommission(transactionAmount: number): number {
  const percentage = transactionAmount * 0.01;
  const min = 10;
  const max = 200;
  return Math.min(Math.max(Math.round(percentage), min), max);
}

/**
 * Calculate pre-payment commission (0.5% upfront, min 5, max 100 EGP)
 * Lower rate as incentive for paying in advance.
 */
export function calculatePrePaymentCommission(adPrice: number): number {
  const percentage = adPrice * 0.005; // 0.5%
  const min = 5;
  const max = 100;
  return Math.min(Math.max(Math.round(percentage), min), max);
}

/**
 * Get the savings from choosing pre-payment over post-transaction.
 */
export function getPrePaymentSavings(adPrice: number): {
  prePayment: number;
  postTransaction: number;
  savings: number;
  savingsPercent: number;
} {
  const prePayment = calculatePrePaymentCommission(adPrice);
  const postTransaction = calculateSuggestedCommission(adPrice);
  const savings = postTransaction - prePayment;
  const savingsPercent = postTransaction > 0
    ? Math.round((savings / postTransaction) * 100)
    : 0;
  return { prePayment, postTransaction, savings, savingsPercent };
}

export type CommissionStatus = "pending" | "pending_verification" | "paid" | "declined" | "later" | "cancelled";

export interface CommissionRecord {
  id: string;
  adId: string;
  payerId: string;
  amount: number;
  paymentMethod: string | null;
  status: CommissionStatus;
  commissionType: CommissionType;
  createdAt: string;
}

/**
 * Submit a voluntary commission payment via server API route.
 */
export async function submitCommission(params: {
  adId: string;
  payerId: string;
  amount: number;
  paymentMethod: string;
}): Promise<{ success: boolean }> {
  try {
    const { getSessionToken } = await import("@/lib/supabase/auth");
    const res = await fetch("/api/payment/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: params.amount,
        method: params.paymentMethod,
        adId: params.adId,
        payerId: params.payerId,
        session_token: getSessionToken(),
        description: "عمولة مكسب",
      }),
    });
    const data = await res.json();
    return { success: data.success === true };
  } catch {
    return { success: false };
  }
}

/**
 * Record that user declined or deferred commission.
 * Uses amount=0 which is now allowed by the updated DB constraint.
 */
export async function declineCommission(params: {
  adId: string;
  payerId: string;
  status: "declined" | "later";
}): Promise<void> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    await supabase.from("commissions").insert({
      ad_id: params.adId,
      payer_id: params.payerId,
      amount: 0,
      payment_method: null,
      status: params.status,
    } as never);
  } catch {
    // silent — declining is non-critical
  }
}

/**
 * Check if a user has ever paid commission (for badge display).
 * Only counts payments that have been verified by admin or system
 * (Paymob webhook). Self-confirmed payments don't count.
 */
export async function isCommissionSupporter(userId: string): Promise<boolean> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    const { count } = await supabase
      .from("commissions")
      .select("id", { count: "exact", head: true })
      .eq("payer_id", userId)
      .eq("status", "paid");
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Submit a pre-payment commission (0.5%) during ad creation.
 * Returns ad boost metadata on success.
 */
export async function submitPrePaymentCommission(params: {
  adId: string;
  payerId: string;
  adPrice: number;
  paymentMethod: string;
}): Promise<{ success: boolean; amount?: number }> {
  const amount = calculatePrePaymentCommission(params.adPrice);
  try {
    const { getSessionToken } = await import("@/lib/supabase/auth");
    const res = await fetch("/api/payment/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        method: params.paymentMethod,
        adId: params.adId,
        payerId: params.payerId,
        session_token: getSessionToken(),
        description: "عمولة مكسب مسبقة — 0.5%",
        commission_type: "pre_payment",
      }),
    });
    const data = await res.json();
    if (data.success) {
      // Mark ad as boosted + trusted (fire and forget)
      boostAd(params.adId).catch((err) => console.warn("[commission] boostAd failed:", err));
    }
    return { success: data.success === true, amount };
  } catch {
    return { success: false };
  }
}

/**
 * Mark an ad as boosted (priority display) after pre-payment commission.
 * Sets is_boosted=true and is_trusted=true on the ad record.
 */
export async function boostAd(adId: string): Promise<void> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    await supabase
      .from("ads")
      .update({
        is_boosted: true,
        is_trusted: true,
        boosted_at: new Date().toISOString(),
      } as never)
      .eq("id", adId);
  } catch {
    // silent — boosting is non-critical
  }
}

/**
 * Check if an ad is boosted (pre-paid commission).
 */
export async function isAdBoosted(adId: string): Promise<boolean> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    const { data } = await supabase
      .from("ads")
      .select("is_boosted")
      .eq("id", adId)
      .maybeSingle();
    return (data as unknown as Record<string, unknown> | null)?.is_boosted === true;
  } catch {
    return false;
  }
}

/**
 * Check if a user has any pre-payment commissions (for trusted badge on profile).
 */
export async function isTrustedSeller(userId: string): Promise<boolean> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    const { count } = await supabase
      .from("commissions")
      .select("id", { count: "exact", head: true })
      .eq("payer_id", userId)
      .eq("status", "paid")
      .eq("commission_type" as never, "pre_payment" as never);
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}
