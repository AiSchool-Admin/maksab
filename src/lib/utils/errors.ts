/**
 * Egyptian Arabic error messages — friendly and helpful.
 * Per CLAUDE.md: "حصل مشكلة، جرب تاني" not "Error 500"
 */

export const ERROR_MESSAGES = {
  // General
  generic: "حصل مشكلة، جرب تاني",
  network: "مفيش إنترنت دلوقتي — جرب تاني لما النت يرجع",
  timeout: "الطلب أخد وقت طويل — جرب تاني",
  unauthorized: "لازم تسجل دخولك الأول",
  forbidden: "مش مسموحلك تعمل ده",
  not_found: "مش لاقيين اللي بتدور عليه",

  // Auth
  otp_send_failed: "مقدرناش نبعت الكود — جرب تاني بعد شوية",
  otp_invalid: "الكود غلط — تأكد وجرب تاني",
  otp_expired: "الكود انتهت صلاحيته — ابعت كود جديد",
  otp_rate_limit: "جربت كتير — استنى شوية وجرب تاني",
  phone_invalid: "رقم الموبايل مش صح — لازم يبدأ بـ 01 ويكون 11 رقم",

  // Ads
  ad_create_failed: "حصل مشكلة في نشر الإعلان، جرب تاني",
  ad_update_failed: "مقدرناش نحدث الإعلان — جرب تاني",
  ad_delete_failed: "مقدرناش نحذف الإعلان — جرب تاني",
  ad_not_found: "الإعلان ده مش موجود أو اتحذف",
  ad_expired: "الإعلان ده انتهى",
  images_upload_failed: "حصل مشكلة في رفع الصور — جرب تاني",
  image_too_large: "الصورة كبيرة أوي — الحد الأقصى 1 ميجا",

  // Auction
  bid_too_low: "المزايدة لازم تكون أعلى من الحد الأدنى",
  bid_failed: "مقدرناش نسجل مزايدتك — جرب تاني",
  auction_ended: "المزاد خلاص انتهى",
  buy_now_failed: "مقدرناش نسجل الشراء — جرب تاني",

  // Chat
  message_send_failed: "مقدرناش نبعت الرسالة — جرب تاني",
  chat_load_failed: "مقدرناش نحمل المحادثات — جرب تاني",

  // Commission
  commission_failed: "مقدرناش نسجل العمولة — مفيش مشكلة، جرب بعدين",

  // Profile
  profile_update_failed: "مقدرناش نحدث البروفايل — جرب تاني",
  avatar_upload_failed: "مقدرناش نرفع الصورة — جرب تاني",
} as const;

export type ErrorKey = keyof typeof ERROR_MESSAGES;

/**
 * Get a user-friendly error message in Egyptian Arabic.
 */
export function getErrorMessage(key: ErrorKey): string {
  return ERROR_MESSAGES[key] || ERROR_MESSAGES.generic;
}

/**
 * Map common HTTP status codes to error messages.
 */
export function httpErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return ERROR_MESSAGES.generic;
    case 401:
      return ERROR_MESSAGES.unauthorized;
    case 403:
      return ERROR_MESSAGES.forbidden;
    case 404:
      return ERROR_MESSAGES.not_found;
    case 408:
    case 504:
      return ERROR_MESSAGES.timeout;
    case 429:
      return ERROR_MESSAGES.otp_rate_limit;
    default:
      return ERROR_MESSAGES.generic;
  }
}
