"use client";

import { useState, useEffect, useCallback } from "react";
import { getAdminHeaders } from "@/app/admin/layout";
import { RefreshCw, Play, Users, Send, MessageSquare, UserCheck, Copy, Check, ExternalLink } from "lucide-react";

interface PipelineStats {
  new: number;
  contacted: number;
  responded: number;
  registered: number;
}

interface EngineStats {
  asset_type: string;
  mode: string;
  daily_target: number;
  pipeline: PipelineStats;
  queue: number;
  sent_today: number;
}

interface QueueItem {
  id: string;
  seller_id: string;
  message_text: string;
  magic_link: string;
  message_number: number;
  status: string;
  ahe_sellers: {
    name: string;
    phone: string;
    detected_account_type: string;
    total_listings_seen: number;
    source_platform: string;
    whale_score: number;
  };
}

type AssetType = "cars" | "properties";

const SELLER_TYPE_BADGE: Record<string, { label: string; color: string }> = {
  agency: { label: "🏢 وكيل", color: "bg-amber-50 text-amber-700" },
  broker: { label: "🏷️ سمسار", color: "bg-orange-50 text-orange-600" },
  individual: { label: "👤 فرد", color: "bg-blue-50 text-blue-600" },
};

function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.startsWith("0")) return "2" + clean;
  if (clean.startsWith("20")) return clean;
  return "2" + clean;
}

