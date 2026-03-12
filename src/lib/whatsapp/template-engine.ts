/**
 * WhatsApp Template Engine
 * Renders message templates with seller/scope variables
 */

const GOVERNORATE_AR: Record<string, string> = {
  cairo: 'القاهرة',
  giza: 'الجيزة',
  alexandria: 'الإسكندرية',
  dakahlia: 'الدقهلية',
  beheira: 'البحيرة',
  monufia: 'المنوفية',
  gharbia: 'الغربية',
  kafr_el_sheikh: 'كفر الشيخ',
  sharqia: 'الشرقية',
  qalyubia: 'القليوبية',
  fayoum: 'الفيوم',
  beni_suef: 'بني سويف',
  minya: 'المنيا',
  assiut: 'أسيوط',
  sohag: 'سوهاج',
  qena: 'قنا',
  luxor: 'الأقصر',
  aswan: 'أسوان',
  red_sea: 'البحر الأحمر',
  new_valley: 'الوادي الجديد',
  matrouh: 'مطروح',
  north_sinai: 'شمال سيناء',
  south_sinai: 'جنوب سيناء',
  port_said: 'بورسعيد',
  suez: 'السويس',
  ismailia: 'الإسماعيلية',
  damietta: 'دمياط',
};

const CATEGORY_AR: Record<string, string> = {
  phones: 'الموبايلات',
  vehicles: 'السيارات',
  properties: 'العقارات',
  electronics: 'الإلكترونيات',
  furniture: 'الأثاث',
  fashion: 'الملابس',
  gold: 'الذهب والفضة',
  luxury: 'السلع الفاخرة',
  appliances: 'الأجهزة المنزلية',
  hobbies: 'الهوايات',
  tools: 'العدد والأدوات',
  services: 'الخدمات',
  scrap: 'الخردة',
};

export function renderTemplate(
  templateBody: string,
  variables: Record<string, string>
): string {
  let result = templateBody;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value || '');
  }
  return result;
}

export function getTemplateVariables(
  seller: {
    id?: string;
    name?: string | null;
    total_listings_seen?: number;
  },
  scope?: {
    maksab_category?: string;
    governorate?: string;
  } | null
): Record<string, string> {
  const firstName = seller.name?.split(' ')[0] || 'أهلاً';
  return {
    first_name: firstName,
    customer_name: seller.name || '',
    category_name_ar: getCategoryAr(scope?.maksab_category),
    listings_count: String(seller.total_listings_seen || 0),
    governorate: getGovernorateAr(scope?.governorate),
    join_url: `https://maksab.app/join?ref=${seller.id || ''}`,
    competitor_name: 'دوبيزل',
  };
}

export function getCategoryAr(cat?: string | null): string {
  if (!cat) return 'المنتجات';
  return CATEGORY_AR[cat] || 'المنتجات';
}

export function getGovernorateAr(gov?: string | null): string {
  if (!gov) return 'مصر';
  return GOVERNORATE_AR[gov] || gov;
}
