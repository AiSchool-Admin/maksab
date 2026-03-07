# نظام جمع بيانات OLX — مكسب
# OLX Data Collection System

---

## نظرة عامة

نظام متكامل لجمع بيانات الإعلانات والبائعين الحقيقية من OLX Egypt واستيرادها في منصة مكسب.

### المكونات:

| المكون | الوصف |
|--------|-------|
| `collector.ts` | المجمّع الرئيسي — يجلب الإعلانات من OLX API |
| `transformer.ts` | محوّل البيانات — OLX → صيغة مكسب |
| `importer.ts` | المستورد — يدخل البيانات في قاعدة بيانات مكسب |
| `category-mapping.ts` | خريطة ربط الأقسام والعلامات التجارية |
| `types.ts` | تعريفات TypeScript |

---

## الاستخدام السريع

### 1. جمع البيانات من OLX

```bash
# جمع سيارات وموبايلات (3 صفحات لكل قسم)
npx tsx scripts/acquisition/olx-collector/collector.ts \
  --categories cars-for-sale,mobile-phones \
  --max-pages 3

# جمع كل الأقسام المدعومة
npx tsx scripts/acquisition/olx-collector/collector.ts --all --max-pages 2

# جمع من محافظة معينة
npx tsx scripts/acquisition/olx-collector/collector.ts \
  --categories apartments-duplex-for-sale \
  --governorate cairo \
  --max-pages 5

# تحديد مجلد الإخراج والدفعة
npx tsx scripts/acquisition/olx-collector/collector.ts \
  --categories cars-for-sale \
  --output ./data/march-collection \
  --batch cars_march_2026
```

### 2. فحص البيانات (Dry Run)

```bash
npx tsx scripts/acquisition/olx-collector/importer.ts \
  --dir ./data/olx-collection/batch_xxx \
  --dry-run
```

### 3. استيراد في قاعدة البيانات

```bash
# استيراد إعلانات وبائعين
NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx \
npx tsx scripts/acquisition/olx-collector/importer.ts \
  --dir ./data/olx-collection/batch_xxx

# إعلانات فقط
npx tsx scripts/acquisition/olx-collector/importer.ts \
  --dir ./data/olx-collection/batch_xxx \
  --ads-only

# بائعين فقط
npx tsx scripts/acquisition/olx-collector/importer.ts \
  --dir ./data/olx-collection/batch_xxx \
  --sellers-only
```

---

## الأقسام المدعومة

| القسم | Slug | مكسب Category |
|-------|------|---------------|
| سيارات للبيع | `cars-for-sale` | `cars` |
| موتوسيكلات | `motorcycles-accessories` | `cars` |
| قطع غيار | `spare-parts` | `cars` |
| شقق للبيع | `apartments-duplex-for-sale` | `real_estate` |
| شقق للإيجار | `apartments-duplex-for-rent` | `real_estate` |
| فيلات | `villas-for-sale` | `real_estate` |
| محلات | `commercial-for-sale` | `real_estate` |
| موبايلات | `mobile-phones` | `phones` |
| تابلت | `tablets` | `phones` |
| إكسسوارات موبايل | `mobile-phone-accessories` | `phones` |
| ملابس رجالي | `men-clothing` | `fashion` |
| ملابس حريمي | `women-clothing` | `fashion` |
| ملابس أطفال | `kids-clothing` | `fashion` |
| أجهزة منزلية | `home-appliances` | `home_appliances` |
| أثاث وديكور | `furniture-home-decor` | `furniture` |
| رياضة | `sports-fitness` | `hobbies` |
| ألعاب فيديو | `video-games-consoles` | `hobbies` |
| كتب | `books` | `hobbies` |
| حيوانات أليفة | `animals-pets` | `hobbies` |

---

## الملفات المُصدّرة

بعد عملية الجمع، يتم إنشاء الملفات التالية:

```
data/olx-collection/batch_xxx/
├── olx-raw-listings.json    # البيانات الخام من OLX
├── maksab-ads.json          # الإعلانات المحوّلة لصيغة مكسب
├── sellers.json             # بيانات البائعين
├── sellers.csv              # البائعين بصيغة CSV
├── ads-summary.csv          # ملخص الإعلانات CSV
├── collection-stats.json    # إحصائيات الجمع
└── import-report.json       # تقرير الاستيراد (بعد الاستيراد)
```

---

## لوحة التحكم

بعد الاستيراد، تظهر البيانات في:
- **Admin → بيانات OLX** (`/admin/imported-ads`)
- مع إمكانية الموافقة/الرفض/النشر لكل إعلان

---

## ملاحظات مهمة

1. **معدل الطلبات**: التأخير الافتراضي 2.5 ثانية بين الطلبات
2. **حد الصفحات**: ابدأ بعدد قليل (3-5) وزوّد تدريجياً
3. **التكرارات**: النظام يتحقق من التكرارات تلقائياً عند الاستيراد
4. **البيانات العامة فقط**: يتم جمع البيانات الظاهرة على الموقع فقط
5. **جدول `imported_ads`**: منفصل عن جدول `ads` الرئيسي لتجنب تلويث المحتوى
