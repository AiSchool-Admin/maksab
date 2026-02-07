"use client";

import { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { getModelOptions } from "@/lib/categories/brand-models";
import type { CategoryConfig, CategoryField } from "@/types";

interface DynamicCategoryFormProps {
  config: CategoryConfig;
  values: Record<string, unknown>;
  onChange: (fieldId: string, value: unknown) => void;
  errors?: Record<string, string>;
}

export default function DynamicCategoryForm({
  config,
  values,
  onChange,
  errors = {},
}: DynamicCategoryFormProps) {
  const [showOptional, setShowOptional] = useState(false);

  const { requiredFields, optionalFields } = useMemo(() => {
    const sorted = [...config.fields].sort((a, b) => a.order - b.order);
    const reqSet = new Set(config.requiredFields);
    return {
      requiredFields: sorted.filter((f) => reqSet.has(f.id)),
      optionalFields: sorted.filter((f) => !reqSet.has(f.id)),
    };
  }, [config]);

  // Handle brand change — reset model when brand changes
  const handleFieldChange = (fieldId: string, value: unknown) => {
    onChange(fieldId, value);

    // If brand changed, reset model
    if (fieldId === "brand") {
      onChange("model", "");
    }
  };

  return (
    <div className="space-y-5">
      {/* Required fields */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-dark">الحقول الأساسية</h3>
        {requiredFields.map((field) => (
          <FieldRenderer
            key={field.id}
            field={field}
            value={values[field.id]}
            onChange={(val) => handleFieldChange(field.id, val)}
            error={errors[field.id]}
            required
            categoryId={config.id}
            brandValue={String(values.brand ?? "")}
          />
        ))}
      </div>

      {/* Optional fields */}
      {optionalFields.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="flex items-center gap-2 w-full py-3 text-sm font-semibold text-brand-green hover:text-brand-green-dark transition-colors"
          >
            <ChevronDown
              size={18}
              className={`transition-transform ${showOptional ? "rotate-180" : ""}`}
            />
            {showOptional
              ? "إخفاء الحقول الإضافية"
              : `إضافة تفاصيل أكتر (${optionalFields.length})`}
          </button>

          {showOptional && (
            <div className="space-y-4 pt-2">
              {optionalFields.map((field) => (
                <FieldRenderer
                  key={field.id}
                  field={field}
                  value={values[field.id]}
                  onChange={(val) => handleFieldChange(field.id, val)}
                  error={errors[field.id]}
                  categoryId={config.id}
                  brandValue={String(values.brand ?? "")}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Individual Field Renderer ────────────────────────────────────── */

interface FieldRendererProps {
  field: CategoryField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  required?: boolean;
  categoryId: string;
  brandValue: string;
}

function FieldRenderer({
  field,
  value,
  onChange,
  error,
  required,
  categoryId,
  brandValue,
}: FieldRendererProps) {
  // Get dynamic options for model fields based on brand
  const dynamicOptions = useMemo(() => {
    if (field.id === "model" && brandValue) {
      const models = getModelOptions(categoryId, brandValue);
      if (models.length > 0) return models;
    }
    return field.options ?? [];
  }, [field.id, field.options, categoryId, brandValue]);

  // Disable model field if brand not selected (for categories with brand→model dependency)
  const isModelWithoutBrand =
    field.id === "model" &&
    (categoryId === "cars" || categoryId === "phones") &&
    !brandValue;

  switch (field.type) {
    case "select":
      return (
        <Select
          label={field.label}
          name={field.id}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          options={dynamicOptions}
          placeholder={
            isModelWithoutBrand
              ? "اختار الماركة الأول"
              : field.placeholder ?? "اختار..."
          }
          error={error}
          required={required}
          disabled={isModelWithoutBrand}
        />
      );

    case "number":
      return (
        <Input
          label={field.label}
          name={field.id}
          type="number"
          inputMode="numeric"
          value={value !== undefined && value !== null ? String(value) : ""}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val === "" ? undefined : Number(val));
          }}
          unit={field.unit}
          placeholder={field.placeholder ?? ""}
          error={error}
          required={required}
        />
      );

    case "text":
      return (
        <Input
          label={field.label}
          name={field.id}
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? ""}
          error={error}
          required={required}
        />
      );

    case "toggle":
      return (
        <ToggleField
          label={field.label}
          checked={Boolean(value)}
          onChange={(checked) => onChange(checked)}
        />
      );

    case "multi-select":
      return (
        <MultiSelectField
          field={field}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          error={error}
          required={required}
        />
      );

    case "year-picker":
      return (
        <YearPickerField
          field={field}
          value={value !== undefined && value !== null ? String(value) : ""}
          onChange={onChange}
          error={error}
          required={required}
        />
      );

    default:
      return null;
  }
}

/* ── Toggle Field ──────────────────────────────────────────────────── */

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-3 px-4 bg-gray-light rounded-xl hover:bg-gray-200 transition-colors"
    >
      <span className="text-sm font-medium text-dark">{label}</span>
      <div
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? "bg-brand-green" : "bg-gray-300"
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? "start-0.5" : "end-0.5"
          }`}
        />
      </div>
    </button>
  );
}

/* ── Multi-Select Field ────────────────────────────────────────────── */

function MultiSelectField({
  field,
  value,
  onChange,
  error,
  required,
}: {
  field: CategoryField;
  value: string[];
  onChange: (value: unknown) => void;
  error?: string;
  required?: boolean;
}) {
  const toggle = (optValue: string) => {
    const newValue = value.includes(optValue)
      ? value.filter((v) => v !== optValue)
      : [...value, optValue];
    onChange(newValue);
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-dark mb-1.5">
        {field.label}
        {required && <span className="text-error me-0.5">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {(field.options ?? []).map((opt) => {
          const selected = value.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                selected
                  ? "bg-brand-green text-white"
                  : "bg-gray-light text-dark hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}

/* ── Year Picker Field ─────────────────────────────────────────────── */

function YearPickerField({
  field,
  value,
  onChange,
  error,
  required,
}: {
  field: CategoryField;
  value: string;
  onChange: (value: unknown) => void;
  error?: string;
  required?: boolean;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1989 }, (_, i) => ({
    value: String(currentYear - i),
    label: String(currentYear - i),
  }));

  return (
    <Select
      label={field.label}
      name={field.id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={years}
      placeholder={field.placeholder ?? "اختار السنة"}
      error={error}
      required={required}
    />
  );
}
