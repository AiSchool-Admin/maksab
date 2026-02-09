"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2 } from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import AdCard from "@/components/ad/AdCard";
import EmptyState from "@/components/ui/EmptyState";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import type { MockAd } from "@/lib/mock-data";

const FAVORITES_KEY = "maksab_favorites";

/** Get favorites from localStorage (works for both dev & real users) */
function getLocalFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalFavorites(ids: string[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  }
}

export default function FavoritesPage() {
  const { user, isLoading: authLoading, requireAuth } = useAuth();
  const [favorites, setFavorites] = useState<MockAd[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites
  useEffect(() => {
    loadFavorites();
  }, [user]);

  async function loadFavorites() {
    setIsLoading(true);
    const localIds = getLocalFavorites();

    if (localIds.length === 0) {
      setFavorites([]);
      setFavoriteIds(new Set());
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("ads" as never)
        .select("*")
        .in("id", localIds)
        .order("created_at", { ascending: false });

      if (error || !data) {
        setFavorites([]);
        setIsLoading(false);
        return;
      }

      const ads = (data as Record<string, unknown>[]).map((row): MockAd => ({
        id: row.id as string,
        title: row.title as string,
        price: row.price ? Number(row.price) : null,
        saleType: row.sale_type as MockAd["saleType"],
        image: ((row.images as string[]) ?? [])[0] ?? null,
        governorate: (row.governorate as string) ?? null,
        city: (row.city as string) ?? null,
        createdAt: row.created_at as string,
        isNegotiable: (row.is_negotiable as boolean) ?? false,
        auctionHighestBid: row.auction_start_price ? Number(row.auction_start_price) : undefined,
        auctionEndsAt: (row.auction_ends_at as string) ?? undefined,
        exchangeDescription: (row.exchange_description as string) ?? undefined,
        isFavorited: true,
      }));

      setFavorites(ads);
      setFavoriteIds(new Set(ads.map((a) => a.id)));
    } catch {
      setFavorites([]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleToggleFavorite = useCallback(
    (adId: string) => {
      const currentIds = getLocalFavorites();
      const newIds = currentIds.filter((id) => id !== adId);
      saveLocalFavorites(newIds);

      setFavorites((prev) => prev.filter((a) => a.id !== adId));
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(adId);
        return next;
      });
    },
    [],
  );

  return (
    <main className="min-h-screen bg-white pb-20">
      <Header title="المفضلة" showBack />

      {/* Clear all button */}
      {!isLoading && favorites.length > 0 && (
        <div className="flex justify-end px-4 py-2">
          <button
            onClick={() => {
              saveLocalFavorites([]);
              setFavorites([]);
              setFavoriteIds(new Set());
            }}
            className="flex items-center gap-1.5 text-xs text-error hover:text-red-700 transition-colors"
          >
            <Trash2 size={14} />
            مسح الكل
          </button>
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-2">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-gray-light rounded-xl skeleton" />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <EmptyState
            icon="💚"
            title="مفيش مفضلة لسه"
            description="لما تعجبك حاجة، اضغط على القلب ♡ وهتلاقيها هنا"
            actionLabel="تصفح الإعلانات"
            actionHref="/"
          />
        ) : (
          <>
            <p className="text-sm text-gray-text mb-3">
              {favorites.length} إعلان محفوظ
            </p>
            <div className="grid grid-cols-2 gap-3">
              {favorites.map((ad) => (
                <AdCard
                  key={ad.id}
                  {...ad}
                  isFavorited={true}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <BottomNavWithBadge />
    </main>
  );
}
