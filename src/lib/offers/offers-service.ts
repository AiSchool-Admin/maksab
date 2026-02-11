/**
 * Price Offers service — formal price negotiation system.
 */

import { supabase } from "@/lib/supabase/client";

export type OfferStatus = "pending" | "accepted" | "rejected" | "countered" | "expired" | "withdrawn";

export interface PriceOffer {
  id: string;
  adId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  message: string | null;
  status: OfferStatus;
  counterAmount: number | null;
  counterMessage: string | null;
  parentOfferId: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  // Enriched fields
  buyerName: string;
  buyerAvatar: string | null;
  buyerPhone: string | null;
  sellerPhone: string | null;
  adTitle: string;
}

export interface AdOffersSummary {
  totalOffers: number;
  highestOffer: number | null;
  pendingOffers: number;
}

/**
 * Submit a price offer on an ad
 */
export async function submitOffer(params: {
  adId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  message?: string;
}): Promise<{ success: boolean; error?: string; offer?: PriceOffer }> {
  try {
    // Can't make offer on own ad
    if (params.buyerId === params.sellerId) {
      return { success: false, error: "لا يمكنك تقديم عرض على إعلانك" };
    }

    // Check if buyer already has a pending offer on this ad
    const { data: existing } = await supabase
      .from("price_offers" as never)
      .select("id")
      .eq("ad_id", params.adId)
      .eq("buyer_id", params.buyerId)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return { success: false, error: "لديك عرض سعر قائم بالفعل. اسحب عرضك الحالي أولاً" };
    }

    const { data, error } = await supabase
      .from("price_offers" as never)
      .insert({
        ad_id: params.adId,
        buyer_id: params.buyerId,
        seller_id: params.sellerId,
        amount: params.amount,
        message: params.message || null,
        status: "pending",
      } as never)
      .select()
      .single();

    if (error) return { success: false, error: "حصل مشكلة، جرب تاني" };

    // Update ad's offer stats
    await updateAdOfferStats(params.adId);

    const offer = data as Record<string, unknown>;
    return {
      success: true,
      offer: mapOffer(offer),
    };
  } catch {
    return { success: false, error: "حصل مشكلة، جرب تاني" };
  }
}

/**
 * Respond to a price offer (accept, reject, or counter)
 */
export async function respondToOffer(params: {
  offerId: string;
  sellerId: string;
  action: "accepted" | "rejected" | "countered";
  counterAmount?: number;
  counterMessage?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Record<string, unknown> = {
      status: params.action,
      updated_at: new Date().toISOString(),
    };

    if (params.action === "countered") {
      if (!params.counterAmount) {
        return { success: false, error: "يجب تحديد السعر المقترح" };
      }
      updateData.counter_amount = params.counterAmount;
      updateData.counter_message = params.counterMessage || null;
    }

    const { error } = await supabase
      .from("price_offers" as never)
      .update(updateData as never)
      .eq("id", params.offerId)
      .eq("seller_id", params.sellerId);

    if (error) return { success: false, error: "حصل مشكلة، جرب تاني" };

    // If accepted, reject all other pending offers on same ad
    if (params.action === "accepted") {
      const { data: offerData } = await supabase
        .from("price_offers" as never)
        .select("ad_id")
        .eq("id", params.offerId)
        .single();

      if (offerData) {
        const adId = (offerData as Record<string, unknown>).ad_id as string;
        await supabase
          .from("price_offers" as never)
          .update({ status: "rejected", updated_at: new Date().toISOString() } as never)
          .eq("ad_id", adId)
          .eq("status", "pending")
          .neq("id", params.offerId);

        await updateAdOfferStats(adId);
      }
    }

    return { success: true };
  } catch {
    return { success: false, error: "حصل مشكلة، جرب تاني" };
  }
}

/**
 * Withdraw a pending offer
 */
export async function withdrawOffer(
  offerId: string,
  buyerId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: offerData, error: fetchError } = await supabase
      .from("price_offers" as never)
      .select("ad_id, status")
      .eq("id", offerId)
      .eq("buyer_id", buyerId)
      .single();

    if (fetchError || !offerData) {
      return { success: false, error: "العرض غير موجود" };
    }

    if ((offerData as Record<string, unknown>).status !== "pending") {
      return { success: false, error: "لا يمكن سحب عرض تم الرد عليه" };
    }

    const { error } = await supabase
      .from("price_offers" as never)
      .update({ status: "withdrawn", updated_at: new Date().toISOString() } as never)
      .eq("id", offerId)
      .eq("buyer_id", buyerId);

    if (error) return { success: false, error: "حصل مشكلة، جرب تاني" };

    await updateAdOfferStats((offerData as Record<string, unknown>).ad_id as string);

    return { success: true };
  } catch {
    return { success: false, error: "حصل مشكلة، جرب تاني" };
  }
}

/**
 * Get offers for a specific ad
 */
