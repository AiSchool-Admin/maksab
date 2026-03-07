/**
 * محوّل البيانات — OLX → مكسب
 * Data Transformer — OLX → Maksab
 *
 * يحوّل بيانات OLX الخام لصيغة مكسب
 */

import type { OlxListingRaw, MaksabAd, MaksabSeller } from './types';
import {
  OLX_CATEGORIES,
  BRAND_MAPPING,
  GOVERNORATE_MAPPING,
  CONDITION_MAPPING,
  FUEL_MAPPING,
  TRANSMISSION_MAPPING,
} from './category-mapping';

// ── Main Transform Function ────────────────────────

export function transformListing(raw: OlxListingRaw): MaksabAd | null {
  // Find matching Maksab category
  const categoryMap = findCategoryMapping(raw);

  if (!categoryMap) {
    // Unknown category — skip
    return null;
  }

  // Map location
  const governorate = mapGovernorate(raw.location.governorate);
  const city = raw.location.city || '';

  // Map category-specific fields
  const categoryFields = mapCategoryFields(raw, categoryMap);

  // Generate proper title
  const title = generateTitle(raw, categoryMap.maksabCategoryId, categoryFields) || raw.title;

  // Generate description
  const description = generateDescription(raw, categoryMap.maksabCategoryId, categoryFields) || raw.description;

  return {
    title: cleanText(title).slice(0, 200),
    description: cleanText(description).slice(0, 2000),
    category_id: categoryMap.maksabCategoryId,
    subcategory_id: categoryMap.maksabSubcategoryId || categoryMap.maksabCategoryId,
    sale_type: 'cash',
    price: raw.price.value > 0 ? raw.price.value : null,
    is_negotiable: raw.price.negotiable,
    category_fields: categoryFields,
    governorate,
    city,
    latitude: raw.location.lat,
    longitude: raw.location.lng,
    images: raw.images.slice(0, 5), // Max 5 images
    status: 'active',
    source: 'olx',
    source_url: raw.url,
    source_id: raw.id,
    source_seller_id: raw.seller.id,
    source_seller_name: raw.seller.name,
    source_seller_phone: raw.seller.phone,
    extracted_at: new Date().toISOString(),
  };
}

export function transformSeller(
  raw: OlxListingRaw,
  score: number,
  tier: MaksabSeller['seller_tier']
): MaksabSeller {
  return {
    name: raw.seller.name,
    phone: raw.seller.phone,
    source: 'olx',
    source_profile_url: raw.seller.profileUrl,
    source_id: raw.seller.id,
    categories: [],
    active_ads_count: raw.seller.adsCount || 1,
    location: {
      governorate: mapGovernorate(raw.location.governorate),
      city: raw.location.city,
    },
    seller_score: score,
    seller_tier: tier,
    member_since: raw.seller.memberSince,
    notes: '',
  };
}

// ── Category Matching ──────────────────────────────

function findCategoryMapping(raw: OlxListingRaw) {
  // Try exact match by OLX category ID
  let match = OLX_CATEGORIES.find((c) => c.olxId === raw.category.id);
  if (match) return match;

  // Try by parent category ID
  if (raw.category.parentId) {
    match = OLX_CATEGORIES.find((c) => c.olxId === raw.category.parentId);
    if (match) return match;
  }

  // Try by category name (fuzzy)
  const catName = (raw.category.name || '').toLowerCase();
  const parentName = (raw.category.parentName || '').toLowerCase();

  for (const cm of OLX_CATEGORIES) {
    if (
      catName.includes(cm.olxSlug.replace(/-/g, ' ')) ||
      catName.includes(cm.olxName) ||
      parentName.includes(cm.olxName)
    ) {
      return cm;
    }
  }

  // Keyword-based fallback
  const titleLower = raw.title.toLowerCase();

  if (titleLower.match(/سيار|تويوتا|هيونداي|كيا|بي ام|مرسيدس|فيات|شيفروليه/)) {
    return OLX_CATEGORIES.find((c) => c.olxSlug === 'cars-for-sale');
  }
  if (titleLower.match(/شقة|فيلا|أرض|محل|مكتب|عقار|إيجار/)) {
    return OLX_CATEGORIES.find((c) => c.olxSlug === 'apartments-duplex-for-sale');
  }
  if (titleLower.match(/آيفون|iphone|سامسونج|samsung|شاومي|xiaomi|موبايل|هاتف/)) {
    return OLX_CATEGORIES.find((c) => c.olxSlug === 'mobile-phones');
  }

  return null;
}

