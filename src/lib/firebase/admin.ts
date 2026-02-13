/**
 * Firebase Admin SDK — Server-side only
 *
 * Used to verify Firebase ID tokens after client-side Phone Auth.
 * Initialized lazily with service account credentials from env vars.
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

/** Check if Firebase Admin is configured */
export function isFirebaseAdminConfigured(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
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
 * Verify a Firebase ID token and extract the phone number.
 * @param idToken - Firebase ID token from client
 * @returns Phone number (Egyptian local format: 01XXXXXXXXX) or null
 */
export async function verifyFirebaseToken(
  idToken: string,
): Promise<{ phone: string | null; error?: string }> {
  const auth = getAdminAuth();
  if (!auth) {
    return { phone: null, error: "Firebase Admin مش متفعّل" };
  }

  try {
    const decoded = await auth.verifyIdToken(idToken);

    if (!decoded.phone_number) {
      return { phone: null, error: "التوكن مفيهوش رقم موبايل" };
    }

    // Convert from +201XXXXXXXXX to 01XXXXXXXXX
    let phone = decoded.phone_number;
    if (phone.startsWith("+20")) {
      phone = "0" + phone.slice(3);
    } else if (phone.startsWith("20")) {
      phone = "0" + phone.slice(2);
    }

    // Validate Egyptian format
    if (!/^01[0125]\d{8}$/.test(phone)) {
      return { phone: null, error: "رقم الموبايل مش مصري" };
    }

    return { phone };
  } catch (err) {
    console.error("[Firebase Admin] Token verification error:", err);
    return { phone: null, error: "التوكن مش صحيح أو انتهت صلاحيته" };
  }
}
