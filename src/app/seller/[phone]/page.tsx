import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

interface Props {
  params: Promise<{ phone: string }>;
}

function normalize(phone: string): string {
  // Strip any decoration — we store 01XXXXXXXXX canonical
  let p = decodeURIComponent(phone).replace(/[^\d]/g, "");
  if (p.startsWith("2") && p.length === 12) p = p.slice(1);
  if (p.startsWith("20") && p.length === 12) p = "0" + p.slice(2);
  return p;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { phone } = await params;
  const p = normalize(phone);
  return {
    title: `إعلانات المعلن ${p} | مكسب`,
    description: `تصفح كل إعلانات المعلن صاحب الرقم ${p} على مكسب.`,
  };
}

export default async function SellerPage({ params }: Props) {
  const { phone } = await params;
  const p = normalize(phone);
  const supabase = getSupabase();

  // Get seller info (name, tier, etc.)
  const { data: seller } = await supabase
    .from("ahe_sellers")
    .select("id, name, phone, source_platform, is_verified, is_business, first_seen_at")
    .eq("phone", p)
    .maybeSingle();

  // Get all listings for this phone (either directly or via the seller record)
  const sellerId = seller?.id;
  const listingsQuery = sellerId
    ? supabase.from("ahe_listings").select("id, title, price, governorate, city, thumbnail_url, main_image_url, maksab_category, created_at").or(`extracted_phone.eq.${p},ahe_seller_id.eq.${sellerId}`)
    : supabase.from("ahe_listings").select("id, title, price, governorate, city, thumbnail_url, main_image_url, maksab_category, created_at").eq("extracted_phone", p);

  const { data: listings } = await listingsQuery
    .eq("is_duplicate", false)
    .order("created_at", { ascending: false })
    .limit(100);

  const sellerName = seller?.name || "معلن";
  const memberYear = seller?.first_seen_at ? new Date(seller.first_seen_at).getFullYear() : null;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-[#1B7A3D] text-white py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-bold">مكسب 💚</Link>
          <Link href="/browse/properties/alexandria" className="text-xs opacity-90 hover:opacity-100">
            ← عقارات الإسكندرية
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Seller header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-[#1A1A2E]">👤 {sellerName}</h1>
                {seller?.is_verified && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">✓ موثّق</span>
                )}
                {seller?.is_business && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">🏢 تاجر</span>
                )}
              </div>
              {memberYear && (
                <p className="text-xs text-gray-500">⭐ عضو منذ {memberYear}</p>
              )}
              <p className="text-sm text-gray-600 mt-1" dir="ltr">📞 {p}</p>
            </div>
            <div className="flex flex-col gap-2" dir="ltr">
              <a
                href={`tel:+2${p}`}
                className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors text-center"
              >
                📞 اتصل
              </a>
              <a
                href={`https://wa.me/2${p}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#25D366] text-white rounded-xl font-bold text-sm hover:bg-[#1da851] transition-colors text-center"
              >
                💬 واتساب
              </a>
            </div>
          </div>
        </div>

        {/* Listings */}
        <div className="mb-3">
          <h2 className="text-sm font-bold text-gray-700">
            📋 {listings?.length || 0} إعلان لهذا المعلن
          </h2>
        </div>

        {!listings || listings.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-500">
            لا توجد إعلانات حالياً لهذا المعلن
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {listings.map((l) => {
              const rawImg = l.thumbnail_url || l.main_image_url;
              const img = rawImg ? `/api/img?url=${encodeURIComponent(rawImg)}` : null;
              const catSlug = l.maksab_category === "سيارات" ? "vehicles" : "properties";
              const govSlug = l.governorate?.includes("الإسكندرية") ? "alexandria" : "alexandria";
              const slug = `${(l.title || "ad").replace(/\s+/g, "-").substring(0, 50)}-${l.id}`;
              return (
                <Link
                  key={l.id}
                  href={`/browse/${catSlug}/${govSlug}/${slug}`}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {img ? (
                    <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={l.title} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center text-3xl">
                      {l.maksab_category === "سيارات" ? "🚗" : "🏠"}
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="text-sm font-bold text-[#1A1A2E] line-clamp-2 mb-1">{l.title}</h3>
                    {l.price && (
                      <p className="text-sm font-bold text-[#1B7A3D]">
                        {Number(l.price).toLocaleString()} جنيه
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">
                      📍 {l.city || l.governorate}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
