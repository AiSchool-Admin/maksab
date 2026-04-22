import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { isDubizzleTextDump, parseDubizzleTextDump } from "@/lib/crm/harvester/parsers/dubizzle-text-dump";
import ImageGallery from "@/components/browse/ImageGallery";

// Always render at request time — never serve stale DB snapshots from the CDN.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ACTIVE_CATEGORIES = ["cars", "vehicles", "properties", "real-estate", "real_estate", "سيارات", "عقارات"];

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const CATEGORY_NAMES: Record<string, string> = {
  phones: "موبايلات", vehicles: "سيارات", properties: "عقارات",
  electronics: "إلكترونيات", furniture: "أثاث", gold: "ذهب وفضة",
  appliances: "أجهزة منزلية", fashion: "موضة", general: "إعلانات",
};

const GOV_NAMES: Record<string, string> = {
  cairo: "القاهرة", giza: "الجيزة", alexandria: "الإسكندرية",
  dakahlia: "الدقهلية", sharqia: "الشرقية", qalyubia: "القليوبية",
  gharbia: "الغربية", monufia: "المنوفية", beheira: "البحيرة",
  minya: "المنيا", asyut: "أسيوط", sohag: "سوهاج",
  fayoum: "الفيوم", "port-said": "بورسعيد", ismailia: "الإسماعيلية",
  suez: "السويس", damietta: "دمياط", luxor: "الأقصر", aswan: "أسوان",
};

// Arabic labels for normalized spec keys (from enrichment CAR_SPEC_MAP / PROPERTY_SPEC_MAP)
const SPEC_LABELS: Record<string, { label: string; icon: string }> = {
  // Cars
  brand: { label: "الماركة", icon: "🏷️" },
  model: { label: "الموديل", icon: "🚗" },
  year: { label: "سنة الصنع", icon: "📅" },
  mileage: { label: "الكيلومترات", icon: "🛣️" },
  transmission: { label: "ناقل الحركة", icon: "⚙️" },
  fuel: { label: "نوع الوقود", icon: "⛽" },
  color: { label: "اللون", icon: "🎨" },
  engine_cc: { label: "سعة المحرك", icon: "🔧" },
  body_type: { label: "نوع الهيكل", icon: "🚙" },
  condition: { label: "الحالة", icon: "✨" },
  licensed: { label: "مرخصة", icon: "📋" },
  // Properties
  property_type: { label: "نوع العقار", icon: "🏠" },
  area: { label: "المساحة", icon: "📐" },
  rooms: { label: "عدد الغرف", icon: "🛏️" },
  bathrooms: { label: "عدد الحمامات", icon: "🚿" },
  floor: { label: "الدور", icon: "🏢" },
  finishing: { label: "التشطيب", icon: "🎨" },
  view: { label: "الإطلالة", icon: "🏞️" },
  payment_method: { label: "طريقة الدفع", icon: "💳" },
};

// Order in which to show specs (most important first)
const CAR_SPEC_ORDER = ["brand", "model", "year", "mileage", "transmission", "fuel", "engine_cc", "body_type", "color", "condition", "licensed"];
const PROPERTY_SPEC_ORDER = ["property_type", "area", "rooms", "bathrooms", "floor", "finishing", "view", "payment_method", "condition"];

// Arabic-keyed specs display order (for SemsarMasr/bookmarklet-extracted catalogs)
const ARABIC_PROPERTY_SPEC_ORDER = [
  "السعر", "سعر المتر", "الغرض", "القسم", "نوع العقار",
  "المساحة", "عدد الغرف", "عدد الحمامات", "رقم الدور", "الدور",
  "نوع التشطيب", "الفرش", "نوع الواجهة", "الإطلالة",
  "طبيعة المعلن", "طريقة الدفع", "المقدم", "حالة العقار",
  "تاريخ البناء",
];

// Specs we NEVER show — internal/noise from source platforms
const HIDDEN_SPEC_KEYS = new Set([
  "تاريخ الإعلان",
  "رقم الإعلان",
  "العنوان",
  "title",
]);

