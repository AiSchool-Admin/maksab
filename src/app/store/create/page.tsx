"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Store,
  ImageIcon,
  Palette,
  Check,
  Upload,
  X,
  Sparkles,
  Briefcase,
} from "lucide-react";
import { useAuth, isPendingMerchant, clearPendingMerchant } from "@/components/auth/AuthProvider";
import Image from "next/image";
import Button from "@/components/ui/Button";
import { categoriesConfig } from "@/lib/categories/categories-config";
import {
  businessTypesConfig,
  type BusinessType,
  type BusinessExtraField,
  getBusinessTypeConfig,
} from "@/lib/stores/business-types";
import toast from "react-hot-toast";

// ── Step definitions ──────────────────────────────────────────────
const steps = [
  { id: 1, title: "نوع النشاط", icon: <Briefcase size={18} /> },
  { id: 2, title: "الأساسيات", icon: <Store size={18} /> },
  { id: 3, title: "الهوية", icon: <ImageIcon size={18} /> },
  { id: 4, title: "المظهر", icon: <Palette size={18} /> },
];

const themes = [
  { value: "classic", label: "كلاسيك", icon: "🏛️", desc: "تصميم بسيط وأنيق" },
  { value: "modern", label: "حديث", icon: "✨", desc: "تصميم عصري ومتطور" },
  { value: "elegant", label: "أنيق", icon: "💎", desc: "تصميم فاخر وراقي" },
  { value: "sporty", label: "رياضي", icon: "⚡", desc: "تصميم حيوي ونشيط" },
];

const presetColors = [
  "#1B7A3D", "#145C2E", "#D4A843", "#2563EB",
  "#7C3AED", "#DC2626", "#EA580C", "#0891B2",
  "#059669", "#4F46E5", "#BE185D", "#78716C",
];

type WizardView = "steps" | "preview" | "success";

