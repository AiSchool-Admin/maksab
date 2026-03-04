"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Home,
  User,
  Calendar,
  Star,
  MapPin,
  Package,
} from "lucide-react";
import Image from "next/image";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import AdCard from "@/components/ad/AdCard";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import VerificationBadge, { TrustedSellerBadge } from "@/components/verification/VerificationBadge";
import LoyaltyBadge from "@/components/loyalty/LoyaltyBadge";
import SellerRatingSummaryComponent from "@/components/reviews/SellerRatingSummary";
import { supabase } from "@/lib/supabase/client";
import { formatTimeAgo } from "@/lib/utils/format";
import { getCategoryById } from "@/lib/categories/categories-config";
import { generateAutoTitle } from "@/lib/categories/generate";
import type { AdSummary } from "@/lib/ad-data";

interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  governorate: string | null;
  city: string | null;
  bio: string | null;
  rating: number;
  totalAds: number;
  memberSince: string;
  isCommissionSupporter: boolean;
  sellerType: "individual" | "store";
  storeId: string | null;
}

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ads, setAds] = useState<AdSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [adsError, setAdsError] = useState(false);
  const [verificationLevel, setVerificationLevel] = useState<"basic" | "verified" | "premium">("basic");
  const [isTrusted, setIsTrusted] = useState(false);
  const [loyaltyLevel, setLoyaltyLevel] = useState<"member" | "silver" | "gold" | "diamond">("member");

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      try {
        // Fetch user profile
        const { data: userData, error: userError } = await supabase
          .from("profiles" as never)
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (userError || !userData) {
          setNotFound(true);
          setIsLoading(false);
          return;
        }

        const u = userData as Record<string, unknown>;
        setProfile({
          id: u.id as string,
          displayName: (u.display_name as string) || "مستخدم مكسب",
          avatarUrl: u.avatar_url as string | null,
          governorate: u.governorate as string | null,
          city: u.city as string | null,
          bio: u.bio as string | null,
          rating: (u.rating as number) || 0,
          totalAds: (u.total_ads_count as number) || 0,
          memberSince: u.created_at as string,
          isCommissionSupporter: (u.is_commission_supporter as boolean) || false,
          sellerType: (u.seller_type as "individual" | "store") || "individual",
          storeId: (u.store_id as string) || null,
        });

        // Fetch user's active ads
        const { data: adsData, error: adsError } = await supabase
          .from("ads" as never)
          .select("*")
          .eq("user_id", id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(20);

        if (adsError) {
          setAdsError(true);
        } else if (adsData) {
          setAds(
            (adsData as Record<string, unknown>[]).map((row) => {
              const categoryFields = (row.category_fields as Record<string, unknown>) ?? {};
              const categoryId = (row.category_id as string) || "";
              const subcategoryId = (row.subcategory_id as string) || undefined;

              // Resolve title using Arabic category labels
              let title = row.title as string;
              if (categoryId) {
                const config = getCategoryById(categoryId);
                if (config) {
                  const generated = generateAutoTitle(config, categoryFields, subcategoryId);
                  if (generated) title = generated;
                }
              }

              return {
                id: row.id as string,
                title,
                price: row.price ? Number(row.price) : null,
                saleType: row.sale_type as "cash" | "auction" | "exchange",
                image: ((row.images as string[]) || [])[0] || null,
                governorate: (row.governorate as string) || null,
                city: (row.city as string) || null,
                createdAt: row.created_at as string,
                isNegotiable: (row.is_negotiable as boolean) || false,
                auctionHighestBid: row.auction_start_price ? Number(row.auction_start_price) : undefined,
                auctionEndsAt: (row.auction_ends_at as string) || undefined,
                auctionBidsCount: undefined,
                exchangeDescription: (row.exchange_description as string) || undefined,
                isFavorited: false,
                categoryId: categoryId || undefined,
                useDayPrice: Boolean(categoryFields.use_day_price),
                isLiveAuction: Boolean(categoryFields.is_live_auction),
              };
            }),
          );
        }

        // Load seller metadata in parallel
        Promise.allSettled([
          import("@/lib/verification/verification-service").then(
            ({ getUserVerificationProfile }) =>
              getUserVerificationProfile(id).then((p) => {
                setVerificationLevel(p.level);
              }),
          ),
          import("@/lib/reviews/reviews-service").then(
            ({ getSellerRatingSummary }) =>
              getSellerRatingSummary(id).then((s) => {
                setIsTrusted(s.isTrustedSeller);
              }),
          ),
          import("@/lib/loyalty/loyalty-service").then(
            ({ getUserLoyaltyProfile }) => {
              const lp = getUserLoyaltyProfile(id);
              setLoyaltyLevel(lp.currentLevel);
            },
          ),
        ]).catch(() => {});

        setIsLoading(false);
      } catch {
        setNotFound(true);
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [id]);

  if (notFound && !isLoading) {
    return (
      <main className="min-h-screen bg-white pb-20">
        <header className="sticky top-0 z-50 bg-white border-b border-gray-light">
          <div className="flex items-center px-4 h-14 gap-2">
            <button onClick={() => router.back()} className="p-1 text-gray-text" aria-label="رجوع">
              <ChevronRight size={24} />
            </button>
            <Link href="/" className="p-1.5 text-brand-green rounded-full" aria-label="الرئيسية">
              <Home size={18} />
            </Link>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-3xl font-bold text-dark mb-2">المستخدم مش موجود</h2>
          <p className="text-sm text-gray-text mb-6">
            الحساب ده ممكن يكون اتحذف أو مش متاح
          </p>
          <Link
            href="/"
            className="bg-brand-green text-white font-bold py-3 px-8 rounded-xl hover:bg-brand-green-dark transition-colors"
          >
            الصفحة الرئيسية
          </Link>
        </div>
        <BottomNavWithBadge />
      </main>
    );
  }

  if (isLoading || !profile) {
    return (
      <main className="min-h-screen bg-white pb-20">
        <div className="px-4 py-6 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  const memberYear = new Date(profile.memberSince).getFullYear();

  return (
    <main className="min-h-screen bg-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-light">
        <div className="flex items-center px-4 h-14 gap-2">
          <button onClick={() => router.back()} className="p-1 text-gray-text" aria-label="رجوع">
            <ChevronRight size={24} />
          </button>
          <Link href="/" className="p-1.5 text-brand-green rounded-full" aria-label="الرئيسية">
            <Home size={18} />
          </Link>
          <h1 className="text-xl font-bold text-dark flex-1">{profile.displayName}</h1>
        </div>
      </header>

      <div className="px-4 py-5 space-y-6">
        {/* Profile card */}
        <div className="bg-gray-light rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-green-light flex items-center justify-center text-brand-green flex-shrink-0 overflow-hidden">
              {profile.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  width={64}
                  height={64}
                  className="w-full h-full rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <User size={28} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <h2 className="text-2xl font-bold text-dark">{profile.displayName}</h2>
                <VerificationBadge level={verificationLevel} />
                <LoyaltyBadge level={loyaltyLevel} size="sm" />
                {isTrusted && <TrustedSellerBadge />}
                {profile.isCommissionSupporter && (
                  <span className="text-[10px] bg-brand-green-light text-brand-green font-bold px-1.5 py-0.5 rounded-full">
                    داعم مكسب 💚
                  </span>
                )}
              </div>
              {(profile.governorate || profile.city) && (
                <p className="text-xs text-gray-text flex items-center gap-1">
                  <MapPin size={12} />
                  {profile.governorate}
                  {profile.city ? ` — ${profile.city}` : ""}
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-1.5 text-xs text-gray-text">
              <Calendar size={12} />
              <span>عضو منذ {memberYear}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-text">
              <Package size={12} />
              <span>{profile.totalAds} إعلان</span>
            </div>
            {profile.rating > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <Star size={12} className="text-brand-gold fill-brand-gold" />
                <span className="font-bold text-dark">{profile.rating}</span>
              </div>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-gray-text mt-3 leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Store link */}
          {profile.sellerType === "store" && profile.storeId && (
            <Link
              href={`/store/${profile.storeId}`}
              className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 text-sm font-bold text-brand-green hover:text-brand-green-dark transition-colors"
            >
              <span className="text-lg">🏪</span>
              زيارة المتجر
              <ChevronRight size={14} className="rotate-180 ms-auto" />
            </Link>
          )}
        </div>

        {/* Reviews */}
        <SellerRatingSummaryComponent sellerId={id} />

        {/* User's ads */}
        <div>
          <h3 className="text-sm font-bold text-dark mb-3 flex items-center gap-2">
            <Package size={16} className="text-brand-green" />
            إعلانات {profile.displayName}
          </h3>

          {adsError ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">⚠️</p>
              <p className="text-sm text-gray-text">حصل مشكلة في تحميل الإعلانات. جرب تاني</p>
            </div>
          ) : ads.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {ads.map((ad) => (
                <AdCard key={ad.id} {...ad} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">📦</p>
              <p className="text-sm text-gray-text">مفيش إعلانات نشطة حالياً</p>
            </div>
          )}
        </div>
      </div>

      <BottomNavWithBadge />
    </main>
  );
}
