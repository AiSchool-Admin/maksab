"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Phone, ArrowLeft, RefreshCw, Shield } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { sendOTP, verifyOTP, devLogin, type UserProfile } from "@/lib/supabase/auth";
import { egyptianPhoneSchema, otpSchema } from "@/lib/utils/validators";

const IS_DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

interface AuthBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

type Step = "phone" | "otp";

export default function AuthBottomSheet({
  isOpen,
  onClose,
  onSuccess,
}: AuthBottomSheetProps) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep("phone");
      setPhone("");
      setOtp(["", "", "", "", "", ""]);
      setError(null);
      setIsSubmitting(false);
      setResendTimer(0);
      // Focus phone input after animation
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

  // ── Phone step ──────────────────────────────────────────────────────
  const handlePhoneSubmit = async () => {
    setError(null);

    const result = egyptianPhoneSchema.safeParse(phone);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setIsSubmitting(true);
    const { error: sendError } = await sendOTP(phone);
    setIsSubmitting(false);

    if (sendError) {
      setError(sendError);
      return;
    }

    setStep("otp");
    setResendTimer(60);
    // Focus first OTP input
    setTimeout(() => otpInputsRef.current[0]?.focus(), 300);
  };

  // ── OTP input handling ──────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError(null);

    // Auto-advance to next input
    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are filled
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

  // Handle paste of full OTP
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

  // ── OTP verification ────────────────────────────────────────────────
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
      const { user, error: verifyError } = await verifyOTP(phone, code);
      setIsSubmitting(false);

      if (verifyError || !user) {
        setError(verifyError || "حصلت مشكلة. جرب تاني");
        setOtp(["", "", "", "", "", ""]);
        otpInputsRef.current[0]?.focus();
        return;
      }

      // For dev mode, persist session
      if (IS_DEV_MODE) {
        devLogin();
      }

      onSuccess(user);
    },
    [otp, phone, onSuccess],
  );

  // ── Resend OTP ──────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError(null);
    setIsSubmitting(true);
    const { error: sendError } = await sendOTP(phone);
    setIsSubmitting(false);

    if (sendError) {
      setError(sendError);
      return;
    }

    setResendTimer(60);
    setOtp(["", "", "", "", "", ""]);
    otpInputsRef.current[0]?.focus();
  };

  // ── Dev bypass login ────────────────────────────────────────────────
  const handleDevLogin = async () => {
    setIsSubmitting(true);
    devLogin();
    const { user } = await verifyOTP("01000000000", "000000");
    setIsSubmitting(false);
    if (user) onSuccess(user);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === "phone" ? "سجّل برقم موبايلك" : "كود التأكيد"}
    >
      {step === "phone" ? (
        // ── Phone Input Screen ──────────────────────────────────────
        <div className="space-y-5">
          <p className="text-sm text-gray-text">
            أدخل رقم موبايلك المصري وهنبعتلك كود تأكيد
          </p>

          {/* Phone input */}
          <div className="w-full">
            <div className="relative">
              <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-text pointer-events-none">
                <Phone size={18} />
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
                  if (e.key === "Enter") handlePhoneSubmit();
                }}
                placeholder="01XXXXXXXXX"
                className={`w-full px-4 py-3 pe-10 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark text-center text-lg tracking-widest placeholder:text-gray-text placeholder:tracking-normal ${
                  error ? "border-error bg-error/5" : ""
                }`}
                autoComplete="tel"
              />
            </div>
            {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
            <p className="mt-1.5 text-[11px] text-gray-text">
              لازم يبدأ بـ 010 أو 011 أو 012 أو 015
            </p>
          </div>

          <Button
            fullWidth
            size="lg"
            isLoading={isSubmitting}
            onClick={handlePhoneSubmit}
            disabled={phone.length < 11}
          >
            إرسال كود التأكيد
          </Button>

          {/* Dev bypass */}
          {IS_DEV_MODE && (
            <button
              onClick={handleDevLogin}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-gray-text hover:text-brand-green transition-colors"
            >
              <Shield size={16} />
              دخول المطوّر (بدون OTP)
            </button>
          )}
        </div>
      ) : (
        // ── OTP Input Screen ────────────────────────────────────────
        <div className="space-y-5">
          {/* Back button + info */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setStep("phone");
                setError(null);
                setOtp(["", "", "", "", "", ""]);
              }}
              className="p-1 text-gray-text hover:text-dark transition-colors btn-icon-sm"
              aria-label="رجوع"
            >
              <ArrowLeft size={18} />
            </button>
            <p className="text-sm text-gray-text">
              أدخل الكود اللي وصلك على{" "}
              <span className="font-semibold text-dark" dir="ltr">
                {phone}
              </span>
            </p>
          </div>

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
                className={`w-11 h-13 text-center text-xl font-bold bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all ${
                  error ? "border-error bg-error/5" : ""
                } ${digit ? "text-dark" : "text-gray-text"}`}
                autoComplete={i === 0 ? "one-time-code" : "off"}
              />
            ))}
          </div>

          {error && (
            <p className="text-xs text-error text-center">{error}</p>
          )}

          <Button
            fullWidth
            size="lg"
            isLoading={isSubmitting}
            onClick={() => handleOtpSubmit()}
            disabled={otp.join("").length < 6}
          >
            تأكيد
          </Button>

          {/* Resend timer */}
          <div className="text-center">
            {resendTimer > 0 ? (
              <p className="text-sm text-gray-text">
                إعادة إرسال الكود بعد{" "}
                <span className="font-semibold text-dark">{resendTimer}</span>{" "}
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
        </div>
      )}
    </Modal>
  );
}
