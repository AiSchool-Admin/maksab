"use client";

import { useState, useRef } from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  Shield,
  RefreshCw,
  Upload,
  Eye,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Camera,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import type { CommissionPayment } from "@/lib/payment/payment-history";
import { checkPaymentStatus, reuploadScreenshot } from "@/lib/payment/payment-history";

interface PaymentStatusCardProps {
  payment: CommissionPayment;
  onUpdated?: () => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  pending: {
    label: "في انتظار التحويل",
    color: "text-brand-gold",
    bgColor: "bg-brand-gold-light",
    icon: <Clock size={16} className="text-brand-gold" />,
  },
  pending_verification: {
    label: "في انتظار التحقق",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    icon: <Shield size={16} className="text-purple-600" />,
  },
  paid: {
    label: "تم التأكيد ✅",
    color: "text-brand-green",
    bgColor: "bg-brand-green-light",
    icon: <CheckCircle size={16} className="text-brand-green" />,
  },
  declined: {
    label: "مرفوض",
    color: "text-gray-text",
    bgColor: "bg-gray-light",
    icon: <XCircle size={16} className="text-gray-text" />,
  },
  later: {
    label: "مؤجل",
    color: "text-gray-text",
    bgColor: "bg-gray-light",
    icon: <Clock size={16} className="text-gray-text" />,
  },
  cancelled: {
    label: "ملغي",
    color: "text-error",
    bgColor: "bg-red-50",
    icon: <XCircle size={16} className="text-error" />,
  },
};

const METHOD_NAMES: Record<string, string> = {
  instapay: "إنستاباي",
  vodafone_cash: "فودافون كاش",
  fawry: "فوري",
  paymob_card: "بطاقة بنكية",
};

