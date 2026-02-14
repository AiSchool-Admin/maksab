"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Plus,
  Check,
  Loader2,
  Rocket,
  Trash2,
  ChevronDown,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth-store";
import { getStoreByUserId } from "@/lib/stores/store-service";
import {
  getCategoryById,
  categoriesConfig,
  getEffectiveFields,
} from "@/lib/categories/categories-config";
import {
  generateAutoTitle,
  generateAutoDescription,
} from "@/lib/categories/generate";
import { getCategoryPlaceholderImage } from "@/lib/categories/placeholder-images";
import type { Store, CategoryConfig, CategoryField } from "@/types";

interface RapidRow {
  id: string;
  fields: Record<string, string>;
  price: string;
  status: "editing" | "publishing" | "success" | "error";
}

function createEmptyRow(requiredFieldIds: string[]): RapidRow {
  const fields: Record<string, string> = {};
  for (const fId of requiredFieldIds) {
    fields[fId] = "";
  }
  return {
    id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    fields,
    price: "",
    status: "editing",
  };
}

export default function RapidEntryPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryId, setCategoryId] = useState("");
  const [rows, setRows] = useState<RapidRow[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [showDone, setShowDone] = useState(false);
  const [successCount, setSuccessCount] = useState(0);

  const priceInputsRef = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    async function load() {
      const s = await getStoreByUserId(user!.id);
      if (!s) { router.push("/store/create"); return; }
      setStore(s);
      if (s.main_category) {
        setCategoryId(s.main_category);
        initRows(s.main_category);
      }
      setIsLoading(false);
    }
    load();
  }, [user, router]);

  // Initialize rows when category changes
  const initRows = useCallback((catId: string) => {
    const config = getCategoryById(catId);
    if (!config) return;
    const fieldIds = getVisibleRequiredFields(config);
    // Start with 3 empty rows
    setRows([
      createEmptyRow(fieldIds),
      createEmptyRow(fieldIds),
      createEmptyRow(fieldIds),
    ]);
  }, []);

  // Get the visible required field IDs for the rapid entry table
  function getVisibleRequiredFields(config: CategoryConfig): string[] {
    return config.requiredFields.slice(0, 4); // Max 4 required fields
  }

  // Get the CategoryField objects for display
  function getFieldConfigs(config: CategoryConfig): CategoryField[] {
    const reqIds = getVisibleRequiredFields(config);
    return reqIds
      .map(id => config.fields.find(f => f.id === id))
      .filter((f): f is CategoryField => !!f);
  }

  // Handle field change
  const handleFieldChange = useCallback((rowId: string, fieldId: string, value: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      return { ...r, fields: { ...r.fields, [fieldId]: value } };
    }));
  }, []);

  // Handle price change
  const handlePriceChange = useCallback((rowId: string, value: string) => {
    setRows(prev => prev.map(r =>
      r.id === rowId ? { ...r, price: value } : r
    ));
  }, []);

  // Add new row
  const addRow = useCallback(() => {
    const config = getCategoryById(categoryId);
    if (!config) return;
    const fieldIds = getVisibleRequiredFields(config);
    setRows(prev => [...prev, createEmptyRow(fieldIds)]);
  }, [categoryId]);

  // Remove row
  const removeRow = useCallback((rowId: string) => {
    setRows(prev => {
      if (prev.length <= 1) return prev; // Keep at least 1 row
      return prev.filter(r => r.id !== rowId);
    });
  }, []);

  // Handle Enter key → add new row or move to next
  const handleKeyDown = useCallback((e: React.KeyboardEvent, rowId: string, isLastField: boolean) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (isLastField) {
        // If this is the price field (last in row), add a new row
        addRow();
        // Focus will be set in useEffect after rows update
      }
    }
  }, [addRow]);

  // Focus first field of last row when rows change
  useEffect(() => {
    if (rows.length === 0) return;
    const lastRow = rows[rows.length - 1];
    if (lastRow.status !== "editing") return;
    // Auto-focus handled by the field rendering
  }, [rows.length]);

  // Check if a row has enough data to publish
  function isRowValid(row: RapidRow, config: CategoryConfig): boolean {
    const price = Number(row.price);
    if (!price || price <= 0) return false;
    // At least the first required field must be filled
    const reqFields = getVisibleRequiredFields(config);
    return reqFields.length === 0 || !!row.fields[reqFields[0]];
  }

  // Publish all valid rows
  const handlePublish = useCallback(async () => {
    if (!user || !store) return;
    const config = getCategoryById(categoryId);
    if (!config) return;

    const validRows = rows.filter(r => r.status === "editing" && isRowValid(r, config));
    if (validRows.length === 0) return;

    setIsPublishing(true);
    setPublishProgress(0);

    const placeholderImg = getCategoryPlaceholderImage(categoryId);

    // Build ads data
    const ads = validRows.map(row => {
      // Set defaults for unfilled optional fields
      const categoryFields: Record<string, unknown> = { ...row.fields };
      for (const field of config.fields) {
        if (!categoryFields[field.id] && field.defaultValue !== undefined) {
          categoryFields[field.id] = field.defaultValue;
        }
      }

      const title = generateAutoTitle(config, categoryFields) || "منتج جديد";
      const description = generateAutoDescription(config, categoryFields) || "";

      return {
        category_id: categoryId,
        title,
        description,
        price: Number(row.price),
        is_negotiable: false,
        category_fields: categoryFields,
        governorate: store.location_gov || null,
        city: store.location_area || null,
        images: [placeholderImg],
        sale_type: "cash",
      };
    });

    // Publish in one batch
    try {
      const res = await fetch("/api/ads/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          ads,
          store_id: store.id,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        const count = result.count || 0;
        setSuccessCount(count);

        // Mark rows as success
        const validIds = new Set(validRows.map(r => r.id));
        setRows(prev => prev.map(r =>
          validIds.has(r.id) ? { ...r, status: "success" as const } : r
        ));
      } else {
        // Mark as error
        const validIds = new Set(validRows.map(r => r.id));
        setRows(prev => prev.map(r =>
          validIds.has(r.id) ? { ...r, status: "error" as const } : r
        ));
      }
    } catch {
      // Mark all as error
      const validIds = new Set(validRows.map(r => r.id));
      setRows(prev => prev.map(r =>
        validIds.has(r.id) ? { ...r, status: "error" as const } : r
      ));
    }

    setIsPublishing(false);
    setShowDone(true);
  }, [rows, user, store, categoryId]);

  // Category change
  const handleCategoryChange = useCallback((catId: string) => {
    setCategoryId(catId);
    initRows(catId);
    setShowDone(false);
    setSuccessCount(0);
  }, [initRows]);

  const config = getCategoryById(categoryId);
  const fieldConfigs = config ? getFieldConfigs(config) : [];
  const validCount = config ? rows.filter(r => r.status === "editing" && isRowValid(r, config)).length : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-green" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="bg-brand-green text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => router.push("/store/dashboard/products")} className="p-1">
          <ArrowRight size={20} />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Rocket size={20} />
          <div>
            <h1 className="text-base font-bold">إدخال سريع</h1>
            <p className="text-[10px] text-white/70">سطر = منتج — Enter = سطر جديد</p>
          </div>
        </div>
        {successCount > 0 && (
          <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-lg">
            {successCount} تم نشرهم
          </span>
        )}
      </header>

      {/* Category selector */}
      <div className="px-4 mt-3">
        <div className="bg-white rounded-xl border border-gray-light p-3">
          <label className="block text-xs font-semibold text-gray-text mb-1">القسم</label>
          <div className="relative">
            <select
              value={categoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full appearance-none bg-gray-light rounded-lg px-3 py-2.5 pe-8 text-sm font-bold text-dark cursor-pointer outline-none focus:ring-2 focus:ring-brand-green"
            >
              <option value="" disabled>اختار القسم</option>
              {categoriesConfig.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute start-2 top-1/2 -translate-y-1/2 text-gray-text pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Done state */}
      {showDone && (
        <div className="mx-4 mt-3 bg-brand-green/10 border border-brand-green/30 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center">
              <Check size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-brand-green">{successCount} منتج تم نشرهم!</span>
          </div>
          <p className="text-xs text-gray-text mb-3">
            المنتجات اتنشرت بصورة افتراضية — ممكن تحدث الصور بعدين
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowDone(false);
                const editingRows = rows.filter(r => r.status === "editing");
                if (editingRows.length === 0 && config) {
                  const fieldIds = getVisibleRequiredFields(config);
                  setRows([createEmptyRow(fieldIds), createEmptyRow(fieldIds), createEmptyRow(fieldIds)]);
                }
              }}
              className="flex-1 bg-brand-green text-white text-sm font-bold py-2.5 rounded-xl"
            >
              أضف منتجات تانية
            </button>
            <button
              onClick={() => router.push("/store/dashboard/products")}
              className="flex-1 bg-white text-brand-green text-sm font-bold py-2.5 rounded-xl border border-brand-green"
            >
              عرض المنتجات
            </button>
          </div>
        </div>
      )}

      {/* Rapid Entry Table */}
      {config && !showDone && (
        <div className="px-4 mt-3">
          {/* Table header */}
          <div className="bg-brand-green/10 rounded-t-xl px-2 py-2 flex gap-1.5 items-center border border-brand-green/20 border-b-0">
            <span className="w-6 text-center text-[10px] text-brand-green font-bold">#</span>
            {fieldConfigs.map(field => (
              <span
                key={field.id}
                className="flex-1 text-[10px] font-bold text-brand-green text-center truncate"
                title={field.label}
              >
                {field.label}
              </span>
            ))}
            <span className="w-20 text-[10px] font-bold text-brand-green text-center">السعر</span>
            <span className="w-7" />
          </div>

          {/* Table rows */}
          <div className="space-y-0 border border-brand-green/20 border-t-0 rounded-b-xl overflow-hidden bg-white">
            {rows.map((row, rowIndex) => (
              <div
                key={row.id}
                className={`flex gap-1.5 items-center px-2 py-1.5 border-b border-gray-100 last:border-b-0 ${
                  row.status === "success" ? "bg-green-50" :
                  row.status === "error" ? "bg-red-50" :
                  row.status === "publishing" ? "bg-yellow-50" :
                  rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                }`}
              >
                {/* Row number */}
                <span className="w-6 text-center text-[10px] text-gray-text font-semibold flex-shrink-0">
                  {row.status === "success" ? (
                    <Check size={14} className="text-green-500 mx-auto" />
                  ) : row.status === "publishing" ? (
                    <Loader2 size={14} className="text-brand-gold animate-spin mx-auto" />
                  ) : (
                    rowIndex + 1
                  )}
                </span>

                {/* Fields */}
                {fieldConfigs.map((field, fieldIndex) => (
                  <div key={field.id} className="flex-1 min-w-0">
                    {field.type === "select" && field.options && field.options.length > 0 ? (
                      <select
                        value={row.fields[field.id] || ""}
                        onChange={(e) => handleFieldChange(row.id, field.id, e.target.value)}
                        disabled={row.status !== "editing"}
                        className="w-full text-xs bg-transparent border-0 outline-none py-1.5 px-1 rounded focus:bg-brand-green/5 focus:ring-1 focus:ring-brand-green disabled:opacity-50 cursor-pointer appearance-none"
                        autoFocus={rowIndex === rows.length - 1 && fieldIndex === 0}
                      >
                        <option value="">{field.label}</option>
                        {field.options.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : field.type === "year-picker" ? (
                      <input
                        type="number"
                        inputMode="numeric"
                        value={row.fields[field.id] || ""}
                        onChange={(e) => handleFieldChange(row.id, field.id, e.target.value)}
                        disabled={row.status !== "editing"}
                        placeholder={field.label}
                        className="w-full text-xs bg-transparent border-0 outline-none py-1.5 px-1 rounded focus:bg-brand-green/5 focus:ring-1 focus:ring-brand-green disabled:opacity-50 text-center"
                        min="1990"
                        max="2026"
                      />
                    ) : field.type === "number" ? (
                      <input
                        type="number"
                        inputMode="numeric"
                        value={row.fields[field.id] || ""}
                        onChange={(e) => handleFieldChange(row.id, field.id, e.target.value)}
                        disabled={row.status !== "editing"}
                        placeholder={field.unit || field.label}
                        className="w-full text-xs bg-transparent border-0 outline-none py-1.5 px-1 rounded focus:bg-brand-green/5 focus:ring-1 focus:ring-brand-green disabled:opacity-50 text-center"
                      />
                    ) : (
                      <input
                        type="text"
                        value={row.fields[field.id] || ""}
                        onChange={(e) => handleFieldChange(row.id, field.id, e.target.value)}
                        disabled={row.status !== "editing"}
                        placeholder={field.label}
                        className="w-full text-xs bg-transparent border-0 outline-none py-1.5 px-1 rounded focus:bg-brand-green/5 focus:ring-1 focus:ring-brand-green disabled:opacity-50"
                      />
                    )}
                  </div>
                ))}

                {/* Price */}
                <div className="w-20 flex-shrink-0">
                  <input
                    ref={(el) => { if (el) priceInputsRef.current.set(row.id, el); }}
                    type="number"
                    inputMode="numeric"
                    value={row.price}
                    onChange={(e) => handlePriceChange(row.id, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, row.id, true)}
                    disabled={row.status !== "editing"}
                    placeholder="السعر"
                    className="w-full text-xs font-bold text-brand-green bg-transparent border-0 outline-none py-1.5 px-1 rounded focus:bg-brand-green/5 focus:ring-1 focus:ring-brand-green disabled:opacity-50 text-center"
                  />
                </div>

                {/* Delete */}
                <div className="w-7 flex-shrink-0 flex items-center justify-center">
                  {row.status === "editing" && rows.length > 1 && (
                    <button
                      onClick={() => removeRow(row.id)}
                      className="p-0.5 text-gray-300 hover:text-error transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add row button */}
          <button
            onClick={addRow}
            className="w-full mt-2 flex items-center justify-center gap-1.5 py-2.5 bg-white border-2 border-dashed border-brand-green/30 rounded-xl text-brand-green text-xs font-bold hover:bg-brand-green/5 transition-colors"
          >
            <Plus size={14} />
            سطر جديد
          </button>

          {/* Info */}
          <div className="mt-3 bg-white rounded-xl border border-gray-light p-3">
            <p className="text-[11px] text-gray-text leading-relaxed">
              <span className="font-bold text-dark">نصيحة:</span> املا الماركة والموديل واختار الحالة وحط السعر — العنوان والوصف والصورة الافتراضية هيتعملوا أوتوماتيك. ممكن تحدث الصور بعد كده من صفحة المنتجات.
            </p>
          </div>
        </div>
      )}

      {/* Bottom publish bar */}
      {config && !showDone && rows.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-light p-4 z-40">
          <Button
            fullWidth
            size="lg"
            onClick={handlePublish}
            isLoading={isPublishing}
            disabled={validCount === 0}
            icon={<Rocket size={18} />}
          >
            {validCount > 0 ? `انشر ${validCount} منتج الآن` : "املا سطر واحد على الأقل"}
          </Button>
        </div>
      )}
    </div>
  );
}
