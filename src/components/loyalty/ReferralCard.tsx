/**
 * Referral invite card — allows users to share their referral link/code.
 * Shows referral count and rewards info.
 */

"use client";

import { useState } from "react";
import { Copy, Check, Share2, Users, Gift } from "lucide-react";
import { getReferralLink } from "@/lib/loyalty/loyalty-service";
import { POINT_ACTIONS } from "@/lib/loyalty/types";
import Button from "@/components/ui/Button";

interface ReferralCardProps {
  referralCode: string;
  referralCount: number;
}

export default function ReferralCard({ referralCode, referralCount }: ReferralCardProps) {
  const [copied, setCopied] = useState(false);
  const referralLink = getReferralLink(referralCode);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: copy code only
      try {
        await navigator.clipboard.writeText(referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Ignore
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "انضم لمكسب!",
          text: `سجّل في مكسب واكسب ${POINT_ACTIONS.referral_signup.points} نقطة! استخدم كود الدعوة: ${referralCode}`,
          url: referralLink,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="bg-gradient-to-bl from-brand-green-light to-emerald-50 border border-brand-green/20 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0">
          <Gift size={22} className="text-brand-green" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-dark">ادعي أصحابك واكسب نقاط!</h3>
          <p className="text-xs text-gray-text">
            {POINT_ACTIONS.referral_signup.points} نقطة لما صاحبك يسجّل
            + {POINT_ACTIONS.referral_first_ad.points} لما ينشر أول إعلان
          </p>
        </div>
      </div>

      {/* Referral code display */}
      <div className="bg-white rounded-xl p-3 space-y-2">
        <p className="text-[10px] text-gray-text">كود الدعوة بتاعك</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-light rounded-lg px-3 py-2.5 text-center">
            <span className="text-lg font-bold text-dark tracking-wider" dir="ltr">
              {referralCode}
            </span>
          </div>
          <button
            onClick={handleCopy}
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
          <p className="text-[11px] text-brand-green text-center">تم نسخ الرابط!</p>
        )}
      </div>

      {/* Share button */}
      <Button
        fullWidth
        onClick={handleShare}
        icon={<Share2 size={16} />}
      >
        شارك رابط الدعوة
      </Button>

      {/* Referral stats */}
      {referralCount > 0 && (
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2">
          <Users size={16} className="text-brand-green flex-shrink-0" />
          <p className="text-xs text-dark">
            <span className="font-bold">{referralCount}</span> صديق سجّل بدعوتك
          </p>
        </div>
      )}
    </div>
  );
}
