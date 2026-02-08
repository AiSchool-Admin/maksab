"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, Sparkles, Plus, X } from "lucide-react";
import { categoriesConfig, getCategoryById } from "@/lib/categories/categories-config";
import { generateWantedTitle } from "@/lib/exchange/exchange-engine";
import type { CategoryField } from "@/types";

interface ExchangeWantedFormProps {
  wantedCategoryId: string;
  wantedSubcategoryId: string;
  wantedFields: Record<string, unknown>;
  wantedTitle: string;
  notes: string;
  acceptsPriceDiff: boolean;
  priceDiff: string;
  errors: Record<string, string>;
  onCategoryChange: (id: string) => void;
  onSubcategoryChange: (id: string) => void;
  onFieldChange: (fieldId: string, value: unknown) => void;
  onTitleChange: (title: string) => void;
  onNotesChange: (notes: string) => void;
  onAcceptsPriceDiffChange: (accepts: boolean) => void;
  onPriceDiffChange: (diff: string) => void;
}

// Services category excluded — can't exchange with a service
const exchangeCategories = categoriesConfig.filter((c) => c.id !== "services");

export default function ExchangeWantedForm({
  wantedCategoryId,
  wantedSubcategoryId,
  wantedFields,
  wantedTitle,
  notes,
  acceptsPriceDiff,
  priceDiff,
  errors,
  onCategoryChange,
  onSubcategoryChange,
  onFieldChange,
  onTitleChange,
  onNotesChange,
  onAcceptsPriceDiffChange,
  onPriceDiffChange,
}: ExchangeWantedFormProps) {
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  const selectedCategory = wantedCategoryId ? getCategoryById(wantedCategoryId) : null;

  // Get fields for the wanted category (only show key ones)
  const getFieldsToShow = useCallback(() => {
    if (!selectedCategory) return { required: [], optional: [] };

    const override = wantedSubcategoryId
      ? selectedCategory.subcategoryOverrides?.[wantedSubcategoryId]
      : undefined;
    const reqFieldIds = override?.requiredFields ?? selectedCategory.requiredFields;

    const required: CategoryField[] = [];
    const optional: CategoryField[] = [];

    for (const field of selectedCategory.fields) {
      // Skip fields hidden for selected subcategory
      if (wantedSubcategoryId && field.hiddenForSubcategories?.includes(wantedSubcategoryId)) {
        continue;
      }

      if (reqFieldIds.includes(field.id)) {
        required.push(field);
      } else {
        optional.push(field);
      }
    }

    return { required: required.slice(0, 4), optional: optional.slice(0, 4) };
  }, [selectedCategory, wantedSubcategoryId]);

  const { required: requiredFields, optional: optionalFields } = getFieldsToShow();

  // Auto-generate wanted title when fields change
  useEffect(() => {
    if (!wantedCategoryId) return;
    const title = generateWantedTitle(wantedCategoryId, wantedFields, wantedSubcategoryId || undefined);
    if (title) onTitleChange(title);
  }, [wantedCategoryId, wantedSubcategoryId, wantedFields, onTitleChange]);

  // Reset fields when category changes
  const handleCategorySelect = (catId: string) => {
    if (catId === wantedCategoryId) return;
    onCategoryChange(catId);
    onSubcategoryChange("");

    // Set default values for the new category
    const config = getCategoryById(catId);
    if (config) {
      for (const field of config.fields) {
        if (field.defaultValue !== undefined) {
          onFieldChange(field.id, field.defaultValue);
        }
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Section header ── */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="text-lg">🔄</span>
        </div>
        <div>
          <h3 className="text-sm font-bold text-dark">عايز تبدل بإيه؟</h3>
          <p className="text-[11px] text-gray-text">اختار القسم وحدد المواصفات</p>
        </div>
      </div>

      {/* ── Category grid ── */}
      <div>
        <label className="block text-xs font-medium text-dark mb-2">
          قسم البديل المطلوب <span className="text-error">*</span>
        </label>
        <div className="grid grid-cols-4 gap-2">
          {exchangeCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategorySelect(cat.id)}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${
                wantedCategoryId === cat.id
                  ? "border-brand-green bg-brand-green-light shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <span className="text-xl">{cat.icon}</span>
              <span
                className={`text-[10px] font-medium leading-tight text-center ${
                  wantedCategoryId === cat.id ? "text-brand-green-dark" : "text-gray-text"
                }`}
              >
                {cat.name}
              </span>
            </button>
          ))}
        </div>
        {errors.exchangeWantedCategory && (
          <p className="mt-1 text-xs text-error">{errors.exchangeWantedCategory}</p>
        )}
      </div>

      {/* ── Subcategory chips ── */}
      {selectedCategory && selectedCategory.subcategories.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-dark mb-2">
            القسم الفرعي (اختياري)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {selectedCategory.subcategories.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() =>
                  onSubcategoryChange(wantedSubcategoryId === sub.id ? "" : sub.id)
                }
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  wantedSubcategoryId === sub.id
                    ? "bg-brand-green text-white"
                    : "bg-gray-light text-dark hover:bg-gray-200"
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Required fields ── */}
      {selectedCategory && requiredFields.length > 0 && (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-dark">
            مواصفات البديل المطلوب
          </label>

          {requiredFields.map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={wantedFields[field.id]}
              onChange={(val) => onFieldChange(field.id, val)}
              error={errors[`exchange_${field.id}`]}
            />
          ))}
        </div>
      )}

      {/* ── Optional fields toggle ── */}
      {selectedCategory && optionalFields.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowOptionalFields(!showOptionalFields)}
            className="flex items-center gap-1.5 text-xs text-brand-green font-medium"
          >
            {showOptionalFields ? <X size={14} /> : <Plus size={14} />}
            {showOptionalFields ? "إخفاء التفاصيل الإضافية" : "أضف تفاصيل أكتر (اختياري)"}
          </button>

          {showOptionalFields && (
            <div className="mt-3 space-y-3">
              {optionalFields.map((field) => (
                <FieldInput
                  key={field.id}
                  field={field}
                  value={wantedFields[field.id]}
                  onChange={(val) => onFieldChange(field.id, val)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Auto-generated wanted item preview ── */}
      {wantedTitle && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} className="text-blue-600" />
            <span className="text-[11px] font-bold text-blue-700">البديل المطلوب</span>
          </div>
          <p className="text-sm font-bold text-dark flex items-center gap-2">
            <span>{selectedCategory?.icon}</span>
            {wantedTitle}
          </p>
        </div>
      )}

      {/* ── Optional notes ── */}
      <div>
        <label className="block text-xs font-medium text-dark mb-1.5">
          ملاحظات إضافية (اختياري)
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="أي تفاصيل تانية عن البديل المطلوب..."
          rows={2}
          className="w-full px-4 py-2.5 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark text-sm placeholder:text-gray-text resize-none"
        />
      </div>

      {/* ── Price difference ── */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onAcceptsPriceDiffChange(!acceptsPriceDiff)}
          className="flex items-center gap-2 text-sm"
        >
          <span
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              acceptsPriceDiff
                ? "bg-brand-green border-brand-green"
                : "border-gray-300"
            }`}
          >
            {acceptsPriceDiff && (
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                <path
                  d="M1 5L4.5 8.5L11 1.5"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <span className="text-dark font-medium">أقبل فرق سعر</span>
        </button>

        {acceptsPriceDiff && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={priceDiff}
              onChange={(e) => onPriceDiffChange(e.target.value)}
              placeholder="0"
              className="flex-1 px-4 py-2.5 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark text-sm"
            />
            <span className="text-sm text-gray-text font-medium flex-shrink-0">جنيه</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Reusable field input renderer ──────────────────────────────────── */

function FieldInput({
  field,
  value,
  onChange,
  error,
}: {
  field: CategoryField;
  value: unknown;
  onChange: (val: unknown) => void;
  error?: string;
}) {
  if (field.type === "select" && field.options) {
    return (
      <div>
        <label className="block text-[11px] font-medium text-gray-text mb-1">
          {field.label}
        </label>
        <div className="relative">
          <select
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full px-3 py-2.5 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark text-sm appearance-none ${
              error ? "border-error bg-error/5" : ""
            }`}
          >
            <option value="">اختار {field.label}</option>
            {field.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-text pointer-events-none"
          />
        </div>
        {error && <p className="mt-0.5 text-[10px] text-error">{error}</p>}
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div>
        <label className="block text-[11px] font-medium text-gray-text mb-1">
          {field.label}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || "0"}
            className={`flex-1 px-3 py-2.5 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark text-sm ${
              error ? "border-error bg-error/5" : ""
            }`}
          />
          {field.unit && (
            <span className="text-xs text-gray-text font-medium flex-shrink-0">
              {field.unit}
            </span>
          )}
        </div>
        {error && <p className="mt-0.5 text-[10px] text-error">{error}</p>}
      </div>
    );
  }

  if (field.type === "year-picker") {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear - 1989 }, (_, i) => currentYear - i);
    return (
      <div>
        <label className="block text-[11px] font-medium text-gray-text mb-1">
          {field.label}
        </label>
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2.5 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark text-sm appearance-none"
        >
          <option value="">اختار</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "toggle") {
    return (
      <button
        type="button"
        onClick={() => onChange(!value)}
        className="flex items-center gap-2 text-sm"
      >
        <span
          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
            value ? "bg-brand-green border-brand-green" : "border-gray-300"
          }`}
        >
          {Boolean(value) && (
            <svg width="10" height="8" viewBox="0 0 12 10" fill="none">
              <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span className="text-dark font-medium text-xs">{field.label}</span>
      </button>
    );
  }

  // Text fallback
  return (
    <div>
      <label className="block text-[11px] font-medium text-gray-text mb-1">
        {field.label}
      </label>
      <input
        type="text"
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || ""}
        className="w-full px-3 py-2.5 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark text-sm"
      />
    </div>
  );
}
