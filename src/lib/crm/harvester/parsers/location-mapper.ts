/**
 * Location Mapper
 * يحول أسماء المواقع من المنصات المنافسة لأسماء مكسب الموحدة
 */

// Governorate mapping: source text → maksab governorate
const GOVERNORATE_MAP: Record<string, string> = {
  // Arabic
  "القاهرة": "cairo",
  "الإسكندرية": "alexandria",
  "الاسكندرية": "alexandria",
  "اسكندرية": "alexandria",
  "الجيزة": "giza",
  "القليوبية": "qalyubia",
  "الشرقية": "sharqia",
  "الدقهلية": "dakahlia",
  "الغربية": "gharbia",
  "المنوفية": "monufia",
  "البحيرة": "beheira",
  "كفر الشيخ": "kafr_el_sheikh",
  "دمياط": "damietta",
  "بورسعيد": "port_said",
  "الإسماعيلية": "ismailia",
  "الاسماعيلية": "ismailia",
  "السويس": "suez",
  "الفيوم": "fayoum",
  "بني سويف": "beni_suef",
  "المنيا": "minya",
  "أسيوط": "assiut",
  "سوهاج": "sohag",
  "قنا": "qena",
  "الأقصر": "luxor",
  "أسوان": "aswan",
  "البحر الأحمر": "red_sea",
  "مطروح": "matrouh",
  "شمال سيناء": "north_sinai",
  "جنوب سيناء": "south_sinai",
  "الوادي الجديد": "new_valley",
  // English
  cairo: "cairo",
  alexandria: "alexandria",
  giza: "giza",
  qalyubia: "qalyubia",
  sharqia: "sharqia",
  dakahlia: "dakahlia",
  gharbia: "gharbia",
  monufia: "monufia",
  beheira: "beheira",
  "kafr el sheikh": "kafr_el_sheikh",
  damietta: "damietta",
  "port said": "port_said",
  ismailia: "ismailia",
  suez: "suez",
  fayoum: "fayoum",
  "beni suef": "beni_suef",
  minya: "minya",
  assiut: "assiut",
  sohag: "sohag",
  qena: "qena",
  luxor: "luxor",
  aswan: "aswan",
  "red sea": "red_sea",
  matrouh: "matrouh",
  "north sinai": "north_sinai",
  "south sinai": "south_sinai",
  "new valley": "new_valley",
};

// City mapping: source text → { governorate, city }
const CITY_MAP: Record<string, { governorate: string; city: string }> = {
  // Cairo
  "مدينة نصر": { governorate: "cairo", city: "nasr_city" },
  "nasr city": { governorate: "cairo", city: "nasr_city" },
  "المعادي": { governorate: "cairo", city: "maadi" },
  maadi: { governorate: "cairo", city: "maadi" },
  "مصر الجديدة": { governorate: "cairo", city: "heliopolis" },
  heliopolis: { governorate: "cairo", city: "heliopolis" },
  "القاهرة الجديدة": { governorate: "cairo", city: "new_cairo" },
  "new cairo": { governorate: "cairo", city: "new_cairo" },
  "التجمع": { governorate: "cairo", city: "new_cairo" },
  "وسط البلد": { governorate: "cairo", city: "downtown" },
  downtown: { governorate: "cairo", city: "downtown" },
  "شبرا": { governorate: "cairo", city: "shubra" },
  shubra: { governorate: "cairo", city: "shubra" },
  // Alexandria
  "العجمي": { governorate: "alexandria", city: "agami" },
  agami: { governorate: "alexandria", city: "agami" },
  "سيدي بشر": { governorate: "alexandria", city: "sidi_beshr" },
  "سموحة": { governorate: "alexandria", city: "smoha" },
  smoha: { governorate: "alexandria", city: "smoha" },
  "السيوف": { governorate: "alexandria", city: "seyouf" },
  "العصافرة": { governorate: "alexandria", city: "asafra" },
  "محرم بيك": { governorate: "alexandria", city: "moharam_bik" },
  "المندرة": { governorate: "alexandria", city: "mandara" },
  "ميامي": { governorate: "alexandria", city: "miami" },
  "جليم": { governorate: "alexandria", city: "glim" },
  "سيدي جابر": { governorate: "alexandria", city: "sidi_gaber" },
  "سان ستيفانو": { governorate: "alexandria", city: "san_stefano" },
  "فيكتوريا": { governorate: "alexandria", city: "victoria" },
};

export interface MappedLocation {
  governorate: string | null;
  city: string | null;
  area: string | null;
}

/**
 * Map a source platform location string to Maksab's standardized location
 */
