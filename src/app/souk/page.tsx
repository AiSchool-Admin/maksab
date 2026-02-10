"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Home, Volume2, VolumeX } from "lucide-react";
import StoreFront from "@/components/souk/StoreFront";
import { Lantern, StringLights, WalkingPerson, ArchDecoration, CobblestoneGround } from "@/components/souk/AmbientEffects";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import { categoriesConfig } from "@/lib/categories/categories-config";
import { supabase } from "@/lib/supabase/client";

/** Accent colors per category for visual variety */
const accentColors: Record<string, string> = {
  cars: "#2563EB",
  real_estate: "#059669",
  phones: "#7C3AED",
  fashion: "#EC4899",
  scrap: "#D97706",
  gold: "#EAB308",
  luxury: "#334155",
  appliances: "#0891B2",
  furniture: "#EA580C",
  hobbies: "#4F46E5",
  tools: "#78716C",
  services: "#0D9488",
};

export default function SoukPage() {
  const router = useRouter();
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(false);

  // Fetch active ad counts per category
  useEffect(() => {
    async function fetchCounts() {
      setIsLoading(true);
      const counts: Record<string, number> = {};

      try {
        // Try fetching from Supabase
        const { data } = await supabase
          .from("ads" as never)
          .select("category_id")
          .eq("status", "active");

        if (data && Array.isArray(data)) {
          for (const row of data as { category_id: string }[]) {
            counts[row.category_id] = (counts[row.category_id] || 0) + 1;
          }
        }
      } catch {
        // Fallback: mock counts
        for (const cat of categoriesConfig) {
          counts[cat.id] = Math.floor(Math.random() * 40) + 5;
        }
      }

      // Ensure all categories have at least a count
      for (const cat of categoriesConfig) {
        if (!counts[cat.id]) counts[cat.id] = 0;
      }

      setItemCounts(counts);
      setIsLoading(false);
    }

    fetchCounts();
  }, []);

  // Split categories into two rows (stores on each side of the street)
  const rightStores = categoriesConfig.filter((_, i) => i % 2 === 0);
  const leftStores = categoriesConfig.filter((_, i) => i % 2 !== 0);

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 pb-20">
      {/* ── Header: Gate entrance ───────────────────────── */}
      <header className="sticky top-0 z-50 bg-gradient-to-b from-amber-800 to-amber-900 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="p-1 text-amber-200 hover:text-white transition-colors"
              aria-label="رجوع"
            >
              <ChevronRight size={24} />
            </button>
            <Link
              href="/"
              className="p-1.5 text-amber-200 hover:text-white hover:bg-amber-700 rounded-full transition-colors"
              aria-label="الرئيسية"
            >
              <Home size={18} />
            </Link>
          </div>

          <h1 className="text-lg font-bold flex items-center gap-2">
            <span>🏪</span>
            سوق مكسب
          </h1>

          <button
            onClick={() => setSoundOn(!soundOn)}
            className="p-1.5 text-amber-200 hover:text-white rounded-full transition-colors"
            aria-label={soundOn ? "إيقاف الصوت" : "تشغيل الصوت"}
          >
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>

        {/* Decorative Islamic pattern border */}
        <div className="h-3 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 relative">
          <div className="absolute inset-0 flex justify-around items-center">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="w-2 h-2 bg-amber-300/40 rounded-full" />
            ))}
          </div>
        </div>
      </header>

      {/* ── Gate entrance animation ─────────────────────── */}
      <div className="animate-gate-open">
        {/* Welcome arch */}
        <div className="relative bg-gradient-to-b from-amber-700 to-amber-800 mx-4 mt-4 rounded-t-[40px] p-4 pb-6 text-center shadow-inner">
          {/* Islamic arch shape */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-12 border-2 border-amber-500/30 rounded-t-full" />

          <p className="text-amber-200 text-sm mt-2 mb-1">مرحباً بيك في</p>
          <h2 className="text-2xl font-bold text-white mb-1">🏪 سوق مكسب</h2>
          <p className="text-amber-300 text-xs">اتفضل اتجوّل واتفرج على المحلات</p>

          {/* Lanterns */}
          <div className="absolute top-0 start-4 animate-lantern">
            <Lantern />
          </div>
          <div className="absolute top-0 end-4 animate-lantern" style={{ animationDelay: "1s" }}>
            <Lantern />
          </div>
        </div>

        {/* Arch bottom connector */}
        <div className="mx-4 h-2 bg-gradient-to-b from-amber-800 to-transparent rounded-b" />
      </div>

      {/* ── String lights ──────────────────────────────── */}
      <div className="mt-2 px-2">
        <StringLights />
      </div>

      {/* ── The Souk Street ────────────────────────────── */}
      <div className="relative mt-2 px-3">
        {/* Walking people */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
          <WalkingPerson direction="right" delay={0} />
          <WalkingPerson direction="left" delay={5} />
          <WalkingPerson direction="right" delay={9} />
        </div>

        {/* Store rows — the main street */}
        {isLoading ? (
          <SoukSkeleton />
        ) : (
          <div className="space-y-4">
            {/* For each pair of stores, create a "street section" */}
            {rightStores.map((rightCat, i) => {
              const leftCat = leftStores[i];

              return (
                <div key={rightCat.id}>
                  {/* Street section with stores on both sides */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Right store */}
                    <StoreFront
                      categoryId={rightCat.id}
                      name={rightCat.name}
                      icon={rightCat.icon}
                      itemCount={itemCounts[rightCat.id] || 0}
                      side="right"
                      index={i * 2}
                      accentColor={accentColors[rightCat.id] || "#1B7A3D"}
                    />

                    {/* Left store */}
                    {leftCat && (
                      <StoreFront
                        categoryId={leftCat.id}
                        name={leftCat.name}
                        icon={leftCat.icon}
                        itemCount={itemCounts[leftCat.id] || 0}
                        side="left"
                        index={i * 2 + 1}
                        accentColor={accentColors[leftCat.id] || "#D4A843"}
                      />
                    )}
                  </div>

                  {/* Street cobblestone between store rows */}
                  <div className="my-3 h-6 rounded relative overflow-hidden">
                    <CobblestoneGround />
                  </div>

                  {/* Decorative arch every 2 sections */}
                  {i % 2 === 1 && i < rightStores.length - 1 && (
                    <ArchDecoration />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── End of souk ────────────────────────────────── */}
      <div className="mt-8 text-center px-4">
        <div className="bg-amber-800 text-amber-200 rounded-2xl p-4 mx-auto max-w-xs">
          <p className="text-sm font-bold mb-1">نهاية السوق 🏁</p>
          <p className="text-xs text-amber-300 mb-3">مش لاقي اللي بتدور عليه؟</p>
          <Link
            href="/search"
            className="inline-block bg-amber-500 hover:bg-amber-400 text-amber-900 font-bold text-sm px-4 py-2 rounded-full transition-colors"
          >
            🔍 ابحث في مكسب
          </Link>
        </div>
      </div>

      <BottomNavWithBadge />
    </main>
  );
}

/** Skeleton loader for the souk while loading */
function SoukSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="grid grid-cols-2 gap-3">
          {[0, 1].map((j) => (
            <div key={j} className="bg-amber-100 rounded-xl h-48 skeleton" />
          ))}
        </div>
      ))}
    </div>
  );
}
