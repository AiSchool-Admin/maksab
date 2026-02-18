"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Camera,
  ImagePlus,
  X,
  Plus,
  Check,
  Zap,
  Bookmark,
  BookmarkCheck,
  Trash2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import DynamicCategoryForm from "@/components/ad/DynamicCategoryForm";
import { useAuthStore } from "@/stores/auth-store";
import { getSessionToken } from "@/lib/supabase/auth";
import { getStoreByUserId } from "@/lib/stores/store-service";
import {
  getCategoryById,
  categoriesConfig,
} from "@/lib/categories/categories-config";
import {
  generateAutoTitle,
  generateAutoDescription,
} from "@/lib/categories/generate";
import { compressImage } from "@/lib/utils/image-compress";
import type { CompressedImage } from "@/lib/utils/image-compress";
import {
  getTemplates,
  saveTemplate,
  deleteTemplate,
  type ProductTemplate,
} from "@/lib/stores/product-templates";
import type { Store } from "@/types";

const MAX_IMAGES = 5;

export default function QuickAddProductPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Store data
  const [store, setStore] = useState<Store | null>(null);
  const [isLoadingStore, setIsLoadingStore] = useState(true);

  // Form state
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [categoryFields, setCategoryFields] = useState<Record<string, unknown>>(
    {},
  );
  const [price, setPrice] = useState("");
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [images, setImages] = useState<CompressedImage[]>([]);
  // Templates
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  // Publishing state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPublishing, setIsPublishing] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load store data
  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    async function load() {
      setIsLoadingStore(true);
      const s = await getStoreByUserId(user!.id);
      if (!s) {
        router.push("/store/create");
        return;
      }
      setStore(s);
      // Pre-fill category from store's main category
      if (s.main_category) {
        setCategoryId(s.main_category);
        // Set default field values
        const config = getCategoryById(s.main_category);
        if (config) {
          const defaults: Record<string, unknown> = {};
          for (const field of config.fields) {
            if (field.defaultValue !== undefined) {
              defaults[field.id] = field.defaultValue;
            }
          }
          setCategoryFields(defaults);
        }
      }
      setIsLoadingStore(false);
    }
    load();
    setTemplates(getTemplates());
  }, [user, router]);

  // Load template into form
  const handleLoadTemplate = useCallback((tpl: ProductTemplate) => {
    setCategoryId(tpl.category_id);
    setSubcategoryId(tpl.subcategory_id || "");
    setCategoryFields(tpl.category_fields);
    if (tpl.default_price) setPrice(tpl.default_price);
    setIsNegotiable(tpl.is_negotiable);
    setShowTemplates(false);
    setErrors({});
  }, []);

  // Save current form as template
  const handleSaveTemplate = useCallback(() => {
    if (!templateName.trim() || !categoryId) return;
    const tpl = saveTemplate({
      name: templateName.trim(),
      category_id: categoryId,
      subcategory_id: subcategoryId || undefined,
      category_fields: categoryFields,
      default_price: price || undefined,
      is_negotiable: isNegotiable,
    });
    setTemplates(prev => [tpl, ...prev]);
    setTemplateName("");
    setShowSaveTemplate(false);
  }, [templateName, categoryId, subcategoryId, categoryFields, price, isNegotiable]);

  const handleDeleteTemplate = useCallback((tplId: string) => {
    deleteTemplate(tplId);
    setTemplates(prev => prev.filter(t => t.id !== tplId));
  }, []);

  // Image handling
  const handleAddImages = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const remaining = MAX_IMAGES - images.length;
      const toAdd = Array.from(files).slice(0, remaining);

      const compressed: CompressedImage[] = [];
      for (const file of toAdd) {
        try {
          const result = await compressImage(file);
          compressed.push(result);
        } catch {
          // Skip failed
        }
      }

      setImages((prev) => [...prev, ...compressed]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [images.length],
  );

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => {
      const removed = prev[index];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Category change
  const handleCategoryChange = useCallback((newCatId: string) => {
    setCategoryId(newCatId);
    setSubcategoryId("");
    const config = getCategoryById(newCatId);
    const defaults: Record<string, unknown> = {};
    if (config) {
      for (const field of config.fields) {
        if (field.defaultValue !== undefined) {
          defaults[field.id] = field.defaultValue;
        }
      }
    }
    setCategoryFields(defaults);
    setErrors({});
  }, []);

  // Validate
  const validate = useCallback(() => {
    const errs: Record<string, string> = {};

    if (!categoryId) errs.category = "اختار القسم";
    if (!price) errs.price = "السعر مطلوب";
    if (images.length === 0) errs.images = "أضف صورة واحدة على الأقل";

    // Validate required category fields
    const config = getCategoryById(categoryId);
    if (config) {
      const override = subcategoryId
        ? config.subcategoryOverrides?.[subcategoryId]
        : undefined;
      const reqFields = override?.requiredFields ?? config.requiredFields;
      for (const reqId of reqFields) {
        const field = config.fields.find((f) => f.id === reqId);
        if (
          subcategoryId &&
          field?.hiddenForSubcategories?.includes(subcategoryId)
        )
          continue;
        const val = categoryFields[reqId];
        if (val === undefined || val === null || val === "") {
          errs[reqId] = `${field?.label || reqId} مطلوب`;
        }
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [categoryId, subcategoryId, price, images, categoryFields]);

  // Publish product
  const handlePublish = useCallback(
    async (addAnother: boolean) => {
      if (!validate()) return;
      if (!user || !store) return;

      setIsPublishing(true);

      try {
        // Upload images via /api/upload (FormData, not base64 in JSON)
        const uploadedUrls: string[] = [];
        for (let i = 0; i < images.length; i++) {
          try {
            const formData = new FormData();
            formData.append("file", images[i].file);
            formData.append("bucket", "ad-images");
            formData.append(
              "path",
              `ads/${user.id}/${Date.now()}_${i}.jpg`,
            );

            const uploadRes = await fetch("/api/upload", {
              method: "POST",
              body: formData,
            });

            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              if (uploadData.url) {
                uploadedUrls.push(uploadData.url);
              }
            }
          } catch {
            // Skip failed image upload
          }
        }

        // Auto-generate title and description
        const config = getCategoryById(categoryId);
        const title = config
          ? generateAutoTitle(
              config,
              categoryFields,
              subcategoryId || undefined,
            )
          : "منتج جديد";
        const description = config
          ? generateAutoDescription(
              config,
              categoryFields,
              subcategoryId || undefined,
            )
          : "";

        const adData = {
          category_id: categoryId,
          subcategory_id: subcategoryId || null,
          sale_type: "cash",
          title: title || "منتج جديد",
          description,
          category_fields: categoryFields,
          governorate: store.location_gov || null,
          city: store.location_area || null,
          price: Number(price),
          is_negotiable: isNegotiable,
          images: uploadedUrls,
          store_id: store.id,
        };

        const res = await fetch("/api/ads/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.id, session_token: getSessionToken(), ad_data: adData }),
        });

        const result = await res.json();

        if (!res.ok) {
          setErrors({
            publish:
              result.error || "حصل مشكلة في إضافة المنتج. جرب تاني",
          });
          setIsPublishing(false);
          return;
        }

        setSuccessCount((c) => c + 1);

        if (addAnother) {
          // Reset form for next product — keep category and store data
          setSubcategoryId("");
          const config = getCategoryById(categoryId);
          const defaults: Record<string, unknown> = {};
          if (config) {
            for (const field of config.fields) {
              if (field.defaultValue !== undefined) {
                defaults[field.id] = field.defaultValue;
              }
            }
          }
          setCategoryFields(defaults);
          setPrice("");
          setIsNegotiable(false);
          // Revoke old previews
          for (const img of images) {
            if (img.preview) URL.revokeObjectURL(img.preview);
          }
          setImages([]);
          setErrors({});

          // Brief success flash
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2000);
        } else {
          // Go back to products page
          router.push("/store/dashboard/products");
        }
      } catch {
        setErrors({ publish: "حصل مشكلة، جرب تاني" });
      } finally {
        setIsPublishing(false);
      }
    },
    [
      validate,
      user,
      store,
      images,
      categoryId,
      subcategoryId,
      categoryFields,
      price,
      isNegotiable,
      router,
    ],
  );

  const config = getCategoryById(categoryId);
  const subcategories = config?.subcategories || [];

  if (isLoadingStore) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Zap size={32} className="mx-auto text-brand-green animate-pulse" />
          <p className="text-sm text-gray-text">جاري تحميل بيانات المتجر...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-40">
      {/* Header */}
      <header className="bg-white border-b border-gray-light px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/store/dashboard/products")}
            className="p-1"
          >
            <ArrowRight size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center">
              <Zap size={16} className="text-brand-green" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-dark">إضافة سريعة</h1>
              {successCount > 0 && (
                <p className="text-[10px] text-brand-green font-semibold">
                  تم إضافة {successCount} منتج
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Success flash */}
      {showSuccess && (
        <div className="mx-4 mt-3 bg-brand-green text-white rounded-xl p-3 flex items-center gap-2 animate-pulse">
          <Check size={18} />
          <span className="text-sm font-bold">
            تم إضافة المنتج بنجاح! أضف منتج تاني
          </span>
        </div>
      )}

      {/* Templates bar */}
      {templates.length > 0 && (
        <div className="px-4 mt-3">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-2 text-sm font-semibold text-brand-green"
          >
            <BookmarkCheck size={16} />
            القوالب المحفوظة ({templates.length})
          </button>

          {showTemplates && (
            <div className="mt-2 space-y-1.5">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="bg-white rounded-xl border border-gray-light p-3 flex items-center justify-between"
                >
                  <button
                    onClick={() => handleLoadTemplate(tpl)}
                    className="flex-1 text-start"
                  >
                    <p className="text-sm font-semibold text-dark">{tpl.name}</p>
                    <p className="text-[10px] text-gray-text">
                      {categoriesConfig.find(c => c.id === tpl.category_id)?.name || tpl.category_id}
                      {tpl.default_price ? ` — ${Number(tpl.default_price).toLocaleString()} جنيه` : ""}
                    </p>
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(tpl.id)}
                    className="p-1.5 text-gray-text hover:text-error"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="px-4 mt-3 space-y-4">
        {/* ── Photos (First for speed — camera-first approach) ── */}
        <div className="bg-white rounded-xl border border-gray-light p-4">
          <label className="block text-sm font-bold text-dark mb-2">
            الصور
            <span className="text-error me-0.5">*</span>
            <span className="text-xs text-gray-text font-normal mr-1">
              (حتى {MAX_IMAGES})
            </span>
          </label>

          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {images.map((img, i) => (
              <div
                key={i}
                className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-gray-light"
              >
                <img
                  src={img.preview}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => handleRemoveImage(i)}
                  className="absolute top-0.5 end-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <X size={12} className="text-white" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-0 inset-x-0 bg-brand-green text-white text-[8px] text-center py-0.5 font-bold">
                    رئيسية
                  </span>
                )}
              </div>
            ))}

            {images.length < MAX_IMAGES && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-brand-green/40 flex flex-col items-center justify-center gap-1 flex-shrink-0 bg-brand-green/5 hover:bg-brand-green/10 transition-colors"
              >
                <ImagePlus size={20} className="text-brand-green" />
                <span className="text-[10px] text-brand-green font-semibold">
                  أضف صورة
                </span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleAddImages}
            className="hidden"
          />

          {errors.images && (
            <p className="mt-1 text-xs text-error">{errors.images}</p>
          )}
        </div>

        {/* ── Category Selection ── */}
        <div className="bg-white rounded-xl border border-gray-light p-4 space-y-3">
          <Select
            label="القسم"
            name="category"
            value={categoryId}
            onChange={(e) => handleCategoryChange(e.target.value)}
            options={categoriesConfig.map((c) => ({
              value: c.id,
              label: `${c.icon} ${c.name}`,
            }))}
            placeholder="اختار القسم"
            error={errors.category}
            required
          />

          {subcategories.length > 0 && (
            <Select
              label="القسم الفرعي"
              name="subcategory"
              value={subcategoryId}
              onChange={(e) => {
                setSubcategoryId(e.target.value);
                setErrors({});
              }}
              options={subcategories.map((s) => ({
                value: s.id,
                label: s.name,
              }))}
              placeholder="اختار القسم الفرعي (اختياري)"
            />
          )}
        </div>

        {/* ── Category Fields (Required Only by default) ── */}
        {config && (
          <div className="bg-white rounded-xl border border-gray-light p-4 space-y-3">
            <h3 className="text-sm font-bold text-dark">
              تفاصيل المنتج
            </h3>
            <DynamicCategoryForm
              config={config}
              subcategoryId={subcategoryId || undefined}
              values={categoryFields}
              onChange={(fieldId, value) => {
                setCategoryFields((prev) => ({ ...prev, [fieldId]: value }));
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next[fieldId];
                  return next;
                });
              }}
              errors={errors}
            />
          </div>
        )}

        {/* ── Price ── */}
        <div className="bg-white rounded-xl border border-gray-light p-4 space-y-3">
          <Input
            label="السعر"
            name="price"
            type="number"
            inputMode="numeric"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.price;
                return next;
              });
            }}
            unit="جنيه"
            placeholder="أدخل السعر"
            error={errors.price}
            required
          />

          <button
            type="button"
            onClick={() => setIsNegotiable(!isNegotiable)}
            className="flex items-center gap-2 py-2"
          >
            <div
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                isNegotiable
                  ? "bg-brand-green border-brand-green"
                  : "border-gray-300"
              }`}
            >
              {isNegotiable && <Check size={12} className="text-white" />}
            </div>
            <span className="text-sm text-dark">السعر قابل للتفاوض</span>
          </button>
        </div>

        {/* ── Store Info (pre-filled, read-only summary) ── */}
        {store && (
          <div className="bg-white rounded-xl border border-gray-light p-4">
            <p className="text-xs text-gray-text mb-1">سيتم النشر في:</p>
            <div className="flex items-center gap-2">
              {store.logo_url ? (
                <img
                  src={store.logo_url}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center text-sm">
                  🏪
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-dark">{store.name}</p>
                {(store.location_gov || store.location_area) && (
                  <p className="text-[10px] text-gray-text">
                    {[store.location_gov, store.location_area]
                      .filter(Boolean)
                      .join(" — ")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Save as template */}
        {categoryId && (
          <div className="bg-white rounded-xl border border-gray-light p-4">
            {showSaveTemplate ? (
              <div className="flex items-center gap-2">
                <input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="اسم القالب (مثلاً: موبايل سامسونج)"
                  className="flex-1 text-sm px-3 py-2 bg-gray-light rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-brand-green"
                  onKeyDown={(e) => e.key === "Enter" && handleSaveTemplate()}
                  autoFocus
                />
                <button
                  onClick={handleSaveTemplate}
                  disabled={!templateName.trim()}
                  className="p-2 bg-brand-green text-white rounded-lg disabled:opacity-40"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => setShowSaveTemplate(false)}
                  className="p-2 text-gray-text"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSaveTemplate(true)}
                className="flex items-center gap-2 text-sm text-brand-green font-semibold"
              >
                <Bookmark size={16} />
                حفظ كقالب لاستخدامه لاحقاً
              </button>
            )}
          </div>
        )}

        {/* Publish errors */}
        {errors.publish && (
          <p className="text-sm text-error text-center bg-error/5 rounded-xl p-3">
            {errors.publish}
          </p>
        )}
      </div>

      {/* ── Bottom Action Buttons ── */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-light p-4 space-y-2 z-40">
        <Button
          fullWidth
          size="lg"
          onClick={() => handlePublish(true)}
          isLoading={isPublishing}
          icon={<Plus size={18} />}
        >
          حفظ وإضافة منتج تاني
        </Button>
        <Button
          fullWidth
          size="md"
          variant="outline"
          onClick={() => handlePublish(false)}
          disabled={isPublishing}
          icon={<Check size={16} />}
        >
          حفظ والرجوع للمنتجات
        </Button>
      </div>
    </div>
  );
}
