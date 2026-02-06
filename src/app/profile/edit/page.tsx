"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import { updateUserProfile } from "@/lib/supabase/auth";
import { governorates } from "@/lib/data/governorates";

export default function EditProfilePage() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      setGovernorate(user.governorate || "");
      setCity(user.city || "");
      setBio(user.bio || "");
    }
  }, [user]);

  if (!user) {
    router.push("/profile");
    return null;
  }

  const handleSave = async () => {
    setError(null);
    setSuccess(false);
    setIsSaving(true);

    const { user: updated, error: saveError } = await updateUserProfile(user.id, {
      display_name: displayName.trim() || null,
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
    <main className="bg-white">
      <Header title="تعديل البروفايل" showBack showNotifications={false} />

      <div className="px-4 py-5 space-y-5">
        <Input
          label="اسم العرض"
          name="display_name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="اكتب اسمك زي ما عايز يظهر"
          maxLength={100}
        />

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
    </main>
  );
}
