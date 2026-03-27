"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

/* ─── Types ─── */

interface SellerData {
  id: string;
  name: string | null;
  category: string;
  governorate: string;
  accountType: string;
  listingsCount: number;
  platform: string;
}

interface ListingData {
  id: string;
  title: string;
  price: number | null;
  image: string | null;
  url: string | null;
  city: string | null;
}

const CAR_CATS = ["vehicles", "سيارات", "cars"];

/* ─── Main Page ─── */

export default function JoinPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const phone = searchParams.get("phone") || "";
  const sellerId = searchParams.get("seller") || "";
  const ref = searchParams.get("ref") || "";

  const [seller, setSeller] = useState<SellerData | null>(null);
  const [listings, setListings] = useState<ListingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCar = seller ? CAR_CATS.includes(seller.category) : ref === "waleed";

  // Fetch seller data
  useEffect(() => {
    if (!sellerId) {
      router.replace("/");
      return;
    }

    fetch(`/api/join?seller=${sellerId}&ref=${ref}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          router.replace("/");
          return;
        }
        setSeller(data.seller);
        setListings(data.listings || []);
      })
      .catch(() => router.replace("/"))
      .finally(() => setLoading(false));
  }, [sellerId, ref, router]);

  // Send OTP
  const handleSendOtp = async () => {
    if (!phone) { setError("رقم الموبايل مش موجود"); return; }
    setRegistering(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "حصلت مشكلة"); setRegistering(false); return; }
      setOtpToken(data.token || "");
      setOtpSent(true);
    } catch {
      setError("حصلت مشكلة في الاتصال");
    }
    setRegistering(false);
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) { setError("الكود لازم يكون 6 أرقام"); return; }
    setRegistering(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otpCode, token: otpToken }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "الكود غلط"); setRegistering(false); return; }

      // Store session
      if (data.session_token) {
        localStorage.setItem("maksab_session_token", data.session_token);
      }
      if (data.user) {
        localStorage.setItem("maksab_user", JSON.stringify(data.user));
      }

      // Log conversion
      await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seller_id: sellerId, ref }),
      }).catch(() => {});

      // Migrate listings from ahe_listings → ads
      if (data.user?.id && sellerId) {
        await fetch("/api/listings/migrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seller_id: sellerId, user_id: data.user.id }),
        }).catch(() => {});
      }

      // Redirect to my-ads
      router.push(isCar ? "/my-ads?welcome=car" : "/my-ads?welcome=property");
    } catch {
      setError("حصلت مشكلة — جرّب تاني");
    }
    setRegistering(false);
  };

  const formatPrice = (p: number | null) => p ? p.toLocaleString("en-US") : "—";

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-14 h-14 bg-brand-green rounded-2xl flex items-center justify-center mx-auto mb-3 animate-pulse">
            <span className="text-2xl">💚</span>
          </div>
          <p className="text-sm text-gray-text">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!seller) return null;

  const sellerName = seller.name || "يا باشا";
  const emoji = isCar ? "🚗" : "🏠";
  const typeLabel = isCar ? "سياراتك" : "عقاراتك";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1B7A3D]/5 to-white" dir="rtl">
      {/* Header */}
      <div className="bg-[#1B7A3D] text-white px-4 pt-8 pb-6 text-center">
        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl font-bold text-white">م</span>
        </div>
        <h1 className="text-xl font-bold mb-1">مكسب</h1>
        <p className="text-sm text-white/80">سوق إسكندراني للسيارات والعقارات</p>
      </div>

      <div className="px-4 -mt-4 max-w-lg mx-auto">
        {/* Welcome Card */}
        <div className="bg-white rounded-2xl shadow-lg p-5 mb-4 border border-gray-100">
          <div className="text-center">
            <span className="text-4xl mb-3 block">{emoji}</span>
            <h2 className="text-xl font-bold text-dark mb-2">
              أهلاً {sellerName} 👋
            </h2>
            {listings.length > 0 ? (
              <p className="text-sm text-gray-text">
                إعلانات {typeLabel} على مكسب جاهزة!
              </p>
            ) : (
              <p className="text-sm text-gray-text">
                مكسب منصة إسكندرانية {isCar ? "للسيارات" : "للعقارات"}
                <br />
                فريقنا يجهزلك إعلان {isCar ? "سيارتك" : "عقارك"} في دقايق {emoji}
              </p>
            )}
          </div>
        </div>

        {/* Listings Cards */}
        {listings.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-bold text-dark mb-2">إعلاناتك ({listings.length}):</p>
            <div className="grid grid-cols-2 gap-2">
              {listings.map((l) => (
                <div key={l.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                  {l.image ? (
                    <img src={l.image} alt={l.title} className="w-full h-24 object-cover bg-gray-100" />
                  ) : (
                    <div className="w-full h-24 bg-gray-100 flex items-center justify-center">
                      <span className="text-3xl">{emoji}</span>
                    </div>
                  )}
                  <div className="p-2">
                    <p className="text-xs font-bold text-dark line-clamp-2 leading-tight mb-1">{l.title}</p>
                    {l.price && (
                      <p className="text-xs font-bold text-brand-green">{formatPrice(l.price)} جنيه</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Benefits */}
        <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <p className="text-sm font-bold text-dark mb-3">ليه مكسب؟</p>
          <div className="space-y-2">
            {[
              { icon: "✅", text: "مجاني تماماً — مفيش أي رسوم" },
              { icon: "🔥", text: "مزادات أونلاين — المشترين بيتنافسوا" },
              { icon: "📱", text: "مشترين جادين بيتواصلوا معاك" },
              { icon: "🤖", text: "تقييم AI — اعرف سعر السوق الحقيقي" },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm">{b.icon}</span>
                <span className="text-xs text-gray-600">{b.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Registration Section */}
        <div className="bg-white rounded-2xl p-5 mb-6 border-2 border-brand-green/20">
          {!otpSent ? (
            <>
              {phone && (
                <div className="text-center mb-4">
                  <p className="text-xs text-gray-text mb-1">رقمك</p>
                  <p className="text-lg font-bold text-dark font-mono" dir="ltr">{phone}</p>
                </div>
              )}
              <button
                onClick={handleSendOtp}
                disabled={registering || !phone}
                className="w-full py-4 bg-[#1B7A3D] hover:bg-[#145C2E] text-white font-bold rounded-xl text-base transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-[#1B7A3D]/20"
              >
                {registering ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري الإرسال...
                  </span>
                ) : (
                  `${emoji} أكمّل تسجيلي وأدير إعلانات ${typeLabel}`
                )}
              </button>
              <p className="text-[10px] text-gray-text text-center mt-2">
                مجاني تماماً — يستغرق دقيقة واحدة
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-dark text-center mb-3">
                كود التأكيد اتبعت على واتساب
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="- - - - - -"
                className="w-full text-center text-2xl font-bold tracking-[0.5em] py-3 border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none mb-3"
                autoFocus
              />
              <button
                onClick={handleVerifyOtp}
                disabled={registering || otpCode.length !== 6}
                className="w-full py-3.5 bg-[#1B7A3D] hover:bg-[#145C2E] text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50"
              >
                {registering ? "جاري التحقق..." : "تأكيد وتسجيل"}
              </button>
              <button
                onClick={() => { setOtpSent(false); setOtpCode(""); }}
                className="w-full mt-2 text-xs text-gray-text hover:text-dark"
              >
                ارجع لتغيير الرقم
              </button>
            </>
          )}

          {error && (
            <p className="text-xs text-red-500 text-center mt-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pb-8">
          <p className="text-[10px] text-gray-text">
            {ref === "waleed" ? "وليد — فريق سيارات مكسب" : ref === "ahmed" ? "أحمد — فريق عقارات مكسب" : "فريق مكسب"}
          </p>
          <Link href="/" className="text-[10px] text-brand-green hover:underline">
            maksab.vercel.app
          </Link>
        </div>
      </div>
    </div>
  );
}
