"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Globe,
  Moon,
  Smartphone,
  MapPin,
  Shield,
  Trash2,
  ChevronLeft,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import { useAuth } from "@/components/auth/AuthProvider";

const SETTINGS_KEY = "maksab_settings";

interface AppSettings {
  notifications: boolean;
  darkMode: boolean;
  locationAccess: boolean;
  autoDetectLocation: boolean;
}

const defaultSettings: AppSettings = {
  notifications: true,
  darkMode: false,
  locationAccess: false,
  autoDetectLocation: false,
};

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

function saveSettings(settings: AppSettings) {
  if (typeof window !== "undefined") {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const updateSetting = (key: keyof AppSettings, value: boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated);
  };

  const [cacheCleared, setCacheCleared] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClearCache = () => {
    if (typeof window !== "undefined") {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (
          key !== SETTINGS_KEY &&
          !key.startsWith("sb-")
        ) {
          localStorage.removeItem(key);
        }
      }
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 2000);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // Delete user data from database via Supabase
      const { supabase } = await import("@/lib/supabase/client");
      if (user?.id) {
        // Delete user's ads
        await supabase.from("ads" as never).delete().eq("user_id", user.id);
        // Delete user profile
        await supabase.from("profiles" as never).delete().eq("id", user.id);
      }
      // Clear all local data
      if (typeof window !== "undefined") {
        localStorage.clear();
      }
      await logout();
      router.push("/");
    } catch {
      setIsDeleting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white pb-20">
      <Header title="الإعدادات" showBack />

      <div className="px-4 py-4 space-y-6">
        {/* Notifications section */}
        <section>
          <h2 className="text-sm font-bold text-dark mb-3 flex items-center gap-2">
            <Bell size={16} className="text-brand-green" />
            الإشعارات
          </h2>
          <div className="space-y-1">
            <SettingToggle
              label="إشعارات التطبيق"
              description="رسائل جديدة، مزايدات، وتحديثات"
              checked={settings.notifications}
              onChange={(v) => updateSetting("notifications", v)}
            />
          </div>
        </section>

        {/* Appearance */}
        <section>
          <h2 className="text-sm font-bold text-dark mb-3 flex items-center gap-2">
            <Moon size={16} className="text-brand-green" />
            المظهر
          </h2>
          <div className="space-y-1">
            <SettingToggle
              label="الوضع الليلي"
              description="قريباً — سيتم تفعيله في التحديث القادم"
              checked={settings.darkMode}
              onChange={(v) => updateSetting("darkMode", v)}
              disabled
            />
          </div>
        </section>

        {/* Location */}
        <section>
          <h2 className="text-sm font-bold text-dark mb-3 flex items-center gap-2">
            <MapPin size={16} className="text-brand-green" />
            الموقع
          </h2>
          <div className="space-y-1">
            <SettingToggle
              label="السماح بتحديد الموقع"
              description="لعرض الإعلانات القريبة منك"
              checked={settings.locationAccess}
              onChange={(v) => {
                if (v && "geolocation" in navigator) {
                  navigator.geolocation.getCurrentPosition(
                    () => updateSetting("locationAccess", true),
                    () => updateSetting("locationAccess", false),
                  );
                } else {
                  updateSetting("locationAccess", v);
                }
              }}
            />
            <SettingToggle
              label="تحديد الموقع تلقائياً في الإعلانات"
              description="عند إنشاء إعلان جديد"
              checked={settings.autoDetectLocation}
              onChange={(v) => updateSetting("autoDetectLocation", v)}
            />
          </div>
        </section>

        {/* App info */}
        <section>
          <h2 className="text-sm font-bold text-dark mb-3 flex items-center gap-2">
            <Smartphone size={16} className="text-brand-green" />
            التطبيق
          </h2>
          <div className="space-y-1">
            <SettingItem
              label="النسخة"
              value="1.0.0"
            />
            <SettingItem
              label="تثبيت على الشاشة الرئيسية"
              onClick={() => {
                // PWA install prompt is handled by browser
              }}
            />
            <button
              onClick={handleClearCache}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-light transition-colors"
            >
              <span className="text-sm text-dark">مسح الكاش</span>
              <span className="text-xs text-gray-text">
                {cacheCleared ? "تم المسح ✓" : "تحديث البيانات"}
              </span>
            </button>
          </div>
        </section>

        {/* Privacy & Security */}
        <section>
          <h2 className="text-sm font-bold text-dark mb-3 flex items-center gap-2">
            <Shield size={16} className="text-brand-green" />
            الخصوصية والأمان
          </h2>
          <div className="space-y-1">
            <SettingItem
              label="سياسة الخصوصية"
              onClick={() => {}}
            />
            <SettingItem
              label="شروط الاستخدام"
              onClick={() => {}}
            />
          </div>
        </section>

        {/* Danger zone */}
        {user && (
          <section>
            <div className="border border-red-200 rounded-xl p-4">
              <h2 className="text-sm font-bold text-error mb-2 flex items-center gap-2">
                <Trash2 size={16} />
                منطقة الخطر
              </h2>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-sm text-error hover:text-red-700 transition-colors"
                >
                  حذف حسابي نهائياً
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-text">
                    هل أنت متأكد؟ سيتم حذف جميع بياناتك وإعلاناتك نهائياً ولا يمكن التراجع.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="flex-1 py-2 bg-error text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? "جاري الحذف..." : "نعم، احذف حسابي"}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2 bg-gray-light text-dark text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      لا، تراجع
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      <BottomNavWithBadge />
    </main>
  );
}

function SettingToggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-xl ${disabled ? "opacity-50" : "hover:bg-gray-light"} transition-colors`}
    >
      <div className="flex-1 min-w-0 me-3">
        <p className="text-sm font-semibold text-dark">{label}</p>
        {description && (
          <p className="text-xs text-gray-text mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? "bg-brand-green" : "bg-gray-300"
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? "start-[22px]" : "start-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function SettingItem({
  label,
  value,
  onClick,
}: {
  label: string;
  value?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-light transition-colors"
    >
      <span className="text-sm text-dark">{label}</span>
      <div className="flex items-center gap-1.5">
        {value && <span className="text-xs text-gray-text">{value}</span>}
        {onClick && <ChevronLeft size={14} className="text-gray-text" />}
      </div>
    </button>
  );
}
