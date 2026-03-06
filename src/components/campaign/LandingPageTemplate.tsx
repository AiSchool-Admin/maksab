"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
} from "lucide-react";
import MaksabLogo from "@/components/ui/MaksabLogo";
import { ga4Event } from "@/lib/analytics/ga4";
import { fbViewContent } from "@/lib/meta-pixel";

// ── Types ──────────────────────────────────────────────

export interface LandingBenefit {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export interface LandingStep {
  number: number;
  title: string;
  description: string;
}

export interface LandingStat {
  value: string;
  label: string;
}

export interface LandingTestimonial {
  name: string;
  text: string;
  role?: string;
}

export interface LandingPageConfig {
  slug: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;
  heroCtaLink: string;
  heroEmoji?: string;
  benefits: LandingBenefit[];
  steps: LandingStep[];
  stats: LandingStat[];
  testimonials?: LandingTestimonial[];
  finalCta: string;
  finalCtaLink: string;
  accentColor?: string; // Tailwind color key
}

// ── Accent Color Mapping ─────────────────────────────────
// Tailwind purges dynamic class names at build time,
// so we map accent keys to full static class names.

interface AccentClasses {
  text: string;
  bg: string;
  bgLight: string;
  border: string;
}

const ACCENT_CLASSES: Record<string, AccentClasses> = {
  "brand-green": {
    text: "text-brand-green",
    bg: "bg-brand-green",
    bgLight: "bg-brand-green-light",
    border: "border-brand-green/10",
  },
  "brand-gold": {
    text: "text-brand-gold",
    bg: "bg-brand-gold",
    bgLight: "bg-brand-gold-light",
    border: "border-brand-gold/10",
  },
  "brand-orange": {
    text: "text-brand-orange",
    bg: "bg-brand-orange",
    bgLight: "bg-brand-orange-light",
    border: "border-brand-orange/10",
  },
};

// ── Component ──────────────────────────────────────────

export default function LandingPageTemplate({
  config,
}: {
  config: LandingPageConfig;
}) {
  useEffect(() => {
    ga4Event("landing_page_view", { campaign: config.slug });
    fbViewContent(config.slug, "campaign", 0);
  }, [config.slug]);

  const a = ACCENT_CLASSES[config.accentColor || "brand-green"] || ACCENT_CLASSES["brand-green"];

  return (
    <main className="min-h-screen bg-white" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-light">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 h-14">
          <Link href="/">
            <MaksabLogo size="sm" variant="full" />
          </Link>
          <Link
            href={config.heroCtaLink}
            className={`text-xs font-bold ${a.text} hover:underline flex items-center gap-1`}
          >
            {config.heroCta}
            <ArrowLeft size={14} />
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4">
        {/* Hero Section */}
        <section className="py-12 text-center space-y-5">
          {config.heroEmoji && (
            <div className="text-6xl">{config.heroEmoji}</div>
          )}
          <h1 className="text-4xl font-bold text-dark leading-tight">
            {config.heroTitle}
          </h1>
          <p className="text-base text-gray-text max-w-md mx-auto leading-relaxed">
            {config.heroSubtitle}
          </p>
          <Link
            href={config.heroCtaLink}
            className={`inline-flex items-center gap-2 px-8 py-4 ${a.bg} text-white font-bold rounded-xl text-base hover:opacity-90 transition-opacity shadow-lg`}
          >
            {config.heroCta}
            <ArrowLeft size={18} />
          </Link>
        </section>

        {/* Benefits */}
        <section className="py-10 space-y-6">
          <h2 className="text-2xl font-bold text-dark text-center">
            ليه تختار مكسب؟
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {config.benefits.map((benefit, i) => (
              <div
                key={i}
                className="bg-gray-light rounded-2xl p-5 space-y-2"
              >
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl">
                  {benefit.icon}
                </div>
                <h3 className="text-sm font-bold text-dark">{benefit.title}</h3>
                <p className="text-xs text-gray-text leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="py-10 space-y-6">
          <h2 className="text-2xl font-bold text-dark text-center">
            ازاي تبدأ؟
          </h2>
          <div className="space-y-4">
            {config.steps.map((step) => (
              <div
                key={step.number}
                className="flex items-start gap-4"
              >
                <div className={`w-10 h-10 rounded-full ${a.bgLight} flex items-center justify-center flex-shrink-0`}>
                  <span className={`text-lg font-bold ${a.text}`}>
                    {step.number}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-dark">{step.title}</h3>
                  <p className="text-xs text-gray-text mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Stats / Social Proof */}
        <section className="py-10">
          <div className={`${a.bgLight} border ${a.border} rounded-2xl p-6`}>
            <div className="grid grid-cols-3 gap-4 text-center">
              {config.stats.map((stat, i) => (
                <div key={i}>
                  <p className={`text-2xl font-bold ${a.text}`}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-text mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        {config.testimonials && config.testimonials.length > 0 && (
          <section className="py-10 space-y-6">
            <h2 className="text-2xl font-bold text-dark text-center">
              المستخدمين بيقولوا إيه؟
            </h2>
            <div className="space-y-3">
              {config.testimonials.map((t, i) => (
                <div
                  key={i}
                  className="bg-gray-light rounded-2xl p-4 space-y-2"
                >
                  <p className="text-sm text-dark leading-relaxed">
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-green-light flex items-center justify-center text-xs">
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-dark">{t.name}</p>
                      {t.role && (
                        <p className="text-[10px] text-gray-text">{t.role}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section className="py-12 text-center space-y-5 border-t border-gray-light">
          <h2 className="text-2xl font-bold text-dark">
            جاهز تبدأ؟
          </h2>
          <Link
            href={config.finalCtaLink}
            className={`inline-flex items-center gap-2 px-10 py-4 ${a.bg} text-white font-bold rounded-xl text-lg hover:opacity-90 transition-opacity shadow-lg`}
          >
            {config.finalCta}
            <ArrowLeft size={20} />
          </Link>
          <p className="text-xs text-gray-text">
            مجاناً بالكامل — بدون رسوم أو عمولات إجبارية
          </p>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-gray-light py-6 text-center space-y-2">
        <p className="text-xs text-gray-text">
          مكسب — <strong className="text-brand-green">كل صفقة مكسب</strong> 💚
        </p>
        <div className="flex items-center justify-center gap-3 text-[11px] text-gray-text">
          <Link href="/terms" className="hover:text-dark transition-colors">شروط الاستخدام</Link>
          <span>|</span>
          <Link href="/privacy" className="hover:text-dark transition-colors">سياسة الخصوصية</Link>
        </div>
      </footer>
    </main>
  );
}