export default function PaymentStatusCard({ payment, onUpdated }: PaymentStatusCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [showScreenshotUpload, setShowScreenshotUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
  const displayAmount = payment.unique_amount || payment.amount;
  const isPending = payment.status === "pending" || payment.status === "pending_verification";

  // Format date
  const createdDate = new Date(payment.created_at);
  const timeAgo = getTimeAgo(createdDate);

  // Check status from server
  const handleCheckStatus = async () => {
    setIsChecking(true);
    await checkPaymentStatus(payment.id);
    onUpdated?.();
    setIsChecking(false);
  };

  // Handle screenshot upload
  const handleScreenshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError("نوع الصورة مش مدعوم. استخدم JPG أو PNG");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("الصورة كبيرة. الحد الأقصى 2 ميجا");
      return;
    }
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (ev) => setScreenshotPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadScreenshot = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    const result = await reuploadScreenshot(payment.id, file);
    setIsUploading(false);

    if (result.success) {
      setShowScreenshotUpload(false);
      setScreenshotPreview(null);
      onUpdated?.();
    } else {
      setUploadError(result.error || "حصل مشكلة، جرب تاني");
    }
  };

  return (
    <div className={`rounded-xl border overflow-hidden ${isPending ? "border-brand-gold/30" : "border-gray-200"}`}>
      {/* Main row */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-4 text-start hover:bg-gray-50 transition-colors"
      >
        {/* Status icon */}
        <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
          {config.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${config.color}`}>{config.label}</span>
            <span className="text-[10px] text-gray-text bg-gray-light px-1.5 py-0.5 rounded-full">
              {payment.commission_type === "pre_payment" ? "مسبقة" : "بعد الصفقة"}
            </span>
          </div>
          <p className="text-sm font-bold text-dark mt-0.5">
            {displayAmount} جنيه
          </p>
          {payment.ad_title && (
            <p className="text-xs text-gray-text truncate mt-0.5">{payment.ad_title}</p>
          )}
          <p className="text-[10px] text-gray-text mt-0.5">
            {METHOD_NAMES[payment.payment_method] || payment.payment_method} — {timeAgo}
          </p>
        </div>

        {/* Expand */}
        {isExpanded ? (
          <ChevronUp size={16} className="text-gray-text flex-shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-gray-text flex-shrink-0" />
        )}
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
          {/* Payment details */}
          <div className="bg-gray-light rounded-xl p-3 space-y-2 mt-3">
            <DetailRow label="المبلغ" value={`${payment.amount} جنيه`} />
            {payment.unique_amount && (
              <DetailRow label="المبلغ الفريد" value={`${payment.unique_amount.toFixed(2)} جنيه`} />
            )}
            <DetailRow label="طريقة الدفع" value={METHOD_NAMES[payment.payment_method] || payment.payment_method} />
            {payment.instapay_reference && (
              <DetailRow label="رقم المرجع" value={payment.instapay_reference} />
            )}
            {payment.verified_at && (
              <DetailRow
                label="تاريخ التأكيد"
                value={new Date(payment.verified_at).toLocaleDateString("ar-EG", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              />
            )}
          </div>

          {/* Screenshot preview */}
          {payment.screenshot_url && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-dark">إثبات الدفع:</p>
              <a
                href={payment.screenshot_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-brand-green font-semibold hover:underline"
              >
                <Eye size={14} />
                عرض السكرين شوت
              </a>
            </div>
          )}

          {/* Actions based on status */}
          <div className="flex gap-2 flex-wrap">
            {/* Check status button for pending payments */}
            {isPending && (
              <Button
                size="sm"
                variant="outline"
                icon={<RefreshCw size={14} className={isChecking ? "animate-spin" : ""} />}
                onClick={handleCheckStatus}
                disabled={isChecking}
              >
                تحقق من الحالة
              </Button>
            )}

            {/* Upload/re-upload screenshot for pending payments */}
            {payment.status === "pending" && !payment.screenshot_url && (
              <Button
                size="sm"
                icon={<Upload size={14} />}
                onClick={() => setShowScreenshotUpload(true)}
              >
                ارفع إثبات الدفع
              </Button>
            )}

            {/* Re-upload screenshot */}
            {payment.status === "pending_verification" && (
              <Button
                size="sm"
                variant="ghost"
                icon={<Camera size={14} />}
                onClick={() => setShowScreenshotUpload(true)}
              >
                ارفع صورة تانية
              </Button>
            )}

            {/* Cancelled - hint to retry */}
            {payment.status === "cancelled" && (
              <div className="flex items-start gap-2 bg-red-50 rounded-xl p-3 w-full">
                <AlertCircle size={16} className="text-error flex-shrink-0 mt-0.5" />
                <p className="text-xs text-error">
                  مقدرناش نتحقق من التحويل. لو حوّلت فعلاً، تواصل مع الدعم أو جرب تاني.
                </p>
              </div>
            )}
          </div>

          {/* Screenshot upload inline */}
          {showScreenshotUpload && (
            <div className="bg-gray-light rounded-xl p-3 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleScreenshotSelect}
              />

              {screenshotPreview ? (
                <div className="space-y-2">
                  <div className="relative rounded-lg overflow-hidden border-2 border-brand-green">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={screenshotPreview}
                      alt="إثبات الدفع"
                      className="w-full max-h-40 object-contain bg-white"
                    />
                    <button
                      onClick={() => {
                        setScreenshotPreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="absolute top-1 start-1 w-6 h-6 bg-white rounded-full shadow flex items-center justify-center"
                    >
                      <X size={12} className="text-gray-text" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center gap-2 hover:border-brand-green transition-colors"
                >
                  <Upload size={20} className="text-brand-green" />
                  <p className="text-xs font-semibold text-dark">اضغط لاختيار الصورة</p>
                </button>
              )}

              {uploadError && (
                <p className="text-xs text-error text-center">{uploadError}</p>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  fullWidth
                  icon={<Upload size={14} />}
                  onClick={handleUploadScreenshot}
                  disabled={!screenshotPreview}
                  isLoading={isUploading}
                >
                  ارفع الصورة
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowScreenshotUpload(false);
                    setScreenshotPreview(null);
                    setUploadError(null);
                  }}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          )}

          {/* Pending verification info */}
          {payment.status === "pending_verification" && (
            <div className="bg-purple-50 rounded-xl p-3 flex items-start gap-2">
              <Shield size={14} className="text-purple-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-purple-800">
                تم استلام إثبات الدفع. هنتحقق من التحويل خلال 24 ساعة وهنبعتلك إشعار تأكيد.
              </p>
            </div>
          )}

          {/* Paid - badge info */}
          {payment.status === "paid" && (
            <div className="bg-brand-green-light rounded-xl p-3 flex items-start gap-2">
              <CheckCircle size={14} className="text-brand-green flex-shrink-0 mt-0.5" />
              <p className="text-xs text-brand-green-dark">
                تم تأكيد دفعك! أنت دلوقتي &quot;داعم مكسب&quot; 💚
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-text">{label}</span>
      <span className="font-semibold text-dark" dir="ltr">{value}</span>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "دلوقتي";
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays < 7) return `منذ ${diffDays} يوم`;
  return date.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}
