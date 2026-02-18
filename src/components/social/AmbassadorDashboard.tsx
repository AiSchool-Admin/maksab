/**
 * Ambassador Dashboard — full ambassador program dashboard.
 *
 * Sections:
 * 1. Current tier with animated progress bar
 * 2. Quick stats (total, active, points)
 * 3. Share section (referral code + share buttons)
 * 4. Pre-made share messages
 * 5. Recent referrals list
 * 6. Tier perks (current + locked)
 * 7. Leaderboard teaser
 */

"use client";

import { useState, useEffect, useRef } from "react";
import {
  Copy,
  Check,
  Users,
  UserCheck,
  Trophy,
  Share2,
  MessageCircle,
  Smartphone,
  ChevronLeft,
  Star,
  Lock,
  Zap,
} from "lucide-react";
import {
  type AmbassadorProfile,
  type AmbassadorTier,
  AMBASSADOR_TIERS,
  getAmbassadorProfile,
  generateShareMessages,
  getAmbassadorTierConfig,
} from "@/lib/social/ambassador-service";
import { formatTimeAgo } from "@/lib/utils/format";

interface AmbassadorDashboardProps {
  userId: string;
}

export default function AmbassadorDashboard({ userId }: AmbassadorDashboardProps) {
  const [profile, setProfile] = useState<AmbassadorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeMessageIdx, setActiveMessageIdx] = useState(0);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getAmbassadorProfile(userId)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (isLoading || !profile) {
    return <DashboardSkeleton />;
  }

  const shareMessages = generateShareMessages(profile.referralCode);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(profile.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        await navigator.clipboard.writeText(profile.referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // ignore
      }
    }
  };

  const handleCopyMessage = async (message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleWhatsAppShare = () => {
    const msg = shareMessages.find((m) => m.platform === "whatsapp");
    if (msg?.url) {
      window.open(msg.url, "_blank");
    }
  };

  const handleSMSShare = () => {
    const msg = shareMessages.find((m) => m.platform === "sms");
    if (msg?.url) {
      window.location.href = msg.url;
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "انضم لمكسب!",
          text: `سجّل في مكسب واستمتع بأسهل سوق في مصر! كود الدعوة: ${profile.referralCode}`,
          url: profile.referralLink,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyCode();
    }
  };

  // Scroll messages horizontally
  const scrollMessages = (direction: "next" | "prev") => {
    if (direction === "next" && activeMessageIdx < shareMessages.length - 1) {
      setActiveMessageIdx(activeMessageIdx + 1);
    } else if (direction === "prev" && activeMessageIdx > 0) {
      setActiveMessageIdx(activeMessageIdx - 1);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── 1. Current Tier ──────────────────────── */}
      <TierCard profile={profile} />

      {/* ── 2. Quick Stats ───────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<Users size={18} className="text-brand-green" />}
          value={profile.totalReferrals}
          label="إجمالي الدعوات"
        />
        <StatCard
          icon={<UserCheck size={18} className="text-blue-500" />}
          value={profile.activeReferrals}
          label="دعوات نشطة"
        />
        <StatCard
          icon={<Trophy size={18} className="text-brand-gold" />}
          value={profile.totalPointsFromReferrals}
          label="نقاط مكتسبة"
        />
      </div>

      {/* ── 3. Share Section ─────────────────────── */}
      <div className="bg-gradient-to-bl from-brand-green-light to-emerald-50 border border-brand-green/20 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0">
            <Share2 size={20} className="text-brand-green" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-dark">شارك رابط الدعوة</h3>
            <p className="text-[11px] text-gray-text">
              كل صديق يسجّل = {profile.tierConfig.rewardPerReferral} نقطة ليك
            </p>
          </div>
        </div>

        {/* Referral code */}
        <div className="bg-white rounded-xl p-3 space-y-2">
          <p className="text-[10px] text-gray-text">كود الدعوة بتاعك</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-light rounded-lg px-3 py-2.5 text-center">
              <span
                className="text-lg font-bold text-dark tracking-wider"
                dir="ltr"
              >
                {profile.referralCode}
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              className="p-2.5 rounded-xl bg-gray-light hover:bg-gray-200 transition-colors"
              aria-label="نسخ الكود"
            >
              {copied ? (
                <Check size={18} className="text-brand-green" />
              ) : (
                <Copy size={18} className="text-gray-text" />
              )}
            </button>
          </div>
          {copied && (
            <p className="text-[11px] text-brand-green text-center">
              تم نسخ الرابط!
            </p>
          )}
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleWhatsAppShare}
            className="flex flex-col items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white rounded-xl py-3 transition-colors"
          >
            <MessageCircle size={20} />
            <span className="text-[11px] font-bold">واتساب</span>
          </button>
          <button
            onClick={handleSMSShare}
            className="flex flex-col items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-3 transition-colors"
          >
            <Smartphone size={20} />
            <span className="text-[11px] font-bold">رسالة SMS</span>
          </button>
          <button
            onClick={handleNativeShare}
            className="flex flex-col items-center gap-1.5 bg-gray-700 hover:bg-gray-800 text-white rounded-xl py-3 transition-colors"
          >
            <Share2 size={20} />
            <span className="text-[11px] font-bold">مشاركة</span>
          </button>
        </div>
      </div>

      {/* ── 4. Pre-made Messages ─────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-dark">رسائل جاهزة للمشاركة</h3>
        <div className="relative">
          <div
            ref={messagesContainerRef}
            className="overflow-hidden"
          >
            <div
              className="transition-transform duration-300 ease-in-out"
              style={{
                transform: `translateX(${activeMessageIdx * 100}%)`,
              }}
            >
              {shareMessages.map((msg, idx) => (
                <div
                  key={msg.platform}
                  className={`${idx === activeMessageIdx ? "block" : "hidden"}`}
                >
                  <div className="bg-gray-light rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-text uppercase">
                        {msg.platform === "whatsapp"
                          ? "واتساب"
                          : msg.platform === "sms"
                            ? "رسالة SMS"
                            : "نسخ"}
                      </span>
                    </div>
                    <p className="text-xs text-dark leading-relaxed whitespace-pre-line">
                      {msg.message}
                    </p>
                    <button
                      onClick={() => {
                        if (msg.platform === "whatsapp" && msg.url) {
                          window.open(msg.url, "_blank");
                        } else if (msg.platform === "sms" && msg.url) {
                          window.location.href = msg.url;
                        } else {
                          handleCopyMessage(msg.message);
                        }
                      }}
                      className="w-full text-center text-xs font-bold text-brand-green bg-white rounded-lg py-2 hover:bg-brand-green-light transition-colors"
                    >
                      {msg.platform === "whatsapp"
                        ? "ابعت على واتساب"
                        : msg.platform === "sms"
                          ? "ابعت رسالة SMS"
                          : "انسخ الرسالة"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation dots */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <button
              onClick={() => scrollMessages("next")}
              disabled={activeMessageIdx >= shareMessages.length - 1}
              className="p-1 text-gray-text hover:text-dark disabled:opacity-30 transition-colors"
              aria-label="الرسالة السابقة"
            >
              <ChevronLeft size={16} />
            </button>
            {shareMessages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveMessageIdx(idx)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === activeMessageIdx
                    ? "bg-brand-green"
                    : "bg-gray-300"
                }`}
                aria-label={`رسالة ${idx + 1}`}
              />
            ))}
            <button
              onClick={() => scrollMessages("prev")}
              disabled={activeMessageIdx <= 0}
              className="p-1 text-gray-text hover:text-dark disabled:opacity-30 transition-colors rotate-180"
              aria-label="الرسالة التالية"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 5. Recent Referrals ──────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-dark">
          الدعوات الأخيرة
          {profile.monthlyReferrals > 0 && (
            <span className="text-[11px] text-gray-text font-normal me-2">
              ({profile.monthlyReferrals} هذا الشهر)
            </span>
          )}
        </h3>

        {profile.recentReferrals.length === 0 ? (
          <div className="text-center py-8 bg-gray-light rounded-xl">
            <p className="text-3xl mb-2">{"\u{1F91D}"}</p>
            <p className="text-sm text-gray-text">
              لسه مفيش دعوات. شارك كود الدعوة بتاعك!
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {profile.recentReferrals.map((ref) => (
              <ReferralRow key={ref.id} referral={ref} />
            ))}
          </div>
        )}
      </div>

      {/* ── 6. Tier Perks ────────────────────────── */}
      <TierPerksSection currentTier={profile.tier} />

      {/* ── 7. Leaderboard Teaser ────────────────── */}
      <div className="bg-gradient-to-bl from-brand-gold-light to-amber-50 border border-brand-gold/20 rounded-2xl p-5 text-center space-y-2">
        <p className="text-2xl">{"\u{1F3C6}"}</p>
        <h3 className="text-sm font-bold text-dark">سفراء مكسب</h3>
        <p className="text-xs text-gray-text">
          {profile.totalReferrals > 0
            ? `عندك ${profile.totalReferrals} دعوة ناجحة — كمّل عشان توصل لمراتب أعلى!`
            : "ابدأ ادعي أصحابك واتطلّع في ترتيب سفراء مكسب!"}
        </p>
        {profile.tier !== "none" && (
          <div className="inline-flex items-center gap-1.5 bg-white/80 rounded-full px-3 py-1.5">
            <Star size={14} className="text-brand-gold" />
            <span className="text-xs font-bold text-dark">
              أنت {profile.tierConfig.name} {profile.tierConfig.icon}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────

function TierCard({ profile }: { profile: AmbassadorProfile }) {
  const { tierConfig, nextTier, progressPercent, referralsToNextTier, totalReferrals } =
    profile;

  return (
    <div className={`${tierConfig.bgColor} rounded-2xl p-5 text-center space-y-3`}>
      {/* Tier icon & name */}
      <span className="text-5xl block">{tierConfig.icon}</span>
      <h2 className={`text-3xl font-bold ${tierConfig.color}`}>
        {tierConfig.name}
      </h2>
      <p className="text-sm text-dark">
        <span className="font-bold">{totalReferrals}</span> دعوة ناجحة
      </p>

      {/* Progress to next tier */}
      {nextTier && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className={`font-bold ${tierConfig.color}`}>
              {tierConfig.icon} {tierConfig.name}
            </span>
            <span className={`font-bold ${nextTier.color}`}>
              {nextTier.icon} {nextTier.name}
            </span>
          </div>
          <div className="h-3 bg-white/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-brand-green to-brand-gold rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-text">
            محتاج{" "}
            <span className="font-bold text-dark">{referralsToNextTier}</span>{" "}
            دعوة كمان للوصول لـ{nextTier.name} {nextTier.icon}
          </p>
        </div>
      )}

      {/* Max tier reached */}
      {!nextTier && profile.tier !== "none" && (
        <div className="flex items-center justify-center gap-1.5 pt-1">
          <Zap size={14} className={tierConfig.color} />
          <span className={`text-xs font-bold ${tierConfig.color}`}>
            وصلت لأعلى مستوى!
          </span>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-gray-light rounded-xl p-3 text-center space-y-1.5">
      <div className="flex justify-center">{icon}</div>
      <p className="text-lg font-bold text-dark">
        {value.toLocaleString("en-US")}
      </p>
      <p className="text-[10px] text-gray-text leading-tight">{label}</p>
    </div>
  );
}

function ReferralRow({ referral }: { referral: import("@/lib/social/ambassador-service").ReferralRecord }) {
  const statusConfig = {
    signed_up: {
      label: "سجّل حساب",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    posted_ad: {
      label: "نشر إعلان",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    active: {
      label: "مستخدم نشط",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  };

  const status = statusConfig[referral.status];

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-light rounded-xl">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {referral.referredUserAvatar ? (
          <img
            src={referral.referredUserAvatar}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <Users size={18} className="text-gray-400" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-dark truncate">
          {referral.referredUserName}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${status.bgColor} ${status.color}`}
          >
            {status.label}
          </span>
          <span className="text-[10px] text-gray-text">
            {formatTimeAgo(referral.createdAt)}
          </span>
        </div>
      </div>

      {/* Points earned */}
      <span className="text-xs font-bold text-brand-green flex-shrink-0">
        +{referral.pointsEarned}
      </span>
    </div>
  );
}

