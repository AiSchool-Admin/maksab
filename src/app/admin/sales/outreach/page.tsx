"use client";

import { useState, useEffect } from "react";
import { getAdminHeaders } from "@/app/admin/layout";
import {
  RefreshCw,
  Copy,
  Check,
  SkipForward,
  Eye,
  EyeOff,
  MessageSquare,
  Target,
  Send,
  Users,
} from "lucide-react";

interface OutreachContact {
  id: string;
  name: string;
  phone: string;
  score: number;
  isWhale: boolean;
  listingCount: number;
  location: string;
  category: string;
  status: "pending" | "sent" | "skipped";
  message: string;
}

interface OutreachProgress {
  sent: number;
  skipped: number;
  remaining: number;
  target: number;
}

interface OutreachData {
  progress: OutreachProgress;
  contacts: OutreachContact[];
}

export default function SalesOutreachPage() {
  const [data, setData] = useState<OutreachData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMessages, setExpandedMessages] = useState<
    Record<string, boolean>
  >({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [localStatuses, setLocalStatuses] = useState<
    Record<string, "pending" | "sent" | "skipped">
  >({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sales/outreach", {
        headers: getAdminHeaders(),
      });
      const json = await res.json();
      setData(json);
      // Initialize local statuses from server data
      const statuses: Record<string, "pending" | "sent" | "skipped"> = {};
      json.contacts.forEach((c: OutreachContact) => {
        statuses[c.id] = c.status;
      });
      setLocalStatuses(statuses);
    } catch (err) {
      console.error("Failed to fetch outreach data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleMessage = (id: string) => {
    setExpandedMessages((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyMessage = async (id: string, message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      console.error("Failed to copy");
    }
  };

  const openWhatsApp = (phone: string, message: string) => {
    const url = `https://wa.me/2${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const markSent = (id: string) => {
    setLocalStatuses((prev) => ({ ...prev, [id]: "sent" }));
  };

  const markSkipped = (id: string) => {
    setLocalStatuses((prev) => ({ ...prev, [id]: "skipped" }));
  };

  // Compute live progress from local statuses
  const liveProgress = data
    ? {
        sent:
          data.progress.sent +
          Object.values(localStatuses).filter((s) => s === "sent").length -
          data.contacts.filter((c) => c.status === "sent").length,
        skipped:
          data.progress.skipped +
          Object.values(localStatuses).filter((s) => s === "skipped").length -
          data.contacts.filter((c) => c.status === "skipped").length,
        remaining: data.contacts.filter(
          (c) => localStatuses[c.id] === "pending"
        ).length,
        target: data.progress.target,
      }
    : null;

  const progressPercent = liveProgress
    ? Math.round(
        ((liveProgress.sent + liveProgress.skipped) / liveProgress.target) * 100
      )
    : 0;

  if (loading || !data || !liveProgress) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-60 mb-4" />
          <div className="h-4 bg-gray-100 rounded w-full mb-2" />
          <div className="h-8 bg-gray-100 rounded" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-48 mb-3" />
            <div className="h-4 bg-gray-100 rounded w-32 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-64" />
          </div>
        ))}
      </div>
    );
  }

  const pendingContacts = data.contacts.filter(
    (c) => localStatuses[c.id] === "pending"
  );
  const processedContacts = data.contacts.filter(
    (c) => localStatuses[c.id] !== "pending"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">التواصل والاستحواذ</h1>
          <p className="text-sm text-gray-text mt-1">
            تواصل مع البائعين المحتملين وحوّلهم لمستخدمين
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={16} />
          تحديث
        </button>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Target size={18} className="text-[#1B7A3D]" />
          <h2 className="text-base font-bold text-dark">تقدم اليوم</h2>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
          <div className="flex items-center gap-1.5">
            <Send size={14} className="text-[#1B7A3D]" />
            <span className="text-gray-text">أُرسل</span>
            <span className="font-bold text-[#1B7A3D]">{liveProgress.sent}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <SkipForward size={14} className="text-gray-400" />
            <span className="text-gray-text">تخطّى</span>
            <span className="font-bold text-gray-500">{liveProgress.skipped}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-blue-500" />
            <span className="text-gray-text">متبقي</span>
            <span className="font-bold text-blue-600">{liveProgress.remaining}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Target size={14} className="text-[#D4A843]" />
            <span className="text-gray-text">الهدف</span>
            <span className="font-bold text-[#D4A843]">{liveProgress.target}</span>
          </div>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.min(progressPercent, 100)}%`,
              background: `linear-gradient(90deg, #1B7A3D 0%, #D4A843 100%)`,
            }}
          />
        </div>
        <p className="text-xs text-gray-text mt-1.5 text-left">
          {progressPercent}% من الهدف اليومي
        </p>
      </div>

      {/* Pending Contacts */}
      {pendingContacts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-dark flex items-center gap-2">
            <MessageSquare size={18} className="text-[#1B7A3D]" />
            في الانتظار ({pendingContacts.length})
          </h2>

          {pendingContacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              isExpanded={expandedMessages[contact.id] ?? false}
              isCopied={copiedId === contact.id}
              onToggleMessage={() => toggleMessage(contact.id)}
              onCopy={() => copyMessage(contact.id, contact.message)}
              onWhatsApp={() => openWhatsApp(contact.phone, contact.message)}
              onMarkSent={() => markSent(contact.id)}
              onSkip={() => markSkipped(contact.id)}
            />
          ))}
        </div>
      )}

      {/* Processed Contacts */}
      {processedContacts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-dark flex items-center gap-2 text-gray-400">
            تم التعامل معهم ({processedContacts.length})
          </h2>

          {processedContacts.map((contact) => (
            <div
              key={contact.id}
              className="bg-white rounded-2xl p-4 border border-gray-100 opacity-60"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {contact.isWhale ? "🐋" : "👤"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-dark truncate">
                      {contact.name}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        localStatuses[contact.id] === "sent"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {localStatuses[contact.id] === "sent"
                        ? "✅ تم الإرسال"
                        : "⏭️ تم التخطي"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-text" dir="ltr">
                    {contact.phone}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All done */}
      {pendingContacts.length === 0 && (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
          <span className="text-4xl mb-3 block">🎉</span>
          <h3 className="text-lg font-bold text-dark mb-1">
            أحسنت! خلصت كل جهات الاتصال
          </h3>
          <p className="text-sm text-gray-text">
            اضغط تحديث لتحميل دفعة جديدة
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Contact Card Component ───────────────────────────────────────────────────

interface ContactCardProps {
  contact: OutreachContact;
  isExpanded: boolean;
  isCopied: boolean;
  onToggleMessage: () => void;
  onCopy: () => void;
  onWhatsApp: () => void;
  onMarkSent: () => void;
  onSkip: () => void;
}

function ContactCard({
  contact,
  isExpanded,
  isCopied,
  onToggleMessage,
  onCopy,
  onWhatsApp,
  onMarkSent,
  onSkip,
}: ContactCardProps) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md transition-shadow">
      {/* Header Row */}
      <div className="flex items-start gap-3">
        {/* Avatar / Whale indicator */}
        <div className="flex-shrink-0">
          <span className="text-3xl">{contact.isWhale ? "🐋" : "👤"}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-bold text-dark">{contact.name}</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                contact.score >= 90
                  ? "bg-green-100 text-green-700"
                  : contact.score >= 70
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {contact.score} نقطة
            </span>
            {contact.isWhale && (
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                حوت 🐋
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-text">
            <span dir="ltr">{contact.phone}</span>
            <span>📍 {contact.location}</span>
            <span>📦 {contact.listingCount} إعلان</span>
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {contact.category}
            </span>
          </div>
        </div>
      </div>

      {/* Message Toggle */}
      <div className="mt-3">
        <button
          onClick={onToggleMessage}
          className="flex items-center gap-1.5 text-xs text-[#1B7A3D] hover:text-[#145C2E] font-medium transition-colors"
        >
          {isExpanded ? <EyeOff size={14} /> : <Eye size={14} />}
          {isExpanded ? "إخفاء الرسالة" : "عرض الرسالة"}
        </button>

        {isExpanded && (
          <div className="mt-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
            <pre className="text-sm text-dark whitespace-pre-wrap font-[Cairo] leading-relaxed">
              {contact.message}
            </pre>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-medium text-gray-700 transition-colors"
        >
          {isCopied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
          {isCopied ? "تم النسخ!" : "📋 نسخ"}
        </button>

        <button
          onClick={onWhatsApp}
          className="flex items-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 rounded-xl text-xs font-medium text-white transition-colors"
        >
          📱 واتساب
        </button>

        <button
          onClick={onMarkSent}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#1B7A3D] hover:bg-[#145C2E] rounded-xl text-xs font-medium text-white transition-colors"
        >
          <Check size={14} />
          ✅ تم الإرسال
        </button>

        <button
          onClick={onSkip}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-medium text-gray-500 transition-colors"
        >
          <SkipForward size={14} />
          ⏭️ تخطي
        </button>
      </div>
    </div>
  );
}
