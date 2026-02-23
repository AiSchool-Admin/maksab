"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShoppingCart, Send, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { categoriesConfig } from "@/lib/categories/categories-config";
import { formatTimeAgo, formatPrice } from "@/lib/utils/format";

interface MatchingRequest {
  id: string;
  title: string;
  categoryId: string;
  purchaseType: "cash" | "exchange" | "both";
  budgetMax?: number;
  exchangeOffer?: string;
  governorate?: string;
  createdAt: string;
  matchScore: number;
}

interface MatchingBuyRequestsProps {
  adId: string;
  categoryId: string;
  adTitle: string;
}

export default function MatchingBuyRequests({ adId, categoryId, adTitle }: MatchingBuyRequestsProps) {
  const [requests, setRequests] = useState<MatchingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);

      // Try the smart matching function first
      try {
        const { data: rpcData } = await (supabase.rpc as Function)("find_buy_requests_for_ad", {
          p_ad_id: adId,
          p_limit: 5,
        });

        if (rpcData && rpcData.length > 0) {
          // Fetch the full buy request details
          const ids = rpcData.map((r: { buy_request_id: string }) => r.buy_request_id);
          const { data: brData } = await supabase
            .from("buy_requests")
            .select("*")
            .in("id", ids)
            .eq("status", "active");

          if (brData && brData.length > 0) {
            const scoreMap = new Map(
              rpcData.map((r: { buy_request_id: string; match_score: number }) => [r.buy_request_id, r.match_score])
            );
            setRequests(
              brData.map((row: Record<string, unknown>) => ({
                id: row.id as string,
                title: row.title as string,
                categoryId: row.category_id as string,
                purchaseType: (row.purchase_type as MatchingRequest["purchaseType"]) || "cash",
                budgetMax: row.budget_max ? Number(row.budget_max) : undefined,
                exchangeOffer: (row.exchange_offer as string) || undefined,
                governorate: (row.governorate as string) || undefined,
                createdAt: row.created_at as string,
                matchScore: (scoreMap.get(row.id as string) as number) || 0,
              }))
            );
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // RPC might not exist yet, fall back to simple query
      }

      // Fallback: simple category match
      const { data } = await supabase
        .from("buy_requests")
        .select("*")
        .eq("category_id", categoryId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(5);

      if (data && data.length > 0) {
        setRequests(
          data.map((row: Record<string, unknown>) => ({
            id: row.id as string,
            title: row.title as string,
            categoryId: row.category_id as string,
            purchaseType: (row.purchase_type as MatchingRequest["purchaseType"]) || "cash",
            budgetMax: row.budget_max ? Number(row.budget_max) : undefined,
            exchangeOffer: (row.exchange_offer as string) || undefined,
            governorate: (row.governorate as string) || undefined,
            createdAt: row.created_at as string,
            matchScore: 30,
          }))
        );
      }

      setIsLoading(false);
    }

    load();
  }, [adId, categoryId]);

  if (isLoading || requests.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-brand-gold text-white">مطلوب 🛒</span>
        <h3 className="text-sm font-bold text-dark">ناس بتدور على كده</h3>
      </div>

      <div className="space-y-2">
        {requests.map((req) => {
          const category = categoriesConfig.find((c) => c.id === req.categoryId);

          return (
            <Link key={req.id} href={`/buy-requests/${req.id}`} className="block">
              <div className="bg-gradient-to-l from-amber-50/50 to-white border border-brand-gold/20 rounded-xl p-3 hover:border-brand-gold/40 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <ShoppingCart size={18} className="text-brand-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-dark line-clamp-1">{req.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {req.budgetMax && (
                        <span className="text-[10px] font-bold text-brand-green">
                          💵 حتى {formatPrice(req.budgetMax)}
                        </span>
                      )}
                      {req.exchangeOffer && (
                        <span className="text-[10px] font-bold text-purple-600 truncate">
                          🔄 {req.exchangeOffer}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {req.governorate && (
                        <span className="text-[9px] text-gray-text">📍 {req.governorate}</span>
                      )}
                      <span className="text-[9px] text-gray-text">{formatTimeAgo(req.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold text-brand-gold bg-amber-50 px-2 py-1 rounded-full">
                    <Send size={10} />
                    قدّم عرض
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
