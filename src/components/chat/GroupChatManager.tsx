"use client";

import { useState, useEffect, useCallback } from "react";
import { UserPlus, X, Users, Loader2, Phone, Crown, Shield } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  phone: string;
  role: "buyer" | "seller" | "member";
  addedBy: string | null;
  addedAt: string;
}

interface GroupChatManagerProps {
  conversationId: string;
  buyerId: string;
  sellerId: string;
  otherUser: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    phone: string;
  };
}

export default function GroupChatManager({
  conversationId,
  buyerId,
  sellerId,
  otherUser,
}: GroupChatManagerProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [members, setMembers] = useState<ConversationMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const currentUserId = user?.id || "";
  const isBuyer = currentUserId === buyerId;

  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/chat/members?conversation_id=${conversationId}`
      );
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch {
      // Silent
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (isOpen) {
      loadMembers();
    }
  }, [isOpen, loadMembers]);

  const handleAddMember = async () => {
    if (!phone) return;

    // Validate Egyptian phone
    const cleanPhone = phone.replace(/[\s-]/g, "");
    if (!/^01[0125]\d{8}$/.test(cleanPhone)) {
      setError("رقم الموبايل مش صحيح. لازم يبدأ بـ 01 ويكون 11 رقم");
      return;
    }

    setIsAdding(true);
    setError("");

    try {
      const res = await fetch("/api/chat/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          conversation_id: conversationId,
          phone: cleanPhone,
        }),
      });

      const data = await res.json();

      if (res.ok && data.member) {
        setMembers((prev) => [...prev, data.member]);
        setPhone("");
        setShowAddForm(false);
      } else {
        setError(data.error || "حصل مشكلة، جرب تاني");
      }
    } catch {
      setError("حصل مشكلة في الاتصال، جرب تاني");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const res = await fetch("/api/chat/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          conversation_id: conversationId,
          member_id: memberId,
        }),
      });

      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.userId !== memberId));
      }
    } catch {
      // Silent
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "buyer":
        return "المشتري";
      case "seller":
        return "البائع";
      default:
        return "عضو";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "buyer":
        return <Crown size={12} className="text-brand-gold" />;
      case "seller":
        return <Shield size={12} className="text-brand-green" />;
      default:
        return null;
    }
  };

  // Total member count including buyer and seller
  const totalMembers = 2 + members.filter((m) => m.role === "member").length;

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-gray-text hover:text-brand-green rounded-full hover:bg-gray-light transition-colors flex-shrink-0"
        aria-label="أعضاء المحادثة"
      >
        <Users size={20} />
        {totalMembers > 2 && (
          <span className="absolute -top-0.5 -end-0.5 w-4 h-4 bg-brand-green text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {totalMembers}
          </span>
        )}
      </button>

      {/* Panel overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setIsOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-light">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-brand-green" />
                <h3 className="text-sm font-bold text-dark">
                  أعضاء المحادثة ({totalMembers})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-text hover:text-dark"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-3">
              {/* Built-in participants */}
              {/* Buyer */}
              <MemberRow
                displayName={currentUserId === buyerId ? (user?.display_name || "أنت") : otherUser.displayName}
                role="buyer"
                isCurrentUser={currentUserId === buyerId}
                getRoleLabel={getRoleLabel}
                getRoleIcon={getRoleIcon}
              />

              {/* Seller */}
              <MemberRow
                displayName={currentUserId === sellerId ? (user?.display_name || "أنت") : otherUser.displayName}
                role="seller"
                isCurrentUser={currentUserId === sellerId}
                getRoleLabel={getRoleLabel}
                getRoleIcon={getRoleIcon}
              />

              {/* Additional members */}
              {isLoading ? (
                <div className="flex items-center justify-center py-4 gap-2">
                  <Loader2 size={14} className="animate-spin text-brand-green" />
                  <span className="text-xs text-gray-text">بنحمّل الأعضاء...</span>
                </div>
              ) : (
                members
                  .filter((m) => m.role === "member")
                  .map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center gap-3 p-3 bg-gray-light rounded-xl"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                        <Users size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-dark truncate">
                          {member.displayName}
                        </p>
                        <p className="text-[10px] text-gray-text">عضو</p>
                      </div>
                      {isBuyer && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.userId)}
                          className="p-1.5 text-error hover:bg-error/10 rounded-full transition-colors"
                          aria-label="إزالة العضو"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))
              )}

              {/* Add member section — only buyer can add */}
              {isBuyer && totalMembers < 5 && (
                <>
                  {!showAddForm ? (
                    <button
                      type="button"
                      onClick={() => setShowAddForm(true)}
                      className="w-full flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-text hover:text-brand-green hover:border-brand-green transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center flex-shrink-0">
                        <UserPlus size={16} />
                      </div>
                      <span className="text-sm font-semibold">ضيف حد معاك في الشات</span>
                    </button>
                  ) : (
                    <div className="p-3 bg-brand-green-light rounded-xl space-y-3">
                      <p className="text-xs font-bold text-dark">
                        ضيف صاحبك أو حد من عيلتك يشوف المحادثة معاك
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                          <Phone
                            size={14}
                            className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-text"
                          />
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => {
                              setPhone(e.target.value);
                              setError("");
                            }}
                            placeholder="01XXXXXXXXX"
                            className="w-full ps-9 pe-3 py-2.5 border border-gray-200 rounded-lg text-sm text-dark placeholder:text-gray-300 focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none"
                            dir="ltr"
                            maxLength={11}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddMember}
                          disabled={isAdding || !phone}
                          className="px-4 py-2.5 bg-brand-green text-white text-xs font-bold rounded-lg hover:bg-brand-green-dark active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {isAdding ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <>
                              <UserPlus size={14} />
                              ضيف
                            </>
                          )}
                        </button>
                      </div>
                      {error && (
                        <p className="text-xs text-error">{error}</p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddForm(false);
                          setError("");
                          setPhone("");
                        }}
                        className="text-xs text-gray-text hover:text-dark"
                      >
                        إلغاء
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Max members notice */}
              {isBuyer && totalMembers >= 5 && (
                <p className="text-[10px] text-gray-text text-center py-2">
                  وصلت للحد الأقصى (5 أعضاء)
                </p>
              )}

              {/* Info note */}
              <p className="text-[10px] text-gray-text text-center pt-2 leading-relaxed">
                الأعضاء المضافين يقدروا يشوفوا كل الرسائل ويبعتوا رسائل في المحادثة دي
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Helper component for member rows ──────────────────────────────── */
function MemberRow({
  displayName,
  role,
  isCurrentUser,
  getRoleLabel,
  getRoleIcon,
}: {
  displayName: string;
  role: string;
  isCurrentUser: boolean;
  getRoleLabel: (r: string) => string;
  getRoleIcon: (r: string) => React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-light rounded-xl">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          role === "seller"
            ? "bg-brand-green-light text-brand-green"
            : "bg-brand-gold-light text-brand-gold"
        }`}
      >
        <Users size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-dark truncate">
            {displayName}
            {isCurrentUser && (
              <span className="text-[10px] text-gray-text font-normal"> (أنت)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {getRoleIcon(role)}
          <p className="text-[10px] text-gray-text">{getRoleLabel(role)}</p>
        </div>
      </div>
    </div>
  );
}
