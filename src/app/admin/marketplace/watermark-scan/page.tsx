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

/**
 * OCR mangles stylized logos. We match on short distinctive fragments that
 * survive typical OCR mistakes ("dubizzle" → "duhizzle" still contains "zzle").
 * Min 4 chars so we don't false-positive on ordinary words.
 */
const WATERMARK_FRAGMENTS: { fragment: string; keyword: string }[] = [
  // dubizzle: distinctive "zzle" + "bizz" + "ubiz"
  { fragment: "zzle", keyword: "dubizzle" },
  { fragment: "bizz", keyword: "dubizzle" },
  { fragment: "ubiz", keyword: "dubizzle" },
  { fragment: "dubi", keyword: "dubizzle" },
  // semsarmasr
  { fragment: "emsar", keyword: "semsarmasr" },
  { fragment: "smsar", keyword: "semsarmasr" },
  { fragment: "سمسار", keyword: "semsarmasr" },
  // aqarmap
  { fragment: "aqar", keyword: "aqarmap" },
  { fragment: "qarma", keyword: "aqarmap" },
  { fragment: "عقار", keyword: "aqarmap" },
  { fragment: "أقار", keyword: "aqarmap" },
  // opensooq
  { fragment: "opens", keyword: "opensooq" },
  { fragment: "nsooq", keyword: "opensooq" },
  { fragment: "sooq", keyword: "opensooq" },
  { fragment: "السوق", keyword: "opensooq" },
  // propertyfinder
  { fragment: "proper", keyword: "propertyfinder" },
  { fragment: "finder", keyword: "propertyfinder" },
  // OLX
  { fragment: " olx", keyword: "olx" },
  { fragment: "olx ", keyword: "olx" },
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
    try {
      const tesseract = await import("tesseract.js");
      const worker = await tesseract.createWorker("eng", 1, {
        logger: (m: { status?: string; progress?: number }) => {
          if (m.status) {
            const pct = m.progress ? ` (${Math.round(m.progress * 100)}%)` : "";
            setStatus(`تحميل OCR: ${m.status}${pct}`);
          }
        },
      });
      workerRef.current = worker as unknown as typeof workerRef.current;
      setStatus("✓ محرّك OCR جاهز");
      return workerRef.current;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`❌ فشل تحميل OCR: ${msg}. افتح Console (F12) لتفاصيل أكثر`);
      console.error("[watermark-scan] tesseract init failed:", err);
      throw err;
    }
  }

  // Load image blob into an HTMLImageElement
  async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
      img.src = url;
    });
  }

  // Crop a region and scale it up via canvas; returns a Blob
  function cropAndScale(img: HTMLImageElement, x: number, y: number, w: number, h: number, scale: number): Promise<Blob | null> {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => resolve(b), "image/png");
    });
  }

  function matchesWatermark(text: string): string | null {
    const lower = text.toLowerCase();
    // Try exact keyword first (high-confidence)
    for (const kw of WATERMARK_KEYWORDS) {
      if (lower.includes(kw.toLowerCase())) return kw;
    }
    // Fall back to fragment matching (catches OCR-mangled logos)
    for (const { fragment, keyword } of WATERMARK_FRAGMENTS) {
      if (lower.includes(fragment.toLowerCase())) return keyword;
    }
    return null;
  }

  async function ocrImage(url: string): Promise<{ hasWatermark: boolean; matched?: string }> {
    const worker = await initWorker();
    if (!worker) return { hasWatermark: false };

    // Fetch image through our proxy (handles CORS + any platform-specific crop)
    const proxyUrl = "/api/img?url=" + encodeURIComponent(url);
    let blob: Blob;
    try {
      const r = await fetch(proxyUrl);
      if (!r.ok) return { hasWatermark: false };
      blob = await r.blob();
    } catch {
      return { hasWatermark: false };
    }

    let img: HTMLImageElement;
    try {
      img = await blobToImage(blob);
    } catch {
      return { hasWatermark: false };
    }

    const W = img.naturalWidth || img.width;
    const H = img.naturalHeight || img.height;
    if (W < 50 || H < 50) return { hasWatermark: false };

    // OCR targets:
    //  1. 4 corners (30% × 25%) scaled 3x — watermarks usually live here
    //  2. Full image (just in case it's a centered overlay)
    const cornerW = Math.round(W * 0.3);
    const cornerH = Math.round(H * 0.25);
    const regions: Array<{ name: string; x: number; y: number; w: number; h: number; scale: number }> = [
      { name: "TL", x: 0, y: 0, w: cornerW, h: cornerH, scale: 3 },
      { name: "TR", x: W - cornerW, y: 0, w: cornerW, h: cornerH, scale: 3 },
      { name: "BL", x: 0, y: H - cornerH, w: cornerW, h: cornerH, scale: 3 },
      { name: "BR", x: W - cornerW, y: H - cornerH, w: cornerW, h: cornerH, scale: 3 },
      { name: "FULL", x: 0, y: 0, w: W, h: H, scale: 1 },
    ];

    for (const region of regions) {
      const cropped = await cropAndScale(img, region.x, region.y, region.w, region.h, region.scale);
      if (!cropped) continue;
      try {
        const { data } = await worker.recognize(cropped);
        const text = data.text || "";
        const matched = matchesWatermark(text);
        if (matched) {
          return { hasWatermark: true, matched };
        }
      } catch {
        // Keep trying other regions
      }
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

  async function resetScans() {
    if (!confirm("هيمسح علامة الفحص من كل الإعلانات عشان نعيد الفحص بمحرّك OCR أدق. الصور اللي اتشالت قبل كده مش هترجع. تأكيد؟")) return;
    setStatus("🔄 جاري مسح علامات الفحص...");
    try {
      const r = await fetch("/api/admin/marketplace/watermark-scan/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: platform || undefined }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setStatus(`✅ تم مسح ${j.cleared} علامة. اضغط "ابدأ الفحص" لإعادة الفحص.`);
      setTotals({ listings: 0, kept: 0, removed: 0 });
      setLog([]);
      const batch = await fetchBatch();
      setRemaining(batch.remaining);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`❌ فشل المسح: ${msg}`);
    }
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

          <div className="flex items-center gap-3 mb-3 flex-wrap">
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
            <button
              onClick={resetScans}
              disabled={running}
              className="px-4 py-3 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 disabled:opacity-50"
              title="يمسح علامة الفحص عشان نعيد الفحص على الإعلانات اللي اتفحصت قبل كده"
            >
              🔄 إعادة فحص الكل
            </button>
            <Link
              href="/admin/marketplace/watermark-scan/sample"
              className="px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50"
            >
              🔎 عاين العينة
            </Link>
            {remaining !== null && (
              <span className="text-sm text-gray-600 mr-auto">
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