export function mapLocation(
  sourceLocation: string,
  _sourcePlatform: string
): MappedLocation {
  if (!sourceLocation) {
    return { governorate: null, city: null, area: null };
  }

  const text = sourceLocation.trim().toLowerCase();
  const originalText = sourceLocation.trim();

  // Try city first (more specific)
  for (const [key, value] of Object.entries(CITY_MAP)) {
    if (text.includes(key.toLowerCase())) {
      return {
        governorate: value.governorate,
        city: value.city,
        area: null,
      };
    }
  }

  // Try governorate
  for (const [key, value] of Object.entries(GOVERNORATE_MAP)) {
    if (text.includes(key.toLowerCase())) {
      return {
        governorate: value,
        city: null,
        area: null,
      };
    }
  }

  // Split by comma/dash and try parts
  const parts = originalText.split(/[,،\-–—]/);
  for (const part of parts) {
    const trimmed = part.trim().toLowerCase();

    for (const [key, value] of Object.entries(CITY_MAP)) {
      if (trimmed === key.toLowerCase() || trimmed.includes(key.toLowerCase())) {
        return {
          governorate: value.governorate,
          city: value.city,
          area: parts.length > 1 ? parts[parts.length - 1].trim() : null,
        };
      }
    }

    for (const [key, value] of Object.entries(GOVERNORATE_MAP)) {
      if (trimmed === key.toLowerCase() || trimmed.includes(key.toLowerCase())) {
        return {
          governorate: value,
          city: null,
          area: parts.length > 1 ? parts[0].trim() : null,
        };
      }
    }
  }

  return { governorate: null, city: null, area: originalText };
}

/**
 * Normalize any governorate format (Arabic, English, slug) to a canonical slug.
 * Useful for comparing scope.governorate (Arabic) with parsed governorate (slug).
 *
 * "الإسكندرية" → "alexandria"
 * "alexandria"  → "alexandria"
 * "cairo"       → "cairo"
 * "القاهرة"     → "cairo"
 */
const GOV_NORMALIZE: Record<string, string> = {
  // Alexandria
  alexandria: "alexandria",
  alex: "alexandria",
  "الإسكندرية": "alexandria",
  "الاسكندرية": "alexandria",
  "اسكندرية": "alexandria",
  // Cairo
  cairo: "cairo",
  "القاهرة": "cairo",
  // Giza
  giza: "giza",
  "الجيزة": "giza",
  // Qalyubia
  qalyubia: "qalyubia",
  "القليوبية": "qalyubia",
  // Sharqia
  sharqia: "sharqia",
  "الشرقية": "sharqia",
  // Dakahlia
  dakahlia: "dakahlia",
  "الدقهلية": "dakahlia",
  // Gharbia
  gharbia: "gharbia",
  "الغربية": "gharbia",
  // Monufia
  monufia: "monufia",
  "المنوفية": "monufia",
  // Beheira
  beheira: "beheira",
  "البحيرة": "beheira",
  // Kafr El Sheikh
  kafr_el_sheikh: "kafr_el_sheikh",
  "كفر الشيخ": "kafr_el_sheikh",
  // Damietta
  damietta: "damietta",
  "دمياط": "damietta",
  // Port Said
  port_said: "port_said",
  "بورسعيد": "port_said",
  // Ismailia
  ismailia: "ismailia",
  "الإسماعيلية": "ismailia",
  "الاسماعيلية": "ismailia",
  // Suez
  suez: "suez",
  "السويس": "suez",
  // Fayoum
  fayoum: "fayoum",
  "الفيوم": "fayoum",
  // Beni Suef
  beni_suef: "beni_suef",
  "بني سويف": "beni_suef",
  // Minya
  minya: "minya",
  "المنيا": "minya",
  // Assiut
  assiut: "assiut",
  "أسيوط": "assiut",
  // Sohag
  sohag: "sohag",
  "سوهاج": "sohag",
  // Qena
  qena: "qena",
  "قنا": "qena",
  // Luxor
  luxor: "luxor",
  "الأقصر": "luxor",
  // Aswan
  aswan: "aswan",
  "أسوان": "aswan",
  // Red Sea
  red_sea: "red_sea",
  "البحر الأحمر": "red_sea",
  // Matrouh
  matrouh: "matrouh",
  "مطروح": "matrouh",
  // North Sinai
  north_sinai: "north_sinai",
  "شمال سيناء": "north_sinai",
  // South Sinai
  south_sinai: "south_sinai",
  "جنوب سيناء": "south_sinai",
  // New Valley
  new_valley: "new_valley",
  "الوادي الجديد": "new_valley",
};

export function normalizeGovernorate(gov: string | null | undefined): string | null {
  if (!gov) return null;
  const lower = gov.trim().toLowerCase();

  // Direct match
  if (GOV_NORMALIZE[lower]) return GOV_NORMALIZE[lower];

  // Try Arabic (case-sensitive since Arabic has no case)
  if (GOV_NORMALIZE[gov.trim()]) return GOV_NORMALIZE[gov.trim()];

  // Partial match for English variants (e.g. "Alexandria, Egypt")
  for (const [key, value] of Object.entries(GOV_NORMALIZE)) {
    if (lower.includes(key)) return value;
  }

  return lower;
}
