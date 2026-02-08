"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    async function doLogout() {
      // Clear ALL local storage
      if (typeof window !== "undefined") {
        localStorage.removeItem("maksab_dev_session");
        localStorage.removeItem("maksab_draft");
        // Clear any Supabase auth tokens
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.startsWith("sb-") || key.includes("supabase")) {
            localStorage.removeItem(key);
          }
        }
      }

      // Sign out from Supabase
      await supabase.auth.signOut();

      // Redirect to login
      router.replace("/login");
    }

    doLogout();
  }, [router]);

  return (
    <main className="min-h-screen bg-white flex items-center justify-center" dir="rtl">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-text">جاري تسجيل الخروج...</p>
      </div>
    </main>
  );
}
