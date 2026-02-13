"use client";

import Header from "@/components/layout/Header";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white pb-20">
      <Header title="شروط الاستخدام" showBack />

      <div className="px-4 py-6 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-dark">شروط استخدام مكسب</h1>
          <p className="text-xs text-gray-text mt-1">آخر تحديث: فبراير 2026</p>
        </div>

        <Section title="1. القبول بالشروط">
          باستخدامك لتطبيق مكسب، أنت بتوافق على الشروط والأحكام دي. لو مش موافق على أي
          جزء، يرجى عدم استخدام التطبيق.
        </Section>

        <Section title="2. تعريف الخدمة">
          مكسب هو سوق إلكتروني مصري بيتيح للمستخدمين بيع وشراء وتبديل السلع الجديدة والمستعملة.
          مكسب بيوفر المنصة بس — ومش طرف في أي معاملة بيع أو شراء بين المستخدمين.
        </Section>

        <Section title="3. التسجيل والحساب">
          <ul className="list-disc list-inside space-y-2">
            <li>لازم يكون عندك رقم موبايل مصري صالح للتسجيل.</li>
            <li>أنت مسؤول عن الحفاظ على أمان حسابك.</li>
            <li>لازم تكون عمرك 18 سنة أو أكتر لاستخدام التطبيق.</li>
            <li>المعلومات اللي بتقدمها لازم تكون صحيحة ودقيقة.</li>
            <li>حساب واحد بس لكل مستخدم.</li>
          </ul>
        </Section>

        <Section title="4. قواعد نشر الإعلانات">
          <ul className="list-disc list-inside space-y-2">
            <li>الإعلان لازم يكون لمنتج أو خدمة حقيقية أنت مالكها أو مفوض ببيعها.</li>
            <li>الصور لازم تكون حقيقية للمنتج الفعلي — مش صور من الإنترنت.</li>
            <li>السعر لازم يكون واقعي وحقيقي.</li>
            <li>ممنوع نشر إعلانات لمنتجات غير قانونية أو محظورة.</li>
            <li>ممنوع نشر نفس الإعلان أكتر من مرة (سبام).</li>
            <li>ممنوع المحتوى المسيء أو العنصري أو الجنسي.</li>
          </ul>
        </Section>

        <Section title="5. المنتجات المحظورة">
          <ul className="list-disc list-inside space-y-2">
            <li>أسلحة وذخيرة بأي نوع.</li>
            <li>مواد مخدرة أو أدوية بدون وصفة طبية.</li>
            <li>منتجات مقلدة أو مزيفة بدون توضيح.</li>
            <li>بيانات شخصية أو حسابات مسروقة.</li>
            <li>أي منتج مخالف للقانون المصري.</li>
          </ul>
        </Section>

        <Section title="6. المزادات">
          <ul className="list-disc list-inside space-y-2">
            <li>المزايدة ملزمة — لو فزت بمزاد، أنت ملزم بالشراء.</li>
            <li>ممنوع المزايدة الوهمية (رفع السعر بحسابات مزيفة).</li>
            <li>البائع ملزم بالبيع للفائز بالمزاد بالسعر المتفق عليه.</li>
            <li>في حالة عدم إتمام الصفقة بدون سبب مقنع، ممكن يتم تعليق الحساب.</li>
          </ul>
        </Section>

        <Section title="7. التواصل بين المستخدمين">
          <ul className="list-disc list-inside space-y-2">
            <li>التواصل لازم يكون محترم ومتعلق بالإعلان.</li>
            <li>ممنوع التحرش أو الإزعاج أو التهديد.</li>
            <li>ممنوع إرسال محتوى غير لائق في الرسائل.</li>
            <li>مكسب بيحتفظ بحق مراقبة الرسائل لحماية المستخدمين من النصب.</li>
          </ul>
        </Section>

        <Section title="8. العمولة التطوعية">
          مكسب تطبيق مجاني بالكامل. العمولة تطوعية ومش إلزامية. دفع العمولة
          بيساعدنا نكبر ونحسن الخدمة. مفيش أي عقوبة أو تقييد لعدم دفع العمولة.
        </Section>

        <Section title="9. إخلاء المسؤولية">
          <ul className="list-disc list-inside space-y-2">
            <li>مكسب مش مسؤول عن جودة المنتجات المعروضة.</li>
            <li>مكسب مش طرف في المعاملات بين البائع والمشتري.</li>
            <li>أنت مسؤول عن التحقق من المنتج قبل الشراء.</li>
            <li>ننصح دايماً بالمعاينة الشخصية قبل الدفع.</li>
            <li>مكسب مش مسؤول عن أي خسائر مالية ناتجة عن معاملات بين المستخدمين.</li>
          </ul>
        </Section>

        <Section title="10. تعليق أو إنهاء الحساب">
          مكسب بيحتفظ بحق تعليق أو حذف أي حساب في حالة:
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li>مخالفة شروط الاستخدام.</li>
            <li>نشر إعلانات وهمية أو احتيالية.</li>
            <li>تلقي عدد كبير من البلاغات.</li>
            <li>أي سلوك يضر بمجتمع مكسب.</li>
          </ul>
        </Section>

        <Section title="11. التعديلات على الشروط">
          مكسب بيحتفظ بحق تعديل الشروط دي في أي وقت. هنبلغ المستخدمين بأي تغييرات
          جوهرية عن طريق إشعار في التطبيق.
        </Section>

        <Section title="12. القانون الحاكم">
          الشروط دي بتخضع لقوانين جمهورية مصر العربية. أي نزاع بيتم حله
          عن طريق المحاكم المصرية المختصة.
        </Section>

        <Section title="13. التواصل معنا">
          لو عندك أي استفسار عن الشروط دي، تواصل معانا عن طريق صفحة المساعدة
          في التطبيق.
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
