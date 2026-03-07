# أدوات الاستحواذ على العملاء — مكسب
# Customer Acquisition Tools

---

## 1. إضافة المتصفح — اكتشاف البائعين (OLX Extension)

### التثبيت

1. افتح Chrome → `chrome://extensions/`
2. فعّل "وضع المطور" (Developer mode) أعلى يمين
3. اضغط "تحميل إضافة غير مُعبأة" (Load unpacked)
4. اختار مجلد `scripts/acquisition/olx-extension/`
5. الإضافة هتظهر في شريط الإضافات 💚

### الاستخدام

1. **افتح صفحة بائع على OLX** → الإضافة تستخرج بياناته تلقائياً
2. **اضغط "حفظ البائع"** → البيانات تُحفظ محلياً
3. **كرر** مع بائعين آخرين
4. **اضغط "تصدير الكل"** → ينزّل ملف JSON + CSV

### ملاحظات
- الإضافة تعمل **يدوياً فقط** — لازم تزور كل صفحة بنفسك
- بتستخرج البيانات **العامة** الظاهرة على الصفحة فقط
- بتحسب **تقييم** لكل بائع (من 50 نقطة) وتصنفه (platinum/gold/silver/bronze)

---

## 2. سكريبت الإدخال المجمع (Bulk Import)

### المتطلبات
```bash
npm install  # في مجلد المشروع الرئيسي
```

### الاستخدام

```bash
# فحص بدون إدخال (dry-run)
NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx \
  npx tsx scripts/acquisition/bulk-import.ts \
  --file scripts/acquisition/sample-leads.json \
  --dry-run

# إدخال فعلي
NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx \
  npx tsx scripts/acquisition/bulk-import.ts \
  --file leads.json \
  --batch "olx_march_2026"
```

### صيغة الملف (JSON)
```json
{
  "sellers": [
    {
      "name": "محمد أحمد",
      "phone": "01012345678",
      "source": "olx",
      "categories": ["cars"],
      "active_ads_count": 15,
      "location": { "governorate": "القاهرة", "city": "مدينة نصر" },
      "seller_score": 42,
      "seller_tier": "platinum",
      "notes": "تاجر سيارات"
    }
  ]
}
```

### صيغة الملف (CSV)
```csv
phone,name,source,categories,active_ads_count,governorate,city,seller_score,seller_tier,notes
01012345678,محمد أحمد,olx,cars,15,القاهرة,مدينة نصر,42,platinum,تاجر سيارات
```

### ماذا يفعل السكريبت
1. يقرأ الملف (JSON أو CSV)
2. يتحقق من صحة الأرقام والبيانات
3. يفحص التكرارات (بالهاتف)
4. يُدخل البيانات في جدول `acquisition_leads`
5. يولّد تقرير بالنتائج

### ملاحظة مهمة
- السكريبت **لا يُنشئ حسابات مستخدمين**
- فقط يُنشئ سجلات leads للتتبع والتواصل
- عند تسجيل المستخدم بنفسه — يتم ربطه تلقائياً بالـ lead

---

## 3. قوالب التواصل (Outreach Templates)

### عرض القوالب المتاحة
```bash
npx tsx scripts/acquisition/outreach-templates.ts
```

### القوالب

| ID | النوع | التصنيف | الوصف |
|----|-------|---------|-------|
| `seller_invite_v1` | بائع | الكل | دعوة أولى |
| `seller_followup_v1` | بائع | الكل | متابعة بعد 3 أيام |
| `seller_platinum_offer` | بائع | بلاتينيوم | عرض متجر مجاني |
| `seller_gold_invite` | بائع | ذهبي | دعوة متخصصة |
| `seller_bulk_help` | بائع | الكل | عرض مساعدة نشر |
| `buyer_search_v1` | مشتري | الكل | دعوة بناءً على اهتمام |
| `buyer_auction_alert` | مشتري | الكل | تنبيه مزاد |

---

## 4. APIs الإدارية

### إحصائيات الاستحواذ
```
GET /api/admin/acquisition/stats
Authorization: Bearer <admin_token>
```

### قائمة الـ Leads
```
GET /api/admin/acquisition/leads?status=new&source=olx&tier=platinum&page=1
Authorization: Bearer <admin_token>
```

### إضافة lead يدوي
```
POST /api/admin/acquisition/leads
Authorization: Bearer <admin_token>
Content-Type: application/json

{ "phone": "01012345678", "name": "محمد", "source": "manual" }
```

### تحديث حالة lead
```
PATCH /api/admin/acquisition/leads
Authorization: Bearer <admin_token>
Content-Type: application/json

{ "id": "uuid", "status": "contacted", "notes": "تم التواصل عبر واتساب" }
```

### إدخال مجمع عبر API
```
POST /api/admin/acquisition/import
Authorization: Bearer <admin_token>
Content-Type: application/json

{ "sellers": [...] }
```

---

## 5. نظام جمع بيانات OLX (OLX Collector)

نظام آلي لجمع الإعلانات الحقيقية وبيانات البائعين من OLX Egypt.

```bash
# جمع بيانات من أقسام محددة
npx tsx scripts/acquisition/olx-collector/collector.ts \
  --categories cars-for-sale,mobile-phones --max-pages 5

# استيراد في قاعدة البيانات
npx tsx scripts/acquisition/olx-collector/importer.ts \
  --dir ./data/olx-collection/batch_xxx
```

للتفاصيل الكاملة: `scripts/acquisition/olx-collector/README.md`

---

## 6. قواعد التواصل الآمن

| القاعدة | التفصيل |
|---------|---------|
| الحد الأقصى | 50 رسالة/يوم |
| الفاصل الزمني | دقيقتين بين كل رسالة |
| لا إعادة إرسال | مرتين كحد أقصى لنفس الشخص |
| opt-out | لو رد "لا شكراً" → blacklist |
| ساعات العمل | 10 صباحاً — 9 مساءً |
| تخصيص | كل رسالة لازم تحتوي اسم + قسم |
