"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Home, DoorOpen, SlidersHorizontal, PackageSearch } from "lucide-react";
import Link from "next/link";
import ShelfRow from "@/components/souk/ShelfRow";
import { Lantern } from "@/components/souk/AmbientEffects";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import { categoriesConfig, getCategoryById } from "@/lib/categories/categories-config";
import { supabase } from "@/lib/supabase/client";
import type { MockAd } from "@/lib/mock-data";

/** Store personality descriptions */
const storeVibes: Record<string, { greeting: string; emptyMsg: string }> = {
  cars: { greeting: "معرض السيارات الأول", emptyMsg: "مفيش سيارات معروضة حالياً" },
  real_estate: { greeting: "مكتب العقارات المعتمد", emptyMsg: "مفيش عقارات متاحة حالياً" },
  phones: { greeting: "أكبر تشكيلة موبايلات", emptyMsg: "مفيش موبايلات متاحة حالياً" },
  fashion: { greeting: "أحدث صيحات الموضة", emptyMsg: "مفيش ملابس معروضة حالياً" },
  scrap: { greeting: "بورصة الخردة والمعادن", emptyMsg: "مفيش خردة متاحة حالياً" },
  gold: { greeting: "محل المجوهرات والذهب", emptyMsg: "مفيش ذهب معروض حالياً" },
  luxury: { greeting: "أفخم الماركات العالمية", emptyMsg: "مفيش منتجات فاخرة حالياً" },
  appliances: { greeting: "معرض الأجهزة المنزلية", emptyMsg: "مفيش أجهزة متاحة حالياً" },
  furniture: { greeting: "أجمل تشكيلة أثاث", emptyMsg: "مفيش أثاث معروض حالياً" },
  hobbies: { greeting: "عالم الهوايات والرياضة", emptyMsg: "مفيش منتجات هوايات حالياً" },
  tools: { greeting: "كل العدد اللي محتاجها", emptyMsg: "مفيش عدد متاحة حالياً" },
  services: { greeting: "خدمات موثوقة ومحترفة", emptyMsg: "مفيش خدمات متاحة حالياً" },
};

/** Store accent colors for the interior */
const interiorColors: Record<string, { header: string; shelf: string }> = {
  cars: { header: "from-blue-700 to-blue-900", shelf: "from-blue-50 to-white" },
  real_estate: { header: "from-emerald-700 to-emerald-900", shelf: "from-emerald-50 to-white" },
  phones: { header: "from-purple-700 to-purple-900", shelf: "from-purple-50 to-white" },
  fashion: { header: "from-pink-600 to-pink-800", shelf: "from-pink-50 to-white" },
  scrap: { header: "from-amber-700 to-amber-900", shelf: "from-amber-50 to-white" },
  gold: { header: "from-yellow-600 to-yellow-800", shelf: "from-yellow-50 to-white" },
  luxury: { header: "from-slate-700 to-slate-900", shelf: "from-slate-50 to-white" },
  appliances: { header: "from-cyan-700 to-cyan-900", shelf: "from-cyan-50 to-white" },
  furniture: { header: "from-orange-700 to-orange-900", shelf: "from-orange-50 to-white" },
  hobbies: { header: "from-indigo-600 to-indigo-800", shelf: "from-indigo-50 to-white" },
  tools: { header: "from-stone-700 to-stone-900", shelf: "from-stone-50 to-white" },
  services: { header: "from-teal-700 to-teal-900", shelf: "from-teal-50 to-white" },
};

function rowToMockAd(row: Record<string, unknown>): MockAd {
  const cf = (row.category_fields as Record<string, unknown>) ?? {};
  return {
    id: row.id as string,
    title: row.title as string,
    price: row.price ? Number(row.price) : null,
    saleType: (row.sale_type as MockAd["saleType"]) || "cash",
    image: ((row.images as string[]) ?? [])[0] ?? null,
    governorate: (row.governorate as string) ?? null,
    city: (row.city as string) ?? null,
    createdAt: row.created_at as string,
    isNegotiable: row.is_negotiable as boolean,
    auctionHighestBid: row.auction_start_price ? Number(row.auction_start_price) : undefined,
    auctionEndsAt: (row.auction_ends_at as string) ?? undefined,
    exchangeDescription: (row.exchange_description as string) ?? undefined,
    isLiveAuction: Boolean(cf.is_live_auction),
  };
}

