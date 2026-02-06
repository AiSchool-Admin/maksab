"use client";

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
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import Button from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import { calcProfileCompletion } from "@/lib/supabase/auth";
import { formatPhone } from "@/lib/utils/format";

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
            onClick={async () => {
              await requireAuth();
            }}
          >
            سجّل برقم موبايلك
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

      {/* Menu sections */}
      <section className="px-4 pb-6 space-y-2">
        <ProfileMenuItem
          icon={<ShoppingBag size={20} />}
          label="إعلاناتي"
          onClick={() => router.push("/my-ads")}
        />
        <ProfileMenuItem
          icon={<Heart size={20} />}
          label="المفضلة"
          onClick={() => {}}
        />
        <ProfileMenuItem
          icon={<Settings size={20} />}
          label="الإعدادات"
          onClick={() => {}}
        />
        <ProfileMenuItem
          icon={<HelpCircle size={20} />}
          label="المساعدة والدعم"
          onClick={() => {}}
        />

        <div className="pt-3">
          <button
            onClick={async () => {
              await logout();
            }}
            className="flex items-center gap-3 w-full p-3 rounded-xl text-error hover:bg-error/5 transition-colors"
          >
            <LogOut size={20} />
            <span className="text-sm font-semibold">تسجيل الخروج</span>
          </button>
        </div>
      </section>

      <BottomNavWithBadge />
    </main>
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
