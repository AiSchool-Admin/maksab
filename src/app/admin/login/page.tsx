"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Shield, Phone, Mail, ArrowLeft } from "lucide-react";

const ADMIN_SESSION_KEY = "maksab_admin_session";

type LoginMode = "select" | "email" | "phone" | "otp";

export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("select");

  // Email mode
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Phone mode
  const [phone, setPhone] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [devCode, setDevCode] = useState("");
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const autoFillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoFillTimerRef.current) clearTimeout(autoFillTimerRef.current);
    };
  }, []);

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

  const verifyAdminAndLogin = async (userId: string, displayName: string, identifier: string) => {
    const checkRes = await fetch("/api/admin/stats?type=overview", {
      headers: { "x-admin-id": userId },
    });

    if (!checkRes.ok) {
      setError("هذا الحساب ليس لديه صلاحيات الأدمن");
      setIsLoading(false);
      return;
    }

    localStorage.setItem(
      ADMIN_SESSION_KEY,
      JSON.stringify({ id: userId, email: identifier, name: displayName || identifier }),
    );

    router.push("/admin");
  };

  // ── Email + Password Login ────────────────
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("ادخل الإيميل وكلمة السر");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { adminLogin } = await import("@/lib/supabase/auth");
      const result = await adminLogin(email, password);

      if (result.error || !result.user) {
        setError(result.error || "حصلت مشكلة في تسجيل الدخول");
        setIsLoading(false);
        return;
      }

      await verifyAdminAndLogin(result.user.id, result.user.display_name || "", email);
    } catch {
      setError("حصلت مشكلة في الاتصال. جرب تاني");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Phone OTP: Send code ────────────────
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length !== 11 || !cleanPhone.match(/^01[0125]/)) {
      setError("ادخل رقم موبايل مصري صحيح (11 رقم)");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { sendOTP } = await import("@/lib/supabase/auth");
      const result = await sendOTP(cleanPhone);

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      setOtpToken(result.token || "");
      setOtp(["", "", "", "", "", ""]);
      setMode("otp");

      // Auto-fill in dev mode
      if (result.dev_code) {
        setDevCode(result.dev_code);
        setTimeout(() => autoFillOTP(result.dev_code!), 300);
      }
    } catch {
      setError("حصلت مشكلة في إرسال الكود");
    } finally {
      setIsLoading(false);
    }
  };

  // ── OTP input handling ──────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError("");

    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
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
      autoFillOTP(pasted);
    }
  };

  // ── Phone OTP: Verify code ────────────────
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join("");
    if (otpCode.length < 6) {
      setError("ادخل كود التحقق كامل");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { verifyOTP } = await import("@/lib/supabase/auth");
      const result = await verifyOTP(phone, otpCode, otpToken);

      if (result.error || !result.user) {
        setError(result.error || "الكود غلط أو انتهت صلاحيته");
        setIsLoading(false);
        return;
      }

      await verifyAdminAndLogin(result.user.id, result.user.display_name || "", phone);
    } catch {
      setError("حصلت مشكلة في التحقق");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#145C2E] to-[#1B7A3D] flex items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
            <Shield size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white">لوحة تحكم مكسب</h1>
          <p className="text-sm text-white/60 mt-1">دخول الأدمن</p>
        </div>

        {/* ── Mode Selector ── */}
        {mode === "select" && (
          <div className="bg-white rounded-2xl p-6 shadow-2xl space-y-3">
            <p className="text-sm font-medium text-dark text-center mb-4">اختار طريقة الدخول</p>

            <button
              onClick={() => { setMode("phone"); setError(""); }}
              className="w-full flex items-center gap-3 p-4 bg-brand-green-light border-2 border-brand-green/20 rounded-xl hover:border-brand-green/40 transition-all"
            >
              <div className="w-10 h-10 bg-brand-green rounded-xl flex items-center justify-center flex-shrink-0">
                <Phone size={20} className="text-white" />
              </div>
              <div className="text-start">
                <h3 className="text-sm font-bold text-dark">رقم الموبايل + كود</h3>
                <p className="text-xs text-gray-text">ادخل برقم موبايلك المسجّل</p>
              </div>
            </button>

            <button
              onClick={() => { setMode("email"); setError(""); }}
              className="w-full flex items-center gap-3 p-4 bg-gray-50 border-2 border-transparent rounded-xl hover:border-gray-200 transition-all"
            >
              <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail size={20} className="text-gray-500" />
              </div>
              <div className="text-start">
                <h3 className="text-sm font-bold text-dark">إيميل + كلمة سر</h3>
                <p className="text-xs text-gray-text">للحسابات اللي ليها إيميل</p>
              </div>
            </button>
          </div>
        )}

        {/* ── Phone Login ── */}
        {mode === "phone" && (
          <form onSubmit={handleSendOTP} className="bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <button type="button" onClick={() => setMode("select")} className="flex items-center gap-1 text-xs text-gray-text hover:text-dark">
              <ArrowLeft size={14} />
              رجوع
            </button>

            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">رقم الموبايل</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                placeholder="01012345678"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green text-center tracking-widest"
                dir="ltr"
                inputMode="numeric"
                autoFocus
              />
            </div>

            {error && <p className="text-sm text-error bg-error/5 rounded-xl p-3 text-center">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-brand-green text-white rounded-xl font-bold text-sm hover:bg-brand-green-dark transition-colors disabled:opacity-50"
            >
              {isLoading ? "جاري الإرسال..." : "إرسال كود التحقق"}
            </button>
          </form>
        )}

        {/* ── OTP Verification ── */}
        {mode === "otp" && (
          <form onSubmit={handleVerifyOTP} className="bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <button type="button" onClick={() => { setMode("phone"); setOtp(["", "", "", "", "", ""]); }} className="flex items-center gap-1 text-xs text-gray-text hover:text-dark">
              <ArrowLeft size={14} />
              تغيير الرقم
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-text">تم إرسال كود التحقق إلى</p>
              <p className="text-sm font-bold text-dark mt-1" dir="ltr">{phone}</p>
            </div>

            {/* Dev mode status */}
            {devCode && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                {isAutoFilling ? (
                  <p className="text-xs text-amber-700">جاري إدخال الكود تلقائياً...</p>
                ) : (
                  <>
                    <p className="text-xs text-amber-700">كود التطوير:</p>
                    <p className="text-xl font-bold text-amber-800 tracking-[0.3em] mt-1">{devCode}</p>
                  </>
                )}
              </div>
            )}

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
                  readOnly={isAutoFilling}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  onPaste={i === 0 ? handleOtpPaste : undefined}
                  className={`w-11 h-13 text-center text-xl font-bold bg-gray-50 rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all ${error ? "border-red-300 bg-red-50" : ""} ${digit ? "text-dark border-brand-green/30" : "text-gray-400"}`}
                  style={digit && isAutoFilling ? { transform: "scale(1.08)", transition: "transform 0.2s ease-out" } : undefined}
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                />
              ))}
            </div>

            {error && <p className="text-sm text-error bg-error/5 rounded-xl p-3 text-center">{error}</p>}

            <button
              type="submit"
              disabled={isLoading || otp.join("").length < 6}
              className="w-full py-3 bg-brand-green text-white rounded-xl font-bold text-sm hover:bg-brand-green-dark transition-colors disabled:opacity-50"
            >
              {isLoading ? "جاري التحقق..." : "تأكيد الدخول"}
            </button>
          </form>
        )}

        {/* ── Email Login ── */}
        {mode === "email" && (
          <form onSubmit={handleEmailLogin} className="bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <button type="button" onClick={() => setMode("select")} className="flex items-center gap-1 text-xs text-gray-text hover:text-dark">
              <ArrowLeft size={14} />
              رجوع
            </button>

            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@maksab.app"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green"
                dir="ltr"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">كلمة السر</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green pe-11"
                  dir="ltr"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-error bg-error/5 rounded-xl p-3 text-center">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-brand-green text-white rounded-xl font-bold text-sm hover:bg-brand-green-dark transition-colors disabled:opacity-50"
            >
              {isLoading ? "جاري تسجيل الدخول..." : "دخول"}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-white/40 mt-6">
          مكسب — لوحة التحكم الإدارية
        </p>
      </div>
    </div>
  );
}
