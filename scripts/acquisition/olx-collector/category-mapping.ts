/**
 * خريطة ربط أقسام OLX بأقسام مكسب
 * OLX → Maksab Category Mapping
 *
 * Based on OLX Egypt's actual category structure
 */

import type { OlxCategoryMap } from './types';

export const OLX_CATEGORIES: OlxCategoryMap[] = [
  // ── السيارات ──────────────────────────────────────
  {
    olxSlug: 'cars-for-sale',
    olxName: 'سيارات للبيع',
    olxId: '84',
    maksabCategoryId: 'cars',
    maksabSubcategoryId: 'passenger',
    fieldMapping: {
      'make': 'brand',
      'model': 'model',
      'year': 'year',
      'kilometers': 'mileage',
      'color': 'color',
      'fuel': 'fuel',
      'transmission': 'transmission',
      'engine-capacity': 'engine_cc',
      'body-type': 'condition',
    },
  },
  {
    olxSlug: 'motorcycles-accessories',
    olxName: 'موتوسيكلات',
    olxId: '1418',
    maksabCategoryId: 'cars',
    maksabSubcategoryId: 'motorcycles',
    fieldMapping: {
      'make': 'brand',
      'model': 'model',
      'year': 'year',
      'kilometers': 'mileage',
    },
  },
  {
    olxSlug: 'spare-parts',
    olxName: 'قطع غيار',
    olxId: '1420',
    maksabCategoryId: 'cars',
    maksabSubcategoryId: 'car-parts',
    fieldMapping: {
      'make': 'brand',
    },
  },

  // ── العقارات ──────────────────────────────────────
  {
    olxSlug: 'apartments-duplex-for-sale',
    olxName: 'شقق للبيع',
    olxId: '527',
    maksabCategoryId: 'real_estate',
    maksabSubcategoryId: 'apartments-sale',
    fieldMapping: {
      'rooms': 'rooms',
      'bathrooms': 'bathrooms',
      'area': 'area',
      'furnished': 'furnished',
      'floor': 'floor',
      'finishing': 'finishing',
    },
  },
  {
    olxSlug: 'apartments-duplex-for-rent',
    olxName: 'شقق للإيجار',
    olxId: '20095',
    maksabCategoryId: 'real_estate',
    maksabSubcategoryId: 'apartments-rent',
    fieldMapping: {
      'rooms': 'rooms',
      'bathrooms': 'bathrooms',
      'area': 'area',
      'furnished': 'furnished',
      'floor': 'floor',
      'finishing': 'finishing',
    },
  },
  {
    olxSlug: 'villas-for-sale',
    olxName: 'فيلات للبيع',
    olxId: '528',
    maksabCategoryId: 'real_estate',
    maksabSubcategoryId: 'villas',
    fieldMapping: {
      'rooms': 'rooms',
      'bathrooms': 'bathrooms',
      'area': 'area',
      'furnished': 'furnished',
      'finishing': 'finishing',
    },
  },
  {
    olxSlug: 'commercial-for-sale',
    olxName: 'محلات تجارية',
    olxId: '530',
    maksabCategoryId: 'real_estate',
    maksabSubcategoryId: 'commercial',
    fieldMapping: {
      'area': 'area',
    },
  },

  // ── الموبايلات ────────────────────────────────────
  {
    olxSlug: 'mobile-phones',
    olxName: 'موبايلات',
    olxId: '1453',
    maksabCategoryId: 'phones',
    maksabSubcategoryId: 'mobile',
    fieldMapping: {
      'make': 'brand',
      'model': 'model',
      'storage': 'storage',
      'condition': 'condition',
      'color': 'color',
      'ram': 'ram',
    },
  },
  {
    olxSlug: 'tablets',
    olxName: 'تابلت',
    olxId: '1455',
    maksabCategoryId: 'phones',
    maksabSubcategoryId: 'tablet',
    fieldMapping: {
      'make': 'brand',
      'model': 'model',
      'storage': 'storage',
      'condition': 'condition',
    },
  },
  {
    olxSlug: 'mobile-phone-accessories',
    olxName: 'إكسسوارات موبايل',
    olxId: '1454',
    maksabCategoryId: 'phones',
    maksabSubcategoryId: 'accessories',
    fieldMapping: {
      'type': 'type',
    },
  },

  // ── الموضة ────────────────────────────────────────
  {
    olxSlug: 'men-clothing',
    olxName: 'ملابس رجالي',
    olxId: '2078',
    maksabCategoryId: 'fashion',
    maksabSubcategoryId: 'men',
    fieldMapping: {
      'type': 'type',
      'size': 'size',
      'condition': 'condition',
    },
  },
  {
    olxSlug: 'women-clothing',
    olxName: 'ملابس حريمي',
    olxId: '2082',
    maksabCategoryId: 'fashion',
    maksabSubcategoryId: 'women',
    fieldMapping: {
      'type': 'type',
      'size': 'size',
      'condition': 'condition',
    },
  },
  {
    olxSlug: 'kids-clothing',
    olxName: 'ملابس أطفال',
    olxId: '2086',
    maksabCategoryId: 'fashion',
    maksabSubcategoryId: 'kids',
    fieldMapping: {
      'type': 'type',
      'size': 'size',
      'condition': 'condition',
    },
  },

  // ── الأجهزة المنزلية ─────────────────────────────
  {
    olxSlug: 'home-appliances',
    olxName: 'أجهزة منزلية',
    olxId: '2027',
    maksabCategoryId: 'home_appliances',
    fieldMapping: {
      'type': 'type',
      'make': 'brand',
      'condition': 'condition',
    },
  },

  // ── الأثاث ────────────────────────────────────────
  {
    olxSlug: 'furniture-home-decor',
    olxName: 'أثاث وديكور',
    olxId: '2034',
    maksabCategoryId: 'furniture',
    fieldMapping: {
      'type': 'type',
      'condition': 'condition',
      'material': 'material',
    },
  },

  // ── الهوايات والرياضة ─────────────────────────────
  {
    olxSlug: 'sports-fitness',
    olxName: 'رياضة ولياقة',
    olxId: '2067',
    maksabCategoryId: 'hobbies',
    fieldMapping: {
      'type': 'type',
      'condition': 'condition',
    },
  },
  {
    olxSlug: 'video-games-consoles',
    olxName: 'ألعاب فيديو',
    olxId: '2066',
    maksabCategoryId: 'hobbies',
    maksabSubcategoryId: 'video-games',
    fieldMapping: {
      'type': 'type',
      'condition': 'condition',
    },
  },
  {
    olxSlug: 'books',
    olxName: 'كتب',
    olxId: '2068',
    maksabCategoryId: 'hobbies',
    maksabSubcategoryId: 'books',
    fieldMapping: {},
  },
  {
    olxSlug: 'animals-pets',
    olxName: 'حيوانات أليفة',
    olxId: '2042',
    maksabCategoryId: 'hobbies',
    maksabSubcategoryId: 'pets',
    fieldMapping: {
      'type': 'type',
    },
  },
];