interface Props {
  params: Promise<{ category: string; governorate: string; slug: string }>;
}

function extractIdFromSlug(slug: string): string | null {
  const parts = slug.split("-");
  const lastPart = parts[parts.length - 1];
  if (lastPart && lastPart.length >= 20) return lastPart;
  const uuidMatch = slug.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (uuidMatch) return uuidMatch[1];
  return parts.pop() || null;
}

/**
 * Clean scraped description from page-dump artifacts (footer text, nav, ads).
 * Strategy:
 *   1. Strip leading breadcrumb if it starts with "الصفحة الرئيسية/..."
 *   2. Cut at first "stop phrase" (site nav / footer / related-ads heading)
 *   3. Collapse whitespace
 *   4. Drop the whole thing if it's just garbled page dump
 */
function cleanDescription(desc: string | null): string | null {
  if (!desc) return null;

  let clean = desc.trim();

  // Strip leading breadcrumb: "الصفحة الرئيسية/..." up to first newline or ~150 chars
  if (clean.startsWith("الصفحة الرئيسية")) {
    const firstBreak = clean.search(/[\n\r]|(?:ج\.م|جنيه)/); // break at newline or price marker
    if (firstBreak > 0 && firstBreak < 300) {
      clean = clean.substring(firstBreak).trim();
    }
  }

  const stopPhrases = [
    "dubizzle", "Dubizzle", "Free Classifieds",
    "سياسة الخصوصية", "شروط الاستخدام", "خريطة الموقع",
    "الإبلاغ عن هذا الإعلان", "عرض الموقع", "تحميل التطبيق",
    "خد حد معاك وانت رايح", "متدفعش او تحول فلوس",
    "الإعلانات ذات الصلة", "نبذة عنا",
    "OpenSooq", "السوق المفتوح", "تصنيفات",
    "سمسار مصر", "عقارات مصر", "أعلن مجاناً",
    "نصائح السلامة", "تنبيهات", "تابعنا على",
  ];

  // Cut at first stop phrase (but only if it appears after some real content)
  for (const phrase of stopPhrases) {
    const idx = clean.indexOf(phrase);
    if (idx > 20 && idx < clean.length * 0.85) {
      clean = clean.substring(0, idx).trim();
      break;
    }
  }

  // Collapse excessive whitespace
  clean = clean.replace(/\s{3,}/g, "\n\n").replace(/\n{3,}/g, "\n\n").trim();

  // If very long and low space ratio → likely garbled page dump
  if (clean.length > 250) {
    const spaceRatio = (clean.match(/\s/g) || []).length / clean.length;
    if (spaceRatio < 0.08) return null;
  }

  return clean.length > 10 ? clean : null;
}

/**
 * Format a spec value for display. Adds units, translates common English values.
 */
function formatSpecValue(key: string, value: string): string {
  const v = String(value).trim();
  if (!v) return v;

  // Common translations
  const translations: Record<string, string> = {
    Automatic: "أوتوماتيك", Manual: "مانوال", automatic: "أوتوماتيك", manual: "مانوال",
    Gasoline: "بنزين", Diesel: "سولار", Hybrid: "هايبرد", Electric: "كهرباء",
    Yes: "نعم", No: "لا", true: "نعم", false: "لا",
    New: "جديد", Used: "مستعمل", used: "مستعمل", new: "جديد",
  };
  if (translations[v]) return translations[v];

  // Add units for numeric fields
  if (key === "mileage" && /^\d+$/.test(v)) return `${Number(v).toLocaleString()} كم`;
  if (key === "area" && /^\d+$/.test(v)) return `${v} م²`;
  if (key === "engine_cc" && /^\d+$/.test(v)) return `${v} سي سي`;

  return v;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, governorate, slug } = await params;
  const id = extractIdFromSlug(slug);
  const catName = CATEGORY_NAMES[category] || category;
  const govName = GOV_NAMES[governorate] || governorate;

  if (!id) return { title: `${catName} في ${govName} | مكسب` };

  const supabase = getSupabase();
  const { data: listing } = await supabase
    .from("ahe_listings")
    .select("title, price, thumbnail_url")
    .eq("id", id)
    .single();

  const title = listing?.title ? `${listing.title} | مكسب` : `${catName} في ${govName} | مكسب`;
  const description = listing?.title
    ? `${listing.title} — ${listing.price ? listing.price.toLocaleString() + " جنيه" : ""} في ${govName}`
    : `تصفح ${catName} في ${govName} على مكسب.`;

  return {
    title, description,
    openGraph: {
      title, description, type: "website", siteName: "مكسب",
      images: listing?.thumbnail_url ? [{ url: `/api/img?url=${encodeURIComponent(listing.thumbnail_url)}` }] : undefined,
    },
  };
}

