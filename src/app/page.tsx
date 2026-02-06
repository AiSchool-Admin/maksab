import Link from "next/link";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import AdCard from "@/components/ad/AdCard";
import Button from "@/components/ui/Button";
import { AdGridSkeleton } from "@/components/ui/SkeletonLoader";
import { Plus, Search } from "lucide-react";

const categories = [
  { icon: "🚗", name: "سيارات", slug: "cars" },
  { icon: "🏠", name: "عقارات", slug: "real-estate" },
  { icon: "📱", name: "موبايلات", slug: "phones" },
  { icon: "👗", name: "موضة", slug: "fashion" },
  { icon: "♻️", name: "خردة", slug: "scrap" },
  { icon: "💰", name: "ذهب", slug: "gold" },
  { icon: "💎", name: "فاخرة", slug: "luxury" },
  { icon: "🏠", name: "أجهزة", slug: "appliances" },
  { icon: "🪑", name: "أثاث", slug: "furniture" },
  { icon: "🎮", name: "هوايات", slug: "hobbies" },
  { icon: "🔧", name: "عدد", slug: "tools" },
  { icon: "🛠️", name: "خدمات", slug: "services" },
];

/* Demo ads to show layout — will be replaced with real data from Supabase */
const demoAds: React.ComponentProps<typeof AdCard>[] = [
  {
    id: "1",
    title: "تويوتا كورولا 2020 — 45,000 كم",
    price: 350000,
    saleType: "cash",
    image: null,
    governorate: "القاهرة",
    city: "مدينة نصر",
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    isNegotiable: true,
  },
  {
    id: "2",
    title: "آيفون 15 برو ماكس — 256GB — مستعمل زيرو",
    price: 45000,
    saleType: "auction",
    image: null,
    governorate: "الجيزة",
    city: "الدقي",
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    auctionHighestBid: 42000,
    auctionEndsAt: new Date(Date.now() + 18 * 3600000).toISOString(),
    auctionBidsCount: 8,
  },
  {
    id: "3",
    title: "شقة 150م² — 3 غرف — الطابق الخامس",
    price: 1500000,
    saleType: "cash",
    image: null,
    governorate: "القاهرة",
    city: "مصر الجديدة",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "4",
    title: "بلايستيشن 5 — مستعمل ممتاز — مع 2 يد",
    price: null,
    saleType: "exchange",
    image: null,
    governorate: "الإسكندرية",
    city: null,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    exchangeDescription: "إكسبوكس سيريس إكس",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <Header title="مكسب" showNotifications />

      {/* Search Bar */}
      <Link href="/search" className="block px-4 py-3">
        <div className="flex items-center gap-2 bg-gray-light rounded-xl px-4 py-3">
          <Search size={18} className="text-gray-text" />
          <span className="text-gray-text text-sm">ابحث في مكسب...</span>
        </div>
      </Link>

      {/* Categories Grid */}
      <section className="px-4 pb-4">
        <h2 className="text-sm font-semibold text-dark mb-3">الأقسام</h2>
        <div className="grid grid-cols-4 gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/search?category=${cat.slug}`}
              className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gray-light hover:bg-brand-green-light transition-colors"
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-xs font-medium text-dark">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Ads Section */}
      <section className="px-4 pb-6">
        <h2 className="text-sm font-semibold text-dark mb-3">إعلانات جديدة</h2>

        {demoAds.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {demoAds.map((ad) => (
              <AdCard key={ad.id} {...ad} />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="py-8 text-center">
            <p className="text-6xl mb-4">🏪</p>
            <h3 className="text-lg font-bold text-dark mb-2">
              أهلاً بيك في مكسب!
            </h3>
            <p className="text-sm text-gray-text mb-4">
              لسه مفيش إعلانات. كن أول واحد يضيف إعلان!
            </p>
            <Button icon={<Plus size={18} />} size="lg">
              أضف إعلان
            </Button>
          </div>
        )}
      </section>

      <BottomNav />
    </main>
  );
}
