"use client";

import { Pin } from "lucide-react";
import AdCard from "@/components/ad/AdCard";

interface PinnedProduct {
  id: string;
  title: string;
  price: number | null;
  sale_type: "cash" | "auction" | "exchange";
  images: string[];
  governorate: string | null;
  city: string | null;
  created_at: string;
  is_negotiable?: boolean;
  exchange_description?: string;
}

interface PinnedProductsProps {
  products: PinnedProduct[];
}

export default function PinnedProducts({ products }: PinnedProductsProps) {
  if (!products.length) return null;

  return (
    <section className="mb-4">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-dark mb-3 px-1">
        <Pin size={14} className="text-brand-gold" />
        منتجات مميزة
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {products.map((product) => (
          <AdCard
            key={product.id}
            id={product.id}
            title={product.title}
            price={product.price}
            saleType={product.sale_type}
            image={product.images?.[0] || null}
            governorate={product.governorate}
            city={product.city}
            createdAt={product.created_at}
            isNegotiable={product.is_negotiable}
            exchangeDescription={product.exchange_description}
          />
        ))}
      </div>
    </section>
  );
}
