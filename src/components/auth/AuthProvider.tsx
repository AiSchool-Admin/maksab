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
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  logout as logoutService,
  type UserProfile,
} from "@/lib/supabase/auth";
import { supabase } from "@/lib/supabase/client";
import { trackPresence, cleanupAllChannels } from "@/lib/chat/realtime";
import AuthBottomSheet, { type AccountType } from "./AuthBottomSheet";

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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  // Store resolve callback so we can resolve the promise when login completes
  const [authResolve, setAuthResolve] = useState<
    ((user: UserProfile | null) => void) | null
  >(null);
  const presenceCleanupRef = useRef<(() => void) | null>(null);

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

      // If merchant and doesn't already have a store, redirect to store creation
      if (accountType === "merchant" && !loggedInUser.store_id) {
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
    const u = await getCurrentUser();
    setUser(u);
  }, []);

  const handleLogout = useCallback(async () => {
    cleanupAllChannels();
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
