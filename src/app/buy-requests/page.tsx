"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, ShoppingCart, Filter, ChevronDown } from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import BuyRequestCard from "@/components/buy/BuyRequestCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { categoriesConfig } from "@/lib/categories/categories-config";
import {
  fetchActiveBuyRequests,
  type BuyRequest,
} from "@/lib/buy-requests/buy-request-service";

type SortOption = "newest" | "budget_high" | "budget_low";

export default function BuyRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<BuyRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedPurchaseType, setSelectedPurchaseType] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    const data = await fetchActiveBuyRequests(100, selectedCategory || undefined);
    setRequests(data);
    setIsLoading(false);
  }, [selectedCategory]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Filter & sort
  const filtered = requests
    .filter((r) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!r.title.toLowerCase().includes(q) && !(r.description || "").toLowerCase().includes(q)) {
          return false;
        }
      }
      if (selectedPurchaseType && r.purchaseType !== selectedPurchaseType) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "budget_high":
          return (b.budgetMax || 0) - (a.budgetMax || 0);
        case "budget_low":
          return (a.budgetMax || Infinity) - (b.budgetMax || Infinity);
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  return (
    <main className="min-h-screen bg-white pb-20">
      <Header title="طلبات الشراء" />

      {/* Search bar */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="relative">
          <Search size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-text" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في طلبات الشراء..."
            className="w-full bg-gray-light rounded-xl ps-10 pe-4 py-2.5 text-sm text-dark placeholder:text-gray-text outline-none focus:ring-2 focus:ring-brand-green/30"
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
        <button
          onClick={() => setSelectedCategory("")}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
            !selectedCategory
              ? "bg-brand-green text-white"
              : "bg-gray-light text-dark hover:bg-gray-200"
          }`}
        >
          الكل
        </button>
        {categoriesConfig.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(selectedCategory === cat.id ? "" : cat.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
              selectedCategory === cat.id
                ? "bg-brand-green text-white"
                : "bg-gray-light text-dark hover:bg-gray-200"
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 text-xs font-bold text-gray-text hover:text-dark transition-colors"
          >
            <Filter size={14} />
            فلاتر
            <ChevronDown size={12} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>
        </div>
        <p className="text-xs text-gray-text">
          {filtered.length} طلب
        </p>
      </div>

      {showFilters && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 space-y-3">
          {/* Purchase type filter */}
          <div>
            <label className="text-xs font-bold text-dark block mb-1.5">نوع الشراء</label>
            <div className="flex gap-2">
              {[
                { value: "", label: "الكل" },
                { value: "cash", label: "💵 نقدي" },
                { value: "exchange", label: "🔄 تبديل" },
                { value: "both", label: "💵🔄 الاتنين" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedPurchaseType(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    selectedPurchaseType === opt.value
                      ? "bg-brand-green text-white"
                      : "bg-white border border-gray-200 text-dark"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="text-xs font-bold text-dark block mb-1.5">ترتيب حسب</label>
            <div className="flex gap-2">
              {[
                { value: "newest" as const, label: "الأحدث" },
                { value: "budget_high" as const, label: "أعلى ميزانية" },
                { value: "budget_low" as const, label: "أقل ميزانية" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    sortBy === opt.value
                      ? "bg-brand-green text-white"
                      : "bg-white border border-gray-200 text-dark"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="px-4 py-3 space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-light rounded-xl animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-bold text-dark mb-2">
              {searchQuery ? "مفيش نتائج" : "مفيش طلبات شراء"}
            </p>
            <p className="text-sm text-gray-text mb-4">
              {searchQuery
                ? "جرب كلمات بحث تانية"
                : "كن أول واحد يطلب حاجة!"}
            </p>
          </div>
        ) : (
          filtered.map((req) => (
            <Link key={req.id} href={`/buy-requests/${req.id}`} className="block">
              <BuyRequestCard
                request={req}
                showChat={!!user && req.userId !== user.id}
              />
            </Link>
          ))
        )}
      </div>

      <BottomNavWithBadge />
    </main>
  );
}
