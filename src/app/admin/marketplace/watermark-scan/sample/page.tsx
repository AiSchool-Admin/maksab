"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SampleItem {
  id: string;
  title: string;
  platform: string;
  source_url: string | null;
  images: string[];
  removed_count: number;
  matched_keywords: string[];
  checked_at: string | null;
}

interface SampleResponse {
  sample: SampleItem[];
  totals: { checked: number; with_removals: number; total_listings: number };
  keyword_distribution: Record<string, number>;
}

export default function WatermarkScanSamplePage() {
  const [data, setData] = useState<SampleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlyRemoved, setOnlyRemoved] = useState(true);
  const [random, setRandom] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        limit: "5",
        only_removed: onlyRemoved ? "1" : "0",
        random: random ? "1" : "0",
      });
      const r = await fetch(`/api/admin/marketplace/watermark-scan/sample?${qs}`);
      const j = await r.json();
      if (!r.ok || j.error) {
        setError(j.error || `HTTP ${r.status}`);
        setData(null);
      } else if (!j.sample || !j.totals) {
        setError("Invalid response shape: " + JSON.stringify(j).slice(0, 200));
        setData(null);
      } else {
        setData(j);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [onlyRemoved, random]);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-[#1B7A3D] text-white py-4 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-bold">مكسب 💚</Link>
          <Link href="/admin/marketplace/watermark-scan" className="text-xs opacity-90">← الفاحص</Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-2">🔎 عيّنة نتائج الفحص</h1>
        <p className="text-sm text-gray-600 mb-4">
          عاين صور الإعلانات اللي اتفلترت. لو شوفت أي صورة فيها علامة مائية لسه موجودة → false negative.
          الصور المشالة مش متحفظة في DB (لأن الـ scan بيستبدل القايمة).
        </p>

        {data && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="text-gray-500">إجمالي مفحوص</div>
                <div className="text-2xl font-bold text-gray-900">{data.totals.checked.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="text-gray-500">إعلانات اتشال منها صور</div>
                <div className="text-2xl font-bold text-red-700">{data.totals.with_removals.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="text-gray-500">نسبة التأثير</div>
                <div className="text-2xl font-bold text-amber-700">
                  {data.totals.checked > 0
                    ? Math.round((data.totals.with_removals / data.totals.checked) * 100)
                    : 0}%
                </div>
              </div>
            </div>
            {Object.keys(data.keyword_distribution).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                <h3 className="text-sm font-bold mb-2 text-gray-800">🔍 توزيع الكلمات اللي اتلقت</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data.keyword_distribution)
                    .sort(([, a], [, b]) => b - a)
                    .map(([kw, count]) => (
                      <span
                        key={kw}
                        className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200"
                      >
                        {kw} <b>×{count}</b>
                      </span>
                    ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-4 items-center text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyRemoved}
              onChange={(e) => setOnlyRemoved(e.target.checked)}
            />
            <span>إعلانات اللي اتشال منها صور بس</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={random}
              onChange={(e) => setRandom(e.target.checked)}
            />
            <span>عشوائي</span>
          </label>
          <button
            onClick={load}
            disabled={loading}
            className="mr-auto px-4 py-1.5 bg-[#1B7A3D] text-white rounded-lg font-bold hover:bg-[#145C2E] disabled:opacity-50"
          >
            {loading ? "⏳ جاري..." : "🔄 عيّنة جديدة"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-900 mb-4">
            <p className="font-bold mb-1">❌ حصل خطأ:</p>
            <pre className="text-xs overflow-auto whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        {loading && <div className="text-center text-gray-500 py-12">جاري التحميل...</div>}

        {!loading && data && data.sample.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center text-sm text-yellow-900">
            مفيش إعلانات تطابق الفلاتر دي.
          </div>
        )}

        {!loading && data && (
          <div className="space-y-4">
            {data.sample.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-sm text-gray-900 mb-1">{item.title}</h3>
                      <div className="flex flex-wrap gap-2 items-center text-xs">
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          {item.platform}
                        </span>
                        <span className="text-green-700">
                          ✓ محتفظ: <b>{item.images.length}</b>
                        </span>
                        <span className="text-red-700">
                          ✗ مشال: <b>{item.removed_count}</b>
                        </span>
                        {item.matched_keywords.length > 0 && (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                            🔍 {item.matched_keywords.join(", ")}
                          </span>
                        )}
                        {item.source_url && (
                          <a
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline mr-auto"
                          >
                            المصدر ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  {item.images.length === 0 ? (
                    <div className="text-center text-xs text-gray-500 py-4">
                      ⚠️ كل الصور اتشالت — محتاج retry harvest
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-2">
                      {item.images.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-square rounded-lg overflow-hidden bg-gray-100 hover:ring-2 hover:ring-[#1B7A3D] relative"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/img?url=${encodeURIComponent(url)}`}
                            alt={`صورة ${i + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">
                            {i + 1}
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900">
          <p className="font-bold mb-1">💡 كيف تعاين:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>دوس على أي صورة تفتحها full-size في tab جديدة.</li>
            <li>لو شوفت علامة مائية في أي صورة → كده الـ OCR معدّاها (false negative).</li>
            <li>الـ badge الأصفر بيقولك أنهي كلمات الـ Tesseract اتعرف عليها.</li>
            <li>دوس &quot;المصدر&quot; تقارن بالصور الأصلية على المنصة.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
