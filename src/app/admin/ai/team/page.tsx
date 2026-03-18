"use client";

import { useState, useEffect } from "react";
import { getAdminHeaders } from "@/app/admin/layout";

interface AgentStats {
  agent: string;
  total: number;
  today: number;
  outcomes: Record<string, number>;
}

interface ModerationStats {
  total: number;
  approved: number;
  rejected: number;
  review: number;
}

interface Alert {
  id: string;
  created_at: string;
  type: string;
  priority: string;
  message: string;
  resolved: boolean;
}

const AGENTS = [
  { id: "sara", name: "سارة", role: "خدمة العملاء", icon: "👩‍💼", color: "bg-blue-500" },
  { id: "waleed", name: "وليد", role: "مبيعات واتساب", icon: "👨‍💼", color: "bg-green-500" },
  { id: "mazen", name: "مازن", role: "مراجعة الإعلانات", icon: "🛡️", color: "bg-orange-500" },
  { id: "nora", name: "نورا", role: "التقارير والتحليلات", icon: "📊", color: "bg-purple-500" },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-gray-100 text-gray-600 border-gray-200",
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: "حرج",
  high: "عالي",
  medium: "متوسط",
  low: "منخفض",
};

export default function AITeamPage() {
  const [agentStats, setAgentStats] = useState<AgentStats[]>([]);
  const [moderationStats, setModerationStats] = useState<ModerationStats>({ total: 0, approved: 0, rejected: 0, review: 0 });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const headers = getAdminHeaders();
      const res = await fetch("/api/admin/ai/team-stats", { headers });
      if (res.ok) {
        const data = await res.json();
        setAgentStats(data.agents || []);
        setModerationStats(data.moderation || { total: 0, approved: 0, rejected: 0, review: 0 });
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error("Failed to fetch AI team stats:", err);
    } finally {
      setLoading(false);
    }
  }

  async function resolveAlert(alertId: string) {
    try {
      const headers = getAdminHeaders();
      await fetch("/api/admin/ai/team-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ action: "resolve_alert", alert_id: alertId }),
      });
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch {
      // Silent
    }
  }

  function getAgentStat(agentId: string): AgentStats {
    return agentStats.find(a => a.agent === agentId) || { agent: agentId, total: 0, today: 0, outcomes: {} };
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-dark">فريق AI</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl p-5 border border-gray-200 animate-pulse">
              <div className="h-12 bg-gray-100 rounded-lg mb-3" />
              <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-dark">فريق AI مكسب</h2>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {AGENTS.map(agent => {
          const stats = getAgentStat(agent.id);
          return (
            <div key={agent.id} className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-11 h-11 ${agent.color} rounded-xl flex items-center justify-center text-xl`}>
                  {agent.icon}
                </div>
                <div>
                  <h3 className="font-bold text-dark">{agent.name}</h3>
                  <p className="text-xs text-gray-text">{agent.role}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-dark">{stats.total}</p>
                  <p className="text-[10px] text-gray-text">إجمالي التفاعلات</p>
                </div>
                <div className="bg-brand-green-light rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-brand-green">{stats.today}</p>
                  <p className="text-[10px] text-gray-text">اليوم</p>
                </div>
              </div>
              {Object.keys(stats.outcomes).length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(stats.outcomes).map(([outcome, count]) => (
                      <span key={outcome} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {outcome}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Moderation Stats */}
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h3 className="font-bold text-dark mb-4">مراجعة الإعلانات — مازن (اليوم)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-2xl font-bold text-dark">{moderationStats.total}</p>
            <p className="text-xs text-gray-text">إجمالي المراجعات</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-xl">
            <p className="text-2xl font-bold text-green-600">{moderationStats.approved}</p>
            <p className="text-xs text-gray-text">تمت الموافقة</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-xl">
            <p className="text-2xl font-bold text-red-600">{moderationStats.rejected}</p>
            <p className="text-xs text-gray-text">مرفوض</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-xl">
            <p className="text-2xl font-bold text-yellow-600">{moderationStats.review}</p>
            <p className="text-xs text-gray-text">يحتاج مراجعة بشرية</p>
          </div>
        </div>
      </div>

      {/* Admin Alerts */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-dark">
            تنبيهات غير محلولة ({alerts.length})
          </h3>
        </div>
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-4xl mb-2">✅</p>
            <p className="text-sm">لا توجد تنبيهات مفتوحة</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {alerts.map(alert => (
              <div key={alert.id} className="p-4 flex items-start gap-3">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold whitespace-nowrap ${PRIORITY_COLORS[alert.priority] || PRIORITY_COLORS.medium}`}>
                  {PRIORITY_LABELS[alert.priority] || alert.priority}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark">{alert.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {alert.type} — {alert.created_at ? new Date(alert.created_at).toLocaleString("ar-EG") : ""}
                  </p>
                </div>
                <button
                  onClick={() => resolveAlert(alert.id)}
                  className="text-xs text-brand-green hover:text-brand-green-dark px-3 py-1 rounded-lg hover:bg-brand-green-light transition-colors whitespace-nowrap"
                >
                  تم الحل
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
