"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Shield,
  Crown,
  Phone,
  CreditCard,
  ChevronLeft,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import {
  getUserVerificationProfile,
  submitIdVerification,
  type UserVerificationProfile,
  type VerificationLevel,
} from "@/lib/verification/verification-service";
import toast from "react-hot-toast";

interface VerificationSectionProps {
  userId: string;
}

const levelConfig: Record<
  VerificationLevel,
  { icon: typeof Shield; label: string; color: string; description: string }
> = {
  basic: {
    icon: Shield,
    label: "أساسي",
    color: "text-gray-500 bg-gray-100",
    description: "تم توثيق رقم الموبايل",
  },
  verified: {
    icon: ShieldCheck,
    label: "موثق",
    color: "text-blue-700 bg-blue-50",
    description: "تم توثيق الهوية الوطنية",
  },
  premium: {
    icon: Crown,
    label: "متميز",
    color: "text-brand-gold bg-brand-gold-light",
    description: "هوية موثقة + بائع موثوق",
  },
};

export default function VerificationSection({ userId }: VerificationSectionProps) {
  const [profile, setProfile] = useState<UserVerificationProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showIdModal, setShowIdModal] = useState(false);
  const [nationalId, setNationalId] = useState("");
  const [idPhotoPreview, setIdPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getUserVerificationProfile(userId).then((p) => {
      setProfile(p);
      setIsLoading(false);
    });
  }, [userId]);

  const handleSubmitId = async () => {
    if (nationalId.length !== 14) {
      toast.error("الرقم القومي يجب أن يكون 14 رقم");
      return;
    }

    setIsSubmitting(true);
    // Hash the national ID client-side (never send raw)
    const encoder = new TextEncoder();
    const data = encoder.encode(nationalId);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const result = await submitIdVerification(userId, hashHex);
    setIsSubmitting(false);

    if (result.success) {
      toast.success("تم إرسال طلب التوثيق. هنراجعه في أقرب وقت");
      setShowIdModal(false);
      setNationalId("");
      // Refresh profile
      const updated = await getUserVerificationProfile(userId);
      setProfile(updated);
    } else {
      toast.error(result.error || "حصل مشكلة، جرب تاني");
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="bg-gray-light rounded-xl p-4 animate-pulse">
        <div className="h-5 w-32 bg-gray-200 rounded mb-3" />
        <div className="h-16 bg-gray-200 rounded" />
      </div>
    );
  }

  const currentLevel = levelConfig[profile.level];
  const CurrentIcon = currentLevel.icon;

  const idVerification = profile.verifications.find((v) => v.type === "national_id");

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-dark">مستوى التوثيق</h3>

        {/* Current level card */}
        <div className={`rounded-xl p-4 ${currentLevel.color}`}>
          <div className="flex items-center gap-3">
            <CurrentIcon size={24} />
            <div className="flex-1">
              <p className="text-sm font-bold">مستوى: {currentLevel.label}</p>
              <p className="text-[11px] opacity-80">{currentLevel.description}</p>
            </div>
          </div>
        </div>

        {/* Verification steps */}
        <div className="space-y-2">
          {/* Phone verification - always done */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Phone size={16} className="text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-dark">توثيق رقم الموبايل</p>
              <p className="text-[11px] text-gray-text">تم التوثيق عن طريق OTP</p>
            </div>
            <CheckCircle2 size={20} className="text-green-600" />
          </div>

          {/* National ID verification */}
          <div
            className={`flex items-center gap-3 p-3 rounded-xl ${
              profile.isIdVerified
                ? "bg-green-50"
                : idVerification?.status === "pending"
                  ? "bg-yellow-50"
                  : "bg-gray-light"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                profile.isIdVerified
                  ? "bg-green-100"
                  : idVerification?.status === "pending"
                    ? "bg-yellow-100"
                    : "bg-gray-200"
              }`}
            >
              <CreditCard
                size={16}
                className={
                  profile.isIdVerified
                    ? "text-green-600"
                    : idVerification?.status === "pending"
                      ? "text-yellow-600"
                      : "text-gray-400"
                }
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-dark">توثيق الهوية الوطنية</p>
              <p className="text-[11px] text-gray-text">
                {profile.isIdVerified
                  ? "تم التوثيق"
                  : idVerification?.status === "pending"
                    ? "قيد المراجعة"
                    : idVerification?.status === "rejected"
                      ? "مرفوض — يمكنك إعادة التقديم"
                      : "يزود الثقة في إعلاناتك"}
              </p>
            </div>
            {profile.isIdVerified ? (
              <CheckCircle2 size={20} className="text-green-600" />
            ) : idVerification?.status === "pending" ? (
              <Clock size={20} className="text-yellow-600" />
            ) : idVerification?.status === "rejected" ? (
              <button onClick={() => setShowIdModal(true)}>
                <XCircle size={20} className="text-red-500" />
              </button>
            ) : (
              <button
                onClick={() => setShowIdModal(true)}
                className="text-sm font-semibold text-brand-green flex items-center gap-0.5"
              >
                وثّق
                <ChevronLeft size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          {(["basic", "verified", "premium"] as VerificationLevel[]).map((lvl, i) => (
            <div key={lvl} className="flex-1 flex items-center gap-1">
              <div
                className={`h-1.5 flex-1 rounded-full ${
                  (lvl === "basic" || (lvl === "verified" && profile.level !== "basic") || (lvl === "premium" && profile.level === "premium"))
                    ? "bg-brand-green"
                    : "bg-gray-200"
                }`}
              />
              {i < 2 && <div className="w-0" />}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-gray-text px-1">
          <span>أساسي</span>
          <span>موثق</span>
          <span>متميز</span>
        </div>
      </div>

      {/* National ID Modal */}
      <Modal
        isOpen={showIdModal}
        onClose={() => setShowIdModal(false)}
        title="توثيق الهوية الوطنية"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-sm text-blue-700">
              الرقم القومي يتم تشفيره ولا يُخزن كنص. نستخدمه فقط للتحقق من هويتك.
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold text-dark block mb-2">
              الرقم القومي (14 رقم)
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={14}
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ""))}
              placeholder="أدخل الرقم القومي"
              className="w-full border border-gray-light rounded-xl p-3 text-base text-dark placeholder:text-gray-text/50 focus:outline-none focus:border-brand-green transition-colors"
              dir="ltr"
            />
            <p className="text-[11px] text-gray-text mt-1">
              {nationalId.length}/14 رقم
            </p>
          </div>

          {/* ID Photo upload (optional) */}
          <div>
            <label className="text-sm font-semibold text-dark block mb-2">
              صورة البطاقة (اختياري)
            </label>
            <p className="text-[11px] text-gray-text mb-2">
              إرفاق صورة يساعد في تسريع المراجعة
            </p>
            {idPhotoPreview ? (
              <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-gray-light border border-gray-200">
                <Image
                  src={idPhotoPreview}
                  alt="صورة البطاقة"
                  fill
                  className="object-contain"
                />
                <button
                  type="button"
                  onClick={() => setIdPhotoPreview(null)}
                  className="absolute top-2 end-2 bg-error text-white p-1 rounded-full btn-icon-sm"
                >
                  <XCircle size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-brand-green hover:bg-brand-green-light/30 transition-colors">
                <CreditCard size={24} className="text-gray-text mb-1" />
                <span className="text-xs text-gray-text">اضغط لالتقاط أو اختيار صورة</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const { compressImage } = await import("@/lib/utils/image-compress");
                      const result = await compressImage(file);
                      setIdPhotoPreview(result.preview);
                    } catch {
                      toast.error("حصل مشكلة في تحميل الصورة");
                    }
                  }}
                />
              </label>
            )}
          </div>

          <Button
            fullWidth
            onClick={handleSubmitId}
            isLoading={isSubmitting}
            disabled={nationalId.length !== 14}
          >
            إرسال للمراجعة
          </Button>
        </div>
      </Modal>
    </>
  );
}
