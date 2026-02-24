/**
 * Firebase Admin SDK — Server-side only
 *
 * Used to verify Firebase ID tokens after client-side Phone Auth.
 *
 * Two verification modes:
 * 1. Full Admin SDK (requires service account credentials) — most secure
 * 2. REST API fallback (requires only FIREBASE_PROJECT_ID) — verifies token
 *    via Google's public tokeninfo endpoint when service account is not available
 */

import {
  initializeApp,
  getApps,
  cert,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

let adminApp: App | null = null;
let adminAuth: Auth | null = null;

/** Check if full Firebase Admin SDK is configured (with service account) */
export function isFirebaseAdminConfigured(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

/** Check if at least project ID is available for REST fallback */
function isFirebaseProjectConfigured(): boolean {
  return !!process.env.FIREBASE_PROJECT_ID;
}

/** Get Firebase Admin app (lazy init) */
function getAdminApp(): App | null {
  if (!isFirebaseAdminConfigured()) return null;

  if (!adminApp) {
    const existing = getApps();
    if (existing.length > 0) {
      adminApp = existing[0];
    } else {
      adminApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Private key comes with escaped \n — replace them
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });
    }
  }

  return adminApp;
}

/** Get Firebase Admin Auth instance */
function getAdminAuth(): Auth | null {
  const app = getAdminApp();
  if (!app) return null;

  if (!adminAuth) {
    adminAuth = getAuth(app);
  }

  return adminAuth;
}

/**
 * Extract phone number from a Firebase ID token string.
 * Normalizes to Egyptian local format (01XXXXXXXXX).
 */
function normalizeFirebasePhone(phoneNumber: string): string | null {
  let phone = phoneNumber;
  if (phone.startsWith("+20")) {
    phone = "0" + phone.slice(3);
  } else if (phone.startsWith("20")) {
    phone = "0" + phone.slice(2);
  }

  if (!/^01[0125]\d{8}$/.test(phone)) {
    return null;
  }

  return phone;
}

/**
 * Verify a Firebase ID token and extract the phone number.
 *
 * Strategy:
 * 1. Try Admin SDK (if service account configured) — full verification
 * 2. Fallback to Google's REST API — verifies token signature via Google servers
 *
 * @param idToken - Firebase ID token from client
 * @returns Phone number (Egyptian local format: 01XXXXXXXXX) or error
 */
export async function verifyFirebaseToken(
  idToken: string,
): Promise<{ phone: string | null; error?: string }> {
  // Strategy 1: Full Admin SDK verification
  const auth = getAdminAuth();
  if (auth) {
    try {
      const decoded = await auth.verifyIdToken(idToken);

      if (!decoded.phone_number) {
        return { phone: null, error: "التوكن مفيهوش رقم موبايل" };
      }

      const phone = normalizeFirebasePhone(decoded.phone_number);
      if (!phone) {
        return { phone: null, error: "رقم الموبايل مش مصري" };
      }

      return { phone };
    } catch (err) {
      console.error("[Firebase Admin] Token verification error:", err);
      return { phone: null, error: "التوكن مش صحيح أو انتهت صلاحيته" };
    }
  }

  // Strategy 2: REST API fallback (no service account needed)
  if (isFirebaseProjectConfigured()) {
    return verifyTokenViaREST(idToken);
  }

  return { phone: null, error: "Firebase Admin مش متفعّل" };
}

/**
 * Verify Firebase ID token via Google's secure token verification API.
 * This doesn't require a service account — just the project ID.
 *
 * Uses the Google OAuth2 tokeninfo-like approach:
 * POST to https://identitytoolkit.googleapis.com/v1/accounts:lookup
 * with the ID token to get the user's phone number.
 */
async function verifyTokenViaREST(
  idToken: string,
): Promise<{ phone: string | null; error?: string }> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    return { phone: null, error: "Firebase API key مش موجود" };
  }

  try {
    // Use Firebase Auth REST API to get account info from ID token
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
      console.error("[Firebase REST] Verification failed:", errorMsg);

      if (errorMsg === "INVALID_ID_TOKEN" || errorMsg === "TOKEN_EXPIRED") {
        return { phone: null, error: "الكود انتهت صلاحيته. اطلب كود جديد" };
      }

      return { phone: null, error: "التحقق من Firebase فشل" };
    }

    const data = await response.json();
    const user = data.users?.[0];

    if (!user) {
      return { phone: null, error: "مفيش بيانات مستخدم في التوكن" };
    }

    const phoneNumber = user.phoneNumber;
    if (!phoneNumber) {
      return { phone: null, error: "التوكن مفيهوش رقم موبايل" };
    }

    const phone = normalizeFirebasePhone(phoneNumber);
    if (!phone) {
      return { phone: null, error: "رقم الموبايل مش مصري" };
    }

    console.log("[Firebase REST] Token verified successfully for", phone);
    return { phone };
  } catch (err) {
    console.error("[Firebase REST] Network error:", err);
    return { phone: null, error: "حصلت مشكلة في التحقق من Firebase" };
  }
}
