"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  BellOff,
  MessageCircle,
  Flame,
  TrendingDown,
  Target,
  DollarSign,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  getPushSupport,
  type NotificationPreferences,
} from "@/lib/notifications/notification-preferences";
import { setupPushNotifications } from "@/lib/notifications/notification-service";

interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ icon, label, description, checked, onChange, disabled }: ToggleRowProps) {
  return (
    <label
      className={`flex items-center gap-3 p-3.5 rounded-xl transition-colors cursor-pointer ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-light"
      }`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-dark">{label}</p>
        <p className="text-[11px] text-gray-text">{description}</p>
      </div>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-checked:bg-brand-green rounded-full transition-colors" />
        <div className="absolute top-0.5 start-0.5 w-5 h-5 bg-white rounded-full peer-checked:translate-x-5 rtl:peer-checked:-translate-x-5 transition-transform shadow-sm" />
      </div>
    </label>
  );
}

/**
 * Notification preferences settings panel.
 * Shown in profile/settings page.
 */
export default function NotificationSettings() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [pushSupport, setPushSupport] = useState<ReturnType<typeof getPushSupport> | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    setPushSupport(getPushSupport());
    getNotificationPreferences(user?.id).then(setPrefs);
  }, [user]);

  const handleToggle = async (
    key: keyof NotificationPreferences,
    value: boolean,
  ) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setSaveStatus("saving");
    await saveNotificationPreferences(updated, user?.id);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  };

  const handleEnablePush = async () => {
    if (!user) return;
    setIsSettingUp(true);
    const success = await setupPushNotifications(user.id);
    if (success && prefs) {
      const updated = { ...prefs, pushEnabled: true };
      setPrefs(updated);
      await saveNotificationPreferences(updated, user.id);
    }
    setIsSettingUp(false);
    setPushSupport(getPushSupport());
  };

  if (!prefs) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl" />
        ))}
      </div>
    );
  }

  const isPermissionDenied = pushSupport?.permission === "denied";
  const isPermissionGranted = pushSupport?.permission === "granted";
  const isPushUnsupported = !pushSupport?.isSupported;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-dark">إعدادات الإشعارات</h3>
        {saveStatus === "saved" && (
          <span className="text-[11px] text-brand-green font-medium">تم الحفظ</span>
        )}
      </div>

      {/* Push notification main toggle */}
      {isPushUnsupported ? (
        <div className="bg-gray-light rounded-xl p-4 text-center">
          <BellOff size={24} className="text-gray-text mx-auto mb-2" />
          <p className="text-sm text-gray-text">
            المتصفح بتاعك مش بيدعم الإشعارات الخارجية
          </p>
        </div>
      ) : isPermissionDenied ? (
        <div className="bg-red-50 rounded-xl p-4 text-center border border-red-200/50">
          <BellOff size={24} className="text-error mx-auto mb-2" />
          <p className="text-sm text-dark font-bold mb-1">الإشعارات مقفولة</p>
          <p className="text-xs text-gray-text">
            روح لإعدادات المتصفح وافتح صلاحية الإشعارات لمكسب
          </p>
        </div>
      ) : !isPermissionGranted ? (
        <div className="bg-brand-green-light rounded-xl p-4 text-center border border-brand-green/20">
          <Bell size={24} className="text-brand-green mx-auto mb-2" />
          <p className="text-sm font-bold text-dark mb-2">فعّل الإشعارات الخارجية</p>
          <p className="text-xs text-gray-text mb-3">
            هنبعتلك إشعار على الموبايل لما حد يبعتلك رسالة أو عرض سعر
          </p>
          <button
            onClick={handleEnablePush}
            disabled={isSettingUp}
            className="bg-brand-green hover:bg-brand-green-dark text-white text-sm font-bold py-2.5 px-6 rounded-xl transition-colors disabled:opacity-50"
          >
            {isSettingUp ? "جاري التفعيل..." : "فعّل الآن"}
          </button>
        </div>
      ) : null}

      {/* Push enabled — show individual toggles */}
      {isPermissionGranted && (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          <ToggleRow
            icon={<Bell size={18} className="text-brand-green" />}
            label="الإشعارات الخارجية"
            description="إشعارات على شاشة الموبايل حتى لو التطبيق مقفول"
            checked={prefs.pushEnabled}
            onChange={(v) => handleToggle("pushEnabled", v)}
          />

          <ToggleRow
            icon={<MessageCircle size={18} className="text-blue-600" />}
            label="رسائل جديدة"
            description="لما حد يبعتلك رسالة في الشات"
            checked={prefs.pushNewMessage}
            onChange={(v) => handleToggle("pushNewMessage", v)}
            disabled={!prefs.pushEnabled}
          />

          <ToggleRow
            icon={<DollarSign size={18} className="text-brand-green" />}
            label="عروض الأسعار"
            description="لما حد يقدملك عرض سعر على إعلانك"
            checked={prefs.pushPriceOffer}
            onChange={(v) => handleToggle("pushPriceOffer", v)}
            disabled={!prefs.pushEnabled}
          />

          <ToggleRow
            icon={<Flame size={18} className="text-orange-500" />}
            label="تحديثات المزادات"
            description="مزايدات جديدة — حد زايد عليك — المزاد خلص"
            checked={prefs.pushAuctionUpdates}
            onChange={(v) => handleToggle("pushAuctionUpdates", v)}
            disabled={!prefs.pushEnabled}
          />

          <ToggleRow
            icon={<TrendingDown size={18} className="text-emerald-600" />}
            label="تخفيضات الأسعار"
            description="لما سعر حاجة حفظتها في المفضلة ينزل"
            checked={prefs.pushPriceDrops}
            onChange={(v) => handleToggle("pushPriceDrops", v)}
            disabled={!prefs.pushEnabled}
          />

          <ToggleRow
            icon={<Target size={18} className="text-purple-600" />}
            label="إعلانات تناسبك"
            description="لما نلاقي إعلان جديد يتوافق مع اهتماماتك"
            checked={prefs.pushNewMatch}
            onChange={(v) => handleToggle("pushNewMatch", v)}
            disabled={!prefs.pushEnabled}
          />
        </div>
      )}
    </div>
  );
}
