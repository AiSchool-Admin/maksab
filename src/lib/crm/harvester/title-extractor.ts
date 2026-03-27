/**
 * Extract structured data from listing title
 * Works at harvest time — no detail page needed
 */

// ─── Car brands: Arabic → canonical name ───
const CAR_BRANDS: [RegExp, string][] = [
  [/تويوتا|toyota/i, "تويوتا"],
  [/هيونداي|hyundai/i, "هيونداي"],
  [/شيفروليه|chevrolet/i, "شيفروليه"],
  [/نيسان|nissan/i, "نيسان"],
  [/كيا|kia\b/i, "كيا"],
  [/بي إم دبليو|بي ام|bmw/i, "BMW"],
  [/مرسيدس|mercedes|بنز/i, "مرسيدس"],
  [/فيات|fiat/i, "فيات"],
  [/سكودا|skoda/i, "سكودا"],
  [/أوبل|opel/i, "أوبل"],
  [/بيجو|peugeot/i, "بيجو"],
  [/رينو|renault/i, "رينو"],
  [/سوزوكي|suzuki/i, "سوزوكي"],
  [/ميتسوبيشي|mitsubishi/i, "ميتسوبيشي"],
  [/هوندا|honda/i, "هوندا"],
  [/\bMG\b/i, "MG"],
  [/شيري|chery/i, "شيري"],
  [/بي واي دي|byd/i, "BYD"],
  [/جيلي|geely/i, "جيلي"],
  [/فولكس|volkswagen|vw/i, "فولكسفاجن"],
  [/لاند روفر|land rover/i, "لاند روفر"],
  [/أودي|audi/i, "أودي"],
  [/بورش|porsche/i, "بورش"],
  [/جيب|jeep/i, "جيب"],
  [/فورد|ford/i, "فورد"],
];

// ─── Property types ───
const PROPERTY_TYPES: [RegExp, string][] = [
  [/شقة|شقه|apartment/i, "شقة"],
  [/فيلا|فيللا|villa/i, "فيلا"],
  [/دوبلكس|duplex/i, "دوبلكس"],
  [/استوديو|studio/i, "استوديو"],
  [/مكتب|office/i, "مكتب"],
  [/محل|shop|store/i, "محل"],
  [/أرض|ارض|land/i, "أرض"],
  [/مخزن|warehouse/i, "مخزن"],
  [/شاليه|chalet/i, "شاليه"],
  [/بنتهاوس|penthouse/i, "بنتهاوس"],
  [/عمارة|building/i, "عمارة"],
];

// ─── Listing type (sale/rent) ───
const RENT_PATTERNS = /للإيجار|للايجار|إيجار|ايجار|مفروش|for rent|rent/i;
const SALE_PATTERNS = /للبيع|for sale|sale/i;

export interface TitleExtraction {
  brand: string | null;
  model: string | null;
  year: number | null;
  propertyType: string | null;
  area: string | null;
  listingType: "sale" | "rent";
}

/**
 * Extract structured data from a listing title + URL
 */
export function extractFromTitle(title: string, url?: string): TitleExtraction {
  const result: TitleExtraction = {
    brand: null,
    model: null,
    year: null,
    propertyType: null,
    area: null,
    listingType: "sale",
  };

  const text = title || "";
  const urlText = url || "";

  // ─── Car brand ───
  for (const [pattern, name] of CAR_BRANDS) {
    if (pattern.test(text)) {
      result.brand = name;
      break;
    }
  }

  // ─── Year (4-digit number between 1990-2030) ───
  const yearMatch = text.match(/\b(19[9]\d|20[0-3]\d)\b/);
  if (yearMatch) {
    result.year = parseInt(yearMatch[1]);
  }

  // ─── Property type ───
  for (const [pattern, name] of PROPERTY_TYPES) {
    if (pattern.test(text)) {
      result.propertyType = name;
      break;
    }
  }

  // ─── Area (sqm) ───
  const areaMatch = text.match(/(\d+)\s*(?:م²|متر|sqm|م\b|m²)/i);
  if (areaMatch) {
    result.area = areaMatch[1];
  }

  // ─── Listing type ───
  if (RENT_PATTERNS.test(text) || RENT_PATTERNS.test(urlText)) {
    result.listingType = "rent";
  } else if (SALE_PATTERNS.test(text) || SALE_PATTERNS.test(urlText)) {
    result.listingType = "sale";
  }
  // URL-based detection
  if (urlText.includes("for-rent") || urlText.includes("/rent/")) {
    result.listingType = "rent";
  }

  return result;
}
