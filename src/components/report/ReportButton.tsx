"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  REPORT_REASONS,
  submitReport,
  type ReportReason,
  type ReportTargetType,
} from "@/lib/reports/report-service";

interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  /** Optional: show as icon-only button */
  variant?: "icon" | "text" | "menu-item";
}

export default function ReportButton({ targetType, targetId, variant = "icon" }: ReportButtonProps) {
  const { requireAuth, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleOpen = async () => {
    const authedUser = await requireAuth();
    if (!authedUser) return;
    setIsOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedReason || !user) return;

    setIsSubmitting(true);
    const res = await submitReport({
      reporterId: user.id,
      targetType,
      targetAdId: targetType === "ad" ? targetId : undefined,
      targetUserId: targetType === "user" ? targetId : undefined,
      reason: selectedReason,
      details: details.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.success) {
      setResult({ success: true, message: "تم تسجيل البلاغ بنجاح. شكراً لمساعدتك" });
    } else {
      setResult({ success: false, message: res.error || "حصل مشكلة. جرب تاني" });
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedReason(null);
    setDetails("");
    setResult(null);
  };

  const label = targetType === "ad" ? "إبلاغ عن الإعلان" : "إبلاغ عن المستخدم";

  return (
    <>
      {variant === "icon" && (
        <button
          onClick={handleOpen}
          className="p-2 text-gray-text hover:text-error rounded-full hover:bg-gray-light transition-colors"
          aria-label={label}
          title={label}
        >
          <Flag size={18} />
        </button>
      )}

      {variant === "text" && (
        <button
          onClick={handleOpen}
          className="flex items-center gap-1.5 text-xs text-gray-text hover:text-error transition-colors"
        >
          <Flag size={14} />
          <span>{label}</span>
        </button>
      )}

      {variant === "menu-item" && (
        <button
          onClick={handleOpen}
          className="w-full flex items-center gap-2 px-4 py-3 text-sm text-error hover:bg-red-50 transition-colors"
        >
          <Flag size={16} />
          <span>{label}</span>
        </button>
      )}

      <Modal isOpen={isOpen} onClose={handleClose} title={label}>
        {result ? (
          <div className="text-center py-6 space-y-4">
            <div className="text-5xl">{result.success ? "✅" : "❌"}</div>
            <p className="text-sm text-dark font-semibold">{result.message}</p>
            <button
              onClick={handleClose}
              className="w-full py-3 bg-brand-green text-white font-bold rounded-xl hover:bg-brand-green-dark transition-colors"
            >
              تمام
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-text">
              إيه سبب البلاغ؟ اختار السبب المناسب وهنراجع البلاغ في أقرب وقت.
            </p>

            {/* Reason selection */}
            <div className="space-y-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setSelectedReason(r.value)}
                  className={`w-full text-start px-4 py-3 rounded-xl border transition-colors text-sm ${
                    selectedReason === r.value
                      ? "border-error bg-red-50 text-error font-semibold"
                      : "border-gray-light hover:border-gray-300 text-dark"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Additional details */}
            {selectedReason && (
              <div>
                <label className="text-sm font-semibold text-dark mb-1.5 block">
                  تفاصيل إضافية (اختياري)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="اكتب أي تفاصيل تانية تساعدنا نفهم المشكلة..."
                  className="w-full px-4 py-3 border border-gray-light rounded-xl text-sm resize-none focus:ring-2 focus:ring-brand-green focus:border-transparent outline-none"
                  rows={3}
                  maxLength={500}
                />
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={!selectedReason || isSubmitting}
              className="w-full py-3 bg-error text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "جاري الإرسال..." : "إرسال البلاغ"}
            </button>
          </div>
        )}
      </Modal>
    </>
  );
}
