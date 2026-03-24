"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";

const plans = [
  {
    code: "free",
    name: "مجاني",
    price: 0,
    priceLabel: "مجاناً",
    desc: "ابدأ بدون أي تكلفة",
    color: "border-gray-200",
    bg: "bg-white",
    features: [
      { label: "إعلانين", included: true },
      { label: "5 صور لكل إعلان", included: true },
      { label: "ظهور مميز في البحث", included: false },
      { label: "AI تسعير ذكي", included: false },
      { label: "مزادات", included: false },
      { label: "مندوب مخصص", included: false },
    ],
  },
  {
    code: "silver",
    name: "فضي",
    price: 299,
    priceLabel: "299 ج/شهر",
    desc: "للبائعين النشطين",
    color: "border-gray-300",
    bg: "bg-gray-50",
    features: [
      { label: "10 إعلانات", included: true },
      { label: "10 صور لكل إعلان", included: true },
      { label: "ظهور مميز في البحث", included: true },
      { label: "تحليلات الأداء", included: true },
      { label: "AI تسعير ذكي", included: false },
      { label: "مزادات", included: false },
    ],
  },
  {
    code: "gold",
    name: "ذهبي",
    price: 699,
    priceLabel: "699 ج/شهر",
    desc: "للتجار والمعارض",
    color: "border-[#D4A843]",
    bg: "bg-[#FFF8E1]",
    popular: true,
    features: [
      { label: "50 إعلان", included: true },
      { label: "صور غير محدودة", included: true },
      { label: "ظهور مميز في البحث", included: true },
      { label: "AI تسعير ذكي", included: true },
      { label: "مزاد واحد/شهر", included: true },
      { label: "leads واتساب مؤهلين", included: true },
    ],
  },
  {
    code: "diamond",
    name: "ماسي",
    price: 1499,
    priceLabel: "1,499 ج/شهر",
    desc: "للمعارض الكبيرة والمطورين",
    color: "border-blue-300",
    bg: "bg-blue-50",
    features: [
      { label: "إعلانات غير محدودة", included: true },
      { label: "صور غير محدودة", included: true },
      { label: "ظهور مميز + أولوية", included: true },
      { label: "AI تسعير ذكي", included: true },
      { label: "مزادات غير محدودة", included: true },
      { label: "مندوب مبيعات مخصص", included: true },
    ],
  },
];

const leadPricing = [
  { category: "سيارات", contact: 50, inspection: 150, offer: 300 },
  { category: "عقارات", contact: 100, inspection: 300, offer: 500 },
];

