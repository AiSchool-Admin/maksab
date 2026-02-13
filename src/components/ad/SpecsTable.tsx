"use client";

import { getCategoryById, getEffectiveFields } from "@/lib/categories/categories-config";
import { resolveFieldLabel } from "@/lib/categories/generate";

interface SpecsTableProps {
  categoryId: string;
  subcategoryId?: string | null;
  categoryFields: Record<string, unknown>;
}

export default function SpecsTable({
  categoryId,
  subcategoryId,
  categoryFields,
}: SpecsTableProps) {
  const config = getCategoryById(categoryId);
  if (!config) return null;

  // Use effective fields (with subcategory overrides applied)
  const effectiveFields = getEffectiveFields(config, subcategoryId);

  const rows: { label: string; value: string }[] = [];

  for (const field of effectiveFields) {
    // Skip internal/media fields (prefixed with _)
    if (field.id.startsWith("_")) continue;
    const rawValue = categoryFields[field.id];
    const resolved = resolveFieldLabel(field, rawValue);
    if (resolved) {
      rows.push({ label: field.label, value: resolved });
    }
  }

  // Also filter out any raw _-prefixed keys that exist in categoryFields but not in config
  // (e.g. _video_url, _voice_note_url stored alongside category fields)

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
