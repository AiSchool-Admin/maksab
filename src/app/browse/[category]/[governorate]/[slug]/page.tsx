import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

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

function cleanDescription(desc: string | null): string | null {
  if (!desc) return null;
  // Remove common page dump artifacts
  const stopPhrases = [
    "الصفحة الرئيسية", "dubizzle", "Dubizzle", "Free Classifieds",
    "سياسة الخصوصية", "شروط الاستخدام", "خريطة الموقع",
    "الإبلاغ عن هذا الإعلان", "عرض الموقع", "تحميل التطبيق",
    "خد حد معاك وانت رايح", "متدفعش او تحول فلوس",
    "الإعلانات ذات الصلة", "نبذة عنا",
  ];
  let clean = desc;
  for (const phrase of stopPhrases) {
    const idx = clean.indexOf(phrase);
    if (idx > 20 && idx < clean.length * 0.7) {
      clean = clean.substring(0, idx).trim();
      break;
    }
  }
  // Remove if still too garbled (mostly non-spaced text)
  if (clean.length > 200) {
    const spaceRatio = (clean.match(/\s/g) || []).length / clean.length;
    if (spaceRatio < 0.08) return null;
  }
  return clean.length > 10 ? clean : null;
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
  let seller: any = null;
  if (listing.ahe_seller_id) {
    const { data } = await supabase
      .from("ahe_sellers")
      .select("id, name, phone, source_platform, avatar_url")
      .eq("id", listing.ahe_seller_id)
      .single();
    seller = data;
  }

  const sellerName = seller?.name || listing.seller_name || null;
  const sellerPhone = seller?.phone || listing.extracted_phone || null;

  // Image proxy
  const imgUrl = listing.thumbnail_url || listing.main_image_url;
  const proxiedImg = imgUrl ? `/api/img?url=${encodeURIComponent(imgUrl)}` : null;

  // Area from source_location
  let area = listing.source_location
    ? String(listing.source_location).split("-")[0].trim()
    : listing.city;
  if (!area || area === govName || area === listing.governorate) area = null;

  // Clean description
  const description = cleanDescription(listing.description);

  // Specs
  const specs = (listing.specifications && typeof listing.specifications === "object")
    ? listing.specifications as Record<string, string>
    : null;

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: listing.title,
            description: description || listing.title,
            image: proxiedImg || undefined,
            offers: listing.price
              ? { "@type": "Offer", price: listing.price, priceCurrency: "EGP", availability: "https://schema.org/InStock" }
              : undefined,
          }),
        }}
      />

      <header className="bg-[#1B7A3D] text-white py-4 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-lg font-bold">مكسب 💚</Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-3 text-sm text-gray-500">
        <Link href="/" className="hover:text-[#1B7A3D]">الرئيسية</Link>
        {" > "}
        <Link href={`/browse/${category}/${governorate}`} className="hover:text-[#1B7A3D]">
          {catName} — {govName}
        </Link>
        {" > "}
        <span className="text-dark font-bold truncate">{listing.title?.substring(0, 40)}</span>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-12">
        {/* Image */}
        {proxiedImg ? (
          <div className="aspect-[4/3] bg-gray-100 rounded-2xl overflow-hidden mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={proxiedImg} alt={listing.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-[4/3] bg-gray-100 rounded-2xl flex items-center justify-center text-5xl mb-4">
            {catName === "سيارات" ? "🚗" : "🏠"}
          </div>
        )}

        {/* Price */}
        {listing.price && (
          <p className="text-2xl font-bold text-[#1B7A3D] mb-2">
            {listing.price.toLocaleString()} جنيه
          </p>
        )}

        {/* Title */}
        <h1 className="text-xl font-bold text-[#1A1A2E] mb-4">{listing.title}</h1>

        {/* Location + Date */}
        <div className="space-y-2 text-sm text-gray-600 mb-6">
          <p>📍 {area ? `${area} — ${listing.governorate || govName}` : listing.governorate || govName}</p>
          {listing.created_at && (
            <p>⏰ {new Date(listing.created_at).toLocaleDateString("ar-EG")}</p>
          )}
        </div>

        {/* Seller Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-bold text-gray-700 mb-3">البائع</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-800 text-base">
                👤 {sellerName || "معلن"}
              </p>
              {area && (
                <p className="text-xs text-gray-500 mt-1">📍 {area}</p>
              )}
            </div>
            <div className="text-left" dir="ltr">
              {sellerPhone ? (
                <>
                  <a
                    href={`tel:+2${sellerPhone}`}
                    className="inline-block px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-sm"
                  >
                    📞 {sellerPhone}
                  </a>
                  <a
                    href={`https://wa.me/2${sellerPhone}?text=${encodeURIComponent(`مرحباً، أنا مهتم بإعلانك: ${listing.title}`)}`}
                    target="_blank"
                    rel="noopener"
                    className="block px-4 py-2 bg-green-500 text-white rounded-xl font-bold text-sm mt-2 text-center"
                  >
                    💬 واتساب
                  </a>
                </>
              ) : (
                <span className="text-xs text-gray-400">الرقم غير متاح حالياً</span>
              )}
            </div>
          </div>
        </div>

        {/* Specifications */}
        {specs && Object.keys(specs).length > 0 && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h2 className="text-sm font-bold text-[#1A1A2E] mb-3">المواصفات</h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(specs).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm py-1 border-b border-gray-200">
                  <span className="text-gray-500">{key}</span>
                  <span className="font-bold text-gray-800">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {description && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h2 className="text-sm font-bold text-[#1A1A2E] mb-2">الوصف</h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
              {description}
            </p>
          </div>
        )}

        {/* Back */}
        <Link
          href={`/browse/${category}/${governorate}`}
          className="text-[#1B7A3D] text-sm font-bold hover:underline"
        >
          ← شوف كل {catName} في {govName}
        </Link>
      </div>
    </div>
  );
}
