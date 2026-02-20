/**
 * JSON-LD Structured Data generators — مكسب
 *
 * Generates Schema.org structured data for:
 * - WebSite (sitelinks search box)
 * - Organization
 * - BreadcrumbList
 * - FAQPage
 * - Product (already in ad/[id]/page.tsx)
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://maksab.app";
const SITE_NAME = "مكسب";
const SITE_DESCRIPTION =
  "سوق إلكتروني مصري لبيع وشراء وتبديل السلع الجديدة والمستعملة. بيع نقدي، مزادات، وتبديل.";

// ── WebSite Schema ─────────────────────────────────────

export function getWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: "Maksab",
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "ar",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// ── Organization Schema ────────────────────────────────

export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    alternateName: "Maksab",
    url: SITE_URL,
    logo: `${SITE_URL}/icons/icon-512x512.png`,
    description: SITE_DESCRIPTION,
    foundingDate: "2024",
    areaServed: {
      "@type": "Country",
      name: "Egypt",
    },
    sameAs: [],
  };
}

// ── Breadcrumb Schema ──────────────────────────────────

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function getBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Common breadcrumbs for ad detail pages.
 */
export function getAdBreadcrumb(ad: {
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
}) {
  return getBreadcrumbSchema([
    { name: "الرئيسية", url: SITE_URL },
    { name: ad.categoryName, url: `${SITE_URL}/search?category=${ad.categoryId}` },
    { name: ad.title, url: `${SITE_URL}/ad/${ad.id}` },
  ]);
}

// ── FAQ Schema ─────────────────────────────────────────

export interface FAQItem {
  question: string;
  answer: string;
}

export function getFAQSchema(items: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

/**
 * Default FAQ for the home/about page.
 */
export function getDefaultFAQ() {
  return getFAQSchema([
    {
      question: "إيه هو مكسب؟",
      answer:
        "مكسب هو سوق إلكتروني مصري لبيع وشراء وتبديل السلع الجديدة والمستعملة. يدعم البيع النقدي، المزادات، والتبديل.",
    },
    {
      question: "مكسب مجاني؟",
      answer:
        "أيوا، مكسب مجاني بالكامل. تقدر تنشر إعلانات وتتواصل مع البائعين بدون أي رسوم. العمولة اختيارية لدعم المنصة.",
    },
    {
      question: "إزاي أنشر إعلان على مكسب؟",
      answer:
        "سجّل برقم موبايلك، اضغط على زرار أضف إعلان، اختار القسم، أدخل التفاصيل والصور والسعر، وانشر. العملية كلها أقل من دقيقة.",
    },
    {
      question: "إيه أنواع البيع المتاحة؟",
      answer:
        "مكسب يدعم 3 أنواع: بيع نقدي (سعر ثابت)، مزاد (مزايدة لمدة 24 أو 48 أو 72 ساعة)، وتبديل (بدّل سلعتك بسلعة تانية).",
    },
    {
      question: "إزاي أتواصل مع البائع؟",
      answer:
        "من صفحة الإعلان تقدر تتواصل عبر الشات الداخلي، واتساب، أو الاتصال المباشر.",
    },
    {
      question: "هل مكسب آمن؟",
      answer:
        "كل المستخدمين بيتم التحقق من رقم موبايلهم. ننصح دايماً بالمعاينة قبل الشراء والتعامل وجهاً لوجه في مكان عام.",
    },
  ]);
}

// ── Helper to serialize JSON-LD safely ─────────────────

export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
