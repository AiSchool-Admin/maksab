import type { CategoryConfig, CategoryField } from "@/types";

export const categoriesConfig: CategoryConfig[] = [
  {
    id: "cars",
    name: "السيارات",
    icon: "🚗",
    slug: "cars",
    subcategories: [
      { id: "passenger", name: "سيارات ملاكي", slug: "passenger" },
      { id: "microbus", name: "ميكروباص", slug: "microbus" },
      { id: "trucks", name: "نقل", slug: "trucks" },
      { id: "motorcycles", name: "موتوسيكلات", slug: "motorcycles" },
      { id: "car-parts", name: "قطع غيار", slug: "car-parts" },
      { id: "scooters", name: "سكوتر وتوك توك", slug: "scooters" },
      { id: "car-accessories", name: "إكسسوارات سيارات", slug: "car-accessories" },
      { id: "plate-numbers", name: "أرقام ولوحات مميزة", slug: "plate-numbers" },
    ],
    fields: [
      { id: "brand", label: "الماركة", type: "select", isRequired: true, order: 1, options: [
        { value: "toyota", label: "تويوتا" }, { value: "hyundai", label: "هيونداي" },
        { value: "chevrolet", label: "شيفروليه" }, { value: "nissan", label: "نيسان" },
        { value: "kia", label: "كيا" }, { value: "bmw", label: "بي إم دبليو" },
        { value: "mercedes", label: "مرسيدس" }, { value: "fiat", label: "فيات" },
        { value: "skoda", label: "سكودا" }, { value: "opel", label: "أوبل" },
        { value: "peugeot", label: "بيجو" }, { value: "renault", label: "رينو" },
        { value: "suzuki", label: "سوزوكي" }, { value: "mitsubishi", label: "ميتسوبيشي" },
        { value: "honda", label: "هوندا" }, { value: "mg", label: "MG" },
        { value: "chery", label: "شيري" }, { value: "byd", label: "بي واي دي" },
        { value: "geely", label: "جيلي" }, { value: "other", label: "أخرى" },
      ]},
      { id: "model", label: "الموديل", type: "select", isRequired: true, order: 2, options: [], hiddenForSubcategories: ["car-parts"] },
      { id: "year", label: "السنة", type: "year-picker", isRequired: true, order: 3, hiddenForSubcategories: ["car-parts"] },
      { id: "mileage", label: "الكيلومتراج", type: "number", unit: "كم", isRequired: true, order: 4, hiddenForSubcategories: ["car-parts"] },
      { id: "color", label: "اللون", type: "select", isRequired: false, order: 5, defaultValue: "white", options: [
        { value: "white", label: "أبيض" }, { value: "black", label: "أسود" },
        { value: "silver", label: "فضي" }, { value: "red", label: "أحمر" },
        { value: "blue", label: "أزرق" }, { value: "gray", label: "رمادي" },
        { value: "gold", label: "ذهبي" }, { value: "other", label: "أخرى" },
      ], hiddenForSubcategories: ["car-parts"] },
      { id: "fuel", label: "نوع الوقود", type: "select", isRequired: false, order: 6, defaultValue: "petrol", options: [
        { value: "petrol", label: "بنزين" }, { value: "diesel", label: "سولار" },
        { value: "gas", label: "غاز" }, { value: "electric", label: "كهرباء" },
        { value: "hybrid", label: "هايبرد" },
      ], hiddenForSubcategories: ["car-parts"] },
      { id: "transmission", label: "ناقل الحركة", type: "select", isRequired: false, order: 7, defaultValue: "automatic", options: [
        { value: "automatic", label: "أوتوماتيك" }, { value: "manual", label: "مانيوال" },
      ], hiddenForSubcategories: ["car-parts"] },
      { id: "engine_cc", label: "سعة المحرك", type: "select", isRequired: false, order: 8, defaultValue: "1600", options: [
        { value: "1000", label: "1000" }, { value: "1200", label: "1200" },
        { value: "1300", label: "1300" }, { value: "1500", label: "1500" },
        { value: "1600", label: "1600" }, { value: "1800", label: "1800" },
        { value: "2000", label: "2000" }, { value: "2500", label: "2500" },
        { value: "3000+", label: "3000+" },
      ], hiddenForSubcategories: ["car-parts"] },
      { id: "condition", label: "الحالة", type: "select", isRequired: false, order: 9, defaultValue: "used", options: [
        { value: "new", label: "جديدة" }, { value: "used", label: "مستعملة" },
        { value: "accident", label: "حادثة" },
      ], hiddenForSubcategories: ["car-parts"] },
      { id: "licensed", label: "مُرخصة", type: "toggle", isRequired: false, order: 10, defaultValue: true, hiddenForSubcategories: ["car-parts"] },
    ],
    requiredFields: ["brand", "model", "year", "mileage"],
    titleTemplate: "سيارة ${brand} ${model} موديل ${year} — ${condition} ${mileage}",
    descriptionTemplate: "سيارة ${brand} ${model} موديل ${year}، ${condition}، مسافة ${mileage}",
    subcategoryOverrides: {
      "car-parts": {
        requiredFields: ["brand"],
        titleTemplate: "قطع غيار ${brand}",
        descriptionTemplate: "قطع غيار سيارات ${brand}",
      },
    },
  },
  {
    id: "real_estate",
    name: "العقارات",
    icon: "🏠",
    slug: "real-estate",
    subcategories: [
      { id: "apartments-sale", name: "شقق للبيع", slug: "apartments-sale" },
      { id: "apartments-rent", name: "شقق للإيجار", slug: "apartments-rent" },
      { id: "villas", name: "فيلات", slug: "villas" },
      { id: "land", name: "أراضي", slug: "land" },
      { id: "commercial", name: "محلات تجارية", slug: "commercial" },
      { id: "offices", name: "مكاتب", slug: "offices" },
      { id: "chalets", name: "شاليهات واستراحات", slug: "chalets" },
      { id: "farms", name: "مزارع", slug: "farms" },
      { id: "shared-housing", name: "مشاركة سكن", slug: "shared-housing" },
    ],
    fields: [
      { id: "property_type", label: "النوع", type: "select", isRequired: true, order: 1, defaultValue: "apartment", options: [
        { value: "apartment", label: "شقة" }, { value: "villa", label: "فيلا" },
        { value: "land", label: "أرض" }, { value: "shop", label: "محل" },
        { value: "office", label: "مكتب" }, { value: "duplex", label: "دوبلكس" },
        { value: "penthouse", label: "بنتهاوس" }, { value: "studio", label: "استوديو" },
      ]},
      { id: "area", label: "المساحة", type: "number", unit: "م²", isRequired: true, order: 2 },
      { id: "rooms", label: "عدد الغرف", type: "select", isRequired: true, order: 3, defaultValue: "3", options: [
        { value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" },
        { value: "4", label: "4" }, { value: "5+", label: "5+" },
      ], hiddenForSubcategories: ["land", "commercial", "offices"] },
      { id: "floor", label: "الطابق", type: "select", isRequired: true, order: 4, defaultValue: "3", options: [
        { value: "basement", label: "بدروم" }, { value: "ground", label: "أرضي" },
        ...Array.from({ length: 20 }, (_, i) => ({ value: `${i + 1}`, label: `${i + 1}` })),
        { value: "last", label: "أخير" },
      ], hiddenForSubcategories: ["land"] },
      { id: "bathrooms", label: "عدد الحمامات", type: "select", isRequired: false, order: 5, defaultValue: "1", options: [
        { value: "1", label: "1" }, { value: "2", label: "2" },
        { value: "3", label: "3" }, { value: "4+", label: "4+" },
      ], hiddenForSubcategories: ["land"] },
      { id: "finishing", label: "التشطيب", type: "select", isRequired: false, order: 6, defaultValue: "super_lux", options: [
        { value: "super_lux", label: "سوبر لوكس" }, { value: "lux", label: "لوكس" },
        { value: "semi", label: "نص تشطيب" }, { value: "plastered", label: "على المحارة" },
        { value: "bricks", label: "على الطوب" },
      ], hiddenForSubcategories: ["land"] },
      { id: "elevator", label: "أسانسير", type: "toggle", isRequired: false, order: 7, hiddenForSubcategories: ["land"] },
      { id: "garage", label: "جراج", type: "toggle", isRequired: false, order: 8, hiddenForSubcategories: ["land"] },
      { id: "garden", label: "حديقة", type: "toggle", isRequired: false, order: 9, hiddenForSubcategories: ["land", "commercial", "offices"] },
      { id: "facing", label: "الواجهة", type: "select", isRequired: false, order: 10, options: [
        { value: "north", label: "بحري" }, { value: "south", label: "قبلي" },
        { value: "east", label: "شرقي" }, { value: "west", label: "غربي" },
      ], hiddenForSubcategories: ["land"] },
      { id: "furnished", label: "مفروشة", type: "toggle", isRequired: false, order: 11, hiddenForSubcategories: ["land"] },
    ],
    requiredFields: ["property_type", "area", "rooms", "floor"],
    titleTemplate: "${property_type} ${area} — ${rooms} غرف — الطابق ${floor}",
    descriptionTemplate: "${property_type} مساحة ${area}، ${rooms} غرف",
    subcategoryOverrides: {
      "land": {
        requiredFields: ["property_type", "area"],
        titleTemplate: "أرض ${area}",
        descriptionTemplate: "أرض مساحة ${area}",
      },
      "commercial": {
        requiredFields: ["property_type", "area", "floor"],
        extraFields: [
          { id: "frontage", label: "واجهة المحل", type: "number", unit: "متر", isRequired: false, order: 3.1, placeholder: "عرض الواجهة" },
          { id: "has_mezzanine", label: "يوجد ميزانين", type: "toggle", isRequired: false, order: 9.1 },
          { id: "has_bathroom", label: "يوجد حمام", type: "toggle", isRequired: false, order: 9.2 },
        ],
        fieldOverrides: {
          "furnished": { label: "مجهز" },
          "finishing": {
            options: [
              { value: "super_lux", label: "سوبر لوكس" }, { value: "lux", label: "لوكس" },
              { value: "semi", label: "نص تشطيب" }, { value: "plastered", label: "على المحارة" },
              { value: "bricks", label: "على الطوب" },
            ],
          },
        },
        titleTemplate: "محل ${area} — الطابق ${floor}",
        descriptionTemplate: "محل تجاري مساحة ${area}، الطابق ${floor}",
      },
      "offices": {
        requiredFields: ["property_type", "area", "floor"],
        titleTemplate: "مكتب ${area} — الطابق ${floor}",
        descriptionTemplate: "مكتب مساحة ${area}، الطابق ${floor}",
      },
    },
  },
  {
    id: "phones",
    name: "الموبايلات والتابلت",
    icon: "📱",
    slug: "phones",
    subcategories: [
      { id: "mobile", name: "موبايلات", slug: "mobile" },
      { id: "tablet", name: "تابلت", slug: "tablet" },
      { id: "phone-accessories", name: "إكسسوارات", slug: "phone-accessories" },
      { id: "phone-parts", name: "قطع غيار", slug: "phone-parts" },
      { id: "smartwatch", name: "ساعات ذكية", slug: "smartwatch" },
      { id: "headphones", name: "سماعات", slug: "headphones" },
      { id: "special-numbers", name: "أرقام مميزة", slug: "special-numbers" },
    ],
    fields: [
      { id: "brand", label: "الماركة", type: "select", isRequired: true, order: 1, options: [
        { value: "apple", label: "آيفون" }, { value: "samsung", label: "سامسونج" },
        { value: "xiaomi", label: "شاومي" }, { value: "oppo", label: "أوبو" },
        { value: "realme", label: "ريلمي" }, { value: "vivo", label: "فيفو" },
        { value: "huawei", label: "هواوي" }, { value: "oneplus", label: "ون بلس" },
        { value: "nokia", label: "نوكيا" }, { value: "other", label: "أخرى" },
      ]},
      { id: "model", label: "الموديل", type: "select", isRequired: true, order: 2, options: [], hiddenForSubcategories: ["phone-accessories", "phone-parts"] },
      { id: "storage", label: "المساحة", type: "select", isRequired: true, order: 3, defaultValue: "128", options: [
        { value: "32", label: "32GB" }, { value: "64", label: "64GB" },
        { value: "128", label: "128GB" }, { value: "256", label: "256GB" },
        { value: "512", label: "512GB" }, { value: "1024", label: "1TB" },
      ], hiddenForSubcategories: ["phone-accessories", "phone-parts"] },
      { id: "condition", label: "الحالة", type: "select", isRequired: true, order: 4, defaultValue: "good", options: [
        { value: "sealed", label: "جديد متبرشم" }, { value: "like_new", label: "مستعمل زيرو" },
        { value: "good", label: "مستعمل كويس" }, { value: "fair", label: "مستعمل مقبول" },
        { value: "broken", label: "تالف" },
      ], hiddenForSubcategories: ["phone-accessories", "phone-parts"] },
      { id: "color", label: "اللون", type: "select", isRequired: false, order: 5, defaultValue: "black", options: [
        { value: "black", label: "أسود" }, { value: "white", label: "أبيض" },
        { value: "blue", label: "أزرق" }, { value: "gold", label: "ذهبي" },
        { value: "other", label: "أخرى" },
      ], hiddenForSubcategories: ["phone-accessories", "phone-parts"] },
      { id: "ram", label: "الرام", type: "select", isRequired: false, order: 6, options: [
        { value: "3", label: "3GB" }, { value: "4", label: "4GB" },
        { value: "6", label: "6GB" }, { value: "8", label: "8GB" },
        { value: "12", label: "12GB" }, { value: "16", label: "16GB" },
      ], hiddenForSubcategories: ["phone-accessories", "phone-parts"] },
      { id: "battery", label: "البطارية", type: "select", isRequired: false, order: 7, options: [
        { value: "excellent", label: "ممتازة" }, { value: "good", label: "جيدة" },
        { value: "fair", label: "مقبولة" },
      ], hiddenForSubcategories: ["phone-accessories", "phone-parts"] },
      { id: "with_box", label: "مع العلبة", type: "toggle", isRequired: false, order: 8, hiddenForSubcategories: ["phone-accessories", "phone-parts"] },
      { id: "with_warranty", label: "مع الضمان", type: "toggle", isRequired: false, order: 9, hiddenForSubcategories: ["phone-accessories", "phone-parts"] },
    ],
    requiredFields: ["brand", "model", "storage", "condition"],
    titleTemplate: "${brand} ${model} — ${storage} — ${condition}",
    descriptionTemplate: "${brand} ${model} مساحة ${storage}، حالة: ${condition}",
    subcategoryOverrides: {
      "phone-accessories": {
        requiredFields: ["brand"],
        titleTemplate: "إكسسوارات ${brand}",
        descriptionTemplate: "إكسسوارات موبايل ${brand}",
      },
      "phone-parts": {
        requiredFields: ["brand"],
        titleTemplate: "قطع غيار ${brand}",
        descriptionTemplate: "قطع غيار موبايل ${brand}",
      },
    },
  },
  {
    id: "fashion",
    name: "الموضة",
    icon: "👗",
    slug: "fashion",
    subcategories: [
      { id: "men", name: "ملابس رجالي", slug: "men" },
      { id: "women", name: "ملابس حريمي", slug: "women" },
      { id: "kids", name: "ملابس أطفال", slug: "kids" },
      { id: "shoes", name: "أحذية", slug: "shoes" },
      { id: "bags", name: "شنط", slug: "bags" },
      { id: "fashion-accessories", name: "إكسسوارات", slug: "fashion-accessories" },
      { id: "hijab-fashion", name: "أزياء محجبات", slug: "hijab-fashion" },
      { id: "sportswear", name: "ملابس رياضية", slug: "sportswear" },
    ],
    fields: [
      { id: "type", label: "النوع", type: "select", isRequired: true, order: 1, options: [
        { value: "shirt", label: "قميص/بلوزة" }, { value: "pants", label: "بنطلون" },
        { value: "dress", label: "فستان" }, { value: "jacket", label: "جاكت" },
        { value: "coat", label: "كوت/بالطو" }, { value: "suit", label: "بدلة" },
        { value: "abaya", label: "عباية" }, { value: "hijab", label: "حجاب/إيشارب" },
        { value: "shoes", label: "حذاء" }, { value: "bag", label: "شنطة" },
        { value: "sportswear", label: "ملابس رياضية" }, { value: "underwear", label: "ملابس داخلية" },
        { value: "pajamas", label: "بيجامة" }, { value: "other", label: "أخرى" },
      ]},
      { id: "condition", label: "الحالة", type: "select", isRequired: true, order: 2, defaultValue: "excellent", options: [
        { value: "new_tagged", label: "جديد بالتاج" }, { value: "new_untagged", label: "جديد بدون تاج" },
        { value: "excellent", label: "مستعمل ممتاز" }, { value: "good", label: "مستعمل جيد" },
      ]},
      { id: "size", label: "المقاس", type: "select", isRequired: true, order: 3, defaultValue: "l", options: [
        { value: "xs", label: "XS" }, { value: "s", label: "S" }, { value: "m", label: "M" },
        { value: "l", label: "L" }, { value: "xl", label: "XL" }, { value: "xxl", label: "XXL" },
        { value: "36", label: "36" }, { value: "37", label: "37" }, { value: "38", label: "38" },
        { value: "39", label: "39" }, { value: "40", label: "40" }, { value: "41", label: "41" },
        { value: "42", label: "42" }, { value: "43", label: "43" }, { value: "44", label: "44" },
        { value: "45", label: "45" }, { value: "free_size", label: "مقاس حر" },
      ], hiddenForSubcategories: ["bags"] },
      { id: "brand", label: "الماركة", type: "select", isRequired: true, order: 4, options: [
        { value: "zara", label: "Zara" }, { value: "h_and_m", label: "H&M" },
        { value: "adidas", label: "Adidas" }, { value: "nike", label: "Nike" },
        { value: "lc_waikiki", label: "LC Waikiki" }, { value: "defacto", label: "DeFacto" },
        { value: "pull_and_bear", label: "Pull & Bear" }, { value: "bershka", label: "Bershka" },
        { value: "american_eagle", label: "American Eagle" }, { value: "max", label: "Max" },
        { value: "local", label: "ماركة محلية" }, { value: "other", label: "أخرى" },
      ]},
      { id: "color", label: "اللون", type: "select", isRequired: false, order: 5, defaultValue: "black", options: [
        { value: "black", label: "أسود" }, { value: "white", label: "أبيض" },
        { value: "blue", label: "أزرق" }, { value: "red", label: "أحمر" },
        { value: "other", label: "أخرى" },
      ]},
      { id: "material", label: "الخامة", type: "select", isRequired: false, order: 6, defaultValue: "cotton", options: [
        { value: "cotton", label: "قطن" }, { value: "polyester", label: "بوليستر" },
        { value: "leather", label: "جلد" }, { value: "jeans", label: "جينز" },
        { value: "silk", label: "حرير" }, { value: "linen", label: "كتان" },
      ]},
    ],
    requiredFields: ["type", "condition", "size", "brand"],
    titleTemplate: "${type} ${brand} — مقاس ${size} — ${condition}",
    descriptionTemplate: "${type} ماركة ${brand}، مقاس ${size}، ${condition}",
    subcategoryOverrides: {
      "bags": {
        requiredFields: ["type", "condition", "brand"],
        extraFields: [
          { id: "bag_length", label: "الطول", type: "number", unit: "سم", isRequired: false, order: 3.1, placeholder: "مثال: 30" },
          { id: "bag_width", label: "العرض", type: "number", unit: "سم", isRequired: false, order: 3.2, placeholder: "مثال: 20" },
        ],
        fieldOverrides: {
          "type": {
            options: [
              { value: "handbag", label: "شنطة يد" },
              { value: "backpack", label: "شنطة ظهر" },
              { value: "crossbody", label: "شنطة كروس" },
              { value: "tote", label: "شنطة توت" },
              { value: "clutch", label: "كلاتش" },
              { value: "travel_bag", label: "شنطة سفر" },
              { value: "laptop_bag", label: "شنطة لابتوب" },
              { value: "school_bag", label: "حقيبة مدرسة" },
              { value: "wallet", label: "محفظة" },
              { value: "other", label: "أخرى" },
            ],
          },
        },
        titleTemplate: "${type} ${brand} — ${condition}",
        descriptionTemplate: "${type} ماركة ${brand}، ${condition}",
      },
    },
  },
  {
    id: "scrap",
    name: "الخردة",
    icon: "♻️",
    slug: "scrap",
    subcategories: [
      { id: "iron", name: "حديد", slug: "iron" },
      { id: "aluminum", name: "ألومنيوم", slug: "aluminum" },
      { id: "copper", name: "نحاس", slug: "copper" },
      { id: "plastic", name: "بلاستيك", slug: "plastic" },
      { id: "paper", name: "ورق", slug: "paper" },
      { id: "old-devices", name: "أجهزة قديمة", slug: "old-devices" },
      { id: "construction", name: "مخلفات بناء", slug: "construction" },
      { id: "scrap-other", name: "أخرى", slug: "scrap-other" },
    ],
    fields: [
      { id: "type", label: "النوع", type: "select", isRequired: true, order: 1, options: [
        { value: "iron", label: "حديد" }, { value: "aluminum", label: "ألومنيوم" },
        { value: "copper", label: "نحاس" }, { value: "plastic", label: "بلاستيك" },
        { value: "paper", label: "ورق" }, { value: "old_devices", label: "أجهزة قديمة" },
        { value: "construction", label: "مخلفات بناء" }, { value: "other", label: "أخرى" },
      ]},
      { id: "weight", label: "الوزن التقريبي", type: "number", unit: "كجم", isRequired: true, order: 2 },
      { id: "condition", label: "الحالة", type: "select", isRequired: true, order: 3, defaultValue: "clean", options: [
        { value: "clean", label: "نظيف" }, { value: "mixed", label: "مختلط" },
        { value: "needs_sorting", label: "يحتاج فرز" },
      ]},
      { id: "quantity", label: "الكمية", type: "select", isRequired: false, order: 4, defaultValue: "medium", options: [
        { value: "small", label: "كمية صغيرة" }, { value: "medium", label: "كمية متوسطة" },
        { value: "large", label: "كمية كبيرة" }, { value: "wholesale", label: "جملة" },
      ]},
    ],
    requiredFields: ["type", "weight", "condition"],
    titleTemplate: "${type} خردة — ${weight} — ${condition}",
    descriptionTemplate: "${type} خردة وزن ${weight}، ${condition}",
    subcategoryOverrides: {
      "old-devices": {
        fieldOverrides: {
          "type": {
            options: [
              { value: "tv", label: "تليفزيون" }, { value: "washer", label: "غسالة" },
              { value: "fridge", label: "ثلاجة" }, { value: "ac", label: "مكيف" },
              { value: "computer", label: "كمبيوتر" }, { value: "printer", label: "طابعة" },
              { value: "microwave", label: "ميكروويف" }, { value: "other", label: "أخرى" },
            ],
          },
        },
        titleTemplate: "${type} قديم — ${weight} — ${condition}",
        descriptionTemplate: "${type} قديم وزن ${weight}، ${condition}",
      },
      "construction": {
        fieldOverrides: {
          "type": {
            options: [
              { value: "bricks", label: "طوب" }, { value: "concrete", label: "خرسانة" },
              { value: "tiles", label: "بلاط" }, { value: "wood", label: "خشب" },
              { value: "rubble", label: "ردم/أنقاض" }, { value: "mixed", label: "مخلوط" },
              { value: "other", label: "أخرى" },
            ],
          },
          "weight": { unit: "طن" },
        },
        titleTemplate: "مخلفات بناء ${type} — ${weight} — ${condition}",
        descriptionTemplate: "مخلفات بناء ${type} وزن ${weight}، ${condition}",
      },
    },
  },
  {
    id: "gold",
    name: "الذهب والفضة",
    icon: "💰",
    slug: "gold",
    subcategories: [
      { id: "gold-items", name: "ذهب", slug: "gold-items" },
      { id: "silver", name: "فضة", slug: "silver" },
      { id: "diamond", name: "ألماس", slug: "diamond" },
      { id: "precious-watches", name: "ساعات ثمينة", slug: "precious-watches" },
    ],
    fields: [
      { id: "type", label: "النوع", type: "select", isRequired: true, order: 1, options: [
        { value: "ring", label: "خاتم" }, { value: "chain", label: "سلسلة" },
        { value: "earring", label: "حلق" }, { value: "bracelet", label: "أسورة" },
        { value: "necklace", label: "عقد" }, { value: "wedding_ring", label: "دبلة" },
        { value: "engagement_ring", label: "محبس" }, { value: "gold_coin", label: "جنيه ذهب" },
        { value: "bar", label: "سبيكة" }, { value: "other", label: "أخرى" },
      ]},
      { id: "karat", label: "العيار", type: "select", isRequired: true, order: 2, defaultValue: "21", options: [
        { value: "24", label: "عيار 24" }, { value: "21", label: "عيار 21" },
        { value: "18", label: "عيار 18" }, { value: "14", label: "عيار 14" },
        { value: "silver_925", label: "فضة 925" }, { value: "silver_900", label: "فضة 900" },
      ], hiddenForSubcategories: ["precious-watches"] },
      { id: "weight", label: "الوزن", type: "number", unit: "جرام", isRequired: true, order: 3, hiddenForSubcategories: ["precious-watches"] },
      { id: "condition", label: "الحالة", type: "select", isRequired: true, order: 4, defaultValue: "used", options: [
        { value: "new", label: "جديد" }, { value: "used", label: "مستعمل" },
      ]},
      { id: "brand", label: "الماركة", type: "select", isRequired: false, order: 5, options: [
        { value: "lazurde", label: "لازوردي" }, { value: "damas", label: "داماس" },
        { value: "tiffany", label: "Tiffany" }, { value: "cartier", label: "Cartier" },
        { value: "local", label: "صنعة محلية" }, { value: "other", label: "أخرى" },
      ]},
      { id: "ring_size", label: "مقاس الخاتم", type: "select", isRequired: false, order: 6, hiddenForSubcategories: ["precious-watches"], options: [
        { value: "14", label: "14" }, { value: "15", label: "15" }, { value: "16", label: "16" },
        { value: "17", label: "17" }, { value: "18", label: "18" }, { value: "19", label: "19" },
        { value: "20", label: "20" }, { value: "21", label: "21" }, { value: "22", label: "22" },
        { value: "23", label: "23" }, { value: "24", label: "24" }, { value: "25", label: "25" },
      ]},
      { id: "has_gemstone", label: "يوجد فص/حجر", type: "toggle", isRequired: false, order: 7, hiddenForSubcategories: ["precious-watches"] },
      { id: "certificate", label: "شهادة", type: "toggle", isRequired: false, order: 8 },
    ],
    requiredFields: ["type", "karat", "weight", "condition"],
    titleTemplate: "${type} ذهب ${karat} — ${weight} — ${condition}",
    descriptionTemplate: "${type} ${karat}، وزن ${weight}، ${condition}",
    subcategoryOverrides: {
      "silver": {
        fieldOverrides: {
          "karat": {
            options: [
              { value: "silver_925", label: "فضة 925" }, { value: "silver_900", label: "فضة 900" },
              { value: "silver_800", label: "فضة 800" },
            ],
          },
        },
        titleTemplate: "${type} فضة ${karat} — ${weight} — ${condition}",
        descriptionTemplate: "${type} فضة ${karat}، وزن ${weight}، ${condition}",
      },
      "diamond": {
        extraFields: [
          { id: "carat", label: "القيراط", type: "select", isRequired: false, order: 2.1, options: [
            { value: "0.25", label: "0.25 قيراط" }, { value: "0.5", label: "0.5 قيراط" },
            { value: "0.75", label: "0.75 قيراط" }, { value: "1", label: "1 قيراط" },
            { value: "1.5", label: "1.5 قيراط" }, { value: "2", label: "2 قيراط" },
            { value: "3+", label: "3+ قيراط" },
          ]},
        ],
        titleTemplate: "${type} ألماس — ${weight} — ${condition}",
        descriptionTemplate: "${type} ألماس، وزن ${weight}، ${condition}",
      },
      "precious-watches": {
        requiredFields: ["type", "condition"],
        extraFields: [
          { id: "watch_brand", label: "ماركة الساعة", type: "select", isRequired: true, order: 1.1, options: [
            { value: "rolex", label: "Rolex" }, { value: "omega", label: "Omega" },
            { value: "cartier", label: "Cartier" }, { value: "patek", label: "Patek Philippe" },
            { value: "audemars", label: "Audemars Piguet" }, { value: "breitling", label: "Breitling" },
            { value: "tag_heuer", label: "TAG Heuer" }, { value: "tissot", label: "Tissot" },
            { value: "other", label: "أخرى" },
          ]},
          { id: "movement", label: "نوع الحركة", type: "select", isRequired: false, order: 2.2, options: [
            { value: "automatic", label: "أوتوماتيك" }, { value: "quartz", label: "كوارتز" },
            { value: "manual", label: "يدوي" },
          ]},
          { id: "case_material", label: "خامة الكيس", type: "select", isRequired: false, order: 3.1, options: [
            { value: "steel", label: "ستانلس ستيل" }, { value: "gold", label: "ذهب" },
            { value: "rose_gold", label: "روز جولد" }, { value: "titanium", label: "تيتانيوم" },
            { value: "ceramic", label: "سيراميك" }, { value: "other", label: "أخرى" },
          ]},
        ],
        fieldOverrides: {
          "type": {
            options: [
              { value: "men_watch", label: "ساعة رجالي" },
              { value: "women_watch", label: "ساعة حريمي" },
              { value: "unisex_watch", label: "ساعة يونيسكس" },
            ],
          },
        },
        titleTemplate: "${type} ${watch_brand} — ${condition}",
        descriptionTemplate: "${type} ${watch_brand}، ${condition}",
      },
    },
  },
  {
    id: "luxury",
    name: "السلع الفاخرة",
    icon: "💎",
    slug: "luxury",
    subcategories: [
      { id: "luxury-bags", name: "شنط فاخرة", slug: "luxury-bags" },
      { id: "sunglasses", name: "نظارات", slug: "sunglasses" },
      { id: "watches", name: "ساعات", slug: "watches" },
      { id: "perfumes", name: "عطور", slug: "perfumes" },
      { id: "pens", name: "أقلام", slug: "pens" },
    ],
    fields: [
      { id: "type", label: "النوع", type: "select", isRequired: true, order: 1, options: [
        { value: "bag", label: "شنطة" }, { value: "sunglasses", label: "نظارة" },
        { value: "watch", label: "ساعة" }, { value: "perfume", label: "عطر" },
        { value: "pen", label: "قلم" }, { value: "other", label: "أخرى" },
      ]},
      { id: "brand", label: "الماركة", type: "select", isRequired: true, order: 2, options: [
        { value: "louis_vuitton", label: "Louis Vuitton" }, { value: "gucci", label: "Gucci" },
        { value: "chanel", label: "Chanel" }, { value: "rolex", label: "Rolex" },
        { value: "cartier", label: "Cartier" }, { value: "dior", label: "Dior" },
        { value: "prada", label: "Prada" }, { value: "other", label: "أخرى" },
      ]},
      { id: "condition", label: "الحالة", type: "select", isRequired: true, order: 3, defaultValue: "excellent", options: [
        { value: "sealed", label: "جديد متبرشم" }, { value: "new_unused", label: "جديد بدون استعمال" },
        { value: "excellent", label: "مستعمل ممتاز" }, { value: "good", label: "مستعمل جيد" },
      ]},
      { id: "authentic", label: "أصلي/تقليد", type: "select", isRequired: true, order: 4, defaultValue: "authentic_warranty", options: [
        { value: "authentic_warranty", label: "أصلي بالضمان" }, { value: "authentic_no_warranty", label: "أصلي بدون ضمان" },
        { value: "high_copy", label: "هاي كوبي" }, { value: "copy", label: "كوبي" },
      ]},
      { id: "purchase_year", label: "سنة الشراء", type: "year-picker", isRequired: false, order: 5 },
      { id: "with_box", label: "مع العلبة", type: "toggle", isRequired: false, order: 6 },
      { id: "with_receipt", label: "مع الفاتورة", type: "toggle", isRequired: false, order: 7 },
    ],
    requiredFields: ["type", "brand", "condition", "authentic"],
    titleTemplate: "${type} ${brand} — ${authentic} — ${condition}",
    descriptionTemplate: "${type} ${brand}، ${condition}، ${authentic}",
    subcategoryOverrides: {
      "luxury-bags": {
        extraFields: [
          { id: "bag_size", label: "الحجم", type: "select", isRequired: false, order: 4.1, options: [
            { value: "mini", label: "ميني" }, { value: "small", label: "صغير" },
            { value: "medium", label: "متوسط" }, { value: "large", label: "كبير" },
          ]},
          { id: "bag_material", label: "الخامة", type: "select", isRequired: false, order: 4.2, options: [
            { value: "leather", label: "جلد طبيعي" }, { value: "canvas", label: "كانفاس" },
            { value: "fabric", label: "قماش" }, { value: "other", label: "أخرى" },
          ]},
        ],
        fieldOverrides: {
          "type": {
            options: [
              { value: "handbag", label: "شنطة يد" }, { value: "crossbody", label: "كروس بادي" },
              { value: "tote", label: "توت" }, { value: "clutch", label: "كلاتش" },
              { value: "backpack", label: "باك باك" }, { value: "wallet", label: "محفظة" },
              { value: "travel_bag", label: "شنطة سفر" }, { value: "other", label: "أخرى" },
            ],
          },
        },
        titleTemplate: "${type} ${brand} — ${authentic} — ${condition}",
        descriptionTemplate: "شنطة ${brand}، ${condition}، ${authentic}",
      },
      "watches": {
        extraFields: [
          { id: "movement", label: "نوع الحركة", type: "select", isRequired: false, order: 4.1, options: [
            { value: "automatic", label: "أوتوماتيك" }, { value: "quartz", label: "كوارتز" },
            { value: "manual", label: "يدوي" },
          ]},
          { id: "case_material", label: "خامة الكيس", type: "select", isRequired: false, order: 4.2, options: [
            { value: "steel", label: "ستانلس ستيل" }, { value: "gold", label: "ذهب" },
            { value: "rose_gold", label: "روز جولد" }, { value: "titanium", label: "تيتانيوم" },
            { value: "ceramic", label: "سيراميك" }, { value: "other", label: "أخرى" },
          ]},
          { id: "case_size", label: "قطر الكيس", type: "select", isRequired: false, order: 4.3, options: [
            { value: "36mm", label: "36mm" }, { value: "38mm", label: "38mm" },
            { value: "40mm", label: "40mm" }, { value: "42mm", label: "42mm" },
            { value: "44mm", label: "44mm" }, { value: "46mm", label: "46mm" },
          ]},
        ],
        fieldOverrides: {
          "type": {
            options: [
              { value: "men_watch", label: "ساعة رجالي" },
              { value: "women_watch", label: "ساعة حريمي" },
              { value: "unisex_watch", label: "ساعة يونيسكس" },
            ],
          },
          "brand": {
            options: [
              { value: "rolex", label: "Rolex" }, { value: "omega", label: "Omega" },
              { value: "cartier", label: "Cartier" }, { value: "patek", label: "Patek Philippe" },
              { value: "audemars", label: "Audemars Piguet" }, { value: "breitling", label: "Breitling" },
              { value: "tag_heuer", label: "TAG Heuer" }, { value: "tissot", label: "Tissot" },
              { value: "casio", label: "Casio" }, { value: "other", label: "أخرى" },
            ],
          },
        },
        titleTemplate: "ساعة ${brand} — ${authentic} — ${condition}",
        descriptionTemplate: "ساعة ${brand}، ${condition}، ${authentic}",
      },
      "sunglasses": {
        fieldOverrides: {
          "type": {
            options: [
              { value: "men_sunglasses", label: "نظارة رجالي" },
              { value: "women_sunglasses", label: "نظارة حريمي" },
              { value: "unisex_sunglasses", label: "نظارة يونيسكس" },
            ],
          },
          "brand": {
            options: [
              { value: "ray_ban", label: "Ray-Ban" }, { value: "gucci", label: "Gucci" },
              { value: "prada", label: "Prada" }, { value: "dior", label: "Dior" },
              { value: "versace", label: "Versace" }, { value: "tom_ford", label: "Tom Ford" },
              { value: "chanel", label: "Chanel" }, { value: "other", label: "أخرى" },
            ],
          },
        },
        titleTemplate: "${type} ${brand} — ${authentic} — ${condition}",
        descriptionTemplate: "نظارة ${brand}، ${condition}، ${authentic}",
      },
      "perfumes": {
        extraFields: [
          { id: "perfume_size", label: "الحجم", type: "select", isRequired: false, order: 4.1, options: [
            { value: "30ml", label: "30ml" }, { value: "50ml", label: "50ml" },
            { value: "75ml", label: "75ml" }, { value: "100ml", label: "100ml" },
            { value: "125ml", label: "125ml" }, { value: "150ml", label: "150ml" },
            { value: "200ml", label: "200ml" },
          ]},
          { id: "concentration", label: "التركيز", type: "select", isRequired: false, order: 4.2, options: [
            { value: "parfum", label: "بارفان" }, { value: "edp", label: "أو دي بارفان EDP" },
            { value: "edt", label: "أو دي تواليت EDT" }, { value: "cologne", label: "كولونيا" },
          ]},
          { id: "gender", label: "للجنس", type: "select", isRequired: false, order: 4.3, options: [
            { value: "men", label: "رجالي" }, { value: "women", label: "حريمي" },
            { value: "unisex", label: "يونيسكس" },
          ]},
        ],
        fieldOverrides: {
          "type": {
            options: [
              { value: "perfume", label: "عطر" }, { value: "deodorant", label: "مزيل عرق" },
              { value: "body_mist", label: "بودي ميست" }, { value: "set", label: "طقم عطور" },
              { value: "other", label: "أخرى" },
            ],
          },
          "brand": {
            options: [
              { value: "chanel", label: "Chanel" }, { value: "dior", label: "Dior" },
              { value: "tom_ford", label: "Tom Ford" }, { value: "creed", label: "Creed" },
              { value: "ysl", label: "YSL" }, { value: "versace", label: "Versace" },
              { value: "givenchy", label: "Givenchy" }, { value: "armani", label: "Armani" },
              { value: "guerlain", label: "Guerlain" }, { value: "other", label: "أخرى" },
            ],
          },
        },
        titleTemplate: "عطر ${brand} — ${perfume_size} — ${authentic}",
        descriptionTemplate: "عطر ${brand}، ${condition}، ${authentic}",
      },
      "pens": {
        fieldOverrides: {
          "type": {
            options: [
              { value: "fountain", label: "قلم حبر" }, { value: "ballpoint", label: "قلم جاف" },
              { value: "rollerball", label: "رولربول" }, { value: "set", label: "طقم أقلام" },
              { value: "other", label: "أخرى" },
            ],
          },
          "brand": {
            options: [
              { value: "montblanc", label: "Montblanc" }, { value: "parker", label: "Parker" },
              { value: "cross", label: "Cross" }, { value: "waterman", label: "Waterman" },
              { value: "sheaffer", label: "Sheaffer" }, { value: "other", label: "أخرى" },
            ],
          },
        },
        titleTemplate: "${type} ${brand} — ${authentic} — ${condition}",
        descriptionTemplate: "${type} ${brand}، ${condition}، ${authentic}",
      },
    },
  },
  {
    id: "appliances",
    name: "الأجهزة المنزلية",
    icon: "🏠",
    slug: "appliances",
    subcategories: [
      { id: "washers", name: "غسالات", slug: "washers" },
      { id: "fridges", name: "ثلاجات", slug: "fridges" },
      { id: "cookers", name: "بوتاجازات", slug: "cookers" },
      { id: "ac", name: "مكيفات", slug: "ac" },
      { id: "heaters", name: "سخانات", slug: "heaters" },
      { id: "small-appliances", name: "أجهزة صغيرة", slug: "small-appliances" },
    ],
    fields: [
      { id: "type", label: "النوع", type: "select", isRequired: true, order: 1, options: [
        { value: "washer", label: "غسالة" }, { value: "fridge", label: "ثلاجة" },
        { value: "cooker", label: "بوتاجاز" }, { value: "ac", label: "مكيف" },
        { value: "heater", label: "سخان" }, { value: "small", label: "جهاز صغير" },
        { value: "other", label: "أخرى" },
      ]},
      { id: "brand", label: "الماركة", type: "select", isRequired: true, order: 2, options: [
        { value: "toshiba", label: "توشيبا" }, { value: "sharp", label: "شارب" },
        { value: "samsung", label: "سامسونج" }, { value: "lg", label: "إل جي" },
        { value: "beko", label: "بيكو" }, { value: "universal", label: "يونيفرسال" },
        { value: "carrier", label: "كاريير" }, { value: "fresh", label: "فريش" },
        { value: "other", label: "أخرى" },
      ]},
      { id: "condition", label: "الحالة", type: "select", isRequired: true, order: 3, defaultValue: "good", options: [
        { value: "sealed", label: "جديد متبرشم" }, { value: "excellent", label: "مستعمل ممتاز" },
        { value: "good", label: "مستعمل كويس" }, { value: "needs_repair", label: "يحتاج صيانة" },
      ]},
      { id: "purchase_year", label: "سنة الشراء", type: "year-picker", isRequired: true, order: 4 },
      { id: "capacity", label: "السعة", type: "select", isRequired: false, order: 5, options: [
        { value: "5kg", label: "5 كيلو" }, { value: "7kg", label: "7 كيلو" },
        { value: "8kg", label: "8 كيلو" }, { value: "10kg", label: "10 كيلو" },
        { value: "12kg", label: "12 كيلو" }, { value: "14kg", label: "14 كيلو" },
        { value: "10ft", label: "10 قدم" }, { value: "12ft", label: "12 قدم" },
        { value: "14ft", label: "14 قدم" }, { value: "16ft", label: "16 قدم" },
        { value: "18ft", label: "18 قدم" }, { value: "20ft", label: "20 قدم" },
        { value: "1.5hp", label: "1.5 حصان" }, { value: "2.25hp", label: "2.25 حصان" },
        { value: "3hp", label: "3 حصان" }, { value: "5hp", label: "5 حصان" },
        { value: "other", label: "أخرى" },
      ]},
      { id: "warranty", label: "الضمان", type: "toggle", isRequired: false, order: 6 },
      { id: "color", label: "اللون", type: "select", isRequired: false, order: 7, defaultValue: "white", options: [
        { value: "white", label: "أبيض" }, { value: "silver", label: "سيلفر" },
        { value: "black", label: "أسود" }, { value: "other", label: "أخرى" },
      ]},
      { id: "appliance_model", label: "الموديل", type: "text", isRequired: false, order: 8, placeholder: "رقم الموديل" },
    ],
    requiredFields: ["type", "brand", "condition", "purchase_year"],
    titleTemplate: "${type} ${brand} — ${purchase_year} — ${condition}",
    descriptionTemplate: "${type} ${brand} موديل ${purchase_year}، ${condition}",
    subcategoryOverrides: {
      "washers": {
        fieldOverrides: {
          "capacity": {
            options: [
              { value: "5kg", label: "5 كيلو" }, { value: "7kg", label: "7 كيلو" },
              { value: "8kg", label: "8 كيلو" }, { value: "10kg", label: "10 كيلو" },
              { value: "12kg", label: "12 كيلو" }, { value: "14kg", label: "14 كيلو" },
              { value: "16kg", label: "16 كيلو" },
            ],
          },
        },
        extraFields: [
          { id: "load_type", label: "نوع التحميل", type: "select", isRequired: false, order: 5.1, options: [
            { value: "front", label: "تحميل أمامي" }, { value: "top", label: "تحميل علوي" },
          ]},
        ],
        titleTemplate: "غسالة ${brand} ${capacity} — ${purchase_year} — ${condition}",
        descriptionTemplate: "غسالة ${brand} سعة ${capacity}، ${purchase_year}، ${condition}",
      },
      "fridges": {
        fieldOverrides: {
          "capacity": {
            options: [
              { value: "8ft", label: "8 قدم" }, { value: "10ft", label: "10 قدم" },
              { value: "12ft", label: "12 قدم" }, { value: "14ft", label: "14 قدم" },
              { value: "16ft", label: "16 قدم" }, { value: "18ft", label: "18 قدم" },
              { value: "20ft", label: "20 قدم" }, { value: "22ft", label: "22 قدم" },
              { value: "24ft", label: "24 قدم" },
            ],
          },
        },
        extraFields: [
          { id: "fridge_type", label: "النظام", type: "select", isRequired: false, order: 5.1, options: [
            { value: "nofrost", label: "نو فروست" }, { value: "defrost", label: "ديفروست" },
          ]},
          { id: "doors", label: "عدد الأبواب", type: "select", isRequired: false, order: 5.2, options: [
            { value: "1", label: "باب واحد" }, { value: "2", label: "بابين" },
            { value: "side_by_side", label: "جنب بجنب" }, { value: "french", label: "فرنش دور" },
          ]},
        ],
        titleTemplate: "ثلاجة ${brand} ${capacity} — ${purchase_year} — ${condition}",
        descriptionTemplate: "ثلاجة ${brand} سعة ${capacity}، ${purchase_year}، ${condition}",
      },
      "cookers": {
        fieldOverrides: {
          "capacity": {
            label: "عدد العيون",
            options: [
              { value: "4_eyes", label: "4 عيون" }, { value: "5_eyes", label: "5 عيون" },
              { value: "6_eyes", label: "6 عيون" },
            ],
          },
        },
        extraFields: [
          { id: "cooker_size", label: "الحجم", type: "select", isRequired: false, order: 5.1, options: [
            { value: "50cm", label: "50 سم" }, { value: "55cm", label: "55 سم" },
            { value: "60cm", label: "60 سم" }, { value: "80cm", label: "80 سم" },
            { value: "90cm", label: "90 سم" },
          ]},
        ],
        titleTemplate: "بوتاجاز ${brand} — ${purchase_year} — ${condition}",
        descriptionTemplate: "بوتاجاز ${brand}، ${purchase_year}، ${condition}",
      },
      "ac": {
        fieldOverrides: {
          "capacity": {
            label: "القدرة",
            options: [
              { value: "1.5hp", label: "1.5 حصان" }, { value: "2.25hp", label: "2.25 حصان" },
              { value: "3hp", label: "3 حصان" }, { value: "4hp", label: "4 حصان" },
              { value: "5hp", label: "5 حصان" },
            ],
          },
        },
        extraFields: [
          { id: "ac_type", label: "نوع المكيف", type: "select", isRequired: false, order: 5.1, options: [
            { value: "split", label: "سبليت" }, { value: "window", label: "شباك" },
            { value: "portable", label: "متنقل" }, { value: "concealed", label: "كونسيلد" },
          ]},
          { id: "cooling_heating", label: "تبريد/تدفئة", type: "select", isRequired: false, order: 5.2, options: [
            { value: "cool_only", label: "تبريد فقط" }, { value: "cool_heat", label: "تبريد وتدفئة" },
          ]},
        ],
        titleTemplate: "مكيف ${brand} ${capacity} — ${purchase_year} — ${condition}",
        descriptionTemplate: "مكيف ${brand} قدرة ${capacity}، ${purchase_year}، ${condition}",
      },
      "heaters": {
        fieldOverrides: {
          "capacity": {
            label: "السعة",
            options: [
              { value: "30l", label: "30 لتر" }, { value: "40l", label: "40 لتر" },
              { value: "50l", label: "50 لتر" }, { value: "60l", label: "60 لتر" },
              { value: "80l", label: "80 لتر" }, { value: "100l", label: "100 لتر" },
            ],
          },
        },
        extraFields: [
          { id: "heater_type", label: "نوع السخان", type: "select", isRequired: false, order: 5.1, options: [
            { value: "electric", label: "كهرباء" }, { value: "gas", label: "غاز" },
            { value: "instant", label: "فوري" }, { value: "solar", label: "طاقة شمسية" },
          ]},
        ],
        titleTemplate: "سخان ${brand} ${capacity} — ${purchase_year} — ${condition}",
        descriptionTemplate: "سخان ${brand} سعة ${capacity}، ${purchase_year}، ${condition}",
      },
      "small-appliances": {
        fieldOverrides: {
          "type": {
            options: [
              { value: "blender", label: "خلاط" }, { value: "iron", label: "مكواة" },
              { value: "microwave", label: "ميكروويف" }, { value: "toaster", label: "توستر" },
              { value: "mixer", label: "عجان" }, { value: "vacuum", label: "مكنسة" },
              { value: "fan", label: "مروحة" }, { value: "air_fryer", label: "إير فراير" },
              { value: "coffee_machine", label: "ماكينة قهوة" }, { value: "other", label: "أخرى" },
            ],
          },
        },
        titleTemplate: "${type} ${brand} — ${purchase_year} — ${condition}",
        descriptionTemplate: "${type} ${brand}، ${purchase_year}، ${condition}",
      },
    },
  },
  {
    id: "furniture",
    name: "الأثاث والديكور",
    icon: "🪑",
    slug: "furniture",
    subcategories: [
      { id: "bedroom", name: "غرف نوم", slug: "bedroom" },
      { id: "dining", name: "سفرة", slug: "dining" },
      { id: "living", name: "أنتريه", slug: "living" },
      { id: "kitchen", name: "مطابخ", slug: "kitchen" },
      { id: "decor", name: "ديكورات", slug: "decor" },
      { id: "lighting", name: "إضاءة", slug: "lighting" },
      { id: "carpets", name: "سجاد", slug: "carpets" },
      { id: "furniture-other", name: "أخرى", slug: "furniture-other" },
      { id: "office-furniture", name: "أثاث مكتبي", slug: "office-furniture" },
      { id: "outdoor-furniture", name: "أثاث حدائق", slug: "outdoor-furniture" },
      { id: "curtains", name: "ستائر", slug: "curtains" },
    ],
    fields: [
      { id: "type", label: "النوع", type: "select", isRequired: true, order: 1, options: [
        { value: "bedroom", label: "غرفة نوم" }, { value: "dining", label: "سفرة" },
        { value: "living", label: "أنتريه" }, { value: "kitchen", label: "مطبخ" },
        { value: "decor", label: "ديكور" }, { value: "lighting", label: "إضاءة" },
        { value: "carpet", label: "سجاد" }, { value: "other", label: "أخرى" },
      ]},
      { id: "condition", label: "الحالة", type: "select", isRequired: true, order: 2, defaultValue: "good", options: [
        { value: "new", label: "جديد" }, { value: "excellent", label: "مستعمل ممتاز" },
        { value: "good", label: "مستعمل جيد" }, { value: "needs_renewal", label: "يحتاج تجديد" },
      ]},
      { id: "material", label: "الخامة", type: "select", isRequired: true, order: 3, defaultValue: "mdf", options: [
        { value: "beech", label: "خشب زان" }, { value: "oak", label: "خشب أرو" },
        { value: "mdf", label: "MDF" }, { value: "pine", label: "خشب موسكي" },
        { value: "metal", label: "معدن" }, { value: "other", label: "أخرى" },
      ]},
      { id: "color", label: "اللون", type: "select", isRequired: false, order: 4, defaultValue: "brown", options: [
        { value: "brown", label: "بني" }, { value: "white", label: "أبيض" },
        { value: "black", label: "أسود" }, { value: "other", label: "أخرى" },
      ]},
      { id: "pieces", label: "عدد القطع", type: "number", isRequired: false, order: 5 },
      { id: "dimensions", label: "الأبعاد", type: "text", isRequired: false, order: 6 },
    ],
    requiredFields: ["type", "condition", "material"],
    titleTemplate: "${type} ${material} — ${condition}",
    descriptionTemplate: "${type} ${material}، ${condition}",
    subcategoryOverrides: {
      "kitchen": {
        fieldOverrides: {
          "material": {
            options: [
              { value: "aluminum", label: "ألوميتال" }, { value: "wood", label: "خشب" },
              { value: "hpl", label: "HPL" }, { value: "acrylic", label: "أكريليك" },
              { value: "mdf", label: "MDF" }, { value: "other", label: "أخرى" },
            ],
          },
        },
        extraFields: [
          { id: "kitchen_length", label: "الطول", type: "number", unit: "متر", isRequired: false, order: 3.1 },
        ],
        titleTemplate: "مطبخ ${material} — ${condition}",
        descriptionTemplate: "مطبخ ${material}، ${condition}",
      },
      "lighting": {
        fieldOverrides: {
          "type": {
            options: [
              { value: "chandelier", label: "نجفة" }, { value: "wall_light", label: "أبليك" },
              { value: "floor_lamp", label: "أباجورة أرضية" }, { value: "table_lamp", label: "أباجورة" },
              { value: "ceiling", label: "سبوت لايت" }, { value: "led_strip", label: "ليد" },
              { value: "other", label: "أخرى" },
            ],
          },
          "material": {
            options: [
              { value: "crystal", label: "كريستال" }, { value: "metal", label: "معدن" },
              { value: "wood", label: "خشب" }, { value: "fabric", label: "قماش" },
              { value: "other", label: "أخرى" },
            ],
          },
        },
        titleTemplate: "${type} — ${material} — ${condition}",
        descriptionTemplate: "${type} ${material}، ${condition}",
      },
      "carpets": {
        fieldOverrides: {
          "material": {
            options: [
              { value: "wool", label: "صوف" }, { value: "silk", label: "حرير" },
              { value: "synthetic", label: "صناعي" }, { value: "cotton", label: "قطن" },
              { value: "mixed", label: "مخلوط" }, { value: "other", label: "أخرى" },
            ],
          },
        },
        extraFields: [
          { id: "carpet_size", label: "المقاس", type: "select", isRequired: false, order: 3.1, options: [
            { value: "1x1.5", label: "1×1.5 متر" }, { value: "1.5x2", label: "1.5×2 متر" },
            { value: "2x3", label: "2×3 متر" }, { value: "2.5x3.5", label: "2.5×3.5 متر" },
            { value: "3x4", label: "3×4 متر" }, { value: "custom", label: "مقاس خاص" },
          ]},
          { id: "origin", label: "المنشأ", type: "select", isRequired: false, order: 3.2, options: [
            { value: "handmade", label: "يدوي" }, { value: "machine", label: "ماكينة" },
            { value: "imported", label: "مستورد" }, { value: "local", label: "محلي" },
          ]},
        ],
        titleTemplate: "سجاد ${material} — ${carpet_size} — ${condition}",
        descriptionTemplate: "سجاد ${material}، ${condition}",
      },
      "decor": {
        fieldOverrides: {
          "type": {
            options: [
              { value: "painting", label: "لوحة" }, { value: "mirror", label: "مرآة" },
              { value: "vase", label: "فازة" }, { value: "statue", label: "تمثال/مجسم" },
              { value: "clock", label: "ساعة حائط" }, { value: "frame", label: "برواز" },
              { value: "artificial_plant", label: "نباتات صناعية" }, { value: "other", label: "أخرى" },
            ],
          },
        },
        titleTemplate: "${type} ديكور — ${condition}",
        descriptionTemplate: "${type} ديكور، ${condition}",
      },
    },
  },
  {
    id: "hobbies",
    name: "الهوايات",
    icon: "🎮",
    slug: "hobbies",
    subcategories: [
      { id: "music", name: "آلات موسيقية", slug: "music" },
      { id: "sports", name: "معدات رياضية", slug: "sports" },
      { id: "gaming", name: "ألعاب فيديو", slug: "gaming" },
      { id: "books", name: "كتب", slug: "books" },
      { id: "cameras", name: "كاميرات", slug: "cameras" },
      { id: "bikes", name: "دراجات", slug: "bikes" },
      { id: "antiques", name: "تحف وأنتيكات", slug: "antiques" },
      { id: "pets", name: "حيوانات أليفة", slug: "pets" },
      { id: "tickets", name: "تذاكر وقسائم", slug: "tickets" },
      { id: "camping", name: "مستلزمات تخييم", slug: "camping" },
      { id: "fishing", name: "معدات صيد", slug: "fishing" },
    ],
    fields: [
      { id: "type", label: "النوع", type: "select", isRequired: true, order: 1, options: [
        { value: "guitar", label: "جيتار" }, { value: "piano", label: "بيانو/أورج" },
        { value: "drums", label: "درامز" }, { value: "violin", label: "كمان" },
        { value: "ps5", label: "بلايستيشن 5" }, { value: "ps4", label: "بلايستيشن 4" },
        { value: "xbox", label: "إكسبوكس" }, { value: "nintendo", label: "نينتيندو سويتش" },
        { value: "treadmill", label: "تريدميل" }, { value: "weights", label: "أوزان/دمبلز" },
        { value: "bicycle", label: "دراجة" }, { value: "camera", label: "كاميرا" },
        { value: "lens", label: "عدسة" }, { value: "books", label: "كتب" },
        { value: "antique", label: "تحفة/أنتيك" }, { value: "pet", label: "حيوان أليف" },
        { value: "aquarium", label: "حوض سمك" }, { value: "other", label: "أخرى" },
      ]},
      { id: "condition", label: "الحالة", type: "select", isRequired: true, order: 2, defaultValue: "good", options: [
        { value: "new", label: "جديد" }, { value: "excellent", label: "مستعمل ممتاز" },
        { value: "good", label: "مستعمل جيد" }, { value: "fair", label: "مستعمل مقبول" },
      ]},
      { id: "brand", label: "الماركة/الوصف", type: "select", isRequired: true, order: 3, hiddenForSubcategories: ["pets", "books", "antiques"], options: [
        { value: "sony", label: "Sony" }, { value: "microsoft", label: "Microsoft" },
        { value: "nintendo", label: "Nintendo" }, { value: "canon", label: "Canon" },
        { value: "nikon", label: "Nikon" }, { value: "yamaha", label: "Yamaha" },
        { value: "fender", label: "Fender" }, { value: "gibson", label: "Gibson" },
        { value: "life_fitness", label: "Life Fitness" }, { value: "local", label: "محلي" },
        { value: "other", label: "أخرى" },
      ]},
      { id: "purchase_year", label: "سنة الشراء", type: "year-picker", isRequired: false, order: 4 },
      { id: "with_accessories", label: "مع ملحقات", type: "toggle", isRequired: false, order: 5 },
    ],
    requiredFields: ["type", "condition", "brand"],
    titleTemplate: "${brand} ${type} — ${condition}",
    descriptionTemplate: "${type} ${brand}، ${condition}",
    subcategoryOverrides: {
      "pets": {
        requiredFields: ["type", "condition"],
        extraFields: [
          { id: "breed", label: "السلالة", type: "text", isRequired: false, order: 3.1, placeholder: "مثال: شيرازي، جولدن ريتريفر" },
          { id: "age", label: "العمر", type: "select", isRequired: false, order: 3.2, options: [
            { value: "baby", label: "صغير (أقل من 3 شهور)" }, { value: "young", label: "شاب (3-12 شهر)" },
            { value: "adult", label: "بالغ (1-5 سنوات)" }, { value: "senior", label: "كبير (5+ سنوات)" },
          ]},
          { id: "pet_gender", label: "الجنس", type: "select", isRequired: false, order: 3.3, options: [
            { value: "male", label: "ذكر" }, { value: "female", label: "أنثى" },
          ]},
          { id: "vaccinated", label: "مُطعّم", type: "toggle", isRequired: false, order: 3.4 },
        ],
        fieldOverrides: {
          "type": {
            options: [
              { value: "cat", label: "قطة" }, { value: "dog", label: "كلب" },
              { value: "bird", label: "طائر" }, { value: "fish", label: "سمك" },
              { value: "hamster", label: "هامستر" }, { value: "rabbit", label: "أرنب" },
              { value: "turtle", label: "سلحفاة" }, { value: "other", label: "أخرى" },
            ],
          },
          "condition": {
            label: "الصحة",
            options: [
              { value: "healthy", label: "بصحة ممتازة" }, { value: "good", label: "بصحة جيدة" },
              { value: "needs_care", label: "يحتاج رعاية" },
            ],
          },
        },
        titleTemplate: "${type} — ${breed} — ${age}",
        descriptionTemplate: "${type}، ${condition}",
      },
      "books": {
        requiredFields: ["type", "condition"],
        extraFields: [
          { id: "author", label: "المؤلف", type: "text", isRequired: false, order: 3.1, placeholder: "اسم المؤلف" },
          { id: "language", label: "اللغة", type: "select", isRequired: false, order: 3.2, options: [
            { value: "arabic", label: "عربي" }, { value: "english", label: "إنجليزي" },
            { value: "french", label: "فرنسي" }, { value: "other", label: "أخرى" },
          ]},
        ],
        fieldOverrides: {
          "type": {
            options: [
              { value: "novel", label: "رواية" }, { value: "religious", label: "ديني" },
              { value: "educational", label: "تعليمي" }, { value: "children", label: "أطفال" },
              { value: "self_help", label: "تنمية بشرية" }, { value: "scientific", label: "علمي" },
              { value: "history", label: "تاريخ" }, { value: "collection", label: "مجموعة كتب" },
              { value: "other", label: "أخرى" },
            ],
          },
        },
        titleTemplate: "${type} — ${author} — ${condition}",
        descriptionTemplate: "كتاب ${type}، ${condition}",
      },
      "gaming": {
        fieldOverrides: {
          "type": {
            options: [
              { value: "ps5", label: "بلايستيشن 5" }, { value: "ps4", label: "بلايستيشن 4" },
              { value: "xbox_series", label: "إكسبوكس Series X/S" }, { value: "xbox_one", label: "إكسبوكس One" },
              { value: "nintendo", label: "نينتيندو سويتش" }, { value: "controller", label: "يد تحكم" },
              { value: "game_disc", label: "أسطوانة لعبة" }, { value: "vr", label: "VR" },
              { value: "gaming_chair", label: "كرسي جيمنج" }, { value: "other", label: "أخرى" },
            ],
          },
          "brand": {
            options: [
              { value: "sony", label: "Sony" }, { value: "microsoft", label: "Microsoft" },
              { value: "nintendo", label: "Nintendo" }, { value: "other", label: "أخرى" },
            ],
          },
        },
        titleTemplate: "${type} — ${brand} — ${condition}",
        descriptionTemplate: "${type} ${brand}، ${condition}",
      },
      "music": {
        fieldOverrides: {
          "type": {
            options: [
              { value: "guitar", label: "جيتار" }, { value: "piano", label: "بيانو" },
              { value: "organ", label: "أورج" }, { value: "drums", label: "درامز" },
              { value: "violin", label: "كمان" }, { value: "oud", label: "عود" },
              { value: "flute", label: "ناي/فلوت" }, { value: "amplifier", label: "أمبليفاير" },
              { value: "microphone", label: "ميكروفون" }, { value: "other", label: "أخرى" },
            ],
          },
          "brand": {
            options: [
              { value: "yamaha", label: "Yamaha" }, { value: "fender", label: "Fender" },
              { value: "gibson", label: "Gibson" }, { value: "roland", label: "Roland" },
              { value: "korg", label: "Korg" }, { value: "ibanez", label: "Ibanez" },
              { value: "local", label: "محلي" }, { value: "other", label: "أخرى" },
            ],
          },
        },
        titleTemplate: "${type} ${brand} — ${condition}",
        descriptionTemplate: "${type} ${brand}، ${condition}",
      },
      "sports": {
        fieldOverrides: {
          "type": {
            options: [
              { value: "treadmill", label: "تريدميل" }, { value: "bike_machine", label: "عجلة رياضية" },
              { value: "weights", label: "أوزان/دمبلز" }, { value: "bench", label: "بنش" },
              { value: "multi_gym", label: "ملتي جيم" }, { value: "yoga_mat", label: "مرتبة يوجا" },
              { value: "boxing", label: "معدات ملاكمة" }, { value: "football", label: "كرة قدم" },
              { value: "tennis", label: "مضرب تنس" }, { value: "other", label: "أخرى" },
            ],
          },
          "brand": {
            options: [
              { value: "life_fitness", label: "Life Fitness" }, { value: "technogym", label: "Technogym" },
              { value: "adidas", label: "Adidas" }, { value: "nike", label: "Nike" },
              { value: "domyos", label: "Domyos" }, { value: "local", label: "محلي" },
              { value: "other", label: "أخرى" },
            ],
          },
        },
        titleTemplate: "${type} ${brand} — ${condition}",
        descriptionTemplate: "${type} ${brand}، ${condition}",
      },
      "cameras": {
        extraFields: [
          { id: "camera_type", label: "نوع الكاميرا", type: "select", isRequired: false, order: 1.1, options: [
            { value: "dslr", label: "DSLR" }, { value: "mirrorless", label: "Mirrorless" },
            { value: "compact", label: "كومباكت" }, { value: "action", label: "أكشن كاميرا" },
            { value: "film", label: "فيلم" }, { value: "other", label: "أخرى" },
          ]},
          { id: "megapixels", label: "الميجابكسل", type: "select", isRequired: false, order: 3.1, options: [
            { value: "12mp", label: "12 MP" }, { value: "20mp", label: "20 MP" },
            { value: "24mp", label: "24 MP" }, { value: "30mp", label: "30 MP" },
            { value: "45mp", label: "45 MP" }, { value: "50mp+", label: "50+ MP" },
          ]},
        ],
        fieldOverrides: {
          "type": {
            options: [
              { value: "camera_body", label: "بودي كاميرا" }, { value: "camera_kit", label: "كاميرا + عدسة" },
              { value: "lens", label: "عدسة" }, { value: "flash", label: "فلاش" },
              { value: "tripod", label: "ترايبود" }, { value: "gimbal", label: "جيمبال" },
              { value: "drone", label: "درون" }, { value: "other", label: "أخرى" },
            ],
          },
          "brand": {
            options: [
              { value: "canon", label: "Canon" }, { value: "nikon", label: "Nikon" },
              { value: "sony", label: "Sony" }, { value: "fujifilm", label: "Fujifilm" },
              { value: "panasonic", label: "Panasonic" }, { value: "gopro", label: "GoPro" },
              { value: "dji", label: "DJI" }, { value: "other", label: "أخرى" },
            ],
          },
        },
        titleTemplate: "${type} ${brand} — ${condition}",
        descriptionTemplate: "${type} ${brand}، ${condition}",
      },
      "bikes": {
        extraFields: [
          { id: "wheel_size", label: "مقاس العجل", type: "select", isRequired: false, order: 3.1, options: [
            { value: "12", label: "12 بوصة" }, { value: "16", label: "16 بوصة" },
            { value: "20", label: "20 بوصة" }, { value: "24", label: "24 بوصة" },
            { value: "26", label: "26 بوصة" }, { value: "27.5", label: "27.5 بوصة" },
            { value: "29", label: "29 بوصة" },
          ]},
        ],
        fieldOverrides: {
          "type": {
            options: [
              { value: "mountain", label: "جبلي" }, { value: "road", label: "طريق/سباق" },
              { value: "hybrid", label: "هايبرد" }, { value: "bmx", label: "BMX" },
              { value: "kids", label: "أطفال" }, { value: "electric", label: "كهربائي" },
              { value: "other", label: "أخرى" },
            ],
          },
          "brand": {
            options: [
              { value: "trinx", label: "ترينكس" }, { value: "giant", label: "Giant" },
              { value: "trek", label: "Trek" }, { value: "specialized", label: "Specialized" },
              { value: "local", label: "محلي" }, { value: "other", label: "أخرى" },
            ],
          },
        },
        titleTemplate: "دراجة ${type} ${brand} — ${condition}",
        descriptionTemplate: "دراجة ${type} ${brand}، ${condition}",
      },
      "antiques": {
        requiredFields: ["type", "condition"],
        extraFields: [
          { id: "era", label: "العصر/الفترة", type: "select", isRequired: false, order: 3.1, options: [
            { value: "pharaonic", label: "فرعوني" }, { value: "islamic", label: "إسلامي" },
            { value: "ottoman", label: "عثماني" }, { value: "modern", label: "حديث (50+ سنة)" },
            { value: "vintage", label: "فينتاج (20+ سنة)" }, { value: "unknown", label: "غير محدد" },
          ]},
          { id: "antique_origin", label: "المنشأ", type: "text", isRequired: false, order: 3.2, placeholder: "بلد المنشأ" },
        ],
        fieldOverrides: {
          "type": {
            options: [
              { value: "painting", label: "لوحة" }, { value: "coin", label: "عملة" },
              { value: "stamp", label: "طابع" }, { value: "statue", label: "تمثال" },
              { value: "furniture", label: "أثاث أنتيك" }, { value: "pottery", label: "فخار" },
              { value: "jewelry", label: "مجوهرات أنتيك" }, { value: "clock", label: "ساعة أنتيك" },
              { value: "other", label: "أخرى" },
            ],
          },
        },
        titleTemplate: "${type} أنتيك — ${era} — ${condition}",
        descriptionTemplate: "${type} أنتيك، ${condition}",
      },
    },
  },
  {
    id: "tools",
    name: "العدد والأدوات",
    icon: "🔧",
    slug: "tools",
    subcategories: [
      { id: "hand-tools", name: "عدد يدوية", slug: "hand-tools" },
      { id: "power-tools", name: "عدد كهربائية", slug: "power-tools" },
      { id: "workshop", name: "معدات ورش", slug: "workshop" },
      { id: "agricultural", name: "معدات زراعية", slug: "agricultural" },
      { id: "restaurant-equipment", name: "معدات مطاعم", slug: "restaurant-equipment" },
    ],
    fields: [
      { id: "type", label: "النوع", type: "select", isRequired: true, order: 1, options: [
        { value: "drill", label: "شنيور/دريل" }, { value: "saw", label: "منشار" },
        { value: "grinder", label: "صاروخ/جلاخة" }, { value: "welder", label: "ماكينة لحام" },
        { value: "compressor", label: "كمبروسر" }, { value: "generator", label: "مولد كهرباء" },
        { value: "hand_tools", label: "عدة يدوية" }, { value: "measuring", label: "أدوات قياس" },
        { value: "garden", label: "عدة حدائق" }, { value: "kitchen_equip", label: "معدات مطبخ/مطعم" },
        { value: "other", label: "أخرى" },
      ]},
      { id: "condition", label: "الحالة", type: "select", isRequired: true, order: 2, defaultValue: "working", options: [
        { value: "new", label: "جديد" }, { value: "working", label: "مستعمل يعمل" },
        { value: "needs_repair", label: "يحتاج صيانة" },
      ]},
      { id: "brand", label: "الماركة", type: "select", isRequired: true, order: 3, options: [
        { value: "bosch", label: "بوش" }, { value: "makita", label: "ماكيتا" },
        { value: "dewalt", label: "ديوالت" }, { value: "stanley", label: "ستانلي" },
        { value: "black_decker", label: "بلاك أند ديكر" }, { value: "total", label: "توتال" },
        { value: "ingco", label: "إنجكو" }, { value: "dongcheng", label: "دونج تشينج" },
        { value: "local", label: "محلي" }, { value: "other", label: "أخرى" },
      ]},
      { id: "quantity", label: "الكمية", type: "number", isRequired: false, order: 4 },
      { id: "power", label: "مصدر الطاقة", type: "select", isRequired: false, order: 5, defaultValue: "electric", hiddenForSubcategories: ["hand-tools"], options: [
        { value: "electric", label: "كهرباء" }, { value: "battery", label: "بطارية" },
        { value: "manual", label: "يدوي" }, { value: "petrol", label: "بنزين" },
      ]},
    ],
    requiredFields: ["type", "condition", "brand"],
    titleTemplate: "${type} ${brand} — ${condition}",
    descriptionTemplate: "${type} ${brand}، ${condition}",
    subcategoryOverrides: {
      "hand-tools": {
        fieldOverrides: {
          "type": {
            options: [
              { value: "wrench", label: "مفتاح" }, { value: "screwdriver", label: "مفك" },
              { value: "pliers", label: "زرادية" }, { value: "hammer", label: "شاكوش" },
              { value: "saw", label: "منشار يدوي" }, { value: "toolkit", label: "طقم عدة" },
              { value: "measuring", label: "أدوات قياس" }, { value: "other", label: "أخرى" },
            ],
          },
        },
        titleTemplate: "${type} ${brand} — ${condition}",
        descriptionTemplate: "${type} ${brand}، ${condition}",
      },
      "power-tools": {
        fieldOverrides: {
          "type": {
            options: [
              { value: "drill", label: "شنيور/دريل" }, { value: "angle_grinder", label: "صاروخ/جلاخة" },
              { value: "circular_saw", label: "منشار دائري" }, { value: "jigsaw", label: "منشار أركت" },
              { value: "sander", label: "صنفرة كهربائية" }, { value: "router", label: "فريزة/راوتر" },
              { value: "heat_gun", label: "مسدس حراري" }, { value: "other", label: "أخرى" },
            ],
          },
        },
        titleTemplate: "${type} ${brand} — ${power} — ${condition}",
        descriptionTemplate: "${type} ${brand}، ${power}، ${condition}",
      },
      "workshop": {
        fieldOverrides: {
          "type": {
            options: [
              { value: "welder", label: "ماكينة لحام" }, { value: "compressor", label: "كمبروسر" },
              { value: "lathe", label: "مخرطة" }, { value: "press", label: "مكبس" },
              { value: "generator", label: "مولد كهرباء" }, { value: "cnc", label: "CNC" },
              { value: "other", label: "أخرى" },
            ],
          },
        },
        titleTemplate: "${type} ${brand} — ${condition}",
        descriptionTemplate: "${type} ${brand}، ${condition}",
      },
      "agricultural": {
        fieldOverrides: {
          "type": {
            options: [
              { value: "pump", label: "موتور ري" }, { value: "sprayer", label: "رشاشة" },
              { value: "mower", label: "ماكينة قص" }, { value: "tractor_parts", label: "قطع جرار" },
              { value: "irrigation", label: "معدات ري" }, { value: "garden_tools", label: "عدة حدائق" },
              { value: "other", label: "أخرى" },
            ],
          },
        },
        titleTemplate: "${type} زراعي ${brand} — ${condition}",
        descriptionTemplate: "${type} زراعي ${brand}، ${condition}",
      },
      "restaurant-equipment": {
        fieldOverrides: {
          "type": {
            options: [
              { value: "oven", label: "فرن" }, { value: "deep_fryer", label: "قلاية" },
              { value: "display_fridge", label: "ثلاجة عرض" }, { value: "mixer", label: "عجان" },
              { value: "meat_grinder", label: "مفرمة" }, { value: "shawarma", label: "ماكينة شاورما" },
              { value: "coffee_machine", label: "ماكينة قهوة" }, { value: "pos", label: "كاشير/POS" },
              { value: "tables_chairs", label: "طاولات وكراسي" }, { value: "other", label: "أخرى" },
            ],
          },
          "brand": {
            options: [
              { value: "rational", label: "Rational" }, { value: "hobart", label: "Hobart" },
              { value: "berto", label: "Berto's" }, { value: "local", label: "تصنيع محلي" },
              { value: "other", label: "أخرى" },
            ],
          },
        },
        titleTemplate: "${type} مطاعم ${brand} — ${condition}",
        descriptionTemplate: "${type} معدات مطاعم ${brand}، ${condition}",
      },
    },
  },
  {
    id: "services",
    name: "الخدمات",
    icon: "🛠️",
    slug: "services",
    subcategories: [
      { id: "plumbing", name: "سباكة", slug: "plumbing" },
      { id: "electrical", name: "كهرباء", slug: "electrical" },
      { id: "painting", name: "نقاشة", slug: "painting" },
      { id: "carpentry", name: "نجارة", slug: "carpentry" },
      { id: "device-repair", name: "صيانة أجهزة", slug: "device-repair" },
      { id: "moving", name: "نقل أثاث", slug: "moving" },
      { id: "cleaning", name: "تنظيف", slug: "cleaning" },
      { id: "tech", name: "خدمات تقنية", slug: "tech" },
      { id: "tutoring", name: "دروس خصوصية", slug: "tutoring" },
      { id: "services-other", name: "خدمات أخرى", slug: "services-other" },
      { id: "car-services", name: "خدمات سيارات", slug: "car-services" },
      { id: "events", name: "تنظيم فعاليات وأفراح", slug: "events" },
      { id: "beauty-services", name: "خدمات تجميل", slug: "beauty-services" },
      { id: "photography", name: "تصوير فوتوغرافي", slug: "photography" },
    ],
    fields: [
      { id: "service_type", label: "نوع الخدمة", type: "select", isRequired: true, order: 1, options: [
        { value: "plumbing", label: "سباكة" }, { value: "electrical", label: "كهرباء" },
        { value: "painting", label: "نقاشة" }, { value: "carpentry", label: "نجارة" },
        { value: "device_repair", label: "صيانة أجهزة" }, { value: "moving", label: "نقل أثاث" },
        { value: "cleaning", label: "تنظيف" }, { value: "tech", label: "خدمات تقنية" },
        { value: "tutoring", label: "دروس خصوصية" }, { value: "other", label: "خدمات أخرى" },
      ]},
      { id: "pricing", label: "التسعير", type: "select", isRequired: true, order: 2, defaultValue: "negotiable", options: [
        { value: "hourly", label: "بالساعة" }, { value: "project", label: "بالمشروع" },
        { value: "negotiable", label: "بالاتفاق" }, { value: "fixed", label: "سعر ثابت" },
      ]},
      { id: "experience", label: "الخبرة", type: "select", isRequired: true, order: 3, defaultValue: "3_5", options: [
        { value: "less_1", label: "أقل من سنة" }, { value: "1_3", label: "1-3 سنوات" },
        { value: "3_5", label: "3-5 سنوات" }, { value: "5_plus", label: "أكثر من 5 سنوات" },
      ]},
      { id: "service_area", label: "نطاق الخدمة", type: "multi-select", isRequired: false, order: 4, options: [
        { value: "cairo", label: "القاهرة" }, { value: "giza", label: "الجيزة" },
        { value: "alexandria", label: "الإسكندرية" }, { value: "dakahlia", label: "الدقهلية" },
        { value: "sharqia", label: "الشرقية" }, { value: "monufia", label: "المنوفية" },
        { value: "qalyubia", label: "القليوبية" }, { value: "beheira", label: "البحيرة" },
        { value: "gharbia", label: "الغربية" }, { value: "kafr_elsheikh", label: "كفر الشيخ" },
      ]},
      { id: "working_days", label: "أيام العمل", type: "multi-select", isRequired: false, order: 5, options: [
        { value: "sat", label: "السبت" }, { value: "sun", label: "الأحد" },
        { value: "mon", label: "الاثنين" }, { value: "tue", label: "الثلاثاء" },
        { value: "wed", label: "الأربعاء" }, { value: "thu", label: "الخميس" },
        { value: "fri", label: "الجمعة" },
      ]},
      { id: "working_hours", label: "مواعيد العمل", type: "text", isRequired: false, order: 6 },
    ],
    requiredFields: ["service_type", "pricing", "experience"],
    titleTemplate: "${service_type} — خبرة ${experience} — ${pricing}",
    descriptionTemplate: "${service_type}، خبرة ${experience}، ${pricing}",
    subcategoryOverrides: {
      "tutoring": {
        extraFields: [
          { id: "subject", label: "المادة", type: "select", isRequired: true, order: 1.1, options: [
            { value: "arabic", label: "لغة عربية" }, { value: "english", label: "لغة إنجليزية" },
            { value: "math", label: "رياضيات" }, { value: "science", label: "علوم" },
            { value: "physics", label: "فيزياء" }, { value: "chemistry", label: "كيمياء" },
            { value: "french", label: "لغة فرنسية" }, { value: "german", label: "لغة ألمانية" },
            { value: "computer", label: "حاسب آلي" }, { value: "quran", label: "قرآن كريم" },
            { value: "other", label: "أخرى" },
          ]},
          { id: "education_level", label: "المرحلة", type: "select", isRequired: false, order: 1.2, options: [
            { value: "primary", label: "ابتدائي" }, { value: "preparatory", label: "إعدادي" },
            { value: "secondary", label: "ثانوي" }, { value: "university", label: "جامعي" },
            { value: "all", label: "كل المراحل" },
          ]},
          { id: "teaching_method", label: "طريقة التدريس", type: "select", isRequired: false, order: 1.3, options: [
            { value: "home", label: "في البيت" }, { value: "online", label: "أونلاين" },
            { value: "center", label: "في سنتر" }, { value: "group", label: "مجموعات" },
          ]},
        ],
        titleTemplate: "مدرس ${subject} — ${education_level} — خبرة ${experience}",
        descriptionTemplate: "دروس خصوصية ${subject}، ${education_level}، خبرة ${experience}، ${pricing}",
      },
      "tech": {
        extraFields: [
          { id: "tech_specialty", label: "التخصص", type: "select", isRequired: false, order: 1.1, options: [
            { value: "web", label: "تصميم مواقع" }, { value: "mobile", label: "تطبيقات موبايل" },
            { value: "networking", label: "شبكات" }, { value: "cctv", label: "كاميرات مراقبة" },
            { value: "data_recovery", label: "استعادة بيانات" }, { value: "graphic", label: "جرافيك ديزاين" },
            { value: "social_media", label: "سوشيال ميديا" }, { value: "other", label: "أخرى" },
          ]},
        ],
        titleTemplate: "خدمات تقنية — ${tech_specialty} — خبرة ${experience}",
        descriptionTemplate: "خدمات تقنية ${tech_specialty}، خبرة ${experience}، ${pricing}",
      },
      "moving": {
        extraFields: [
          { id: "vehicle_type", label: "نوع السيارة", type: "select", isRequired: false, order: 1.1, options: [
            { value: "pickup", label: "نص نقل" }, { value: "truck", label: "سيارة نقل" },
            { value: "large_truck", label: "سيارة نقل كبيرة" }, { value: "container", label: "كونتينر" },
          ]},
          { id: "includes_packing", label: "يشمل تغليف", type: "toggle", isRequired: false, order: 1.2 },
          { id: "includes_assembly", label: "يشمل فك وتركيب", type: "toggle", isRequired: false, order: 1.3 },
        ],
        titleTemplate: "نقل أثاث — ${vehicle_type} — خبرة ${experience}",
        descriptionTemplate: "خدمة نقل أثاث، خبرة ${experience}، ${pricing}",
      },
      "device-repair": {
        extraFields: [
          { id: "devices_repaired", label: "الأجهزة", type: "multi-select", isRequired: false, order: 1.1, options: [
            { value: "mobile", label: "موبايلات" }, { value: "laptop", label: "لابتوب" },
            { value: "desktop", label: "كمبيوتر" }, { value: "tablet", label: "تابلت" },
            { value: "tv", label: "تليفزيون" }, { value: "washer", label: "غسالات" },
            { value: "fridge", label: "ثلاجات" }, { value: "ac", label: "مكيفات" },
            { value: "other", label: "أخرى" },
          ]},
        ],
        titleTemplate: "صيانة أجهزة — خبرة ${experience} — ${pricing}",
        descriptionTemplate: "صيانة أجهزة، خبرة ${experience}، ${pricing}",
      },
      "cleaning": {
        extraFields: [
          { id: "cleaning_type", label: "نوع التنظيف", type: "select", isRequired: false, order: 1.1, options: [
            { value: "regular", label: "تنظيف دوري" }, { value: "deep", label: "تنظيف عميق" },
            { value: "post_construction", label: "بعد التشطيب" }, { value: "carpet", label: "تنظيف سجاد" },
            { value: "facade", label: "تنظيف واجهات" }, { value: "other", label: "أخرى" },
          ]},
        ],
        titleTemplate: "تنظيف — ${cleaning_type} — خبرة ${experience}",
        descriptionTemplate: "خدمة تنظيف ${cleaning_type}، خبرة ${experience}، ${pricing}",
      },
    },
  },
  {
    id: "computers",
    name: "الكمبيوتر واللابتوب",
    icon: "💻",
    slug: "computers",
    subcategories: [
      { id: "laptops", name: "لابتوبات", slug: "laptops" },
      { id: "desktops", name: "كمبيوتر مكتبي", slug: "desktops" },
      { id: "monitors", name: "شاشات", slug: "monitors" },
      { id: "printers", name: "طابعات وماسحات", slug: "printers" },
      { id: "pc-parts", name: "قطع غيار كمبيوتر", slug: "pc-parts" },
      { id: "networking", name: "معدات شبكات", slug: "networking" },
      { id: "storage-devices", name: "أجهزة تخزين", slug: "storage-devices" },
      { id: "pc-accessories", name: "إكسسوارات كمبيوتر", slug: "pc-accessories" },
    ],
    fields: [
      { id: "brand", label: "الماركة", type: "select", isRequired: true, order: 1, options: [
        { value: "dell", label: "ديل" }, { value: "hp", label: "HP" },
        { value: "lenovo", label: "لينوفو" }, { value: "apple", label: "أبل" },
        { value: "asus", label: "أسوس" }, { value: "acer", label: "إيسر" },
        { value: "msi", label: "MSI" }, { value: "samsung", label: "سامسونج" },
        { value: "toshiba", label: "توشيبا" }, { value: "other", label: "أخرى" },
      ]},
      { id: "condition", label: "الحالة", type: "select", isRequired: true, order: 2, defaultValue: "good", options: [
        { value: "new_sealed", label: "جديد متبرشم" }, { value: "like_new", label: "مستعمل زيرو" },
        { value: "good", label: "مستعمل كويس" }, { value: "acceptable", label: "مستعمل مقبول" },
        { value: "needs_repair", label: "يحتاج صيانة" },
      ]},
      { id: "processor", label: "المعالج", type: "select", isRequired: true, order: 3, hiddenForSubcategories: ["printers", "networking", "storage-devices", "pc-accessories"], options: [
        { value: "i3", label: "Intel Core i3" }, { value: "i5", label: "Intel Core i5" },
        { value: "i7", label: "Intel Core i7" }, { value: "i9", label: "Intel Core i9" },
        { value: "ryzen3", label: "AMD Ryzen 3" }, { value: "ryzen5", label: "AMD Ryzen 5" },
        { value: "ryzen7", label: "AMD Ryzen 7" }, { value: "m1", label: "Apple M1" },
        { value: "m2", label: "Apple M2" }, { value: "m3", label: "Apple M3" },
        { value: "other", label: "أخرى" },
      ]},
      { id: "ram", label: "الرام", type: "select", isRequired: false, order: 4, hiddenForSubcategories: ["printers", "networking", "storage-devices", "pc-accessories"], options: [
        { value: "4", label: "4GB" }, { value: "8", label: "8GB" },
        { value: "16", label: "16GB" }, { value: "32", label: "32GB" },
        { value: "64", label: "64GB" },
      ]},
      { id: "storage", label: "التخزين", type: "select", isRequired: false, order: 5, hiddenForSubcategories: ["printers", "networking", "pc-accessories"], options: [
        { value: "128ssd", label: "128GB SSD" }, { value: "256ssd", label: "256GB SSD" },
        { value: "512ssd", label: "512GB SSD" }, { value: "1tb_ssd", label: "1TB SSD" },
        { value: "500hdd", label: "500GB HDD" }, { value: "1tb_hdd", label: "1TB HDD" },
        { value: "2tb_hdd", label: "2TB HDD" },
      ]},
      { id: "screen_size", label: "حجم الشاشة", type: "select", isRequired: false, order: 6, hiddenForSubcategories: ["printers", "networking", "storage-devices", "pc-accessories", "pc-parts"], options: [
        { value: "13", label: '13"' }, { value: "14", label: '14"' },
        { value: "15", label: '15.6"' }, { value: "17", label: '17"' },
        { value: "24", label: '24"' }, { value: "27", label: '27"' },
        { value: "32", label: '32"' },
      ]},
    ],
    requiredFields: ["brand", "condition", "processor"],
    titleTemplate: "${brand} — ${processor} — ${condition}",
    descriptionTemplate: "${brand}، معالج ${processor}، ${ram} رام، ${storage}، ${condition}",
  },
  {
    id: "kids_babies",
    name: "مستلزمات الأطفال",
    icon: "👶",
    slug: "kids-babies",
    subcategories: [
      { id: "kids-clothes", name: "ملابس أطفال ورضع", slug: "kids-clothes" },
      { id: "strollers", name: "عربيات أطفال", slug: "strollers" },
      { id: "cribs", name: "سراير أطفال", slug: "cribs" },
      { id: "car-seats", name: "كراسي سيارة", slug: "car-seats" },
      { id: "feeding", name: "مستلزمات رضاعة وتغذية", slug: "feeding" },
      { id: "kids-toys", name: "ألعاب أطفال", slug: "kids-toys" },
      { id: "maternity", name: "مستلزمات حمل وأمومة", slug: "maternity" },
      { id: "school-supplies", name: "مستلزمات مدرسية", slug: "school-supplies" },
      { id: "kids-other", name: "أخرى", slug: "kids-other" },
    ],
    fields: [
      { id: "type", label: "النوع", type: "select", isRequired: true, order: 1, options: [
        { value: "clothes", label: "ملابس" }, { value: "stroller", label: "عربية أطفال" },
        { value: "crib", label: "سرير" }, { value: "car_seat", label: "كرسي سيارة" },
        { value: "feeding", label: "مستلزمات رضاعة" }, { value: "toy", label: "لعبة" },
        { value: "maternity", label: "مستلزمات أمومة" }, { value: "school", label: "مستلزمات مدرسية" },
        { value: "other", label: "أخرى" },
      ]},
      { id: "condition", label: "الحالة", type: "select", isRequired: true, order: 2, defaultValue: "good", options: [
        { value: "new_tagged", label: "جديد بالتاج" }, { value: "new_untagged", label: "جديد بدون تاج" },
        { value: "excellent", label: "مستعمل ممتاز" }, { value: "good", label: "مستعمل جيد" },
      ]},
      { id: "age_range", label: "الفئة العمرية", type: "select", isRequired: true, order: 3, options: [
        { value: "0_6m", label: "0-6 شهور" }, { value: "6_12m", label: "6-12 شهر" },
        { value: "1_2y", label: "1-2 سنة" }, { value: "2_4y", label: "2-4 سنوات" },
        { value: "4_8y", label: "4-8 سنوات" }, { value: "8_12y", label: "8-12 سنة" },
        { value: "12plus", label: "12+ سنة" }, { value: "all", label: "كل الأعمار" },
      ]},
      { id: "brand", label: "الماركة", type: "text", isRequired: false, order: 4, placeholder: "مثال: Chicco, Graco" },
      { id: "gender", label: "ولادي/بناتي", type: "select", isRequired: false, order: 5, options: [
        { value: "boy", label: "ولادي" }, { value: "girl", label: "بناتي" }, { value: "unisex", label: "يونيسكس" },
      ]},
    ],
    requiredFields: ["type", "condition", "age_range"],
    titleTemplate: "${type} أطفال — ${condition} — ${age_range}",
    descriptionTemplate: "${type} أطفال، ${condition}، مناسب لعمر ${age_range}",
  },
  {
    id: "electronics",
    name: "الإلكترونيات",
    icon: "📺",
    slug: "electronics",
    subcategories: [
      { id: "tvs", name: "تليفزيونات وشاشات", slug: "tvs" },
      { id: "speakers", name: "سماعات وأنظمة صوت", slug: "speakers" },
      { id: "security-cameras", name: "كاميرات مراقبة", slug: "security-cameras" },
      { id: "smart-home", name: "أجهزة ذكية", slug: "smart-home" },
      { id: "projectors", name: "بروجكتور", slug: "projectors" },
      { id: "gaming-consoles", name: "أجهزة ألعاب", slug: "gaming-consoles" },
      { id: "electronics-other", name: "إلكترونيات أخرى", slug: "electronics-other" },
    ],
    fields: [
      { id: "type", label: "النوع", type: "select", isRequired: true, order: 1, options: [
        { value: "tv", label: "تليفزيون" }, { value: "speaker", label: "سماعة/نظام صوت" },
        { value: "camera", label: "كاميرا مراقبة" }, { value: "smart_device", label: "جهاز ذكي" },
        { value: "projector", label: "بروجكتور" }, { value: "gaming", label: "جهاز ألعاب" },
        { value: "other", label: "أخرى" },
      ]},
      { id: "brand", label: "الماركة", type: "select", isRequired: true, order: 2, options: [
        { value: "samsung", label: "سامسونج" }, { value: "lg", label: "إل جي" },
        { value: "sony", label: "سوني" }, { value: "toshiba", label: "توشيبا" },
        { value: "sharp", label: "شارب" }, { value: "jbl", label: "JBL" },
        { value: "bose", label: "بوز" }, { value: "xiaomi", label: "شاومي" },
        { value: "other", label: "أخرى" },
      ]},
      { id: "condition", label: "الحالة", type: "select", isRequired: true, order: 3, defaultValue: "good", options: [
        { value: "new_sealed", label: "جديد متبرشم" }, { value: "like_new", label: "مستعمل زيرو" },
        { value: "good", label: "مستعمل كويس" }, { value: "needs_repair", label: "يحتاج صيانة" },
      ]},
      { id: "purchase_year", label: "سنة الشراء", type: "year-picker", isRequired: false, order: 4 },
      { id: "warranty", label: "الضمان", type: "toggle", isRequired: false, order: 5 },
    ],
    requiredFields: ["type", "brand", "condition"],
    titleTemplate: "${type} ${brand} — ${condition}",
    descriptionTemplate: "${type} ${brand}، ${condition}",
  },
  {
    id: "beauty",
    name: "الجمال والصحة",
    icon: "💄",
    slug: "beauty",
    subcategories: [
      { id: "makeup", name: "مستحضرات تجميل", slug: "makeup" },
      { id: "skincare", name: "عناية بالبشرة", slug: "skincare" },
      { id: "haircare", name: "عناية بالشعر", slug: "haircare" },
      { id: "beauty-tools", name: "أدوات تجميل", slug: "beauty-tools" },
      { id: "supplements", name: "مكملات غذائية", slug: "supplements" },
      { id: "medical-devices", name: "أجهزة صحية", slug: "medical-devices" },
      { id: "beauty-other", name: "أخرى", slug: "beauty-other" },
    ],
    fields: [
      { id: "type", label: "النوع", type: "select", isRequired: true, order: 1, options: [
        { value: "makeup", label: "ميكب" }, { value: "skincare", label: "عناية بالبشرة" },
        { value: "haircare", label: "عناية بالشعر" }, { value: "tools", label: "أدوات تجميل" },
        { value: "supplement", label: "مكمل غذائي" }, { value: "medical", label: "جهاز صحي" },
        { value: "other", label: "أخرى" },
      ]},
      { id: "brand", label: "الماركة", type: "text", isRequired: true, order: 2, placeholder: "مثال: MAC, L'Oréal" },
      { id: "condition", label: "الحالة", type: "select", isRequired: true, order: 3, defaultValue: "new_sealed", options: [
        { value: "new_sealed", label: "جديد متبرشم" }, { value: "new_opened", label: "جديد مفتوح" },
        { value: "lightly_used", label: "مستعمل خفيف" },
      ]},
      { id: "expiry", label: "صلاحية المنتج", type: "select", isRequired: false, order: 4, options: [
        { value: "valid", label: "ساري الصلاحية" }, { value: "near_expiry", label: "قرب انتهاء الصلاحية" },
      ]},
    ],
    requiredFields: ["type", "brand", "condition"],
    titleTemplate: "${type} ${brand} — ${condition}",
    descriptionTemplate: "${type} من ${brand}، ${condition}",
  },
];

export function getCategoryBySlug(slug: string): CategoryConfig | undefined {
  return categoriesConfig.find((c) => c.slug === slug);
}

export function getCategoryById(id: string): CategoryConfig | undefined {
  return categoriesConfig.find((c) => c.id === id);
}

/**
 * Get the effective (resolved) fields for a category + subcategory.
 * Merges base fields with subcategory fieldOverrides and adds extraFields.
 * This ensures field values are resolved to their proper Arabic labels.
 */
export function getEffectiveFields(
  config: CategoryConfig,
  subcategoryId?: string | null,
): CategoryField[] {
  const override = subcategoryId ? config.subcategoryOverrides?.[subcategoryId] : undefined;

  // Start with base fields, filtering out hidden ones
  let fields = config.fields.filter(
    (f) => !subcategoryId || !f.hiddenForSubcategories?.includes(subcategoryId),
  );

  // Apply field overrides (e.g., different options for watches vs bags)
  if (override?.fieldOverrides) {
    fields = fields.map((field) => {
      const overrideData = override.fieldOverrides?.[field.id];
      if (overrideData) {
        return { ...field, ...overrideData };
      }
      return field;
    });
  }

  // Add extra fields from subcategory
  if (override?.extraFields) {
    fields = [...fields, ...override.extraFields];
  }

  // Sort by order
  return fields.sort((a, b) => a.order - b.order);
}
