"use client";

import Header from "@/components/layout/Header";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white pb-20">
      <Header title="سياسة الخصوصية" showBack />

      <div className="px-4 py-6 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-dark">سياسة خصوصية مكسب</h1>
          <p className="text-xs text-gray-text mt-1">آخر تحديث: فبراير 2026</p>
        </div>

        <Section title="1. مقدمة">
          في مكسب، خصوصيتك مهمة جداً بالنسبالنا. السياسة دي بتوضح إيه البيانات
          اللي بنجمعها، وإزاي بنستخدمها، وإيه حقوقك في التحكم فيها.
        </Section>

        <Section title="2. البيانات اللي بنجمعها">
          <h3 className="font-semibold text-dark mt-3 mb-1">أ. بيانات التسجيل:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>رقم الموبايل (مطلوب للتسجيل)</li>
            <li>الاسم (اختياري)</li>
            <li>صورة الملف الشخصي (اختياري)</li>
            <li>المحافظة والمدينة (اختياري)</li>
          </ul>

          <h3 className="font-semibold text-dark mt-3 mb-1">ب. بيانات الإعلانات:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>تفاصيل المنتجات والصور اللي بتنشرها</li>
            <li>الأسعار والموقع الجغرافي للإعلانات</li>
          </ul>

          <h3 className="font-semibold text-dark mt-3 mb-1">ج. بيانات الاستخدام:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>عمليات البحث اللي بتعملها</li>
            <li>الإعلانات اللي بتشوفها أو بتحفظها</li>
            <li>المزايدات والعروض</li>
            <li>الرسائل (لغرض حماية المستخدمين من النصب)</li>
          </ul>

          <h3 className="font-semibold text-dark mt-3 mb-1">د. بيانات الجهاز:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>نوع الجهاز والمتصفح</li>
            <li>الموقع الجغرافي (بعد إذنك فقط)</li>
          </ul>
        </Section>

        <Section title="3. إزاي بنستخدم البيانات دي">
          <ul className="list-disc list-inside space-y-2">
            <li><strong>تقديم الخدمة:</strong> عرض الإعلانات، تسهيل التواصل بين البائع والمشتري، إدارة المزادات.</li>
            <li><strong>التخصيص:</strong> عرض إعلانات مناسبة لاهتماماتك وموقعك.</li>
            <li><strong>الأمان:</strong> كشف ومنع الاحتيال والنصب وحماية المستخدمين.</li>
            <li><strong>التحسين:</strong> تطوير التطبيق وتحسين تجربة المستخدم.</li>
            <li><strong>الإشعارات:</strong> إرسال تنبيهات مهمة (رسائل جديدة، مزايدات، تحديثات).</li>
          </ul>
        </Section>

        <Section title="4. مشاركة البيانات">
          <ul className="list-disc list-inside space-y-2">
            <li>مش بنبيع بياناتك الشخصية لأي طرف ثالث — أبداً.</li>
            <li>رقم موبايلك بيظهر للمشترين المهتمين بإعلاناتك فقط.</li>
            <li>ممكن نشارك بيانات مجمعة (مش شخصية) لأغراض إحصائية.</li>
            <li>ممكن نشارك بيانات مع الجهات القانونية لو مطلوب بموجب القانون المصري.</li>
          </ul>
        </Section>

        <Section title="5. حماية البيانات">
          <ul className="list-disc list-inside space-y-2">
            <li>بنستخدم تشفير SSL لحماية البيانات أثناء النقل.</li>
            <li>كلمات السر وأكواد التحقق مشفرة ومش بيتم تخزينها بشكل واضح.</li>
            <li>الوصول للبيانات محدود للموظفين المصرح لهم فقط.</li>
            <li>بنعمل مراجعات أمنية دورية لحماية النظام.</li>
          </ul>
        </Section>

        <Section title="6. حقوقك">
          أنت عندك الحقوق دي في أي وقت:

          <div className="mt-2 space-y-3">
            <div className="bg-gray-light rounded-lg p-3">
              <p className="text-xs font-semibold text-dark">حق الوصول</p>
              <p className="text-xs text-gray-text">تقدر تطلب نسخة من بياناتك الشخصية.</p>
            </div>
            <div className="bg-gray-light rounded-lg p-3">
              <p className="text-xs font-semibold text-dark">حق التعديل</p>
              <p className="text-xs text-gray-text">تقدر تعدل بياناتك من صفحة الملف الشخصي.</p>
            </div>
            <div className="bg-gray-light rounded-lg p-3">
              <p className="text-xs font-semibold text-dark">حق الحذف</p>
              <p className="text-xs text-gray-text">تقدر تحذف حسابك وكل بياناتك من الإعدادات.</p>
            </div>
            <div className="bg-gray-light rounded-lg p-3">
              <p className="text-xs font-semibold text-dark">حق الاعتراض</p>
              <p className="text-xs text-gray-text">تقدر توقف الإشعارات وتتبع الموقع من الإعدادات.</p>
            </div>
          </div>
        </Section>

        <Section title="7. ملفات الكوكيز والتخزين المحلي">
          بنستخدم التخزين المحلي (localStorage) لتخزين تفضيلاتك وتسريع تحميل التطبيق.
          مش بنستخدم كوكيز تتبع من أطراف خارجية.
        </Section>

        <Section title="8. إشعارات الـ Push">
          ممكن نبعتلك إشعارات Push لو وافقت عليها. تقدر توقفها في أي وقت
          من إعدادات التطبيق أو إعدادات الجهاز.
        </Section>

        <Section title="9. بيانات الأطفال">
          مكسب مش موجه للأطفال تحت 18 سنة. مش بنجمع بيانات عن أطفال
          بشكل متعمد. لو اكتشفنا إن طفل سجل حساب، هنحذفه فوراً.
        </Section>

        <Section title="10. الاحتفاظ بالبيانات">
          <ul className="list-disc list-inside space-y-2">
            <li>بيانات الحساب: بنحتفظ بيها طالما الحساب نشط.</li>
            <li>الإعلانات المنتهية: بتتحذف تلقائياً بعد 90 يوم.</li>
            <li>الرسائل: بنحتفظ بيها لمدة سنة لأغراض الأمان.</li>
            <li>بعد حذف الحساب: كل البيانات الشخصية بتتمسح خلال 30 يوم.</li>
          </ul>
        </Section>

        <Section title="11. التعديلات على السياسة">
          ممكن نعدل السياسة دي من وقت للتاني. هنبلغك بأي تغيير جوهري
          عن طريق إشعار في التطبيق. استمرارك في استخدام التطبيق بيعتبر موافقة
          على التعديلات.
        </Section>

        <Section title="12. التواصل معنا">
          لو عندك أي سؤال عن الخصوصية أو عايز تمارس أي من حقوقك،
          تواصل معانا عن طريق صفحة المساعدة في التطبيق.
        </Section>
      </div>

      <BottomNavWithBadge />
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-bold text-dark mb-2">{title}</h2>
      <div className="text-sm text-gray-text leading-relaxed">{children}</div>
    </section>
  );
}
