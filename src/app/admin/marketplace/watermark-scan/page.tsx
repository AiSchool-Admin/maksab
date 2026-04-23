"use client";

/**
 * Client-side watermark scanner.
 *
 * Loads tesseract.js in the browser and iterates through listings, OCR-ing
 * every image and stripping any URL whose recognized text contains a known
 * source-site watermark ("dubizzle", "semsarmasr", ...). Uses the user's
 * machine — no serverless timeouts.
 *
 * Runs in a loop: fetch batch → OCR every image → POST result → repeat.
 * User watches the progress bar, can pause anytime by closing the tab.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const WATERMARK_KEYWORDS = [
  "dubizzle", "olx",
  "semsarmasr", "سمسار",
  "aqarmap", "أقارماب", "عقارماب",
  "opensooq", "أوبن سوق", "السوق المفتوح",
  "propertyfinder", "prop finder",
];

interface PendingListing {
  id: string;
  title: string;
  platform: string;
  images: string[];
}

interface ScanLogEntry {
  listing_id: string;
  title: string;
  kept: number;
  removed: number;
  matched?: string[];
}

export default function WatermarkScanPage() {
  const [platform, setPlatform] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("جاهز — اضغط ابدأ");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [log, setLog] = useState<ScanLogEntry[]>([]);
  const [totals, setTotals] = useState({ listings: 0, kept: 0, removed: 0 });
  const workerRef = useRef<{ recognize: (b: Blob | string) => Promise<{ data: { text: string } }>; terminate: () => Promise<unknown> } | null>(null);
  const stopFlag = useRef(false);

  // Dynamically load tesseract.js once
  async function initWorker() {
    if (workerRef.current) return workerRef.current;
    setStatus("جاري تحميل محرّك OCR... (5-10 ثوان أول مرة)");
    const tesseract = await import("tesseract.js");
    const worker = await tesseract.createWorker("eng", 1, {
      logger: () => {},
    });
    workerRef.current = worker as unknown as typeof workerRef.current;
    return workerRef.current;
  }

  async function ocrImage(url: string): Promise<{ hasWatermark: boolean; matched?: string }> {
    const worker = await initWorker();
    if (!worker) return { hasWatermark: false };

    // Fetch image through our proxy (handles CORS + semsarmasr crop if any)
    const proxyUrl = "/api/img?url=" + encodeURIComponent(url);
    let blob: Blob;
    try {
      const r = await fetch(proxyUrl);
      if (!r.ok) return { hasWatermark: false };
      blob = await r.blob();
    } catch {
      return { hasWatermark: false };
    }

    try {
      const { data } = await worker.recognize(blob);
      const text = (data.text || "").toLowerCase();
      for (const kw of WATERMARK_KEYWORDS) {
        if (text.includes(kw.toLowerCase())) {
          return { hasWatermark: true, matched: kw };
        }
      }
    } catch {
      // If OCR fails, keep the image (err on the side of keeping)
    }
    return { hasWatermark: false };
  }

  async function processListing(l: PendingListing): Promise<ScanLogEntry> {
    const clean: string[] = [];
    const matched = new Set<string>();
    let removed = 0;

    for (const url of l.images) {
      if (stopFlag.current) break;
      setStatus(`يفحص: ${l.title.substring(0, 40)}... (${clean.length + removed + 1}/${l.images.length})`);
      const result = await ocrImage(url);
      if (result.hasWatermark) {
        removed++;
        if (result.matched) matched.add(result.matched);
      } else {
        clean.push(url);
      }
    }

    await fetch("/api/admin/marketplace/watermark-scan/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listing_id: l.id,
        clean_images: clean,
        removed_count: removed,
        matched_keywords: Array.from(matched),
      }),
    });

    return { listing_id: l.id, title: l.title, kept: clean.length, removed, matched: Array.from(matched) };
  }

  async function fetchBatch(): Promise<{ listings: PendingListing[]; remaining: number }> {
    const qs = new URLSearchParams({ limit: "10" });
    if (platform) qs.set("platform", platform);
    const r = await fetch(`/api/admin/marketplace/watermark-scan/next-batch?${qs}`);
    const data = await r.json();
    return { listings: data.listings || [], remaining: data.remaining || 0 };
  }

  async function runLoop() {
    if (running) return;
    setRunning(true);
    stopFlag.current = false;

    try {
      while (!stopFlag.current) {
        const batch = await fetchBatch();
        setRemaining(batch.remaining);
        if (batch.listings.length === 0) {
          setStatus("✅ تم فحص كل الإعلانات");
          break;
        }
        for (const listing of batch.listings) {
          if (stopFlag.current) break;
          const entry = await processListing(listing);
          setLog((prev) => [entry, ...prev].slice(0, 50));
          setTotals((t) => ({
            listings: t.listings + 1,
            kept: t.kept + entry.kept,
            removed: t.removed + entry.removed,
          }));
        }
      }
    } finally {
      if (workerRef.current) {
        try { await workerRef.current.terminate(); } catch { /* ignore */ }
        workerRef.current = null;
      }
      setRunning(false);
      if (stopFlag.current) setStatus("⏸️ توقف يدوياً");
    }
  }

  function stop() {
    stopFlag.current = true;
    setStatus("⏹️ إيقاف... (ينهي الإعلان الحالي)");
  }

  // Initial count
  useEffect(() => {
    fetchBatch().then((b) => setRemaining(b.remaining));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-[#1B7A3D] text-white py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-bold">مكسب 💚</Link>
          <Link href="/admin/marketplace" className="text-xs opacity-90">← لوحة السوق</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-2">🔍 فاحص العلامات المائية</h1>
        <p className="text-sm text-gray-600 mb-6">
          يفحص صور الإعلانات بالـ OCR ويشيل أي صورة عليها علامة مائية من مصدر خارجي
          (dubizzle / semsarmasr / opensooq / aqarmap). الفحص بيحصل في متصفحك مش على السيرفر
          — ممكن ياخد وقت، لكن ما فيش timeouts.
        </p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4">
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">منصة محددة (اختياري)</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              disabled={running}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">كل المنصات</option>
              <option value="dubizzle_bookmarklet">دوبيزل</option>
              <option value="semsarmasr">سمسار مصر</option>
              <option value="aqarmap">أقارماب</option>
              <option value="opensooq">أوبن سوق</option>
            </select>
          </div>

          <div className="flex items-center gap-3 mb-3">
            {!running ? (
              <button
                onClick={runLoop}
                className="px-6 py-3 bg-[#1B7A3D] text-white rounded-xl font-bold text-sm hover:bg-[#145C2E]"
              >
                ▶️ ابدأ الفحص
              </button>
            ) : (
              <button
                onClick={stop}
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700"
              >
                ⏹️ أوقف
              </button>
            )}
            {remaining !== null && (
              <span className="text-sm text-gray-600">
                باقي: <b className="text-gray-900">{remaining.toLocaleString()}</b> إعلان
              </span>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700">
            <p className="font-bold mb-1">{status}</p>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div><span className="text-gray-500">إعلانات مفحوصة:</span> <b>{totals.listings}</b></div>
              <div className="text-green-700"><span className="text-gray-500">صور نظيفة:</span> <b>{totals.kept}</b></div>
              <div className="text-red-700"><span className="text-gray-500">صور مشالة:</span> <b>{totals.removed}</b></div>
            </div>
          </div>
        </div>

        {log.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-3">آخر 50 إعلان مفحوص</h2>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {log.map((e, i) => (
                <div key={i} className="text-xs flex items-center gap-2 py-1 border-b border-gray-100 last:border-0">
                  <span className="text-green-600 font-mono w-8">+{e.kept}</span>
                  <span className="text-red-600 font-mono w-8">-{e.removed}</span>
                  <span className="flex-1 text-gray-700 truncate">{e.title}</span>
                  {e.matched && e.matched.length > 0 && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                      {e.matched.join(", ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-xs text-yellow-900">
          <p className="font-bold mb-1">💡 ملاحظات:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>أول مرة بتحمّل محرّك OCR (~5-10 ثوان + 12MB). المرات اللي بعدها من الـ cache.</li>
            <li>كل صورة بتاخد 2-5 ثوان. 100 إعلان فيه 200 صورة = ~10 دقائق.</li>
            <li>سيب الـ tab مفتوح. لو قفلته، تقدر تكمل بعدين من نفس المكان.</li>
            <li>الدقة ~80% — ممكن false positives (لو مبنى مكتوب عليه نص إنجليزي).</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
