"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Plus,
  Share2,
  Trash2,
  Globe,
  Lock,
  Loader2,
  FolderOpen,
} from "lucide-react";
import Link from "next/link";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatTimeAgo } from "@/lib/utils/format";

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

export default function CollectionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📌");

  const ICON_OPTIONS = ["📌", "❤️", "🏠", "🎁", "🛒", "⭐", "🔖", "📦", "🎯", "💡"];

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    setIsLoading(true);
    try {
      const { getMyCollections } = await import(
        "@/lib/collections/collections-service"
      );
      const cols = await getMyCollections();
      setCollections(cols);
    } catch {
      // Silent
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const { createCollection } = await import(
        "@/lib/collections/collections-service"
      );
      const col = createCollection(newName.trim(), newIcon);
      if (col) {
        setCollections((prev) => [
          {
            id: col.id,
            name: col.name,
            icon: col.icon,
            adCount: 0,
            isPublic: col.isPublic,
            shareCode: col.shareCode,
            updatedAt: col.updatedAt,
            previewImages: [],
          },
          ...prev,
        ]);
        setNewName("");
        setNewIcon("📌");
        setShowCreate(false);
      }
    } catch {
      // Silent
    }
  };

  const handleDelete = async (colId: string) => {
    try {
      const { deleteCollection } = await import(
        "@/lib/collections/collections-service"
      );
      deleteCollection(colId);
      setCollections((prev) => prev.filter((c) => c.id !== colId));
    } catch {
      // Silent
    }
  };

  const handleShare = async (col: CollectionSummary) => {
    try {
      const { generateWhatsAppShareUrl } = await import(
        "@/lib/collections/collections-service"
      );
      const url = generateWhatsAppShareUrl({
        name: col.name,
        shareCode: col.shareCode,
        adCount: col.adCount,
      });
      window.open(url, "_blank");
    } catch {
      // Copy share link fallback
      const link = `${window.location.origin}/collections/shared/${col.shareCode}`;
      navigator.clipboard?.writeText(link);
    }
  };

  return (
    <main className="min-h-screen bg-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-light">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-1 text-gray-text"
              aria-label="رجوع"
            >
              <ChevronRight size={24} />
            </button>
            <h1 className="text-xl font-bold text-dark">قوائم مكسب</h1>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="p-2 text-brand-green hover:bg-brand-green-light rounded-full transition-colors"
            aria-label="قائمة جديدة"
          >
            <Plus size={22} />
          </button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Create form */}
        {showCreate && (
          <div className="p-4 bg-brand-green-light rounded-xl space-y-3 border border-brand-green/10">
            <h3 className="text-sm font-bold text-dark">قائمة جديدة</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="مثلاً: شقق بنشوفها، هدايا..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-dark placeholder:text-gray-300 focus:border-brand-green outline-none bg-white"
              maxLength={30}
              autoFocus
            />
            <div className="flex items-center gap-2 flex-wrap">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setNewIcon(icon)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                    newIcon === icon
                      ? "bg-brand-green text-white scale-110 shadow-sm"
                      : "bg-white hover:bg-gray-light border border-gray-200"
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
                disabled={!newName.trim()}
                className="flex-1 py-2.5 bg-brand-green text-white text-sm font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Plus size={16} />
                إنشاء القائمة
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setNewName("");
                }}
                className="px-4 py-2.5 text-sm text-gray-text bg-white rounded-lg border border-gray-200"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Collections list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 gap-2">
            <Loader2 size={18} className="animate-spin text-brand-green" />
            <span className="text-sm text-gray-text">بنحمّل القوائم...</span>
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-xl font-bold text-dark mb-2">مفيش قوائم لسه</h2>
            <p className="text-sm text-gray-text mb-6 max-w-[250px] mx-auto">
              اعمل قائمة واحفظ فيها الإعلانات اللي عجبتك وشاركها مع صحابك
            </p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 bg-brand-green text-white px-6 py-3 rounded-xl font-bold text-sm"
            >
              <Plus size={18} />
              اعمل أول قائمة
            </button>
          </div>
        ) : (
          collections.map((col) => (
            <div
              key={col.id}
              className="bg-gray-light rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                {/* Icon + preview images */}
                <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center text-2xl flex-shrink-0 border border-gray-200">
                  {col.previewImages.length > 0 ? (
                    <img
                      src={col.previewImages[0]}
                      alt=""
                      className="w-full h-full rounded-xl object-cover"
                    />
                  ) : (
                    col.icon
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/collections/${col.id}`}
                    className="text-sm font-bold text-dark hover:text-brand-green transition-colors"
                  >
                    {col.name}
                  </Link>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-text">
                    <span>{col.adCount} إعلان</span>
                    <span className="flex items-center gap-0.5">
                      {col.isPublic ? (
                        <>
                          <Globe size={10} /> عامة
                        </>
                      ) : (
                        <>
                          <Lock size={10} /> خاصة
                        </>
                      )}
                    </span>
                    <span>{formatTimeAgo(col.updatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <Link
                  href={`/collections/${col.id}`}
                  className="flex-1 py-2 bg-white text-brand-green text-xs font-bold rounded-lg text-center border border-brand-green/20 hover:bg-brand-green-light transition-colors flex items-center justify-center gap-1.5"
                >
                  <FolderOpen size={14} />
                  فتح القائمة
                </Link>
                <button
                  type="button"
                  onClick={() => handleShare(col)}
                  className="p-2 text-brand-green hover:bg-brand-green-light rounded-lg transition-colors"
                  aria-label="مشاركة"
                >
                  <Share2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(col.id)}
                  className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                  aria-label="حذف"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNavWithBadge />
    </main>
  );
}
