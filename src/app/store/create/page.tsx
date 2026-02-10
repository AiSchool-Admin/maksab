"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Store, Palette, MapPin, Check } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import Button from "@/components/ui/Button";
import { categoriesConfig } from "@/lib/categories/categories-config";
import { governorates } from "@/lib/data/governorates";
import toast from "react-hot-toast";

const steps = [
  { id: 1, title: "الأساسيات", icon: <Store size={18} /> },
  { id: 2, title: "المظهر", icon: <Palette size={18} /> },
  { id: 3, title: "الموقع", icon: <MapPin size={18} /> },
];

const themes = [
  { value: "classic", label: "كلاسيك", icon: "🏛️", desc: "تصميم بسيط وأنيق" },
  { value: "modern", label: "حديث", icon: "✨", desc: "تصميم عصري ومتطور" },
  { value: "elegant", label: "أنيق", icon: "💎", desc: "تصميم فاخر وراقي" },
  { value: "sporty", label: "رياضي", icon: "⚡", desc: "تصميم حيوي ونشيط" },
];

const layouts = [
  { value: "grid", label: "شبكة", icon: "⊞", desc: "عرض المنتجات في شبكة" },
  { value: "list", label: "قائمة", icon: "☰", desc: "عرض المنتجات في قائمة" },
  { value: "showcase", label: "عرض مميز", icon: "🖼️", desc: "إبراز المنتجات المميزة" },
];

