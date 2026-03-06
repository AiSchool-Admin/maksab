/**
 * Payment history service — fetch and manage user's commission payments.
 */

import { getSessionToken } from "@/lib/supabase/auth";

export interface CommissionPayment {
  id: string;
  ad_id: string | null;
  amount: number;
  unique_amount: number | null;
  payment_method: string;
  status: "pending" | "pending_verification" | "paid" | "declined" | "later" | "cancelled";
  commission_type: "post_transaction" | "pre_payment";
  instapay_reference: string | null;
  screenshot_url: string | null;
  verified_at: string | null;
  verified_by: string | null;
  reminder_count: number;
  created_at: string;
  // Joined fields
  ad_title?: string;
  ad_image?: string;
}

/**
 * Fetch the user's commission payment history.
 */
export async function getPaymentHistory(userId: string): Promise<CommissionPayment[]> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    const { data, error } = await supabase
      .from("commissions")
      .select(`
        id, ad_id, amount, unique_amount, payment_method, status,
        commission_type, instapay_reference, screenshot_url,
        verified_at, verified_by, reminder_count, created_at
      `)
      .eq("payer_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) return [];

    // Fetch ad titles for display
    const adIds = (data as CommissionPayment[])
      .filter((c) => c.ad_id)
      .map((c) => c.ad_id!);

    let adMap: Record<string, { title: string; images: string[] }> = {};
    if (adIds.length > 0) {
      const { data: ads } = await supabase
        .from("ads")
        .select("id, title, images")
        .in("id", adIds);
      if (ads) {
        adMap = Object.fromEntries(
          (ads as { id: string; title: string; images: string[] }[]).map((a) => [
            a.id,
            { title: a.title, images: a.images },
          ])
        );
      }
    }

    return (data as CommissionPayment[]).map((c) => ({
      ...c,
      ad_title: c.ad_id ? adMap[c.ad_id]?.title : undefined,
      ad_image: c.ad_id ? adMap[c.ad_id]?.images?.[0] : undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * Get count of pending payments (for badge display).
 */
export async function getPendingPaymentsCount(userId: string): Promise<number> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    const { count } = await supabase
      .from("commissions")
      .select("id", { count: "exact", head: true })
      .eq("payer_id", userId)
      .in("status", ["pending", "pending_verification"]);
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Check payment verification status from the server.
 */
export async function checkPaymentStatus(commissionId: string): Promise<{
  status: string;
  verified_at?: string;
  error?: string;
} | null> {
  try {
    const token = getSessionToken();
    if (!token) return null;

    const res = await fetch(
      `/api/payment/verify?commission_id=${commissionId}&session_token=${encodeURIComponent(token)}`
    );
    if (!res.ok) return null;

    const data = await res.json();
    return data.commission || null;
  } catch {
    return null;
  }
}

/**
 * Re-upload a screenshot for a pending payment.
 */
export async function reuploadScreenshot(
  commissionId: string,
  file: File
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = getSessionToken();
    if (!token) return { success: false, error: "مطلوب تسجيل الدخول" };

    const formData = new FormData();
    formData.append("file", file);
    formData.append("commission_id", commissionId);
    formData.append("session_token", token);

    const res = await fetch("/api/payment/screenshot", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || "فشل رفع الصورة" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "حصل مشكلة، جرب تاني" };
  }
}
