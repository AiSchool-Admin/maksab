"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Upload } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase/client";
import { getStoreByUserId } from "@/lib/stores/store-service";
import Button from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import { categoriesConfig } from "@/lib/categories/categories-config";
import { governorates } from "@/lib/data/governorates";
import toast from "react-hot-toast";
import type { Store } from "@/types";

const themes = [
  { value: "classic", label: "كلاسيك", icon: "🏛️" },
  { value: "modern", label: "حديث", icon: "✨" },
  { value: "elegant", label: "أنيق", icon: "💎" },
  { value: "sporty", label: "رياضي", icon: "⚡" },
];

const layouts = [
  { value: "grid", label: "شبكة", icon: "⊞" },
  { value: "list", label: "قائمة", icon: "☰" },
  { value: "showcase", label: "عرض", icon: "🖼️" },
];

export default function DashboardSettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mainCategory, setMainCategory] = useState("");
  const [theme, setTheme] = useState("classic");
  const [layout, setLayout] = useState("grid");
  const [primaryColor, setPrimaryColor] = useState("#1B7A3D");
  const [secondaryColor, setSecondaryColor] = useState("#145C2E");
  const [locationGov, setLocationGov] = useState("");
  const [locationArea, setLocationArea] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    async function load() {
      setIsLoading(true);
      const s = await getStoreByUserId(user!.id);

      if (!s) {
        router.push("/store/create");
        return;
      }
      setStore(s);
      setName(s.name);
      setDescription(s.description || "");
      setMainCategory(s.main_category);
      setTheme(s.theme);
      setLayout(s.layout);
      setPrimaryColor(s.primary_color);
      setSecondaryColor(s.secondary_color || "#145C2E");
      setLocationGov(s.location_gov || "");
      setLocationArea(s.location_area || "");
      setPhone(s.phone || "");
      setIsLoading(false);
    }
    load();
  }, [user, router]);

  const handleSave = async () => {
    if (!store) return;
    setIsSaving(true);

    const updates = {
      name,
      description: description || null,
      main_category: mainCategory,
      theme,
      layout,
      primary_color: primaryColor,
      secondary_color: secondaryColor || null,
      location_gov: locationGov || null,
      location_area: locationArea || null,
      phone: phone || null,
    };

    const { error } = await supabase
      .from("stores" as never)
      .update(updates as never)
      .eq("id", store.id);

    if (error) {
      toast.error("حصل مشكلة في الحفظ، جرب تاني");
    } else {
      toast.success("تم حفظ التعديلات");
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-light px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => router.push("/store/dashboard")} className="p-1">
          <ArrowRight size={20} />
        </button>
        <h1 className="text-xl font-bold text-dark">إعدادات المتجر</h1>
      </header>

      <div className="px-4 mt-4 space-y-4">
        {/* Basic info */}
        <section className="bg-white rounded-xl border border-gray-light p-4 space-y-3">
          <h3 className="text-sm font-bold text-dark">البيانات الأساسية</h3>

          <div>
            <label className="text-xs text-gray-text mb-1 block">
              اسم المتجر *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-light rounded-xl px-3 py-2.5 text-sm"
              maxLength={30}
            />
          </div>

          <div>
            <label className="text-xs text-gray-text mb-1 block">
              وصف المتجر
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-50 border border-gray-light rounded-xl px-3 py-2.5 text-sm resize-none"
              rows={3}
              maxLength={500}
            />
            <p className="text-[10px] text-gray-text text-left mt-1">
              {description.length}/500
            </p>
          </div>

          <div>
            <label className="text-xs text-gray-text mb-1 block">
              القسم الرئيسي *
            </label>
            <select
              value={mainCategory}
              onChange={(e) => setMainCategory(e.target.value)}
              className="w-full bg-gray-50 border border-gray-light rounded-xl px-3 py-2.5 text-sm"
            >
              {categoriesConfig.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Appearance */}
        <section className="bg-white rounded-xl border border-gray-light p-4 space-y-3">
          <h3 className="text-sm font-bold text-dark">المظهر</h3>

          <div>
            <label className="text-xs text-gray-text mb-2 block">الثيم</label>
            <div className="grid grid-cols-4 gap-2">
              {themes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={`text-center p-2 rounded-xl border text-xs font-semibold transition-colors ${
                    theme === t.value
                      ? "bg-brand-green-light border-brand-green text-brand-green"
                      : "bg-gray-50 border-gray-light text-gray-text"
                  }`}
                >
                  <span className="text-lg block mb-0.5">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-text mb-2 block">
              عرض المنتجات
            </label>
            <div className="grid grid-cols-3 gap-2">
              {layouts.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLayout(l.value)}
                  className={`text-center p-2 rounded-xl border text-xs font-semibold transition-colors ${
                    layout === l.value
                      ? "bg-brand-green-light border-brand-green text-brand-green"
                      : "bg-gray-50 border-gray-light text-gray-text"
                  }`}
                >
                  <span className="text-lg block mb-0.5">{l.icon}</span>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-text mb-1 block">
                اللون الأساسي
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-light cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-light rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-text mb-1 block">
                اللون الثانوي
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-light cursor-pointer"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-light rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="bg-white rounded-xl border border-gray-light p-4 space-y-3">
          <h3 className="text-sm font-bold text-dark">الموقع</h3>
          <select
            value={locationGov}
            onChange={(e) => setLocationGov(e.target.value)}
            className="w-full bg-gray-50 border border-gray-light rounded-xl px-3 py-2.5 text-sm"
          >
            <option value="">اختار المحافظة</option>
            {governorates.map((gov) => (
              <option key={gov} value={gov}>
                {gov}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="المنطقة (اختياري)"
            value={locationArea}
            onChange={(e) => setLocationArea(e.target.value)}
            className="w-full bg-gray-50 border border-gray-light rounded-xl px-3 py-2.5 text-sm"
          />
        </section>

        {/* Contact */}
        <section className="bg-white rounded-xl border border-gray-light p-4 space-y-3">
          <h3 className="text-sm font-bold text-dark">التواصل</h3>
          <input
            type="tel"
            placeholder="رقم التليفون"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-gray-50 border border-gray-light rounded-xl px-3 py-2.5 text-sm"
            dir="ltr"
          />
        </section>

        {/* Save button */}
        <Button onClick={handleSave} isLoading={isSaving} fullWidth size="lg">
          حفظ التعديلات
        </Button>
      </div>
    </div>
  );
}
