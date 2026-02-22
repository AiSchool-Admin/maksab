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
}

export default function BuyRequestCard({ request, showChat = false }: BuyRequestCardProps) {
  const category = categoriesConfig.find((c) => c.id === request.categoryId);
  const purchaseLabel = getPurchaseTypeLabel(request.purchaseType);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-3.5 hover:shadow-sm transition-shadow">
      {/* Top: category + purchase type */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
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
              href={`/chat?buy_request=${request.id}`}
              className="flex items-center gap-0.5 text-brand-green font-bold"
            >
              <MessageCircle size={10} />
              تواصل
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
