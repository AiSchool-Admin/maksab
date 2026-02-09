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
  const [autoDetecting, setAutoDetecting] = useState(false);

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // If already logged in, redirect
  useEffect(() => {
    if (user) {
      router.replace(redirectTo);
    }
  }, [user, router, redirectTo]);

  // Try to auto-detect phone number from device on mount
  useEffect(() => {
    autoDetectCredentials();
  }, []);

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Focus phone input on mount
  useEffect(() => {
    if (step === "phone") {
      setTimeout(() => phoneInputRef.current?.focus(), 300);
    }
  }, [step]);

  // ── Auto-detect phone & name from device ──────────────────────────
  const autoDetectCredentials = async () => {
    // Try Contact Picker API (Android Chrome) for name
    try {
      if ("contacts" in navigator && "ContactsManager" in window) {
        setAutoDetecting(true);
        const contacts = await (navigator as unknown as { contacts: { select: (props: string[], opts: { multiple: boolean }) => Promise<Array<{ name?: string[]; tel?: string[] }>> } }).contacts.select(
          ["name", "tel"],
          { multiple: false }
        );
        if (contacts?.[0]) {
          if (contacts[0].name?.[0]) {
            setDisplayName(contacts[0].name[0]);
          }
          if (contacts[0].tel?.[0]) {
            const tel = contacts[0].tel[0].replace(/\D/g, "");
            // Handle Egyptian numbers with country code
            if (tel.startsWith("2") && tel.length === 12) {
              setPhone(tel.slice(1));
            } else if (tel.startsWith("002") && tel.length === 13) {
              setPhone(tel.slice(3));
            } else if (tel.startsWith("01") && tel.length === 11) {
              setPhone(tel);
            }
          }
        }
        setAutoDetecting(false);
      }
    } catch {
      // Contact Picker not supported or user cancelled — that's fine
      setAutoDetecting(false);
    }
  };

  const handleSuccess = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);
    router.replace(redirectTo);
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
    const { error: sendError } = await sendOTP(phone);
    setIsSubmitting(false);

    if (sendError) {
      setError(sendError);
      return;
    }

    setStep("otp");
    setResendTimer(60);
    setTimeout(() => otpInputsRef.current[0]?.focus(), 300);

    // Try WebOTP API to auto-read SMS code
    tryWebOTP();
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
      // WebOTP not supported or user didn't grant permission — that's fine
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

      const response = await verifyOTP(phone, code, displayName.trim() || undefined);

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
    [otp, phone, displayName],
  );

  // ── Resend OTP ────────────────────────────────────────────────────
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

    // Try WebOTP again
    tryWebOTP();
  };

  // ── Dev bypass ────────────────────────────────────────────────────
  const handleDevLogin = async () => {
    setIsSubmitting(true);
    devLogin();
    const { user: devUser } = await verifyOTP("01000000000", "000000");
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
          <div className="space-y-5 pt-2">
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
                  className={`w-full ps-14 pe-4 py-3.5 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark text-lg tracking-wider placeholder:text-gray-text placeholder:tracking-normal ${error ? "border-error bg-error/5" : ""}`}
                  autoComplete="tel"
                />
              </div>
              {!error && (
                <p className="mt-1.5 text-[11px] text-gray-text">
                  هيوصلك كود تأكيد على رقمك
                </p>
              )}
            </div>

            {/* Display name input (optional) */}
            <div className="w-full">
              <label className="block text-sm font-semibold text-dark mb-1.5">
                <User size={14} className="inline ml-1 text-brand-green" />
                اسمك
                <span className="text-xs text-gray-text font-normal mr-1">(اختياري)</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                dir="rtl"
                maxLength={50}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && phone.length === 11) handlePhoneSubmit();
                }}
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

            {/* Auto-detect button for supported devices */}
            {!autoDetecting && (
              <button
                onClick={autoDetectCredentials}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-brand-green hover:text-brand-green-dark transition-colors"
              >
                <Phone size={15} />
                اقرأ بياناتي من الموبايل تلقائياً
              </button>
            )}
            {autoDetecting && (
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-text">
                <div className="w-4 h-4 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
                جاري قراءة البيانات...
              </div>
            )}

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

            {/* Terms notice */}
            <p className="text-[11px] text-gray-text text-center leading-relaxed">
              بتسجيلك، أنت موافق على{" "}
              <span className="text-brand-green font-semibold">شروط الاستخدام</span>
              {" "}و{" "}
              <span className="text-brand-green font-semibold">سياسة الخصوصية</span>
            </p>
          </div>
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
                بعتنالك كود على{" "}
                <span className="font-bold text-dark" dir="ltr">
                  {formatPhone(phone)}
                </span>
              </p>
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