function TierPerksSection({ currentTier }: { currentTier: AmbassadorTier }) {
  const currentIdx = AMBASSADOR_TIERS.findIndex((t) => t.tier === currentTier);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-dark">مزايا السفراء</h3>

      {AMBASSADOR_TIERS.filter((t) => t.tier !== "none").map((tier, idx) => {
        const tierIdx = idx + 1; // offset because we filtered 'none'
        const isUnlocked = currentIdx >= tierIdx;
        const isCurrent = tier.tier === currentTier;

        return (
          <div
            key={tier.tier}
            className={`rounded-xl p-4 space-y-2 transition-colors ${
              isCurrent
                ? `${tier.bgColor} border-2 ${tier.color.replace("text-", "border-")}`
                : isUnlocked
                  ? `${tier.bgColor}`
                  : "bg-gray-50 opacity-70"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{tier.icon}</span>
              <span
                className={`text-xs font-bold ${isCurrent ? tier.color : isUnlocked ? "text-dark" : "text-gray-text"}`}
              >
                {tier.name}
              </span>
              <span className="text-[10px] text-gray-text">
                ({tier.minReferrals}+ دعوة)
              </span>
              {isCurrent && (
                <span
                  className={`text-[10px] font-bold ${tier.color} bg-white/80 px-1.5 py-0.5 rounded-full me-auto`}
                >
                  أنت هنا
                </span>
              )}
              {isUnlocked && !isCurrent && (
                <span className="text-[10px] text-brand-green me-auto">
                  {"\u2713"}
                </span>
              )}
            </div>

            <div className="space-y-1">
              {tier.perks.map((perk, perkIdx) => (
                <div
                  key={perkIdx}
                  className="flex items-center gap-2 text-xs"
                >
                  {isUnlocked ? (
                    <span className="text-brand-green flex-shrink-0">
                      {"\u2713"}
                    </span>
                  ) : (
                    <Lock
                      size={12}
                      className="text-gray-400 flex-shrink-0"
                    />
                  )}
                  <span
                    className={
                      isUnlocked ? "text-dark" : "text-gray-text"
                    }
                  >
                    {perk}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-48 bg-gray-light rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-24 bg-gray-light rounded-xl" />
        <div className="h-24 bg-gray-light rounded-xl" />
        <div className="h-24 bg-gray-light rounded-xl" />
      </div>
      <div className="h-56 bg-gray-light rounded-2xl" />
      <div className="h-32 bg-gray-light rounded-xl" />
      <div className="h-40 bg-gray-light rounded-xl" />
    </div>
  );
}
