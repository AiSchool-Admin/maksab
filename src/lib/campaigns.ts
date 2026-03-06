/**
 * Campaign Landing Pages Configuration — مكسب
 *
 * Pre-configured landing pages for different marketing campaigns.
 */

import type { LandingPageConfig } from "@/components/campaign/LandingPageTemplate";

export const CAMPAIGNS: Record<string, LandingPageConfig> = {
  cars: {
    slug: "cars",
    heroTitle: "عربيتك على مكسب",
    heroSubtitle:
      "بيع عربيتك بأعلى سعر أو اشتري عربية أحلامك — مزادات حقيقية وعروض كل يوم",
    heroCta: "اعرض عربيتك دلوقتي",
    heroCtaLink: "/ad/create",
    heroEmoji: "🚗",
    accentColor: "brand-green",
    benefits: [
      {
        icon: "🔨",
        title: "مزادات حقيقية",
        description: "بيع عربيتك بالمزاد واحصل على أعلى سعر — مش هتبيع بأقل من قيمتها",
      },
      {
        icon: "🤖",
        title: "تسعير بالذكاء الاصطناعي",
        description: "اعرف سعر عربيتك الحقيقي في السوق قبل ما تبيع",
      },
      {
        icon: "📸",
        title: "إعلان في 30 ثانية",
        description: "صوّر عربيتك وانشر — التطبيق بيكتب الإعلان تلقائياً",
      },
      {
        icon: "💚",
        title: "مجاني بالكامل",
        description: "بدون عمولات إجبارية — بيع واشتري ببلاش",
      },
    ],
    steps: [
      {
        number: 1,
        title: "صوّر عربيتك",
        description: "التقط صور واضحة — 5 صور كحد أقصى",
      },
      {
        number: 2,
        title: "اختار تفاصيل العربية",
        description: "الماركة والموديل والسنة — والسعر أو المزاد",
      },
      {
        number: 3,
        title: "انشر واستنى العروض",
        description: "المشترين هيتواصلوا معاك في الشات أو واتساب",
      },
    ],
    stats: [
      { value: "5,000+", label: "عربية معروضة" },
      { value: "50,000+", label: "مستخدم نشط" },
      { value: "1,200+", label: "صفقة ناجحة" },
    ],
    testimonials: [
      {
        name: "أحمد محمد",
        text: "بعت عربيتي بالمزاد وجبت فيها 15,000 جنيه أكتر من اللي كنت هبيعها بيه عادي",
        role: "باع تويوتا كورولا 2020",
      },
      {
        name: "محمد حسن",
        text: "واجهة سهلة ونظيفة — نشرت إعلان عربيتي في أقل من دقيقة",
        role: "باع هيونداي أكسنت 2019",
      },
    ],
    finalCta: "ابدأ بيع عربيتك",
    finalCtaLink: "/ad/create",
  },

  "price-scanner": {
    slug: "price-scanner",
    heroTitle: "كام سعره؟",
    heroSubtitle:
      "اعرف سعر أي حاجة بالذكاء الاصطناعي — عربيات، موبايلات، أجهزة، ذهب، وأكتر",
    heroCta: "جرّب دلوقتي — مجاناً",
    heroCtaLink: "/price-scanner",
    heroEmoji: "🤖",
    accentColor: "brand-gold",
    benefits: [
      {
        icon: "🧠",
        title: "ذكاء اصطناعي مصري",
        description: "متدرب على آلاف الأسعار في السوق المصري — دقة عالية",
      },
      {
        icon: "📊",
        title: "مقارنة أسعار فورية",
        description: "شوف سعر المنتج مقارنة بإعلانات مشابهة في مكسب",
      },
      {
        icon: "📱",
        title: "صوّر واعرف السعر",
        description: "صوّر أي منتج والـ AI هيقولك سعره المناسب",
      },
      {
        icon: "💰",
        title: "بيع بأحسن سعر",
        description: "اعرف القيمة الحقيقية قبل ما تبيع أو تشتري",
      },
    ],
    steps: [
      {
        number: 1,
        title: "اختار القسم",
        description: "سيارات، موبايلات، عقارات، ذهب — أي حاجة",
      },
      {
        number: 2,
        title: "ادخل التفاصيل أو صوّر",
        description: "اكتب الماركة والموديل أو صوّر المنتج مباشرة",
      },
      {
        number: 3,
        title: "اعرف السعر في ثواني",
        description: "الـ AI بيحلل السوق ويديك السعر المناسب",
      },
    ],
    stats: [
      { value: "100,000+", label: "تقدير سعر اتعمل" },
      { value: "12", label: "قسم متخصص" },
      { value: "95%", label: "دقة التسعير" },
    ],
    finalCta: "جرّب كام سعره",
    finalCtaLink: "/price-scanner",
  },

  referral: {
    slug: "referral",
    heroTitle: "ادعي صحابك واكسب",
    heroSubtitle:
      "شارك رابط الدعوة واكسب نقاط ومكافآت — كل صاحب يسجّل بدعوتك بياخدك خطوة لقدام",
    heroCta: "ابدأ الدعوة دلوقتي",
    heroCtaLink: "/rewards",
    heroEmoji: "🎁",
    accentColor: "brand-green",
    benefits: [
      {
        icon: "🤝",
        title: "200 نقطة لكل تسجيل",
        description: "صاحبك يسجّل بدعوتك — تكسب 200 نقطة فوراً",
      },
      {
        icon: "📝",
        title: "100 نقطة لأول إعلان",
        description: "لما صاحبك ينشر أول إعلان — 100 نقطة إضافية ليك",
      },
      {
        icon: "💰",
        title: "100 نقطة لأول بيعة",
        description: "صاحبك يبيع أول حاجة — تكسب 100 نقطة",
      },
      {
        icon: "👑",
        title: "مستويات ومكافآت",
        description: "اوصل لمستوى سفير مكسب واحصل على مميزات حصرية",
      },
    ],
    steps: [
      {
        number: 1,
        title: "انسخ رابط الدعوة",
        description: "من صفحة المكافآت — رابط فريد ليك",
      },
      {
        number: 2,
        title: "شارك مع صحابك",
        description: "واتساب، فيسبوك، أو أي تطبيق",
      },
      {
        number: 3,
        title: "اكسب نقاط ومكافآت",
        description: "كل ما صحابك يستخدموا مكسب أكتر — تكسب أكتر",
      },
    ],
    stats: [
      { value: "10,000+", label: "دعوة ناجحة" },
      { value: "85", label: "نقطة متوسط الأرباح" },
      { value: "4", label: "مستويات مكافآت" },
    ],
    testimonials: [
      {
        name: "سارة أحمد",
        text: "دعيت 5 صحاب وكسبت 250 نقطة — وصلت مستوى فضي!",
        role: "سفيرة مكسب",
      },
      {
        name: "عمر خالد",
        text: "أسهل طريقة تكسب فيها نقاط — شير الرابط وخلاص",
        role: "مستخدم ذهبي",
      },
    ],
    finalCta: "ابدأ الدعوة واكسب",
    finalCtaLink: "/rewards",
  },
};
