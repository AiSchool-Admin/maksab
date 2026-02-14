"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw, Phone, Smartphone, Home, Store, User as UserIcon } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { useAuth, setPendingMerchant } from "@/components/auth/AuthProvider";
import {
  sendOTP,
  verifyOTP,
  verifyOTPViaFirebase,
  type UserProfile,
} from "@/lib/supabase/auth";
import { egyptianPhoneSchema, normalizeEgyptianPhone, otpSchema } from "@/lib/utils/validators";
import { isFirebaseConfigured } from "@/lib/firebase/config";

type Step = "phone" | "otp";
type AccountType = "individual" | "merchant";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

/** Normalize any phone format to 11-digit Egyptian number.
 * Re-uses the shared normalizeEgyptianPhone for validation,
 * but this version is used only for browser autofill normalization.
 */
function normalizePhone(raw: string): string {
  return normalizeEgyptianPhone(raw);
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser } = useAuth();
  const redirectTo = searchParams.get("redirect") || "/";

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
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

  // Track auto-fill animation
  const autoFillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    if (user) {
      router.replace(redirectTo);
    }
  }, [user, router, redirectTo]);

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Focus phone input on mount — triggers browser autofill suggestion
  useEffect(() => {
    if (step === "phone") {
      setTimeout(() => phoneInputRef.current?.focus(), 300);
    }
  }, [step]);

  const handleSuccess = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);

    // If merchant and doesn't have a store yet, mark as pending and redirect
    if (accountType === "merchant" && !loggedInUser.store_id) {
      setPendingMerchant();
      router.replace("/store/create");
    } else {
      router.replace(redirectTo);
    }
  };

  // ── Handle phone input changes (normalize autofill values) ─────────
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // If browser autofill gives us +20xxx or 20xxx, normalize it
    const normalized = normalizePhone(raw);
    setPhone(normalized);
    setError(null);
  };

  // ── Send OTP ──────────────────────────────────────────────────────
  const handlePhoneSubmit = async () => {
    setError(null);
    const result = egyptianPhoneSchema.safeParse(phone);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    // Normalize phone (handles 10-digit input without leading 0)
    const normalizedPhone = normalizeEgyptianPhone(phone);
    setPhone(normalizedPhone);

    setIsSubmitting(true);
    const otpResult = await sendOTP(normalizedPhone);

    if (otpResult.error) {
      setIsSubmitting(false);
      setError(otpResult.error);
      return;
    }

    // Firebase channel: send OTP via Firebase client SDK
    if (otpResult.channel === "firebase" && isFirebaseConfigured()) {
      try {
        const { setupRecaptcha, sendFirebaseOTP } = await import(
          "@/lib/firebase/phone-auth"
        );
        setupRecaptcha("recaptcha-container");
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

    // Auto-fill OTP in dev mode with typing animation
    if (otpResult.dev_code) {
      autoFillOTP(otpResult.dev_code);
    } else if (otpResult.channel !== "firebase") {
      tryWebOTP();
    }
  };

  // ── Auto-fill OTP with natural typing animation ────────────────
  const autoFillOTP = useCallback((code: string) => {
    if (!/^\d{6}$/.test(code)) return;

    const digits = code.split("");
    setIsAutoFilling(true);

    digits.forEach((digit, index) => {
      autoFillTimerRef.current = setTimeout(() => {
        setOtp((prev) => {
          const newOtp = [...prev];
          newOtp[index] = digit;
          return newOtp;
        });
        otpInputsRef.current[index]?.focus();

        if (index === 5) {
          setIsAutoFilling(false);
        }
      }, 500 + index * 180);
    });
  }, []);

  // Cleanup auto-fill timer on unmount
  useEffect(() => {
    return () => {
      if (autoFillTimerRef.current) {
        clearTimeout(autoFillTimerRef.current);
      }
    };
  }, []);

  // ── WebOTP: Auto-read SMS verification code ───────────────────────
  const tryWebOTP = async () => {
    try {
      if ("OTPCredential" in window) {
        const abortController = new AbortController();
        const content = await navigator.credentials.get({
          // @ts-expect-error WebOTP API not in all TS defs yet
          otp: { transport: ["sms"] },
          signal: abortController.signal,
        });
        if (content && "code" in content) {
          const code = (content as { code: string }).code;
          if (code && /^\d{6}$/.test(code)) {
            autoFillOTP(code);
          }
        }
      }
    } catch {
      // WebOTP not supported or user didn't grant permission
    }
  };

  // ── OTP input handling ────────────────────────────────────────────
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

  // ── OTP verification ──────────────────────────────────────────────
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

          // Exchange Firebase token for our session
          const response = await verifyOTPViaFirebase(fbResult.idToken);
          setIsSubmitting(false);

          if (response.error || !response.user) {
            setError(response.error || "حصلت مشكلة. جرب تاني");
            setOtp(["", "", "", "", "", ""]);
            otpInputsRef.current[0]?.focus();
            return;
          }

          handleSuccess(response.user);
          return;
        } catch {
          setIsSubmitting(false);
          setError("حصلت مشكلة في التحقق. جرب تاني");
          setOtp(["", "", "", "", "", ""]);
          otpInputsRef.current[0]?.focus();
          return;
        }
      }

      // Standard HMAC verification
      const response = await verifyOTP(phone, code, otpToken);

      setIsSubmitting(false);

      if (response.error || !response.user) {
        setError(response.error || "حصلت مشكلة. جرب تاني");
        setOtp(["", "", "", "", "", ""]);
        otpInputsRef.current[0]?.focus();
        return;
      }

      handleSuccess(response.user);
    },
    [otp, phone, otpToken, otpChannel, accountType],
  );

  // ── Cleanup Firebase reCAPTCHA on unmount ────────────────────────
  useEffect(() => {
    return () => {
      import("@/lib/firebase/phone-auth").then(({ cleanupRecaptcha }) => {
        cleanupRecaptcha();
      }).catch(() => {});
    };
  }, []);

  // ── Resend OTP ────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError(null);
    setIsSubmitting(true);

    const resendResult = await sendOTP(phone);

    if (resendResult.error) {
      setIsSubmitting(false);
      setError(resendResult.error);
      return;
    }

    // Firebase channel: re-send via Firebase
    if (resendResult.channel === "firebase" && isFirebaseConfigured()) {
      try {
        const { setupRecaptcha, sendFirebaseOTP } = await import(
          "@/lib/firebase/phone-auth"
        );
        setupRecaptcha("recaptcha-container");
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

  // ── Format phone for display ──────────────────────────────────────
  const formatPhone = (p: string) => {
    if (p.length >= 7) return `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7)}`;
    if (p.length >= 3) return `${p.slice(0, 3)}-${p.slice(3)}`;
    return p;
  };

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button
          onClick={() => (step === "otp" ? setStep("phone") : router.back())}
          className="p-2 text-gray-text hover:text-dark hover:bg-gray-light rounded-xl transition-colors"
          aria-label="رجوع"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-dark flex-1">
          {step === "otp" ? "كود التأكيد" : "تسجيل الدخول"}
        </h1>
        <Link
          href="/"
          className="p-2 text-brand-green hover:text-brand-green-dark hover:bg-green-50 rounded-full transition-colors"
          aria-label="الرئيسية"
        >
          <Home size={20} />
        </Link>
      </div>

      <div className="flex-1 px-5 pb-8">
        {/* ── Step 1: Phone + Account Type ──────────────────────────── */}
        {step === "phone" && (
          <form
            className="space-y-5 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (phone.length >= 10) handlePhoneSubmit();
            }}
            autoComplete="on"
          >
            {/* Branding */}
            <div className="text-center pt-4 pb-3">
              <div className="w-20 h-20 bg-brand-green rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-3xl font-bold text-white">م</span>
              </div>
              <h2 className="text-xl font-bold text-dark mb-1">أهلاً بيك في مكسب</h2>
              <p className="text-sm text-gray-text">
                سجّل برقم موبايلك في ثواني
              </p>
            </div>

            {/* Phone number input */}
            <div className="w-full">
              <label htmlFor="login-phone" className="block text-sm font-semibold text-dark mb-1.5">
                <Phone size={14} className="inline ml-1 text-brand-green" />
                رقم الموبايل
              </label>
              <div className="relative">
                <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm text-gray-text font-semibold pointer-events-none select-none" dir="ltr">
                  +20
                </span>
                <input
                  ref={phoneInputRef}
                  id="login-phone"
                  name="phone"
                  type="tel"
                  dir="ltr"
                  inputMode="tel"
                  maxLength={14}
                  value={phone}
                  onChange={handlePhoneChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && phone.length >= 10) handlePhoneSubmit();
                  }}
                  placeholder="1XXXXXXXXX"
                  className={`w-full ps-14 pe-4 py-3.5 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark text-lg tracking-wider placeholder:text-gray-text placeholder:tracking-normal ${error ? "border-error bg-error/5" : ""}`}
                  autoComplete="tel-national"
                />
              </div>
              {!error && (
                <p className="mt-1.5 text-[11px] text-gray-text">
                  رقمك هيتملى تلقائي من الموبايل
                </p>
              )}
            </div>

            {/* Account type selection */}
            <div className="w-full">
              <label className="block text-sm font-semibold text-dark mb-2">
                أنا...
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType("individual")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    accountType === "individual"
                      ? "border-brand-green bg-brand-green-light"
                      : "border-gray-light bg-white hover:border-gray-300"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    accountType === "individual" ? "bg-brand-green text-white" : "bg-gray-light text-gray-text"
                  }`}>
                    <UserIcon size={22} />
                  </div>
                  <span className="text-sm font-bold text-dark">فرد</span>
                  <span className="text-[11px] text-gray-text leading-tight text-center">بيع وشراء شخصي</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType("merchant")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    accountType === "merchant"
                      ? "border-brand-green bg-brand-green-light"
                      : "border-gray-light bg-white hover:border-gray-300"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    accountType === "merchant" ? "bg-brand-green text-white" : "bg-gray-light text-gray-text"
                  }`}>
                    <Store size={22} />
                  </div>
                  <span className="text-sm font-bold text-dark">تاجر</span>
                  <span className="text-[11px] text-gray-text leading-tight text-center">عندي محل / معرض / مكتب</span>
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
              disabled={phone.length < 10}
            >
              <Smartphone size={18} className="ml-2" />
              إرسال كود التأكيد
            </Button>

            {/* Terms notice */}
            <p className="text-[11px] text-gray-text text-center leading-relaxed">
              بتسجيلك، أنت موافق على{" "}
              <span className="text-brand-green font-semibold">شروط الاستخدام</span>
              {" "}و{" "}
              <span className="text-brand-green font-semibold">سياسة الخصوصية</span>
            </p>

          </form>
        )}

        {/* ── Step 2: OTP Verification ──────────────────────────────── */}
        {step === "otp" && (
          <div className="space-y-6 pt-4">
            {/* Info */}
            <div className="text-center">
              <div className="w-16 h-16 bg-brand-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone size={28} className="text-brand-green" />
              </div>
              <h2 className="text-lg font-bold text-dark mb-2">أدخل كود التأكيد</h2>
              <p className="text-sm text-gray-text">
                {otpChannel === "whatsapp" ? "بعتنالك كود على واتساب" : otpChannel === "firebase" ? "بعتنالك كود SMS على" : otpChannel === "dev" ? "كود التأكيد" : "بعتنالك كود على"}{" "}
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
                {isAutoFilling ? (
                  <p className="text-xs text-gray-text">جاري إدخال الكود تلقائياً...</p>
                ) : (
                  <>
                    <p className="text-xs text-gray-text mb-1">كود التأكيد (وضع التطوير)</p>
                    <p className="text-2xl font-bold text-dark tracking-[0.3em]" dir="ltr">{devCode}</p>
                  </>
                )}
              </div>
            )}

            {/* OTP 6-digit inputs */}
            <div className="flex gap-2.5 justify-center py-2" dir="ltr">
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
                  readOnly={isAutoFilling}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  onPaste={i === 0 ? handleOtpPaste : undefined}
                  className={`w-12 h-14 text-center text-2xl font-bold bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all ${error ? "border-error bg-error/5" : ""} ${digit ? "text-dark border-brand-green/30 scale-105" : "text-gray-text"}`}
                  style={digit && isAutoFilling ? { transform: "scale(1.08)", transition: "transform 0.2s ease-out" } : undefined}
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
                  <span className="font-bold text-dark">{resendTimer}</span> ثانية
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

            {/* Edit phone */}
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
      </div>

      {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
      <div id="recaptcha-container" />
    </main>
  );
}
