"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Shield } from "lucide-react";

const ADMIN_SESSION_KEY = "maksab_admin_session";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("ادخل الإيميل وكلمة السر");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Use the existing adminLogin function
      const { adminLogin } = await import("@/lib/supabase/auth");
      const result = await adminLogin(email, password);

      if (result.error || !result.user) {
        setError(result.error || "حصلت مشكلة في تسجيل الدخول");
        setIsLoading(false);
        return;
      }

      // Verify admin role via API
      const checkRes = await fetch(`/api/admin/stats?type=overview`, {
        headers: { "x-admin-id": result.user.id },
      });

      if (!checkRes.ok) {
        setError("هذا الحساب ليس لديه صلاحيات الأدمن");
        setIsLoading(false);
        return;
      }

      // Save admin session
      localStorage.setItem(
        ADMIN_SESSION_KEY,
        JSON.stringify({ id: result.user.id, email, name: result.user.display_name || email }),
      );

      router.push("/admin");
    } catch {
      setError("حصلت مشكلة في الاتصال. جرب تاني");
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
          <h1 className="text-2xl font-bold text-white">لوحة تحكم مكسب</h1>
          <p className="text-sm text-white/60 mt-1">دخول الأدمن</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-white rounded-2xl p-6 shadow-2xl space-y-4">
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

          {error && (
            <p className="text-sm text-error bg-error/5 rounded-xl p-3 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-brand-green text-white rounded-xl font-bold text-sm hover:bg-brand-green-dark transition-colors disabled:opacity-50"
          >
            {isLoading ? "جاري تسجيل الدخول..." : "دخول"}
          </button>
        </form>

        <p className="text-center text-xs text-white/40 mt-6">
          مكسب — لوحة التحكم الإدارية
        </p>
      </div>
    </div>
  );
}
