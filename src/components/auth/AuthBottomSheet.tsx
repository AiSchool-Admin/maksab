"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Phone, Mail, ArrowLeft, RefreshCw, Shield, Lock, Eye, EyeOff } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import {
  sendOTP,
  sendEmailOTP,
  verifyOTP,
  verifyEmailOTP,
  adminLogin,
  devLogin,
  type UserProfile,
} from "@/lib/supabase/auth";
import { egyptianPhoneSchema, emailSchema, otpSchema } from "@/lib/utils/validators";

const IS_DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

interface AuthBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

type AuthMethod = "email" | "phone" | "admin";
type Step = "choose" | "input" | "otp";

export default function AuthBottomSheet({
  isOpen,
  onClose,
  onSuccess,
}: AuthBottomSheetProps) {
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email");
  const [step, setStep] = useState<Step>("choose");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep("choose");
      setAuthMethod("email");
      setPhone("");
      setEmail("");
      setPassword("");
      setShowPassword(false);
      setOtp(["", "", "", "", "", ""]);
      setError(null);
      setIsSubmitting(false);
      setResendTimer(0);
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

  // Focus input when moving to input step
  useEffect(() => {
    if (step === "input") {
      setTimeout(() => {
        if (authMethod === "phone") phoneInputRef.current?.focus();
        else emailInputRef.current?.focus();
      }, 400);
    }
  }, [step, authMethod]);

  // ── Choose method and go to input ─────────────────────────────────
  const selectMethod = (method: AuthMethod) => {
    setAuthMethod(method);
    setStep("input");
    setError(null);
  };

  // ── Phone submit ──────────────────────────────────────────────────
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
  };

  // ── Email submit ──────────────────────────────────────────────────
  const handleEmailSubmit = async () => {
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

  // ── Admin submit ──────────────────────────────────────────────────
  const handleAdminSubmit = async () => {
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
    const { user, error: loginError } = await adminLogin(email, password);
    setIsSubmitting(false);

    if (loginError || !user) {
      setError(loginError || "حصلت مشكلة. جرب تاني");
      return;
    }

    onSuccess(user);
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

      let response;
      if (authMethod === "phone") {
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

      onSuccess(response.user);
    },
    [otp, phone, email, authMethod, onSuccess],
  );

  // ── Resend OTP ────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError(null);
    setIsSubmitting(true);

    const { error: sendError } =
      authMethod === "phone" ? await sendOTP(phone) : await sendEmailOTP(email);

    setIsSubmitting(false);
    if (sendError) {
      setError(sendError);
      return;
    }

    setResendTimer(60);
    setOtp(["", "", "", "", "", ""]);
    otpInputsRef.current[0]?.focus();
  };

  // ── Dev bypass login ──────────────────────────────────────────────
  const handleDevLogin = async () => {
    setIsSubmitting(true);
    devLogin();
    const { user } = await verifyOTP("01000000000", "000000");
    setIsSubmitting(false);
    if (user) onSuccess(user);
  };

  // ── Get modal title ───────────────────────────────────────────────
  const getTitle = () => {
    if (step === "otp") return "كود التأكيد";
    if (step === "input" && authMethod === "admin") return "دخول الأدمن";
    if (step === "input" && authMethod === "phone") return "سجّل برقم موبايلك";
    if (step === "input" && authMethod === "email") return "سجّل بالإيميل";
    return "سجّل دخولك";
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()}>
      {/* ── Step 1: Choose Auth Method ────────────────────────────── */}
      {step === "choose" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-text">
            اختار طريقة تسجيل الدخول
          </p>

          {/* Email option (recommended - free) */}
          <button
            onClick={() => selectMethod("email")}
            className="w-full flex items-center gap-3 p-4 bg-gray-light rounded-xl hover:bg-brand-green/10 hover:border-brand-green border-2 border-transparent transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-brand-green/15 flex items-center justify-center flex-shrink-0">
              <Mail size={20} className="text-brand-green" />
            </div>
            <div className="text-start">
              <p className="font-semibold text-dark">الإيميل</p>
              <p className="text-xs text-gray-text">هيوصلك كود تأكيد على إيميلك</p>
            </div>
            <span className="ms-auto text-[10px] bg-brand-green text-white px-2 py-0.5 rounded-full">مجاني</span>
          </button>

          {/* Phone option */}
          <button
            onClick={() => selectMethod("phone")}
            className="w-full flex items-center gap-3 p-4 bg-gray-light rounded-xl hover:bg-brand-green/10 hover:border-brand-green border-2 border-transparent transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-brand-gold/15 flex items-center justify-center flex-shrink-0">
              <Phone size={20} className="text-brand-gold" />
            </div>
            <div className="text-start">
              <p className="font-semibold text-dark">رقم الموبايل</p>
              <p className="text-xs text-gray-text">هيوصلك كود SMS على رقمك</p>
            </div>
          </button>

          {/* Admin option */}
          <button
            onClick={() => selectMethod("admin")}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-light border-2 border-transparent transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <Shield size={16} className="text-gray-text" />
            </div>
            <div className="text-start">
              <p className="text-sm text-gray-text">دخول الأدمن (إيميل + كلمة سر)</p>
            </div>
          </button>

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

      {/* ── Step 2: Input (Phone) ─────────────────────────────────── */}
      {step === "input" && authMethod === "phone" && (
        <div className="space-y-5">
          {/* Back button */}
          <button
            onClick={() => { setStep("choose"); setError(null); }}
            className="flex items-center gap-1.5 text-sm text-gray-text hover:text-dark transition-colors btn-icon-sm"
          >
            <ArrowLeft size={16} />
            رجوع
          </button>

          <p className="text-sm text-gray-text">
            أدخل رقم موبايلك المصري وهنبعتلك كود تأكيد SMS
          </p>

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
                onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") handlePhoneSubmit(); }}
                placeholder="01XXXXXXXXX"
                className={`w-full px-4 py-3 pe-10 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark text-center text-lg tracking-widest placeholder:text-gray-text placeholder:tracking-normal ${error ? "border-error bg-error/5" : ""}`}
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

      {/* ── Step 2: Input (Email) ──────────────────────────────────── */}
      {step === "input" && authMethod === "email" && (
        <div className="space-y-5">
          <button
            onClick={() => { setStep("choose"); setError(null); }}
            className="flex items-center gap-1.5 text-sm text-gray-text hover:text-dark transition-colors btn-icon-sm"
          >
            <ArrowLeft size={16} />
            رجوع
          </button>

          <p className="text-sm text-gray-text">
            أدخل إيميلك وهنبعتلك كود تأكيد عليه
          </p>

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
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleEmailSubmit(); }}
                placeholder="example@email.com"
                className={`w-full px-4 py-3 pe-10 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark text-center text-lg placeholder:text-gray-text ${error ? "border-error bg-error/5" : ""}`}
                autoComplete="email"
              />
            </div>
            {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
          </div>

          <Button
            fullWidth
            size="lg"
            isLoading={isSubmitting}
            onClick={handleEmailSubmit}
            disabled={!email.includes("@")}
          >
            إرسال كود التأكيد
          </Button>
        </div>
      )}

      {/* ── Step 2: Input (Admin) ──────────────────────────────────── */}
      {step === "input" && authMethod === "admin" && (
        <div className="space-y-5">
          <button
            onClick={() => { setStep("choose"); setError(null); }}
            className="flex items-center gap-1.5 text-sm text-gray-text hover:text-dark transition-colors btn-icon-sm"
          >
            <ArrowLeft size={16} />
            رجوع
          </button>

          <p className="text-sm text-gray-text">
            سجّل دخول بإيميل وكلمة سر الأدمن
          </p>

          {/* Email */}
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
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") document.getElementById("admin-password")?.focus(); }}
                placeholder="admin@maksab.com"
                className={`w-full px-4 py-3 pe-10 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark text-center placeholder:text-gray-text ${error ? "border-error bg-error/5" : ""}`}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="w-full">
            <div className="relative">
              <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-text pointer-events-none">
                <Lock size={18} />
              </span>
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                dir="ltr"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdminSubmit(); }}
                placeholder="كلمة السر"
                className={`w-full px-10 py-3 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark text-center placeholder:text-gray-text ${error ? "border-error bg-error/5" : ""}`}
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
            {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
          </div>

          <Button
            fullWidth
            size="lg"
            isLoading={isSubmitting}
            onClick={handleAdminSubmit}
            disabled={!email.includes("@") || password.length < 6}
          >
            تسجيل الدخول
          </Button>
        </div>
      )}

      {/* ── Step 3: OTP ───────────────────────────────────────────── */}
      {step === "otp" && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setStep("input"); setError(null); setOtp(["", "", "", "", "", ""]); }}
              className="p-1 text-gray-text hover:text-dark transition-colors btn-icon-sm"
              aria-label="رجوع"
            >
              <ArrowLeft size={18} />
            </button>
            <p className="text-sm text-gray-text">
              {authMethod === "phone" ? (
                <>
                  أدخل الكود اللي وصلك على{" "}
                  <span className="font-semibold text-dark" dir="ltr">{phone}</span>
                </>
              ) : (
                <>
                  أدخل الكود اللي وصلك على{" "}
                  <span className="font-semibold text-dark" dir="ltr">{email}</span>
                </>
              )}
            </p>
          </div>

          {/* OTP 6-digit inputs */}
          <div className="flex gap-2 justify-center" dir="ltr">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { otpInputsRef.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                onPaste={i === 0 ? handleOtpPaste : undefined}
                className={`w-11 h-13 text-center text-xl font-bold bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all ${error ? "border-error bg-error/5" : ""} ${digit ? "text-dark" : "text-gray-text"}`}
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
