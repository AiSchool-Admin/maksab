"use client";

/**
 * Side-by-side preview of watermark inpainting.
 *
 * Pulls a random sample of Dubizzle images from the DB and shows:
 *   left  = original (direct from source CDN)
 *   right = cleaned (through /api/img which detects + mirror-inpaints)
 *
 * Used to verify that the server-side inpainting actually removes the
 * dubizzle flame logo before we trust it across 10k listings.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

interface SampleImg {
  listing_id: string;
  title: string;
  original_url: string;
}

export default function WatermarkPreviewPage() {
  const [images, setImages] = useState<SampleImg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/marketplace/watermark-preview/sample?limit=10");
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
      setImages(j.images || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-[#1B7A3D] text-white py-4 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-bold">مكسب 💚</Link>
          <Link href="/admin/marketplace/watermark-scan" className="text-xs opacity-90">← الفاحص</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-2">🎨 مقارنة: قبل/بعد إزالة العلامة</h1>
        <p className="text-sm text-gray-600 mb-4">
          اليسار = الأصل من dubizzle.com (فيه اللوجو). <br />
          اليمين = من <code className="bg-gray-100 px-1 rounded">/api/img</code> (اللوجو المفروض يتقلب بـ mirror inpaint من الركن المقابل).
        </p>

        <button
          onClick={load}
          disabled={loading}
          className="mb-4 px-5 py-2 bg-[#1B7A3D] text-white rounded-xl font-bold text-sm hover:bg-[#145C2E] disabled:opacity-50"
        >
          {loading ? "⏳ تحميل..." : "🔄 جيب عينة جديدة"}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-900 mb-4">
            <p className="font-bold mb-1">❌ خطأ:</p>
            <pre className="text-xs whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        {loading && <div className="text-center text-gray-500 py-12">جاري التحميل...</div>}

        {!loading && images.length === 0 && !error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center text-sm text-yellow-900">
            مفيش صور dubizzle في الـ DB.
          </div>
        )}

        <div className="space-y-4">
          {images.map((img, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100 text-xs text-gray-600">
                <b className="text-gray-900">#{i + 1}</b> — {img.title}
              </div>
              <div className="grid grid-cols-2">
                <div className="border-l border-gray-200">
                  <div className="text-xs font-bold text-red-700 p-2 bg-red-50">
                    الأصل (معلام)
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.original_url}
                    alt="original"
                    className="w-full h-auto block"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-green-700 p-2 bg-green-50">
                    بعد المعالجة
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/img?url=${encodeURIComponent(img.original_url)}`}
                    alt="cleaned"
                    className="w-full h-auto block"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
