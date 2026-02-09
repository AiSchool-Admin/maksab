"use client";

import { useMemo } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { getModelOptions } from "@/lib/categories/brand-models";
import type { CategoryConfig, CategoryField } from "@/types";

interface DynamicCategoryFormProps {
  config: CategoryConfig;
  subcategoryId?: string;
  values: Record<string, unknown>;
  onChange: (fieldId: string, value: unknown) => void;
  errors?: Record<string, string>;
}

export default function DynamicCategoryForm({
  config,
  subcategoryId,
  values,
  onChange,
  errors = {},
}: DynamicCategoryFormProps) {
  // Use subcategory override for requiredFields if available
  const override = subcategoryId ? config.subcategoryOverrides?.[subcategoryId] : undefined;
  const reqFieldIds = new Set(override?.requiredFields ?? config.requiredFields);

  const visibleFields = useMemo(() => {
    // Start with base fields, apply field overrides if any
    let fields = config.fields.map((f) => {
      const fieldOverride = override?.fieldOverrides?.[f.id];
      if (fieldOverride) {
        return { ...f, ...fieldOverride } as typeof f;
      }
      return f;
    });

    // Filter out fields hidden for this subcategory
    fields = fields.filter(
      (f) => !subcategoryId || !f.hiddenForSubcategories?.includes(subcategoryId),
    );

    // Add extra fields from subcategory override
    if (override?.extraFields) {
      fields = [...fields, ...override.extraFields];
    }

    return fields.sort((a, b) => a.order - b.order);
  }, [config, subcategoryId, override]);

  // Handle brand change — reset model when brand changes
  const handleFieldChange = (fieldId: string, value: unknown) => {
    onChange(fieldId, value);

    // If brand changed, reset model
    if (fieldId === "brand") {
      onChange("model", "");
    }
  };

  return (
    <div className="space-y-4">
      {visibleFields.map((field) => {
        const isRequired = reqFieldIds.has(field.id);
        return (
          <FieldRenderer
            key={field.id}
            field={field}
            value={values[field.id]}
            onChange={(val) => handleFieldChange(field.id, val)}
            error={errors[field.id]}
            required={isRequired}
            showOptionalLabel={!isRequired}
            categoryId={config.id}
            brandValue={String(values.brand ?? "")}
          />
        );
      })}
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
  showOptionalLabel?: boolean;
  categoryId: string;
  brandValue: string;
}

function FieldRenderer({
  field,
  value,
  onChange,
  error,
  required,
  showOptionalLabel,
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

  const label = showOptionalLabel
    ? `${field.label} (اختياري)`
    : field.label;

  switch (field.type) {
    case "select":
      return (
        <Select
          label={label}
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
          label={label}
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
          label={label}
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
          label={label}
          checked={Boolean(value)}
          onChange={(checked) => onChange(checked)}
        />
      );

    case "multi-select":
      return (
        <MultiSelectField
          field={field}
          label={label}
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
          label={label}
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
  label,
  value,
  onChange,
  error,
  required,
}: {
  field: CategoryField;
  label: string;
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
        {label}
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
  label,
  value,
  onChange,
  error,
  required,
}: {
  field: CategoryField;
  label: string;
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
      label={label}
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
