/**
 * Firebase Phone Auth Helper
 *
 * Handles the client-side Firebase Phone Auth flow:
 * 1. Setup invisible reCAPTCHA (with pre-render)
 * 2. Send OTP via Firebase (signInWithPhoneNumber)
 * 3. Verify OTP code
 * 4. Get Firebase ID token for server verification
 */

import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
} from "firebase/auth";
import { getFirebaseAuth } from "./config";

let recaptchaVerifier: RecaptchaVerifier | null = null;
let confirmationResult: ConfirmationResult | null = null;

/**
 * Setup invisible reCAPTCHA verifier and pre-render it.
 * Must be called (and awaited) before sending OTP.
 * @param containerId - ID of the DOM element for reCAPTCHA (invisible)
 */
export async function setupRecaptcha(containerId: string): Promise<boolean> {
  const auth = getFirebaseAuth();
  if (!auth) {
    console.error("[Firebase] Auth not initialized — cannot setup reCAPTCHA");
    return false;
  }

  try {
    // Clear existing verifier
    if (recaptchaVerifier) {
      try {
        recaptchaVerifier.clear();
      } catch {
        // Ignore clear errors
      }
      recaptchaVerifier = null;
    }

    // Check that DOM element exists
    const container = document.getElementById(containerId);
    if (!container) {
      console.error("[Firebase] reCAPTCHA container not found:", containerId);
      return false;
    }

    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: "invisible",
      callback: () => {
        console.log("[Firebase] reCAPTCHA solved");
      },
      "expired-callback": () => {
        console.warn("[Firebase] reCAPTCHA expired — will re-verify on next send");
      },
    });

    // Pre-render the reCAPTCHA so it's ready when signInWithPhoneNumber is called
    await recaptchaVerifier.render();
    console.log("[Firebase] reCAPTCHA rendered successfully");

    return true;
  } catch (err) {
    console.error("[Firebase] reCAPTCHA setup error:", err);
    recaptchaVerifier = null;
    return false;
  }
}

/**
 * Send OTP via Firebase Phone Auth.
 * @param phone - Egyptian phone number in local format (01XXXXXXXXX)
 * @returns true if OTP sent successfully
 */
export async function sendFirebaseOTP(phone: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const auth = getFirebaseAuth();
  if (!auth) {
    return { success: false, error: "Firebase Auth مش متفعّل" };
  }

  if (!recaptchaVerifier) {
    return { success: false, error: "reCAPTCHA مش جاهز — جرب تاني" };
  }

  try {
    // Convert to international format: +201XXXXXXXXX
    const intlPhone = `+2${phone}`;
    console.log("[Firebase] Sending OTP to", intlPhone);

    confirmationResult = await signInWithPhoneNumber(
      auth,
      intlPhone,
      recaptchaVerifier,
    );

    console.log("[Firebase] OTP sent successfully");
    return { success: true };
  } catch (err: unknown) {
    console.error("[Firebase] Send OTP error:", err);

    const errorCode = (err as { code?: string })?.code;
    const errorMessage = (err as { message?: string })?.message;
    console.error("[Firebase] Error code:", errorCode, "Message:", errorMessage);

    // After an error, reCAPTCHA verifier is consumed — clear it
    recaptchaVerifier = null;

    // User-friendly Arabic error messages
    if (errorCode === "auth/too-many-requests") {
      return { success: false, error: "طلبات كتير. استنى شوية وجرب تاني" };
    }
    if (errorCode === "auth/invalid-phone-number") {
      return { success: false, error: "رقم الموبايل مش صحيح" };
    }
    if (errorCode === "auth/quota-exceeded") {
      return { success: false, error: "الحد المجاني خلص. جرب وقت تاني" };
    }
    if (errorCode === "auth/captcha-check-failed") {
      return { success: false, error: "فشل التحقق من reCAPTCHA — جرب تاني" };
    }
    if (errorCode === "auth/network-request-failed") {
      return { success: false, error: "مشكلة في الاتصال. تأكد من الإنترنت" };
    }

    return { success: false, error: `حصلت مشكلة: ${errorCode || errorMessage || "خطأ غير معروف"}` };
  }
}

/**
 * Verify OTP code via Firebase.
 * @param code - 6-digit OTP code
 * @returns Firebase ID token on success
 */
export async function verifyFirebaseOTP(code: string): Promise<{
  success: boolean;
  idToken?: string;
  error?: string;
}> {
  if (!confirmationResult) {
    return { success: false, error: "اطلب كود جديد الأول" };
  }

  try {
    const result = await confirmationResult.confirm(code);
    const idToken = await result.user.getIdToken();

    console.log("[Firebase] OTP verified successfully");
    return { success: true, idToken };
  } catch (err: unknown) {
    console.error("[Firebase] Verify OTP error:", err);

    const errorCode = (err as { code?: string })?.code;

    if (errorCode === "auth/invalid-verification-code") {
      return { success: false, error: "الكود غلط. اتأكد وجرب تاني" };
    }
    if (errorCode === "auth/code-expired") {
      return { success: false, error: "الكود انتهت صلاحيته. اطلب كود جديد" };
    }

    return { success: false, error: "حصلت مشكلة في التحقق. جرب تاني" };
  }
}

/** Cleanup reCAPTCHA on unmount */
export function cleanupRecaptcha(): void {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      // Ignore clear errors
    }
    recaptchaVerifier = null;
  }
  confirmationResult = null;
}
