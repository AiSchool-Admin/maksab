"use client";

import DynamicCategoryForm from "@/components/ad/DynamicCategoryForm";
import { getCategoryById } from "@/lib/categories/categories-config";

interface Step2Props {
  categoryId: string;
  subcategoryId?: string;
  values: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: (fieldId: string, value: unknown) => void;
}

export default function Step2CategoryDetails({
  categoryId,
  subcategoryId,
  values,
  errors,
  onChange,
}: Step2Props) {
  const config = getCategoryById(categoryId);

  if (!config) {
    return (
      <div className="text-center py-10 text-gray-text">
        اختار القسم الأول في الخطوة السابقة
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-bold text-dark mb-4">
        تفاصيل {config.name}
      </h3>
      <DynamicCategoryForm
        config={config}
        subcategoryId={subcategoryId}
        values={values}
        onChange={onChange}
        errors={errors}
      />
    </div>
  );
}
