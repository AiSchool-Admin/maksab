/**
 * Maksab Outreach Templates — قوالب رسائل التواصل
 *
 * Templates for WhatsApp outreach to potential sellers and buyers.
 * Used by the outreach tracking system to generate personalized messages.
 *
 * Usage:
 *   import { generateMessage } from './outreach-templates';
 *   const msg = generateMessage('seller_invite_v1', { name: 'محمد', source: 'OLX' });
 */

// ── Types ────────────────────────────────────────────

export interface TemplateVars {
  name?: string;
  source?: string;
  category?: string;
  categoryAr?: string;
  seller_count?: number;
  buyer_count?: number;
  app_url?: string;
  ref_code?: string;
  store_price?: number;
  item?: string;
  query?: string;
  min_price?: string;
  count?: number;
}

export interface Template {
  id: string;
  name: string;
  nameAr: string;
  target: "seller" | "buyer";
  tier: "platinum" | "gold" | "silver" | "all";
  description: string;
  generate: (vars: TemplateVars) => string;
}

// ── Helper ───────────────────────────────────────────

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://maksab.app";

function buildLink(
  path: string,
  refCode?: string,
  utmSource = "outreach",
  utmMedium = "whatsapp",
  utmCampaign = "seller_invite"
): string {
  const url = new URL(path, APP_URL);
  if (refCode) url.searchParams.set("ref", refCode);
  url.searchParams.set("utm_source", utmSource);
  url.searchParams.set("utm_medium", utmMedium);
  url.searchParams.set("utm_campaign", utmCampaign);
  return url.toString();
}

// ── Category Labels ──────────────────────────────────

const categoryLabels: Record<string, string> = {
  cars: "سيارات",
  real_estate: "عقارات",
  phones: "موبايلات",
  fashion: "موضة",
  scrap: "خردة",
  gold_silver: "ذهب وفضة",
  luxury: "سلع فاخرة",
  home_appliances: "أجهزة منزلية",
  furniture: "أثاث",
  hobbies: "هوايات",
  tools: "عدد وأدوات",
  services: "خدمات",
};

function getCategoryLabel(category?: string): string {
  if (!category) return "";
  return categoryLabels[category] || category;
}

// ── Templates ────────────────────────────────────────

