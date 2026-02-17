"use client";

import { useState, useEffect, useCallback } from "react";
import { Rocket, Users, Gavel, ArrowLeftRight, Recycle, Shield, ChevronLeft, Check, Gift, Share2 } from "lucide-react";
import MaksabLogo from "@/components/ui/MaksabLogo";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { trackEvent } from "@/lib/analytics/analytics-service";

/** Target launch date — customize as needed */
const LAUNCH_DATE = new Date("2026-03-15T00:00:00+02:00"); // Cairo time

interface CountdownValues {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function useCountdown(targetDate: Date): CountdownValues {
  const [countdown, setCountdown] = useState<CountdownValues>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, targetDate.getTime() - now);
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return countdown;
}

const EARLY_SIGNUPS_KEY = "maksab_pre_launch_signups";
const USER_SIGNUP_KEY = "maksab_pre_launch_user";

interface EarlySignup {
  phone: string;
  referralCode?: string;
  timestamp: string;
}

export default function PreLaunchPage() {
  const countdown = useCountdown(LAUNCH_DATE);
  const [phone, setPhone] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [signupCount, setSignupCount] = useState(0);
  const [userReferralCode, setUserReferralCode] = useState("");
  const [showReferral, setShowReferral] = useState(false);

  // Check for referral code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setReferralCode(ref);
  }, []);

  // Check if already registered
  useEffect(() => {
    const stored = localStorage.getItem(USER_SIGNUP_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setIsRegistered(true);
        setUserReferralCode(data.referralCode || "");
      } catch {
        // ignore
      }
    }

    // Get signup count
    const signups = localStorage.getItem(EARLY_SIGNUPS_KEY);
    if (signups) {
      try {
        setSignupCount((JSON.parse(signups) as EarlySignup[]).length);
      } catch {
        // ignore
      }
    }
  }, []);

  const validatePhone = (p: string): boolean => {
    const cleaned = p.replace(/\D/g, "");
    return /^01[0125]\d{8}$/.test(cleaned);
  };

  const handleSubmit = useCallback(async () => {
    if (!validatePhone(phone)) {
      toast.error("رقم الموبايل مش صحيح — لازم يبدأ بـ 01 ويكون 11 رقم");
      return;
    }

    setIsSubmitting(true);

    // Generate unique referral code for this user
    const code = `MKS-${phone.slice(-4)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const signup: EarlySignup = {
      phone: phone.replace(/\D/g, ""),
      referralCode: referralCode || undefined,
      timestamp: new Date().toISOString(),
    };

    // Save to local storage
    const existing = localStorage.getItem(EARLY_SIGNUPS_KEY);
    const signups: EarlySignup[] = existing ? JSON.parse(existing) : [];
    signups.push(signup);
    localStorage.setItem(EARLY_SIGNUPS_KEY, JSON.stringify(signups));

    // Save user data
    localStorage.setItem(
      USER_SIGNUP_KEY,
      JSON.stringify({ phone: signup.phone, referralCode: code }),
    );

    // Track analytics
    trackEvent("pre_launch_signup", {
      hasReferral: !!referralCode,
      signupNumber: signups.length,
    });

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    setIsSubmitting(false);
    setIsRegistered(true);
    setUserReferralCode(code);
    setSignupCount(signups.length);

    toast.success("مبروك! انت من الأوائل على مكسب 🎉");
  }, [phone, referralCode]);

  const handleShareReferral = async () => {
    const url = `${window.location.origin}/pre-launch?ref=${userReferralCode}`;
    const text = `انضم لمكسب — أول سوق مصري فيه مزادات وتبديل! سجّل دلوقتي واحصل على شارة "رائد مكسب" 🏆`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "مكسب", text, url });
      } catch {
        // cancelled
      }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success("تم نسخ رابط الدعوة");
    }
  };

  const handleShareWhatsApp = () => {
    const url = `${window.location.origin}/pre-launch?ref=${userReferralCode}`;
    const text = `🟢 مكسب جاي قريب!\nأول سوق مصري فيه مزادات + تبديل\nسجّل من الأوائل واحصل على شارة رائد مكسب 🏆\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const features = [
    {
      icon: <Gavel className="text-brand-gold" size={24} />,
      title: "مزادات حقيقية",
      desc: "بيع بأعلى سعر — أول marketplace مصري فيه نظام مزادات",
    },
    {
      icon: <ArrowLeftRight className="text-purple-600" size={24} />,
      title: "نظام تبديل ذكي",
      desc: "عندك حاجة مش عايزها؟ بدّلها بحاجة تحبها — matching تلقائي",
    },
    {
      icon: <Recycle className="text-green-600" size={24} />,
      title: "قسم خردة متخصص",
      desc: "أول سوق أونلاين للخردة — حديد، نحاس، ألومنيوم وغيرهم",
    },
    {
      icon: <Shield className="text-blue-600" size={24} />,
      title: "عمولة اختيارية",
      desc: "مكسب مجاني بالكامل — ادفع بس لو عايز تدعمنا 💚",
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-green-light via-white to-brand-gold-light" dir="rtl">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-light">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
          <MaksabLogo size="sm" variant="full" />
          <Link
            href="/"
            className="text-xs text-gray-text hover:text-brand-green flex items-center gap-1 transition-colors"
          >
            الصفحة الرئيسية
            <ChevronLeft size={14} />
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <section className="text-center space-y-4">
          <div className="flex justify-center mb-2">
            <MaksabLogo size="xl" variant="stacked" />
          </div>

          <div className="inline-flex items-center gap-2 bg-brand-green/10 text-brand-green text-sm font-bold px-4 py-2 rounded-full">
            <Rocket size={16} />
            قريبًا جدًا!
          </div>

          <h1 className="text-3xl font-bold text-dark leading-tight">
            مكسب جاي يغيّر
            <br />
            <span className="text-brand-green">السوق المصري</span>
          </h1>

          <p className="text-gray-text text-sm leading-relaxed">
            أول سوق إلكتروني مصري فيه مزادات حقيقية + تبديل ذكي + أقسام متخصصة.
            <br />
            <strong className="text-dark">كل صفقة مكسب</strong>
          </p>
        </section>

        {/* Countdown Timer */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-light p-6">
          <p className="text-center text-sm font-bold text-gray-text mb-4">
            الإطلاق خلال
          </p>
          <div className="grid grid-cols-4 gap-3 text-center">
            {[
              { value: countdown.days, label: "يوم" },
              { value: countdown.hours, label: "ساعة" },
              { value: countdown.minutes, label: "دقيقة" },
              { value: countdown.seconds, label: "ثانية" },
            ].map((item) => (
              <div key={item.label} className="bg-brand-green-light rounded-xl py-3">
                <p className="text-2xl font-bold text-brand-green tabular-nums">
                  {String(item.value).padStart(2, "0")}
                </p>
                <p className="text-[10px] text-gray-text mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          {signupCount > 0 && (
            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-text">
              <Users size={14} className="text-brand-green" />
              <span>
                <strong className="text-dark">{signupCount.toLocaleString("ar-EG")}</strong> شخص سجّل لحد دلوقتي
              </span>
            </div>
          )}
        </section>

        {/* Registration Form OR Success State */}
        {!isRegistered ? (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-light p-6 space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-bold text-dark mb-1">
                سجّل من الأوائل واحصل على 🏆
              </h2>
              <p className="text-xs text-gray-text">
                أول 1,000 مستخدم هياخدوا شارة <strong className="text-amber-700">&quot;رائد مكسب&quot;</strong> الحصرية
              </p>
            </div>

            {/* Phone Input */}
            <div>
              <label className="block text-sm font-bold text-dark mb-2">
                رقم الموبايل
              </label>
              <input
                type="tel"
                dir="ltr"
                placeholder="01XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 11))}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 text-right text-base focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green transition-all"
                maxLength={11}
              />
            </div>

            {/* Referral Code (Optional) */}
            <div>
              <button
                onClick={() => setShowReferral(!showReferral)}
                className="text-xs text-brand-green font-semibold hover:text-brand-green-dark transition-colors"
              >
                {showReferral ? "إخفاء" : "عندك كود دعوة؟"}
              </button>
              {showReferral && (
                <input
                  type="text"
                  dir="ltr"
                  placeholder="MKS-XXXXXXXX"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="w-full h-10 px-4 mt-2 rounded-xl border border-gray-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green transition-all"
                />
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || phone.length < 11}
              className="w-full h-12 bg-brand-green text-white font-bold rounded-xl hover:bg-brand-green-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Rocket size={18} />
                  سجّلني من الأوائل
                </>
              )}
            </button>
          </section>
        ) : (
          <section className="bg-gradient-to-bl from-brand-green-light to-brand-gold-light rounded-2xl shadow-sm border border-green-200 p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="text-4xl">🎉</div>
              <h2 className="text-lg font-bold text-dark">مبروك! انت من الأوائل</h2>
              <p className="text-sm text-gray-text">
                هنبعتلك إشعار أول ما التطبيق ينزل
              </p>
            </div>

            {/* Pioneer Badge Preview */}
            <div className="bg-white rounded-xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-2xl border-2 border-amber-200">
                🏆
              </div>
              <div>
                <p className="text-sm font-bold text-amber-700">رائد مكسب</p>
                <p className="text-xs text-gray-text">شارتك الحصرية هتكون جاهزة وقت الإطلاق</p>
              </div>
              <Check size={20} className="text-brand-green mr-auto" />
            </div>

            {/* Referral Section */}
            <div className="bg-white rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Gift size={18} className="text-purple-600" />
                <p className="text-sm font-bold text-dark">ادعي صحابك واكسبوا أكتر!</p>
              </div>
              <p className="text-xs text-gray-text">
                كل صاحبك يسجّل بالكود بتاعك، هتاخدوا الاتنين نقاط مكافآت 🎁
              </p>

              {/* Referral Code */}
              <div className="bg-gray-light rounded-xl p-3 flex items-center justify-between" dir="ltr">
                <span className="text-sm font-bold text-dark tracking-wider">{userReferralCode}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(userReferralCode);
                    toast.success("تم نسخ كود الدعوة");
                  }}
                  className="text-xs text-brand-green font-semibold hover:text-brand-green-dark"
                >
                  نسخ
                </button>
              </div>

              {/* Share Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleShareWhatsApp}
                  className="flex items-center justify-center gap-2 h-10 rounded-xl bg-[#25D366]/10 text-[#25D366] text-sm font-bold hover:bg-[#25D366]/20 transition-colors"
                >
                  واتساب
                </button>
                <button
                  onClick={handleShareReferral}
                  className="flex items-center justify-center gap-2 h-10 rounded-xl bg-brand-green-light text-brand-green text-sm font-bold hover:bg-green-100 transition-colors"
                >
                  <Share2 size={14} />
                  مشاركة
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Features Grid */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-dark text-center">
            ليه مكسب مختلف؟
          </h2>

          <div className="grid grid-cols-1 gap-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-4 flex items-start gap-3 border border-gray-light"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-light flex items-center justify-center flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-dark">{feature.title}</p>
                  <p className="text-xs text-gray-text mt-0.5 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Category Preview */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-light p-6 space-y-4">
          <h2 className="text-base font-bold text-dark text-center">
            12 قسم متخصص
          </h2>
          <div className="grid grid-cols-4 gap-3 text-center">
            {[
              { emoji: "🚗", name: "سيارات" },
              { emoji: "🏠", name: "عقارات" },
              { emoji: "📱", name: "موبايلات" },
              { emoji: "👗", name: "موضة" },
              { emoji: "♻️", name: "خردة" },
              { emoji: "💰", name: "ذهب" },
              { emoji: "💎", name: "فاخرة" },
              { emoji: "🏠", name: "أجهزة" },
              { emoji: "🪑", name: "أثاث" },
              { emoji: "🎮", name: "هوايات" },
              { emoji: "🔧", name: "عدد" },
              { emoji: "🛠️", name: "خدمات" },
            ].map((cat) => (
              <div key={cat.name} className="py-2">
                <div className="text-2xl mb-1">{cat.emoji}</div>
                <p className="text-[10px] font-bold text-gray-text">{cat.name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer CTA */}
        <section className="text-center pb-8 space-y-3">
          <p className="text-sm text-gray-text">
            مكسب — <strong className="text-brand-green">كل صفقة مكسب</strong> 💚
          </p>
          {!isRegistered && (
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="text-sm text-brand-green font-bold hover:text-brand-green-dark transition-colors"
            >
              سجّل دلوقتي من الأوائل ↑
            </button>
          )}
        </section>
      </div>
    </main>
  );
}
