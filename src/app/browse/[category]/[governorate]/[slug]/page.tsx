import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
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
  // Slug format: "title-text-UUID"
  const parts = slug.split("-");
  const lastPart = parts[parts.length - 1];
  // UUID is 36 chars, but if truncated try last 36 chars
  if (lastPart && lastPart.length >= 20) return lastPart;
  // Try full UUID pattern
  const uuidMatch = slug.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (uuidMatch) return uuidMatch[1];
  // Try last segment
  return parts.pop() || null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, governorate, slug } = await params;
  const id = extractIdFromSlug(slug);
  const catName = CATEGORY_NAMES[category] || category;
  const govName = GOV_NAMES[governorate] || governorate;

  if (!id) {
    return { title: `${catName} في ${govName} | مكسب` };
  }

  const supabase = getSupabase();
  const { data: listing } = await supabase
    .from("ahe_listings")
    .select("title, price, thumbnail_url")
    .eq("id", id)
    .single();

  const title = listing?.title
    ? `${listing.title} | مكسب`
    : `${catName} في ${govName} | مكسب`;

  const description = listing?.title
    ? `${listing.title} — ${listing.price ? listing.price.toLocaleString() + " جنيه" : ""} في ${govName}. سجّل على مكسب لتشوف رقم البائع.`
    : `تصفح ${catName} في ${govName} على مكسب.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "مكسب",
      images: listing?.thumbnail_url ? [{ url: listing.thumbnail_url }] : undefined,
    },
  };
}

export default async function BrowseListingPage({ params }: Props) {
  const { category, governorate, slug } = await params;
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

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Schema.org Product */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: listing.title,
            description: listing.description || listing.title,
            image: listing.thumbnail_url || undefined,
            offers: listing.price
              ? {
                  "@type": "Offer",
                  price: listing.price,
                  priceCurrency: "EGP",
                  availability: "https://schema.org/InStock",
                }
              : undefined,
          }),
        }}
      />

      {/* Header */}
      <header className="bg-[#1B7A3D] text-white py-4 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-lg font-bold">مكسب 💚</Link>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-3xl mx-auto px-4 py-3 text-sm text-gray-500">
        <Link href="/" className="hover:text-[#1B7A3D]">الرئيسية</Link>
        {" > "}
        <Link href={`/browse/${category}/${governorate}`} className="hover:text-[#1B7A3D]">
          {catName} — {govName}
        </Link>
        {" > "}
        <span className="text-dark font-bold truncate">{listing.title?.substring(0, 40)}</span>
      </div>

      {/* Listing */}
      <div className="max-w-3xl mx-auto px-4 pb-12">
        {/* Image */}
        {listing.thumbnail_url ? (
          <div className="aspect-[4/3] bg-gray-100 rounded-2xl overflow-hidden mb-4">
            <img
              src={listing.thumbnail_url}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-[4/3] bg-gray-100 rounded-2xl flex items-center justify-center text-5xl mb-4">
            📷
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

        {/* Details */}
        <div className="space-y-2 text-sm text-gray-600 mb-6">
          {listing.governorate && (
            <p>📍 {listing.governorate}{listing.location ? ` — ${listing.location}` : ""}</p>
          )}
          {listing.seller_name && <p>👤 {listing.seller_name}</p>}
          {listing.created_at && (
            <p>⏰ {new Date(listing.created_at).toLocaleDateString("ar-EG")}</p>
          )}
        </div>

        {/* Description */}
        {listing.description && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h2 className="text-sm font-bold text-[#1A1A2E] mb-2">الوصف</h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
              {listing.description}
            </p>
          </div>
        )}

        {/* CTA — Register to see phone */}
        <div className="bg-[#E8F5E9] rounded-2xl p-6 text-center mb-8">
          <h2 className="text-lg font-bold text-[#1B7A3D] mb-2">
            سجّل لتشوف رقم البائع
          </h2>
          <p className="text-sm text-[#145C2E] mb-4">
            + شوف {CATEGORY_NAMES[category] ? `200+ ${CATEGORY_NAMES[category]}` : "إعلانات"} تانية في {govName}
          </p>
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-[#1B7A3D] text-white rounded-xl font-bold text-sm hover:bg-[#145C2E] transition-colors"
          >
            سجّل مجاناً
          </Link>
        </div>

        {/* Back to category */}
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
