/**
 * Business Type Configuration
 * أنواع النشاط التجاري — كل نوع له حقول وإعدادات مختلفة
 */

export type BusinessType =
  | "shop"
  | "showroom"
  | "office"
  | "workshop"
  | "restaurant"
  | "freelancer"
  | "wholesaler"
  | "online";

export interface BusinessTypeConfig {
  id: BusinessType;
  name: string;
  icon: string;
  description: string;
  /** Does this type require a physical address? */
  requiresAddress: boolean;
  /** Extra fields specific to this business type */
  extraFields: BusinessExtraField[];
}

export interface BusinessExtraField {
  id: string;
  label: string;
  type: "text" | "select" | "toggle" | "multi-select";
  placeholder?: string;
  options?: { value: string; label: string }[];
  isRequired: boolean;
}

export const businessTypesConfig: BusinessTypeConfig[] = [
  {
    id: "shop",
    name: "محل",
    icon: "🏪",
    description: "محل موبايلات، ملابس، بقالة...",
    requiresAddress: true,
    extraFields: [
      {
        id: "working_hours_text",
        label: "مواعيد العمل",
        type: "text",
        placeholder: "مثال: من 10 ص لـ 10 م — ماعدا الجمعة",
        isRequired: false,
      },
    ],
  },
  {
    id: "showroom",
    name: "معرض",
    icon: "🚗",
    description: "معرض سيارات، أثاث، أجهزة...",
    requiresAddress: true,
    extraFields: [
      {
        id: "working_hours_text",
        label: "مواعيد العمل",
        type: "text",
        placeholder: "مثال: من 10 ص لـ 10 م يومياً",
        isRequired: false,
      },
    ],
  },
  {
    id: "office",
    name: "مكتب",
    icon: "🏢",
    description: "مكتب عقارات، استيراد، خدمات...",
    requiresAddress: true,
    extraFields: [
      {
        id: "working_hours_text",
        label: "مواعيد العمل",
        type: "text",
        placeholder: "مثال: من 9 ص لـ 5 م — أحد لخميس",
        isRequired: false,
      },
      {
        id: "commercial_register",
        label: "سجل تجاري",
        type: "toggle",
        isRequired: false,
      },
    ],
  },
  {
    id: "workshop",
    name: "ورشة",
    icon: "🔧",
    description: "ورشة صيانة، تصليح، حدادة...",
    requiresAddress: true,
    extraFields: [
      {
        id: "specialties",
        label: "التخصصات",
        type: "text",
        placeholder: "مثال: صيانة موبايلات، لحام، نجارة",
        isRequired: false,
      },
      {
        id: "working_hours_text",
        label: "مواعيد العمل",
        type: "text",
        placeholder: "مثال: من 9 ص لـ 6 م",
        isRequired: false,
      },
    ],
  },
  {
    id: "restaurant",
    name: "مطعم / كافيه",
    icon: "🍽️",
    description: "مطعم، كافيه، حلواني...",
    requiresAddress: true,
    extraFields: [
      {
        id: "cuisine_type",
        label: "نوع المطبخ",
        type: "text",
        placeholder: "مثال: أكل بيتي، مشويات، حلويات",
        isRequired: false,
      },
      {
        id: "has_delivery",
        label: "يوجد توصيل",
        type: "toggle",
        isRequired: false,
      },
      {
        id: "working_hours_text",
        label: "مواعيد العمل",
        type: "text",
        placeholder: "مثال: من 12 ظ لـ 12 ص",
        isRequired: false,
      },
    ],
  },
  {
    id: "freelancer",
    name: "مقدم خدمات",
    icon: "👨‍💻",
    description: "سباك، كهربائي، مصمم، مدرس...",
    requiresAddress: false,
    extraFields: [
      {
        id: "service_type",
        label: "نوع الخدمة",
        type: "text",
        placeholder: "مثال: تصميم جرافيك، سباكة، دروس خصوصية",
        isRequired: true,
      },
      {
        id: "experience_years",
        label: "سنوات الخبرة",
        type: "select",
        options: [
          { value: "less_than_1", label: "أقل من سنة" },
          { value: "1_3", label: "1-3 سنوات" },
          { value: "3_5", label: "3-5 سنوات" },
          { value: "5_plus", label: "أكثر من 5 سنوات" },
        ],
        isRequired: false,
      },
      {
        id: "service_areas",
        label: "نطاق الخدمة",
        type: "text",
        placeholder: "مثال: القاهرة، الجيزة",
        isRequired: false,
      },
    ],
  },
  {
    id: "wholesaler",
    name: "تاجر جملة",
    icon: "📦",
    description: "بيع بالجملة، موردين...",
    requiresAddress: true,
    extraFields: [
      {
        id: "min_order",
        label: "الحد الأدنى للطلب",
        type: "text",
        placeholder: "مثال: 10 قطع أو 1000 جنيه",
        isRequired: false,
      },
      {
        id: "sells_retail",
        label: "يبيع قطاعي كمان",
        type: "toggle",
        isRequired: false,
      },
    ],
  },
  {
    id: "online",
    name: "أونلاين",
    icon: "🌐",
    description: "متجر أونلاين بدون مكان فعلي",
    requiresAddress: false,
    extraFields: [
      {
        id: "social_link",
        label: "صفحة سوشيال ميديا",
        type: "text",
        placeholder: "رابط فيسبوك أو إنستاجرام (اختياري)",
        isRequired: false,
      },
    ],
  },
];

/** Get config for a specific business type */
export function getBusinessTypeConfig(
  type: BusinessType,
): BusinessTypeConfig | undefined {
  return businessTypesConfig.find((bt) => bt.id === type);
}
