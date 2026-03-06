/**
 * Centralized Arabic error messages for the app.
 * All error messages are in Egyptian Arabic per CLAUDE.md conventions.
 */

/** Common error codes mapped to user-friendly Arabic messages */
export const ERROR_MESSAGES: Record<string, string> = {
  // Network errors
  network_error: "مفيش اتصال بالإنترنت — جرّب تاني لما النت يرجع",
  timeout: "الطلب أخد وقت طويل — جرّب تاني",
  server_error: "حصلت مشكلة في السيرفر — جرّب تاني بعد شوية",

  // Auth errors
  auth_required: "لازم تسجل الأول عشان تكمل",
  invalid_phone: "رقم الموبايل مش صحيح — لازم يبدأ بـ 01 ويكون 11 رقم",
  otp_expired: "كود التأكيد انتهى — اطلب كود جديد",
  otp_invalid: "كود التأكيد غلط — جرّب تاني",
  otp_rate_limit: "طلبت أكواد كتير — استنى شوية وجرّب تاني",
  session_expired: "الجلسة انتهت — سجّل دخول تاني",

  // Ad errors
  ad_not_found: "الإعلان ده مش موجود أو اتحذف",
  ad_create_failed: "مقدرناش ننشر إعلانك — جرّب تاني",
  ad_update_failed: "مقدرناش نحدّث الإعلان — جرّب تاني",
  ad_delete_failed: "مقدرناش نحذف الإعلان — جرّب تاني",
  ad_limit_reached: "وصلت لأقصى عدد إعلانات النهاردة — جرّب بكرة",
  image_upload_failed: "مقدرناش نرفع الصورة — جرّب صورة تانية أو صغّر حجمها",
  image_too_large: "الصورة كبيرة أوي — لازم تكون أقل من 1 ميجا",
  max_images_reached: "مينفعش ترفع أكتر من 5 صور",

  // Search errors
  search_failed: "حصلت مشكلة في البحث — جرّب تاني",
  no_results: "مفيش نتائج — جرّب كلمات تانية",

  // Chat errors
  chat_failed: "مقدرناش نحمّل المحادثة — جرّب تاني",
  message_send_failed: "الرسالة ماتبعتتش — جرّب تاني",
  chat_blocked: "مش هتقدر تتواصل مع المستخدم ده",

  // Auction errors
  bid_failed: "مقدرناش نسجل مزايدتك — جرّب تاني",
  bid_too_low: "المزايدة لازم تكون أعلى من المزايدة الحالية",
  auction_ended: "المزاد خلص خلاص",
  auction_not_found: "المزاد ده مش موجود",

  // Profile errors
  profile_update_failed: "مقدرناش نحدّث بياناتك — جرّب تاني",
  avatar_upload_failed: "مقدرناش نرفع الصورة الشخصية — جرّب تاني",

  // Favorites errors
  favorite_failed: "مقدرناش نضيف للمفضلة — جرّب تاني",

  // Payment errors
  payment_failed: "عملية الدفع فشلت — جرّب تاني",

  // Permission errors
  permission_denied: "مش مسموحلك بالعملية دي",
  location_denied: "مفيش صلاحية للموقع — فعّل الموقع من الإعدادات",

  // Generic
  unknown: "حصلت مشكلة — جرّب تاني",
  loading_failed: "مقدرناش نحمّل البيانات — جرّب تاني",
};

/**
 * Get a user-friendly Arabic error message for an error code.
 * Falls back to a generic message if the code is unknown.
 */
export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.unknown;
}

/**
 * Parse a Supabase or API error into a user-friendly Arabic message.
 */
export function parseError(error: unknown): string {
  if (!error) return ERROR_MESSAGES.unknown;

  // String error
  if (typeof error === "string") {
    // Check if it's a known error code
    if (ERROR_MESSAGES[error]) return ERROR_MESSAGES[error];
    return error;
  }

  // Error object
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    // Network errors
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed to fetch")) {
      return ERROR_MESSAGES.network_error;
    }
    if (msg.includes("timeout") || msg.includes("aborted")) {
      return ERROR_MESSAGES.timeout;
    }

    // Auth errors
    if (msg.includes("not authenticated") || msg.includes("jwt")) {
      return ERROR_MESSAGES.session_expired;
    }
    if (msg.includes("otp") && msg.includes("expired")) {
      return ERROR_MESSAGES.otp_expired;
    }
    if (msg.includes("rate limit") || msg.includes("too many")) {
      return ERROR_MESSAGES.otp_rate_limit;
    }

    // Permission errors
    if (msg.includes("permission") || msg.includes("forbidden") || msg.includes("403")) {
      return ERROR_MESSAGES.permission_denied;
    }

    // Server errors
    if (msg.includes("500") || msg.includes("internal server")) {
      return ERROR_MESSAGES.server_error;
    }

    // Not found
    if (msg.includes("404") || msg.includes("not found")) {
      return ERROR_MESSAGES.ad_not_found;
    }

    return ERROR_MESSAGES.unknown;
  }

  // Supabase error object
  if (typeof error === "object" && error !== null) {
    const errObj = error as Record<string, unknown>;
    if (errObj.code === "PGRST116") return ERROR_MESSAGES.ad_not_found;
    if (errObj.code === "23505") return "البيانات دي موجودة قبل كده";
    if (errObj.message && typeof errObj.message === "string") {
      return parseError(new Error(errObj.message as string));
    }
  }

  return ERROR_MESSAGES.unknown;
}

/**
 * Toast-friendly error handler. Use with react-hot-toast:
 * toast.error(toastError(error))
 */
export function toastError(error: unknown): string {
  return parseError(error);
}
