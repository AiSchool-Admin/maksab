"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MapPin, List, SlidersHorizontal, X, Navigation, ChevronLeft, Home } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase/client";
import { formatPrice, formatTimeAgo } from "@/lib/utils/format";
import { haversineDistance, formatDistance, getCurrentPosition, findNearestGovernorate, governorateCoordinates } from "@/lib/utils/geo";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";

// Dynamic import for map (SSR-safe)
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[60vh] bg-gray-100 rounded-2xl flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm text-gray-text">جاري تحميل الخريطة...</p>
      </div>
    </div>
  ),
});

interface MapAd {
  id: string;
  title: string;
  price: number | null;
  saleType: "cash" | "auction" | "exchange";
  latitude: number;
  longitude: number;
  governorate: string;
  city?: string;
  image?: string;
  categoryIcon?: string;
  createdAt: string;
  distance?: number;
}

const radiusOptions = [
  { value: 5, label: "5 كم" },
  { value: 10, label: "10 كم" },
  { value: 25, label: "25 كم" },
  { value: 50, label: "50 كم" },
  { value: 100, label: "100 كم" },
  { value: 0, label: "كل مصر" },
];

export default function MapPage() {
  const router = useRouter();
  const [ads, setAds] = useState<MapAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showList, setShowList] = useState(false);
  const [radius, setRadius] = useState(0); // 0 = all
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Fetch ads with location data
  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("ads" as never)
        .select("id, title, price, sale_type, latitude, longitude, governorate, city, images, category_id, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(200);

      if (selectedCategory) {
        query = query.eq("category_id", selectedCategory);
      }

      const { data } = await query;

      if (data) {
        let mapped = (data as Record<string, unknown>[]).map((ad) => {
          const images = (ad.images as string[]) || [];
          let lat = Number(ad.latitude) || 0;
          let lng = Number(ad.longitude) || 0;

          // If no exact coordinates, use governorate center
          if ((!lat || !lng) && ad.governorate) {
            const coords = governorateCoordinates[ad.governorate as string];
            if (coords) {
              lat = coords.lat + (Math.random() - 0.5) * 0.05;
              lng = coords.lng + (Math.random() - 0.5) * 0.05;
            }
          }

          return {
            id: ad.id as string,
            title: ad.title as string,
            price: ad.price as number | null,
            saleType: ad.sale_type as "cash" | "auction" | "exchange",
            latitude: lat,
            longitude: lng,
            governorate: (ad.governorate as string) || "",
            city: (ad.city as string) || "",
            image: images[0] || "",
            categoryIcon: "",
            createdAt: ad.created_at as string,
            distance: 0,
          };
        }).filter((a) => a.latitude && a.longitude);

        // Calculate distances if user location is available
        if (userLocation) {
          mapped = mapped.map((ad) => ({
            ...ad,
            distance: haversineDistance(userLocation.lat, userLocation.lng, ad.latitude, ad.longitude),
          }));

          // Filter by radius if set
          if (radius > 0) {
            mapped = mapped.filter((ad) => (ad.distance || 0) <= radius);
          }

          // Sort by distance
          mapped.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        }

        setAds(mapped);
      }
    } catch {
      // Silently fail
    }
    setLoading(false);
  }, [selectedCategory, userLocation, radius]);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  // Auto-detect location on mount
  useEffect(() => {
    getCurrentPosition()
      .then((pos) => setUserLocation(pos))
      .catch(() => {
        // Fallback to Cairo center
      });
  }, []);

  const handleLocationDetected = useCallback((lat: number, lng: number) => {
    setUserLocation({ lat, lng });
  }, []);

  const selectedAd = selectedAdId ? ads.find((a) => a.id === selectedAdId) : null;

  const categories = [
    { id: "", label: "الكل" },
    { id: "cars", label: "🚗 سيارات" },
    { id: "real_estate", label: "🏠 عقارات" },
    { id: "phones", label: "📱 موبايلات" },
    { id: "fashion", label: "👗 موضة" },
    { id: "gold", label: "💰 ذهب" },
    { id: "appliances", label: "🏠 أجهزة" },
    { id: "furniture", label: "🪑 أثاث" },
  ];

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="p-1">
              <ChevronLeft size={22} className="text-dark" />
            </button>
            <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
              <MapPin size={20} className="text-brand-green" />
              خريطة الإعلانات
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="p-2 rounded-xl text-brand-green hover:bg-green-50 transition-colors"
              aria-label="الرئيسية"
            >
              <Home size={18} />
            </Link>
            <button
              onClick={() => setShowList(!showList)}
              className={`p-2 rounded-xl transition-colors ${showList ? "bg-brand-green text-white" : "bg-gray-100 text-gray-text"}`}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-xl transition-colors ${showFilters ? "bg-brand-green text-white" : "bg-gray-100 text-gray-text"}`}
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === cat.id
                  ? "bg-brand-green text-white"
                  : "bg-gray-100 text-gray-text hover:bg-gray-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white border-b border-gray-100 px-4 py-3 space-y-3">
          {/* Radius filter */}
          <div>
            <label className="text-xs font-bold text-dark mb-2 block">
              <Navigation size={12} className="inline ml-1" />
              المسافة من موقعك
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {radiusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRadius(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    radius === opt.value
                      ? "bg-brand-green text-white"
                      : "bg-gray-100 text-gray-text hover:bg-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {!userLocation && radius > 0 && (
              <p className="text-[10px] text-orange-500 mt-1">
                اسمح بالوصول للموقع عشان نعرف نفلترلك بالمسافة
              </p>
            )}
          </div>
        </div>
      )}

      {/* Map */}
      <div className={`relative ${showList ? "h-[35vh]" : "h-[calc(100vh-180px)]"} transition-all`}>
        <MapView
          ads={ads}
          userLocation={userLocation}
          onAdClick={(id) => { setSelectedAdId(id); setShowList(true); }}
          onLocationDetected={handleLocationDetected}
          selectedAdId={selectedAdId || undefined}
          height="100%"
        />
      </div>

      {/* List view */}
      {showList && (
        <div className="bg-white rounded-t-3xl -mt-4 relative z-20 border-t border-gray-100">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-lg font-bold text-dark">
              {radius > 0 && userLocation
                ? `إعلانات في نطاق ${radius} كم`
                : `${ads.length} إعلان`}
            </h2>
            <button onClick={() => setShowList(false)} className="p-1">
              <X size={18} className="text-gray-text" />
            </button>
          </div>

          <div className="max-h-[40vh] overflow-y-auto px-4 pb-20 space-y-2">
            {loading ? (
              <div className="py-8 text-center">
                <div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-gray-text">جاري التحميل...</p>
              </div>
            ) : ads.length === 0 ? (
              <div className="py-8 text-center">
                <MapPin size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-text">مفيش إعلانات في المنطقة دي</p>
                {radius > 0 && (
                  <button
                    onClick={() => setRadius(0)}
                    className="mt-2 text-xs text-brand-green font-medium"
                  >
                    عرض كل مصر
                  </button>
                )}
              </div>
            ) : (
              ads.map((ad) => (
                <button
                  key={ad.id}
                  onClick={() => {
                    setSelectedAdId(ad.id);
                    router.push(`/ad/${ad.id}`);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-right ${
                    selectedAdId === ad.id ? "bg-brand-green-light" : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  {/* Image */}
                  {ad.image ? (
                    <img
                      src={ad.image}
                      alt=""
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <MapPin size={20} className="text-gray-400" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-dark line-clamp-1">{ad.title}</p>
                    <p className="text-xs font-bold text-brand-green mt-0.5">
                      {ad.saleType === "auction" ? "🔥 مزاد" : ad.saleType === "exchange" ? "🔄 للتبديل" : ""}
                      {ad.price ? ` ${formatPrice(ad.price)}` : ""}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-text">
                        📍 {ad.governorate}{ad.city ? ` — ${ad.city}` : ""}
                      </span>
                      {ad.distance != null && ad.distance > 0 && (
                        <span className="text-[10px] font-bold text-blue-500">
                          {formatDistance(ad.distance)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Distance badge */}
                  {userLocation && ad.distance != null && ad.distance > 0 && (
                    <div className="flex-shrink-0 bg-blue-50 rounded-lg px-2 py-1">
                      <span className="text-[10px] font-bold text-blue-600">
                        {formatDistance(ad.distance)}
                      </span>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Selected ad preview (when no list) */}
      {!showList && selectedAd && (
        <div className="fixed bottom-20 inset-x-4 z-30">
          <button
            onClick={() => router.push(`/ad/${selectedAd.id}`)}
            className="w-full bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 flex items-center gap-3 text-right"
          >
            {selectedAd.image ? (
              <img src={selectedAd.image} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0">
                <MapPin size={24} className="text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-dark line-clamp-2">{selectedAd.title}</p>
              <p className="text-sm font-bold text-brand-green mt-1">
                {selectedAd.price ? formatPrice(selectedAd.price) : ""}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-gray-text">
                  📍 {selectedAd.governorate}
                </span>
                {selectedAd.distance != null && selectedAd.distance > 0 && (
                  <span className="text-[10px] font-bold text-blue-500">
                    {formatDistance(selectedAd.distance)}
                  </span>
                )}
                <span className="text-[10px] text-gray-text">{formatTimeAgo(selectedAd.createdAt)}</span>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedAdId(null); }}
              className="p-1 flex-shrink-0"
            >
              <X size={16} className="text-gray-400" />
            </button>
          </button>
        </div>
      )}

      <BottomNavWithBadge />
    </main>
  );
}