export const templates: Template[] = [
  // ──────────────────────────────────────────────────
  // Seller Templates
  // ──────────────────────────────────────────────────

  {
    id: "seller_invite_v1",
    name: "Seller First Invite",
    nameAr: "دعوة بائع — أول رسالة",
    target: "seller",
    tier: "all",
    description: "Initial outreach to discovered sellers",
    generate: (vars) => {
      const name = vars.name || "أخي الكريم";
      const source = vars.source || "السوق";
      const link = buildLink("/", vars.ref_code);

      return `السلام عليكم يا ${name} 👋

أنا من فريق *مكسب* — سوق إلكتروني مصري جديد.
شايفين إعلاناتك على ${source} وعاجبنا جودتها 💚

عايزين ندعوك تكون من أوائل البائعين على مكسب:
✅ مجاني تماماً — صفر عمولات
✅ شارة "مؤسس" حصرية (أول 500 بائع بس)
✅ أولوية في نتائج البحث
✅ أدوات بيع متقدمة (مزاد + تبديل + متجر)

جرّب انشر أول إعلان من هنا:
${link}

أي سؤال أنا موجود 🙌`;
    },
  },

  {
    id: "seller_followup_v1",
    name: "Seller Follow-up (Day 3)",
    nameAr: "متابعة بائع — بعد 3 أيام",
    target: "seller",
    tier: "all",
    description: "Follow-up message after 3 days of no response",
    generate: (vars) => {
      const name = vars.name || "أخي";
      const sellerCount = vars.seller_count || 100;
      const buyerCount = vars.buyer_count || 1000;
      const categoryAr = getCategoryLabel(vars.category) || "اللي بتعلن فيه";

      return `أهلاً ${name} 👋

بعتنالك رسالة قبل كده عن مكسب.
حبينا نعرف لو عندك أي أسئلة؟

حالياً عندنا ${sellerCount} بائع و${buyerCount} مشتري
في قسم ${categoryAr}.

لو محتاج مساعدة في إنشاء إعلانك — ابعتلنا بيانات الإعلان وأحنا هننشره ليك 🚀

مكسب — كل صفقة مكسب 💚`;
    },
  },

  {
    id: "seller_platinum_offer",
    name: "Platinum Seller Store Offer",
    nameAr: "عرض متجر مجاني — بائع بلاتينيوم",
    target: "seller",
    tier: "platinum",
    description: "Special free store offer for platinum-tier sellers",
    generate: (vars) => {
      const name = vars.name || "أخي";
      const storePrice = vars.store_price || 299;
      const link = buildLink(
        "/store/create",
        vars.ref_code,
        "outreach",
        "whatsapp",
        "platinum_store"
      );

      return `أهلاً ${name}! 🌟

عندنا عرض حصري ليك:
🏪 *متجر مجاني على مكسب لمدة 3 شهور*
  (عادةً الاشتراك ${storePrice} جنيه/شهر)

المتجر يشمل:
• صفحة خاصة بيك باسمك ولوجوك
• عرض كل إعلاناتك في مكان واحد
• تحليلات وإحصائيات المبيعات
• شارة "متجر موثوق" ✅

سجّل من هنا:
${link}

العرض لأول 50 بائع بس!`;
    },
  },

  {
    id: "seller_gold_invite",
    name: "Gold Seller Special Invite",
    nameAr: "دعوة خاصة — بائع ذهبي",
    target: "seller",
    tier: "gold",
    description: "Personalized invite for gold-tier sellers with category focus",
    generate: (vars) => {
      const name = vars.name || "أخي";
      const categoryAr = getCategoryLabel(vars.category) || "المنتجات";
      const link = buildLink("/ad/create", vars.ref_code);

      return `السلام عليكم يا ${name} 💚

لاحظنا إنك متخصص في قسم *${categoryAr}* وعندك تجربة ممتازة.

مكسب سوق إلكتروني مصري بيقدملك:
🎯 مشترين مستهدفين لقسم ${categoryAr}
📊 إحصائيات تفصيلية لإعلاناتك
🔨 نظام مزادات — ابيع بأعلى سعر
🔄 نظام تبديل — لو عايز تبدل بدل ما تبيع
💰 0% عمولة — مجاني بالكامل

جرّب انشر أول إعلان:
${link}

وأحنا هنتأكد إنه يوصل لأكبر عدد مشترين 🚀`;
    },
  },

  {
    id: "seller_bulk_help",
    name: "Bulk Upload Help",
    nameAr: "عرض مساعدة نشر إعلانات",
    target: "seller",
    tier: "all",
    description:
      "Offer to upload ads on behalf of the seller",
    generate: (vars) => {
      const name = vars.name || "أخي";

      return `أهلاً ${name} 👋

لو مش فاضي تنشر إعلاناتك على مكسب — مفيش مشكلة!

ابعتلي:
📸 صور المنتج
📝 تفاصيل (النوع، الحالة، السعر)
📍 الموقع

وأنا هنشرهملك في أقل من 5 دقائق ✅
بعد كده تقدر تدير كل حاجة من حسابك.

ابدأ دلوقتي 💚`;
    },
  },

  // ──────────────────────────────────────────────────
  // Buyer Templates
  // ──────────────────────────────────────────────────

  {
    id: "buyer_search_v1",
    name: "Buyer Search Interest",
    nameAr: "دعوة مشتري — بناءً على بحث",
    target: "buyer",
    tier: "all",
    description: "Invite buyer based on their known search interest",
    generate: (vars) => {
      const item = vars.item || "المنتج";
      const count = vars.count || 50;
      const minPrice = vars.min_price || "أسعار مميزة";
      const link = buildLink(
        `/search?q=${encodeURIComponent(vars.query || item)}`,
        vars.ref_code,
        "outreach",
        "whatsapp",
        "buyer_invite"
      );

      return `عايز *${item}*؟ 🔍

لقينا ${count} إعلان على مكسب بأسعار أحسن من السوق!

💰 أسعار تبدأ من ${minPrice}
🔨 مزادات — ممكن تلاقي أرخص
🔄 تبديل — لو عندك حاجة قديمة

شوف العروض:
${link}

مكسب — كل صفقة مكسب 💚`;
    },
  },

  {
    id: "buyer_auction_alert",
    name: "Buyer Auction Alert",
    nameAr: "تنبيه مزاد للمشتري",
    target: "buyer",
    tier: "all",
    description: "Alert buyer about an active auction matching their interest",
    generate: (vars) => {
      const item = vars.item || "المنتج";
      const minPrice = vars.min_price || "";
      const link = buildLink(
        "/auctions",
        vars.ref_code,
        "outreach",
        "whatsapp",
        "auction_alert"
      );

      return `🔨 مزاد على *${item}* بيبدأ دلوقتي!

${minPrice ? `سعر الافتتاح: ${minPrice} جنيه` : ""}

ممكن تاخده بأقل من سعر السوق لو كنت أول المزايدين 💰

ادخل المزاد من هنا:
${link}

⏰ المزاد لفترة محدودة!`;
    },
  },
];

// ── Generator Function ───────────────────────────────

export function generateMessage(
  templateId: string,
  vars: TemplateVars
): string | null {
  const template = templates.find((t) => t.id === templateId);
  if (!template) return null;
  return template.generate({ ...vars, app_url: APP_URL });
}

export function getTemplatesForTier(
  target: "seller" | "buyer",
  tier: string
): Template[] {
  return templates.filter(
    (t) => t.target === target && (t.tier === "all" || t.tier === tier)
  );
}

export function listTemplates(): void {
  console.log(`\n💚 مكسب — قوالب رسائل التواصل\n`);
  console.log(
    `${"ID".padEnd(25)} ${"النوع".padEnd(8)} ${"التصنيف".padEnd(10)} الوصف`
  );
  console.log(`${"─".repeat(80)}`);

  for (const t of templates) {
    console.log(
      `${t.id.padEnd(25)} ${t.target.padEnd(8)} ${t.tier.padEnd(10)} ${t.nameAr}`
    );
  }
}

// If run directly, show templates list
if (require.main === module) {
  listTemplates();

  // Show sample message
  console.log(`\n── مثال على رسالة ──────────────────\n`);
  const sample = generateMessage("seller_invite_v1", {
    name: "محمد أحمد",
    source: "OLX",
    ref_code: "MKS-1234ABCD",
  });
  console.log(sample);
}