export default function PricingPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-gradient-to-b from-[#1B7A3D]/5 to-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-[#1A1A2E] mb-4">
            ابدأ مجاناً — ادفع لما تبيع
          </h1>
          <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">
            نموذج مبتكر: اشتراك + Pay-per-Lead + عمولة مزاد فقط
          </p>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="max-w-5xl mx-auto px-4 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.code}
              className={`rounded-2xl border-2 ${plan.color} ${plan.bg} p-6 relative ${
                plan.popular ? "ring-2 ring-[#D4A843] shadow-lg" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D4A843] text-white text-xs font-bold px-4 py-1 rounded-full">
                  الأكثر طلباً
                </div>
              )}
              <h3 className="text-xl font-bold text-[#1A1A2E] mb-1">{plan.name}</h3>
              <p className="text-xs text-[#6B7280] mb-4">{plan.desc}</p>
              <div className="text-3xl font-bold text-[#1B7A3D] mb-6">
                {plan.priceLabel}
              </div>
              <div className="space-y-3 mb-6">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {f.included ? (
                      <Check size={16} className="text-[#1B7A3D] flex-shrink-0" />
                    ) : (
                      <X size={16} className="text-gray-300 flex-shrink-0" />
                    )}
                    <span className={f.included ? "text-[#1A1A2E]" : "text-gray-400"}>
                      {f.label}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="https://maksab.vercel.app"
                className={`block w-full text-center py-3 rounded-xl font-bold text-sm transition-colors ${
                  plan.popular
                    ? "bg-[#1B7A3D] text-white hover:bg-[#145C2E]"
                    : "bg-gray-100 text-[#1A1A2E] hover:bg-gray-200"
                }`}
              >
                ابدأ دلوقتي
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Pay-per-Lead */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#1A1A2E] mb-2">
            Pay-per-Lead — ادفع بس لما مشتري حقيقي يتواصل
          </h2>
          <p className="text-[#6B7280]">
            مش بتدفع على مشاهدات — بتدفع على مشترين جادين بس
          </p>
        </div>
        <div className="bg-[#F3F4F6] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1B7A3D] text-white">
                <th className="py-3 px-4 text-right font-bold">القسم</th>
                <th className="py-3 px-4 text-center font-bold">تواصل واتساب</th>
                <th className="py-3 px-4 text-center font-bold">طلب معاينة</th>
                <th className="py-3 px-4 text-center font-bold">عرض سعر جاد</th>
              </tr>
            </thead>
            <tbody>
              {leadPricing.map((row) => (
                <tr key={row.category} className="border-b border-gray-200">
                  <td className="py-3 px-4 font-bold text-[#1A1A2E]">{row.category}</td>
                  <td className="py-3 px-4 text-center text-[#1B7A3D] font-bold">{row.contact} ج</td>
                  <td className="py-3 px-4 text-center text-[#D4A843] font-bold">{row.inspection} ج</td>
                  <td className="py-3 px-4 text-center text-[#145C2E] font-bold">{row.offer} ج</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auction Commission */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <div className="bg-gradient-to-l from-[#1B7A3D]/10 to-[#D4A843]/10 rounded-2xl p-8 text-center border border-[#1B7A3D]/20">
          <h2 className="text-2xl font-bold text-[#1A1A2E] mb-4">
            عمولة المزاد — بتدفع بس لو اتباعت فعلاً
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-md mx-auto">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-3xl mb-2">🚗</div>
              <div className="text-2xl font-bold text-[#1B7A3D]">0.5%</div>
              <p className="text-sm text-[#6B7280] mt-1">سيارات — من سعر البيع</p>
              <p className="text-xs text-[#6B7280] mt-1">عربية 500 ألف = 2,500 ج بس</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-3xl mb-2">🏠</div>
              <div className="text-2xl font-bold text-[#1B7A3D]">0.3%</div>
              <p className="text-sm text-[#6B7280] mt-1">عقارات — من سعر البيع</p>
              <p className="text-xs text-[#6B7280] mt-1">شقة 2 مليون = 6,000 ج بس</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-[#1B7A3D] py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-6">
            جاهز تبدأ؟ تكلم فريقنا
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://wa.me/201000000000?text=%D8%A3%D9%87%D9%84%D8%A7%D9%8B%20%D9%88%D9%84%D9%8A%D8%AF%D8%8C%20%D8%B9%D8%A7%D9%8A%D8%B2%20%D8%A3%D8%B9%D8%B1%D9%81%20%D8%A3%D9%83%D8%AA%D8%B1%20%D8%B9%D9%86%20%D9%85%D9%83%D8%B3%D8%A8"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#1B7A3D] rounded-xl font-bold text-lg hover:bg-gray-50 transition-colors"
            >
              🚗 تكلم وليد — سيارات
            </a>
            <a
              href="https://wa.me/201000000001?text=%D8%A3%D9%87%D9%84%D8%A7%D9%8B%20%D8%A3%D8%AD%D9%85%D8%AF%D8%8C%20%D8%B9%D8%A7%D9%8A%D8%B2%20%D8%A3%D8%B9%D8%B1%D9%81%20%D8%A3%D9%83%D8%AA%D8%B1%20%D8%B9%D9%86%20%D9%85%D9%83%D8%B3%D8%A8"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#D4A843] text-white rounded-xl font-bold text-lg hover:bg-[#C09A3D] transition-colors"
            >
              🏠 تكلم أحمد — عقارات
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