// ── Field Mapping ──────────────────────────────────

function mapCategoryFields(
  raw: OlxListingRaw,
  categoryMap: (typeof OLX_CATEGORIES)[0]
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  const attrs = raw.attributes;

  // Map each OLX attribute to Maksab field using the mapping
  for (const [olxKey, maksabKey] of Object.entries(categoryMap.fieldMapping)) {
    const value = findAttribute(attrs, olxKey);
    if (value) {
      fields[maksabKey] = normalizeFieldValue(maksabKey, value, categoryMap.maksabCategoryId);
    }
  }

  // Try extracting from title if fields are missing
  if (categoryMap.maksabCategoryId === 'cars') {
    extractCarFieldsFromTitle(raw.title, fields);
  } else if (categoryMap.maksabCategoryId === 'phones') {
    extractPhoneFieldsFromTitle(raw.title, fields);
  }

  return fields;
}

function findAttribute(attrs: Record<string, string>, key: string): string | undefined {
  // Direct match
  if (attrs[key]) return attrs[key];

  // Case-insensitive
  const lowerKey = key.toLowerCase();
  for (const [k, v] of Object.entries(attrs)) {
    if (k.toLowerCase() === lowerKey) return v;
    if (k.toLowerCase().includes(lowerKey)) return v;
  }

  return undefined;
}

function normalizeFieldValue(fieldId: string, value: string, categoryId: string): unknown {
  const lower = value.toLowerCase().trim();

  switch (fieldId) {
    case 'brand': {
      const brandMap = BRAND_MAPPING[categoryId];
      return brandMap?.[lower] || brandMap?.[value] || value;
    }
    case 'condition':
      return CONDITION_MAPPING[lower] || CONDITION_MAPPING[value] || value;
    case 'fuel':
      return FUEL_MAPPING[lower] || FUEL_MAPPING[value] || value;
    case 'transmission':
      return TRANSMISSION_MAPPING[lower] || TRANSMISSION_MAPPING[value] || value;
    case 'year': {
      const year = parseInt(value, 10);
      return year >= 1990 && year <= 2027 ? year : value;
    }
    case 'mileage':
    case 'area':
    case 'rooms': {
      const num = parseInt(value.replace(/[^\d]/g, ''), 10);
      return isNaN(num) ? value : num;
    }
    default:
      return value;
  }
}

// ── Title-based Field Extraction ───────────────────

function extractCarFieldsFromTitle(title: string, fields: Record<string, unknown>) {
  // Extract year (4 digits between 1990-2027)
  if (!fields.year) {
    const yearMatch = title.match(/\b(19[9][0-9]|20[0-2][0-9])\b/);
    if (yearMatch) fields.year = parseInt(yearMatch[1], 10);
  }

  // Extract mileage
  if (!fields.mileage) {
    const kmMatch = title.match(/([\d,]+)\s*(كم|km|كيلو)/i);
    if (kmMatch) fields.mileage = parseInt(kmMatch[1].replace(/,/g, ''), 10);
  }

  // Extract brand from title
  if (!fields.brand) {
    const titleLower = title.toLowerCase();
    for (const [name, id] of Object.entries(BRAND_MAPPING.cars || {})) {
      if (titleLower.includes(name.toLowerCase())) {
        fields.brand = id;
        break;
      }
    }
  }

  // Extract transmission
  if (!fields.transmission) {
    if (title.includes('أوتوماتيك') || title.toLowerCase().includes('automatic')) {
      fields.transmission = 'automatic';
    } else if (title.includes('مانيوال') || title.toLowerCase().includes('manual')) {
      fields.transmission = 'manual';
    }
  }
}

