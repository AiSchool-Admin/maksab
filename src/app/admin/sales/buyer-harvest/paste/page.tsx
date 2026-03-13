"use client";

import { useState } from "react";
import { getAdminHeaders } from "@/app/admin/layout";
import { Copy, Check, Save, Send, Loader2 } from "lucide-react";

interface ParsedBuyer {
  buyer_name: string | null;
  buyer_phone: string | null;
  product_wanted: string | null;
  category: string | null;
  budget_min: number | null;
  budget_max: number | null;
  governorate: string | null;
  condition_wanted: string | null;
  buyer_tier: string;
  buyer_score: number;
  matches_count: number;
  original_text: string;
}

const SOURCES = [
  { value: "facebook_group", label: "جروب فيسبوك" },
  { value: "whatsapp_group", label: "جروب واتساب" },
  { value: "manual", label: "أخرى" },
];

const TIER_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  hot_buyer: { label: "hot", emoji: "🔥", color: "bg-red-100 text-red-700" },
  warm_buyer: { label: "warm", emoji: "🟡", color: "bg-yellow-100 text-yellow-700" },
  cold_buyer: { label: "cold", emoji: "🔵", color: "bg-blue-100 text-blue-700" },
  unknown: { label: "?", emoji: "⚪", color: "bg-gray-100 text-gray-500" },
};

export default function BuyerPasteParsePage() {
  const [text, setText] = useState("");
  const [source, setSource] = useState("facebook_group");
  const [groupName, setGroupName] = useState("");
  const [results, setResults] = useState<ParsedBuyer[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleParse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResults(null);
    setSaved(false);

    try {
      const res = await fetch("/api/admin/sales/buyer-harvest/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({ text, source, groupName: groupName || undefined }),
      });
      const data = await res.json();
      setResults(data.buyers || []);
    } catch (err) {
      console.error("Parse error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (andSend: boolean = false) => {
    if (!results || results.length === 0) return;
    setSaving(true);

    try {
      const res = await fetch("/api/admin/sales/buyer-harvest/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({ text, source, groupName: groupName || undefined, save: true }),
      });
      const data = await res.json();
      setSaved(true);

      if (andSend) {
        // Redirect to outreach page
        window.location.href = "/admin/sales/buyer-outreach";
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark">📋 Paste & Parse — استخراج مشترين</h1>
        <p className="text-sm text-gray-text mt-1">
          الصق نصوص من جروبات فيسبوك أو واتساب واستخرج المشترين تلقائياً
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-bold text-dark mb-1.5">المصدر</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white"
            >
              {SOURCES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-dark mb-1.5">اسم الجروب</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="مثلاً: بيع وشراء موبايلات إسكندرية"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
            />
          </div>
        </div>

        <label className="block text-sm font-bold text-dark mb-1.5">الصق النصوص هنا</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`مطلوب آيفون 15 برو ميزانيتي 40 ألف
01012345678 سيدي جابر
─────────────────
عايز أشتري سامسونج S24 مستعمل
المعادي — كلمني 01112345678`}
          rows={10}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-y font-mono"
          dir="rtl"
        />

        <button
          onClick={handleParse}
          disabled={loading || !text.trim()}
          className="mt-4 flex items-center gap-2 px-6 py-3 bg-[#1B7A3D] text-white rounded-xl font-bold text-sm hover:bg-[#145C2E] disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              جاري التحليل...
            </>
          ) : (
            "🤖 حلل واستخرج"
          )}
        </button>
      </div>

      {/* Results */}
      {results !== null && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          {results.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-3 block">🔍</span>
              <h3 className="text-base font-bold text-dark mb-1">لم يتم العثور على طلبات شراء</h3>
              <p className="text-sm text-gray-text">
                تأكد إن النص فيه بوستات &ldquo;مطلوب&rdquo; أو &ldquo;عايز أشتري&rdquo;
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-dark">
                  ✅ تم استخراج {results.length} مشتري
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(false)}
                    disabled={saving || saved}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#1B7A3D] text-white rounded-xl text-xs font-bold hover:bg-[#145C2E] disabled:opacity-50 transition-colors"
                  >
                    {saved ? <Check size={14} /> : <Save size={14} />}
                    {saved ? "تم الحفظ!" : saving ? "جاري..." : "💾 حفظ الكل"}
                  </button>
                  <button
                    onClick={() => handleSave(true)}
                    disabled={saving || saved}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#D4A843] text-white rounded-xl text-xs font-bold hover:bg-[#C09935] disabled:opacity-50 transition-colors"
                  >
                    <Send size={14} />
                    📨 حفظ وأرسل
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {results.map((buyer, i) => {
                  const tier = TIER_LABELS[buyer.buyer_tier] || TIER_LABELS.unknown;
                  return (
                    <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{tier.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tier.color}`}>
                              {tier.label}
                            </span>
                            <span className="text-sm font-bold text-dark">
                              مطلوب: {buyer.product_wanted || "غير محدد"}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-text">
                            {buyer.buyer_name && <span>👤 {buyer.buyer_name}</span>}
                            {buyer.buyer_phone && (
                              <span dir="ltr" className="font-mono text-[#1B7A3D] font-bold">
                                📞 {buyer.buyer_phone}
                              </span>
                            )}
                            {(buyer.budget_min || buyer.budget_max) && (
                              <span>💰 {(buyer.budget_max || buyer.budget_min)?.toLocaleString()} جنيه</span>
                            )}
                            {buyer.governorate && <span>📍 {buyer.governorate}</span>}
                            {buyer.condition_wanted && (
                              <span>{buyer.condition_wanted === "new" ? "✨ جديد" : "♻️ مستعمل"}</span>
                            )}
                            <span className="text-[#D4A843] font-bold">
                              🔄 {buyer.matches_count} مطابق
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
