import { categoriesConfig } from "@/lib/categories/categories-config";
import { governorates } from "@/lib/data/governorates";

export interface ParsedQuery {
  cleanQuery: string;
  category?: string;
  brand?: string;
  governorate?: string;
  city?: string;
  extractedFilters: Record<string, string>;
  yearHint?: number;
}

/** Category keyword → category ID */
const categoryKeywords: Record<string, string[]> = {
  cars: [
    "سيارة", "سيارات", "عربية", "عربيات", "موتوسيكل", "موتور",
    "كورولا", "لانسر", "سيراتو", "فيرنا",
  ],
  real_estate: [
    "شقة", "شقق", "عقار", "عقارات", "فيلا", "فيلات",
    "أرض", "محل", "مكتب", "دوبلكس", "بنتهاوس", "استوديو",
  ],
  phones: [
    "موبايل", "موبايلات", "تليفون", "تابلت", "هاتف",
  ],
  fashion: [
    "ملابس", "لبس", "جاكت", "بنطلون", "قميص", "فستان",
    "حذاء", "جزمة", "شنطة", "شنط",
  ],
  scrap: ["خردة", "سكراب"],
  gold: ["ذهب", "فضة", "ألماس", "دبلة", "محبس", "جنيه ذهب", "سبيكة"],
  luxury: ["لويس فيتون", "جوتشي", "شانيل", "رولكس", "كارتييه", "ديور", "برادا"],
  appliances: ["غسالة", "ثلاجة", "بوتاجاز", "مكيف", "سخان"],
  furniture: ["أثاث", "غرفة نوم", "سفرة", "أنتريه", "مطبخ", "سجاد"],
  hobbies: ["بلايستيشن", "إكسبوكس", "كاميرا", "دراجة", "كتب", "كتاب"],
  tools: ["شنيور", "عدة", "عدد", "معدات"],
  services: ["سباك", "كهربائي", "نقاش", "نجار", "صيانة", "نقل أثاث", "تنظيف", "دروس"],
};

/** Brand keyword → { category, value } */
const brandKeywords: Record<string, { category: string; value: string }> = {
  "تويوتا": { category: "cars", value: "toyota" },
  "هيونداي": { category: "cars", value: "hyundai" },
  "شيفروليه": { category: "cars", value: "chevrolet" },
  "نيسان": { category: "cars", value: "nissan" },
  "كيا": { category: "cars", value: "kia" },
  "بي إم دبليو": { category: "cars", value: "bmw" },
  "مرسيدس": { category: "cars", value: "mercedes" },
  "فيات": { category: "cars", value: "fiat" },
  "سكودا": { category: "cars", value: "skoda" },
  "سوزوكي": { category: "cars", value: "suzuki" },
  "هوندا": { category: "cars", value: "honda" },
  "آيفون": { category: "phones", value: "apple" },
  "ايفون": { category: "phones", value: "apple" },
  "سامسونج": { category: "phones", value: "samsung" },
  "شاومي": { category: "phones", value: "xiaomi" },
  "أوبو": { category: "phones", value: "oppo" },
  "ريلمي": { category: "phones", value: "realme" },
  "هواوي": { category: "phones", value: "huawei" },
  "توشيبا": { category: "appliances", value: "toshiba" },
  "شارب": { category: "appliances", value: "sharp" },
};

/** City → governorate lookup */
const cityToGovernorate: Record<string, string> = {
  "مدينة نصر": "القاهرة",
  "مصر الجديدة": "القاهرة",
  "المعادي": "القاهرة",
  "الزمالك": "القاهرة",
  "التجمع الخامس": "القاهرة",
  "التجمع": "القاهرة",
  "المقطم": "القاهرة",
  "حلوان": "القاهرة",
  "شبرا": "القاهرة",
  "وسط البلد": "القاهرة",
  "عين شمس": "القاهرة",
  "6 أكتوبر": "الجيزة",
  "أكتوبر": "الجيزة",
  "الدقي": "الجيزة",
  "المهندسين": "الجيزة",
  "فيصل": "الجيزة",
  "الهرم": "الجيزة",
  "الشيخ زايد": "الجيزة",
  "سموحة": "الإسكندرية",
  "ستانلي": "الإسكندرية",
  "المنشية": "الإسكندرية",
  "المنصورة": "الدقهلية",
  "الزقازيق": "الشرقية",
  "طنطا": "الغربية",
  "شبرا الخيمة": "القليوبية",
  "بنها": "القليوبية",
};

