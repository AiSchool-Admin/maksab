"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, Globe } from "lucide-react";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import AdCard from "@/components/ad/AdCard";

interface SharedCollectionAd {
  id: string;
  title: string;
  price: number | null;
  image: string | null;
  saleType: string;
  status: string;
  governorate: string;
}

interface SharedCollection {
  name: string;
  icon: string;
  description?: string;
  ads: SharedCollectionAd[];
}

export default function SharedCollectionPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const [collection, setCollection] = useState<SharedCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadSharedCollection();
  }, [code]);

  const loadSharedCollection = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/collections?share_code=${code}`);
      if (res.ok) {
        const data = await res.json();
        setCollection(data.collection);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white pb-20">
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-brand-green" />
        </div>
      </main>
    );
  }

  if (notFound || !collection) {
    return (
      <main className="min-h-screen bg-white pb-20">
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🔗</div>
          <h2 className="text-base font-bold text-dark mb-2">
            القائمة مش موجودة أو خاصة
          </h2>
          <p className="text-sm text-gray-text mb-6">
            ممكن القائمة دي اتحذفت أو صاحبها خلاها خاصة
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-sm text-brand-green font-bold"
          >
            رجوع للرئيسية
          </button>
        </div>
        <BottomNavWithBadge />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-20">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-light">
        <div className="flex items-center gap-2 px-4 h-14">
          <button type="button" onClick={() => router.back()} className="p-1 text-gray-text">
            <ChevronRight size={24} />
          </button>
          <span className="text-lg">{collection.icon}</span>
          <h1 className="text-base font-bold text-dark">{collection.name}</h1>
          <Globe size={14} className="text-gray-text" />
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {collection.description && (
          <p className="text-sm text-gray-text">{collection.description}</p>
        )}

        <p className="text-xs text-gray-text">
          {collection.ads.length} إعلان في القائمة
        </p>

        {collection.ads.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-text">القائمة فاضية</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {collection.ads.map((ad) => (
              <AdCard
                key={ad.id}
                id={ad.id}
                title={ad.title}
                price={ad.price}
                saleType={ad.saleType as "cash" | "auction" | "exchange"}
                image={ad.image}
                governorate={ad.governorate}
                city=""
                createdAt={new Date().toISOString()}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNavWithBadge />
    </main>
  );
}
