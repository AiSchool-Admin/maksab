/**
 * Buy Request Offers Service — مكسب
 *
 * Allows sellers to make offers on buy requests (cash, exchange, auction).
 * Uses `buy_request_offers` table.
 */

import { supabase } from "@/lib/supabase/client";

export type OfferType = "cash" | "exchange" | "auction";
export type BROfferStatus = "pending" | "accepted" | "rejected" | "withdrawn" | "expired";

export interface BuyRequestOffer {
  id: string;
  buyRequestId: string;
  sellerId: string;
  offerType: OfferType;
  price: number | null;
  adId: string | null;
  message: string | null;
  status: BROfferStatus;
  buyerResponseMessage: string | null;
  createdAt: string;
  // Enriched
  sellerName?: string;
  sellerAvatar?: string | null;
  sellerPhone?: string | null;
  adTitle?: string;
  adImage?: string | null;
}

export interface SubmitOfferInput {
  buyRequestId: string;
  offerType: OfferType;
  price?: number;
  adId?: string;
  message?: string;
}

/**
 * Submit an offer on a buy request
 */
export async function submitBuyRequestOffer(
  input: SubmitOfferInput,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "يجب تسجيل الدخول أولاً" };

    // Check ownership — can't offer on own request
    const { data: reqData } = await supabase
      .from("buy_requests")
      .select("user_id")
      .eq("id", input.buyRequestId)
      .maybeSingle();

    if (!reqData) return { success: false, error: "الطلب غير موجود" };
    if ((reqData as Record<string, unknown>).user_id === user.id) {
      return { success: false, error: "لا يمكنك تقديم عرض على طلبك" };
    }

    // Check for existing pending offer
    const { data: existing } = await supabase
      .from("buy_request_offers")
      .select("id")
      .eq("buy_request_id", input.buyRequestId)
      .eq("seller_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return { success: false, error: "عندك عرض قائم بالفعل على هذا الطلب" };
    }

    const { data, error } = await supabase
      .from("buy_request_offers")
      .insert({
        buy_request_id: input.buyRequestId,
        seller_id: user.id,
        offer_type: input.offerType,
        price: input.price || null,
        ad_id: input.adId || null,
        message: input.message || null,
        status: "pending",
      } as never)
      .select("id")
      .single();

    if (error) {
      console.error("[submitBuyRequestOffer]", error.message);
      // Fallback: table might not exist yet
      if (error.message.includes("relation") && error.message.includes("does not exist")) {
        return { success: false, error: "جدول العروض غير موجود — يرجى تشغيل SQL migration" };
      }
      return { success: false, error: `خطأ: ${error.message}` };
    }

    const id = (data as unknown as { id: string }).id;

    // Update last_matched_at on the buy request (non-critical)
    supabase
      .from("buy_requests")
      .update({ last_matched_at: new Date().toISOString() } as never)
      .eq("id", input.buyRequestId)
      .then(() => {});

    return { success: true, id };
  } catch (err) {
    console.error("[submitBuyRequestOffer] catch", err);
    return { success: false, error: "حصل مشكلة — جرب تاني" };
  }
}

/**
 * Get all offers on a buy request (for the buyer to see)
 */
