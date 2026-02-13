/**
 * Firebase Client Configuration
 *
 * Used for Firebase Phone Auth (10,000 free SMS verifications/month).
 * Only initialized when Firebase env vars are present.
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** Check if Firebase is configured */
export function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId
  );
}

/** Get Firebase app (lazy init) */
export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;

  if (!firebaseApp) {
    const existing = getApps();
    firebaseApp = existing.length > 0 ? existing[0] : initializeApp(firebaseConfig);
  }

  return firebaseApp;
}

/** Get Firebase Auth instance (lazy init) */
export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;

  if (!firebaseAuth) {
    firebaseAuth = getAuth(app);
    firebaseAuth.languageCode = "ar"; // Arabic SMS messages
  }

  return firebaseAuth;
}