export async function getAdOffers(adId: string): Promise<PriceOffer[]> {
  try {
    const { data, error } = await supabase
      .from("price_offers" as never)
      .select("*")
      .eq("ad_id", adId)
      .order("amount", { ascending: false });

    if (error || !data) return [];

    const offers = data as Record<string, unknown>[];
    const buyerIds = [...new Set(offers.map((o) => o.buyer_id as string))];

    // Fetch buyer profiles
    const { data: profilesData } = await supabase
      .from("profiles" as never)
      .select("id, display_name, avatar_url, phone")
      .in("id", buyerIds);

    const profilesMap = new Map<string, { name: string; avatar: string | null; phone: string | null }>();
    if (profilesData) {
      for (const p of profilesData as Record<string, unknown>[]) {
        profilesMap.set(p.id as string, {
          name: (p.display_name as string) || "مستخدم",
          avatar: (p.avatar_url as string) || null,
          phone: (p.phone as string) || null,
        });
      }
    }

    // Fetch seller phone from first offer's seller_id
    const sellerIds = [...new Set(offers.map((o) => o.seller_id as string))];
    const { data: sellerProfilesData } = await supabase
      .from("profiles" as never)
      .select("id, phone")
      .in("id", sellerIds);

    const sellerPhoneMap = new Map<string, string | null>();
    if (sellerProfilesData) {
      for (const p of sellerProfilesData as Record<string, unknown>[]) {
        sellerPhoneMap.set(p.id as string, (p.phone as string) || null);
      }
    }

    return offers.map((o) => {
      const profile = profilesMap.get(o.buyer_id as string);
      return {
        ...mapOffer(o),
        buyerName: profile?.name || "مستخدم",
        buyerAvatar: profile?.avatar || null,
        buyerPhone: profile?.phone || null,
        sellerPhone: sellerPhoneMap.get(o.seller_id as string) || null,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Get offers summary for an ad (for display on ad card)
 */
export async function getAdOffersSummary(adId: string): Promise<AdOffersSummary> {
  try {
    const { data, error } = await supabase
      .from("price_offers" as never)
      .select("amount, status")
      .eq("ad_id", adId)
      .in("status", ["pending", "accepted", "countered"]);

    if (error || !data || (data as unknown[]).length === 0) {
      return { totalOffers: 0, highestOffer: null, pendingOffers: 0 };
    }

    const offers = data as Record<string, unknown>[];
    const amounts = offers.map((o) => Number(o.amount));
    const pending = offers.filter((o) => o.status === "pending").length;

    return {
      totalOffers: offers.length,
      highestOffer: Math.max(...amounts),
      pendingOffers: pending,
    };
  } catch {
    return { totalOffers: 0, highestOffer: null, pendingOffers: 0 };
  }
}

/**
 * Get user's sent offers
 */
export async function getUserOffers(userId: string): Promise<PriceOffer[]> {
  try {
    const { data, error } = await supabase
      .from("price_offers" as never)
      .select("*")
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) return [];

    const offers = data as Record<string, unknown>[];
    const adIds = [...new Set(offers.map((o) => o.ad_id as string))];

    const { data: adsData } = await supabase
      .from("ads" as never)
      .select("id, title")
      .in("id", adIds);

    const adsMap = new Map<string, string>();
    if (adsData) {
      for (const a of adsData as Record<string, unknown>[]) {
        adsMap.set(a.id as string, (a.title as string) || "إعلان");
      }
    }

    // Fetch seller phones for buyer to contact
    const sellerIds = [...new Set(offers.map((o) => o.seller_id as string))];
    const { data: sellerProfilesData } = await supabase
      .from("profiles" as never)
      .select("id, phone")
      .in("id", sellerIds);

    const sellerPhoneMap = new Map<string, string | null>();
    if (sellerProfilesData) {
      for (const p of sellerProfilesData as Record<string, unknown>[]) {
        sellerPhoneMap.set(p.id as string, (p.phone as string) || null);
      }
    }

    return offers.map((o) => ({
      ...mapOffer(o),
      adTitle: adsMap.get(o.ad_id as string) || "إعلان",
      buyerName: "",
      buyerAvatar: null,
      sellerPhone: sellerPhoneMap.get(o.seller_id as string) || null,
    }));
  } catch {
    return [];
  }
}

/** Update ad's highest offer and count */
async function updateAdOfferStats(adId: string) {
  try {
    const summary = await getAdOffersSummary(adId);
    await supabase
      .from("ads" as never)
      .update({
        highest_offer: summary.highestOffer,
        offers_count: summary.totalOffers,
      } as never)
      .eq("id", adId);
  } catch {
    // Non-critical
  }
}

function mapOffer(o: Record<string, unknown>): PriceOffer {
  return {
    id: o.id as string,
    adId: o.ad_id as string,
    buyerId: o.buyer_id as string,
    sellerId: o.seller_id as string,
    amount: Number(o.amount),
    message: (o.message as string) || null,
    status: o.status as OfferStatus,
    counterAmount: o.counter_amount ? Number(o.counter_amount) : null,
    counterMessage: (o.counter_message as string) || null,
    parentOfferId: (o.parent_offer_id as string) || null,
    createdAt: o.created_at as string,
    updatedAt: o.updated_at as string,
    expiresAt: o.expires_at as string,
    buyerName: "",
    buyerAvatar: null,
    buyerPhone: null,
    sellerPhone: null,
    adTitle: "",
  };
}

/**
 * Get offer status label in Arabic
 */
export function getOfferStatusLabel(status: OfferStatus): string {
  switch (status) {
    case "pending": return "في الانتظار";
    case "accepted": return "مقبول";
    case "rejected": return "مرفوض";
    case "countered": return "عرض مضاد";
    case "expired": return "منتهي";
    case "withdrawn": return "تم السحب";
  }
}

/**
 * Get offer status color
 */
export function getOfferStatusColor(status: OfferStatus): string {
  switch (status) {
    case "pending": return "bg-yellow-50 text-yellow-700";
    case "accepted": return "bg-green-50 text-green-700";
    case "rejected": return "bg-red-50 text-red-700";
    case "countered": return "bg-blue-50 text-blue-700";
    case "expired": return "bg-gray-100 text-gray-500";
    case "withdrawn": return "bg-gray-100 text-gray-500";
  }
}
