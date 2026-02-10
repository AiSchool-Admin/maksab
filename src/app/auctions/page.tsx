"use client";

import { useState, useEffect, useCallback } from "react";
import { Gavel, SlidersHorizontal, Home } from "lucide-react";
import Link from "next/link";
import AdCard from "@/components/ad/AdCard";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import { supabase } from "@/lib/supabase/client";
import type { AdSummary } from "@/lib/ad-data";

type SortOption = "ending_soon" | "newest" | "most_bids" | "price_asc" | "price_desc";
type StatusFilter = "active" | "ended" | "all";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "ending_soon", label: "ينتهي قريباً" },
  { value: "newest", label: "الأحدث" },
  { value: "price_asc", label: "الأقل سعراً" },
  { value: "price_desc", label: "الأعلى سعراً" },
];

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "active", label: "نشطة" },
  { value: "ended", label: "منتهية" },
  { value: "all", label: "الكل" },
];

interface AuctionAd extends AdSummary {
  auctionStartPrice?: number;
  auctionStatus?: string;
}

function rowToAuctionAd(row: Record<string, unknown>): AuctionAd {
  const categoryFields = (row.category_fields as Record<string, unknown>) ?? {};
  return {
    id: row.id as string,
    title: row.title as string,
    price: row.auction_start_price ? Number(row.auction_start_price) : null,
    saleType: "auction",
    image: ((row.images as string[]) ?? [])[0] ?? null,
    governorate: (row.governorate as string) ?? null,
    city: (row.city as string) ?? null,
    createdAt: row.created_at as string,
    auctionHighestBid: row.auction_start_price
      ? Number(row.auction_start_price)
      : undefined,
    auctionEndsAt: (row.auction_ends_at as string) ?? undefined,
    auctionStartPrice: row.auction_start_price
      ? Number(row.auction_start_price)
      : undefined,
    auctionStatus: (row.auction_status as string) ?? undefined,
    isLiveAuction: Boolean(categoryFields.is_live_auction),
  };
}

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<AuctionAd[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("ending_soon");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [showFilters, setShowFilters] = useState(false);

  const fetchAuctions = useCallback(async () => {
    setIsLoading(true);

    try {
      let query = supabase
        .from("ads" as never)
        .select("*")
        .eq("sale_type", "auction");

      // Status filter
      if (statusFilter === "active") {
        query = query.eq("auction_status", "active");
      } else if (statusFilter === "ended") {
        query = query.neq("auction_status", "active");
      }

      // Sort
      switch (sortBy) {
        case "ending_soon":
          query = query.order("auction_ends_at", { ascending: true });
          break;
        case "newest":
          query = query.order("created_at", { ascending: false });
          break;
        case "price_asc":
          query = query.order("auction_start_price", { ascending: true });
          break;
        case "price_desc":
          query = query.order("auction_start_price", { ascending: false });
          break;
        default:
          query = query.order("auction_ends_at", { ascending: true });
      }

      query = query.limit(50);

      const { data, error } = await query;

      if (error || !data) {
        setAuctions([]);
      } else {
        let ads = (data as Record<string, unknown>[]).map(rowToAuctionAd);

        // Client-side: fetch bid counts for each auction
        if (ads.length > 0) {
          const adIds = ads.map((a) => a.id);
          const { data: bidsData } = await supabase
            .from("auction_bids" as never)
            .select("ad_id, amount")
            .in("ad_id", adIds)
            .order("amount", { ascending: false });

          if (bidsData) {
            const bidMap = new Map<string, { count: number; highest: number }>();
            for (const b of bidsData as Record<string, unknown>[]) {
              const adId = b.ad_id as string;
              const existing = bidMap.get(adId);
              if (!existing) {
                bidMap.set(adId, { count: 1, highest: Number(b.amount) });
              } else {
                existing.count++;
              }
            }

            ads = ads.map((a) => {
              const bidInfo = bidMap.get(a.id);
              if (bidInfo) {
                return {
                  ...a,
                  auctionHighestBid: bidInfo.highest,
                  auctionBidsCount: bidInfo.count,
                };
              }
              return a;
            });
          }

          // Sort by most_bids client-side
          if (sortBy === "most_bids") {
            ads.sort(
              (a, b) => (b.auctionBidsCount ?? 0) - (a.auctionBidsCount ?? 0),
            );
          }
        }

        setAuctions(ads);
      }
    } catch {
      setAuctions([]);
    }

    setIsLoading(false);
  }, [sortBy, statusFilter]);

  useEffect(() => {
    fetchAuctions();
  }, [fetchAuctions]);

  // Count active vs ended
  const activeCount = auctions.filter(
    (a) =>
      a.auctionStatus === "active" &&
      a.auctionEndsAt &&
      new Date(a.auctionEndsAt).getTime() > Date.now(),
  ).length;

  return (
    <main className="min-h-screen bg-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-light">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-dark flex items-center gap-2">
              <Gavel size={22} className="text-brand-gold" />
              المزادات
            </h1>
            <div className="flex items-center gap-1">
              <Link
                href="/"
                className="p-2 text-brand-green hover:text-brand-green-dark hover:bg-green-50 rounded-lg transition-colors"
                aria-label="الرئيسية"
              >
                <Home size={18} />
              </Link>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors ${
                  showFilters
                    ? "bg-brand-green-light text-brand-green"
                    : "text-gray-text hover:bg-gray-light"
                }`}
              >
                <SlidersHorizontal size={18} />
              </button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-4 text-xs text-gray-text">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
              {activeCount} مزاد نشط
            </span>
            <span>{auctions.length} مزاد إجمالي</span>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="px-4 pb-3 space-y-3 border-t border-gray-light pt-3">
            {/* Status filter */}
            <div>
              <span className="text-xs font-semibold text-dark mb-1.5 block">
                الحالة
              </span>
              <div className="flex gap-2">
                {statusFilters.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setStatusFilter(f.value)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      statusFilter === f.value
                        ? "bg-brand-green text-white"
                        : "bg-gray-light text-gray-text hover:bg-gray-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div>
              <span className="text-xs font-semibold text-dark mb-1.5 block">
                ترتيب حسب
              </span>
              <div className="flex flex-wrap gap-2">
                {sortOptions.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSortBy(s.value)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      sortBy === s.value
                        ? "bg-brand-gold text-white"
                        : "bg-gray-light text-gray-text hover:bg-gray-200"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="px-4 py-4">
        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-[4/3] rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && auctions.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔨</div>
            <h2 className="text-lg font-bold text-dark mb-2">
              مفيش مزادات{" "}
              {statusFilter === "active" ? "نشطة" : ""}
              {" "}دلوقتي
            </h2>
            <p className="text-sm text-gray-text mb-6">
              جرب تنشر إعلان مزاد جديد أو ارجع بعدين
            </p>
          </div>
        )}

        {/* Auctions grid */}
        {!isLoading && auctions.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {auctions.map((auction) => (
              <AdCard
                key={auction.id}
                id={auction.id}
                title={auction.title}
                price={auction.price}
                saleType="auction"
                image={auction.image}
                governorate={auction.governorate}
                city={auction.city}
                createdAt={auction.createdAt}
                auctionHighestBid={auction.auctionHighestBid}
                auctionEndsAt={auction.auctionEndsAt}
                auctionBidsCount={auction.auctionBidsCount}
                isLiveAuction={auction.isLiveAuction}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNavWithBadge />
    </main>
  );
}
