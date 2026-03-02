"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Store, X } from "lucide-react";
import Button from "@/components/ui/Button";

const DISMISS_KEY = "maksab_upgrade_banner_dismissed";
const DISMISS_DAYS = 7;

interface UpgradeToStoreBannerProps {
  variant: "home" | "profile" | "profile-bottom";
}

/**
 * CTA banner encouraging individual users to upgrade to a store.
 * - "home": Dismissible banner on the home page (returns after 7 days)
 * - "profile": Prominent button on the profile page
 * - "profile-bottom": Bottom banner on the seller's own profile
 */
export default function UpgradeToStoreBanner({
  variant,
}: UpgradeToStoreBannerProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(() => {
    if (variant !== "home") return false;
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(DISMISS_KEY);
    if (stored) {
      const daysPassed = (Date.now() - parseInt(stored, 10)) / (1000 * 60 * 60 * 24);
      return daysPassed < DISMISS_DAYS;
    }
    return false;
  });

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDismissed(true);
  };

  const goToCreate = () => router.push("/store/create");

  if (dismissed) return null;

  // ── Home page banner (dismissible) ────────────────────────────
  if (variant === "home") {
    return (
      <section className="px-4 pb-4">
        <div className="relative bg-gradient-to-l from-brand-green-light via-emerald-50 to-white border border-brand-green/20 rounded-xl p-4">
          <button
            onClick={handleDismiss}
            className="absolute top-2 start-2 p-1 text-gray-text hover:text-dark rounded-full hover:bg-white/60 transition-colors"
            aria-label="إخفاء"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-brand-green/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Store size={24} className="text-brand-green" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-dark">
                عندك بضاعة كتير؟ افتح محلك مجاناً على مكسب!
              </p>
              <p className="text-xs text-gray-text mt-0.5">
                حوّل حسابك لمتجر واعرض منتجاتك بشكل احترافي
              </p>
            </div>
          </div>

          <Button size="sm" className="mt-3 w-full" onClick={goToCreate}>
            افتح محلك دلوقتي
          </Button>
        </div>
      </section>
    );
  }

  // ── Profile page button (prominent) ───────────────────────────
  if (variant === "profile") {
    return (
      <button
        onClick={goToCreate}
        className="flex items-center gap-3 w-full p-4 rounded-xl bg-gradient-to-l from-brand-green-light to-emerald-50 border border-brand-green/30 hover:shadow-md transition-all active:scale-[0.99]"
      >
        <div className="w-11 h-11 bg-brand-green rounded-xl flex items-center justify-center flex-shrink-0">
          <Store size={22} className="text-white" />
        </div>
        <div className="flex-1 text-start">
          <p className="text-sm font-bold text-dark">افتح محلك في مكسب</p>
          <p className="text-[11px] text-gray-text">
            اعرض منتجاتك بشكل احترافي — مجاناً
          </p>
        </div>
        <span className="text-brand-green text-lg">←</span>
      </button>
    );
  }

  // ── Profile bottom banner (seller's own profile) ──────────────
  if (variant === "profile-bottom") {
    return (
      <div className="bg-brand-gold-light border border-brand-gold/30 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏪</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-dark">حوّل حسابك لمحل!</p>
            <p className="text-xs text-gray-text">
              اجمع إعلاناتك في مكان واحد وابني قاعدة عملاء
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="mt-3 w-full"
          onClick={goToCreate}
        >
          ابدأ دلوقتي
        </Button>
      </div>
    );
  }

  return null;
}
