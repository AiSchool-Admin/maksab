"use client";

import { useEffect, useState } from "react";

export default function BuyerHarvestReceivePage() {
  const [status, setStatus] = useState("في انتظار البيانات...");
  const [icon, setIcon] = useState("⏳");

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type !== "buyer_harvest_data") return;

      setStatus("جاري المعالجة...");
      setIcon("🔄");

      const payload = JSON.parse(e.data.payload);
      const buyers = payload.buyers || [];
      const total = buyers.length;

      if (total === 0) {
        setIcon("⚠️");
        setStatus("لا توجد بيانات مشترين");
        window.opener?.postMessage(
          { type: "buyer_harvest_result", error: "لا توجد بيانات" },
          "*"
        );
        return;
      }

      sendToApi(payload, total);
    }

    async function sendToApi(payload: any, total: number) {
      try {
        const r = await fetch("/api/admin/sales/buyer-harvest/receive-bookmarklet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await r.json();

        if (r.ok) {
          setIcon("✅");
          setStatus(`تم حفظ ${data.saved || 0} مشتري من أصل ${total}`);
          window.opener?.postMessage(
            {
              type: "buyer_harvest_result",
              saved: data.saved || 0,
              new_count: data.new_count || 0,
              phones: data.phones || 0,
            },
            "*"
          );
        } else {
          setIcon("❌");
          setStatus(`خطأ: ${data.error || "فشل الحفظ"}`);
          window.opener?.postMessage(
            { type: "buyer_harvest_result", error: data.error || "فشل" },
            "*"
          );
        }
      } catch (err: any) {
        setIcon("❌");
        setStatus(`خطأ: ${err.message}`);
        window.opener?.postMessage(
          { type: "buyer_harvest_result", error: err.message },
          "*"
        );
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
        <span className="text-5xl mb-4 block">{icon}</span>
        <h1 className="text-lg font-bold text-[#1A1A2E] mb-2">حصاد المشترين</h1>
        <p className="text-sm text-gray-600">{status}</p>
        <p className="text-xs text-gray-400 mt-4">هذه النافذة ستُغلق تلقائياً</p>
      </div>
    </div>
  );
}
