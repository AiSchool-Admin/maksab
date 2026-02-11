"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Phone, RefreshCw, Smartphone, Store, User as UserIcon, UserCircle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import {
  sendOTP,
  verifyOTP,
  verifyOTPViaFirebase,
  type UserProfile,
} from "@/lib/supabase/auth";
import { egyptianPhoneSchema, otpSchema } from "@/lib/utils/validators";
import { isFirebaseConfigured } from "@/lib/firebase/config";

export type AccountType = "individual" | "merchant";

interface AuthBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile, accountType: AccountType) => void;
}

type Step = "phone" | "otp";

export default function AuthBottomSheet({
  isOpen,
  onClose,
  onSuccess,
}: AuthBottomSheetProps) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [otpChannel, setOtpChannel] = useState<string | null>(null);
  const [otpToken, setOtpToken] = useState<string>("");
  const [devCode, setDevCode] = useState<string | null>(null);

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep("phone");
      setPhone("");
      setDisplayName("");
      setAccountType("individual");
      setOtp(["", "", "", "", "", ""]);
      setError(null);
      setIsSubmitting(false);
      setResendTimer(0);
      setOtpChannel(null);
      setOtpToken("");
      setDevCode(null);
      setTimeout(() => phoneInputRef.current?.focus(), 400);
    }
  }, [isOpen]);

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // ── Cleanup Firebase reCAPTCHA on unmount ──────────────────────
  useEffect(() => {
    return () => {
      import("@/lib/firebase/phone-auth").then(({ cleanupRecaptcha }) => {
        cleanupRecaptcha();
      }).catch(() => {});
    };
  }, []);

  // ── Send OTP ────────────────────────────────────────────────────
  const handlePhoneSubmit = async () => {
    setError(null);
    const result = egyptianPhoneSchema.safeParse(phone);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setIsSubmitting(true);
    const otpResult = await sendOTP(phone);

    if (otpResult.error) {
      setIsSubmitting(false);
      setError(otpResult.error);
      // If rate limited, set a longer resend timer
      if (otpResult.retry_after) {
        setResendTimer(otpResult.retry_after);
      }
      return;
    }

    // Firebase channel: send OTP via Firebase client SDK
    if (otpResult.channel === "firebase" && isFirebaseConfigured()) {
      try {
        const { setupRecaptcha, sendFirebaseOTP } = await import(
          "@/lib/firebase/phone-auth"
        );
        setupRecaptcha("recaptcha-container-sheet");
        const firebaseResult = await sendFirebaseOTP(phone);
        setIsSubmitting(false);

        if (!firebaseResult.success) {
          setError(firebaseResult.error || "حصلت مشكلة في إرسال الكود");
          return;
        }
      } catch {
        setIsSubmitting(false);
        setError("حصلت مشكلة في إرسال الكود. جرب تاني");
        return;
      }
    } else {
      setIsSubmitting(false);
    }

    setOtpToken(otpResult.token || "");
    setOtpChannel(otpResult.channel || null);
    setDevCode(otpResult.dev_code || null);

    setStep("otp");
    setResendTimer(60);
    setTimeout(() => otpInputsRef.current[0]?.focus(), 300);

    if (otpResult.channel !== "firebase") {
      tryWebOTP();
    }
  };

  // ── WebOTP: Auto-read SMS verification code ─────────────────────
  const tryWebOTP = async () => {
    try {
      if ("OTPCredential" in window) {
        const content = await navigator.credentials.get({
          // @ts-expect-error WebOTP API not in all TS defs yet
          otp: { transport: ["sms"] },
        });
        if (content && "code" in content) {
          const code = (content as { code: string }).code;
          if (code && /^\d{6}$/.test(code)) {
            const digits = code.split("");
            setOtp(digits);
            handleOtpSubmit(code);
          }
        }
      }
    } catch {
      // WebOTP not supported — that's fine
    }
  };

  // ── OTP input handling ──────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError(null);

    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    const fullOtp = newOtp.join("");
    if (fullOtp.length === 6 && /^\d{6}$/.test(fullOtp)) {
      handleOtpSubmit(fullOtp);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const digits = pasted.split("");
      setOtp(digits);
      otpInputsRef.current[5]?.focus();
      handleOtpSubmit(pasted);
    }
  };

  // ── OTP verification ────────────────────────────────────────────
  const handleOtpSubmit = useCallback(
    async (otpCode?: string) => {
      const code = otpCode || otp.join("");
      setError(null);

      const result = otpSchema.safeParse(code);
      if (!result.success) {
        setError(result.error.issues[0].message);
        return;
      }

      setIsSubmitting(true);

      let response: { user: UserProfile | null; error: string | null };

      // Firebase channel: verify via Firebase, then exchange for our session
      if (otpChannel === "firebase") {
        try {
          const { verifyFirebaseOTP } = await import("@/lib/firebase/phone-auth");
          const fbResult = await verifyFirebaseOTP(code);

          if (!fbResult.success || !fbResult.idToken) {
            setIsSubmitting(false);
            setError(fbResult.error || "الكود غلط. جرب تاني");
            setOtp(["", "", "", "", "", ""]);
            otpInputsRef.current[0]?.focus();
            return;
          }

          response = await verifyOTPViaFirebase(
            fbResult.idToken,
            displayName.trim() || undefined,
          );
        } catch {
          setIsSubmitting(false);
          setError("حصلت مشكلة في التحقق. جرب تاني");
          setOtp(["", "", "", "", "", ""]);
          otpInputsRef.current[0]?.focus();
          return;
        }
      } else {
        // Standard HMAC verification
        response = await verifyOTP(phone, code, otpToken, displayName.trim() || undefined);
      }

      setIsSubmitting(false);

      if (response.error || !response.user) {
        setError(response.error || "حصلت مشكلة. جرب تاني");
        setOtp(["", "", "", "", "", ""]);
        otpInputsRef.current[0]?.focus();
        return;
      }

      // Apply referral code if stored (from ?ref= URL)
      import("@/lib/loyalty/loyalty-service").then(({ getStoredReferralCode, applyReferralCode, clearStoredReferralCode }) => {
        const refCode = getStoredReferralCode();
        if (refCode && response.user) {
          applyReferralCode(response.user.id, refCode).then(() => {
            clearStoredReferralCode();
          });
        }
      });

      onSuccess(response.user, accountType);
    },
    [otp, phone, otpToken, otpChannel, displayName, onSuccess, accountType],
  );

  // ── Resend OTP ──────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError(null);
    setIsSubmitting(true);

    const resendResult = await sendOTP(phone);

    if (resendResult.error) {
      setIsSubmitting(false);
      setError(resendResult.error);
      // If rate limited, set the timer from the server response
      if (resendResult.retry_after) {
        setResendTimer(resendResult.retry_after);
      }
      return;
    }

    // Firebase channel: re-send via Firebase
    if (resendResult.channel === "firebase" && isFirebaseConfigured()) {
      try {
        const { setupRecaptcha, sendFirebaseOTP } = await import(
          "@/lib/firebase/phone-auth"
        );
        setupRecaptcha("recaptcha-container-sheet");
        const firebaseResult = await sendFirebaseOTP(phone);
        setIsSubmitting(false);

        if (!firebaseResult.success) {
          setError(firebaseResult.error || "حصلت مشكلة في إرسال الكود");
          return;
        }
      } catch {
        setIsSubmitting(false);
        setError("حصلت مشكلة في إرسال الكود. جرب تاني");
        return;
      }
    } else {
      setIsSubmitting(false);
    }

    setOtpToken(resendResult.token || "");
    setOtpChannel(resendResult.channel || null);
    setDevCode(resendResult.dev_code || null);
    setResendTimer(60);
    setOtp(["", "", "", "", "", ""]);
    otpInputsRef.current[0]?.focus();

    if (resendResult.channel !== "firebase") {
      tryWebOTP();
    }
  };

  // ── Format phone for display ────────────────────────────────────
  const formatPhone = (p: string) => {
    if (p.length >= 7) return `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7)}`;
    if (p.length >= 3) return `${p.slice(0, 3)}-${p.slice(3)}`;
    return p;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === "otp" ? "كود التأكيد" : "سجّل دخولك"}
    >
      {/* ── Step 1: Phone + Account Type ──────────────────────────── */}
      {step === "phone" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-text">
            سجّل برقم موبايلك عشان تكمّل
          </p>

          {/* Phone number */}
          <div className="w-full">
            <label className="block text-sm font-semibold text-dark mb-1.5">
              <Phone size={14} className="inline ml-1 text-brand-green" />
              رقم الموبايل
            </label>
            <div className="relative">
              <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm text-gray-text font-semibold pointer-events-none select-none" dir="ltr">
                +20
              </span>
              <input
                ref={phoneInputRef}
                type="tel"
                dir="ltr"
                inputMode="numeric"
                maxLength={11}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, ""));
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && phone.length === 11) handlePhoneSubmit();
                }}
                placeholder="01XXXXXXXXX"
                className={`w-full ps-14 pe-4 py-3 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark text-lg tracking-wider placeholder:text-gray-text placeholder:tracking-normal ${error ? "border-error bg-error/5" : ""}`}
                autoComplete="tel"
              />
            </div>
          </div>

          {/* Display name (optional) */}
          <div className="w-full">
            <label className="block text-sm font-semibold text-dark mb-1.5">
              <UserCircle size={14} className="inline ml-1 text-brand-green" />
              الاسم
              <span className="text-gray-text font-normal text-xs mr-1">(اختياري)</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="اسمك اللي هيظهر للناس"
              maxLength={50}
              className="w-full px-4 py-3 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark text-sm placeholder:text-gray-text"
              autoComplete="name"
            />
          </div>

          {/* Account type selection */}
          <div className="w-full">
            <label className="block text-sm font-semibold text-dark mb-2">
              أنا...
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAccountType("individual")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                  accountType === "individual"
                    ? "border-brand-green bg-brand-green-light"
                    : "border-gray-light bg-white hover:border-gray-300"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  accountType === "individual" ? "bg-brand-green text-white" : "bg-gray-light text-gray-text"
                }`}>
                  <UserIcon size={20} />
                </div>
                <span className="text-sm font-bold text-dark">فرد</span>
                <span className="text-[10px] text-gray-text leading-tight">بيع وشراء شخصي</span>
              </button>

              <button
                type="button"
                onClick={() => setAccountType("merchant")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                  accountType === "merchant"
                    ? "border-brand-green bg-brand-green-light"
                    : "border-gray-light bg-white hover:border-gray-300"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  accountType === "merchant" ? "bg-brand-green text-white" : "bg-gray-light text-gray-text"
                }`}>
                  <Store size={20} />
                </div>
                <span className="text-sm font-bold text-dark">تاجر</span>
                <span className="text-[10px] text-gray-text leading-tight">عندي محل / معرض / مكتب</span>
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-error text-center bg-error/5 py-2 px-3 rounded-lg">
              {error}
            </p>
          )}

          <Button
            fullWidth
            size="lg"
            isLoading={isSubmitting}
            onClick={handlePhoneSubmit}
            disabled={phone.length < 11}
          >
            <Smartphone size={18} className="ml-2" />
            إرسال كود التأكيد
          </Button>

        </div>
      )}

      {/* ── Step 2: OTP ──────────────────────────────────────────── */}
      {step === "otp" && (
        <div className="space-y-5">
          <div className="text-center">
            <div className="w-14 h-14 bg-brand-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Smartphone size={24} className="text-brand-green" />
            </div>
            <p className="text-sm text-gray-text">
              {otpChannel === "whatsapp" ? "أدخل الكود اللي وصلك على واتساب" : otpChannel === "firebase" ? "أدخل الكود اللي وصلك SMS على" : otpChannel === "dev" ? "كود التأكيد" : "أدخل الكود اللي وصلك على"}{" "}
              {otpChannel !== "dev" && (
                <span className="font-bold text-dark" dir="ltr">
                  {formatPhone(phone)}
                </span>
              )}
            </p>
          </div>

          {/* Dev mode: show OTP code directly */}
          {devCode && (
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-text mb-1">كود التأكيد (وضع التطوير)</p>
              <p className="text-2xl font-bold text-dark tracking-[0.3em]" dir="ltr">{devCode}</p>
            </div>
          )}

          {/* OTP 6-digit inputs */}
          <div className="flex gap-2 justify-center" dir="ltr">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  otpInputsRef.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                onPaste={i === 0 ? handleOtpPaste : undefined}
                className={`w-11 h-13 text-center text-xl font-bold bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all ${error ? "border-error bg-error/5" : ""} ${digit ? "text-dark border-brand-green/30" : "text-gray-text"}`}
                autoComplete={i === 0 ? "one-time-code" : "off"}
              />
            ))}
          </div>

          {error && (
            <p className="text-xs text-error text-center bg-error/5 py-2 px-3 rounded-lg">
              {error}
            </p>
          )}

          <Button
            fullWidth
            size="lg"
            isLoading={isSubmitting}
            onClick={() => handleOtpSubmit()}
            disabled={otp.join("").length < 6}
          >
            تأكيد الرقم
          </Button>

          {/* Resend timer */}
          <div className="text-center">
            {resendTimer > 0 ? (
              <p className="text-sm text-gray-text">
                إعادة إرسال الكود بعد{" "}
                <span className="font-bold text-dark">{resendTimer}</span>{" "}
                ثانية
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-1.5 mx-auto text-sm text-brand-green font-semibold hover:text-brand-green-dark transition-colors"
              >
                <RefreshCw size={14} />
                إعادة إرسال الكود
              </button>
            )}
          </div>

          {/* Change phone */}
          <button
            onClick={() => {
              setStep("phone");
              setError(null);
              setOtp(["", "", "", "", "", ""]);
            }}
            className="w-full text-center text-xs text-gray-text hover:text-brand-green transition-colors"
          >
            تغيير رقم الموبايل؟
          </button>
        </div>
      )}

      {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
      <div id="recaptcha-container-sheet" />
    </Modal>
  );
}
