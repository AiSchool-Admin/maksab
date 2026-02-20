"use client";

import { useState, useEffect } from "react";
import { X, Mail, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { ga4Event } from "@/lib/analytics/ga4";

const STORAGE_KEY = "maksab_email_captured";
const SHOW_DELAY_MS = 30_000; // 30 seconds

/**
 * Email capture popup/banner.
 * Shows 30 seconds after first visit.
 * Does not show again after subscribe or dismiss.
 */
export default function EmailCapture() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    // Skip if already captured or dismissed
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return;

    const timer = setTimeout(() => {
      setVisible(true);
      ga4Event("email_capture_shown", { method: "popup" });
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "dismissed");
    ga4Event("email_capture_dismissed", {});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("ادخل إيميل صحيح");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/email/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          utm_source: new URLSearchParams(window.location.search).get("utm_source") || undefined,
          utm_campaign: new URLSearchParams(window.location.search).get("utm_campaign") || undefined,
        }),
      });

      if (res.ok) {
        setIsSubscribed(true);
        localStorage.setItem(STORAGE_KEY, "subscribed");
        ga4Event("email_subscribe", { method: "popup" });
        toast.success("تم الاشتراك — هنبعتلك أحسن العروض!");
        setTimeout(() => setVisible(false), 2000);
      } else {
        const data = await res.json();
        toast.error(data.error || "حصل مشكلة — جرب تاني");
      }
    } catch {
      toast.error("حصل مشكلة — جرب تاني");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 inset-x-0 z-[90] px-4 animate-slide-up">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 relative">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 left-2 p-1.5 text-gray-text hover:text-dark rounded-full hover:bg-gray-light transition-colors"
          aria-label="إغلاق"
        >
          <X size={16} />
        </button>

        {isSubscribed ? (
          <div className="flex items-center gap-3 py-2">
            <CheckCircle size={24} className="text-brand-green flex-shrink-0" />
            <p className="text-sm font-bold text-brand-green">
              تم الاشتراك — هنبعتلك أحسن العروض أسبوعياً!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail size={20} className="text-brand-green flex-shrink-0" />
              <h3 className="text-sm font-bold text-dark">
                احصل على أحسن الصفقات أسبوعياً 💚
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                dir="ltr"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 h-10 px-3 rounded-xl bg-gray-light border border-gray-200 text-sm text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green/50"
                required
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-5 bg-brand-green text-white font-bold text-xs rounded-xl hover:bg-brand-green-dark transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {isSubmitting ? "..." : "اشترك"}
              </button>
            </form>

            <p className="text-[10px] text-gray-text">
              مش هنزعجك — أسبوعياً بس أحسن العروض في مكسب
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
