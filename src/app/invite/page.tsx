"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Rocket,
  Users,
  Gavel,
  ArrowLeftRight,
  Recycle,
  Shield,
  ChevronLeft,
  Check,
  Gift,
  Share2,
  Star,
  Zap,
  TrendingUp,
  Heart,
  Crown,
  Phone,
} from "lucide-react";
import MaksabLogo from "@/components/ui/MaksabLogo";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { trackEvent } from "@/lib/analytics/analytics-service";
import { getStoredUTM, buildUTMUrl } from "@/lib/utm/utm-service";
import { getFounderStats } from "@/lib/founder/founder-service";

// ── Countdown Hook ─────────────────────────────────────

const LAUNCH_DATE = new Date("2026-03-15T00:00:00+02:00");

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
      const diff = Math.max(0, targetDate.getTime() - Date.now());
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

// ── Storage Keys ───────────────────────────────────────

const USER_SIGNUP_KEY = "maksab_founder_signup";

// ── Main Component ─────────────────────────────────────

export default function InvitePage() {
  const countdown = useCountdown(LAUNCH_DATE);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [userInviteCode, setUserInviteCode] = useState("");
  const [founderNumber, setFounderNumber] = useState(0);
  const [founderStats, setFounderStats] = useState({
    totalFounders: 0,
    remaining: 500,
    limit: 500,
  });
  const [showInviteInput, setShowInviteInput] = useState(false);

  // Check for invite code in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") || params.get("invite");
    if (ref) {
      setInviteCode(ref);
      setShowInviteInput(true);
    }
  }, []);

  // Check if already registered + load founder stats
  useEffect(() => {
    const stored = localStorage.getItem(USER_SIGNUP_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setIsRegistered(true);
        setUserInviteCode(data.inviteCode || "");
        setFounderNumber(data.founderNumber || 0);
      } catch {
        // ignore
      }
    }

    getFounderStats().then(setFounderStats);

    // Track page view with UTM
    const utm = getStoredUTM();
    trackEvent("page_view", {
      page: "invite",
      utm_source: utm?.utm_source,
      utm_campaign: utm?.utm_campaign,
    });
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

    // Generate invite code
    const phoneSuffix = phone.slice(-4);
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    const code = `MKS-${phoneSuffix}${random}`;
    const fNum = founderStats.totalFounders + 1;

    // Save to localStorage
    const signupData = {
      phone: phone.replace(/\D/g, ""),
      name: name || null,
      inviteCode: code,
      founderNumber: fNum,
      invitedBy: inviteCode || null,
      timestamp: new Date().toISOString(),
    };

    localStorage.setItem(USER_SIGNUP_KEY, JSON.stringify(signupData));

    // Track conversion with UTM data
    const utm = getStoredUTM();
    trackEvent("pre_launch_signup", {
      page: "invite",
      hasReferral: !!inviteCode,
      founderNumber: fNum,
      utm_source: utm?.utm_source,
      utm_medium: utm?.utm_medium,
      utm_campaign: utm?.utm_campaign,
    });

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    setIsSubmitting(false);
    setIsRegistered(true);
    setUserInviteCode(code);
    setFounderNumber(fNum);

    toast.success("مبروك! انت مؤسس مكسب رقم #" + fNum + " 🏛️");
  }, [phone, name, inviteCode, founderStats.totalFounders]);

  const handleShareWhatsApp = () => {
    const url = buildUTMUrl(
      "/invite",
      "whatsapp",
      "referral",
      "founder_invite",
      { ref: userInviteCode },
    );
    const text = `🏛️ انضم لمكسب كمؤسس!\n\nأنا مؤسس مكسب رقم #${founderNumber} — أول سوق مصري فيه مزادات وتبديل\n\nسجّل من الرابط ده واحصل على شارة "مؤسس مكسب" الحصرية 🏆\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleShareGeneral = async () => {
    const url = buildUTMUrl(
      "/invite",
      "share",
      "referral",
      "founder_invite",
      { ref: userInviteCode },
    );
    const text = `انضم لمكسب كمؤسس — أول سوق مصري فيه مزادات وتبديل! سجّل واحصل على شارة "مؤسس مكسب" 🏛️`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "مكسب — مؤسس مكسب", text, url });
      } catch {
        // cancelled
      }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success("تم نسخ رابط الدعوة");
    }
  };

  const founderProgress = Math.min(
    100,
    (founderStats.totalFounders / founderStats.limit) * 100,
  );

  return (
    <main
      className="min-h-screen bg-gradient-to-b from-[#0A1628] via-[#0F2035] to-[#1A1A2E]"
      dir="rtl"
    >
      <Toaster position="top-center" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0A1628]/90 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
          <MaksabLogo size="sm" variant="full" />
          <Link
            href="/"
            className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1 transition-colors"
          >
            الصفحة الرئيسية
            <ChevronLeft size={14} />
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Hero Section */}
        <section className="text-center space-y-5 pt-4">
          {/* Animated badge */}
          <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 text-sm font-bold px-5 py-2.5 rounded-full border border-amber-500/20 animate-pulse">
            <Crown size={16} />
            فرصة محدودة — {founderStats.remaining} مكان متبقي
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight">
            كن <span className="text-amber-400">مؤسس</span>
            <br />
            <span className="text-brand-green">مكسب</span>
          </h1>

          <p className="text-white/60 text-sm leading-relaxed max-w-[320px] mx-auto">
            انضم لأول 500 مؤسس لمكسب واحصل على شارة حصرية ومميزات خاصة مدى
            الحياة
          </p>
        </section>

        {/* Countdown */}
        <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-5">
          <p className="text-center text-xs font-bold text-white/40 mb-3 tracking-wider">
            الإطلاق الرسمي خلال
          </p>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { value: countdown.days, label: "يوم" },
              { value: countdown.hours, label: "ساعة" },
              { value: countdown.minutes, label: "دقيقة" },
              { value: countdown.seconds, label: "ثانية" },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white/5 rounded-xl py-3 border border-white/5"
              >
                <p className="text-2xl font-bold text-white tabular-nums">
                  {String(item.value).padStart(2, "0")}
                </p>
                <p className="text-[10px] text-white/40 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Founder Progress Bar */}
        <section className="bg-gradient-to-l from-amber-500/10 to-yellow-500/5 backdrop-blur-sm rounded-2xl border border-amber-500/20 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏛️</span>
              <p className="text-sm font-bold text-amber-300">مؤسسين مكسب</p>
            </div>
            <span className="text-sm font-bold text-amber-400 tabular-nums">
              {founderStats.totalFounders} / {founderStats.limit}
            </span>
          </div>
          <div className="h-3 bg-black/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-amber-400 to-yellow-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${founderProgress}%` }}
            />
          </div>
          <p className="text-[11px] text-amber-400/60 mt-2 text-center">
            {founderStats.remaining > 0
              ? `فاضل ${founderStats.remaining} مكان بس — سجّل دلوقتي!`
              : "الأماكن خلصت!"}
          </p>
        </section>

        {/* Registration Form OR Success State */}
        {!isRegistered ? (
          <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-bold text-white mb-1">
                سجّل كمؤسس مكسب 🏛️
              </h2>
              <p className="text-xs text-white/50">
                احصل على شارة حصرية ورقم مؤسس فريد
              </p>
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-sm font-bold text-white/70 mb-2">
                الاسم (اختياري)
              </label>
              <input
                type="text"
                placeholder="اسمك يظهر في شارة المؤسس"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
              />
            </div>

            {/* Phone Input */}
            <div>
              <label className="block text-sm font-bold text-white/70 mb-2">
                <Phone size={14} className="inline ml-1" />
                رقم الموبايل
              </label>
              <input
                type="tel"
                dir="ltr"
                placeholder="01XXXXXXXXX"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 11))
                }
                className="w-full h-12 px-4 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 text-right text-base focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                maxLength={11}
              />
            </div>

            {/* Invite Code */}
            <div>
              <button
                onClick={() => setShowInviteInput(!showInviteInput)}
                className="text-xs text-amber-400 font-semibold hover:text-amber-300 transition-colors"
              >
                {showInviteInput ? "إخفاء" : "عندك كود دعوة من مؤسس؟"}
              </button>
              {showInviteInput && (
                <input
                  type="text"
                  dir="ltr"
                  placeholder="MKS-XXXXXXXX"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full h-10 px-4 mt-2 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                />
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || phone.length < 11}
              className="w-full h-13 bg-gradient-to-l from-amber-500 to-yellow-500 text-[#1A1A2E] font-bold rounded-xl hover:from-amber-400 hover:to-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
              style={{ height: "52px" }}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-[#1A1A2E]/30 border-t-[#1A1A2E] rounded-full animate-spin" />
              ) : (
                <>
                  <Crown size={18} />
                  سجّل كمؤسس مكسب
                </>
              )}
            </button>
          </section>
        ) : (
          <section className="bg-gradient-to-b from-amber-500/10 to-yellow-500/5 backdrop-blur-sm rounded-2xl border border-amber-500/30 p-6 space-y-5">
            {/* Success Header */}
            <div className="text-center space-y-3">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-100 to-yellow-100 border-4 border-amber-300 flex items-center justify-center text-4xl shadow-lg shadow-amber-500/20">
                🏛️
              </div>
              <h2 className="text-xl font-bold text-white">
                مبروك يا مؤسس مكسب!
              </h2>
              <p className="text-sm text-white/60">
                انت المؤسس رقم{" "}
                <strong className="text-amber-400">#{founderNumber}</strong> من
                أوائل 500 مؤسس
              </p>
            </div>

            {/* Founder Card */}
            <div className="bg-gradient-to-l from-amber-900/30 to-yellow-900/20 rounded-xl p-4 border border-amber-500/20">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-200 to-yellow-200 border-2 border-amber-300 flex items-center justify-center text-3xl">
                  🏛️
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-amber-300">
                    مؤسس مكسب
                  </p>
                  <p className="text-xs text-amber-400/60">
                    شارة حصرية — مدى الحياة
                  </p>
                </div>
                <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg px-3 py-2">
                  <p className="text-xl font-bold text-amber-300 tabular-nums">
                    #{founderNumber}
                  </p>
                </div>
              </div>
            </div>

            {/* Referral Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Gift size={18} className="text-amber-400" />
                <p className="text-sm font-bold text-white">
                  ادعي صحابك يكونوا مؤسسين!
                </p>
              </div>
              <p className="text-xs text-white/50">
                شارك كود الدعوة وكل واحد يسجّل بيه هياخد شارة مؤسس مكسب
              </p>

              {/* Invite Code Display */}
              <div
                className="bg-white/5 rounded-xl p-3 flex items-center justify-between border border-white/10"
                dir="ltr"
              >
                <span className="text-sm font-bold text-amber-300 tracking-wider">
                  {userInviteCode}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(userInviteCode);
                    toast.success("تم نسخ كود الدعوة");
                  }}
                  className="text-xs text-amber-400 font-semibold hover:text-amber-300"
                >
                  نسخ
                </button>
              </div>

              {/* Share Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleShareWhatsApp}
                  className="flex items-center justify-center gap-2 h-11 rounded-xl bg-[#25D366]/15 text-[#25D366] text-sm font-bold hover:bg-[#25D366]/25 transition-colors border border-[#25D366]/20"
                >
                  واتساب
                </button>
                <button
                  onClick={handleShareGeneral}
                  className="flex items-center justify-center gap-2 h-11 rounded-xl bg-white/5 text-white/80 text-sm font-bold hover:bg-white/10 transition-colors border border-white/10"
                >
                  <Share2 size={14} />
                  مشاركة
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Founder Benefits */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white text-center">
            مميزات المؤسس الحصرية
          </h2>

          <div className="space-y-2">
            {[
              {
                icon: <Crown size={20} className="text-amber-400" />,
                title: "شارة مؤسس مكسب",
                desc: "شارة ذهبية حصرية تظهر في كل إعلاناتك ومحادثاتك — مدى الحياة",
              },
              {
                icon: <Star size={20} className="text-amber-400" />,
                title: "رقم مؤسس فريد",
                desc: "رقم خاص بيك من أول 500 — يظهر في بروفايلك",
              },
              {
                icon: <Zap size={20} className="text-purple-400" />,
                title: "أولوية في المميزات الجديدة",
                desc: "أول ناس تجرب كل ميزة جديدة قبل أي حد تاني",
              },
              {
                icon: <TrendingUp size={20} className="text-brand-green" />,
                title: "ظهور أعلى لإعلاناتك",
                desc: "إعلاناتك هتتعرض لناس أكتر — boost مجاني",
              },
              {
                icon: <Heart size={20} className="text-pink-400" />,
                title: "دعم مجتمع مكسب",
                desc: "بتساعدنا نكبر ونوفر سوق مصري أفضل للجميع",
              },
            ].map((benefit) => (
              <div
                key={benefit.title}
                className="bg-white/5 rounded-xl p-4 flex items-start gap-3 border border-white/5"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                  {benefit.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{benefit.title}</p>
                  <p className="text-xs text-white/40 mt-0.5 leading-relaxed">
                    {benefit.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What is Maksab */}
        <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="text-base font-bold text-white text-center">
            ليه مكسب مختلف؟
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                icon: <Gavel className="text-brand-gold" size={22} />,
                title: "مزادات حقيقية",
                desc: "بيع بأعلى سعر",
              },
              {
                icon: <ArrowLeftRight className="text-purple-400" size={22} />,
                title: "تبديل ذكي",
                desc: "بدّل حاجتك بحاجة تحبها",
              },
              {
                icon: <Recycle className="text-green-400" size={22} />,
                title: "قسم خردة",
                desc: "أول سوق خردة أونلاين",
              },
              {
                icon: <Shield className="text-blue-400" size={22} />,
                title: "عمولة اختيارية",
                desc: "مجاني بالكامل",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white/5 rounded-xl p-3 text-center border border-white/5"
              >
                <div className="flex justify-center mb-2">{feature.icon}</div>
                <p className="text-xs font-bold text-white">{feature.title}</p>
                <p className="text-[10px] text-white/40 mt-0.5">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Categories Preview */}
        <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-5 space-y-3">
          <h2 className="text-sm font-bold text-white/80 text-center">
            12 قسم متخصص
          </h2>
          <div className="grid grid-cols-6 gap-2 text-center">
            {[
              { emoji: "🚗", name: "سيارات" },
              { emoji: "🏠", name: "عقارات" },
              { emoji: "📱", name: "موبايل" },
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
              <div key={cat.name} className="py-1.5">
                <div className="text-xl mb-0.5">{cat.emoji}</div>
                <p className="text-[9px] font-bold text-white/40">{cat.name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials / Social Proof */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white text-center">
            المؤسسين بيقولوا إيه؟
          </h2>
          <div className="space-y-2">
            {[
              {
                name: "أحمد م.",
                text: "فكرة المزادات والتبديل حاجة مختلفة عن أي حاجة في السوق",
                number: 12,
              },
              {
                name: "سارة ع.",
                text: "أخيراً حد فكّر في قسم للخردة — ده كنز مصر الضايع",
                number: 45,
              },
              {
                name: "محمد ح.",
                text: "العمولة الاختيارية بتخلي الواحد يحب يدعم المشروع",
                number: 78,
              },
            ].map((testimonial) => (
              <div
                key={testimonial.number}
                className="bg-white/5 rounded-xl p-4 border border-white/5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-xs">
                    🏛️
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      {testimonial.name}
                    </p>
                    <p className="text-[10px] text-amber-400/60">
                      مؤسس #{testimonial.number}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">
                  &ldquo;{testimonial.text}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer CTA */}
        <section className="text-center pb-8 space-y-4">
          {!isRegistered && (
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="w-full h-12 bg-gradient-to-l from-amber-500 to-yellow-500 text-[#1A1A2E] font-bold rounded-xl shadow-lg shadow-amber-500/20"
            >
              سجّل كمؤسس دلوقتي ↑
            </button>
          )}
          <p className="text-xs text-white/30">
            مكسب — <strong className="text-brand-green">كل صفقة مكسب</strong> 💚
          </p>
        </section>
      </div>
    </main>
  );
}
