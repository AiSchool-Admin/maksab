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
  // Alexandria — comprehensive district mapping
  "العجمي": { governorate: "alexandria", city: "agami" },
  agami: { governorate: "alexandria", city: "agami" },
  "سيدي بشر": { governorate: "alexandria", city: "sidi_beshr" },
  sidi_beshr: { governorate: "alexandria", city: "sidi_beshr" },
  "سموحة": { governorate: "alexandria", city: "smoha" },
  smoha: { governorate: "alexandria", city: "smoha" },
  smouha: { governorate: "alexandria", city: "smoha" },
  "السيوف": { governorate: "alexandria", city: "seyouf" },
  seyouf: { governorate: "alexandria", city: "seyouf" },
  "العصافرة": { governorate: "alexandria", city: "asafra" },
  asafra: { governorate: "alexandria", city: "asafra" },
  "محرم بك": { governorate: "alexandria", city: "moharam_bek" },
  "محرم بيك": { governorate: "alexandria", city: "moharam_bek" },
  "محرم بية": { governorate: "alexandria", city: "moharam_bek" },
  moharam_bek: { governorate: "alexandria", city: "moharam_bek" },
  "المندرة": { governorate: "alexandria", city: "mandara" },
  mandara: { governorate: "alexandria", city: "mandara" },
  "ميامي": { governorate: "alexandria", city: "miami" },
  miami: { governorate: "alexandria", city: "miami" },
  "جليم": { governorate: "alexandria", city: "glim" },
  glim: { governorate: "alexandria", city: "glim" },
  "سيدي جابر": { governorate: "alexandria", city: "sidi_gaber" },
  sidi_gaber: { governorate: "alexandria", city: "sidi_gaber" },
  "سان ستيفانو": { governorate: "alexandria", city: "san_stefano" },
  san_stefano: { governorate: "alexandria", city: "san_stefano" },
  "فيكتوريا": { governorate: "alexandria", city: "victoria" },
  "المنتزه": { governorate: "alexandria", city: "montaza" },
  montaza: { governorate: "alexandria", city: "montaza" },
  "المعمورة": { governorate: "alexandria", city: "mamoura" },
  mamoura: { governorate: "alexandria", city: "mamoura" },
  "ستانلي": { governorate: "alexandria", city: "stanley" },
  stanley: { governorate: "alexandria", city: "stanley" },
  "الإبراهيمية": { governorate: "alexandria", city: "ibrahimia" },
  ibrahimia: { governorate: "alexandria", city: "ibrahimia" },
  "كفر عبده": { governorate: "alexandria", city: "kafr_abdo" },
  "كفر عبدو": { governorate: "alexandria", city: "kafr_abdo" },
  kafr_abdo: { governorate: "alexandria", city: "kafr_abdo" },
  "بحري": { governorate: "alexandria", city: "bahary" },
  bahary: { governorate: "alexandria", city: "bahary" },
  "العامرية": { governorate: "alexandria", city: "amreya" },
  amreya: { governorate: "alexandria", city: "amreya" },
  "برج العرب": { governorate: "alexandria", city: "borg_alarab" },
  borg_alarab: { governorate: "alexandria", city: "borg_alarab" },
  "كليوباترا": { governorate: "alexandria", city: "cleopatra" },
  cleopatra: { governorate: "alexandria", city: "cleopatra" },
  "لوران": { governorate: "alexandria", city: "laurent" },
  laurent: { governorate: "alexandria", city: "laurent" },
  "رشدي": { governorate: "alexandria", city: "rushdy" },
  rushdy: { governorate: "alexandria", city: "rushdy" },
  "أبو قير": { governorate: "alexandria", city: "abu_qir" },
  abu_qir: { governorate: "alexandria", city: "abu_qir" },
  "الدخيلة": { governorate: "alexandria", city: "dakhela" },
  dakhela: { governorate: "alexandria", city: "dakhela" },
  "المنشية": { governorate: "alexandria", city: "manshia" },
  manshia: { governorate: "alexandria", city: "manshia" },
  "جناكليس": { governorate: "alexandria", city: "janaklis" },
  janaklis: { governorate: "alexandria", city: "janaklis" },
  "بولكلي": { governorate: "alexandria", city: "bolkly" },
  bolkly: { governorate: "alexandria", city: "bolkly" },
  "سبورتنج": { governorate: "alexandria", city: "sporting" },
  sporting: { governorate: "alexandria", city: "sporting" },
  "فلمنج": { governorate: "alexandria", city: "fleming" },
  fleming: { governorate: "alexandria", city: "fleming" },
  "وابور المياه": { governorate: "alexandria", city: "wabour_elmoya" },
  "وابور المياة": { governorate: "alexandria", city: "wabour_elmoya" },
  wabour_elmoya: { governorate: "alexandria", city: "wabour_elmoya" },
  "كامب شيزار": { governorate: "alexandria", city: "camp_shezar" },
  camp_shezar: { governorate: "alexandria", city: "camp_shezar" },
  camp_caesar: { governorate: "alexandria", city: "camp_shezar" },
  "النخيل": { governorate: "alexandria", city: "nakheel" },
  "الأنفوشي": { governorate: "alexandria", city: "anfoushi" },
  anfoushi: { governorate: "alexandria", city: "anfoushi" },
  "اللبان": { governorate: "alexandria", city: "laban" },
  laban: { governorate: "alexandria", city: "laban" },
  "سيدي عبد الرحمن": { governorate: "alexandria", city: "sidi_abdelrahman" },
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

