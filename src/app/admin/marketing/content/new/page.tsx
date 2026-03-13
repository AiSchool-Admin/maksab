"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Copy,
  Save,
  RefreshCw,
  Pencil,
  Loader2,
  ArrowRight,
  Check,
} from "lucide-react";

const contentTypes = [
  { id: "facebook", label: "بوست فيسبوك", icon: "📘" },
  { id: "instagram", label: "ستوري إنستا", icon: "📸" },
  { id: "tweet", label: "تغريدة", icon: "🐦" },
  { id: "seo", label: "مقال SEO", icon: "🔍" },
  { id: "ad_desc", label: "وصف إعلان", icon: "📝" },
  { id: "marketing_msg", label: "رسالة تسويقية", icon: "💬" },
];

const styles = [
  { id: "serious", label: "جدي" },
  { id: "fun", label: "مرح" },
  { id: "educational", label: "تعليمي" },
  { id: "success_story", label: "قصة نجاح" },
];

const audiences = [
  { id: "sellers", label: "بائعين" },
  { id: "buyers", label: "مشترين" },
  { id: "all", label: "الكل" },
];

export default function NewContentPage() {
  const [selectedType, setSelectedType] = useState("facebook");
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("fun");
  const [audience, setAudience] = useState("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("اكتب الموضوع الأول");
      return;
    }
    setIsGenerating(true);
    setIsEditing(false);
    setError("");

    // TODO: Replace with real AI API call when Claude/OpenAI API is integrated
    // For now, show a message that AI content generation is not configured yet
    setTimeout(() => {
      setGeneratedContent("");
      setError("خدمة توليد المحتوى بالـ AI غير مفعّلة بعد. سيتم تفعيلها قريباً.");
      setIsGenerating(false);
    }, 1500);
  };

  const handleCopy = async () => {
    if (!generatedContent) return;
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/marketing/content"
          className="p-2 text-gray-400 hover:text-dark hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowRight size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-dark flex items-center gap-2">
            <Sparkles size={24} className="text-[#D4A843]" />
            إنشاء محتوى بالذكاء الاصطناعي
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            اختار النوع والأسلوب وخلّي الـ AI يكتبلك المحتوى
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Settings */}
        <div className="space-y-5">
          {/* Content Type */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <label className="text-sm font-bold text-dark block mb-3">نوع المحتوى</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {contentTypes.map((ct) => (
                <button
                  key={ct.id}
                  onClick={() => setSelectedType(ct.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    selectedType === ct.id
                      ? "border-[#1B7A3D] bg-[#E8F5E9] text-[#1B7A3D]"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span>{ct.icon}</span>
                  {ct.label}
                </button>
              ))}
            </div>
          </div>

          {/* Topic */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <label className="text-sm font-bold text-dark block mb-3">الموضوع</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="مثلاً: بيع الموبايلات المستعملة على مكسب..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#1B7A3D] focus:ring-1 focus:ring-[#1B7A3D] placeholder:text-gray-400"
            />
          </div>

          {/* Style */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <label className="text-sm font-bold text-dark block mb-3">أسلوب الكتابة</label>
            <div className="flex flex-wrap gap-2">
              {styles.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                    style === s.id
                      ? "border-[#1B7A3D] bg-[#1B7A3D] text-white"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audience */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <label className="text-sm font-bold text-dark block mb-3">الجمهور المستهدف</label>
            <div className="flex flex-wrap gap-2">
              {audiences.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAudience(a.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                    audience === a.id
                      ? "border-[#D4A843] bg-[#FFF8E1] text-[#D4A843]"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 bg-[#1B7A3D] text-white px-6 py-3.5 rounded-xl text-sm font-bold hover:bg-[#145C2E] transition-colors disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                جاري الكتابة بالـ AI...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                اكتب بالـ AI
              </>
            )}
          </button>
        </div>

        {/* Right: Result */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-dark">المحتوى المُولَّد</h3>
              {generatedContent && (
                <span className="text-xs text-gray-400">
                  {contentTypes.find((ct) => ct.id === selectedType)?.icon}{" "}
                  {contentTypes.find((ct) => ct.id === selectedType)?.label}
                </span>
              )}
            </div>
            <div className="p-5">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Loader2 size={32} className="animate-spin mb-3 text-[#1B7A3D]" />
                  <p className="text-sm font-medium">الـ AI بيكتب المحتوى...</p>
                  <p className="text-xs mt-1">ثواني وهيكون جاهز</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Sparkles size={32} className="mb-3 text-yellow-400" />
                  <p className="text-sm font-medium text-gray-600">{error}</p>
                </div>
              ) : generatedContent ? (
                isEditing ? (
                  <textarea
                    value={generatedContent}
                    onChange={(e) => setGeneratedContent(e.target.value)}
                    className="w-full h-80 px-4 py-3 rounded-xl border border-gray-200 text-sm leading-relaxed focus:outline-none focus:border-[#1B7A3D] focus:ring-1 focus:ring-[#1B7A3D] resize-none"
                    dir="rtl"
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm text-dark leading-relaxed bg-gray-50 rounded-xl p-4 min-h-[200px]">
                    {generatedContent}
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Sparkles size={32} className="mb-3" />
                  <p className="text-sm font-medium">اختار الإعدادات واضغط &ldquo;اكتب بالـ AI&rdquo;</p>
                  <p className="text-xs mt-1">المحتوى هيظهر هنا</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {generatedContent && !isGenerating && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                {copied ? "تم النسخ!" : "نسخ"}
              </button>
              <button
                onClick={handleSave}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {saved ? <Check size={16} className="text-green-600" /> : <Save size={16} />}
                {saved ? "تم الحفظ!" : "حفظ مسودة"}
              </button>
              <button
                onClick={handleGenerate}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RefreshCw size={16} />
                إعادة كتابة
              </button>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  isEditing
                    ? "bg-[#1B7A3D] text-white border-[#1B7A3D]"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Pencil size={16} />
                {isEditing ? "تم التعديل" : "تعديل يدوي"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
