"use client";

import { useState, useEffect } from "react";
import { getAdminHeaders } from "@/app/admin/layout";
import { Send, X } from "lucide-react";

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

interface DailyReport {
  date: string;
  report_text: string;
  raw_data: Record<string, any>;
  admin_decision: string | null;
  admin_decision_at: string | null;
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
  const [latestReport, setLatestReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);

  // Decision modal
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionText, setDecisionText] = useState("");
  const [savingDecision, setSavingDecision] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const headers = getAdminHeaders();
      const [teamRes, reportRes] = await Promise.all([
        fetch("/api/admin/ai/team-stats", { headers }),
        fetch("/api/admin/ai/daily-report", { headers }),
      ]);

      if (teamRes.ok) {
        const data = await teamRes.json();
        setAgentStats(data.agents || []);
        setModerationStats(data.moderation || { total: 0, approved: 0, rejected: 0, review: 0 });
        setAlerts(data.alerts || []);
      }

      if (reportRes.ok) {
        const reportData = await reportRes.json();
        setLatestReport(reportData.report || null);
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

  async function saveDecision() {
    if (!decisionText.trim()) return;
    setSavingDecision(true);
    try {
      const headers = getAdminHeaders();
      await fetch("/api/admin/ai/daily-report", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ decision: decisionText.trim() }),
      });
      setLatestReport((prev) =>
        prev ? { ...prev, admin_decision: decisionText.trim(), admin_decision_at: new Date().toISOString() } : prev
      );
      setShowDecisionModal(false);
      setDecisionText("");
    } catch {
      // silent
    }
    setSavingDecision(false);
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

      {/* Nora Daily Report */}
      {latestReport && (
        <div className="bg-gradient-to-l from-purple-50 to-white rounded-xl p-5 border border-purple-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <div>
                <h3 className="font-bold text-dark">تقرير نورا — {latestReport.date}</h3>
                <p className="text-[10px] text-gray-text">أحدث تقرير يومي</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {latestReport.admin_decision ? (
                <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                  ✅ تم اتخاذ قرار
                </span>
              ) : (
                <button
                  onClick={() => { setShowDecisionModal(true); setDecisionText(""); }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors"
                >
                  📝 قرار اليوم
                </button>
              )}
            </div>
          </div>

          <pre className="text-sm text-dark whitespace-pre-wrap font-[Cairo] leading-relaxed bg-white/50 rounded-lg p-4 border border-purple-50">
            {latestReport.report_text}
          </pre>

          {latestReport.admin_decision && (
            <div className="mt-3 bg-green-50 border border-green-100 rounded-xl p-3">
              <p className="text-[10px] text-green-600 font-bold mb-1">قرار ممدوح:</p>
              <p className="text-sm text-green-800">{latestReport.admin_decision}</p>
              {latestReport.admin_decision_at && (
                <p className="text-[10px] text-green-500 mt-1">
                  {new Date(latestReport.admin_decision_at).toLocaleString("ar-EG")}
                </p>
              )}
            </div>
          )}
        </div>
      )}

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

      {/* Decision Modal */}
      {showDecisionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDecisionModal(false)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">📝 قرار اليوم</h3>
              <button onClick={() => setShowDecisionModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              اكتب قرارك بناءً على تقرير نورا. هيتحفظ كـ context للفريق AI.
            </p>

            <textarea
              value={decisionText}
              onChange={(e) => setDecisionText(e.target.value)}
              className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none"
              placeholder="مثال: ركّز على استقطاب بائعين سيارات في القاهرة النهارده. وسارة تتابع التصعيدات المعلّقة..."
              autoFocus
            />

            <div className="flex gap-2 mt-4">
              <button
                onClick={saveDecision}
                disabled={!decisionText.trim() || savingDecision}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <Send size={16} />
                {savingDecision ? "بيتحفظ..." : "حفظ القرار"}
              </button>
              <button
                onClick={() => setShowDecisionModal(false)}
                className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
