"use client";

import { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Star, Users, Package } from "lucide-react";
import type { Store, SubscriptionPlan } from "@/types";
import SubscriptionBadge from "./SubscriptionBadge";

interface StoreCardProps {
  store: Store;
  followersCount?: number;
  productsCount?: number;
  avgRating?: number;
  totalReviews?: number;
  subscriptionPlan?: SubscriptionPlan;
}

function StoreCard({
  store,
  followersCount = 0,
  productsCount = 0,
  avgRating = 0,
  totalReviews = 0,
  subscriptionPlan,
}: StoreCardProps) {
  return (
    <Link href={`/store/${store.slug}`} className="block">
      <article className="bg-white rounded-xl border border-gray-light overflow-hidden hover:shadow-md transition-shadow">
        {/* Cover */}
        <div className="relative h-24 bg-gradient-to-l from-brand-green to-brand-green-dark">
          {store.cover_url && (
            <Image
              src={store.cover_url}
              alt=""
              fill
              className="object-cover"
              loading="lazy"
            />
          )}

          {/* Verified badge */}
          {store.is_verified && (
            <span className="absolute top-2 start-2 bg-white/90 text-brand-green text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
              ✅ موثّق
            </span>
          )}
        </div>

        {/* Logo + Info */}
        <div className="px-3 pb-3">
          {/* Logo - overlapping cover */}
          <div className="relative -mt-8 mb-2">
            <div
              className="w-16 h-16 rounded-xl border-3 border-white bg-white shadow-sm overflow-hidden flex items-center justify-center"
              style={{ borderColor: store.primary_color }}
            >
              {store.logo_url ? (
                <Image
                  src={store.logo_url}
                  alt={store.name}
                  width={64}
                  height={64}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="text-2xl">🏪</span>
              )}
            </div>
          </div>

          {/* Store name */}
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="text-sm font-bold text-dark line-clamp-1">
              {store.name}
            </h3>
            {subscriptionPlan && (
              <SubscriptionBadge plan={subscriptionPlan} />
            )}
          </div>

          {/* Description */}
          {store.description && (
            <p className="text-xs text-gray-text line-clamp-2 mb-2 leading-relaxed">
              {store.description}
            </p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-3 text-[11px] text-gray-text mb-2">
            {avgRating > 0 && (
              <span className="flex items-center gap-0.5">
                <Star size={11} className="text-brand-gold fill-brand-gold" />
                {avgRating.toFixed(1)}
                <span className="text-[10px]">({totalReviews})</span>
              </span>
            )}
            <span className="flex items-center gap-0.5">
              <Users size={11} />
              {followersCount} متابع
            </span>
            <span className="flex items-center gap-0.5">
              <Package size={11} />
              {productsCount} منتج
            </span>
          </div>

          {/* Location */}
          {store.location_gov && (
            <span className="flex items-center gap-0.5 text-[11px] text-gray-text">
              <MapPin size={11} />
              {store.location_gov}
              {store.location_area ? ` — ${store.location_area}` : ""}
            </span>
          )}
        </div>
      </article>
    </Link>
  );
}

export default memo(StoreCard);