export default function CreateStorePage() {
  const router = useRouter();
  const { user, requireAuth, refreshUser } = useAuth();
  const [view, setView] = useState<WizardView>("steps");
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [createdStore, setCreatedStore] = useState<{
    slug: string;
    name: string;
    migrated: number;
  } | null>(null);

  // Forced mode: merchant must create a store before using the app
  const forcedMode = isPendingMerchant();

  // Step 1: Business Type (required)
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);

  // Step 2: Basics (required)
  const [name, setName] = useState("");
  const [mainCategory, setMainCategory] = useState("");
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const [checkingName, setCheckingName] = useState(false);
  // Business-type-specific extra fields
  const [extraFieldValues, setExtraFieldValues] = useState<Record<string, string | boolean>>({});

  // Step 3: Identity (optional)
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  // Step 4: Appearance (optional with defaults)
  const [theme, setTheme] = useState("classic");
  const [primaryColor, setPrimaryColor] = useState("#1B7A3D");

  const selectedBusinessConfig = businessType ? getBusinessTypeConfig(businessType) : null;

  // ── Live name uniqueness check ────────────────────────────────
  useEffect(() => {
    if (name.trim().length < 2) {
      setNameAvailable(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setCheckingName(true);
      try {
        const res = await fetch(
          `/api/stores/check-name?name=${encodeURIComponent(name.trim())}`,
        );
        const data = await res.json();
        setNameAvailable(data.available);
      } catch {
        setNameAvailable(null);
      } finally {
        setCheckingName(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [name]);

  // ── Logo handling ─────────────────────────────────────────────
  const handleLogoSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        toast.error("حجم الصورة لازم يكون أقل من 2MB");
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("لازم تكون صورة (PNG أو JPG)");
        return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    },
    [],
  );

  const removeLogo = useCallback(() => {
    setLogoFile(null);
    setLogoPreview(null);
  }, []);

  // ── Extra field change handler ─────────────────────────────────
  const handleExtraFieldChange = (fieldId: string, value: string | boolean) => {
    setExtraFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  // ── Step validation ───────────────────────────────────────────
  const canProceed = () => {
    if (step === 1) return businessType !== null;
    if (step === 2) {
      const nameValid = name.trim().length >= 2 && nameAvailable !== false;
      const categoryValid = !!mainCategory;
      // Check required extra fields
      const requiredFields = selectedBusinessConfig?.extraFields.filter((f) => f.isRequired) || [];
      const allRequiredFilled = requiredFields.every((f) => {
        const val = extraFieldValues[f.id];
        return val !== undefined && val !== "" && val !== false;
      });
      return nameValid && categoryValid && allRequiredFilled;
    }
    return true;
  };

  // ── Upload logo to Supabase Storage ───────────────────────────
  const uploadLogo = async (userId: string): Promise<string | null> => {
    if (!logoFile) return null;
    try {
      // Determine file extension from type
      const ext = logoFile.type === "image/png" ? ".png" : logoFile.type === "image/webp" ? ".webp" : ".jpg";
      const formData = new FormData();
      formData.append("file", logoFile);
      formData.append("bucket", "store-logos");
      formData.append("path", `${userId}/${Date.now()}-logo${ext}`);

      const { getSessionToken } = await import("@/lib/supabase/auth");
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${getSessionToken()}` },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        return data.url;
      }
      // Show error to user instead of silently failing
      console.error("[store/create] Logo upload failed:", data.error);
      toast.error("فشل رفع شعار المتجر. هنكمل من غيره");
    } catch (err) {
      console.error("[store/create] Logo upload error:", err);
      toast.error("فشل رفع شعار المتجر. هنكمل من غيره");
    }
    return null;
  };

  // ── Create store ──────────────────────────────────────────────
  const handleCreate = async () => {
    const authedUser = await requireAuth();
    if (!authedUser) return;

    setIsCreating(true);

    try {
      // Upload logo if present
      const logoUrl = await uploadLogo(authedUser.id);

      // Build business_data from extra fields
      const businessData: Record<string, string | boolean> = {};
      let workingHoursText: string | null = null;

      for (const [key, value] of Object.entries(extraFieldValues)) {
        if (value !== "" && value !== false) {
          if (key === "working_hours_text") {
            workingHoursText = value as string;
          } else {
            businessData[key] = value;
          }
        }
      }

      const { getSessionToken } = await import("@/lib/supabase/auth");
      const res = await fetch("/api/stores/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: authedUser.id,
          session_token: getSessionToken(),
          name: name.trim(),
          description: description.trim() || null,
          main_category: mainCategory,
          business_type: businessType,
          theme,
          primary_color: primaryColor,
          logo_url: logoUrl,
          working_hours_text: workingHoursText,
          business_data: Object.keys(businessData).length > 0 ? businessData : null,
          location_gov: selectedBusinessConfig?.requiresAddress ? extraFieldValues.location_gov || null : null,
          location_area: selectedBusinessConfig?.requiresAddress ? extraFieldValues.location_area || null : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "حصل مشكلة، جرب تاني");
        setIsCreating(false);
        return;
      }

      // Refresh user profile to pick up seller_type=store
      await refreshUser();

      // Clear forced merchant flag — store created successfully
      clearPendingMerchant();

      setCreatedStore({
        slug: data.store.slug,
        name: data.store.name,
        migrated: data.migrated_products,
      });
      setView("success");
    } catch {
      toast.error("حصل مشكلة في الشبكة، جرب تاني");
    } finally {
      setIsCreating(false);
    }
  };

  const categoryLabel =
    categoriesConfig.find((c) => c.id === mainCategory)?.name || "";
  const categoryIcon =
    categoriesConfig.find((c) => c.id === mainCategory)?.icon || "";
  const businessTypeLabel = selectedBusinessConfig?.name || "";
  const businessTypeIcon = selectedBusinessConfig?.icon || "";

  // ═══════════════════════════════════════════════════════════════
  // SUCCESS VIEW
  // ═══════════════════════════════════════════════════════════════
  if (view === "success" && createdStore) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 bg-brand-green-light rounded-full flex items-center justify-center mb-6 animate-bounce">
          <Sparkles size={36} className="text-brand-green" />
        </div>

        <h1 className="text-4xl font-bold text-dark mb-2">
          مبروك! محلك جاهز!
        </h1>
        <p className="text-sm text-gray-text mb-6 max-w-xs">
          تم إنشاء متجر &quot;{createdStore.name}&quot; بنجاح
        </p>

        {createdStore.migrated > 0 && (
          <div className="bg-brand-green-light rounded-xl px-6 py-4 mb-6">
            <p className="text-sm font-bold text-brand-green-dark">
              تم نقل {createdStore.migrated} إعلان لمتجرك تلقائياً
            </p>
          </div>
        )}

        <Button
          size="lg"
          fullWidth
          onClick={() => router.push(`/store/${createdStore.slug}`)}
        >
          اذهب لمحلك
        </Button>

        <button
          onClick={() => router.push("/store/dashboard")}
          className="mt-3 text-sm text-brand-green font-semibold hover:underline"
        >
          افتح لوحة التحكم
        </button>

        <button
          onClick={() => {
            setView("steps");
            setStep(1);
            setBusinessType(null);
            setName("");
            setMainCategory("");
            setNameAvailable(null);
            setExtraFieldValues({});
            setLogoFile(null);
            setLogoPreview(null);
            setDescription("");
            setTheme("classic");
            setPrimaryColor("#1B7A3D");
            setCreatedStore(null);
          }}
          className="mt-2 text-sm text-gray-text hover:text-dark hover:underline"
        >
          أو أنشئ متجر/نشاط تاني
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // PREVIEW VIEW
  // ═══════════════════════════════════════════════════════════════
  if (view === "preview") {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <header className="bg-white border-b border-gray-light px-4 py-3 flex items-center gap-3">
          <button onClick={() => setView("steps")} className="p-1">
            <ArrowRight size={20} />
          </button>
          <h1 className="text-xl font-bold text-dark">معاينة المتجر</h1>
        </header>

        <div className="px-4 mt-4 space-y-4">
          {/* Store header preview */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
            }}
          >
            <div className="p-6 text-center text-white">
              {logoPreview ? (
                <Image
                  src={logoPreview}
                  alt="شعار المتجر"
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-4 border-white/30"
                  unoptimized
                />
              ) : (
                <div className="w-20 h-20 bg-white/20 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <Store size={32} className="text-white/80" />
                </div>
              )}
              <h2 className="text-3xl font-bold">{name || "اسم المتجر"}</h2>
              {description && (
                <p className="text-sm opacity-80 mt-1">{description}</p>
              )}
              <div className="flex items-center justify-center gap-2 mt-2 text-xs opacity-70">
                <span>{businessTypeIcon}</span>
                <span>{businessTypeLabel}</span>
                <span>•</span>
                <span>{categoryIcon}</span>
                <span>{categoryLabel}</span>
              </div>
            </div>
          </div>

          {/* Details summary */}
          <div className="bg-white rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-dark">ملخص بيانات المتجر</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-text">الاسم</span>
                <span className="font-semibold text-dark">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-text">نوع النشاط</span>
                <span className="font-semibold text-dark">
                  {businessTypeIcon} {businessTypeLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-text">القسم</span>
                <span className="font-semibold text-dark">
                  {categoryIcon} {categoryLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-text">الثيم</span>
                <span className="font-semibold text-dark">
                  {themes.find((t) => t.value === theme)?.label}
                </span>
              </div>
              {/* Show extra field values */}
              {selectedBusinessConfig?.extraFields.map((field) => {
                const val = extraFieldValues[field.id];
                if (!val) return null;
                return (
                  <div key={field.id} className="flex justify-between">
                    <span className="text-gray-text">{field.label}</span>
                    <span className="font-semibold text-dark">
                      {typeof val === "boolean" ? "نعم" : val}
                    </span>
                  </div>
                );
              })}
              {description && (
                <div>
                  <span className="text-gray-text block mb-1">الوصف</span>
                  <p className="text-dark text-xs bg-gray-50 rounded-lg p-2">
                    {description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs text-blue-800 font-semibold">
              إعلاناتك اللي مش مرتبطة بمتجر تاني هتتنقل للمتجر الجديد تلقائياً.
            </p>
          </div>
        </div>

        {/* Bottom buttons */}
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-light px-4 py-3 flex gap-3 z-40">
          <Button
            variant="outline"
            onClick={() => setView("steps")}
            className="flex-1"
          >
            تعديل
          </Button>
          <Button
            onClick={handleCreate}
            isLoading={isCreating}
            className="flex-1"
          >
            تأكيد وفتح المحل
          </Button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // STEPS VIEW (Main wizard)
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-light px-4 py-3 flex items-center gap-3">
        {!forcedMode && (
          <button onClick={() => router.back()} className="p-1">
            <ArrowRight size={20} />
          </button>
        )}
        <h1 className="text-xl font-bold text-dark flex-1">افتح متجرك في مكسب</h1>
      </header>
      {forcedMode && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5">
          <p className="text-xs text-amber-800 font-semibold text-center">
            أنشئ متجرك الأول علشان تبدأ تعرض منتجاتك
          </p>
        </div>
      )}

      {/* Step indicator */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    step >= s.id
                      ? "bg-brand-green text-white"
                      : "bg-gray-100 text-gray-text"
                  }`}
                >
                  {step > s.id ? <Check size={16} /> : s.icon}
                </div>
                <span className="text-[9px] text-gray-text mt-1">
                  {s.title}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1.5 rounded-full ${
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
        {/* ── Step 1: Business Type (Required) ─────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <span className="text-4xl">🏪</span>
              <h2 className="text-2xl font-bold text-dark mt-2">
                إيه نوع نشاطك؟
              </h2>
              <p className="text-sm text-gray-text">
                اختار النوع اللي يوصف نشاطك أحسن
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {businessTypesConfig.map((bt) => (
                <button
                  key={bt.id}
                  onClick={() => setBusinessType(bt.id)}
                  className={`text-right p-3 rounded-xl border-2 transition-all ${
                    businessType === bt.id
                      ? "border-brand-green bg-brand-green-light"
                      : "border-gray-light bg-white hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl block mb-1">{bt.icon}</span>
                  <p className="text-sm font-bold text-dark">{bt.name}</p>
                  <p className="text-[10px] text-gray-text leading-tight mt-0.5">
                    {bt.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Basics + Dynamic Fields (Required) ───────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <span className="text-4xl">{businessTypeIcon}</span>
              <h2 className="text-2xl font-bold text-dark mt-2">
                بيانات {businessTypeLabel}
              </h2>
              <p className="text-sm text-gray-text">
                اختار اسم وقسم لمتجرك
              </p>
            </div>

            {/* Store name with live uniqueness check */}
            <div>
              <label className="text-sm font-semibold text-dark mb-1.5 block">
                اسم المتجر *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full bg-white border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors ${
                    nameAvailable === false
                      ? "border-error focus:border-error"
                      : nameAvailable === true
                        ? "border-green-500 focus:border-green-500"
                        : "border-gray-light focus:border-brand-green"
                  }`}
                  placeholder="مثال: موبايلات أحمد"
                  maxLength={30}
                />
                {/* Status indicator */}
                <div className="absolute start-3 top-1/2 -translate-y-1/2">
                  {checkingName && (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-brand-green rounded-full animate-spin" />
                  )}
                  {!checkingName && nameAvailable === true && (
                    <Check size={16} className="text-green-500" />
                  )}
                  {!checkingName && nameAvailable === false && (
                    <X size={16} className="text-error" />
                  )}
                </div>
              </div>
              <div className="flex justify-between mt-1">
                {nameAvailable === false ? (
                  <p className="text-[11px] text-error">
                    الاسم ده مستخدم، جرب اسم تاني
                  </p>
                ) : (
                  <span />
                )}
                <p className="text-[10px] text-gray-text">{name.length}/30</p>
              </div>
            </div>

            {/* Category selection */}
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

            {/* Dynamic extra fields from business type */}
            {selectedBusinessConfig && selectedBusinessConfig.extraFields.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-sm font-semibold text-dark">
                  بيانات إضافية {selectedBusinessConfig.extraFields.some((f) => f.isRequired) ? "" : "(اختياري)"}
                </p>
                {selectedBusinessConfig.extraFields.map((field) => (
                  <ExtraFieldInput
                    key={field.id}
                    field={field}
                    value={extraFieldValues[field.id]}
                    onChange={(val) => handleExtraFieldChange(field.id, val)}
                  />
                ))}
              </div>
            )}

            {/* Address fields if business type requires it */}
            {selectedBusinessConfig?.requiresAddress && (
              <div className="space-y-3 pt-2">
                <p className="text-sm font-semibold text-dark">العنوان (اختياري)</p>
                <input
                  type="text"
                  value={(extraFieldValues.address_detail as string) || ""}
                  onChange={(e) => handleExtraFieldChange("address_detail", e.target.value)}
                  className="w-full bg-white border border-gray-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-green"
                  placeholder="مثال: 15 شارع التحرير، الدقي"
                  maxLength={200}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Identity (Optional) ────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <span className="text-4xl">🖼️</span>
              <h2 className="text-2xl font-bold text-dark mt-2">
                هوية متجرك
              </h2>
              <p className="text-sm text-gray-text">
                اختياري — ممكن تكمله بعدين
              </p>
            </div>

            {/* Logo upload */}
            <div>
              <label className="text-sm font-semibold text-dark mb-2 block">
                شعار المتجر (لوجو)
              </label>
              {logoPreview ? (
                <div className="relative w-28 h-28 mx-auto">
                  <Image
                    src={logoPreview}
                    alt="شعار المتجر"
                    width={112}
                    height={112}
                    className="w-full h-full rounded-2xl object-cover border-2 border-gray-light"
                    unoptimized
                  />
                  <button
                    onClick={removeLogo}
                    className="absolute -top-2 -start-2 w-7 h-7 bg-error text-white rounded-full flex items-center justify-center shadow-md"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-28 h-28 mx-auto bg-white border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-brand-green hover:bg-brand-green-light/30 transition-colors">
                  <Upload size={24} className="text-gray-text mb-1" />
                  <span className="text-[10px] text-gray-text">
                    PNG أو JPG
                  </span>
                  <span className="text-[10px] text-gray-text">
                    حتى 2MB
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleLogoSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Description */}
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
              <p className="text-[10px] text-gray-text text-end mt-1">
                {description.length}/500
              </p>
            </div>
          </div>
        )}

        {/* ── Step 4: Appearance (Optional with defaults) ─────────── */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <span className="text-4xl">🎨</span>
              <h2 className="text-2xl font-bold text-dark mt-2">
                خصّص مظهر متجرك
              </h2>
              <p className="text-sm text-gray-text">
                اختياري — فيه إعدادات افتراضية جاهزة
              </p>
            </div>

            {/* Theme picker */}
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

            {/* Color picker */}
            <div>
              <label className="text-sm font-semibold text-dark mb-2 block">
                اللون الأساسي
              </label>
              <div className="flex flex-wrap gap-3 justify-center">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setPrimaryColor(color)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      primaryColor === color
                        ? "border-dark scale-110 shadow-md"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`لون ${color}`}
                  />
                ))}
              </div>
            </div>

            {/* Live preview */}
            <div
              className="rounded-xl p-4 text-white text-center"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
              }}
            >
              {logoPreview && (
                <Image
                  src={logoPreview}
                  alt="شعار"
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full mx-auto mb-2 border-2 border-white/30 object-cover"
                  unoptimized
                />
              )}
              <p className="text-lg font-bold">{name || "اسم المتجر"}</p>
              <p className="text-xs opacity-80">
                {themes.find((t) => t.value === theme)?.label} —{" "}
                {categoryLabel}
              </p>
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
        {step < 4 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="flex-1"
          >
            {step === 3 ? (
              <>
                التالي
                <span className="text-[10px] opacity-70 me-1">(أو تخطي)</span>
              </>
            ) : (
              "التالي"
            )}
          </Button>
        ) : (
          <Button
            onClick={() => setView("preview")}
            disabled={!name.trim() || !mainCategory || !businessType}
            className="flex-1"
          >
            معاينة المتجر
          </Button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Extra Field Input Component — renders dynamic fields per business type
// ═══════════════════════════════════════════════════════════════════
function ExtraFieldInput({
  field,
  value,
  onChange,
}: {
  field: BusinessExtraField;
  value: string | boolean | undefined;
  onChange: (val: string | boolean) => void;
}) {
  if (field.type === "toggle") {
    return (
      <label className="flex items-center justify-between bg-white border border-gray-light rounded-xl px-4 py-3 cursor-pointer">
        <span className="text-sm text-dark">
          {field.label}
          {field.isRequired && <span className="text-error me-1">*</span>}
        </span>
        <div className="relative">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only"
          />
          <div
            className={`w-11 h-6 rounded-full transition-colors ${
              value ? "bg-brand-green" : "bg-gray-300"
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform absolute top-0.5 ${
                value ? "translate-x-0.5" : "translate-x-5.5"
              }`}
            />
          </div>
        </div>
      </label>
    );
  }

  if (field.type === "select" && field.options) {
    return (
      <div>
        <label className="text-sm text-dark mb-1.5 block">
          {field.label}
          {field.isRequired && <span className="text-error me-1">*</span>}
        </label>
        <select
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white border border-gray-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-green appearance-none"
        >
          <option value="">اختار...</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Default: text input
  return (
    <div>
      <label className="text-sm text-dark mb-1.5 block">
        {field.label}
        {field.isRequired && <span className="text-error me-1">*</span>}
      </label>
      <input
        type="text"
        value={(value as string) || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-gray-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-green"
        placeholder={field.placeholder}
      />
    </div>
  );
}
