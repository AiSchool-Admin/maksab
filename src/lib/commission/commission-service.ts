/**
 * Commission service — voluntary commission calculation and submission.
 */

/**
 * Calculate the suggested commission amount (1% of transaction, min 10, max 200 EGP)
 */
export function calculateSuggestedCommission(transactionAmount: number): number {
  const percentage = transactionAmount * 0.01;
  const min = 10;
  const max = 200;
  return Math.min(Math.max(Math.round(percentage), min), max);
}

export type CommissionStatus = "pending" | "paid" | "declined" | "later";

export interface CommissionRecord {
  id: string;
  adId: string;
  payerId: string;
  amount: number;
  paymentMethod: string | null;
  status: CommissionStatus;
  createdAt: string;
}

/**
 * Submit a voluntary commission payment.
 */
export async function submitCommission(params: {
  adId: string;
  payerId: string;
  amount: number;
  paymentMethod: string;
}): Promise<{ success: boolean }> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    const { error } = await supabase.from("commissions").insert({
      ad_id: params.adId,
      payer_id: params.payerId,
      amount: params.amount,
      payment_method: params.paymentMethod,
      status: "paid",
    } as never);
    return { success: !error };
  } catch {
    return { success: false };
  }
}

/**
 * Record that user declined or deferred commission.
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
      status: params.status,
    } as never);
  } catch {
    // silent
  }
}

/**
 * Check if a user has ever paid commission (for badge display).
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
