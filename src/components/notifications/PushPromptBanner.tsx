"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { setupPushNotifications } from "@/lib/notifications/notification-service";

const PUSH_PROMPT_KEY = "maksab_push_prompt_dismissed";
const PUSH_PROMPT_MIN_VISITS = 2;
const PUSH_VISIT_KEY = "maksab_visit_count";

export default function PushPromptBanner() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user) return;

    // Don't show if push is already granted or denied
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;

    // Don't show if user already dismissed
    if (localStorage.getItem(PUSH_PROMPT_KEY)) return;

    // Only show after minimum visits
    const visits = Number(localStorage.getItem(PUSH_VISIT_KEY) || "0") + 1;
    localStorage.setItem(PUSH_VISIT_KEY, String(visits));

    if (visits >= PUSH_PROMPT_MIN_VISITS) {
      // Delay showing by 5 seconds for better UX
      const timer = setTimeout(() => setShow(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  if (!show) return null;

  const handleEnable = async () => {
    setIsRequesting(true);
    await setupPushNotifications(user!.id);
    setIsRequesting(false);
    setShow(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(PUSH_PROMPT_KEY, "1");
    setShow(false);
  };

  return (
    <div className="mx-4 mb-2 bg-gradient-to-l from-brand-green-light to-emerald-50 border border-brand-green/20 rounded-xl p-3 relative animate-in slide-in-from-top duration-300">
      <button
        onClick={handleDismiss}
        className="absolute top-2 end-2 p-1 text-gray-text hover:text-dark rounded-full"
        aria-label="إغلاق"
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0">
          <Bell size={20} className="text-brand-green" />
        </div>
        <div className="flex-1 min-w-0 pe-4">
          <p className="text-sm font-bold text-dark mb-1">
            فعّل الإشعارات
          </p>
          <p className="text-xs text-gray-text mb-3 leading-relaxed">
            اعرف أول ما حد يبعتلك رسالة، أو مزاد يناسبك يبدأ، أو سعر إعلان حفظته ينزل
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEnable}
              disabled={isRequesting}
              className="bg-brand-green text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-brand-green-dark transition-colors disabled:opacity-50"
            >
              {isRequesting ? "جاري التفعيل..." : "فعّل الإشعارات"}
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs text-gray-text hover:text-dark transition-colors"
            >
              مش دلوقتي
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