export default function CreateStorePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  // Step 1: Basics
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mainCategory, setMainCategory] = useState("");

  // Step 2: Appearance
  const [theme, setTheme] = useState("classic");
  const [layout, setLayout] = useState("grid");
  const [primaryColor, setPrimaryColor] = useState("#1B7A3D");
  const [secondaryColor, setSecondaryColor] = useState("#145C2E");

  // Step 3: Location
  const [locationGov, setLocationGov] = useState("");
  const [locationArea, setLocationArea] = useState("");
  const [phone, setPhone] = useState("");

  const canProceed = () => {
    if (step === 1) return name.trim().length >= 2 && mainCategory;
    if (step === 2) return true;
    if (step === 3) return true;
    return false;
  };

  const handleCreate = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setIsCreating(true);

    try {
      const res = await fetch("/api/stores/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          main_category: mainCategory,
          theme,
          layout,
          primary_color: primaryColor,
          secondary_color: secondaryColor || null,
          location_gov: locationGov || null,
          location_area: locationArea || null,
          phone: phone || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "حصل مشكلة، جرب تاني");
        setIsCreating(false);
        return;
      }

      toast.success("تم إنشاء متجرك بنجاح! 🎉");
      router.push(`/store/${data.slug}`);
    } catch {
      toast.error("حصل مشكلة في الشبكة، جرب تاني");
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-light px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1">
          <ArrowRight size={20} />
        </button>
        <h1 className="text-base font-bold text-dark">إنشاء متجر جديد</h1>
      </header>

      {/* Step indicator */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    step >= s.id
                      ? "bg-brand-green text-white"
                      : "bg-gray-100 text-gray-text"
                  }`}
                >
                  {step > s.id ? <Check size={18} /> : s.icon}
                </div>
                <span className="text-[10px] text-gray-text mt-1">
                  {s.title}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded-full ${
                    step > s.id ? "bg-brand-green" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="px-4 mt-6">
        {/* Step 1: Basics */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <span className="text-4xl">🏪</span>
              <h2 className="text-lg font-bold text-dark mt-2">
                ابدأ متجرك في مكسب
              </h2>
              <p className="text-sm text-gray-text">
                اختار اسم وقسم لمتجرك
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-dark mb-1.5 block">
                اسم المتجر *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-gray-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-green"
                placeholder="مثال: موبايلات أحمد"
                maxLength={30}
              />
              <p className="text-[10px] text-gray-text text-left mt-1">
                {name.length}/30
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-dark mb-1.5 block">
                وصف المتجر
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white border border-gray-light rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-brand-green"
                rows={3}
                placeholder="اوصف متجرك في كلمتين..."
                maxLength={500}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-dark mb-2 block">
                القسم الرئيسي *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {categoriesConfig.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setMainCategory(cat.id)}
                    className={`text-center p-3 rounded-xl border transition-all ${
                      mainCategory === cat.id
                        ? "bg-brand-green-light border-brand-green shadow-sm"
                        : "bg-white border-gray-light hover:border-gray-300"
                    }`}
                  >
                    <span className="text-2xl block mb-1">{cat.icon}</span>
                    <span className="text-[11px] font-semibold text-dark">
                      {cat.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Appearance */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <span className="text-4xl">🎨</span>
              <h2 className="text-lg font-bold text-dark mt-2">
                خصّص مظهر متجرك
              </h2>
              <p className="text-sm text-gray-text">
                اختار الشكل اللي يناسبك
              </p>
            </div>

            {/* Theme */}
            <div>
              <label className="text-sm font-semibold text-dark mb-2 block">
                الثيم
              </label>
              <div className="grid grid-cols-2 gap-2">
                {themes.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className={`text-right p-3 rounded-xl border transition-all ${
                      theme === t.value
                        ? "bg-brand-green-light border-brand-green"
                        : "bg-white border-gray-light"
                    }`}
                  >
                    <span className="text-xl">{t.icon}</span>
                    <p className="text-sm font-bold text-dark mt-1">
                      {t.label}
                    </p>
                    <p className="text-[10px] text-gray-text">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Layout */}
            <div>
              <label className="text-sm font-semibold text-dark mb-2 block">
                طريقة العرض
              </label>
              <div className="grid grid-cols-3 gap-2">
                {layouts.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLayout(l.value)}
                    className={`text-center p-3 rounded-xl border transition-all ${
                      layout === l.value
                        ? "bg-brand-green-light border-brand-green"
                        : "bg-white border-gray-light"
                    }`}
                  >
                    <span className="text-xl block mb-1">{l.icon}</span>
                    <span className="text-[11px] font-semibold text-dark">
                      {l.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div>
              <label className="text-sm font-semibold text-dark mb-2 block">
                ألوان المتجر
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-gray-text mb-1 block">
                    أساسي
                  </span>
                  <div className="flex items-center gap-2 bg-white border border-gray-light rounded-xl p-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs font-mono text-gray-text">
                      {primaryColor}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-text mb-1 block">
                    ثانوي
                  </span>
                  <div className="flex items-center gap-2 bg-white border border-gray-light rounded-xl p-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs font-mono text-gray-text">
                      {secondaryColor}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div
              className="rounded-xl p-4 text-white text-center"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
              }}
            >
              <p className="text-lg font-bold">{name || "اسم المتجر"}</p>
              <p className="text-xs opacity-80">معاينة ألوان المتجر</p>
            </div>
          </div>
        )}

        {/* Step 3: Location */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <span className="text-4xl">📍</span>
              <h2 className="text-lg font-bold text-dark mt-2">
                موقع متجرك وبيانات التواصل
              </h2>
              <p className="text-sm text-gray-text">
                اختياري — ممكن تكمله بعدين
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-dark mb-1.5 block">
                المحافظة
              </label>
              <select
                value={locationGov}
                onChange={(e) => setLocationGov(e.target.value)}
                className="w-full bg-white border border-gray-light rounded-xl px-4 py-3 text-sm"
              >
                <option value="">اختار المحافظة</option>
                {governorates.map((gov) => (
                  <option key={gov} value={gov}>
                    {gov}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-dark mb-1.5 block">
                المنطقة
              </label>
              <input
                type="text"
                value={locationArea}
                onChange={(e) => setLocationArea(e.target.value)}
                className="w-full bg-white border border-gray-light rounded-xl px-4 py-3 text-sm"
                placeholder="مثال: مدينة نصر"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-dark mb-1.5 block">
                رقم التواصل
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-white border border-gray-light rounded-xl px-4 py-3 text-sm"
                placeholder="01XXXXXXXXX"
                dir="ltr"
              />
            </div>

            {/* Summary */}
            <div className="bg-brand-green-light rounded-xl p-4 mt-4">
              <h3 className="text-sm font-bold text-brand-green-dark mb-2">
                ملخص المتجر
              </h3>
              <div className="space-y-1 text-xs text-dark">
                <p>
                  <strong>الاسم:</strong> {name}
                </p>
                <p>
                  <strong>القسم:</strong>{" "}
                  {categoriesConfig.find((c) => c.id === mainCategory)?.name ||
                    "—"}
                </p>
                <p>
                  <strong>الثيم:</strong>{" "}
                  {themes.find((t) => t.value === theme)?.label || "—"}
                </p>
                {locationGov && (
                  <p>
                    <strong>الموقع:</strong> {locationGov}
                    {locationArea ? ` — ${locationArea}` : ""}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-light px-4 py-3 flex gap-3 z-40">
        {step > 1 && (
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            className="flex-1"
          >
            السابق
          </Button>
        )}
        {step < 3 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="flex-1"
          >
            التالي
          </Button>
        ) : (
          <Button
            onClick={handleCreate}
            isLoading={isCreating}
            disabled={!name.trim() || !mainCategory}
            className="flex-1"
          >
            أنشئ المتجر 🎉
          </Button>
        )}
      </div>
    </div>
  );
}
