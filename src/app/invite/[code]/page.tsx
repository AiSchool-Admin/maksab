"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Gift, ChevronLeft, Users, Loader2 } from "lucide-react";
import Link from "next/link";
import MaksabLogo from "@/components/ui/MaksabLogo";
import { storeReferralCode, trackReferralEvent } from "@/lib/referral";
import { ga4Event } from "@/lib/analytics/ga4";

export default function InviteCodePage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string) || "";
  const [tracked, setTracked] = useState(false);

  useEffect(() => {
    if (!code || tracked) return;

    // Store the referral code for attribution on signup
    storeReferralCode(code);

    // Track the click
    trackReferralEvent(code, "click").then(() => setTracked(true));

    // GA4
    ga4Event("referral_link_click", { referral_code: code });
  }, [code, tracked]);

  return (
    <main
      className="min-h-screen bg-gradient-to-b from-[#0A1628] via-[#0F2035] to-[#1A1A2E] flex flex-col"
      dir="rtl"
    >
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0A1628]/90 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
          <MaksabLogo size="sm" variant="full" />
          <Link
            href="/"
            className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1 transition-colors"
          >
            الرئيسية
            <ChevronLeft size={14} />
          </Link>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-lg mx-auto w-full space-y-8">
        {/* Invite Icon */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-green/20 to-brand-gold/20 border-2 border-brand-green/30 flex items-center justify-center">
          <Gift size={40} className="text-brand-green" />
        </div>

        {/* Heading */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-white">
            صاحبك دعاك على{" "}
            <span className="text-brand-green">مكسب</span>!
          </h1>
          <p className="text-sm text-white/60 leading-relaxed max-w-xs mx-auto">
            انضم لأكبر سوق مصري لبيع وشراء وتبديل كل حاجة — مجاناً بالكامل
          </p>
        </div>

        {/* Benefits */}
        <div className="w-full space-y-2">
          {[
            { icon: "💰", text: "بيع واشتري بأحسن الأسعار" },
            { icon: "🔨", text: "مزادات حقيقية — بيع بأعلى سعر" },
            { icon: "🔄", text: "بدّل حاجتك بحاجة تانية" },
            { icon: "🎁", text: "اكسب نقاط ومكافآت" },
          ].map((benefit) => (
            <div
              key={benefit.text}
              className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/5"
            >
              <span className="text-xl">{benefit.icon}</span>
              <span className="text-sm text-white/80">{benefit.text}</span>
            </div>
          ))}
        </div>

        {/* Referral Code Badge */}
        <div className="bg-brand-green/10 border border-brand-green/20 rounded-xl p-4 text-center w-full">
          <p className="text-xs text-white/50 mb-1">كود الدعوة</p>
          <p className="text-lg font-bold text-brand-green tracking-wider" dir="ltr">
            {code}
          </p>
          <p className="text-xs text-white/40 mt-1">
            هيتفعّل تلقائياً لما تسجّل
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="w-full space-y-3">
          <button
            onClick={() => router.push("/")}
            className="w-full h-13 bg-gradient-to-l from-brand-green to-emerald-600 text-white font-bold rounded-xl hover:from-brand-green-dark hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-green/20"
            style={{ height: "52px" }}
          >
            <Users size={18} />
            ابدأ دلوقتي — مجاناً
          </button>

          <Link
            href="/invite"
            className="block w-full text-center h-11 leading-[44px] rounded-xl bg-white/5 text-white/70 text-sm font-semibold hover:bg-white/10 transition-colors border border-white/10"
          >
            سجّل كمؤسس مكسب
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6">
        <p className="text-xs text-white/30">
          مكسب — <strong className="text-brand-green">كل صفقة مكسب</strong> 💚
        </p>
      </div>
    </main>
  );
}