export default function AcquisitionEnginePage() {
  const [assetType, setAssetType] = useState<AssetType>("cars");
  const [stats, setStats] = useState<EngineStats | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const loadData = useCallback(async () => {
    setLoading(true);
    const headers = { ...getAdminHeaders(), "Content-Type": "application/json" };

    const [statsRes, queueRes] = await Promise.all([
      fetch("/api/acquisition/engine", {
        method: "POST", headers,
        body: JSON.stringify({ asset_type: assetType, action: "stats" }),
      }),
      fetch(`/api/acquisition/engine?asset_type=${assetType}&status=queued&limit=20`, { headers }),
    ]);

    if (statsRes.ok) setStats(await statsRes.json());
    if (queueRes.ok) {
      const data = await queueRes.json();
      setQueue(data.items || []);
    }
    setLoading(false);
  }, [assetType]);

  useEffect(() => { loadData(); }, [loadData]);

  const runAction = async (action: string, extra?: Record<string, unknown>) => {
    setActing(action);
    try {
      const res = await fetch("/api/acquisition/engine", {
        method: "POST",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ asset_type: assetType, action, ...extra }),
      });
      const data = await res.json();
      if (action === "queue_new") showToast(`✅ تم إضافة ${data.queued} بائع للقائمة`);
      if (action === "send_batch") showToast(`✅ تم إرسال ${data.sent} رسالة`);
      if (action === "followup") showToast(`✅ تم جدولة ${data.followups} متابعة`);
      if (action === "send_one") showToast("✅ تم");
      loadData();
    } catch { showToast("❌ حصلت مشكلة"); }
    setActing(null);
  };

  const openWhatsApp = (phone: string, message: string) => {
    window.open(`https://web.whatsapp.com/send?phone=${formatPhone(phone)}&text=${encodeURIComponent(message)}`, "_blank");
  };

  const copyText = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Batch send — sequential WhatsApp opening
  const [batchMode, setBatchMode] = useState(false);
  const [batchIndex, setBatchIndex] = useState(0);

  const startBatch = () => {
    if (queue.length === 0) { showToast("القائمة فاضية"); return; }
    setBatchMode(true);
    setBatchIndex(0);
  };

  const sendCurrentBatch = () => {
    const item = queue[batchIndex];
    if (!item) return;
    const seller = item.ahe_sellers;
    if (seller?.phone) {
      openWhatsApp(seller.phone, item.message_text);
    }
    runAction("send_one", { seller_id: item.seller_id });
  };

  const nextInBatch = () => {
    const next = batchIndex + 1;
    if (next >= queue.length || next >= 10) {
      setBatchMode(false);
      showToast(`✅ تم إرسال ${batchIndex + 1} رسالة`);
      loadData();
    } else {
      setBatchIndex(next);
    }
  };

  const stopBatch = () => {
    setBatchMode(false);
    showToast(`تم إرسال ${batchIndex} رسالة`);
    loadData();
  };
  const agentLabel = assetType === "cars" ? "🚗 وليد — سيارات" : "🏠 أحمد — عقارات";
  const p = stats?.pipeline || { new: 0, contacted: 0, responded: 0, registered: 0 };
  const totalPipeline = p.new + p.contacted + p.responded + p.registered;
  const conversionRate = totalPipeline > 0 ? ((p.registered / totalPipeline) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-4 p-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-dark text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-dark">محرك الاستحواذ</h1>
        <button onClick={loadData} className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Asset Type Toggle */}
      <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl">
        {[
          { key: "cars" as AssetType, label: "🚗 سيارات" },
          { key: "properties" as AssetType, label: "🏠 عقارات" },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setAssetType(key)}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              assetType === key ? "bg-brand-green text-white shadow-md" : "text-gray-500"
            }`}>{label}</button>
        ))}
      </div>

      {/* Pipeline Stats */}
      {stats && (
        <>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-dark">{agentLabel}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                stats.mode === "auto" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
              }`}>
                {stats.mode === "auto" ? "⚡ تلقائي" : "👤 يدوي"}
              </span>
            </div>

            {/* Pipeline visualization */}
            <div className="flex items-center gap-1 text-xs mb-3">
              {[
                { label: "جدد", value: p.new, color: "bg-blue-500" },
                { label: "تم التواصل", value: p.contacted, color: "bg-yellow-500" },
                { label: "ردوا", value: p.responded, color: "bg-purple-500" },
                { label: "سجلوا", value: p.registered, color: "bg-green-500" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex-1 text-center">
                  <div className={`h-2 ${color} rounded-full mb-1`}
                    style={{ opacity: Math.max(0.2, value / Math.max(p.new, 1)) }} />
                  <p className="font-bold text-dark">{value}</p>
                  <p className="text-[10px] text-gray-400">{label}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-text">
              <span>📤 أُرسل اليوم: <b className="text-dark">{stats.sent_today}</b> / {stats.daily_target}</span>
              <span>📊 التحويل: <b className="text-brand-green">{conversionRate}%</b></span>
              <span>📋 القائمة: <b className="text-dark">{stats.queue}</b></span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => runAction("queue_new", { limit: 20 })} disabled={!!acting}
              className="flex flex-col items-center gap-1 p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
              <Users size={18} className="text-blue-600" />
              <span className="text-xs font-bold text-dark">جلب جدد</span>
              <span className="text-[10px] text-gray-400">20 بائع</span>
            </button>
            <button onClick={startBatch} disabled={!!acting || queue.length === 0}
              className="flex flex-col items-center gap-1 p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
              <Send size={18} className="text-green-600" />
              <span className="text-xs font-bold text-dark">إرسال دفعة</span>
              <span className="text-[10px] text-gray-400">{Math.min(queue.length, 10)} رسائل</span>
            </button>
            <button onClick={() => runAction("followup", { limit: 20 })} disabled={!!acting}
              className="flex flex-col items-center gap-1 p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
              <MessageSquare size={18} className="text-purple-600" />
              <span className="text-xs font-bold text-dark">متابعة 48h</span>
              <span className="text-[10px] text-gray-400">بدون رد</span>
            </button>
          </div>
        </>
      )}

      {/* Batch Mode Overlay */}
      {batchMode && queue[batchIndex] && (
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-dark">📱 إرسال دفعة — {batchIndex + 1} / {Math.min(queue.length, 10)}</p>
            <button onClick={stopBatch} className="text-xs text-red-500 hover:text-red-700 font-bold">إيقاف ✕</button>
          </div>
          <div className="bg-white rounded-lg p-3 mb-3">
            <p className="text-sm font-bold text-dark mb-1">{queue[batchIndex].ahe_sellers?.name || "بدون اسم"}</p>
            <p className="text-xs text-gray-text font-mono mb-2" dir="ltr">{queue[batchIndex].ahe_sellers?.phone}</p>
            <pre className="text-[11px] text-gray-600 whitespace-pre-wrap font-[Cairo] leading-relaxed bg-gray-50 rounded p-2 max-h-24 overflow-y-auto" dir="rtl">
              {queue[batchIndex].message_text}
            </pre>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { sendCurrentBatch(); nextInBatch(); }}
              className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2">
              📱 افتح واتساب + التالي
            </button>
            <button onClick={nextInBatch}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-sm">
              تخطي ⏭
            </button>
          </div>
        </div>
      )}

      {/* Queue */}
      <div>
        <p className="text-sm font-bold text-dark mb-2">القائمة ({queue.length})</p>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl h-24 animate-pulse border border-gray-100" />)}
          </div>
        ) : queue.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm">القائمة فاضية — اضغط &quot;جلب جدد&quot;</p>
          </div>
        ) : (
          <div className="space-y-2">
            {queue.map((item) => {
              const seller = item.ahe_sellers;
              const badge = SELLER_TYPE_BADGE[seller?.detected_account_type || "individual"] || SELLER_TYPE_BADGE.individual;
              return (
                <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-dark">{seller?.name || "بدون اسم"}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${badge.color}`}>{badge.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-text mt-0.5">
                        <span dir="ltr">📞 {seller?.phone}</span>
                        <span>📦 {seller?.total_listings_seen || 0} إعلان</span>
                        <span className="capitalize">{seller?.source_platform}</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      رسالة {item.message_number}
                    </span>
                  </div>

                  {/* Message preview */}
                  <div className="bg-gray-50 rounded-lg p-2 mb-2 max-h-20 overflow-y-auto">
                    <pre className="text-[11px] text-gray-600 whitespace-pre-wrap font-[Cairo] leading-relaxed" dir="rtl">
                      {item.message_text?.substring(0, 200)}{item.message_text?.length > 200 ? "..." : ""}
                    </pre>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => {
                      openWhatsApp(seller?.phone, item.message_text);
                      runAction("send_one", { seller_id: item.seller_id });
                    }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 rounded-lg text-xs font-bold text-white">
                      📱 واتساب
                    </button>
                    <button onClick={() => copyText(item.id, item.message_text)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-700">
                      {copiedId === item.id ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                      {copiedId === item.id ? "تم!" : "نسخ"}
                    </button>
                    {item.magic_link && (
                      <a href={item.magic_link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 rounded-lg text-xs text-purple-700">
                        <ExternalLink size={12} /> الرابط
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