function extractPhoneFieldsFromTitle(title: string, fields: Record<string, unknown>) {
  // Extract brand
  if (!fields.brand) {
    const titleLower = title.toLowerCase();
    for (const [name, id] of Object.entries(BRAND_MAPPING.phones || {})) {
      if (titleLower.includes(name.toLowerCase())) {
        fields.brand = id;
        break;
      }
    }
  }

  // Extract storage
  if (!fields.storage) {
    const storageMatch = title.match(/(\d+)\s*(gb|جيجا|g)/i);
    if (storageMatch) {
      const size = parseInt(storageMatch[1], 10);
      if ([32, 64, 128, 256, 512, 1024].includes(size) || size === 1) {
        fields.storage = size === 1024 || size === 1 ? '1TB' : `${size}GB`;
      }
    }
  }

  // Extract condition
  if (!fields.condition) {
    if (title.includes('متبرشم') || title.includes('جديد')) {
      fields.condition = 'new_sealed';
    } else if (title.includes('زيرو') || title.includes('زي الجديد')) {
      fields.condition = 'used_excellent';
    } else if (title.includes('مستعمل')) {
      fields.condition = 'used_good';
    }
  }
}

// ── Title & Description Generation ─────────────────

function generateTitle(
  raw: OlxListingRaw,
  categoryId: string,
  fields: Record<string, unknown>
): string | null {
  switch (categoryId) {
    case 'cars': {
      const brand = fields.brand || '';
      const model = fields.model || '';
      const year = fields.year || '';
      const mileage = fields.mileage;
      if (brand && year) {
        const parts = [brand, model, year].filter(Boolean);
        if (mileage) parts.push(`— ${formatNumber(Number(mileage))} كم`);
        return parts.join(' ');
      }
      return null;
    }
    case 'phones': {
      const brand = fields.brand || '';
      const model = fields.model || '';
      const storage = fields.storage || '';
      const condition = fields.condition || '';
      if (brand) {
        const parts = [brand, model, storage].filter(Boolean);
        if (condition) parts.push(`— ${condition}`);
        return parts.join(' ');
      }
      return null;
    }
    case 'real_estate': {
      const type = fields.property_type || 'شقة';
      const area = fields.area;
      const rooms = fields.rooms;
      const parts = [type];
      if (area) parts.push(`${area}م²`);
      if (rooms) parts.push(`— ${rooms} غرف`);
      return parts.join(' ');
    }
    default:
      return null;
  }
}

function generateDescription(
  raw: OlxListingRaw,
  categoryId: string,
  fields: Record<string, unknown>
): string | null {
  // Use original description if available, otherwise generate
  if (raw.description && raw.description.length > 20) {
    return raw.description;
  }

  const parts: string[] = [];

  switch (categoryId) {
    case 'cars': {
      if (fields.brand) parts.push(`سيارة ${fields.brand}`);
      if (fields.model) parts.push(String(fields.model));
      if (fields.year) parts.push(`موديل ${fields.year}`);
      if (fields.mileage) parts.push(`مسافة ${formatNumber(Number(fields.mileage))} كم`);
      if (fields.transmission) parts.push(String(fields.transmission));
      if (fields.fuel) parts.push(String(fields.fuel));
      if (fields.color) parts.push(`لون ${fields.color}`);
      break;
    }
    case 'phones': {
      if (fields.brand) parts.push(String(fields.brand));
      if (fields.model) parts.push(String(fields.model));
      if (fields.storage) parts.push(String(fields.storage));
      if (fields.condition) parts.push(String(fields.condition));
      if (fields.color) parts.push(`لون ${fields.color}`);
      break;
    }
    case 'real_estate': {
      if (fields.property_type) parts.push(String(fields.property_type));
      if (fields.area) parts.push(`${fields.area} م²`);
      if (fields.rooms) parts.push(`${fields.rooms} غرف`);
      if (fields.finishing) parts.push(String(fields.finishing));
      break;
    }
    default:
      return null;
  }

  return parts.length > 0 ? parts.join('، ') : null;
}

// ── Location Mapping ───────────────────────────────

function mapGovernorate(olxGovernorate: string): string {
  if (!olxGovernorate) return '';

  // Direct match
  if (GOVERNORATE_MAPPING[olxGovernorate]) {
    return GOVERNORATE_MAPPING[olxGovernorate];
  }

  // Case-insensitive
  const lower = olxGovernorate.toLowerCase().trim();
  for (const [key, value] of Object.entries(GOVERNORATE_MAPPING)) {
    if (key.toLowerCase() === lower) return value;
  }

  // Partial match
  for (const [key, value] of Object.entries(GOVERNORATE_MAPPING)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return value;
    }
  }

  return olxGovernorate;
}

// ── Helpers ────────────────────────────────────────

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\n\r\t]+/g, ' ')
    .trim();
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}
