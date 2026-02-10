"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/utils/format";
import type { MockAd } from "@/lib/mock-data";

interface ShelfRowProps {
  ads: MockAd[];
  shelfLabel?: string;
}

/** A "shelf" that displays products like a real store shelf */
export default function ShelfRow({ ads, shelfLabel }: ShelfRowProps) {
  if (ads.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Shelf label */}
      {shelfLabel && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="w-1.5 h-4 bg-amber-600 rounded-full" />
          <span className="text-sm font-bold text-amber-900">{shelfLabel}</span>
        </div>
      )}

      {/* Shelf with products */}
      <div className="relative">
        {/* Products on the shelf */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-1">
          {ads.map((ad, i) => (
            <ShelfProduct key={ad.id} ad={ad} index={i} />
          ))}
        </div>

        {/* Wooden shelf board */}
        <div className="h-2.5 bg-gradient-to-b from-amber-700 to-amber-800 rounded-sm shadow-md relative">
          {/* Wood grain effect */}
          <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
          {/* Shelf shadow */}
          <div className="absolute -bottom-1 inset-x-0 h-1 bg-gradient-to-b from-black/10 to-transparent" />
        </div>

        {/* Shelf brackets */}
        <div className="flex justify-between px-4 -mt-1">
          <ShelfBracket />
          <ShelfBracket />
        </div>
      </div>
    </div>
  );
}

function ShelfProduct({ ad, index }: { ad: MockAd; index: number }) {
  const saleTypeBadge = {
    cash: { text: "💵", bg: "bg-green-100 text-green-800" },
    auction: { text: "🔨", bg: "bg-amber-100 text-amber-800" },
    exchange: { text: "🔄", bg: "bg-blue-100 text-blue-800" },
  }[ad.saleType];

  return (
    <Link
      href={`/ad/${ad.id}`}
      className="flex-shrink-0 w-[120px] group"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="animate-fade-in-up">
        {/* Product "box" on shelf */}
        <div className="relative bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm group-hover:shadow-md group-hover:-translate-y-1 transition-all duration-200">
          {/* Product image */}
          <div className="aspect-square bg-gray-100 relative overflow-hidden">
            {ad.image ? (
              <img
                src={ad.image}
                alt={ad.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-gray-50 to-gray-200">
                📦
              </div>
            )}

            {/* Sale type badge */}
            <div className={`absolute top-1 start-1 ${saleTypeBadge.bg} text-[10px] px-1 py-0.5 rounded-full font-bold`}>
              {saleTypeBadge.text}
            </div>
          </div>

          {/* Product info (price tag) */}
          <div className="p-1.5">
            <p className="text-[10px] text-dark font-semibold leading-tight line-clamp-2 mb-1">
              {ad.title}
            </p>
            {ad.price != null && (
              <div className="bg-brand-green text-white text-[10px] font-bold px-1.5 py-0.5 rounded text-center">
                {formatPrice(ad.price)}
              </div>
            )}
            {ad.saleType === "auction" && ad.auctionHighestBid && (
              <div className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded text-center">
                🔨 {formatPrice(ad.auctionHighestBid)}
              </div>
            )}
            {ad.saleType === "exchange" && (
              <div className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded text-center">
                🔄 للتبديل
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function ShelfBracket() {
  return (
    <div className="w-3 h-4">
      <div className="w-full h-full bg-gradient-to-b from-amber-700 to-amber-900 rounded-b-sm" />
    </div>
  );
}
