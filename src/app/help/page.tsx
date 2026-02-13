"use client";

import { useState } from "react";
import {
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  ExternalLink,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "إزاي أضيف إعلان؟",
    answer:
      "اضغط على زرار \"+ أضف إعلان\" في أسفل الشاشة أو في الهيدر. اختار القسم والقسم الفرعي، املأ التفاصيل المطلوبة، حدد السعر وارفع الصور، واختار الموقع. الإعلان بيتنشر فوراً!",
  },
  {
    question: "إزاي أعمل مزاد؟",
    answer:
      "عند إنشاء إعلان جديد، في الخطوة الأولى اختار \"مزاد 🔨\" كنوع البيع. بعدين حدد سعر الافتتاح ومدة المزاد (24 أو 48 أو 72 ساعة). ممكن كمان تحدد سعر \"اشتري الآن\" لو عايز.",
  },
  {
    question: "إزاي أبدّل حاجة؟",
    answer:
      "اختار \"تبديل 🔄\" كنوع البيع عند إنشاء الإعلان. اكتب إيه اللي عايز تبدله بيه والتطبيق هيعرض عليك إعلانات مطابقة تلقائياً.",
  },
  {
    question: "هل التطبيق مجاني؟",
    answer:
      "أيوا! مكسب تطبيق مجاني بالكامل. مفيش رسوم على نشر الإعلانات أو التواصل مع البائعين. بنعتمد على العمولة الاختيارية اللي المستخدمين بيتبرعوا بيها بعد إتمام الصفقة.",
  },
  {
    question: "إزاي أتواصل مع البائع؟",
    answer:
      "من صفحة الإعلان، ممكن تتواصل عن طريق الشات الداخلي، أو واتساب، أو الاتصال المباشر. كل الخيارات موجودة في شريط التواصل أسفل صفحة الإعلان.",
  },
  {
    question: "إزاي أعدّل أو أحذف إعلاني؟",
    answer:
      "روح على \"إعلاناتي\" من صفحة حسابك. هتلاقي كل إعلاناتك. اضغط على النقط الثلاثة (⋮) جنب أي إعلان عشان تعدّله أو تحذفه أو تعلّمه كـ\"تم البيع\".",
  },
  {
    question: "إيه هي العمولة الاختيارية؟",
    answer:
      "بعد ما الصفقة تتم، بنطلب منك عمولة بسيطة (1% من قيمة الصفقة — بحد أقصى 200 جنيه). دي اختيارية تماماً ومفيش أي إجبار. لو ادفعت، هتحصل على شارة \"داعم مكسب 💚\" على بروفايلك.",
  },
  {
    question: "إزاي أحمي نفسي من النصب؟",
    answer:
      "• قابل البائع في مكان عام\n• اتأكد من المنتج قبل ما تدفع\n• متحوّلش فلوس قبل المعاينة\n• استخدم الشات الداخلي عشان يكون فيه سجل للمحادثة\n• بلّغ عن أي إعلان مشبوه",
  },
  {
    question: "إزاي أبلّغ عن إعلان مخالف؟",
    answer:
      "من صفحة أي إعلان، اضغط على أيقونة القائمة (⋮) أعلى الصفحة. هتلاقي خيار \"إبلاغ عن الإعلان\". اختار سبب البلاغ وهنراجعه في أقرب وقت. لو الموضوع عاجل، تواصل معانا على واتساب.",
  },
  {
    question: "إزاي أفتح متجر على مكسب؟",
    answer:
      "روح على صفحة حسابك واضغط \"ترقية لمتجر\". اختار اسم المتجر والقسم الرئيسي وأضف اللوجو والوصف. المتجر بيديك صفحة خاصة بيك وأدوات إدارة متقدمة.",
  },
  {
    question: "إزاي أثبّت التطبيق على موبايلي؟",
    answer:
      "مكسب تطبيق ويب تقدمي (PWA). على أندرويد: افتح التطبيق في كروم واضغط \"إضافة إلى الشاشة الرئيسية\". على آيفون: افتح في سفاري واضغط زرار المشاركة ثم \"إضافة إلى الشاشة الرئيسية\".",
  },
];

export default function HelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <main className="min-h-screen bg-white pb-20">
      <Header title="المساعدة والدعم" showBack />

      <div className="px-4 py-4 space-y-6">
        {/* Quick contact */}
        <section className="bg-brand-green-light rounded-xl p-4">
          <h2 className="text-sm font-bold text-dark mb-3">
            محتاج مساعدة؟ تواصل معانا
          </h2>
          <div className="space-y-2">
            <a
              href="https://wa.me/201000000000?text=محتاج مساعدة في تطبيق مكسب"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white rounded-lg p-3 hover:shadow-sm transition-shadow"
            >
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                <MessageCircle size={18} className="text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-dark">واتساب</p>
                <p className="text-xs text-gray-text">أسرع طريقة للتواصل</p>
              </div>
              <ExternalLink size={14} className="text-gray-text" />
            </a>

            <a
              href="mailto:support@maksab.app"
              className="flex items-center gap-3 bg-white rounded-lg p-3 hover:shadow-sm transition-shadow"
            >
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                <Mail size={18} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-dark">إيميل</p>
                <p className="text-xs text-gray-text">support@maksab.app</p>
              </div>
              <ExternalLink size={14} className="text-gray-text" />
            </a>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-base font-bold text-dark mb-3">
            الأسئلة الشائعة
          </h2>

          <div className="space-y-2">
            {faqItems.map((item, index) => (
              <div
                key={index}
                className="border border-gray-light rounded-xl overflow-hidden"
              >
                <button
                  onClick={() =>
                    setOpenIndex(openIndex === index ? null : index)
                  }
                  className="w-full flex items-center justify-between p-4 text-start hover:bg-gray-light/50 transition-colors"
                >
                  <span className="text-sm font-semibold text-dark flex-1 me-2">
                    {item.question}
                  </span>
                  {openIndex === index ? (
                    <ChevronUp size={18} className="text-gray-text flex-shrink-0" />
                  ) : (
                    <ChevronDown size={18} className="text-gray-text flex-shrink-0" />
                  )}
                </button>

                {openIndex === index && (
                  <div className="px-4 pb-4 border-t border-gray-light">
                    <p className="text-sm text-gray-text leading-relaxed pt-3 whitespace-pre-line">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* App version */}
        <div className="text-center pt-4 pb-8">
          <p className="text-xs text-gray-text">
            مكسب — النسخة 1.0.0
          </p>
          <p className="text-xs text-gray-text mt-1">
            أسهل وأذكى سوق على الإطلاق 💚
          </p>
        </div>
      </div>

      <BottomNavWithBadge />
    </main>
  );
}