/**
 * Convert any governorate format to Arabic display name.
 * "alexandria" → "الإسكندرية"
 * "الإسكندرية" → "الإسكندرية"
 * "cairo"      → "القاهرة"
 */
const SLUG_TO_ARABIC: Record<string, string> = {
  alexandria: "الإسكندرية",
  cairo: "القاهرة",
  giza: "الجيزة",
  qalyubia: "القليوبية",
  sharqia: "الشرقية",
  dakahlia: "الدقهلية",
  gharbia: "الغربية",
  monufia: "المنوفية",
  beheira: "البحيرة",
  kafr_el_sheikh: "كفر الشيخ",
  damietta: "دمياط",
  port_said: "بورسعيد",
  ismailia: "الإسماعيلية",
  suez: "السويس",
  fayoum: "الفيوم",
  beni_suef: "بني سويف",
  minya: "المنيا",
  assiut: "أسيوط",
  sohag: "سوهاج",
  qena: "قنا",
  luxor: "الأقصر",
  aswan: "أسوان",
  red_sea: "البحر الأحمر",
  matrouh: "مطروح",
  north_sinai: "شمال سيناء",
  south_sinai: "جنوب سيناء",
  new_valley: "الوادي الجديد",
};

export function governorateToArabic(gov: string | null | undefined): string | null {
  if (!gov) return null;
  const trimmed = gov.trim();

  // Already Arabic? Return as-is if it maps to a known slug
  if (GOV_NORMALIZE[trimmed]) {
    const slug = GOV_NORMALIZE[trimmed];
    return SLUG_TO_ARABIC[slug] || trimmed;
  }

  // Slug → Arabic
  const slug = normalizeGovernorate(trimmed);
  if (slug && SLUG_TO_ARABIC[slug]) return SLUG_TO_ARABIC[slug];

  return trimmed;
}

// ═══ Alexandria District Normalizer ═══

const DISTRICT_SLUG_TO_ARABIC: Record<string, string> = {
  smoha: "سموحة", smouha: "سموحة",
  sidi_beshr: "سيدي بشر", sidi_gaber: "سيدي جابر",
  miami: "ميامي", mandara: "المندرة", stanley: "ستانلي",
  glim: "جليم", cleopatra: "كليوباترا", laurent: "لوران",
  rushdy: "رشدي", sporting: "سبورتنج", fleming: "فلمنج",
  san_stefano: "سان ستيفانو", asafra: "العصافرة",
  seyouf: "السيوف", montaza: "المنتزه", mamoura: "المعمورة",
  agami: "العجمي", amreya: "العامرية", borg_alarab: "برج العرب",
  ibrahimia: "الإبراهيمية", kafr_abdo: "كفر عبده",
  bahary: "بحري", moharam_bek: "محرم بك",
  wabour_elmoya: "وابور المياه", janaklis: "جناكليس",
  bolkly: "بولكلي", camp_shezar: "كامب شيزار", camp_caesar: "كامب شيزار",
  nakheel: "النخيل", anfoushi: "الأنفوشي", laban: "اللبان",
  abu_qir: "أبو قير", dakhela: "الدخيلة", manshia: "المنشية",
  victoria: "فيكتوريا", sidi_abdelrahman: "سيدي عبد الرحمن",
};

const ARABIC_DISTRICTS = new Set(Object.values(DISTRICT_SLUG_TO_ARABIC));

/** Normalize any district name (Arabic or English slug) to canonical Arabic */
export function normalizeAlexDistrict(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();

  // Already canonical Arabic
  if (ARABIC_DISTRICTS.has(trimmed)) return trimmed;

  // Try slug lookup
  const slug = trimmed.toLowerCase().replace(/[-\s]+/g, "_");
  if (DISTRICT_SLUG_TO_ARABIC[slug]) return DISTRICT_SLUG_TO_ARABIC[slug];

  // Try without underscores
  const noUnderscore = slug.replace(/_/g, "");
  for (const [key, val] of Object.entries(DISTRICT_SLUG_TO_ARABIC)) {
    if (key.replace(/_/g, "") === noUnderscore) return val;
  }

  return trimmed;
}

// ═══ URL-based Governorate Extraction ═══

/** Known governorate slugs that appear in platform URLs */
const URL_GOV_SLUGS: Record<string, string> = {
  alexandria: "alexandria", alex: "alexandria",
  cairo: "cairo", "new-cairo": "cairo", "nasr-city": "cairo",
  giza: "giza", "6th-october": "giza", "sheikh-zayed": "giza",
  heliopolis: "cairo", maadi: "cairo", zamalek: "cairo",
  mansoura: "dakahlia", tanta: "gharbia", zagazig: "sharqia",
  ismailia: "ismailia", suez: "suez", luxor: "luxor", aswan: "aswan",
  hurghada: "red_sea", "sharm-el-sheikh": "south_sinai",
  "port-said": "port_said", damietta: "damietta",
  fayoum: "fayoum", minya: "minya", assiut: "assiut", sohag: "sohag",
};

/**
 * Extract governorate slug from a listing URL.
 * Returns normalized slug (e.g. "alexandria", "cairo") or null.
 */
export function extractGovernorateFromUrl(url: string): string | null {
  if (!url) return null;

  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const segments = pathname.split("/").filter(Boolean);

    for (const seg of segments) {
      if (URL_GOV_SLUGS[seg]) return URL_GOV_SLUGS[seg];
    }
  } catch {
    const lower = url.toLowerCase();
    for (const [slug, gov] of Object.entries(URL_GOV_SLUGS)) {
      if (lower.includes(`/${slug}/`) || lower.includes(`/${slug}?`)) return gov;
    }
  }

  return null;
}
