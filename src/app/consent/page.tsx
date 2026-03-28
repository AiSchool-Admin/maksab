"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface SellerData {
  id: string;
  name: string | null;
  category: string;
  listingsCount: number;
}

interface ListingCard {
  title: string;
  price: number | null;
  image: string | null;
  city: string | null;
}

export default function ConsentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sellerId = searchParams.get("seller") || "";
  const ref = searchParams.get("ref") || "";

  const [seller, setSeller] = useState<SellerData | null>(null);
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [consenting, setConsenting] = useState(false);
  const [done, setDone] = useState(false);

  const isCar = seller?.category === "vehicles" || seller?.category === "سيارات" || seller?.category === "cars";

  useEffect(() => {
    if (!sellerId) { router.replace("/"); return; }
    fetch(`/api/consent?seller=${sellerId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { router.replace("/"); return; }
        setSeller(data.seller);
        setListings(data.listings || []);
      })
      .catch(() => router.replace("/"))
      .finally(() => setLoading(false));
  }, [sellerId, router]);

  const handleConsent = async () => {
    setConsenting(true);
    try {
      await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seller_id: sellerId, ref }),
      });
      setDone(true);
    } catch { /* silent */ }
    setConsenting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir="rtl">
        <div className="w-12 h-12 bg-brand-green rounded-2xl flex items-center justify-center animate-pulse">
          <span className="text-xl">💚</span>
        </div>
      </div>
    );
  }

  if (!seller) return null;

  const emoji = isCar ? "🚗" : "🏠";

  // Done state
  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1B7A3D] to-[#145C2E] flex items-center justify-center px-4" dir="rtl">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
          <span className="text-5xl block mb-4">🎉</span>
          <h1 className="text-2xl font-bold text-dark mb-2">تمام! فريقنا بدأ</h1>
          <p className="text-sm text-gray-text mb-4">
            هنسجلك على مكسب ونكتب إعلاناتك — هنبعتلك رسالة لما نخلص
          </p>
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="text-xs text-green-700">⏱️ المدة المتوقعة: أقل من 10 دقايق</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1B7A3D]/5 to-white" dir="rtl">
      {/* Header */}
      <div className="bg-[#1B7A3D] text-white px-4 pt-8 pb-6 text-center">
        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl font-bold">م</span>
        </div>
        <h1 className="text-lg font-bold">مكسب</h1>
      </div>

      <div className="px-4 -mt-4 max-w-lg mx-auto">
        {/* Main card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4 border border-gray-100 text-center">
          <span className="text-4xl block mb-3">✅</span>
          <h2 className="text-xl font-bold text-dark mb-2">
            تمام {seller.name || ""}! هنسجلك على مكسب ونكتب إعلاناتك
          </h2>
          <p className="text-sm text-gray-text">
            مش محتاج تعمل أي حاجة — فريقنا هيكتب كل حاجة عنك {emoji}
          </p>
        </div>

        {/* Listings preview */}
        {listings.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-bold text-dark mb-2">إعلاناتك اللي هنكتبها:</p>
            <div className="space-y-2">
              {listings.map((l, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                  {l.image ? (
                    <img src={l.image} alt="" className="w-14 h-14 rounded-lg object-cover bg-gray-100" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center">
                      <span className="text-2xl">{emoji}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-dark truncate">{l.title}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-text">
                      {l.price && <span className="text-brand-green font-bold">{l.price.toLocaleString()} ج</span>}
                      {l.city && <span>📍 {l.city}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What we'll do */}
        <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <p className="text-sm font-bold text-dark mb-2">إيه اللي هيحصل:</p>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span className="text-brand-green">✅</span>
              <span>هننشئلك حساب على مكسب مجاناً</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-brand-green">✅</span>
              <span>هنكتب إعلاناتك بصور ووصف كامل</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-brand-green">✅</span>
              <span>هنبعتلك رابط تدخل حسابك منه</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-brand-green">✅</span>
              <span>مفيش أي رسوم — مجاني تماماً</span>
            </div>
          </div>
        </div>

        {/* Consent button */}
        <button
          onClick={handleConsent}
          disabled={consenting}
          className="w-full py-4 bg-[#1B7A3D] hover:bg-[#145C2E] text-white font-bold rounded-xl text-base transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-[#1B7A3D]/20 mb-3"
        >
          {consenting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              جاري...
            </span>
          ) : (
            "✅ موافق — سجلني واكتب إعلاناتي!"
          )}
        </button>

        <p className="text-[10px] text-gray-text text-center mb-8">
          بالضغط على &quot;موافق&quot; أنت بتوافق إن فريق مكسب ينشئ حسابك وينشر إعلاناتك
        </p>
      </div>
    </div>
  );
}
