/**
 * Firebase Phone Auth Helper
 *
 * Handles the client-side Firebase Phone Auth flow:
 * 1. Setup invisible reCAPTCHA
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
 * Setup invisible reCAPTCHA verifier.
 * Must be called once before sending OTP.
 * @param containerId - ID of the DOM element for reCAPTCHA (invisible)
 */
export function setupRecaptcha(containerId: string): boolean {
  const auth = getFirebaseAuth();
  if (!auth) return false;

  try {
    // Clear existing verifier
    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
      recaptchaVerifier = null;
    }

    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: "invisible",
      callback: () => {
        // reCAPTCHA solved — will proceed with phone auth
      },
    });

    return true;
  } catch (err) {
    console.error("[Firebase] reCAPTCHA setup error:", err);
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
  if (!auth || !recaptchaVerifier) {
    return { success: false, error: "Firebase مش متفعّل" };
  }

  try {
    // Convert to international format: +201XXXXXXXXX
    const intlPhone = `+2${phone}`;

    confirmationResult = await signInWithPhoneNumber(
      auth,
      intlPhone,
      recaptchaVerifier,
    );

    return { success: true };
  } catch (err: unknown) {
    console.error("[Firebase] Send OTP error:", err);

    const errorCode = (err as { code?: string })?.code;

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

    return { success: false, error: "حصلت مشكلة في إرسال الكود. جرب تاني" };
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
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
  confirmationResult = null;
}
