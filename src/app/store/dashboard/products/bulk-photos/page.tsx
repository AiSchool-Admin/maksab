"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ImagePlus,
  X,
  Check,
  Loader2,
  Camera,
  Trash2,
  Upload,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { useAuthStore } from "@/stores/auth-store";
import { getStoreByUserId } from "@/lib/stores/store-service";
import {
  getCategoryById,
  categoriesConfig,
} from "@/lib/categories/categories-config";
import {
  generateAutoTitle,
  generateAutoDescription,
} from "@/lib/categories/generate";
import { compressImage } from "@/lib/utils/image-compress";
import type { CompressedImage } from "@/lib/utils/image-compress";
import type { Store, CategoryConfig } from "@/types";

interface PhotoProduct {
  id: string;
  image: CompressedImage;
  price: string;
  title: string;
  status: "editing" | "publishing" | "success" | "error";
  errorMessage?: string;
}

export default function BulkPhotosPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [products, setProducts] = useState<PhotoProduct[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [showDone, setShowDone] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    async function load() {
      const s = await getStoreByUserId(user!.id);
      if (!s) { router.push("/store/create"); return; }
      setStore(s);
      if (s.main_category) setCategoryId(s.main_category);
      setIsLoading(false);
    }
    load();
  }, [user, router]);

  // Handle multi-photo selection
  const handlePhotosSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxPhotos = 50;
    const toProcess = Array.from(files).slice(0, maxPhotos - products.length);

    for (const file of toProcess) {
      try {
        const compressed = await compressImage(file);
        const newProduct: PhotoProduct = {
          id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          image: compressed,
          price: defaultPrice,
          title: "",
          status: "editing",
        };
        setProducts(prev => [...prev, newProduct]);
      } catch {
        // Skip failed compressions
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [products.length, defaultPrice]);

  // Update product price
  const handlePriceChange = useCallback((productId: string, price: string) => {
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, price } : p
    ));
  }, []);

  // Update product title
  const handleTitleChange = useCallback((productId: string, title: string) => {
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, title } : p
    ));
  }, []);

  // Remove product
  const handleRemoveProduct = useCallback((productId: string) => {
    setProducts(prev => {
      const removed = prev.find(p => p.id === productId);
      if (removed?.image.preview) URL.revokeObjectURL(removed.image.preview);
      return prev.filter(p => p.id !== productId);
    });
  }, []);

  // Apply default price to all empty-price products
  const handleApplyDefaultPrice = useCallback(() => {
    if (!defaultPrice) return;
    setProducts(prev => prev.map(p =>
      !p.price ? { ...p, price: defaultPrice } : p
    ));
  }, [defaultPrice]);

  // Publish all products
  const handlePublish = useCallback(async () => {
    if (!user || !store) return;
    const config = getCategoryById(categoryId);

    const validProducts = products.filter(p =>
      p.status === "editing" && p.price && Number(p.price) > 0
    );

    if (validProducts.length === 0) {
      alert("أضف سعر لمنتج واحد على الأقل");
      return;
    }

    setIsPublishing(true);
    setPublishProgress(0);

    let successCount = 0;

    for (let i = 0; i < validProducts.length; i++) {
      const product = validProducts[i];

      // Mark as publishing
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, status: "publishing" as const } : p
      ));

      try {
        // Upload image
        const formData = new FormData();
        formData.append("file", product.image.file);
        formData.append("bucket", "ad-images");
        formData.append("path", `ads/${user.id}/${Date.now()}_${i}.jpg`);

        let imageUrl = "";
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.url || "";
        }

        // Generate title if empty
        const title = product.title || (config
          ? generateAutoTitle(config, {}, subcategoryId || undefined)
          : `منتج ${i + 1}`);

        const description = config
          ? generateAutoDescription(config, {}, subcategoryId || undefined)
          : "";

        // Create ad
        const res = await fetch("/api/ads/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            ad_data: {
              category_id: categoryId,
              subcategory_id: subcategoryId || null,
              sale_type: "cash",
              title,
              description,
              category_fields: {},
              price: Number(product.price),
              is_negotiable: false,
              images: imageUrl ? [imageUrl] : [],
              governorate: store.location_gov || null,
              city: store.location_area || null,
              store_id: store.id,
            },
          }),
        });

        if (res.ok) {
          successCount++;
          setProducts(prev => prev.map(p =>
            p.id === product.id ? { ...p, status: "success" as const } : p
          ));
        } else {
          const data = await res.json();
          setProducts(prev => prev.map(p =>
            p.id === product.id ? { ...p, status: "error" as const, errorMessage: data.error } : p
          ));
        }
      } catch {
        setProducts(prev => prev.map(p =>
          p.id === product.id ? { ...p, status: "error" as const, errorMessage: "حصل مشكلة" } : p
        ));
      }

      setPublishProgress(i + 1);
    }

    setIsPublishing(false);
    setShowDone(true);
  }, [user, store, products, categoryId, subcategoryId]);

  const config = getCategoryById(categoryId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-green" />
      </div>
    );
  }

  const editingCount = products.filter(p => p.status === "editing").length;
  const successCount = products.filter(p => p.status === "success").length;

  return (
    <div className="min-h-screen bg-gray-50 pb-40">
      {/* Header */}
      <header className="bg-white border-b border-gray-light px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => router.push("/store/dashboard/products")} className="p-1">
          <ArrowRight size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Camera size={20} className="text-brand-green" />
          <div>
            <h1 className="text-base font-bold text-dark">رفع صور بالجملة</h1>
            {products.length > 0 && (
              <p className="text-[10px] text-gray-text">{products.length} صورة</p>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 mt-3 space-y-3">
        {/* Category & Settings */}
        {!showDone && (
          <div className="bg-white rounded-xl border border-gray-light p-4 space-y-3">
            <Select
              label="القسم"
              name="category"
              value={categoryId}
              onChange={(e) => { setCategoryId(e.target.value); setSubcategoryId(""); }}
              options={categoriesConfig.map(c => ({
                value: c.id,
                label: `${c.icon} ${c.name}`,
              }))}
              placeholder="اختار القسم"
              required
            />

            {config && config.subcategories.length > 0 && (
              <Select
                label="القسم الفرعي"
                name="subcategory"
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                options={config.subcategories.map(s => ({
                  value: s.id,
                  label: s.name,
                }))}
                placeholder="اختياري"
              />
            )}

            {/* Default price with apply button */}
            <div>
              <label className="block text-sm font-semibold text-dark mb-1">سعر موحد (اختياري)</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={defaultPrice}
                    onChange={(e) => setDefaultPrice(e.target.value)}
                    placeholder="السعر الافتراضي لكل المنتجات"
                    className="w-full px-3 py-2.5 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none text-sm text-dark"
                  />
                  <span className="absolute start-auto end-3 top-1/2 -translate-y-1/2 text-xs text-gray-text">جنيه</span>
                </div>
                {defaultPrice && products.length > 0 && (
                  <button
                    onClick={handleApplyDefaultPrice}
                    className="bg-brand-green text-white text-xs font-bold px-3 rounded-xl whitespace-nowrap"
                  >
                    طبّق على الكل
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upload area */}
        {!showDone && categoryId && (
          <div
            className="bg-white rounded-2xl border-2 border-dashed border-brand-green/40 p-6 text-center cursor-pointer hover:bg-brand-green/5 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus size={36} className="mx-auto text-brand-green mb-2" />
            <h3 className="text-sm font-bold text-dark mb-1">
              {products.length === 0 ? "اختار صور المنتجات" : "أضف صور تانية"}
            </h3>
            <p className="text-xs text-gray-text">
              اختار عدة صور مرة واحدة — كل صورة = منتج
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotosSelected}
          className="hidden"
        />

        {/* Products Grid */}
        {products.length > 0 && !showDone && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-dark">{products.length} منتج</h3>
              {editingCount > 0 && (
                <span className="text-xs text-gray-text">{editingCount} جاهز للنشر</span>
              )}
            </div>

            {products.map((product, index) => (
              <div
                key={product.id}
                className={`bg-white rounded-xl border p-3 flex gap-3 ${
                  product.status === "success" ? "border-green-200 bg-green-50/50" :
                  product.status === "error" ? "border-error/30 bg-error/5" :
                  product.status === "publishing" ? "border-brand-green/30 bg-brand-green/5" :
                  "border-gray-light"
                }`}
              >
                {/* Image thumbnail */}
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 relative">
                  <img
                    src={product.image.preview}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {product.status === "success" && (
                    <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                      <Check size={20} className="text-white" />
                    </div>
                  )}
                  {product.status === "publishing" && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Loader2 size={16} className="text-white animate-spin" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  {product.status === "editing" ? (
                    <>
                      <input
                        value={product.title}
                        onChange={(e) => handleTitleChange(product.id, e.target.value)}
                        placeholder={`منتج ${index + 1} (اختياري)`}
                        className="w-full text-sm text-dark bg-transparent outline-none placeholder:text-gray-text/50"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          inputMode="numeric"
                          value={product.price}
                          onChange={(e) => handlePriceChange(product.id, e.target.value)}
                          placeholder="السعر"
                          className="w-24 text-sm font-bold text-brand-green bg-gray-light rounded-lg px-2 py-1 outline-none focus:bg-white focus:ring-1 focus:ring-brand-green"
                        />
                        <span className="text-xs text-gray-text">جنيه</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-dark line-clamp-1">
                        {product.title || `منتج ${index + 1}`}
                      </p>
                      <p className="text-xs font-bold text-brand-green">
                        {product.price ? `${Number(product.price).toLocaleString()} جنيه` : "—"}
                      </p>
                      {product.status === "error" && (
                        <p className="text-[10px] text-error">{product.errorMessage}</p>
                      )}
                    </>
                  )}
                </div>

                {/* Actions */}
                {product.status === "editing" && (
                  <button
                    onClick={() => handleRemoveProduct(product.id)}
                    className="p-1 text-gray-text hover:text-error self-start"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Done state */}
        {showDone && (
          <div className="bg-white rounded-2xl border border-gray-light p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-brand-green/10 rounded-full flex items-center justify-center mx-auto">
              <Check size={32} className="text-brand-green" />
            </div>
            <h3 className="text-lg font-bold text-dark">تم رفع المنتجات!</h3>
            <p className="text-sm text-gray-text">
              تم نشر <span className="font-bold text-brand-green">{successCount}</span> منتج بنجاح
            </p>

            <div className="space-y-2 pt-2">
              <Button
                fullWidth
                onClick={() => router.push("/store/dashboard/products")}
              >
                عرض المنتجات
              </Button>
              <Button
                fullWidth
                variant="outline"
                onClick={() => {
                  setProducts([]);
                  setShowDone(false);
                  setPublishProgress(0);
                }}
              >
                رفع صور تانية
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom publish bar */}
      {products.length > 0 && !showDone && !isPublishing && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-light p-4 z-40 space-y-2">
          {isPublishing && (
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-2">
              <div
                className="h-full bg-brand-green rounded-full transition-all"
                style={{ width: `${editingCount > 0 ? (publishProgress / editingCount) * 100 : 0}%` }}
              />
            </div>
          )}
          <Button
            fullWidth
            size="lg"
            onClick={handlePublish}
            isLoading={isPublishing}
            disabled={editingCount === 0}
            icon={<Upload size={18} />}
          >
            نشر {editingCount} منتج
          </Button>
        </div>
      )}
    </div>
  );
}