export async function getOffersForRequest(buyRequestId: string): Promise<BuyRequestOffer[]> {
  try {
    const { data, error } = await supabase
      .from("buy_request_offers")
      .select("*")
      .eq("buy_request_id", buyRequestId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    const offers = data as unknown as Record<string, unknown>[];
    if (offers.length === 0) return [];

    // Enrich with seller profiles
    const sellerIds = [...new Set(offers.map((o) => o.seller_id as string))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, phone")
      .in("id", sellerIds);

    const profileMap = new Map<string, { name: string; avatar: string | null; phone: string | null }>();
    if (profiles) {
      for (const p of profiles as unknown as Record<string, unknown>[]) {
        profileMap.set(p.id as string, {
          name: (p.display_name as string) || "بائع",
          avatar: (p.avatar_url as string) || null,
          phone: (p.phone as string) || null,
        });
      }
    }

    // Enrich with ad data for exchange/auction offers
    const adIds = offers.map((o) => o.ad_id as string).filter(Boolean);
    const adMap = new Map<string, { title: string; image: string | null }>();
    if (adIds.length > 0) {
      const { data: ads } = await supabase
        .from("ads")
        .select("id, title, images")
        .in("id", adIds);

      if (ads) {
        for (const a of ads as unknown as Record<string, unknown>[]) {
          adMap.set(a.id as string, {
            title: a.title as string,
            image: ((a.images as string[]) ?? [])[0] ?? null,
          });
        }
      }
    }

    return offers.map((o) => {
      const seller = profileMap.get(o.seller_id as string);
      const ad = o.ad_id ? adMap.get(o.ad_id as string) : undefined;
      return {
        id: o.id as string,
        buyRequestId: o.buy_request_id as string,
        sellerId: o.seller_id as string,
        offerType: (o.offer_type as OfferType) || "cash",
        price: o.price ? Number(o.price) : null,
        adId: (o.ad_id as string) || null,
        message: (o.message as string) || null,
        status: (o.status as BROfferStatus) || "pending",
        buyerResponseMessage: (o.buyer_response_message as string) || null,
        createdAt: o.created_at as string,
        sellerName: seller?.name || "بائع",
        sellerAvatar: seller?.avatar || null,
        sellerPhone: seller?.phone || null,
        adTitle: ad?.title,
        adImage: ad?.image,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Get seller's offers
 */
export async function getMySellerOffers(): Promise<BuyRequestOffer[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("buy_request_offers")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) return [];

    return (data as unknown as Record<string, unknown>[]).map((o) => ({
      id: o.id as string,
      buyRequestId: o.buy_request_id as string,
      sellerId: o.seller_id as string,
      offerType: (o.offer_type as OfferType) || "cash",
      price: o.price ? Number(o.price) : null,
      adId: (o.ad_id as string) || null,
      message: (o.message as string) || null,
      status: (o.status as BROfferStatus) || "pending",
      buyerResponseMessage: (o.buyer_response_message as string) || null,
      createdAt: o.created_at as string,
    }));
  } catch {
    return [];
  }
}

/**
 * Respond to an offer (buyer accepts/rejects)
 */
export async function respondToOffer(params: {
  offerId: string;
  action: "accepted" | "rejected";
  message?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("buy_request_offers")
      .update({
        status: params.action,
        buyer_response_message: params.message || null,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", params.offerId);

    if (error) return { success: false, error: error.message };

    // If accepted, reject all other pending offers on same request
    if (params.action === "accepted") {
      const { data: offerData } = await supabase
        .from("buy_request_offers")
        .select("buy_request_id")
        .eq("id", params.offerId)
        .maybeSingle();

      if (offerData) {
        const reqId = (offerData as Record<string, unknown>).buy_request_id as string;

        // Reject other pending offers
        await supabase
          .from("buy_request_offers")
          .update({ status: "rejected", updated_at: new Date().toISOString() } as never)
          .eq("buy_request_id", reqId)
          .eq("status", "pending")
          .neq("id", params.offerId);

        // Mark buy request as fulfilled
        await supabase
          .from("buy_requests")
          .update({ status: "fulfilled", updated_at: new Date().toISOString() } as never)
          .eq("id", reqId);
      }
    }

    return { success: true };
  } catch {
    return { success: false, error: "حصل مشكلة — جرب تاني" };
  }
}

/**
 * Withdraw seller's offer
 */
export async function withdrawSellerOffer(offerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("buy_request_offers")
      .update({ status: "withdrawn", updated_at: new Date().toISOString() } as never)
      .eq("id", offerId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch {
    return { success: false, error: "حصل مشكلة — جرب تاني" };
  }
}

// ── Labels ─────────────────────────────────────────

export function getOfferTypeLabel(type: OfferType): { label: string; emoji: string; color: string } {
  switch (type) {
    case "cash": return { label: "عرض شراء", emoji: "💵", color: "bg-green-50 text-green-700" };
    case "exchange": return { label: "عرض تبديل", emoji: "🔄", color: "bg-purple-50 text-purple-700" };
    case "auction": return { label: "دعوة مزاد", emoji: "🔨", color: "bg-orange-50 text-orange-700" };
  }
}

export function getOfferStatusLabel(status: BROfferStatus): { label: string; color: string } {
  switch (status) {
    case "pending": return { label: "في الانتظار", color: "bg-yellow-50 text-yellow-700" };
    case "accepted": return { label: "مقبول", color: "bg-green-50 text-green-700" };
    case "rejected": return { label: "مرفوض", color: "bg-red-50 text-red-700" };
    case "withdrawn": return { label: "تم السحب", color: "bg-gray-100 text-gray-500" };
    case "expired": return { label: "منتهي", color: "bg-gray-100 text-gray-500" };
  }
}
