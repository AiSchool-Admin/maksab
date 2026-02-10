"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Play, LogOut, Home, CheckCircle2, ShoppingBag, Search, MessageSquare, Gavel, Sparkles } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import { isDemoMode, activateDemoMode, deactivateDemoMode, DEMO_USER } from "@/lib/demo/demo-mode";

export default function DemoPage() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsActive(isDemoMode());
  }, []);

  const handleActivate = () => {
    setIsLoading(true);
    activateDemoMode();
    setUser(DEMO_USER);
    setIsActive(true);
    setIsLoading(false);

    // Short delay then redirect to home
    setTimeout(() => router.push("/"), 500);
  };

  const handleDeactivate = () => {
    deactivateDemoMode();
    setUser(null);
    setIsActive(false);
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3 border-b border-gray-light">
        <Link
          href="/"
          className="p-2 text-brand-green hover:bg-green-50 rounded-full transition-colors"
        >
          <Home size={20} />
        </Link>
        <h1 className="text-lg font-bold text-dark flex-1">تجربة التطبيق</h1>
      </div>

      <div className="px-5 py-6 max-w-md mx-auto space-y-6">
        {/* Hero */}
        <div className="text-center pt-2">
          <div className="w-20 h-20 bg-brand-green rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-3xl font-bold text-white">م</span>
          </div>
          <h2 className="text-xl font-bold text-dark mb-2">
            جرّب مكسب كمستخدم حقيقي
          </h2>
          <p className="text-sm text-gray-text leading-relaxed">
            وضع التجربة يخليك تستكشف كل خصائص التطبيق بإعلانات تجريبية وحساب تجريبي — بدون ما تحتاج تسجيل حقيقي.
          </p>
        </div>

        {/* Features list */}
        <div className="bg-gray-light/50 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-dark mb-1">إيه اللي هتقدر تجربه:</h3>
          {[
            { icon: <ShoppingBag size={16} />, text: "تصفّح 20+ إعلان تجريبي من كل الأقسام" },
            { icon: <Search size={16} />, text: "ابحث وفلتر الإعلانات" },
            { icon: <Gavel size={16} />, text: "شوف المزادات الحية والمزايدات" },
            { icon: <MessageSquare size={16} />, text: "جرّب نظام الشات والتواصل" },
            { icon: <Sparkles size={16} />, text: "أضف إعلان جديد واملأ البيانات" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="text-brand-green mt-0.5 flex-shrink-0">{item.icon}</span>
              <span className="text-sm text-dark leading-relaxed">{item.text}</span>
            </div>
          ))}
        </div>

        {/* Status + Action */}
        {isActive ? (
          <div className="space-y-4">
            {/* Active status */}
            <div className="bg-brand-green-light border border-brand-green/20 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 size={24} className="text-brand-green flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-brand-green-dark">وضع التجربة مفعّل</p>
                <p className="text-xs text-gray-text mt-0.5">
                  مسجل كـ {user?.display_name || DEMO_USER.display_name}
                </p>
              </div>
            </div>

            {/* Navigation */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/">
                <Button fullWidth variant="primary" icon={<Home size={16} />}>
                  الرئيسية
                </Button>
              </Link>
              <Link href="/search">
                <Button fullWidth variant="outline" icon={<Search size={16} />}>
                  البحث
                </Button>
              </Link>
              <Link href="/ad/create">
                <Button fullWidth variant="outline" icon={<ShoppingBag size={16} />}>
                  أضف إعلان
                </Button>
              </Link>
              <Link href="/auctions">
                <Button fullWidth variant="outline" icon={<Gavel size={16} />}>
                  المزادات
                </Button>
              </Link>
            </div>

            {/* Deactivate */}
            <button
              onClick={handleDeactivate}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm text-error hover:bg-error/5 rounded-xl transition-colors"
            >
              <LogOut size={16} />
              إلغاء وضع التجربة
            </button>
          </div>
        ) : (
          <Button
            fullWidth
            size="lg"
            isLoading={isLoading}
            onClick={handleActivate}
            icon={<Play size={18} />}
          >
            ابدأ التجربة
          </Button>
        )}

        {/* Note */}
        <p className="text-[11px] text-gray-text text-center leading-relaxed">
          البيانات التجريبية مش حقيقية ومش بتتحفظ على السيرفر.
          <br />
          لما تخلص التجربة، ممكن تسجل بحسابك الحقيقي.
        </p>
      </div>
    </main>
  );
}
