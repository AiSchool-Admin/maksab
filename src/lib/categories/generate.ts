import type { CategoryConfig, CategoryField } from "@/types";

/**
 * Resolve a field value to its display label.
 * For select fields, maps value → label. For others, returns the raw value.
 */
export function resolveFieldLabel(
  field: CategoryField,
  value: unknown,
): string | null {
  if (value === undefined || value === null || value === "") return null;

  if (field.type === "select" && field.options) {
    const option = field.options.find((o) => o.value === String(value));
    return option?.label ?? String(value);
  }

  if (field.type === "toggle") {
    return value ? field.label : null;
  }

  if (field.type === "multi-select" && Array.isArray(value)) {
    if (value.length === 0) return null;
    return value
      .map((v) => {
        const opt = field.options?.find((o) => o.value === v);
        return opt?.label ?? v;
      })
      .join("، ");
  }

  if (field.type === "number" && field.unit) {
    return `${formatNumber(Number(value))} ${field.unit}`;
  }

  return String(value);
}

/**
 * Format number with comma separators (e.g. 45000 → "45,000")
 */
function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * Resolve a template string by replacing ${fieldId} placeholders
 * with the resolved field labels.
 */
function resolveTemplate(
  template: string,
  config: CategoryConfig,
  values: Record<string, unknown>,
): string {
  const fieldsMap = new Map(config.fields.map((f) => [f.id, f]));

  const resolved = template.replace(/\$\{(\w+)\}/g, (_, fieldId) => {
    const field = fieldsMap.get(fieldId);
    if (!field) return "";

    const label = resolveFieldLabel(field, values[fieldId]);
    return label ?? "";
  });

  // Clean up: remove double spaces, trailing separators
  return resolved
    .replace(/\s{2,}/g, " ")
    .replace(/\s*[—،\-]\s*$/g, "")
    .replace(/^\s*[—،\-]\s*/g, "")
    .trim();
}

/**
 * Generate auto-title from category template and field values.
 */
export function generateAutoTitle(
  config: CategoryConfig,
  values: Record<string, unknown>,
): string {
  return resolveTemplate(config.titleTemplate, config, values);
}

/**
 * Generate auto-description from category template and field values,
 * then append any filled optional fields.
 */
export function generateAutoDescription(
  config: CategoryConfig,
  values: Record<string, unknown>,
): string {
  const base = resolveTemplate(config.descriptionTemplate, config, values);

  // Append optional filled fields not already in the template
  const templateFieldIds = new Set<string>();
  config.descriptionTemplate.replace(/\$\{(\w+)\}/g, (_, id) => {
    templateFieldIds.add(id);
    return "";
  });

  const extras: string[] = [];
  for (const field of config.fields) {
    if (templateFieldIds.has(field.id)) continue;
    const label = resolveFieldLabel(field, values[field.id]);
    if (label) {
      extras.push(label);
    }
  }

  if (extras.length > 0) {
    return `${base}، ${extras.join("، ")}`;
  }

  return base;
}
