"use client";

import { useState, useEffect } from "react";
import { Ban, ShieldOff } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { blockUser, unblockUser, isUserBlocked } from "@/lib/blocks/block-service";

interface BlockUserButtonProps {
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
  onBlocked?: () => void;
}

export default function BlockUserButton({
  currentUserId,
  otherUserId,
  otherUserName,
  onBlocked,
}: BlockUserButtonProps) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentUserId && otherUserId) {
      isUserBlocked(currentUserId, otherUserId).then(setIsBlocked);
    }
  }, [currentUserId, otherUserId]);

  const handleBlock = async () => {
    setIsLoading(true);
    const result = await blockUser(currentUserId, otherUserId);
    setIsLoading(false);

    if (result.success) {
      setIsBlocked(true);
      setShowConfirm(false);
      onBlocked?.();
    }
  };

  const handleUnblock = async () => {
    setIsLoading(true);
    const result = await unblockUser(currentUserId, otherUserId);
    setIsLoading(false);

    if (result.success) {
      setIsBlocked(false);
    }
  };

  if (isBlocked) {
    return (
      <button
        onClick={handleUnblock}
        disabled={isLoading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-text bg-gray-light rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
      >
        <ShieldOff size={14} />
        <span>إلغاء الحظر</span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="p-2 text-gray-text hover:text-error rounded-full hover:bg-gray-light transition-colors"
        aria-label="حظر المستخدم"
        title="حظر المستخدم"
      >
        <Ban size={18} />
      </button>

      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="حظر المستخدم">
        <div className="space-y-4">
          <p className="text-sm text-gray-text">
            هل أنت متأكد إنك عايز تحظر <strong className="text-dark">{otherUserName}</strong>؟
          </p>
          <div className="bg-gray-light rounded-xl p-3 space-y-1.5">
            <p className="text-xs text-dark font-semibold">بعد الحظر:</p>
            <ul className="text-xs text-gray-text space-y-1 list-disc list-inside">
              <li>مش هتقدر تبعتله أو تستقبل منه رسائل</li>
              <li>إعلاناته مش هتظهرلك</li>
              <li>مش هيقدر يتواصل معاك</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleBlock}
              disabled={isLoading}
              className="flex-1 py-3 bg-error text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? "جاري الحظر..." : "حظر"}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 py-3 bg-gray-light text-dark font-bold rounded-xl hover:bg-gray-200 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
