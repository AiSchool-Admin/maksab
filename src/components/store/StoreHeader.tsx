"use client";

import Image from "next/image";
import { Star, MapPin, Clock, Share2 } from "lucide-react";
import type { StoreWithStats, SubscriptionPlan } from "@/types";
import StoreBadges from "./StoreBadges";
import SubscriptionBadge from "./SubscriptionBadge";
import FollowButton from "./FollowButton";
import { formatPhone } from "@/lib/utils/format";

interface StoreHeaderProps {
  store: StoreWithStats;
  isOwner?: boolean;
  subscriptionPlan?: SubscriptionPlan;
  onFollowToggle?: () => void;
}

export default function StoreHeader({
  store,
  isOwner = false,
  subscriptionPlan,
  onFollowToggle,
}: StoreHeaderProps) {
  const handleShare = async () => {
    const url = `${window.location.origin}/store/${store.slug}`;
    if (navigator.share) {
      await navigator.share({ title: store.name, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <div className="bg-white border-b border-gray-light">
      {/* Cover Image */}
      <div
        className="relative h-36 sm:h-48"
        style={{
          background: `linear-gradient(135deg, ${store.primary_color}, ${store.secondary_color || "#145C2E"})`,
        }}
      >
        {store.cover_url && (
          <Image
            src={store.cover_url}
            alt=""
            fill
            className="object-cover"
            priority
          />
        )}

        {/* Share button */}
        <button
          onClick={handleShare}
          className="absolute top-3 start-3 p-2 rounded-full bg-white/80 backdrop-blur-sm text-dark hover:bg-white transition-colors"
          aria-label="مشاركة"
        >
          <Share2 size={18} />
        </button>
      </div>

      {/* Store info */}
      <div className="px-4 pb-4">
        {/* Logo */}
        <div className="relative -mt-12 mb-3 flex items-end justify-between">
          <div
            className="w-24 h-24 rounded-2xl border-4 border-white bg-white shadow-md overflow-hidden flex items-center justify-center"
          >
            {store.logo_url ? (
              <Image
                src={store.logo_url}
                alt={store.name}
                width={96}
                height={96}
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="text-4xl">🏪</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mb-1">
            {!isOwner && (
              <FollowButton
                isFollowing={store.is_following}
                followersCount={store.total_followers}
                onToggle={onFollowToggle}
              />
            )}
          </div>
        </div>

        {/* Name + Badges */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h1 className="text-xl font-bold text-dark">{store.name}</h1>
          {store.is_verified && (
            <span className="text-brand-green" title="متجر موثّق">
              ✅
            </span>
          )}
          {subscriptionPlan && (
            <SubscriptionBadge plan={subscriptionPlan} size="md" />
          )}
        </div>

        {/* Badges */}
        {store.badges.length > 0 && (
          <div className="mb-2">
            <StoreBadges badges={store.badges} />
          </div>
        )}

        {/* Description */}
        {store.description && (
          <p className="text-sm text-gray-text mb-3 leading-relaxed">
            {store.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-text mb-3 flex-wrap">
          <span className="flex items-center gap-1">
            <Star size={14} className="text-brand-gold fill-brand-gold" />
            <strong className="text-dark">{store.avg_rating.toFixed(1)}</strong>
            <span>({store.total_reviews} تقييم)</span>
          </span>
          <span>
            <strong className="text-dark">{store.total_followers}</strong> متابع
          </span>
          <span>
            <strong className="text-dark">{store.total_products}</strong> منتج
          </span>
        </div>

        {/* Location & Phone */}
        <div className="flex items-center gap-4 text-xs text-gray-text flex-wrap">
          {store.location_gov && (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {store.location_gov}
              {store.location_area ? ` — ${store.location_area}` : ""}
            </span>
          )}
          {store.phone && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatPhone(store.phone)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