// ── Brand Name Mapping (OLX Arabic → Maksab ID) ────

export const BRAND_MAPPING: Record<string, Record<string, string>> = {
  cars: {
    'toyota': 'toyota',
    'تويوتا': 'toyota',
    'hyundai': 'hyundai',
    'هيونداي': 'hyundai',
    'chevrolet': 'chevrolet',
    'شيفروليه': 'chevrolet',
    'nissan': 'nissan',
    'نيسان': 'nissan',
    'kia': 'kia',
    'كيا': 'kia',
    'bmw': 'bmw',
    'بي ام دبليو': 'bmw',
    'mercedes-benz': 'mercedes',
    'مرسيدس': 'mercedes',
    'fiat': 'fiat',
    'فيات': 'fiat',
    'skoda': 'skoda',
    'سكودا': 'skoda',
    'opel': 'opel',
    'أوبل': 'opel',
    'peugeot': 'peugeot',
    'بيجو': 'peugeot',
    'renault': 'renault',
    'رينو': 'renault',
    'suzuki': 'suzuki',
    'سوزوكي': 'suzuki',
    'mitsubishi': 'mitsubishi',
    'ميتسوبيشي': 'mitsubishi',
    'honda': 'honda',
    'هوندا': 'honda',
    'mg': 'mg',
    'chery': 'chery',
    'شيري': 'chery',
    'byd': 'byd',
    'بي واي دي': 'byd',
    'geely': 'geely',
    'جيلي': 'geely',
  },
  phones: {
    'apple': 'iphone',
    'آيفون': 'iphone',
    'iphone': 'iphone',
    'samsung': 'samsung',
    'سامسونج': 'samsung',
    'xiaomi': 'xiaomi',
    'شاومي': 'xiaomi',
    'oppo': 'oppo',
    'أوبو': 'oppo',
    'realme': 'realme',
    'ريلمي': 'realme',
    'vivo': 'vivo',
    'فيفو': 'vivo',
    'huawei': 'huawei',
    'هواوي': 'huawei',
    'oneplus': 'oneplus',
    'nokia': 'nokia',
    'نوكيا': 'nokia',
  },
};

