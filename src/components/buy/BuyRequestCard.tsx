"use client";

import Link from "next/link";
import { MessageCircle, Sparkles } from "lucide-react";
import {
  type BuyRequest,
  getPurchaseTypeLabel,
} from "@/lib/buy-requests/buy-request-service";
import { categoriesConfig } from "@/lib/categories/categories-config";
import { formatTimeAgo } from "@/lib/utils/format";

interface BuyRequestCardProps {
  request: BuyRequest;
  showChat?: boolean;
  compact?: boolean;
}

export default function BuyRequestCard({ request, showChat = false, compact = false }: BuyRequestCardProps) {
  const category = categoriesConfig.find((c) => c.id === request.categoryId);
  const purchaseLabel = getPurchaseTypeLabel(request.purchaseType);

  if (compact) {
    return (
      <div className="bg-gradient-to-b from-amber-50 to-white border-2 border-brand-gold/30 rounded-2xl p-3 h-full flex flex-col hover:shadow-sm transition-shadow relative">
        {/* "مطلوب" badge */}
        <span className="absolute top-2 start-2 text-[9px] font-bold px-2 py-0.5 rounded-lg bg-brand-gold text-white shadow-sm">
          مطلوب 🛒
        </span>
        {/* Category icon + purchase badge */}
        <div className="flex items-center justify-between mb-1.5 mt-5">
          <span className="text-xl">{category?.icon || "📦"}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
            request.purchaseType === "cash"
              ? "bg-green-50 text-green-600"
              : request.purchaseType === "exchange"
                ? "bg-purple-50 text-purple-600"
                : "bg-blue-50 text-blue-600"
          }`}>
            {purchaseLabel.emoji}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xs font-bold text-dark mb-1 line-clamp-2 flex-1">{request.title}</h3>

        {/* Budget or exchange */}
        {(request.purchaseType === "cash" || request.purchaseType === "both") && request.budgetMax ? (
          <p className="text-[10px] font-bold text-brand-green mb-1.5 line-clamp-1">
            💵 حتى {request.budgetMax.toLocaleString("en-US")} جنيه
          </p>
        ) : request.exchangeOffer ? (
          <p className="text-[10px] font-bold text-purple-600 mb-1.5 line-clamp-1">
            🔄 {request.exchangeOffer}
          </p>
        ) : null}

        {/* Bottom: time + chat */}
        <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-100">
          <span className="text-[9px] text-gray-text">{formatTimeAgo(request.createdAt)}</span>
          {showChat && (
            <Link
              href={`/buy-requests/${request.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-0.5 text-[10px] text-brand-green font-bold"
            >
              <MessageCircle size={10} />
              قدّم عرض
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-l from-amber-50/50 to-white border-2 border-brand-gold/20 rounded-2xl p-3.5 hover:shadow-sm transition-shadow">
      {/* Top: "مطلوب شراء" badge + category + purchase type */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-brand-gold text-white shadow-sm">
            مطلوب 🛒
          </span>
          <span className="text-lg">{category?.icon || "📦"}</span>
          <span className="text-[10px] font-bold text-gray-text">{category?.name}</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          request.purchaseType === "cash"
            ? "bg-green-50 text-green-600"
            : request.purchaseType === "exchange"
              ? "bg-purple-50 text-purple-600"
              : "bg-blue-50 text-blue-600"
        }`}>
          {purchaseLabel.emoji} {purchaseLabel.label}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-bold text-dark mb-1 line-clamp-2">{request.title}</h3>

      {/* Description */}
      {request.description && (
        <p className="text-xs text-gray-text line-clamp-2 mb-2">{request.description}</p>
      )}

      {/* Budget / Exchange */}
      <div className="flex flex-wrap gap-2 mb-2">
        {(request.purchaseType === "cash" || request.purchaseType === "both") && request.budgetMax && (
          <span className="text-xs font-bold text-brand-green bg-brand-green-light px-2 py-0.5 rounded-full">
            💵 حتى {request.budgetMax.toLocaleString("en-US")} جنيه
          </span>
        )}
        {(request.purchaseType === "exchange" || request.purchaseType === "both") && request.exchangeOffer && (
          <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
            🔄 يبدل بـ: {request.exchangeOffer}
          </span>
        )}
      </div>

      {/* Bottom: location + time + matches */}
      <div className="flex items-center justify-between text-[10px] text-gray-text">
        <div className="flex items-center gap-2">
          {request.governorate && <span>📍 {request.governorate}</span>}
          <span>{formatTimeAgo(request.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          {request.matchesCount > 0 && (
            <span className="flex items-center gap-0.5 text-brand-green font-bold">
              <Sparkles size={10} />
              {request.matchesCount} توافق
            </span>
          )}
          {showChat && (
            <Link
              href={`/buy-requests/${request.id}`}
              className="flex items-center gap-0.5 text-brand-green font-bold"
            >
              <MessageCircle size={10} />
              قدّم عرض
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
