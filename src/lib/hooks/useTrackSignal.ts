"use client";

import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";

interface SignalData {
  signal_type: "search" | "view" | "favorite" | "ad_created" | "bid_placed" | "chat_initiated";
  category_id?: string;
  subcategory_id?: string;
  ad_id?: string;
  signal_data?: Record<string, unknown>;
  governorate?: string;
  weight: number;
}

export function useTrackSignal() {
  const user = useAuthStore((state) => state.user);

  const track = async (signal: SignalData) => {
    if (!user) return;

    // Fire and forget — don't block UI
    // Note: user_signals table will be added to Database types when Supabase schema is set up
    supabase
      .from("user_signals" as never)
      .insert({
        user_id: user.id,
        ...signal,
      } as never)
      .then();
  };

  return { track };
}
