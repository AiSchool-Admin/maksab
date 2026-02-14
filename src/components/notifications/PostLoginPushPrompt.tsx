"use client";

import { useState } from "react";
import { Bell, X, MessageCircle, Flame, TrendingDown } from "lucide-react";
import { setupPushNotifications } from "@/lib/notifications/notification-service";

interface PostLoginPushPromptProps {
  userId: string;
  onClose: () => void;
}

export default function PostLoginPushPrompt({
  userId,
  onClose,
}: PostLoginPushPromptProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleEnable = async () => {
    setIsRequesting(true);
    await setupPushNotifications(userId);
    setIsRequesting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm mx-auto p-6 pb-8 sm:pb-6 animate-in slide-in-from-bottom duration-300 shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-3 end-3 p-1.5 text-gray-text hover:text-dark rounded-full hover:bg-gray-light transition-colors"
          aria-label="إغلاق"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-brand-green/10 rounded-full flex items-center justify-center">
            <Bell size={32} className="text-brand-green" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-dark text-center mb-2">
          متفوتش أي فرصة!
        </h3>
        <p className="text-sm text-gray-text text-center mb-5">
          فعّل الإشعارات عشان توصلك التحديثات على طول
        </p>

        {/* Benefits */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <MessageCircle size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-dark">رسائل المشتريين</p>
              <p className="text-[11px] text-gray-text">اعرف أول ما حد يبعتلك عرض</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Flame size={18} className="text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-dark">مزادات حية</p>
              <p className="text-[11px] text-gray-text">لما حد يزايد عليك — الحق قبل ما يفوتك!</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingDown size={18} className="text-brand-green" />
            </div>
            <div>
              <p className="text-sm font-semibold text-dark">تخفيضات الأسعار</p>
              <p className="text-[11px] text-gray-text">لما سعر حاجة حفظتها ينزل</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={handleEnable}
          disabled={isRequesting}
          className="w-full bg-brand-green hover:bg-brand-green-dark text-white text-sm font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50 mb-3"
        >
          {isRequesting ? "جاري التفعيل..." : "فعّل الإشعارات 🔔"}
        </button>
        <button
          onClick={onClose}
          className="w-full text-sm text-gray-text hover:text-dark transition-colors py-2"
        >
          مش دلوقتي
        </button>
      </div>
    </div>
  );
}
