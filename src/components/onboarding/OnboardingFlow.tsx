"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket,
  Sparkles,
  Brain,
  Users,
  Bell,
  PlusCircle,
  ChevronLeft,
  X,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import { ga4Event } from "@/lib/analytics/ga4";

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip?: () => void;
}

const TOTAL_STEPS = 4;

const CATEGORIES = [
  { id: "cars", emoji: "🚗", name: "سيارات" },
  { id: "real_estate", emoji: "🏠", name: "عقارات" },
  { id: "phones", emoji: "📱", name: "موبايلات" },
  { id: "fashion", emoji: "👗", name: "موضة" },
  { id: "scrap", emoji: "♻️", name: "خردة" },
  { id: "gold", emoji: "💰", name: "ذهب وفضة" },
  { id: "luxury", emoji: "💎", name: "سلع فاخرة" },
  { id: "appliances", emoji: "🏠", name: "أجهزة منزلية" },
  { id: "furniture", emoji: "🪑", name: "أثاث وديكور" },
  { id: "hobbies", emoji: "🎮", name: "هوايات" },
  { id: "tools", emoji: "🔧", name: "عدد وأدوات" },
  { id: "services", emoji: "🛠️", name: "خدمات" },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

export default function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const progress = (step / TOTAL_STEPS) * 100;

  const trackStep = useCallback(
    (stepNum: number, action: "complete" | "skip") => {
      ga4Event("onboarding_step", { step: stepNum, action });
    },
    [],
  );

  const nextStep = () => {
    trackStep(step, "complete");
    if (step < TOTAL_STEPS) {
      setDirection(1);
      setStep((s) => s + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  };

  const handleSkip = () => {
    trackStep(step, "skip");
    ga4Event("onboarding_skip", { skipped_at_step: step });
    onSkip?.();
    onComplete();
  };

  const handleComplete = () => {
    ga4Event("onboarding_complete", {
      interests: selectedCategories.join(","),
      notifications_enabled: notificationsEnabled,
    });

    // Save interests to localStorage
    if (selectedCategories.length > 0) {
      localStorage.setItem(
        "maksab_user_interests",
        JSON.stringify(selectedCategories),
      );
    }

    localStorage.setItem("maksab_onboarding_done", "true");
    toast.success("أهلاً بيك في مكسب! 💚");
    onComplete();
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const requestNotifications = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === "granted");
      ga4Event("notification_permission", { granted: permission === "granted" });
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col" dir="rtl">
      {/* Header with progress bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handleSkip}
            className="text-xs text-gray-text hover:text-dark transition-colors"
          >
            تخطي
          </button>
          <span className="text-xs text-gray-text">
            {step} / {TOTAL_STEPS}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-light rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-brand-green rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute inset-0 px-4 py-6 flex flex-col"
          >
            {/* Step 1: Welcome */}
            {step === 1 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-24 h-24 rounded-full bg-brand-green-light flex items-center justify-center">
                  <Rocket size={48} className="text-brand-green" />
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl font-bold text-dark">
                    مرحباً في <span className="text-brand-green">مكسب</span>!
                  </h1>
                  <p className="text-sm text-gray-text max-w-xs mx-auto leading-relaxed">
                    أول سوق مصري فيه بيع وشراء ومزادات وتبديل — كل ده مجاناً!
                  </p>
                </div>

                {/* Features */}
                <div className="w-full max-w-sm space-y-3 pt-4">
                  {[
                    {
                      icon: <Sparkles size={20} className="text-brand-gold" />,
                      text: "بيع سهل — انشر إعلانك في 30 ثانية",
                    },
                    {
                      icon: <Brain size={20} className="text-purple-500" />,
                      text: "سعّر بالـ AI — اعرف سعر أي حاجة",
                    },
                    {
                      icon: <Users size={20} className="text-brand-green" />,
                      text: "مجتمع مصري — مزادات وتبديل",
                    },
                  ].map((feature) => (
                    <div
                      key={feature.text}
                      className="flex items-center gap-3 bg-gray-light rounded-xl p-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                        {feature.icon}
                      </div>
                      <p className="text-sm text-dark text-right">{feature.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Choose Interests */}
            {step === 2 && (
              <div className="flex-1 flex flex-col space-y-5">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-dark">
                    إيه اللي بتدور عليه؟
                  </h2>
                  <p className="text-sm text-gray-text">
                    اختار الأقسام اللي تهمك عشان نوريك إعلانات تناسبك
                  </p>
                </div>

                <div className="flex-1 grid grid-cols-3 gap-2 content-start">
                  {CATEGORIES.map((cat) => {
                    const isSelected = selectedCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                          isSelected
                            ? "border-brand-green bg-brand-green-light"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-brand-green flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                        <span className="text-2xl">{cat.emoji}</span>
                        <span className="text-[11px] font-bold text-dark">
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedCategories.length > 0 && (
                  <p className="text-center text-xs text-brand-green font-semibold">
                    اخترت {selectedCategories.length} قسم
                  </p>
                )}
              </div>
            )}

            {/* Step 3: Enable Notifications */}
            {step === 3 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center">
                  <Bell size={48} className="text-blue-500" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-dark">
                    فعّل الإشعارات
                  </h2>
                  <p className="text-sm text-gray-text max-w-xs mx-auto leading-relaxed">
                    عشان توصلك الرسائل الجديدة والمزادات اللي تهمك في الوقت
                  </p>
                </div>

                <div className="w-full max-w-sm space-y-3">
                  {[
                    "رسالة جديدة من مشتري",
                    "حد زايد على إعلانك",
                    "سعر نزل في حاجة بتدور عليها",
                    "إعلان جديد في قسمك المفضل",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 bg-blue-50 rounded-xl p-3"
                    >
                      <Bell size={14} className="text-blue-500 flex-shrink-0" />
                      <span className="text-xs text-dark">{item}</span>
                    </div>
                  ))}
                </div>

                {notificationsEnabled ? (
                  <div className="flex items-center gap-2 text-brand-green">
                    <Check size={20} />
                    <span className="text-sm font-bold">تم تفعيل الإشعارات!</span>
                  </div>
                ) : (
                  <button
                    onClick={requestNotifications}
                    className="px-8 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors"
                  >
                    فعّل الإشعارات
                  </button>
                )}
              </div>
            )}

            {/* Step 4: Add First Ad */}
            {step === 4 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-24 h-24 rounded-full bg-brand-green-light flex items-center justify-center">
                  <PlusCircle size={48} className="text-brand-green" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-dark">
                    أضف أول إعلان!
                  </h2>
                  <p className="text-sm text-gray-text max-w-xs mx-auto leading-relaxed">
                    عندك حاجة تبيعها أو تبدّلها؟ أضف إعلانك الأول في أقل من
                    دقيقة!
                  </p>
                </div>

                <div className="w-full max-w-sm space-y-3 pt-4">
                  <button
                    onClick={() => {
                      handleComplete();
                      router.push("/ad/create");
                    }}
                    className="w-full py-4 bg-brand-green text-white font-bold rounded-xl hover:bg-brand-green-dark transition-colors text-base flex items-center justify-center gap-2"
                  >
                    <PlusCircle size={20} />
                    أضف أول إعلان
                  </button>

                  <button
                    onClick={handleComplete}
                    className="w-full py-3 bg-gray-light text-gray-text font-semibold rounded-xl hover:bg-gray-200 transition-colors text-sm"
                  >
                    تصفح الإعلانات الأول
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom navigation */}
      <div className="px-4 pb-6 pt-3">
        {step < TOTAL_STEPS && (
          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={prevStep}
                className="flex-shrink-0 w-12 h-12 rounded-xl bg-gray-light flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <ChevronLeft size={20} className="text-gray-text rotate-180" />
              </button>
            )}
            <button
              onClick={nextStep}
              className="flex-1 h-12 bg-brand-green text-white font-bold rounded-xl hover:bg-brand-green-dark transition-colors"
            >
              التالي
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
