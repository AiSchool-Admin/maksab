import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { isDubizzleTextDump, parseDubizzleTextDump } from "@/lib/crm/harvester/parsers/dubizzle-text-dump";
import ImageGallery from "@/components/browse/ImageGallery";
import {
  PROPERTY_SPECS_ORDER,
  PROPERTY_SPEC_BY_ID,
  AMENITY_BY_ID,
  AMENITY_CATEGORY_LABELS,
  amenitiesByCategory,
  SELLER_TYPE_LABELS,
  type AmenityCategory,
} from "@/lib/marketplace/schema";

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

// Spec labels / order / amenity grouping come from the canonical Maksab schema.
// This detail page renders listings with normalized English keys (property_type,
// area_sqm, bedrooms, ...) and amenity IDs (balcony, elevator, sea_view, ...).

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
 * Render a canonical spec value for display using its schema metadata.
 * Translates enum IDs → Arabic labels and adds units.
 */
function formatCanonicalSpec(fieldId: string, rawValue: unknown): string {
  const field = PROPERTY_SPEC_BY_ID[fieldId];
  if (!field) return String(rawValue ?? "");
  const v = rawValue == null ? "" : String(rawValue).trim();
  if (!v) return "";

  // Enum translation (property_type=apartment → "شقة", etc.)
  if (field.type === "enum" && field.enum_values && field.enum_values[v]) {
    return field.enum_values[v];
  }
  if (field.type === "boolean") {
    return v === "true" || v === "1" ? "نعم" : "لا";
  }
  if (field.type === "number" && /^\d+$/.test(v)) {
    const formatted = Number(v).toLocaleString();
    return field.unit ? `${formatted} ${field.unit}` : formatted;
  }
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
  const sellerMemberYear = seller?.first_seen_at ? new Date(seller.first_seen_at).getFullYear() : null;

  // Canonical seller type — 2 buckets only (owner / company). Server normalizer
  // already writes the Arabic label ("مالك" / "شركة") into listing.seller_badge,
  // but we also handle legacy rows by matching on any stored text.
  function sellerBadgeStyle(rawBadge: string | null, isBusiness: boolean): { label: string; icon: string; classes: string } | null {
    if (!rawBadge && !isBusiness) return null;
    const src = (rawBadge || "").toLowerCase();
    const isCompany =
      isBusiness ||
      /شركة|مطور|سمسار|مكتب|broker|agent|company|developer|office/.test(src);
    const isOwner = !isCompany && /مالك|owner|individual|فرد/.test(src);
    if (isCompany) {
      const spec = SELLER_TYPE_LABELS.company;
      return { label: spec.label, icon: spec.icon, classes: "bg-amber-100 text-amber-700" };
    }
    if (isOwner) {
      const spec = SELLER_TYPE_LABELS.owner;
      return { label: spec.label, icon: spec.icon, classes: "bg-emerald-100 text-emerald-700" };
    }
    return null;
  }
  const sellerBadgeDisplay = sellerBadgeStyle(listing.seller_badge || null, !!sellerIsBusiness);

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
  const rawSpecs: Record<string, string | number | boolean> = { ...inlineSpecs, ...dbSpecs };
  const metaExtras: Record<string, string> = (dbSpecsRaw._meta && typeof dbSpecsRaw._meta === "object")
    ? dbSpecsRaw._meta as Record<string, string>
    : {};

  // Render specs using the canonical Maksab schema. The DB already has
  // canonical English keys (property_type, area_sqm, bedrooms, ...) set by
  // the normalizer in receive-bookmarklet. We just walk PROPERTY_SPECS_ORDER
  // and render each non-empty field via its schema metadata.
  const orderedSpecs: Array<{ key: string; label: string; icon: string; value: string }> = [];
  for (const fieldId of PROPERTY_SPECS_ORDER) {
    const raw = rawSpecs[fieldId];
    if (raw === undefined || raw === null || raw === "" || raw === "-") continue;
    const field = PROPERTY_SPEC_BY_ID[fieldId];
    const display = formatCanonicalSpec(fieldId, raw);
    if (!display) continue;
    orderedSpecs.push({
      key: fieldId,
      label: field?.label_ar || fieldId,
      icon: field?.icon || "▪️",
      value: display,
    });
  }

  // Headline summary — property_type • area_sqm • bedrooms
  const headlineParts: string[] = [];
  if (rawSpecs.property_type) {
    headlineParts.push(formatCanonicalSpec("property_type", rawSpecs.property_type));
  }
  if (rawSpecs.area_sqm) headlineParts.push(`${rawSpecs.area_sqm} م²`);
  if (rawSpecs.bedrooms) headlineParts.push(`${rawSpecs.bedrooms} غرف`);
  const headline = headlineParts.filter(Boolean).join(" • ");

  // Amenities grouped by category — for the sectioned UI
  const amenityGroups = amenitiesByCategory(amenities);

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

        {/* Amenities / Features — grouped by category (Maksab canonical schema) */}
        {amenities.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
            <h2 className="text-sm font-bold text-[#1A1A2E] mb-4 flex items-center gap-2">
              <span>✨</span>
              <span>المميزات والخدمات</span>
            </h2>
            {(Object.keys(amenityGroups) as AmenityCategory[])
              .filter((cat) => amenityGroups[cat].length > 0)
              .map((cat) => (
                <div key={cat} className="mb-4 last:mb-0">
                  <h3 className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1.5">
                    <span>{AMENITY_CATEGORY_LABELS[cat].icon}</span>
                    <span>{AMENITY_CATEGORY_LABELS[cat].label}</span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {amenityGroups[cat].map((amenity) => (
                      <div
                        key={amenity.id}
                        className="flex items-center gap-2 py-2 px-3 bg-green-50 border border-green-100 rounded-lg text-sm"
                      >
                        <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                        <span className="text-gray-800">{amenity.label_ar}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
