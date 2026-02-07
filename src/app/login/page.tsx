"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  RefreshCw,
  Phone,
  Shield,
  MessageCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  sendOTP,
  sendWhatsAppOTP,
  sendEmailOTP,
  verifyOTP,
  verifyEmailOTP,
  adminLogin,
  devLogin,
  type UserProfile,
} from "@/lib/supabase/auth";
import { egyptianPhoneSchema, emailSchema, otpSchema } from "@/lib/utils/validators";

const IS_DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";
const PHONE_AUTH_ENABLED = process.env.NEXT_PUBLIC_PHONE_AUTH_ENABLED === "true";

type AuthMethod = "password" | "email" | "whatsapp" | "phone";
type Step = "choose" | "input" | "otp";

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

  const [authMethod, setAuthMethod] = useState<AuthMethod>("password");
  const [step, setStep] = useState<Step>("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const emailInputRef = useRef<HTMLInputElement>(null);
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

  // Focus input when step changes
  useEffect(() => {
    if (step === "input") {
      setTimeout(() => {
        if (authMethod === "phone" || authMethod === "whatsapp") {
          phoneInputRef.current?.focus();
        } else {
          emailInputRef.current?.focus();
        }
      }, 300);
    }
  }, [step, authMethod]);

  const selectMethod = (method: AuthMethod) => {
    setAuthMethod(method);
    setStep("input");
    setError(null);
  };

  const handleSuccess = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);
    router.replace(redirectTo);
  };

  // ── Email + Password login ──────────────────────────────────────────
  const handlePasswordSubmit = async () => {
    setError(null);
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setError(emailResult.error.issues[0].message);
      return;
    }
    if (password.length < 6) {
      setError("كلمة السر لازم تكون 6 حروف على الأقل");
      return;
    }

    setIsSubmitting(true);
    const { user: loggedInUser, error: loginError } = await adminLogin(email, password);
    setIsSubmitting(false);

    if (loginError || !loggedInUser) {
      setError(loginError || "حصلت مشكلة. جرب تاني");
      return;
    }

    handleSuccess(loggedInUser);
  };

  // ── Email OTP send ──────────────────────────────────────────────────
  const handleEmailOtpSubmit = async () => {
    setError(null);
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setIsSubmitting(true);
    const { error: sendError } = await sendEmailOTP(email);
    setIsSubmitting(false);

    if (sendError) {
      setError(sendError);
      return;
    }

    setStep("otp");
    setResendTimer(60);
    setTimeout(() => otpInputsRef.current[0]?.focus(), 300);
  };

  // ── Phone send (SMS/WhatsApp) ───────────────────────────────────────
  const handlePhoneSubmit = async () => {
    setError(null);
    const result = egyptianPhoneSchema.safeParse(phone);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setIsSubmitting(true);
    const sendFn = authMethod === "whatsapp" ? sendWhatsAppOTP : sendOTP;
    const { error: sendError } = await sendFn(phone);
    setIsSubmitting(false);

    if (sendError) {
      setError(sendError);
      return;
    }

    setStep("otp");
    setResendTimer(60);
    setTimeout(() => otpInputsRef.current[0]?.focus(), 300);
  };

  // ── OTP input handling ──────────────────────────────────────────────
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

      let response;
      if (authMethod === "phone" || authMethod === "whatsapp") {
        response = await verifyOTP(phone, code);
      } else {
        response = await verifyEmailOTP(email, code);
      }

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
    [otp, phone, email, authMethod],
  );

  // ── Resend OTP ──────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError(null);
    setIsSubmitting(true);

    const { error: sendError } =
      authMethod === "whatsapp"
        ? await sendWhatsAppOTP(phone)
        : authMethod === "phone"
          ? await sendOTP(phone)
          : await sendEmailOTP(email);

    setIsSubmitting(false);
    if (sendError) {
      setError(sendError);
      return;
    }

    setResendTimer(60);
    setOtp(["", "", "", "", "", ""]);
    otpInputsRef.current[0]?.focus();
  };

  // ── Dev bypass ──────────────────────────────────────────────────────
  const handleDevLogin = async () => {
    setIsSubmitting(true);
    devLogin();
    const { user: devUser } = await verifyOTP("01000000000", "000000");
    setIsSubmitting(false);
    if (devUser) handleSuccess(devUser);
  };

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-text hover:text-dark hover:bg-gray-light rounded-xl transition-colors"
          aria-label="رجوع"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-dark">تسجيل الدخول</h1>
      </div>

      <div className="flex-1 px-5 pb-8">
        {/* ── Step 1: Choose Method ──────────────────────────────────── */}
        {step === "choose" && (
          <div className="space-y-6 pt-4">
            {/* Logo / branding */}
            <div className="text-center pt-4 pb-2">
              <div className="w-20 h-20 bg-brand-green rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-3xl font-bold text-white">م</span>
              </div>
              <h2 className="text-xl font-bold text-dark mb-1">أهلاً بيك في مكسب</h2>
              <p className="text-sm text-gray-text">
                سجّل دخولك عشان تبيع وتشتري وتبدّل
              </p>
            </div>

            {/* Email + Password (primary for test accounts) */}
            <button
              onClick={() => selectMethod("password")}
              className="w-full flex items-center gap-3 p-4 bg-brand-green-light rounded-xl hover:bg-brand-green/15 border-2 border-brand-green transition-all"
            >
              <div className="w-11 h-11 rounded-full bg-brand-green/15 flex items-center justify-center flex-shrink-0">
                <Lock size={20} className="text-brand-green" />
              </div>
              <div className="text-start flex-1">
                <p className="font-semibold text-dark">إيميل وكلمة سر</p>
                <p className="text-xs text-gray-text">سجّل دخول بإيميلك وكلمة السر</p>
              </div>
              <span className="text-[10px] bg-brand-green text-white px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                مُوصى به
              </span>
            </button>

            {/* Email OTP */}
            <button
              onClick={() => selectMethod("email")}
              className="w-full flex items-center gap-3 p-4 bg-gray-light rounded-xl hover:bg-brand-green/10 border-2 border-transparent transition-all"
            >
              <div className="w-11 h-11 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                <Mail size={20} className="text-brand-green" />
              </div>
              <div className="text-start">
                <p className="font-semibold text-dark">كود على الإيميل</p>
                <p className="text-xs text-gray-text">هيوصلك كود تأكيد على إيميلك</p>
              </div>
            </button>

            {/* WhatsApp (if enabled) */}
            {PHONE_AUTH_ENABLED && (
              <button
                onClick={() => selectMethod("whatsapp")}
                className="w-full flex items-center gap-3 p-4 bg-gray-light rounded-xl hover:bg-green-50 border-2 border-transparent transition-all"
              >
                <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <MessageCircle size={20} className="text-green-600" />
                </div>
                <div className="text-start">
                  <p className="font-semibold text-dark">واتساب</p>
                  <p className="text-xs text-gray-text">هيوصلك كود تأكيد على واتساب</p>
                </div>
              </button>
            )}

            {/* Phone SMS (if enabled) */}
            {PHONE_AUTH_ENABLED && (
              <button
                onClick={() => selectMethod("phone")}
                className="w-full flex items-center gap-3 p-4 bg-gray-light rounded-xl hover:bg-brand-green/10 border-2 border-transparent transition-all"
              >
                <div className="w-11 h-11 rounded-full bg-brand-gold/15 flex items-center justify-center flex-shrink-0">
                  <Phone size={20} className="text-brand-gold" />
                </div>
                <div className="text-start">
                  <p className="font-semibold text-dark">رسالة SMS</p>
                  <p className="text-xs text-gray-text">هيوصلك كود SMS على رقمك</p>
                </div>
              </button>
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
          </div>
        )}

        {/* ── Step 2: Email + Password ──────────────────────────────── */}
        {step === "input" && authMethod === "password" && (
          <div className="space-y-5 pt-4">
            <button
              onClick={() => {
                setStep("choose");
                setError(null);
              }}
              className="flex items-center gap-1.5 text-sm text-gray-text hover:text-dark transition-colors"
            >
              <ArrowLeft size={16} />
              رجوع
            </button>

            <div className="text-center pb-2">
              <h2 className="text-lg font-bold text-dark mb-1">تسجيل الدخول</h2>
              <p className="text-sm text-gray-text">أدخل إيميلك وكلمة السر</p>
            </div>

            {/* Email input */}
            <div className="w-full">
              <label className="block text-sm font-semibold text-dark mb-1.5">
                الإيميل
              </label>
              <div className="relative">
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-text pointer-events-none">
                  <Mail size={18} />
                </span>
                <input
                  ref={emailInputRef}
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") document.getElementById("login-password")?.focus();
                  }}
                  placeholder="example@email.com"
                  className={`w-full px-4 py-3.5 pe-10 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark placeholder:text-gray-text ${error ? "border-error bg-error/5" : ""}`}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password input */}
            <div className="w-full">
              <label className="block text-sm font-semibold text-dark mb-1.5">
                كلمة السر
              </label>
              <div className="relative">
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-text pointer-events-none">
                  <Lock size={18} />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  dir="ltr"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handlePasswordSubmit();
                  }}
                  placeholder="كلمة السر"
                  className={`w-full px-10 py-3.5 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark placeholder:text-gray-text ${error ? "border-error bg-error/5" : ""}`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-text hover:text-dark transition-colors"
                  aria-label={showPassword ? "إخفاء كلمة السر" : "إظهار كلمة السر"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-error text-center">{error}</p>}

            <Button
              fullWidth
              size="lg"
              isLoading={isSubmitting}
              onClick={handlePasswordSubmit}
              disabled={!email.includes("@") || password.length < 6}
            >
              تسجيل الدخول
            </Button>
          </div>
        )}

        {/* ── Step 2: Email OTP ─────────────────────────────────────── */}
        {step === "input" && authMethod === "email" && (
          <div className="space-y-5 pt-4">
            <button
              onClick={() => {
                setStep("choose");
                setError(null);
              }}
              className="flex items-center gap-1.5 text-sm text-gray-text hover:text-dark transition-colors"
            >
              <ArrowLeft size={16} />
              رجوع
            </button>

            <div className="text-center pb-2">
              <h2 className="text-lg font-bold text-dark mb-1">سجّل بالإيميل</h2>
              <p className="text-sm text-gray-text">أدخل إيميلك وهنبعتلك كود تأكيد عليه</p>
            </div>

            <div className="w-full">
              <div className="relative">
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-text pointer-events-none">
                  <Mail size={18} />
                </span>
                <input
                  ref={emailInputRef}
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleEmailOtpSubmit();
                  }}
                  placeholder="example@email.com"
                  className={`w-full px-4 py-3.5 pe-10 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark text-center text-lg placeholder:text-gray-text ${error ? "border-error bg-error/5" : ""}`}
                  autoComplete="email"
                />
              </div>
              {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
            </div>

            <Button
              fullWidth
              size="lg"
              isLoading={isSubmitting}
              onClick={handleEmailOtpSubmit}
              disabled={!email.includes("@")}
            >
              إرسال كود التأكيد
            </Button>
          </div>
        )}

        {/* ── Step 2: Phone / WhatsApp ──────────────────────────────── */}
        {step === "input" && (authMethod === "phone" || authMethod === "whatsapp") && (
          <div className="space-y-5 pt-4">
            <button
              onClick={() => {
                setStep("choose");
                setError(null);
              }}
              className="flex items-center gap-1.5 text-sm text-gray-text hover:text-dark transition-colors"
            >
              <ArrowLeft size={16} />
              رجوع
            </button>

            <div className="text-center pb-2">
              <h2 className="text-lg font-bold text-dark mb-1">
                {authMethod === "whatsapp" ? "سجّل عبر واتساب" : "سجّل برقم موبايلك"}
              </h2>
              <p className="text-sm text-gray-text">
                {authMethod === "whatsapp"
                  ? "أدخل رقم موبايلك المصري وهنبعتلك كود تأكيد على واتساب"
                  : "أدخل رقم موبايلك المصري وهنبعتلك كود تأكيد SMS"}
              </p>
            </div>

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
                  className={`w-full px-4 py-3.5 pe-10 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark text-center text-lg tracking-widest placeholder:text-gray-text placeholder:tracking-normal ${error ? "border-error bg-error/5" : ""}`}
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
          </div>
        )}

        {/* ── Step 3: OTP Verification ──────────────────────────────── */}
        {step === "otp" && (
          <div className="space-y-5 pt-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setStep("input");
                  setError(null);
                  setOtp(["", "", "", "", "", ""]);
                }}
                className="p-1 text-gray-text hover:text-dark transition-colors"
                aria-label="رجوع"
              >
                <ArrowLeft size={18} />
              </button>
              <p className="text-sm text-gray-text">
                {authMethod === "whatsapp" ? (
                  <>
                    أدخل الكود اللي وصلك على واتساب{" "}
                    <span className="font-semibold text-dark" dir="ltr">
                      {phone}
                    </span>
                  </>
                ) : authMethod === "phone" ? (
                  <>
                    أدخل الكود اللي وصلك على{" "}
                    <span className="font-semibold text-dark" dir="ltr">
                      {phone}
                    </span>
                  </>
                ) : (
                  <>
                    أدخل الكود اللي وصلك على{" "}
                    <span className="font-semibold text-dark" dir="ltr">
                      {email}
                    </span>
                  </>
                )}
              </p>
            </div>

            {/* OTP 6-digit inputs */}
            <div className="flex gap-2 justify-center py-4" dir="ltr">
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
                  className={`w-12 h-14 text-center text-xl font-bold bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all ${error ? "border-error bg-error/5" : ""} ${digit ? "text-dark" : "text-gray-text"}`}
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                />
              ))}
            </div>

            {error && <p className="text-xs text-error text-center">{error}</p>}

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
                  <span className="font-semibold text-dark">{resendTimer}</span> ثانية
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
      </div>
    </main>
  );
}
