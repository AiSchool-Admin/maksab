"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitCompareArrows, X, ChevronUp, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useComparisonStore } from "@/stores/comparison-store";

/**
 * Floating Action Button that shows when items are added for comparison.
 * Sticks above the bottom nav.
 */
export default function ComparisonFab() {
  const router = useRouter();
  const { ads, removeAd, clearAll, isOpen, toggleOpen } = useComparisonStore();
  const [isExpanded, setIsExpanded] = useState(false);

  if (ads.length === 0) return null;

  return (
    <div className="fixed bottom-20 inset-x-4 z-40">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white border border-gray-light rounded-xl shadow-lg p-3 mb-2 space-y-2"
          >
            {ads.map((ad) => (
              <div
                key={ad.id}
                className="flex items-center gap-2 text-sm"
              >
                {ad.image && (
                  <img
                    src={ad.image}
                    alt=""
                    className="w-8 h-8 rounded object-cover flex-shrink-0"
                  />
                )}
                <p className="flex-1 truncate text-dark text-xs font-medium">
                  {ad.title}
                </p>
                <button
                  onClick={() => removeAd(ad.id)}
                  className="p-1 text-gray-text hover:text-error rounded transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={clearAll}
              className="text-[11px] text-error font-semibold"
            >
              مسح الكل
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-2"
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-brand-green text-white rounded-full shadow-lg shadow-brand-green/30 px-4 py-3 flex items-center gap-2 flex-1 hover:bg-brand-green-dark transition-colors"
        >
          <GitCompareArrows size={18} />
          <span className="text-sm font-bold">
            مقارنة ({ads.length}/3)
          </span>
          {isExpanded ? <ChevronDown size={16} className="ms-auto" /> : <ChevronUp size={16} className="ms-auto" />}
        </button>

        {ads.length >= 2 && (
          <button
            onClick={() => router.push("/compare")}
            className="bg-brand-gold text-white rounded-full shadow-lg px-4 py-3 text-sm font-bold hover:bg-brand-gold/90 transition-colors"
          >
            قارن الآن
          </button>
        )}
      </motion.div>
    </div>
  );
}