export default async function BrowseListingPage({ params }: Props) {
  const { category, governorate, slug } = await params;
  if (!ACTIVE_CATEGORIES.includes(category)) redirect("/");

  const id = extractIdFromSlug(slug);
  const catName = CATEGORY_NAMES[category] || category;
  const govName = GOV_NAMES[governorate] || governorate;

  if (!id) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <span className="text-5xl mb-4 block">🔍</span>
          <h1 className="text-xl font-bold mb-2">الإعلان غير موجود</h1>
          <Link href={`/browse/${category}/${governorate}`} className="text-[#1B7A3D] text-sm font-bold">
            ← تصفح {catName} في {govName}
          </Link>
        </div>
      </div>
    );
  }

  const supabase = getSupabase();
  const { data: listing } = await supabase
    .from("ahe_listings")
    .select("*")
    .eq("id", id)
    .single();

  if (!listing) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <span className="text-5xl mb-4 block">🔍</span>
          <h1 className="text-xl font-bold mb-2">الإعلان غير موجود</h1>
          <Link href={`/browse/${category}/${governorate}`} className="text-[#1B7A3D] text-sm font-bold">
            ← تصفح {catName} في {govName}
          </Link>
        </div>
      </div>
    );
  }

  // Fetch seller info
  let seller: {
    id: string;
    name: string | null;
    phone: string | null;
    source_platform: string | null;
    avatar_url: string | null;
    is_verified: boolean | null;
    is_business: boolean | null;
    first_seen_at: string | null;
  } | null = null;
  if (listing.ahe_seller_id) {
    const { data } = await supabase
      .from("ahe_sellers")
      .select("id, name, phone, source_platform, avatar_url, is_verified, is_business, first_seen_at")
      .eq("id", listing.ahe_seller_id)
      .single();
    seller = data;
  }

  // Sanitize seller name — reject garbage captured by old bookmarklet versions
  // (e.g. "انك تتصل به من خلال موقع سمسار مصر").
  function cleanSellerDisplayName(n: string | null | undefined): string | null {
    if (!n) return null;
    const s = String(n).trim();
    if (s.length < 2 || s.length > 50) return null;
    const JUNK = [
      "تتصل", "من خلال", "موقع سمسار", "موقع أقارماب", "موقع",
      "فضلاً", "فضلا", "أخبر", "اخبر", "تواصل", "اتصل الآن",
      "click here", "contact", "call now",
    ];
    for (const j of JUNK) if (s.includes(j)) return null;
    if (/^(سمسار|عقارات|مكتب|شركة|وكيل|مالك|معلن|البائع|المعلن|بيانات|تفاصيل)$/i.test(s)) return null;
    if (s.split(/\s+/).length > 4) return null; // sentences are not names
    return s;
  }

  const rawSellerName = seller?.name || listing.seller_name || null;
  const sellerName = cleanSellerDisplayName(rawSellerName);
  const sellerPhone = seller?.phone || listing.extracted_phone || null;
  const sellerIsVerified = seller?.is_verified || listing.seller_is_verified || false;
  const sellerIsBusiness = seller?.is_business || listing.seller_is_business || false;
  const sellerBadge: string | null = listing.seller_badge || null;
  const sellerMemberYear = seller?.first_seen_at ? new Date(seller.first_seen_at).getFullYear() : null;

  // Map raw "طبيعة المعلن" value to a colored badge config
  function sellerBadgeStyle(raw: string | null): { label: string; icon: string; classes: string } | null {
    if (!raw) return null;
    const v = raw.toLowerCase();
    if (/مطور|شركة|مكتب عقار/.test(v)) return { label: raw, icon: "🏢", classes: "bg-purple-100 text-purple-700" };
    if (/سمسار|وسيط|broker|agent/.test(v)) return { label: raw, icon: "🤝", classes: "bg-amber-100 text-amber-700" };
    if (/مالك|owner/.test(v)) return { label: raw, icon: "🏠", classes: "bg-emerald-100 text-emerald-700" };
    return { label: raw, icon: "👤", classes: "bg-gray-100 text-gray-700" };
  }
  const sellerBadgeDisplay = sellerBadgeStyle(sellerBadge);

  // Images: gallery from all_image_urls, fallback to thumbnail/main.
  // Filter out promotional/CTA banners that semsarmasr injects into the detail page.
  function isNoiseImage(url: string): boolean {
    const u = url.toLowerCase();
    return /banner|cta|call[-_]?now|contact[-_]?now|promo|ad_banner|advertisment|\/ads?\/|sponsor/i.test(u);
  }

  const rawImages: string[] = [];
  if (Array.isArray(listing.all_image_urls)) {
    for (const u of listing.all_image_urls) {
      if (typeof u === "string" && u && !rawImages.includes(u) && !isNoiseImage(u)) rawImages.push(u);
    }
  }
  if (listing.main_image_url && !rawImages.includes(listing.main_image_url) && !isNoiseImage(listing.main_image_url)) {
    rawImages.unshift(listing.main_image_url);
  }
  if (listing.thumbnail_url && !rawImages.includes(listing.thumbnail_url) && !isNoiseImage(listing.thumbnail_url)) {
    if (rawImages.length === 0) rawImages.push(listing.thumbnail_url);
  }
  const gallery = rawImages.slice(0, 12).map((u) => `/api/img?url=${encodeURIComponent(u)}`);
  const mainImg = gallery[0] || null;

  // Area from source_location
  let area = listing.source_location
    ? String(listing.source_location).split("-")[0].trim()
    : listing.city;
  if (!area || area === govName || area === listing.governorate) area = null;

  // Clean description — handle Dubizzle page-dump pattern first, then generic cleanup
  let description: string | null = null;
  let inlineSpecs: Record<string, string> = {};
  if (isDubizzleTextDump(listing.description)) {
    const dump = parseDubizzleTextDump(listing.description);
    description = dump.cleanDescription;
    inlineSpecs = dump.inlineSpecs;
  } else {
    description = cleanDescription(listing.description);
  }

  // Specs: merge DB specs + inline specs extracted from description (DB wins)
  const dbSpecsRaw = (listing.specifications && typeof listing.specifications === "object" && !Array.isArray(listing.specifications))
    ? listing.specifications as Record<string, unknown>
    : {};
  // Separate amenities array (stored under _amenities key) from regular specs
  const amenities: string[] = Array.isArray(dbSpecsRaw._amenities)
    ? (dbSpecsRaw._amenities as string[]).filter((x) => typeof x === "string")
    : [];
  const dbSpecs: Record<string, string> = {};
  for (const [k, v] of Object.entries(dbSpecsRaw)) {
    if (k === "_amenities") continue;
    if (typeof v === "string" || typeof v === "number") dbSpecs[k] = String(v);
  }
  const rawSpecs: Record<string, string> = { ...inlineSpecs, ...dbSpecs };

  const isCars = catName === "سيارات";
  const primaryOrder = isCars ? CAR_SPEC_ORDER : PROPERTY_SPEC_ORDER;
  const arabicOrder = isCars ? [] : ARABIC_PROPERTY_SPEC_ORDER;
  const orderedSpecs: Array<{ key: string; label: string; icon: string; value: string }> = [];
  const usedKeys = new Set<string>();

  // Pass 1: ordered known English keys (normalized)
  for (const key of primaryOrder) {
    const v = rawSpecs[key];
    if (v && String(v).trim() && String(v).trim() !== "-") {
      const meta = SPEC_LABELS[key] || { label: key, icon: "▪️" };
      orderedSpecs.push({ key, label: meta.label, icon: meta.icon, value: formatSpecValue(key, String(v)) });
      usedKeys.add(key);
    }
  }

  // Pass 2: ordered Arabic keys (SemsarMasr catalog — renders in meaningful sequence)
  for (const key of arabicOrder) {
    if (usedKeys.has(key) || HIDDEN_SPEC_KEYS.has(key)) continue;
    const v = rawSpecs[key];
    if (v && String(v).trim() && String(v).trim() !== "-") {
      orderedSpecs.push({ key, label: key, icon: "▪️", value: String(v) });
      usedKeys.add(key);
    }
  }

  // Pass 3: any other specs (unknown/extra fields) — skip hidden noise
  for (const [key, v] of Object.entries(rawSpecs)) {
    if (usedKeys.has(key) || HIDDEN_SPEC_KEYS.has(key)) continue;
    if (!v || !String(v).trim() || String(v).trim() === "-") continue;
    const meta = SPEC_LABELS[key];
    if (meta) {
      orderedSpecs.push({ key, label: meta.label, icon: meta.icon, value: formatSpecValue(key, String(v)) });
    } else {
      orderedSpecs.push({ key, label: key, icon: "▪️", value: String(v) });
    }
    usedKeys.add(key);
  }

  // Headline summary — brand/model/year or property_type/area/rooms
  const headlineParts: string[] = [];
  if (catName === "سيارات") {
    if (rawSpecs.brand) headlineParts.push(String(rawSpecs.brand));
    if (rawSpecs.model) headlineParts.push(String(rawSpecs.model));
    if (rawSpecs.year) headlineParts.push(String(rawSpecs.year));
  } else {
    if (rawSpecs.property_type) headlineParts.push(String(rawSpecs.property_type));
    if (rawSpecs.area) headlineParts.push(`${rawSpecs.area} م²`);
    if (rawSpecs.rooms) headlineParts.push(`${rawSpecs.rooms} غرف`);
  }
  const headline = headlineParts.filter(Boolean).join(" • ");

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: listing.title,
            description: description || listing.title,
            image: mainImg || undefined,
            offers: listing.price
              ? { "@type": "Offer", price: listing.price, priceCurrency: "EGP", availability: "https://schema.org/InStock" }
              : undefined,
          }),
        }}
      />

      <header className="bg-[#1B7A3D] text-white py-4 px-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-bold">مكسب 💚</Link>
          <Link href={`/browse/${category}/${governorate}`} className="text-xs opacity-90 hover:opacity-100">
            ← {catName} — {govName}
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-3 text-xs text-gray-500">
        <Link href="/" className="hover:text-[#1B7A3D]">الرئيسية</Link>
        {" > "}
        <Link href={`/browse/${category}/${governorate}`} className="hover:text-[#1B7A3D]">
          {catName} — {govName}
        </Link>
        {" > "}
        <span className="text-gray-700 font-bold">{listing.title?.substring(0, 40)}</span>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-12">
        {/* Image Gallery — interactive: click thumbs to swap, click main for lightbox */}
        <ImageGallery
          images={gallery}
          title={listing.title}
          fallbackIcon={catName === "سيارات" ? "🚗" : "🏠"}
        />

        {/* Main card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
          {listing.price && (
            <p className="text-2xl font-bold text-[#1B7A3D] mb-2">
              {Number(listing.price).toLocaleString()} جنيه
              {listing.is_negotiable && (
                <span className="text-xs font-normal text-gray-500 mr-2">قابل للتفاوض</span>
              )}
            </p>
          )}

          <h1 className="text-lg font-bold text-[#1A1A2E] mb-2 leading-relaxed">{listing.title}</h1>

          {headline && (
            <p className="text-sm text-gray-600 mb-3 font-medium">{headline}</p>
          )}

          <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
            <span>📍 {area ? `${area} — ${listing.governorate || govName}` : listing.governorate || govName}</span>
            {listing.created_at && (
              <span>⏰ {new Date(listing.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}</span>
            )}
            {listing.source_platform && (
              <span className="text-gray-400">• {listing.source_platform}</span>
            )}
          </div>
        </div>

        {/* Seller Card */}
        <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl p-5 mb-4 shadow-sm">
          <h2 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">البائع</h2>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {sellerPhone ? (
                  <Link
                    href={`/seller/${sellerPhone}`}
                    className="font-bold text-blue-700 hover:underline text-base truncate"
                  >
                    👤 {sellerName || "معلن"} ←
                  </Link>
                ) : (
                  <p className="font-bold text-gray-900 text-base truncate">
                    👤 {sellerName || "معلن"}
                  </p>
                )}
                {sellerBadgeDisplay && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${sellerBadgeDisplay.classes}`}>
                    <span>{sellerBadgeDisplay.icon}</span>
                    <span>{sellerBadgeDisplay.label}</span>
                  </span>
                )}
                {sellerIsVerified && (
                  <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">✓ موثّق</span>
                )}
                {!sellerBadgeDisplay && sellerIsBusiness && (
                  <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">🏢 تاجر</span>
                )}
              </div>
              {sellerMemberYear && (
                <p className="text-xs text-gray-500">⭐ عضو منذ {sellerMemberYear}</p>
              )}
              {area && (
                <p className="text-xs text-gray-500 mt-1">📍 {area}</p>
              )}
            </div>
            <div className="text-left flex-shrink-0" dir="ltr">
              {sellerPhone ? (
                <div className="space-y-2">
                  <a
                    href={`tel:+2${sellerPhone}`}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors"
                  >
                    <span>📞</span>
                    <span className="font-mono">{sellerPhone}</span>
                  </a>
                  <a
                    href={`https://wa.me/2${sellerPhone}?text=${encodeURIComponent(`مرحباً، أنا مهتم بإعلانك: ${listing.title}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-xl font-bold text-sm hover:bg-[#1da851] transition-colors"
                  >
                    <span>💬</span>
                    <span>واتساب</span>
                  </a>
                </div>
              ) : (
                <span className="text-xs text-gray-400">الرقم غير متاح</span>
              )}
            </div>
          </div>
        </div>

        {/* Specifications */}
        {orderedSpecs.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
            <h2 className="text-sm font-bold text-[#1A1A2E] mb-4 flex items-center gap-2">
              <span>📋</span>
              <span>المواصفات</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {orderedSpecs.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg text-sm"
                >
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </span>
                  <span className="font-bold text-gray-900 text-left" dir="auto">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Amenities / Features */}
        {amenities.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
            <h2 className="text-sm font-bold text-[#1A1A2E] mb-4 flex items-center gap-2">
              <span>✨</span>
              <span>المميزات والخدمات</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {amenities.map((a) => (
                <div
                  key={a}
                  className="flex items-center gap-2 py-2 px-3 bg-green-50 border border-green-100 rounded-lg text-sm"
                >
                  <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                  <span className="text-gray-800">{a}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {description && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
            <h2 className="text-sm font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
              <span>📝</span>
              <span>الوصف</span>
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-7">
              {description}
            </p>
          </div>
        )}

        {/* Safety tip */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-xs text-amber-900">
          <p className="font-bold mb-1">💡 نصيحة أمان</p>
          <p>قابل البائع في مكان عام، عاين المنتج كويس قبل الدفع، ومتحولش فلوس لحد قبل ما تستلم.</p>
        </div>

        {/* Back */}
        <Link
          href={`/browse/${category}/${governorate}`}
          className="inline-block text-[#1B7A3D] text-sm font-bold hover:underline"
        >
          ← شوف كل {catName} في {govName}
        </Link>
      </div>
    </div>
  );
}
