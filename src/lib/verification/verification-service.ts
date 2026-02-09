/**
 * Identity Verification service — manages user verification levels and badge display.
 */

import { supabase } from "@/lib/supabase/client";

export type VerificationType = "phone" | "national_id" | "commercial_register";
export type VerificationStatus = "pending" | "approved" | "rejected";
export type VerificationLevel = "basic" | "verified" | "premium";

export interface Verification {
  id: string;
  userId: string;
  type: VerificationType;
  status: VerificationStatus;
  adminNotes: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

export interface UserVerificationProfile {
  level: VerificationLevel;
  isPhoneVerified: boolean;
  isIdVerified: boolean;
  verifications: Verification[];
}

/**
 * Get the verification level label in Arabic
 */
export function getVerificationLevelLabel(level: VerificationLevel): string {
  switch (level) {
    case "basic": return "أساسي";
    case "verified": return "موثق";
    case "premium": return "متميز";
  }
}

/**
 * Get verification level badge color
 */
export function getVerificationLevelColor(level: VerificationLevel): string {
  switch (level) {
    case "basic": return "bg-gray-100 text-gray-600";
    case "verified": return "bg-blue-50 text-blue-700";
    case "premium": return "bg-brand-gold-light text-brand-gold";
  }
}

/**
 * Get user's verification profile
 */
export async function getUserVerificationProfile(userId: string): Promise<UserVerificationProfile> {
  const defaultProfile: UserVerificationProfile = {
    level: "basic",
    isPhoneVerified: true, // All users have phone verified (OTP login)
    isIdVerified: false,
    verifications: [],
  };

  try {
    // Get profile verification level
    const { data: profileData } = await supabase
      .from("profiles" as never)
      .select("verification_level, is_id_verified")
      .eq("id", userId)
      .maybeSingle();

    if (profileData) {
      const profile = profileData as Record<string, unknown>;
      defaultProfile.level = (profile.verification_level as VerificationLevel) || "basic";
      defaultProfile.isIdVerified = (profile.is_id_verified as boolean) || false;
    }

    // Get all verifications
    const { data: verificationsData } = await supabase
      .from("identity_verifications" as never)
      .select("*")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false });

    if (verificationsData) {
      defaultProfile.verifications = (verificationsData as Record<string, unknown>[]).map((v) => ({
        id: v.id as string,
        userId: v.user_id as string,
        type: v.verification_type as VerificationType,
        status: v.status as VerificationStatus,
        adminNotes: (v.admin_notes as string) || null,
        submittedAt: v.submitted_at as string,
        reviewedAt: (v.reviewed_at as string) || null,
      }));
    }

    return defaultProfile;
  } catch {
    return defaultProfile;
  }
}

/**
 * Submit national ID verification request
 */
export async function submitIdVerification(
  userId: string,
  nationalIdHash: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if already submitted
    const { data: existing } = await supabase
      .from("identity_verifications" as never)
      .select("id, status")
      .eq("user_id", userId)
      .eq("verification_type", "national_id")
      .maybeSingle();

    if (existing) {
      const status = (existing as Record<string, unknown>).status as string;
      if (status === "pending") {
        return { success: false, error: "طلب التوثيق قيد المراجعة بالفعل" };
      }
      if (status === "approved") {
        return { success: false, error: "تم توثيق هويتك بالفعل" };
      }
      // If rejected, allow re-submission by updating
      const { error } = await supabase
        .from("identity_verifications" as never)
        .update({
          status: "pending",
          document_hash: nationalIdHash,
          submitted_at: new Date().toISOString(),
          reviewed_at: null,
          admin_notes: null,
        } as never)
        .eq("id", (existing as Record<string, unknown>).id as string);

      if (error) return { success: false, error: "حصل مشكلة، جرب تاني" };
      return { success: true };
    }

    const { error } = await supabase.from("identity_verifications" as never).insert({
      user_id: userId,
      verification_type: "national_id",
      document_hash: nationalIdHash,
      status: "pending",
    } as never);

    if (error) return { success: false, error: "حصل مشكلة، جرب تاني" };
    return { success: true };
  } catch {
    return { success: false, error: "حصل مشكلة، جرب تاني" };
  }
}

/**
 * Calculate verification level based on verified items
 */
export function calculateVerificationLevel(
  isPhoneVerified: boolean,
  isIdVerified: boolean,
  isTrustedSeller: boolean,
): VerificationLevel {
  if (isIdVerified && isTrustedSeller) return "premium";
  if (isIdVerified) return "verified";
  return "basic";
}
