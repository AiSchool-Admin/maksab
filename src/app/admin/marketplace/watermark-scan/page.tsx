"use client";

/**
 * Client-side watermark scanner.
 *
 * Detects source-site watermarks in listing images by scanning pixel color
 * signatures in the 4 corners of each image. OCR was unreliable on stylized
 * logos — color-based detection is faster and more accurate for known
 * watermarks. Currently detects:
 *   - dubizzle: orange-red flame icon + dark gray "dubizzle" text
 *
 * Runs in a loop: fetch batch → detect per image → POST result → repeat.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

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

// Enable debug logging for first N images per listing
const DEBUG_FIRST_N = 3;

export default function WatermarkScanPage() {
  const [platform, setPlatform] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("جاهز — اضغط ابدأ");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [log, setLog] = useState<ScanLogEntry[]>([]);
  const [totals, setTotals] = useState({ listings: 0, kept: 0, removed: 0 });
  const stopFlag = useRef(false);
  const debugCountRef = useRef(0);

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

  /**
   * Dubizzle flame color signature: red-orange dot on the "i".
   * Approximate hex: #E04B1F–#F37030. Very distinctive — rarely appears
   * in concentrated clusters in real estate photos.
   */
  function isDubizzleFlame(r: number, g: number, b: number): boolean {
    return (
      r >= 180 && r <= 255 &&
      g >= 30 && g <= 130 &&
      b >= 10 && b <= 100 &&
      r - g >= 70 &&
      r - b >= 100
    );
  }

  /** Dubizzle text color: dark charcoal gray (R≈G≈B, mid-low value). */
  function isDubizzleGrayText(r: number, g: number, b: number): boolean {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return (max - min) <= 25 && max >= 30 && max <= 130;
  }

  interface CornerStats {
    flameRatio: number;
    grayRatio: number;
  }

  function analyzeCorner(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
  ): CornerStats {
    const imgData = ctx.getImageData(x, y, w, h).data;
    const total = imgData.length / 4;
    let flame = 0;
    let gray = 0;
    for (let i = 0; i < imgData.length; i += 4) {
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];
      if (isDubizzleFlame(r, g, b)) flame++;
      if (isDubizzleGrayText(r, g, b)) gray++;
    }
    return { flameRatio: flame / total, grayRatio: gray / total };
  }

  async function detectWatermark(url: string): Promise<{ hasWatermark: boolean; matched?: string }> {
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
    if (W < 80 || H < 80) return { hasWatermark: false };

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { hasWatermark: false };
    ctx.drawImage(img, 0, 0);

    // Corner size: 30% wide × 22% tall — large enough to fit the logo
    const cornerW = Math.round(W * 0.3);
    const cornerH = Math.round(H * 0.22);
    const corners: Array<{ name: string; x: number; y: number }> = [
      { name: "TL", x: 0, y: 0 },
      { name: "TR", x: W - cornerW, y: 0 },
      { name: "BL", x: 0, y: H - cornerH },
      { name: "BR", x: W - cornerW, y: H - cornerH },
    ];

    const shouldDebug = debugCountRef.current < DEBUG_FIRST_N;
    if (shouldDebug) debugCountRef.current++;

    for (const c of corners) {
      const stats = analyzeCorner(ctx, c.x, c.y, cornerW, cornerH);
      if (shouldDebug) {
        console.log(
          `[wm-scan] ${url.slice(-60)} ${c.name}: flame=${(stats.flameRatio * 100).toFixed(3)}% gray=${(stats.grayRatio * 100).toFixed(2)}%`,
        );
      }
      // Dubizzle logo signature:
      //   • flame icon: 0.15% - 4% of corner (small orange dot)
      //   • gray text:  ≥ 1.5% (the "dubizzle" word)
      if (stats.flameRatio >= 0.0015 && stats.flameRatio <= 0.04 && stats.grayRatio >= 0.015) {
        return { hasWatermark: true, matched: `dubizzle@${c.name}` };
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
      const result = await detectWatermark(url);
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
    debugCountRef.current = 0;
    setStatus("🎨 بيفحص بالبكسلات...");

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
      setRunning(false);
      if (stopFlag.current) setStatus("⏸️ توقف يدوياً");
    }
  }

  function stop() {
    stopFlag.current = true;
    setStatus("⏹️ إيقاف... (ينهي الإعلان الحالي)");
  }

  async function resetScans() {
    if (!confirm("هيمسح علامة الفحص من كل الإعلانات عشان نعيد الفحص بكشف الألوان. الصور اللي اتشالت قبل كده مش هترجع. تأكيد؟")) return;
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
          يفحص صور الإعلانات بالبكسلات ويشيل أي صورة فيها لوجو dubizzle.
          كشف باللون: الفلامة البرتقالية لـ dubizzle لونها مميز (~#E04B1F) ونادراً بيظهر بتركيز
          في صور العقارات. أسرع وأدق من OCR على اللوجوهات المُنمّقة.
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
            <li>مفيش محرّك OCR — بيشتغل بكشف الألوان فقط (أسرع بكتير).</li>
            <li>كل صورة ~0.2-1 ثانية. 100 إعلان فيه 800 صورة = ~3-5 دقائق.</li>
            <li>دلوقتي بيكشف dubizzle فقط. لو محتاج semsarmasr/aqarmap/opensooq، قولي.</li>
            <li>أول 3 صور بتطبع debug info في Console (F12) عشان نتأكد من الكشف.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
