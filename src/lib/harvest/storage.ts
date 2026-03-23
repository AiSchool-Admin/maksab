/**
 * منطق التخزين الموحد — Unified Harvest Storage
 * يتعامل مع حفظ إعلانات السيارات والعقارات بشكل موحد
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ─── Types ───────────────────────────────────────────────────

export interface CarListing {
  title: string;
  price: number | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  mileage: number | null;
  condition: string | null;
  color: string | null;
  fuel_type: string | null;
  transmission: string | null;
  governorate: string;
  city: string | null;
  seller_name: string | null;
  seller_phone: string | null;
  seller_profile_url: string | null;
  seller_is_business: boolean;
  source_url: string;
  source_listing_id: string;
  source_platform: string;
  thumbnail_url: string | null;
}

export interface PropertyListing {
  title: string;
  price: number | null;
  property_type: string | null;
  transaction_type: string | null;
  area_sqm: number | null;
  rooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  has_garage: boolean | null;
  furnished: string | null;
  finishing: string | null;
  governorate: string;
  district: string | null;
  seller_name: string | null;
  seller_phone: string | null;
  seller_profile_url: string | null;
  seller_is_agent: boolean;
  seller_is_developer: boolean;
  source_url: string;
  source_listing_id: string;
  source_platform: string;
  thumbnail_url: string | null;
}

interface SaveResult {
  isNew: boolean;
  sellerIsNew: boolean;
  phoneExtracted: boolean;
  listingId?: string;
  sellerId?: string;
}

// ─── Supabase Client ─────────────────────────────────────────

function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Seller Upsert ───────────────────────────────────────────

interface SellerInput {
  name: string | null;
  phone: string | null;
  profile_url: string | null;
  source_platform: string;
  primary_governorate: string;
  primary_category: string;
  seller_is_business: boolean;
}

async function upsertSeller(
  supabase: SupabaseClient,
  input: SellerInput
): Promise<{ id: string; isNew: boolean }> {
  let existing = null;

  // Find by phone first (strongest identifier)
  if (input.phone) {
    const { data } = await supabase
      .from("ahe_sellers")
      .select("id")
      .eq("phone", input.phone)
      .single();
    existing = data;
  }

  // Then by profile URL
  if (!existing && input.profile_url) {
    const { data } = await supabase
      .from("ahe_sellers")
      .select("id")
      .eq("profile_url", input.profile_url)
      .single();
    existing = data;
  }

  if (existing) {
    await supabase
      .from("ahe_sellers")
      .update({
        last_seen_at: new Date().toISOString(),
        ...(input.phone && { phone: input.phone }),
        ...(input.name && { name: input.name }),
      })
      .eq("id", existing.id);
    return { id: existing.id, isNew: false };
  }

  // Create new
  const { data: newSeller, error } = await supabase
    .from("ahe_sellers")
    .insert({
      phone: input.phone,
      name: input.name,
      profile_url: input.profile_url,
      source_platform: input.source_platform,
      is_business: input.seller_is_business,
      detected_account_type: input.seller_is_business ? "business" : "individual",
      primary_category: input.primary_category,
      primary_governorate: input.primary_governorate,
      total_listings_seen: 1,
      active_listings: 1,
      pipeline_status: input.phone ? "new_with_phone" : "new_no_phone",
    })
    .select("id")
    .single();

  if (error || !newSeller) {
    console.error("[STORAGE] Seller insert error:", error?.message);
    return { id: "", isNew: false };
  }

  return { id: newSeller.id, isNew: true };
}

// ─── Car Listing Storage ─────────────────────────────────────

export async function saveCarListing(
  listing: CarListing,
  scopeId: string,
  supabase?: SupabaseClient
): Promise<SaveResult> {
  const db = supabase || getServiceClient();

  // Check duplicate
  const { data: existing } = await db
    .from("ahe_listings")
    .select("id")
    .eq("source_platform", listing.source_platform)
    .eq("source_listing_url", listing.source_url)
    .single();

  if (existing) {
    await db.from("ahe_listings").update({ last_seen_at: new Date().toISOString() }).eq("id", existing.id);
    return { isNew: false, sellerIsNew: false, phoneExtracted: false };
  }

  // Upsert seller
  let sellerId: string | null = null;
  let sellerIsNew = false;
  if (listing.seller_name || listing.seller_phone || listing.seller_profile_url) {
    const result = await upsertSeller(db, {
      name: listing.seller_name,
      phone: listing.seller_phone,
      profile_url: listing.seller_profile_url,
      source_platform: listing.source_platform,
      primary_governorate: listing.governorate,
      primary_category: "سيارات",
      seller_is_business: listing.seller_is_business,
    });
    sellerId = result.id;
    sellerIsNew = result.isNew;
  }

  // Insert listing
  const { data: inserted, error } = await db
    .from("ahe_listings")
    .insert({
      scope_id: scopeId,
      source_platform: listing.source_platform,
      source_listing_url: listing.source_url,
      source_listing_id: listing.source_listing_id,
      title: listing.title,
      price: listing.price,
      currency: "EGP",
      maksab_category: "سيارات",
      detected_brand: listing.brand,
      detected_model: listing.model,
      thumbnail_url: listing.thumbnail_url,
      source_location: listing.city || listing.governorate,
      governorate: listing.governorate,
      city: listing.city,
      seller_name: listing.seller_name,
      seller_profile_url: listing.seller_profile_url,
      seller_is_business: listing.seller_is_business,
      ahe_seller_id: sellerId,
      extracted_phone: listing.seller_phone,
      phone_source: listing.seller_phone ? "listing_page" : null,
      specifications: {
        brand: listing.brand,
        model: listing.model,
        year: listing.year,
        mileage: listing.mileage,
        color: listing.color,
        fuel_type: listing.fuel_type,
        transmission: listing.transmission,
        condition: listing.condition,
      },
      migration_status: "harvested",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[STORAGE] Car listing insert error:", error.message);
    return { isNew: false, sellerIsNew: false, phoneExtracted: false };
  }

  // Update whale score
  if (sellerId) {
    await updateSellerScore(db, sellerId);
  }

  return {
    isNew: true,
    sellerIsNew,
    phoneExtracted: !!listing.seller_phone,
    listingId: inserted?.id,
    sellerId: sellerId || undefined,
  };
}

// ─── Property Listing Storage ────────────────────────────────

export async function savePropertyListing(
  listing: PropertyListing,
  scopeId: string,
  supabase?: SupabaseClient
): Promise<SaveResult> {
  const db = supabase || getServiceClient();

  // Check duplicate
  const { data: existing } = await db
    .from("ahe_listings")
    .select("id")
    .eq("source_platform", listing.source_platform)
    .eq("source_listing_url", listing.source_url)
    .single();

  if (existing) {
    await db.from("ahe_listings").update({ last_seen_at: new Date().toISOString() }).eq("id", existing.id);
    return { isNew: false, sellerIsNew: false, phoneExtracted: false };
  }

  // Upsert seller
  const isBusiness = listing.seller_is_agent || listing.seller_is_developer;
  let sellerId: string | null = null;
  let sellerIsNew = false;
  if (listing.seller_name || listing.seller_phone || listing.seller_profile_url) {
    const result = await upsertSeller(db, {
      name: listing.seller_name,
      phone: listing.seller_phone,
      profile_url: listing.seller_profile_url,
      source_platform: listing.source_platform,
      primary_governorate: listing.governorate,
      primary_category: "عقارات",
      seller_is_business: isBusiness,
    });
    sellerId = result.id;
    sellerIsNew = result.isNew;
  }

  // Insert listing
  const { data: inserted, error } = await db
    .from("ahe_listings")
    .insert({
      scope_id: scopeId,
      source_platform: listing.source_platform,
      source_listing_url: listing.source_url,
      source_listing_id: listing.source_listing_id,
      title: listing.title,
      price: listing.price,
      currency: "EGP",
      maksab_category: "عقارات",
      thumbnail_url: listing.thumbnail_url,
      source_location: listing.district || listing.governorate,
      governorate: listing.governorate,
      city: listing.district,
      seller_name: listing.seller_name,
      seller_profile_url: listing.seller_profile_url,
      seller_is_business: isBusiness,
      ahe_seller_id: sellerId,
      extracted_phone: listing.seller_phone,
      phone_source: listing.seller_phone ? "listing_page" : null,
      specifications: {
        property_type: listing.property_type,
        transaction_type: listing.transaction_type,
        area_sqm: listing.area_sqm,
        rooms: listing.rooms,
        bathrooms: listing.bathrooms,
        floor: listing.floor,
        finishing: listing.finishing,
        furnished: listing.furnished,
        has_garage: listing.has_garage,
        district: listing.district,
      },
      migration_status: "harvested",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[STORAGE] Property listing insert error:", error.message);
    return { isNew: false, sellerIsNew: false, phoneExtracted: false };
  }

  // Update whale score
  if (sellerId) {
    await updateSellerScore(db, sellerId);
  }

  return {
    isNew: true,
    sellerIsNew,
    phoneExtracted: !!listing.seller_phone,
    listingId: inserted?.id,
    sellerId: sellerId || undefined,
  };
}

// ─── Whale Score Update ──────────────────────────────────────

async function updateSellerScore(supabase: SupabaseClient, sellerId: string): Promise<void> {
  try {
    const { data: seller } = await supabase
      .from("ahe_sellers")
      .select("total_listings_seen, active_listings, is_business, is_verified, has_featured_listings, has_elite_listings")
      .eq("id", sellerId)
      .single();

    if (!seller) return;

    let score = 0;

    // Total listings (max 40 pts)
    const total = seller.total_listings_seen || 0;
    if (total >= 50) score += 40;
    else if (total >= 20) score += 25;
    else if (total >= 10) score += 15;
    else score += 5;

    // Active listings (max 30 pts)
    const active = seller.active_listings || 0;
    if (active >= 20) score += 30;
    else if (active >= 10) score += 20;
    else if (active >= 5) score += 10;
    else score += 3;

    // Business account (max 20 pts)
    if (seller.is_business) score += 20;

    // Verified (max 10 pts)
    if (seller.is_verified) score += 10;

    const isWhale = score >= 70;

    await supabase
      .from("ahe_sellers")
      .update({
        whale_score: score,
        is_whale: isWhale,
        ...(isWhale && !seller.is_verified ? { whale_detected_at: new Date().toISOString() } : {}),
      })
      .eq("id", sellerId);
  } catch (error) {
    console.error("[STORAGE] Whale score update error:", error);
  }
}
