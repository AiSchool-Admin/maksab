"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  MapPin,
  ChevronLeft,
  LogOut,
  Settings,
  Heart,
  ShoppingBag,
  HelpCircle,
  Camera,
  Edit3,
  Banknote,
  Copy,
  Check,
  Star,
  DollarSign,
  ShieldCheck,
  Trophy,
  Store,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import Button from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import { calcProfileCompletion } from "@/lib/supabase/auth";
import { formatPhone } from "@/lib/utils/format";
import { isCommissionSupporter } from "@/lib/commission/commission-service";
import VerificationSection from "@/components/verification/VerificationSection";
import SellerRatingSummaryComponent from "@/components/reviews/SellerRatingSummary";
import { getUserLoyaltyProfile, awardPoints } from "@/lib/loyalty/loyalty-service";
import type { UserLoyaltyProfile } from "@/lib/loyalty/types";
import LoyaltyBadge from "@/components/loyalty/LoyaltyBadge";
import PointsDisplay from "@/components/loyalty/PointsDisplay";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading, requireAuth, logout } = useAuth();

  // ── Not logged in ─────────────────────────────────────────────────
  if (!isLoading && !user) {
    return (
      <main className="bg-white">
        <Header title="حسابي" showNotifications={false} />

        <div className="px-4 py-12 text-center">
          <div className="w-20 h-20 bg-gray-light rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={36} className="text-gray-text" />
          </div>
          <h2 className="text-lg font-bold text-dark mb-2">
            سجّل دخولك في مكسب
          </h2>
          <p className="text-sm text-gray-text mb-6">
            سجّل عشان تقدر تضيف إعلانات وتتواصل مع البايعين وتحفظ المفضلة
          </p>
          <Button
            size="lg"
            fullWidth
            onClick={() => {
              router.push("/login?redirect=/profile");
            }}
          >
            سجّل دخولك
          </Button>
        </div>

        <BottomNavWithBadge />
      </main>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <main className="bg-white">
        <Header title="حسابي" showNotifications={false} />
        <div className="px-4 py-12 text-center">
          <div className="w-20 h-20 bg-gray-light rounded-full skeleton mx-auto mb-4" />
          <div className="h-5 w-32 skeleton rounded-lg mx-auto mb-2" />
          <div className="h-4 w-48 skeleton rounded-lg mx-auto" />
        </div>
        <BottomNavWithBadge />
      </main>
    );
  }

  // ── Logged in ─────────────────────────────────────────────────────
  const [isSupporter, setIsSupporter] = useState(false);
  const [loyaltyProfile, setLoyaltyProfile] = useState<UserLoyaltyProfile | null>(null);

  useEffect(() => {
    if (user?.id) {
      isCommissionSupporter(user.id).then(setIsSupporter);
      // Load loyalty profile + award daily login
      const profile = getUserLoyaltyProfile(user.id);
      setLoyaltyProfile(profile);
      awardPoints(user.id, "daily_login");
    }
  }, [user?.id]);

  const { percentage, missing } = calcProfileCompletion(user!);

  return (
    <main className="bg-white">
      <Header title="حسابي" showNotifications={false} />

      {/* Profile header card */}
      <section className="px-4 pt-4 pb-5">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-[72px] h-[72px] rounded-full bg-brand-green-light flex items-center justify-center overflow-hidden">
              {user!.avatar_url ? (
                <img
                  src={user!.avatar_url}
                  alt="صورة البروفايل"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={32} className="text-brand-green" />
              )}
            </div>
            <button
              className="absolute -bottom-0.5 -end-0.5 w-7 h-7 bg-brand-green text-white rounded-full flex items-center justify-center shadow-md btn-icon-sm"
              aria-label="تغيير الصورة"
            >
              <Camera size={14} />
            </button>
          </div>

          {/* Name + phone */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-dark truncate">
              {user!.display_name || "مستخدم مكسب"}
            </h2>
            <p className="text-sm text-gray-text" dir="ltr">
              {formatPhone(user!.phone)}
            </p>
            {user!.governorate && (
              <p className="flex items-center gap-1 text-xs text-gray-text mt-0.5">
                <MapPin size={12} />
                {user!.governorate}
                {user!.city ? ` — ${user!.city}` : ""}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {loyaltyProfile && (
                <LoyaltyBadge level={loyaltyProfile.currentLevel} size="sm" />
              )}
              {isSupporter && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-green bg-brand-green-light px-1.5 py-0.5 rounded-full">
                  داعم مكسب 💚
                </span>
              )}
            </div>
          </div>

          {/* Edit profile */}
          <button
            onClick={() => router.push("/profile/edit")}
            className="p-2 text-gray-text hover:text-brand-green hover:bg-gray-light rounded-xl transition-colors"
            aria-label="تعديل البروفايل"
          >
            <Edit3 size={20} />
          </button>
        </div>
      </section>

      {/* Profile completion prompt */}
      {percentage < 100 && (
        <section className="px-4 pb-5">
          <div className="bg-brand-gold-light rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-dark">
                اكمل بروفايلك
              </p>
              <span className="text-sm font-bold text-brand-gold">
                {percentage}%
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 bg-white rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-brand-gold rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {missing.map((field) => (
                <span
                  key={field}
                  className="text-[11px] bg-white text-gray-text px-2 py-1 rounded-lg"
                >
                  + {field}
                </span>
              ))}
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="mt-3"
              onClick={() => router.push("/profile/edit")}
            >
              اكمل دلوقتي
            </Button>
          </div>
        </section>
      )}

      {/* Loyalty points card */}
      {loyaltyProfile && (
        <section className="px-4 pb-5">
          <button
            onClick={() => router.push("/rewards")}
            className="w-full text-start"
          >
            <PointsDisplay profile={loyaltyProfile} compact />
          </button>
        </section>
      )}

      {/* Verification section */}
      <section className="px-4 pb-5">
        <VerificationSection userId={user!.id} />
      </section>

      {/* My Reviews */}
      <section className="px-4 pb-5">
        <SellerRatingSummaryComponent sellerId={user!.id} />
      </section>

      {/* InstaPay commission support banner */}
      <InstaPayBanner />

      {/* Menu sections */}
      <section className="px-4 pb-6 space-y-2">
        <ProfileMenuItem
          icon={<Store size={20} />}
          label="متجري"
          onClick={() => router.push("/store/dashboard")}
        />
        <ProfileMenuItem
          icon={<ShoppingBag size={20} />}
          label="إعلاناتي"
          onClick={() => router.push("/my-ads")}
        />
        <ProfileMenuItem
          icon={<Heart size={20} />}
          label="المفضلة"
          onClick={() => router.push("/favorites")}
        />
        <ProfileMenuItem
          icon={<Trophy size={20} />}
          label="المكافآت والنقاط"
          onClick={() => router.push("/rewards")}
        />
        <ProfileMenuItem
          icon={<DollarSign size={20} />}
          label="عروض الأسعار"
          onClick={() => router.push("/my-offers")}
        />
        <ProfileMenuItem
          icon={<Settings size={20} />}
          label="الإعدادات"
          onClick={() => router.push("/settings")}
        />
        <ProfileMenuItem
          icon={<HelpCircle size={20} />}
          label="المساعدة والدعم"
          onClick={() => router.push("/help")}
        />

        <div className="pt-3">
          <button
            onClick={async () => {
              // Clear all sessions including dev
              if (typeof window !== "undefined") {
                localStorage.removeItem("maksab_dev_session");
                const keys = Object.keys(localStorage);
                for (const key of keys) {
                  if (key.startsWith("sb-") || key.includes("supabase")) {
                    localStorage.removeItem(key);
                  }
                }
              }
              await logout();
              router.push("/login");
            }}
            className="flex items-center gap-3 w-full p-4 rounded-xl bg-red-50 text-error hover:bg-red-100 transition-colors"
          >
            <LogOut size={20} />
            <span className="text-sm font-bold">تسجيل الخروج</span>
          </button>
        </div>
      </section>

      <BottomNavWithBadge />
    </main>
  );
}

const INSTAPAY_ACCOUNT = "maksab@instapay";

function InstaPayBanner() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(INSTAPAY_ACCOUNT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <section className="px-4 pb-5">
      <div className="bg-gradient-to-l from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <Banknote size={20} className="text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-dark mb-1">ادعم مكسب 💚</p>
            <p className="text-xs text-gray-text mb-2">
              مكسب تطبيق مجاني. لو عجبك، ساهم بعمولة بسيطة عن طريق إنستاباي
            </p>
            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2">
              <span className="text-sm font-bold text-dark flex-1" dir="ltr">
                {INSTAPAY_ACCOUNT}
              </span>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="نسخ"
              >
                {copied ? (
                  <Check size={16} className="text-green-600" />
                ) : (
                  <Copy size={16} className="text-gray-text" />
                )}
              </button>
            </div>
            {copied && (
              <p className="text-[11px] text-green-600 mt-1">تم النسخ!</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProfileMenuItem({
  icon,
  label,
  onClick,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-gray-light transition-colors"
    >
      <span className="text-gray-text">{icon}</span>
      <span className="flex-1 text-start text-sm font-semibold text-dark">
        {label}
      </span>
      {badge != null && badge > 0 && (
        <span className="bg-error text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 btn-icon-sm">
          {badge}
        </span>
      )}
      <ChevronLeft size={16} className="text-gray-text" />
    </button>
  );
}
