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
  phones: "موبايلات",
  vehicles: "سيارات",
  properties: "عقارات",
  electronics: "إلكترونيات",
  furniture: "أثاث وديكور",
  gold: "ذهب وفضة",
  appliances: "أجهزة منزلية",
  fashion: "موضة",
  general: "إعلانات",
};

const GOV_NAMES: Record<string, string> = {
  cairo: "القاهرة",
  giza: "الجيزة",
  alexandria: "الإسكندرية",
  dakahlia: "الدقهلية",
  sharqia: "الشرقية",
  qalyubia: "القليوبية",
  gharbia: "الغربية",
  monufia: "المنوفية",
  beheira: "البحيرة",
  minya: "المنيا",
  asyut: "أسيوط",
  sohag: "سوهاج",
  fayoum: "الفيوم",
  "port-said": "بورسعيد",
  ismailia: "الإسماعيلية",
  suez: "السويس",
  damietta: "دمياط",
  luxor: "الأقصر",
  aswan: "أسوان",
};

interface Props {
  params: Promise<{ category: string; governorate: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, governorate } = await params;
  const catName = CATEGORY_NAMES[category] || category;
  const govName = GOV_NAMES[governorate] || governorate;
  const title = `${catName} للبيع في ${govName} | مكسب`;
  const description = `تصفح أحدث إعلانات ${catName} للبيع في ${govName}. أسعار مناسبة، بائعين موثوقين. سجّل مجاناً على مكسب.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "مكسب",
    },
  };
}

export default async function BrowseCategoryGovernoratePage({ params }: Props) {
  const { category, governorate } = await params;
  const catName = CATEGORY_NAMES[category] || category;
  const govName = GOV_NAMES[governorate] || governorate;

  const supabase = getSupabase();

  // Fetch listings
  const { data: listings } = await supabase
    .from("ahe_listings")
    .select("id, title, price, governorate, thumbnail_url, source_listing_url, created_at, category, seller_name")
    .eq("is_duplicate", false)
    .eq("category", category)
    .eq("governorate", govName)
    .order("created_at", { ascending: false })
    .limit(50);

  const { count: totalCount } = await supabase
    .from("ahe_listings")
    .select("*", { count: "exact", head: true })
    .eq("is_duplicate", false)
    .eq("category", category)
    .eq("governorate", govName);

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Schema.org ItemList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `${catName} للبيع في ${govName}`,
            numberOfItems: totalCount || 0,
            itemListElement: (listings || []).slice(0, 20).map((listing: any, i: number) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "Product",
                name: listing.title,
                url: `https://maksab.com/browse/${category}/${governorate}/${encodeURIComponent(listing.title?.replace(/\s+/g, "-") || "ad")}-${listing.id}`,
                offers: listing.price
                  ? {
                      "@type": "Offer",
                      price: listing.price,
                      priceCurrency: "EGP",
                    }
                  : undefined,
              },
            })),
          }),
        }}
      />

      {/* Header */}
      <header className="bg-[#1B7A3D] text-white py-4 px-4">
        <div className="max-w-5xl mx-auto">
          <Link href="/" className="text-lg font-bold">مكسب 💚</Link>
          <p className="text-sm opacity-80 mt-1">كل صفقة مكسب</p>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-5xl mx-auto px-4 py-3 text-sm text-gray-500">
        <Link href="/" className="hover:text-[#1B7A3D]">الرئيسية</Link>
        {" > "}
        <Link href={`/browse/${category}`} className="hover:text-[#1B7A3D]">{catName}</Link>
        {" > "}
        <span className="text-dark font-bold">{govName}</span>
      </div>

      {/* Title */}
      <div className="max-w-5xl mx-auto px-4 mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">
          {catName} للبيع في {govName}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {totalCount || 0} إعلان متاح
        </p>
      </div>

      {/* Listings Grid */}
      <div className="max-w-5xl mx-auto px-4 pb-12">
        {!listings || listings.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl mb-4 block">🔍</span>
            <h2 className="text-lg font-bold text-[#1A1A2E] mb-2">
              لا توجد إعلانات حالياً
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              سجّل على مكسب وكن أول من ينشر إعلان {catName} في {govName}
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-[#1B7A3D] text-white rounded-xl font-bold text-sm hover:bg-[#145C2E] transition-colors"
            >
              سجّل مجاناً
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map((listing: any) => {
              const slug = `${(listing.title || "ad").replace(/\s+/g, "-").substring(0, 50)}-${listing.id}`;
              return (
                <Link
                  key={listing.id}
                  href={`/browse/${category}/${governorate}/${slug}`}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {listing.thumbnail_url ? (
                    <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                      <img
                        src={listing.thumbnail_url}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center text-3xl">
                      📷
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="text-sm font-bold text-[#1A1A2E] line-clamp-2 mb-1">
                      {listing.title}
                    </h3>
                    {listing.price && (
                      <p className="text-sm font-bold text-[#1B7A3D]">
                        {listing.price.toLocaleString()} جنيه
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">
                      📍 {listing.governorate || govName}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 bg-[#E8F5E9] rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold text-[#1B7A3D] mb-2">
            سجّل مجاناً وشوف أرقام البائعين
          </h2>
          <p className="text-sm text-[#145C2E] mb-4">
            + تنبيهات فورية لما ينزل إعلان جديد في {catName} — {govName}
          </p>
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-[#1B7A3D] text-white rounded-xl font-bold text-sm hover:bg-[#145C2E] transition-colors"
          >
            سجّل الآن — مجاناً
          </Link>
        </div>
      </div>
    </div>
  );
}
