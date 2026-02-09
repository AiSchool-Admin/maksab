"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw, Phone, User, Shield, Smartphone } from "lucide-react";
import Button from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  sendOTP,
  verifyOTP,
  devLogin,
  type UserProfile,
} from "@/lib/supabase/auth";
import { egyptianPhoneSchema, otpSchema } from "@/lib/utils/validators";

const IS_DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

type Step = "phone" | "otp";

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

/** Normalize any phone format to 11-digit Egyptian number */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // +20XXXXXXXXXX or 20XXXXXXXXXX
  if (digits.startsWith("20") && digits.length === 12) return digits.slice(1);
  // 0020XXXXXXXXXX
  if (digits.startsWith("0020") && digits.length === 14) return digits.slice(3);
  // Already 01XXXXXXXXX
  if (digits.startsWith("01") && digits.length === 11) return digits;
  return digits;
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser } = useAuth();
  const redirectTo = searchParams.get("redirect") || "/";

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [otpChannel, setOtpChannel] = useState<string | null>(null);
  const [otpToken, setOtpToken] = useState<string>("");

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

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
    router.replace(redirectTo);
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

    setIsSubmitting(true);
    const otpResult = await sendOTP(phone);
    setIsSubmitting(false);

    if (otpResult.error) {
      setError(otpResult.error);
      return;
    }

    // Store token, channel info, and dev code
    const receivedToken = otpResult.token || "";
    const receivedCode = otpResult.dev_code || null;
    setOtpToken(receivedToken);
    setOtpChannel(otpResult.channel || null);
    setDevCode(receivedCode);

    // Auto-fill OTP if code is available (dev/manual channel)
    if (receivedCode && /^\d{6}$/.test(receivedCode)) {
      setOtp(receivedCode.split(""));
    }

    setStep("otp");
    setResendTimer(60);

    // If code was auto-filled, user just taps confirm
    // Otherwise focus first OTP input for manual entry
    if (!receivedCode) {
      setTimeout(() => otpInputsRef.current[0]?.focus(), 300);
      // Try WebOTP API to auto-read SMS code
      tryWebOTP();
    }
  };

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
            const digits = code.split("");
            setOtp(digits);
            handleOtpSubmit(code);
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

      const response = await verifyOTP(phone, code, otpToken, displayName.trim() || undefined);

      setIsSubmitting(false);

      if (response.error || !response.user) {
        setError(response.error || "حصلت مشكلة. جرب تاني");
        setOtp(["", "", "", "", "", ""]);
        otpInputsRef.current[0]?.focus();
        return;
      }

      if (IS_DEV_MODE) {
        devLogin();
      }

      handleSuccess(response.user);
    },
    [otp, phone, displayName, otpToken],
  );

  // ── Resend OTP ────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError(null);
    setIsSubmitting(true);

    const resendResult = await sendOTP(phone);

    setIsSubmitting(false);
    if (resendResult.error) {
      setError(resendResult.error);
      return;
    }

    const newToken = resendResult.token || "";
    const newCode = resendResult.dev_code || null;
    setOtpToken(newToken);
    setDevCode(newCode);
    setResendTimer(60);

    // Auto-fill OTP if code is available
    if (newCode && /^\d{6}$/.test(newCode)) {
      setOtp(newCode.split(""));
    } else {
      setOtp(["", "", "", "", "", ""]);
      otpInputsRef.current[0]?.focus();
      tryWebOTP();
    }
  };

  // ── Dev bypass ────────────────────────────────────────────────────
  const handleDevLogin = async () => {
    setIsSubmitting(true);
    devLogin();
    const { user: devUser } = await verifyOTP("01000000000", "000000", "");
    setIsSubmitting(false);
    if (devUser) handleSuccess(devUser);
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
        <h1 className="text-lg font-bold text-dark">
          {step === "otp" ? "كود التأكيد" : "تسجيل الدخول"}
        </h1>
      </div>

      <div className="flex-1 px-5 pb-8">
        {/* ── Step 1: Phone + Name ──────────────────────────────────── */}
        {step === "phone" && (
          <form
            className="space-y-5 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (phone.length >= 11) handlePhoneSubmit();
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

            {/* Phone number input — autocomplete triggers browser autofill from SIM/Google account */}
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
                    if (e.key === "Enter" && phone.length === 11) handlePhoneSubmit();
                  }}
                  placeholder="01XXXXXXXXX"
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

            {/* Display name input (optional) */}
            <div className="w-full">
              <label htmlFor="login-name" className="block text-sm font-semibold text-dark mb-1.5">
                <User size={14} className="inline ml-1 text-brand-green" />
                اسمك
                <span className="text-xs text-gray-text font-normal mr-1">(اختياري)</span>
              </label>
              <input
                id="login-name"
                name="name"
                type="text"
                dir="rtl"
                maxLength={50}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="اسمك اللي هيظهر للناس"
                className="w-full px-4 py-3.5 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark placeholder:text-gray-text"
                autoComplete="name"
              />
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

            {/* Dev bypass */}
            {IS_DEV_MODE && (
              <button
                type="button"
                onClick={handleDevLogin}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-gray-text hover:text-brand-green transition-colors"
              >
                <Shield size={16} />
                دخول المطوّر (بدون OTP)
              </button>
            )}

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
                {otpChannel === "whatsapp" ? "بعتنالك كود على واتساب" : "بعتنالك كود على"}{" "}
                <span className="font-bold text-dark" dir="ltr">
                  {formatPhone(phone)}
                </span>
              </p>
              {devCode && (
                <div className="mt-2 bg-brand-gold/10 border border-brand-gold/30 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-text">كود التأكيد:</p>
                  <p className="text-2xl font-bold text-brand-gold tracking-widest" dir="ltr">{devCode}</p>
                </div>
              )}
            </div>

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
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  onPaste={i === 0 ? handleOtpPaste : undefined}
                  className={`w-12 h-14 text-center text-2xl font-bold bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all ${error ? "border-error bg-error/5" : ""} ${digit ? "text-dark border-brand-green/30" : "text-gray-text"}`}
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
    </main>
  );
}
