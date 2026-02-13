/**
 * Product Templates System
 *
 * Allows merchants to save and reuse product configurations.
 * Stored in localStorage for simplicity.
 */

export interface ProductTemplate {
  id: string;
  name: string;
  category_id: string;
  subcategory_id?: string;
  category_fields: Record<string, unknown>;
  default_price?: string;
  is_negotiable: boolean;
  created_at: string;
}

const STORAGE_KEY = "maksab_product_templates";

export function getTemplates(): ProductTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTemplate(template: Omit<ProductTemplate, "id" | "created_at">): ProductTemplate {
  const templates = getTemplates();
  const newTemplate: ProductTemplate = {
    ...template,
    id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    created_at: new Date().toISOString(),
  };
  templates.unshift(newTemplate);
  // Keep max 20 templates
  const trimmed = templates.slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  return newTemplate;
}

export function deleteTemplate(templateId: string): void {
  const templates = getTemplates().filter(t => t.id !== templateId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function getTemplateById(templateId: string): ProductTemplate | null {
  return getTemplates().find(t => t.id === templateId) || null;
}
