"use client";

import { useState, useEffect, useCallback } from "react";
import { Bookmark, Plus, Check, FolderPlus, Loader2, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

interface CollectionSummary {
  id: string;
  name: string;
  icon: string;
  adCount: number;
  isPublic: boolean;
  shareCode: string;
  updatedAt: string;
  previewImages: string[];
}

interface AddToCollectionButtonProps {
  adId: string;
  variant?: "icon" | "full";
}

export default function AddToCollectionButton({
  adId,
  variant = "icon",
}: AddToCollectionButtonProps) {
  const { requireAuth } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [adCollectionIds, setAdCollectionIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📌");
  const [isCreating, setIsCreating] = useState(false);

  const ICON_OPTIONS = ["📌", "❤️", "🏠", "🎁", "🛒", "⭐", "🔖", "📦", "🎯", "💡"];

  const loadCollections = useCallback(async () => {
    setIsLoading(true);
    try {
      const { getMyCollections, getAdCollections } = await import(
        "@/lib/collections/collections-service"
      );
      const [cols, adCols] = await Promise.all([
        getMyCollections(),
        getAdCollections(adId),
      ]);
      setCollections(cols);
      setAdCollectionIds(adCols);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, [adId]);

  useEffect(() => {
    if (isOpen) {
      loadCollections();
    }
  }, [isOpen, loadCollections]);

  const handleOpen = async () => {
    const authedUser = await requireAuth();
    if (!authedUser) return;
    setIsOpen(true);
  };

  const handleToggleCollection = async (collectionId: string) => {
    try {
      const isInCollection = adCollectionIds.includes(collectionId);
      if (isInCollection) {
        const { removeFromCollection } = await import(
          "@/lib/collections/collections-service"
        );
        removeFromCollection(collectionId, adId);
        setAdCollectionIds((prev) => prev.filter((id) => id !== collectionId));
        setCollections((prev) =>
          prev.map((c) =>
            c.id === collectionId ? { ...c, adCount: c.adCount - 1 } : c
          )
        );
      } else {
        const { addToCollection } = await import(
          "@/lib/collections/collections-service"
        );
        const result = addToCollection(collectionId, adId);
        if (result) {
          setAdCollectionIds((prev) => [...prev, collectionId]);
          setCollections((prev) =>
            prev.map((c) =>
              c.id === collectionId ? { ...c, adCount: c.adCount + 1 } : c
            )
          );
        }
      }
    } catch {
      // Silent
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      const { createCollection, addToCollection } = await import(
        "@/lib/collections/collections-service"
      );
      const collection = createCollection(newName.trim(), newIcon);
      if (collection) {
        addToCollection(collection.id, adId);
        setCollections((prev) => [
          {
            id: collection.id,
            name: collection.name,
            icon: collection.icon,
            adCount: 1,
            isPublic: collection.isPublic,
            shareCode: collection.shareCode,
            updatedAt: collection.updatedAt,
            previewImages: [],
          },
          ...prev,
        ]);
        setAdCollectionIds((prev) => [...prev, collection.id]);
        setNewName("");
        setShowCreate(false);
      }
    } catch {
      // Silent
    } finally {
      setIsCreating(false);
    }
  };

  const isInAnyCollection = adCollectionIds.length > 0;

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={handleOpen}
          className={`p-2 rounded-full transition-colors ${
            isInAnyCollection
              ? "text-brand-green bg-brand-green-light"
              : "text-gray-text hover:text-brand-green hover:bg-gray-light"
          }`}
          aria-label="إضافة لقائمة"
        >
          <Bookmark size={20} fill={isInAnyCollection ? "currentColor" : "none"} />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            isInAnyCollection
              ? "bg-brand-green-light text-brand-green"
              : "bg-gray-light text-gray-text hover:text-brand-green"
          }`}
        >
          <Bookmark size={16} fill={isInAnyCollection ? "currentColor" : "none"} />
          {isInAnyCollection ? "محفوظ في قائمة" : "احفظ في قائمة"}
        </button>
      )}

      {/* Bottom sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setIsOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl max-h-[70vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-light">
              <h3 className="text-sm font-bold text-dark">احفظ في قائمة</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-text"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[55vh] p-4 space-y-2">
              {/* Create new */}
              {!showCreate ? (
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="w-full flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-text hover:text-brand-green hover:border-brand-green transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg border-2 border-current flex items-center justify-center">
                    <FolderPlus size={18} />
                  </div>
                  <span className="text-sm font-semibold">قائمة جديدة</span>
                </button>
              ) : (
                <div className="p-3 bg-brand-green-light rounded-xl space-y-3">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="اسم القائمة..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-dark placeholder:text-gray-300 focus:border-brand-green outline-none"
                    maxLength={30}
                    autoFocus
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    {ICON_OPTIONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setNewIcon(icon)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all ${
                          newIcon === icon
                            ? "bg-brand-green text-white scale-110"
                            : "bg-white hover:bg-gray-light"
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={isCreating || !newName.trim()}
                      className="flex-1 py-2 bg-brand-green text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {isCreating ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <>
                          <Plus size={14} />
                          إنشاء وحفظ
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreate(false)}
                      className="px-3 py-2 text-xs text-gray-text"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {/* Existing collections */}
              {isLoading ? (
                <div className="flex items-center justify-center py-6 gap-2">
                  <Loader2 size={14} className="animate-spin text-brand-green" />
                  <span className="text-xs text-gray-text">بنحمّل القوائم...</span>
                </div>
              ) : collections.length === 0 ? (
                <p className="text-center text-xs text-gray-text py-6">
                  مفيش قوائم لسه. اعمل قائمة جديدة!
                </p>
              ) : (
                collections.map((col) => {
                  const isIn = adCollectionIds.includes(col.id);
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => handleToggleCollection(col.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        isIn ? "bg-brand-green-light" : "bg-gray-light hover:bg-gray-200"
                      }`}
                    >
                      <span className="text-xl">{col.icon}</span>
                      <div className="flex-1 text-start min-w-0">
                        <p className="text-sm font-semibold text-dark truncate">
                          {col.name}
                        </p>
                        <p className="text-[10px] text-gray-text">
                          {col.adCount} إعلان
                        </p>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isIn
                            ? "border-brand-green bg-brand-green"
                            : "border-gray-300"
                        }`}
                      >
                        {isIn && <Check size={14} className="text-white" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
