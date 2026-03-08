"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3, TrendingUp, TrendingDown, Users, Target,
  DollarSign, MessageCircle, ShoppingBag, RefreshCw,
  ArrowUpRight, ArrowDownRight, Activity, Zap, Award, AlertTriangle
} from "lucide-react";
import { LIFECYCLE_LABELS, CATEGORY_LABELS, SOURCE_LABELS } from "@/types/crm";
import { getAdminHeaders } from "@/app/admin/layout";

interface LifecycleStats {
  stage: string;
  count: number;
  percentage: number;
}

interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
}

interface SourceStats {
  source: string;
  count: number;
  percentage: number;
}

interface OverviewStats {
  total_customers: number;
  active_customers: number;
  at_risk_customers: number;
  churned_customers: number;
  avg_health_score: number;
  total_gmv: number;
  total_commission: number;
  avg_engagement: number;
  lifecycle_breakdown: LifecycleStats[];
  category_breakdown: CategoryStats[];
  source_breakdown: SourceStats[];
}

export default function CrmAnalyticsPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all customers to compute analytics client-side
      const res = await fetch("/api/admin/crm/customers?limit=1000&sort_by=created_at&sort_order=desc", {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const customers = data.customers || [];
        computeStats(customers);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  function computeStats(customers: Array<Record<string, unknown>>) {
    const total = customers.length;
    if (total === 0) {
      setStats({
        total_customers: 0, active_customers: 0, at_risk_customers: 0,
        churned_customers: 0, avg_health_score: 0, total_gmv: 0,
        total_commission: 0, avg_engagement: 0,
        lifecycle_breakdown: [], category_breakdown: [], source_breakdown: [],
      });
      return;
    }

    const active = customers.filter((c) => ["active", "power_user", "champion"].includes(c.lifecycle_stage as string)).length;
    const atRisk = customers.filter((c) => c.lifecycle_stage === "at_risk").length;
    const churned = customers.filter((c) => ["churned", "dormant"].includes(c.lifecycle_stage as string)).length;
    const avgHealth = customers.reduce((s, c) => s + (Number(c.health_score) || 0), 0) / total;
    const totalGmv = customers.reduce((s, c) => s + (Number(c.total_gmv_egp) || 0), 0);
    const totalCommission = customers.reduce((s, c) => s + (Number(c.total_commission_paid_egp) || 0), 0);
    const avgEngagement = customers.reduce((s, c) => s + (Number(c.engagement_score) || 0), 0) / total;

    // Lifecycle breakdown
    const lifecycleCounts: Record<string, number> = {};
    customers.forEach((c) => {
      const stage = c.lifecycle_stage as string || "unknown";
      lifecycleCounts[stage] = (lifecycleCounts[stage] || 0) + 1;
    });
    const lifecycleBreakdown = Object.entries(lifecycleCounts)
      .map(([stage, count]) => ({ stage, count, percentage: (count / total) * 100 }))
      .sort((a, b) => b.count - a.count);

    // Category breakdown
    const categoryCounts: Record<string, number> = {};
    customers.forEach((c) => {
      const cat = c.primary_category as string || "other";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const categoryBreakdown = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count, percentage: (count / total) * 100 }))
      .sort((a, b) => b.count - a.count);

    // Source breakdown
    const sourceCounts: Record<string, number> = {};
    customers.forEach((c) => {
      const src = c.source as string || "other";
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    });
    const sourceBreakdown = Object.entries(sourceCounts)
      .map(([source, count]) => ({ source, count, percentage: (count / total) * 100 }))
      .sort((a, b) => b.count - a.count);

    setStats({
      total_customers: total,
      active_customers: active,
      at_risk_customers: atRisk,
      churned_customers: churned,
      avg_health_score: Math.round(avgHealth),
      total_gmv: totalGmv,
      total_commission: totalCommission,
      avg_engagement: Math.round(avgEngagement),
      lifecycle_breakdown: lifecycleBreakdown,
      category_breakdown: categoryBreakdown,
      source_breakdown: sourceBreakdown,
    });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 size={20} className="text-[#1B7A3D]" />
          تحليلات CRM
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 size={20} className="text-[#1B7A3D]" />
          تحليلات CRM
        </h2>
        <button onClick={fetchAnalytics} className="flex items-center gap-1 px-3 py-2 border rounded-xl text-xs hover:bg-gray-50">
          <RefreshCw size={14} />
          تحديث
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-blue-600" />
            <span className="text-xs text-gray-500">إجمالي العملاء</span>
          </div>
          <p className="text-2xl font-bold">{stats.total_customers.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-l from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={16} className="text-green-600" />
            <span className="text-xs text-green-700">عملاء نشطين</span>
          </div>
          <p className="text-2xl font-bold text-green-800">{stats.active_customers}</p>
          <p className="text-[10px] text-green-600">
            {stats.total_customers > 0 ? ((stats.active_customers / stats.total_customers) * 100).toFixed(1) : 0}%
          </p>
        </div>
        <div className={`rounded-xl p-4 border ${stats.at_risk_customers > 0 ? 'bg-gradient-to-l from-amber-50 to-orange-50 border-amber-200' : 'bg-white'}`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className={stats.at_risk_customers > 0 ? "text-amber-600" : "text-gray-400"} />
            <span className="text-xs text-gray-500">معرضين للخطر</span>
          </div>
          <p className={`text-2xl font-bold ${stats.at_risk_customers > 0 ? 'text-amber-700' : ''}`}>{stats.at_risk_customers}</p>
        </div>
        <div className={`rounded-xl p-4 border ${stats.churned_customers > 0 ? 'bg-gradient-to-l from-red-50 to-pink-50 border-red-200' : 'bg-white'}`}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={16} className={stats.churned_customers > 0 ? "text-red-500" : "text-gray-400"} />
            <span className="text-xs text-gray-500">مفقودين/خاملين</span>
          </div>
          <p className={`text-2xl font-bold ${stats.churned_customers > 0 ? 'text-red-600' : ''}`}>{stats.churned_customers}</p>
        </div>
      </div>

      {/* Scores & Revenue */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={16} className="text-purple-600" />
            <span className="text-xs text-gray-500">متوسط صحة العملاء</span>
          </div>
          <p className="text-2xl font-bold">{stats.avg_health_score}<span className="text-sm text-gray-400">/100</span></p>
          <div className="mt-1.5 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${stats.avg_health_score >= 70 ? 'bg-green-500' : stats.avg_health_score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${stats.avg_health_score}%` }}
            />
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <Target size={16} className="text-indigo-600" />
            <span className="text-xs text-gray-500">متوسط التفاعل</span>
          </div>
          <p className="text-2xl font-bold">{stats.avg_engagement}<span className="text-sm text-gray-400">/100</span></p>
          <div className="mt-1.5 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${stats.avg_engagement >= 70 ? 'bg-green-500' : stats.avg_engagement >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${stats.avg_engagement}%` }}
            />
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-[#D4A843]" />
            <span className="text-xs text-gray-500">إجمالي GMV</span>
          </div>
          <p className="text-xl font-bold">{stats.total_gmv.toLocaleString()}<span className="text-xs text-gray-400 mr-1">جنيه</span></p>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <Award size={16} className="text-[#1B7A3D]" />
            <span className="text-xs text-gray-500">إجمالي العمولات</span>
          </div>
          <p className="text-xl font-bold">{stats.total_commission.toLocaleString()}<span className="text-xs text-gray-400 mr-1">جنيه</span></p>
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Lifecycle Breakdown */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-[#1B7A3D]" />
            توزيع مراحل العملاء
          </h3>
          {stats.lifecycle_breakdown.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">لا توجد بيانات</p>
          ) : (
            <div className="space-y-2">
              {stats.lifecycle_breakdown.map(item => (
                <div key={item.stage}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span>{LIFECYCLE_LABELS[item.stage as keyof typeof LIFECYCLE_LABELS] || item.stage}</span>
                    <span className="text-gray-500">{item.count} ({item.percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#1B7A3D] rounded-full" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <ShoppingBag size={16} className="text-purple-600" />
            توزيع الفئات
          </h3>
          {stats.category_breakdown.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">لا توجد بيانات</p>
          ) : (
            <div className="space-y-2">
              {stats.category_breakdown.map(item => (
                <div key={item.category}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span>{CATEGORY_LABELS[item.category] || item.category}</span>
                    <span className="text-gray-500">{item.count} ({item.percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Source Breakdown */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <Target size={16} className="text-blue-600" />
            مصادر العملاء
          </h3>
          {stats.source_breakdown.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">لا توجد بيانات</p>
          ) : (
            <div className="space-y-2">
              {stats.source_breakdown.map(item => (
                <div key={item.source}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span>{SOURCE_LABELS[item.source] || item.source}</span>
                    <span className="text-gray-500">{item.count} ({item.percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
