"use client";

import { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** "bottom-sheet" slides from bottom (mobile-native feel), "center" is a classic modal */
  variant?: "bottom-sheet" | "center";
  showCloseButton?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  variant = "bottom-sheet",
  showCloseButton = true,
}: ModalProps) {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-overlay z-[100]"
            onClick={onClose}
          />

          {/* Modal Content */}
          {variant === "bottom-sheet" ? (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 inset-x-0 bg-white rounded-t-2xl z-[101] max-h-[85vh] overflow-y-auto safe-bottom"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-light rounded-full" />
              </div>

              {/* Header */}
              {(title || showCloseButton) && (
                <div className="flex items-center justify-between px-4 pb-3">
                  {title && (
                    <h2 className="text-lg font-bold text-dark">{title}</h2>
                  )}
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="p-1 text-gray-text hover:text-dark rounded-full hover:bg-gray-light transition-colors btn-icon-sm"
                      aria-label="إغلاق"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              )}

              {/* Body */}
              <div className="px-4 pb-6">{children}</div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 flex items-center justify-center z-[101] p-4"
            >
              <div
                className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                {(title || showCloseButton) && (
                  <div className="flex items-center justify-between p-4 border-b border-gray-light">
                    {title && (
                      <h2 className="text-lg font-bold text-dark">{title}</h2>
                    )}
                    {showCloseButton && (
                      <button
                        onClick={onClose}
                        className="p-1 text-gray-text hover:text-dark rounded-full hover:bg-gray-light transition-colors btn-icon-sm"
                        aria-label="إغلاق"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                )}

                {/* Body */}
                <div className="p-4">{children}</div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
