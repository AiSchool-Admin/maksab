/**
 * /ambassador — Ambassador Program page ("سفير مكسب")
 *
 * Full-page wrapper for the AmbassadorDashboard component.
 * Requires authentication. Shows ambassador tier, referral tracking,
 * share tools, and tier perks.
 */

"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import AmbassadorDashboard from "@/components/social/AmbassadorDashboard";

export default function AmbassadorPage() {
  const router = useRouter();
  const { user, isLoading, requireAuth } = useAuth();

  // Not logged in
  if (!isLoading && !user) {
    return (
      <main className="bg-white min-h-screen pb-20">
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-light">
          <div className="flex items-center gap-3 px-4 h-14">
            <button
              onClick={() => router.back()}
              className="p-1 text-gray-text hover:text-dark"
              aria-label="رجوع"
            >
              <ChevronRight size={24} />
            </button>
            <h1 className="text-xl font-bold text-dark flex-1">
              سفير مكسب
            </h1>
          </div>
        </header>

        <div className="px-4 py-12 text-center">
          <p className="text-5xl mb-4">{"\u{1F91D}"}</p>
          <h2 className="text-2xl font-bold text-dark mb-2">
            برنامج سفير مكسب
          </h2>
          <p className="text-sm text-gray-text mb-6 max-w-xs mx-auto">
            ادعي أصحابك واكسب نقاط ومميزات حصرية! سجّل دخولك عشان تبدأ
          </p>
          <button
            onClick={async () => {
              await requireAuth();
            }}
            className="px-6 py-3 bg-brand-green text-white font-bold rounded-xl text-sm"
          >
            سجّل دخولك
          </button>
        </div>

        <BottomNavWithBadge />
      </main>
    );
  }

  // Loading
  if (isLoading || !user) {
    return (
      <main className="bg-white min-h-screen pb-20">
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-light">
          <div className="flex items-center gap-3 px-4 h-14">
            <button
              onClick={() => router.back()}
              className="p-1 text-gray-text hover:text-dark"
              aria-label="رجوع"
            >
              <ChevronRight size={24} />
            </button>
            <h1 className="text-xl font-bold text-dark flex-1">
              سفير مكسب
            </h1>
          </div>
        </header>

        <div className="px-4 py-8 space-y-4">
          <div className="h-48 bg-gray-light rounded-2xl animate-pulse" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-24 bg-gray-light rounded-xl animate-pulse" />
            <div className="h-24 bg-gray-light rounded-xl animate-pulse" />
            <div className="h-24 bg-gray-light rounded-xl animate-pulse" />
          </div>
          <div className="h-40 bg-gray-light rounded-2xl animate-pulse" />
        </div>

        <BottomNavWithBadge />
      </main>
    );
  }

  return (
    <main className="bg-white min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-light">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => router.back()}
            className="p-1 text-gray-text hover:text-dark"
            aria-label="رجوع"
          >
            <ChevronRight size={24} />
          </button>
          <h1 className="text-xl font-bold text-dark flex-1">
            سفير مكسب
          </h1>
          <span className="text-lg">{"\u{1F91D}"}</span>
        </div>
      </header>

      {/* Dashboard */}
      <div className="px-4 py-5">
        <AmbassadorDashboard userId={user.id} />
      </div>

      <BottomNavWithBadge />
    </main>
  );
}
