"use client";

/**
 * Admin page for running the watermark cleaning pipeline.
 *
 * Iterates in batches of 5 listings, calling /api/admin/marketplace/clean-images
 * which runs IOPaint (primary) or Replicate (fallback) on each image, stores
 * the cleaned result in Supabase Storage, and replaces URLs in the DB.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface CleanResult {
  listing_id: string;
  original_count: number;
  cleaned_count: number;
  errors: string[];
  provider_counts: Record<string, number>;
}

interface Status {
  platform: string;
  cleaned: number;
  pending: number;
  total: number;
  iopaint_configured: boolean;
  replicate_configured: boolean;
}

export default function CleanImagesPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [running, setRunning] = useState(false);
  const [stopFlag, setStopFlag] = useState(false);
  const [log, setLog] = useState<CleanResult[]>([]);
  const [totals, setTotals] = useState({ listings: 0, images: 0, errors: 0, providers: {} as Record<string, number> });
  const [msg, setMsg] = useState("جاهز — اضغط ابدأ");
  const stopRef = useRef(false);

  async function refreshStatus() {
    const r = await fetch("/api/admin/marketplace/clean-images");
    const j = await r.json();
    if (r.ok) setStatus(j);
  }

  useEffect(() => { refreshStatus(); }, []);

  async function runLoop() {
    if (running) return;
    setRunning(true);
    stopRef.current = false;
    setStopFlag(false);
    setMsg("🎨 جاري التنظيف...");

    try {
      let consecutiveEmpty = 0;
      while (!stopRef.current) {
        const r = await fetch("/api/admin/marketplace/clean-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 3 }),
        });
        const j = await r.json();

        if (!r.ok) {
          setMsg(`❌ ${j.error || `HTTP ${r.status}`}`);
          break;
        }

        const results: CleanResult[] = j.results || [];
        if (results.length === 0) {
          consecutiveEmpty++;
          if (consecutiveEmpty >= 2) {
            setMsg("✅ تم تنظيف كل الإعلانات");
            break;
          }
          continue;
        }
        consecutiveEmpty = 0;

        setLog((prev) => [...results.reverse(), ...prev].slice(0, 80));
        setTotals((t) => {
          const providers = { ...t.providers };
          let images = 0;
          let errors = 0;
          for (const r of results) {
            images += r.cleaned_count;
            errors += r.errors.length;
            for (const [p, c] of Object.entries(r.provider_counts)) {
              providers[p] = (providers[p] || 0) + c;
            }
          }
          return {
            listings: t.listings + results.length,
            images: t.images + images,
            errors: t.errors + errors,
            providers,
          };
        });
        setMsg(`🧹 ${results.length} إعلان اتنظّف. متبقي ${j.remaining}`);
        await refreshStatus();
      }
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(false);
    }
  }

  function stop() {
    stopRef.current = true;
    setStopFlag(true);
    setMsg("⏹️ إيقاف...");
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-[#1B7A3D] text-white py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-bold">مكسب 💚</Link>
          <Link href="/admin/marketplace" className="text-xs opacity-90">← لوحة السوق</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-2">🎨 منظّف الصور — LaMa Inpainting</h1>
        <p className="text-sm text-gray-600 mb-4">
          بيشيل لوجو dubizzle من صور الإعلانات باستخدام LaMa (AI inpainting).
          الأولوية لـ IOPaint (Self-hosted على Railway — مجاني بالكامل)، ولو فشل
          بيرجع لـ Replicate (فيه $5 رصيد مجاني شهري).
        </p>

        {status && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 text-xs">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <div className="text-gray-500">منظّف</div>
                <div className="text-xl font-bold text-green-700">{status.cleaned}</div>
              </div>
              <div>
                <div className="text-gray-500">منتظر</div>
                <div className="text-xl font-bold text-amber-700">{status.pending}</div>
              </div>
              <div>
                <div className="text-gray-500">إجمالي</div>
                <div className="text-xl font-bold text-gray-900">{status.total}</div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${status.iopaint_configured ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                IOPaint {status.iopaint_configured ? "✓" : "✗"}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${status.replicate_configured ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                Replicate {status.replicate_configured ? "✓" : "✗"}
              </span>
            </div>
          </div>
        )}

        {status && !status.iopaint_configured && !status.replicate_configured && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-900 mb-4">
            <p className="font-bold mb-2">⚠️ مفيش provider مُفعّل</p>
            <p className="mb-2">لازم تضبط واحد من دول على الأقل في Vercel Environment Variables:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><code className="bg-white px-1 rounded">IOPAINT_URL</code> — الـ URL بتاع IOPaint على Railway (مثلاً <code>https://iopaint-xyz.up.railway.app</code>)</li>
              <li><code className="bg-white px-1 rounded">REPLICATE_API_TOKEN</code> — من <a className="underline" href="https://replicate.com/account/api-tokens" target="_blank" rel="noreferrer">replicate.com/account/api-tokens</a></li>
            </ul>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4">
          <div className="flex items-center gap-3 flex-wrap mb-3">
            {!running ? (
              <button
                onClick={runLoop}
                disabled={status ? (!status.iopaint_configured && !status.replicate_configured) : true}
                className="px-6 py-3 bg-[#1B7A3D] text-white rounded-xl font-bold text-sm hover:bg-[#145C2E] disabled:opacity-50"
              >
                ▶️ ابدأ التنظيف
              </button>
            ) : (
              <button
                onClick={stop}
                disabled={stopFlag}
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-50"
              >
                ⏹️ أوقف
              </button>
            )}
            <Link
              href="/admin/marketplace/watermark-preview"
              className="px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50"
            >
              🔎 عاين نتائج
            </Link>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700">
            <p className="font-bold mb-2">{msg}</p>
            <div className="grid grid-cols-4 gap-2">
              <div><span className="text-gray-500">إعلان:</span> <b>{totals.listings}</b></div>
              <div className="text-green-700"><span className="text-gray-500">صور نظيفة:</span> <b>{totals.images}</b></div>
              <div className="text-red-700"><span className="text-gray-500">أخطاء:</span> <b>{totals.errors}</b></div>
              <div className="text-xs">
                {Object.entries(totals.providers).map(([p, c]) => (
                  <span key={p} className="inline-block bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded ml-1">
                    {p}: <b>{c}</b>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {log.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-3">آخر 80 إعلان</h2>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {log.map((e, i) => (
                <div key={`${e.listing_id}-${i}`} className="text-xs flex items-center gap-2 py-1 border-b border-gray-100 last:border-0">
                  <span className="text-green-600 font-mono w-12">+{e.cleaned_count}/{e.original_count}</span>
                  <span className="text-gray-500 font-mono text-[10px]">{e.listing_id.slice(0, 8)}</span>
                  <span className="flex-1 text-gray-700 text-[10px]">
                    {Object.entries(e.provider_counts).map(([p, c]) => `${p}:${c}`).join(", ") || "-"}
                  </span>
                  {e.errors.length > 0 && (
                    <span className="text-[10px] text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                      ✗{e.errors.length}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900">
          <p className="font-bold mb-1">💡 الاستراتيجية:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>أقصى 3 صور لكل إعلان → ~30,000 صورة إجمالي لـ 10k إعلان</li>
            <li>IOPaint على Railway ($5/شهر) → unlimited</li>
            <li>Replicate كـ fallback → $5 رصيد مجاني شهري = ~5000 صورة</li>
            <li>كل النتائج بتتحفظ في Supabase Storage (bucket: <code>cleaned-images</code>)</li>
            <li>الصور اللي مفيهاش watermark بتتحفظ برضه (WebP مضغوط)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
