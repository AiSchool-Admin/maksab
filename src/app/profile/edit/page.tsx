"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { User as UserIcon, Store, Camera } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import Header from "@/components/layout/Header";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import { updateUserProfile } from "@/lib/supabase/auth";
import { governorates } from "@/lib/data/governorates";
import { authFetch } from "@/lib/utils/auth-fetch";

export default function EditProfilePage() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [sellerType, setSellerType] = useState<"individual" | "store">("individual");
  const [governorate, setGovernorate] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      setSellerType(user.seller_type || "individual");
      setGovernorate(user.governorate || "");
      setCity(user.city || "");
      setBio(user.bio || "");
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      router.push("/profile");
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("نوع الصورة مش مدعوم. استخدم JPG أو PNG أو WebP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة أكبر من 5MB");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "avatars");
      formData.append("path", path);

      const res = await authFetch("/api/upload", {
        method: "POST",
        headers: {},
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "فشل رفع الصورة");
        return;
      }

      const { url } = await res.json();
      const { user: updated, error: updateError } = await updateUserProfile(user.id, { avatar_url: url });
      if (updateError) {
        toast.error(updateError);
        return;
      }
      if (updated) {
        setUser(updated);
        toast.success("تم تحديث صورة البروفايل");
      }
    } catch {
      toast.error("حصل مشكلة في رفع الصورة. جرب تاني");
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);
    setIsSaving(true);

    const { user: updated, error: saveError } = await updateUserProfile(user.id, {
      display_name: displayName.trim() || null,
      seller_type: sellerType,
      governorate: governorate || null,
      city: city.trim() || null,
      bio: bio.trim() || null,
    });

    setIsSaving(false);

    if (saveError) {
      setError(saveError);
      return;
    }

    if (updated) {
      setUser(updated);
    }

    setSuccess(true);
    setTimeout(() => router.back(), 800);
  };

  return (
    <main className="bg-white pb-20">
      <Header title="تعديل البروفايل" showBack showNotifications={false} />

      <div className="px-4 py-5 space-y-5">
        {/* Avatar upload */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-brand-green-light flex items-center justify-center overflow-hidden">
              {isUploadingAvatar ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
                </div>
              ) : user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt="صورة البروفايل"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <UserIcon size={40} className="text-brand-green" />
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute -bottom-1 -end-1 w-8 h-8 bg-brand-green text-white rounded-full flex items-center justify-center shadow-md disabled:opacity-50"
              aria-label="تغيير الصورة"
            >
              <Camera size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-text">اضغط على الكاميرا لتغيير الصورة</p>
        </div>

        <Input
          label="اسم العرض"
          name="display_name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="اكتب اسمك زي ما عايز يظهر"
          maxLength={100}
        />

        {/* User type selector */}
        <div className="w-full">
          <label className="block text-sm font-medium text-dark mb-1.5">
            نوع الحساب <span className="text-gray-text text-xs">(اختياري)</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSellerType("individual")}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${
                sellerType === "individual"
                  ? "border-brand-green bg-brand-green-light text-brand-green"
                  : "border-gray-light bg-gray-light text-gray-text hover:border-gray-300"
              }`}
            >
              <UserIcon size={18} />
              <span>فرد</span>
            </button>
            <button
              type="button"
              onClick={() => setSellerType("store")}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${
                sellerType === "store"
                  ? "border-brand-green bg-brand-green-light text-brand-green"
                  : "border-gray-light bg-gray-light text-gray-text hover:border-gray-300"
              }`}
            >
              <Store size={18} />
              <span>تاجر</span>
            </button>
          </div>
        </div>

        <Select
          label="المحافظة"
          name="governorate"
          value={governorate}
          onChange={(e) => {
            setGovernorate(e.target.value);
            setCity("");
          }}
          placeholder="اختار المحافظة"
          options={governorates.map((g) => ({ value: g, label: g }))}
        />

        <Input
          label="المدينة / المنطقة"
          name="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="مثلاً: مدينة نصر"
          maxLength={100}
        />

        <div className="w-full">
          <label className="block text-sm font-medium text-dark mb-1.5">
            نبذة مختصرة
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="اكتب حاجة عن نفسك..."
            maxLength={300}
            rows={3}
            className="w-full px-4 py-3 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark placeholder:text-gray-text resize-none"
          />
          <p className="mt-1 text-[11px] text-gray-text text-start">
            {bio.length}/300
          </p>
        </div>

        {error && (
          <p className="text-sm text-error text-center bg-error/5 rounded-xl p-3">
            {error}
          </p>
        )}

        {success && (
          <p className="text-sm text-brand-green text-center bg-brand-green-light rounded-xl p-3">
            تم حفظ البيانات بنجاح
          </p>
        )}

        <Button
          fullWidth
          size="lg"
          isLoading={isSaving}
          onClick={handleSave}
        >
          حفظ التعديلات
        </Button>
      </div>

      <BottomNavWithBadge />
    </main>
  );
}
