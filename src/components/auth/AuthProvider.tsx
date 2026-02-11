"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  getCurrentUser,
  refreshCurrentUser,
  logout as logoutService,
  type UserProfile,
} from "@/lib/supabase/auth";
import { supabase } from "@/lib/supabase/client";
import { trackPresence, cleanupAllChannels } from "@/lib/chat/realtime";
import { useAuthStore } from "@/stores/auth-store";
import AuthBottomSheet, { type AccountType } from "./AuthBottomSheet";

// ── Merchant pending flag ────────────────────────────────────────────
const MERCHANT_FLAG_KEY = "maksab_pending_merchant";

export function setPendingMerchant() {
  if (typeof window !== "undefined") localStorage.setItem(MERCHANT_FLAG_KEY, "1");
}
export function clearPendingMerchant() {
  if (typeof window !== "undefined") localStorage.removeItem(MERCHANT_FLAG_KEY);
}
export function isPendingMerchant(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MERCHANT_FLAG_KEY) === "1";
}

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  /** Opens the auth bottom sheet. Returns a promise that resolves to the user
   *  if login succeeds, or null if the sheet is dismissed. */
  requireAuth: () => Promise<UserProfile | null>;
  /** Refreshes the user profile from the server */
  refreshUser: () => Promise<void>;
  /** Logs out the current user */
  logout: () => Promise<void>;
  /** Directly set user (for post-login updates) */
  setUser: (user: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  // Store resolve callback so we can resolve the promise when login completes
  const [authResolve, setAuthResolve] = useState<
    ((user: UserProfile | null) => void) | null
  >(null);
  const presenceCleanupRef = useRef<(() => void) | null>(null);

  // Sync AuthProvider state → Zustand store so dashboard pages (using useAuthStore) stay in sync
  const zustandSetUser = useAuthStore((s) => s.setUser);
  const zustandSetLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    if (user) {
      zustandSetUser({
        id: user.id,
        phone: user.phone,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        governorate: user.governorate,
        city: user.city,
        seller_type: user.seller_type,
        store_id: user.store_id,
      });
    } else if (!isLoading) {
      zustandSetUser(null);
    }
  }, [user, isLoading, zustandSetUser]);

  useEffect(() => {
    zustandSetLoading(isLoading);
  }, [isLoading, zustandSetLoading]);

  // Load current user on mount + listen for auth state changes
  useEffect(() => {
    getCurrentUser()
      .then((u) => setUser(u))
      .finally(() => setIsLoading(false));

    // Listen for auth state changes (session restore, token refresh, sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_OUT") {
          setUser(null);
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          // Refresh user profile when session is restored or token refreshed
          getCurrentUser().then((u) => {
            if (u) setUser(u);
          });
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  // Track online presence when user is logged in
  useEffect(() => {
    if (user?.id) {
      presenceCleanupRef.current = trackPresence(user.id);
    } else {
      presenceCleanupRef.current?.();
      presenceCleanupRef.current = null;
    }

    return () => {
      presenceCleanupRef.current?.();
      presenceCleanupRef.current = null;
    };
  }, [user?.id]);

  // Force merchants without a store to create one
  useEffect(() => {
    if (isLoading || !user) return;

    const needsStore =
      // New merchant (just registered with "merchant" account type)
      (isPendingMerchant() && !user.store_id) ||
      // Returning merchant (seller_type is "store" but no store_id)
      (user.seller_type === "store" && !user.store_id);

    if (needsStore && pathname !== "/store/create") {
      router.replace("/store/create");
    }

    // If the user now has a store_id, clear the pending flag
    if (user.store_id && isPendingMerchant()) {
      clearPendingMerchant();
    }
  }, [isLoading, user, pathname, router]);

  const requireAuth = useCallback((): Promise<UserProfile | null> => {
    // Already logged in → return immediately
    if (user) return Promise.resolve(user);

    // Open the auth bottom sheet and return a promise
    return new Promise<UserProfile | null>((resolve) => {
      setAuthResolve(() => resolve);
      setShowAuth(true);
    });
  }, [user]);

  const handleAuthSuccess = useCallback(
    (loggedInUser: UserProfile, accountType: AccountType) => {
      setUser(loggedInUser);
      setShowAuth(false);
      authResolve?.(loggedInUser);
      setAuthResolve(null);

      // If merchant and doesn't already have a store, mark as pending and redirect
      if (accountType === "merchant" && !loggedInUser.store_id) {
        setPendingMerchant();
        router.push("/store/create");
      }
    },
    [authResolve, router],
  );

  const handleAuthClose = useCallback(() => {
    setShowAuth(false);
    authResolve?.(null);
    setAuthResolve(null);
  }, [authResolve]);

  const refreshUser = useCallback(async () => {
    const u = await refreshCurrentUser();
    setUser(u);
  }, []);

  const handleLogout = useCallback(async () => {
    cleanupAllChannels();
    clearPendingMerchant();
    await logoutService();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        requireAuth,
        refreshUser,
        logout: handleLogout,
        setUser,
      }}
    >
      {children}
      <AuthBottomSheet
        isOpen={showAuth}
        onClose={handleAuthClose}
        onSuccess={handleAuthSuccess}
      />
    </AuthContext.Provider>
  );
}
