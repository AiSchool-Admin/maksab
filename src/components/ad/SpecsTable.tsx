"use client";

import { getCategoryById } from "@/lib/categories/categories-config";
import { resolveFieldLabel } from "@/lib/categories/generate";

interface SpecsTableProps {
  categoryId: string;
  categoryFields: Record<string, unknown>;
}

export default function SpecsTable({
  categoryId,
  categoryFields,
}: SpecsTableProps) {
  const config = getCategoryById(categoryId);
  if (!config) return null;

  const rows: { label: string; value: string }[] = [];

  for (const field of config.fields) {
    const rawValue = categoryFields[field.id];
    const resolved = resolveFieldLabel(field, rawValue);
    if (resolved) {
      rows.push({ label: field.label, value: resolved });
    }
  }

  if (rows.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-bold text-dark mb-3">المواصفات</h3>
      <div className="bg-gray-light rounded-xl overflow-hidden divide-y divide-gray-200">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center px-4 py-3">
            <span className="text-sm text-gray-text w-2/5 flex-shrink-0">
              {row.label}
            </span>
            <span className="text-sm font-medium text-dark flex-1">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
