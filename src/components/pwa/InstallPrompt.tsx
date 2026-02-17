"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Share, X, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const INSTALL_DISMISSED_KEY = "maksab_install_dismissed";
const INSTALL_VISIT_KEY = "maksab_install_visits";
const MIN_VISITS_BEFORE_PROMPT = 2;
const DISMISS_DAYS = 14; // Re-show after 14 days

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Detects if the user is on iOS Safari (which doesn't support beforeinstallprompt)
 */
function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}

/**
 * Detects if the app is already running as a standalone PWA
 */
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed as PWA — don't show
    if (isStandalone()) return;

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem(INSTALL_DISMISSED_KEY);
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_DAYS) return;
      // Expired — clear and allow showing again
      localStorage.removeItem(INSTALL_DISMISSED_KEY);
    }

    // Count visits
    const visits = Number(localStorage.getItem(INSTALL_VISIT_KEY) || "0") + 1;
    localStorage.setItem(INSTALL_VISIT_KEY, String(visits));

    if (visits < MIN_VISITS_BEFORE_PROMPT) return;

    // iOS Safari path
    if (isIOSSafari()) {
      setIsIOS(true);
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android / Chrome path — listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show our custom prompt after a short delay
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
      localStorage.removeItem(INSTALL_VISIT_KEY);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
    setShowPrompt(false);
    setShowIOSInstructions(false);
  }, []);

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <>
          {/* iOS Instructions Bottom Sheet */}
          {showIOSInstructions && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                onClick={() => setShowIOSInstructions(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 inset-x-0 bg-white rounded-t-2xl z-[101] safe-bottom"
              >
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 bg-gray-light rounded-full" />
                </div>
                <div className="px-5 pb-8">
                  <h3 className="text-lg font-bold text-dark mb-4">
                    إزاي تسطّب مكسب على موبايلك
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                        ١
                      </div>
                      <div>
                        <p className="text-sm font-bold text-dark">
                          اضغط على زر المشاركة
                        </p>
                        <p className="text-xs text-gray-text mt-0.5">
                          الأيقونة{" "}
                          <Share size={14} className="inline text-brand-green" />{" "}
                          اللي تحت في المتصفح
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                        ٢
                      </div>
                      <div>
                        <p className="text-sm font-bold text-dark">
                          اختار &quot;إضافة إلى الشاشة الرئيسية&quot;
                        </p>
                        <p className="text-xs text-gray-text mt-0.5">
                          انزل تحت في القائمة لحد ما تلاقيها
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                        ٣
                      </div>
                      <div>
                        <p className="text-sm font-bold text-dark">
                          اضغط &quot;إضافة&quot;
                        </p>
                        <p className="text-xs text-gray-text mt-0.5">
                          وكده مكسب هيبقى على الشاشة الرئيسية زي أي تطبيق
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowIOSInstructions(false)}
                    className="w-full mt-6 bg-brand-green text-white font-bold py-3 rounded-xl active:scale-95 transition-all"
                  >
                    فهمت، شكراً
                  </button>
                </div>
              </motion.div>
            </>
          )}

          {/* Install Banner */}
          {!showIOSInstructions && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
              className="fixed bottom-20 inset-x-0 z-[90] px-4"
            >
              <div className="bg-white border border-brand-green/20 rounded-2xl p-4 shadow-lg relative">
                <button
                  onClick={handleDismiss}
                  className="absolute top-3 end-3 p-1 text-gray-text hover:text-dark rounded-full"
                  aria-label="إغلاق"
                >
                  <X size={16} />
                </button>

                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Smartphone size={24} className="text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0 pe-5">
                    <p className="text-sm font-bold text-dark mb-0.5">
                      سطّب مكسب على موبايلك
                    </p>
                    <p className="text-xs text-gray-text leading-relaxed mb-3">
                      وصول أسرع، إشعارات فورية، وتجربة زي التطبيقات بالظبط
                    </p>

                    <div className="flex items-center gap-2">
                      {isIOS ? (
                        <button
                          onClick={() => setShowIOSInstructions(true)}
                          className="bg-brand-green text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-brand-green-dark transition-colors flex items-center gap-1.5 active:scale-95"
                        >
                          <Download size={14} />
                          إزاي أسطّبه؟
                        </button>
                      ) : (
                        <button
                          onClick={handleInstall}
                          className="bg-brand-green text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-brand-green-dark transition-colors flex items-center gap-1.5 active:scale-95"
                        >
                          <Download size={14} />
                          سطّب دلوقتي
                        </button>
                      )}
                      <button
                        onClick={handleDismiss}
                        className="text-xs text-gray-text hover:text-dark transition-colors px-2 py-2.5"
                      >
                        مش دلوقتي
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
