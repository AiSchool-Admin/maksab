"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  BarChart3,
  Tag,
  Settings,
  Star,
  Users,
  Eye,
  TrendingUp,
  Plus,
  ExternalLink,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import EmptyState from "@/components/ui/EmptyState";
import { supabase } from "@/lib/supabase/client";
import type { Store } from "@/types";

interface DashboardStats {
  totalProducts: number;
  totalViews: number;
  totalFollowers: number;
  totalReviews: number;
  avgRating: number;
}

export default function StoreDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [store, setStore] = useState<Store | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    async function load() {
      setIsLoading(true);

      // Get user's store
      const { data: storeData } = await supabase
        .from("stores" as never)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!storeData) {
        setIsLoading(false);
        return;
      }

      const s = storeData as unknown as Store;
      setStore(s);

      // Fetch stats in parallel
      const [products, followers, reviews] = await Promise.all([
        supabase
          .from("ads" as never)
          .select("id", { count: "exact", head: true })
          .eq("store_id", s.id)
          .eq("status", "active"),
        supabase
          .from("store_followers" as never)
          .select("id", { count: "exact", head: true })
          .eq("store_id", s.id),
        supabase
          .from("store_reviews" as never)
          .select("overall_rating")
          .eq("store_id", s.id),
      ]);

      const reviewsData = (reviews.data || []) as {
        overall_rating: number;
      }[];
      const avg =
        reviewsData.length > 0
          ? reviewsData.reduce((sum, r) => sum + r.overall_rating, 0) /
            reviewsData.length
          : 0;

      setStats({
        totalProducts: products.count || 0,
        totalViews: 0,
        totalFollowers: followers.count || 0,
        totalReviews: reviewsData.length,
        avgRating: Math.round(avg * 10) / 10,
      });

      setIsLoading(false);
    }

    load();
  }, [user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <EmptyState
          icon="🏪"
          title="مفيش متجر لسه"
          description="أنشئ متجرك الأول وابدأ بيع منتجاتك"
          actionLabel="أنشئ متجرك"
          actionHref="/store/create"
        />
      </div>
    );
  }

  const menuItems = [
    {
      href: "/store/dashboard/products",
      icon: <Package size={20} />,
      label: "المنتجات",
      desc: `${stats?.totalProducts || 0} منتج نشط`,
      color: "text-brand-green bg-brand-green-light",
    },
    {
      href: "/store/dashboard/analytics",
      icon: <BarChart3 size={20} />,
      label: "الإحصائيات",
      desc: "تحليلات المتجر",
      color: "text-blue-600 bg-blue-50",
    },
    {
      href: "/store/dashboard/promotions",
      icon: <Tag size={20} />,
      label: "العروض",
      desc: "إدارة الخصومات",
      color: "text-red-600 bg-red-50",
    },
    {
      href: "/store/dashboard/settings",
      icon: <Settings size={20} />,
      label: "الإعدادات",
      desc: "تعديل المتجر",
      color: "text-gray-600 bg-gray-100",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-light px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-dark">لوحة التحكم</h1>
            <p className="text-xs text-gray-text">{store.name}</p>
          </div>
          <Link
            href={`/store/${store.slug}`}
            className="flex items-center gap-1 text-xs text-brand-green font-semibold"
          >
            <ExternalLink size={14} />
            عرض المتجر
          </Link>
        </div>
      </header>

      {/* Stats cards */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-light p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-brand-green-light">
              <Package size={16} className="text-brand-green" />
            </div>
            <span className="text-xs text-gray-text">المنتجات</span>
          </div>
          <p className="text-xl font-bold text-dark">
            {stats?.totalProducts || 0}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-light p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-blue-50">
              <Users size={16} className="text-blue-600" />
            </div>
            <span className="text-xs text-gray-text">المتابعين</span>
          </div>
          <p className="text-xl font-bold text-dark">
            {stats?.totalFollowers || 0}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-light p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-yellow-50">
              <Star size={16} className="text-brand-gold" />
            </div>
            <span className="text-xs text-gray-text">التقييم</span>
          </div>
          <p className="text-xl font-bold text-dark">
            {stats?.avgRating?.toFixed(1) || "0.0"}
          </p>
          <p className="text-[10px] text-gray-text">
            ({stats?.totalReviews || 0} تقييم)
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-light p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-purple-50">
              <Eye size={16} className="text-purple-600" />
            </div>
            <span className="text-xs text-gray-text">المشاهدات</span>
          </div>
          <p className="text-xl font-bold text-dark">
            {stats?.totalViews || 0}
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-4 mt-4">
        <Link
          href="/ad/create"
          className="flex items-center justify-center gap-2 bg-brand-green text-white text-sm font-bold py-3 rounded-xl hover:bg-brand-green-dark transition-colors w-full"
        >
          <Plus size={18} />
          أضف منتج جديد
        </Link>
      </div>

      {/* Menu */}
      <div className="px-4 mt-4 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 bg-white rounded-xl border border-gray-light p-4 hover:shadow-sm transition-shadow"
          >
            <div className={`p-2 rounded-xl ${item.color}`}>{item.icon}</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-dark">{item.label}</p>
              <p className="text-xs text-gray-text">{item.desc}</p>
            </div>
            <TrendingUp size={16} className="text-gray-text rotate-180" />
          </Link>
        ))}
      </div>
    </div>
  );
}