// ── Location Mapping (OLX → Maksab Governorates) ────

export const GOVERNORATE_MAPPING: Record<string, string> = {
  'cairo': 'القاهرة',
  'القاهرة': 'القاهرة',
  'giza': 'الجيزة',
  'الجيزة': 'الجيزة',
  'alexandria': 'الإسكندرية',
  'الإسكندرية': 'الإسكندرية',
  'qalyubia': 'القليوبية',
  'القليوبية': 'القليوبية',
  'sharqia': 'الشرقية',
  'الشرقية': 'الشرقية',
  'dakahlia': 'الدقهلية',
  'الدقهلية': 'الدقهلية',
  'gharbia': 'الغربية',
  'الغربية': 'الغربية',
  'monufia': 'المنوفية',
  'المنوفية': 'المنوفية',
  'beheira': 'البحيرة',
  'البحيرة': 'البحيرة',
  'kafr-el-sheikh': 'كفر الشيخ',
  'كفر الشيخ': 'كفر الشيخ',
  'damietta': 'دمياط',
  'دمياط': 'دمياط',
  'port-said': 'بورسعيد',
  'بورسعيد': 'بورسعيد',
  'suez': 'السويس',
  'السويس': 'السويس',
  'ismailia': 'الإسماعيلية',
  'الإسماعيلية': 'الإسماعيلية',
  'fayoum': 'الفيوم',
  'الفيوم': 'الفيوم',
  'beni-suef': 'بني سويف',
  'بني سويف': 'بني سويف',
  'minya': 'المنيا',
  'المنيا': 'المنيا',
  'assiut': 'أسيوط',
  'أسيوط': 'أسيوط',
  'sohag': 'سوهاج',
  'سوهاج': 'سوهاج',
  'qena': 'قنا',
  'قنا': 'قنا',
  'luxor': 'الأقصر',
  'الأقصر': 'الأقصر',
  'aswan': 'أسوان',
  'أسوان': 'أسوان',
  'red-sea': 'البحر الأحمر',
  'البحر الأحمر': 'البحر الأحمر',
  'matrouh': 'مرسى مطروح',
  'مرسى مطروح': 'مرسى مطروح',
  'north-sinai': 'شمال سيناء',
  'شمال سيناء': 'شمال سيناء',
  'south-sinai': 'جنوب سيناء',
  'جنوب سيناء': 'جنوب سيناء',
  'new-valley': 'الوادي الجديد',
  'الوادي الجديد': 'الوادي الجديد',
  '6th-of-october': 'الجيزة',
  '6 أكتوبر': 'الجيزة',
};

// ── Condition Mapping ───────────────────────────────

export const CONDITION_MAPPING: Record<string, string> = {
  'new': 'new',
  'جديد': 'new',
  'used': 'used',
  'مستعمل': 'used',
  'like new': 'used_excellent',
  'زي الجديد': 'used_excellent',
  'good': 'used_good',
  'كويس': 'used_good',
  'fair': 'used_fair',
  'مقبول': 'used_fair',
};

// ── Fuel Type Mapping ───────────────────────────────

export const FUEL_MAPPING: Record<string, string> = {
  'petrol': 'petrol',
  'بنزين': 'petrol',
  'gasoline': 'petrol',
  'diesel': 'diesel',
  'سولار': 'diesel',
  'gas': 'gas',
  'غاز طبيعي': 'gas',
  'natural gas': 'gas',
  'electric': 'electric',
  'كهرباء': 'electric',
  'hybrid': 'hybrid',
  'هايبرد': 'hybrid',
};

// ── Transmission Mapping ────────────────────────────

export const TRANSMISSION_MAPPING: Record<string, string> = {
  'automatic': 'automatic',
  'أوتوماتيك': 'automatic',
  'manual': 'manual',
  'مانيوال': 'manual',
  'يدوي': 'manual',
};