/**
 * Parse a free-text Arabic search query and extract structured filters.
 *
 * Examples:
 *   "آيفون 15"         → category=phones, brand=apple
 *   "شقة مدينة نصر"    → category=real_estate, governorate=القاهرة, city=مدينة نصر
 *   "ذهب عيار 21"      → category=gold, karat=21
 *   "تويوتا كورولا 2020" → category=cars, brand=toyota, year=2020
 */
export function parseSearchQuery(query: string): ParsedQuery {
  const result: ParsedQuery = {
    cleanQuery: query.trim(),
    extractedFilters: {},
  };

  let remaining = query.trim();

  // 1. Extract gold karat pattern ("عيار 21", "فضة 925")
  const karatMatch = remaining.match(/عيار\s*(24|21|18|14)/);
  if (karatMatch) {
    result.extractedFilters.karat = karatMatch[1];
    result.category = result.category || "gold";
    remaining = remaining.replace(karatMatch[0], "").trim();
  }
  const silverMatch = remaining.match(/فضة\s*(925|900)/);
  if (silverMatch) {
    result.extractedFilters.karat = `silver_${silverMatch[1]}`;
    result.category = result.category || "gold";
    remaining = remaining.replace(silverMatch[0], "").trim();
  }

  // 2. Extract year (1990–2026)
  const yearMatch = remaining.match(/\b(199\d|20[0-2]\d)\b/);
  if (yearMatch) {
    result.yearHint = parseInt(yearMatch[1]);
    remaining = remaining.replace(yearMatch[0], "").trim();
  }

  // 3. Extract brand (longest match first)
  const sortedBrands = Object.keys(brandKeywords).sort(
    (a, b) => b.length - a.length,
  );
  for (const keyword of sortedBrands) {
    if (remaining.includes(keyword)) {
      const brand = brandKeywords[keyword];
      result.brand = brand.value;
      result.category = result.category || brand.category;
      result.extractedFilters.brand = brand.value;
      remaining = remaining.replace(keyword, "").trim();
      break;
    }
  }

  // 4. Extract city → governorate (longest match first)
  const sortedCities = Object.keys(cityToGovernorate).sort(
    (a, b) => b.length - a.length,
  );
  for (const city of sortedCities) {
    if (remaining.includes(city)) {
      result.city = city;
      result.governorate = cityToGovernorate[city];
      remaining = remaining.replace(city, "").trim();
      break;
    }
  }

  // 5. Extract governorate directly (if no city matched)
  if (!result.governorate) {
    for (const gov of governorates) {
      if (remaining.includes(gov)) {
        result.governorate = gov;
        remaining = remaining.replace(gov, "").trim();
        break;
      }
    }
  }

  // 6. Extract category (longest keyword first)
  if (!result.category) {
    outer: for (const [catId, keywords] of Object.entries(categoryKeywords)) {
      const sorted = [...keywords].sort((a, b) => b.length - a.length);
      for (const kw of sorted) {
        if (remaining.includes(kw)) {
          result.category = catId;
          remaining = remaining.replace(kw, "").trim();
          break outer;
        }
      }
    }
  }

  // Clean leftover separators and extra spaces
  result.cleanQuery = remaining
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s—،\-]+|[\s—،\-]+$/g, "")
    .trim();

  return result;
}

/**
 * Return auto-suggestions for partial input.
 * Matches category names, brands, and governorates.
 */
export function getAutoSuggestions(input: string): string[] {
  const q = input.trim();
  if (q.length < 2) return [];

  const suggestions: string[] = [];

  // Category names
  for (const cat of categoriesConfig) {
    if (cat.name.includes(q)) suggestions.push(cat.name);
  }

  // Brand keywords
  for (const keyword of Object.keys(brandKeywords)) {
    if (keyword.includes(q) && !suggestions.includes(keyword)) {
      suggestions.push(keyword);
    }
  }

  // Category keywords (e.g. شقة, غسالة)
  for (const keywords of Object.values(categoryKeywords)) {
    for (const kw of keywords) {
      if (kw.includes(q) && !suggestions.includes(kw)) {
        suggestions.push(kw);
      }
    }
  }

  // Governorates
  for (const gov of governorates) {
    if (gov.includes(q) && !suggestions.includes(gov)) {
      suggestions.push(gov);
    }
  }

  return suggestions.slice(0, 8);
}
