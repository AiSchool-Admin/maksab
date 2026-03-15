"use client";

/**
 * Receive page for harvester bookmarklets — opened as popup
 * Reuses the same logic as /admin/crm/harvester/receive
 * Accepts data from bookmarklets via postMessage, sends to API, reports back
 */

import { useEffect, useState } from "react";

const BATCH_SIZE = 20;

export default function HarvesterReceiveBookmarkletPage() {
  const [status, setStatus] = useState("في انتظار البيانات...");
  const [icon, setIcon] = useState("⏳");
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type !== "harvest_data") return;

      setStatus("جاري المعالجة...");
      setIcon("🔄");

      const payload = JSON.parse(e.data.payload);
      const token = e.data.token || "";
      const allListings = payload.listings || [];
      const total = allListings.length;

      if (total === 0) {
        setIcon("⚠️");
        setStatus("لا توجد إعلانات في البيانات");
        window.opener?.postMessage({ type: "harvest_result", error: "لا توجد إعلانات" }, "*");
        return;
      }

      if (total <= BATCH_SIZE) {
        sendBatch(e.data.payload, token, total);
        return;
      }

      processBatches(payload, token, allListings, total);
    }

    async function sendBatch(body: string, token: string, _total: number) {
      try {
        const r = await fetch(
          "/api/admin/crm/harvester/receive-bookmarklet?token=" + encodeURIComponent(token),
          { method: "POST", headers: { "Content-Type": "text/plain" }, body }
        );
        const result = await r.json();
        if (result.error) {
          setIcon("❌");
          setStatus("خطأ: " + result.error);
          window.opener?.postMessage({ type: "harvest_result", error: result.error }, "*");
          return;
        }
        setIcon("✅");
        setProgress(null);
        setStatus(`تم! ${result.received} إعلان (${result.new} جديد — ${result.duplicate} مكرر)`);
        window.opener?.postMessage({
          type: "harvest_result",
          received: result.received,
          new_count: result.new,
          duplicate: result.duplicate,
          employee: result.employee,
          scope_matched: result.scope_matched,
        }, "*");
      } catch (err) {
        setIcon("❌");
        setStatus("خطأ في الاتصال: " + (err instanceof Error ? err.message : String(err)));
        window.opener?.postMessage({
          type: "harvest_result",
          error: err instanceof Error ? err.message : String(err),
        }, "*");
      }
    }

    async function processBatches(
      payload: { url: string; timestamp: string; source: string; strategy?: string; scope_code?: string; platform?: string },
      token: string,
      allListings: unknown[],
      total: number
    ) {
      let totalNew = 0;
      let totalDup = 0;
      let totalReceived = 0;
      let hadError = false;

      const batches = [];
      for (let i = 0; i < total; i += BATCH_SIZE) {
        batches.push(allListings.slice(i, i + BATCH_SIZE));
      }

      for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
        const batch = batches[batchIdx];
        const processed = Math.min((batchIdx + 1) * BATCH_SIZE, total);
        setProgress({ current: batchIdx * BATCH_SIZE, total });
        setStatus(`جارِ المعالجة... ${batchIdx * BATCH_SIZE}/${total}`);

        const batchPayload = JSON.stringify({
          url: payload.url,
          listings: batch,
          timestamp: payload.timestamp,
          source: payload.source,
          strategy: payload.strategy,
          scope_code: payload.scope_code,
          platform: payload.platform,
        });

        try {
          const r = await fetch(
            "/api/admin/crm/harvester/receive-bookmarklet?token=" + encodeURIComponent(token),
            { method: "POST", headers: { "Content-Type": "text/plain" }, body: batchPayload }
          );
          const result = await r.json();
          if (result.error) {
            setIcon("❌");
            setStatus(`خطأ في الدفعة ${batchIdx + 1}: ${result.error}`);
            hadError = true;
            break;
          }
          totalNew += result.new || 0;
          totalDup += result.duplicate || 0;
          totalReceived += result.received || 0;
          setProgress({ current: processed, total });
        } catch (err) {
          setIcon("❌");
          setStatus(`خطأ في الدفعة ${batchIdx + 1}: ${err instanceof Error ? err.message : String(err)}`);
          hadError = true;
          break;
        }
      }

      if (!hadError) {
        setIcon("✅");
        setProgress({ current: total, total });
        setStatus(`تم! ${totalReceived} إعلان (${totalNew} جديد — ${totalDup} مكرر)`);
        window.opener?.postMessage({
          type: "harvest_result",
          received: totalReceived,
          new_count: totalNew,
          duplicate: totalDup,
        }, "*");
      } else {
        window.opener?.postMessage({
          type: "harvest_result",
          error: `توقف عند ${totalReceived}/${total}`,
        }, "*");
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div
      style={{
        textAlign: "center",
        padding: "40px 20px",
        fontFamily: "Cairo, Arial, sans-serif",
        direction: "rtl",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f9fafb",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          maxWidth: "400px",
          width: "100%",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>{icon}</div>
        <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#1B7A3D", marginBottom: "12px" }}>
          حصاد مكسب
        </h2>
        <p style={{ fontSize: "16px", color: "#374151", lineHeight: 1.6 }}>{status}</p>
        {progress && (
          <div style={{ marginTop: "16px" }}>
            <div style={{ background: "#e5e7eb", borderRadius: "8px", height: "8px", overflow: "hidden" }}>
              <div
                style={{
                  background: "#1B7A3D",
                  height: "100%",
                  width: `${Math.round((progress.current / progress.total) * 100)}%`,
                  transition: "width 0.3s ease",
                  borderRadius: "8px",
                }}
              />
            </div>
            <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>
              {progress.current} / {progress.total}
            </p>
          </div>
        )}
        <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "16px" }}>
          هذه النافذة هتقفل تلقائياً
        </p>
      </div>
    </div>
  );
}
