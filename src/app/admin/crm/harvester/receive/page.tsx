"use client";

import { useEffect, useState } from "react";

export default function HarvesterReceivePage() {
  const [status, setStatus] = useState("في انتظار البيانات...");
  const [icon, setIcon] = useState("⏳");

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type !== "harvest_data") return;

      setStatus("جاري المعالجة...");
      setIcon("🔄");

      const body = e.data.payload;
      const token = e.data.token || "";

      fetch("/api/admin/crm/harvester/receive-bookmarklet?token=" + encodeURIComponent(token), {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: body,
      })
        .then((r) => r.json())
        .then((result) => {
          if (result.error) {
            setIcon("❌");
            setStatus("خطأ: " + result.error);
            window.opener?.postMessage(
              { type: "harvest_result", error: result.error },
              "*"
            );
            return;
          }
          setIcon("✅");
          setStatus(
            `تم! ${result.received} إعلان (${result.new} جديد — ${result.duplicate} مكرر)`
          );
          window.opener?.postMessage(
            {
              type: "harvest_result",
              received: result.received,
              new_count: result.new,
              duplicate: result.duplicate,
              employee: result.employee,
              scope_matched: result.scope_matched,
            },
            "*"
          );
        })
        .catch((err) => {
          setIcon("❌");
          setStatus("خطأ في الاتصال: " + (err instanceof Error ? err.message : String(err)));
          window.opener?.postMessage(
            { type: "harvest_result", error: err instanceof Error ? err.message : String(err) },
            "*"
          );
        });
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
        <h2
          style={{
            fontSize: "20px",
            fontWeight: "bold",
            color: "#1B7A3D",
            marginBottom: "12px",
          }}
        >
          حصاد مكسب
        </h2>
        <p style={{ fontSize: "16px", color: "#374151", lineHeight: 1.6 }}>
          {status}
        </p>
        <p
          style={{
            fontSize: "12px",
            color: "#9ca3af",
            marginTop: "16px",
          }}
        >
          هذه النافذة هتقفل تلقائياً
        </p>
      </div>
    </div>
  );
}
