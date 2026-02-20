"use client";

import { useState, useEffect } from "react";
import {
  Gift,
  Users,
  Copy,
  Check,
  Trophy,
  Star,
  Crown,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  getReferralProfile,
  getReferralLink,
  trackReferralShare,
  type ReferralLevel,
} from "@/lib/referral";
import { ga4Event } from "@/lib/analytics/ga4";

// ── Level Config ──────────────────────────────────────

const LEVEL_CONFIG: Record<
  ReferralLevel,
  { nameAr: string; emoji: string; color: string; bgColor: string; minPoints: number }
> = {
  bronze: {
    nameAr: "برونزي",
    emoji: "🥉",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    minPoints: 0,
  },
  silver: {
    nameAr: "فضي",
    emoji: "🥈",
    color: "text-slate-500",
    bgColor: "bg-slate-50",
    minPoints: 100,
  },
  gold: {
    nameAr: "ذهبي",
    emoji: "🥇",
    color: "text-brand-gold",
    bgColor: "bg-brand-gold-light",
    minPoints: 500,
  },
  ambassador: {
    nameAr: "سفير مكسب",
    emoji: "👑",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    minPoints: 1000,
  },
};

export default function ReferralDashboard() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [totalPoints, setTotalPoints] = useState(0);
  const [level, setLevel] = useState<ReferralLevel>("bronze");
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    getReferralProfile(user.id).then((profile) => {
      if (profile) {
        setCode(profile.code);
        setTotalPoints(profile.totalPoints);
        setLevel(profile.level);
        setReferralCount(profile.referralCount);
      }
      setIsLoading(false);
    });
  }, [user?.id]);

  const referralLink = code ? getReferralLink(code) : "";
  const levelConfig = LEVEL_CONFIG[level];

  // Calculate progress to next level
  const levelOrder: ReferralLevel[] = ["bronze", "silver", "gold", "ambassador"];
  const currentIdx = levelOrder.indexOf(level);
  const nextLevel = currentIdx < levelOrder.length - 1 ? levelOrder[currentIdx + 1] : null;
  const nextLevelConfig = nextLevel ? LEVEL_CONFIG[nextLevel] : null;
  const progressPercent = nextLevelConfig
    ? Math.min(
        100,
        Math.round(
          ((totalPoints - levelConfig.minPoints) /
            (nextLevelConfig.minPoints - levelConfig.minPoints)) *
            100,
        ),
      )
    : 100;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("تم نسخ رابط الدعوة");
      trackReferralShare("copy", code);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("مش قادر ينسخ — جرب تاني");
    }
  };

  const handleShareWhatsApp = () => {
    const text = `انضم لمكسب — أكبر سوق مصري لبيع وشراء وتبديل كل حاجة 💚\n\nسجّل من الرابط ده واكسب نقاط ومكافآت:\n${referralLink}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
    trackReferralShare("whatsapp", code);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-gray-light rounded-2xl" />
        <div className="h-20 bg-gray-light rounded-2xl" />
        <div className="h-24 bg-gray-light rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-gray-light rounded-2xl p-6 text-center">
        <Gift size={40} className="mx-auto text-gray-400 mb-3" />
        <p className="text-sm text-gray-text">سجّل دخول عشان تشوف برنامج الدعوات</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Level & Points Card */}
      <div className={`${levelConfig.bgColor} rounded-2xl p-5 space-y-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{levelConfig.emoji}</div>
            <div>
              <p className={`text-lg font-bold ${levelConfig.color}`}>
                {levelConfig.nameAr}
              </p>
              <p className="text-xs text-gray-text">المستوى الحالي</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-2xl font-bold text-dark">{totalPoints}</p>
            <p className="text-xs text-gray-text">نقطة</p>
          </div>
        </div>

        {/* Progress bar */}
        {nextLevelConfig && (
          <div>
            <div className="flex items-center justify-between text-xs text-gray-text mb-1.5">
              <span>{levelConfig.nameAr}</span>
              <span>{nextLevelConfig.minPoints - totalPoints} نقطة للمستوى التالي</span>
              <span>{LEVEL_CONFIG[nextLevel!].nameAr}</span>
            </div>
            <div className="h-2.5 bg-white/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-green rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-light rounded-xl p-3 text-center">
          <Users size={20} className="mx-auto text-brand-green mb-1" />
          <p className="text-lg font-bold text-dark">{referralCount}</p>
          <p className="text-[10px] text-gray-text">دعوات ناجحة</p>
        </div>
        <div className="bg-gray-light rounded-xl p-3 text-center">
          <TrendingUp size={20} className="mx-auto text-brand-gold mb-1" />
          <p className="text-lg font-bold text-dark">{totalPoints}</p>
          <p className="text-[10px] text-gray-text">إجمالي النقاط</p>
        </div>
        <div className="bg-gray-light rounded-xl p-3 text-center">
          <Trophy size={20} className="mx-auto text-purple-500 mb-1" />
          <p className="text-lg font-bold text-dark">{levelConfig.emoji}</p>
          <p className="text-[10px] text-gray-text">{levelConfig.nameAr}</p>
        </div>
      </div>

      {/* Referral Link */}
      <div className="bg-brand-green-light border border-brand-green/20 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Gift size={20} className="text-brand-green" />
          <h3 className="text-sm font-bold text-dark">رابط الدعوة بتاعك</h3>
        </div>

        <div
          className="bg-white rounded-xl p-3 flex items-center justify-between gap-2 border border-gray-200"
          dir="ltr"
        >
          <span className="text-xs text-gray-text truncate flex-1">
            {referralLink}
          </span>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1 px-3 py-1.5 bg-brand-green text-white rounded-lg text-xs font-bold hover:bg-brand-green-dark transition-colors flex-shrink-0"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "تم!" : "نسخ"}
          </button>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleShareWhatsApp}
            className="flex items-center justify-center gap-2 h-11 rounded-xl bg-[#25D366] text-white text-sm font-bold hover:bg-[#20BD5A] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            شارك عبر واتساب
          </button>
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 h-11 rounded-xl bg-gray-light text-dark text-sm font-bold hover:bg-gray-200 transition-colors"
          >
            <Copy size={16} />
            نسخ الرابط
          </button>
        </div>
      </div>

      {/* Points Guide */}
      <div className="bg-gray-light rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-dark flex items-center gap-2">
          <Star size={16} className="text-brand-gold" />
          ازاي تكسب نقاط
        </h3>
        <div className="space-y-2">
          {[
            { action: "صاحبك سجّل بدعوتك", points: 10, emoji: "🤝" },
            { action: "صاحبك نشر أول إعلان", points: 25, emoji: "📝" },
            { action: "صاحبك باع أول حاجة", points: 50, emoji: "💰" },
          ].map((item) => (
            <div
              key={item.action}
              className="flex items-center justify-between bg-white rounded-xl p-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{item.emoji}</span>
                <span className="text-xs text-dark">{item.action}</span>
              </div>
              <span className="text-xs font-bold text-brand-green">
                +{item.points} نقطة
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Levels Guide */}
      <div className="bg-gray-light rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-dark flex items-center gap-2">
          <Crown size={16} className="text-purple-500" />
          المستويات
        </h3>
        <div className="space-y-2">
          {levelOrder.map((lvl) => {
            const config = LEVEL_CONFIG[lvl];
            const isCurrent = lvl === level;
            return (
              <div
                key={lvl}
                className={`flex items-center justify-between rounded-xl p-3 ${
                  isCurrent
                    ? `${config.bgColor} border-2 border-brand-green/30`
                    : "bg-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{config.emoji}</span>
                  <div>
                    <span className={`text-xs font-bold ${isCurrent ? config.color : "text-dark"}`}>
                      {config.nameAr}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] text-brand-green mr-1">
                        (أنت هنا)
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-gray-text">
                  {config.minPoints}+ نقطة
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
