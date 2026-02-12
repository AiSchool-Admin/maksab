/**
 * Report service — report ads and users for abuse/violations.
 */

export type ReportTargetType = "ad" | "user";

export type ReportReason =
  | "spam"
  | "fake"
  | "offensive"
  | "wrong_category"
  | "wrong_price"
  | "stolen_photos"
  | "prohibited"
  | "harassment"
  | "scam"
  | "other";

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "fake", label: "إعلان وهمي أو احتيال" },
  { value: "scam", label: "نصب واحتيال" },
  { value: "spam", label: "محتوى مكرر أو سبام" },
  { value: "offensive", label: "محتوى مسيء أو غير لائق" },
  { value: "stolen_photos", label: "صور مسروقة" },
  { value: "wrong_category", label: "قسم خاطئ" },
  { value: "wrong_price", label: "سعر غير واقعي" },
  { value: "prohibited", label: "منتج محظور" },
  { value: "harassment", label: "تحرش أو إزعاج" },
  { value: "other", label: "سبب تاني" },
];

export interface ReportParams {
  reporterId: string;
  targetType: ReportTargetType;
  targetAdId?: string;
  targetUserId?: string;
  reason: ReportReason;
  details?: string;
}

/**
 * Submit a report against an ad or user.
 */
export async function submitReport(params: ReportParams): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("/api/reports/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reporter_id: params.reporterId,
        target_type: params.targetType,
        target_ad_id: params.targetAdId || null,
        target_user_id: params.targetUserId || null,
        reason: params.reason,
        details: params.details || null,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "حصل مشكلة" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "حصل مشكلة في الاتصال. جرب تاني" };
  }
}

/**
 * Check if user already reported this target.
 */
export async function hasAlreadyReported(
  reporterId: string,
  targetType: ReportTargetType,
  targetId: string,
): Promise<boolean> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    const query = supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("reporter_id", reporterId)
      .eq("target_type", targetType);

    if (targetType === "ad") {
      query.eq("target_ad_id", targetId);
    } else {
      query.eq("target_user_id", targetId);
    }

    const { count } = await query;
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}