export default function StoreInteriorPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = use(params);
  const router = useRouter();
  const category = getCategoryById(categoryId);
  const [ads, setAds] = useState<MockAd[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);

  const colors = interiorColors[categoryId] || interiorColors.cars;
  const vibe = storeVibes[categoryId] || { greeting: "مرحباً", emptyMsg: "فاضي حالياً" };

  const fetchAds = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("ads" as never)
        .select("*")
        .eq("category_id", categoryId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(60);

      if (activeSubcategory) {
        query = query.eq("subcategory_id", activeSubcategory);
      }

      const { data } = await query;

      if (data && Array.isArray(data)) {
        setAds((data as Record<string, unknown>[]).map(rowToMockAd));
      } else {
        setAds([]);
      }
    } catch {
      setAds([]);
    }
    setIsLoading(false);
  }, [categoryId, activeSubcategory]);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  // Group ads by sale type for display on different "shelves"
  const cashAds = ads.filter((a) => a.saleType === "cash");
  const auctionAds = ads.filter((a) => a.saleType === "auction");
  const exchangeAds = ads.filter((a) => a.saleType === "exchange");

  if (!category) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">🚪</p>
          <p className="text-lg font-bold text-dark mb-2">المحل ده مش موجود</p>
          <Link href="/souk" className="text-brand-green text-sm font-semibold">
            ارجع للسوق
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen bg-gradient-to-b ${colors.shelf} pb-20`}>
      {/* ── Store header (entrance) ────────────────────── */}
      <header className={`sticky top-0 z-50 bg-gradient-to-b ${colors.header} text-white shadow-lg`}>
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <Link
              href="/souk"
              className="p-1 text-white/70 hover:text-white transition-colors flex items-center gap-1"
              aria-label="العودة للسوق"
            >
              <ChevronRight size={22} />
              <DoorOpen size={16} />
            </Link>
            <Link
              href="/"
              className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              aria-label="الرئيسية"
            >
              <Home size={16} />
            </Link>
          </div>

          <h1 className="text-base font-bold flex items-center gap-2">
            <span className="text-xl">{category.icon}</span>
            {category.name}
          </h1>

          <span className="text-xs text-white/60 font-medium">{ads.length} منتج</span>
        </div>

        {/* Store sign banner */}
        <div className="bg-black/20 px-4 py-2 text-center relative">
          <p className="text-white/80 text-xs">{vibe.greeting}</p>
          {/* Lanterns */}
          <div className="absolute top-0 start-3 scale-75 animate-lantern">
            <Lantern />
          </div>
          <div className="absolute top-0 end-3 scale-75 animate-lantern" style={{ animationDelay: "1.5s" }}>
            <Lantern />
          </div>
        </div>

        {/* Subcategory tabs (store sections/aisles) */}
        {category.subcategories.length > 1 && (
          <div className="bg-black/10 px-3 py-2 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveSubcategory(null)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeSubcategory === null
                    ? "bg-white text-dark"
                    : "bg-white/20 text-white/80 hover:bg-white/30"
                }`}
              >
                الكل
              </button>
              {category.subcategories.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setActiveSubcategory(sub.id)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    activeSubcategory === sub.id
                      ? "bg-white text-dark"
                      : "bg-white/20 text-white/80 hover:bg-white/30"
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ── Store interior (shelves with products) ──── */}
      <div className="px-3 pt-4 animate-gate-open">
        {isLoading ? (
          <StoreSkeleton />
        ) : ads.length === 0 ? (
          <div className="text-center py-16">
            <PackageSearch size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-bold text-dark mb-2">{vibe.emptyMsg}</p>
            <p className="text-sm text-gray-text mb-4">
              جرب تزور محلات تانية في السوق
            </p>
            <Link
              href="/souk"
              className="inline-block bg-brand-green text-white font-bold text-sm px-4 py-2 rounded-full"
            >
              🏪 ارجع للسوق
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Cash shelf */}
            {cashAds.length > 0 && (
              <ShelfRow
                ads={cashAds}
                shelfLabel={`💵 بيع نقدي (${cashAds.length})`}
              />
            )}

            {/* Auction shelf */}
            {auctionAds.length > 0 && (
              <ShelfRow
                ads={auctionAds}
                shelfLabel={`🔨 مزادات (${auctionAds.length})`}
              />
            )}

            {/* Exchange shelf */}
            {exchangeAds.length > 0 && (
              <ShelfRow
                ads={exchangeAds}
                shelfLabel={`🔄 تبديل (${exchangeAds.length})`}
              />
            )}

            {/* All products grid (below shelves) */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-4 bg-amber-600 rounded-full" />
                <span className="text-sm font-bold text-amber-900">
                  كل المنتجات ({ads.length})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {ads.map((ad) => (
                  <Link key={ad.id} href={`/ad/${ad.id}`} className="group">
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
                      <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                        {ad.image ? (
                          <img
                            src={ad.image}
                            alt={ad.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-gray-50 to-gray-200">
                            {category.icon}
                          </div>
                        )}
                        {/* Sale badge */}
                        <div className={`absolute top-2 start-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          ad.saleType === "cash" ? "bg-green-500 text-white" :
                          ad.saleType === "auction" ? "bg-amber-500 text-white" :
                          "bg-blue-500 text-white"
                        }`}>
                          {ad.saleType === "cash" ? "💵 نقدي" : ad.saleType === "auction" ? "🔨 مزاد" : "🔄 تبديل"}
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-semibold text-dark leading-tight line-clamp-2 mb-1">
                          {ad.title}
                        </p>
                        {ad.price != null && (
                          <p className="text-xs font-bold text-brand-green">
                            {new Intl.NumberFormat("ar-EG").format(ad.price)} جنيه
                          </p>
                        )}
                        {ad.governorate && (
                          <p className="text-[10px] text-gray-text mt-0.5">
                            📍 {ad.governorate}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNavWithBadge />
    </main>
  );
}

function StoreSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(3)].map((_, i) => (
        <div key={i}>
          <div className="h-4 w-24 bg-amber-200 rounded mb-2 skeleton" />
          <div className="flex gap-3 overflow-hidden">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="flex-shrink-0 w-[120px] h-40 bg-gray-200 rounded-lg skeleton" />
            ))}
          </div>
          <div className="h-2.5 bg-amber-200 rounded-sm mt-1 skeleton" />
        </div>
      ))}
    </div>
  );
}
