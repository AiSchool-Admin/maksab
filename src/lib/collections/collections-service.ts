/**
 * Shareable Collections Service — "قوائم مكسب"
 *
 * Allows users to create shared lists of ads (e.g., "شقق بنشوفها", "هدايا عيد ميلاد")
 * and share them via WhatsApp or direct link.
 *
 * Uses localStorage with Supabase sync (fire-and-forget pattern).
 *
 * The current user ID is read automatically from the session stored in
 * localStorage (key: "maksab_user_session"), so callers don't need to
 * pass it explicitly.
 */

import { supabase } from "@/lib/supabase/client";

// ── Types ──────────────────────────────────────────────

export interface Collection {
  id: string;
  userId: string;
  name: string; // e.g., "شقق بنشوفها"
  description?: string;
  icon: string; // emoji
  adIds: string[]; // IDs of ads in collection
  isPublic: boolean; // Can others view via link?
  shareCode: string; // 8-char code for sharing
  collaboratorIds: string[]; // Users who can edit
  createdAt: string;
  updatedAt: string;
}

export interface CollectionWithAds extends Collection {
  ads: Array<{
    id: string;
    title: string;
    price: number | null;
    image: string | null;
    saleType: string;
    status: string;
    governorate: string;
  }>;
}

export interface CollectionSummary {
  id: string;
  name: string;
  icon: string;
  adCount: number;
  isPublic: boolean;
  shareCode: string;
  updatedAt: string;
  previewImages: string[]; // First 3 ad images
}

// ── Constants ──────────────────────────────────────────

const STORAGE_KEY = "maksab_collections";
const SESSION_KEY = "maksab_user_session";
const MAX_COLLECTIONS_PER_USER = 20;
const MAX_ADS_PER_COLLECTION = 50;

/** Suggested pre-made collections for new users */
export const SUGGESTED_COLLECTIONS = [
  { name: "المفضلة", icon: "\u2764\uFE0F" },
  { name: "شقق بنشوفها", icon: "\uD83C\uDFE0" },
  { name: "هدايا", icon: "\uD83C\uDF81" },
  { name: "عايز أشتريه", icon: "\uD83D\uDED2" },
];

// ── Helpers ────────────────────────────────────────────

/**
 * Read the current user ID from the session stored in localStorage.
 * Returns null if not logged in or running on the server.
 */
function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return (session?.id as string) || null;
  } catch {
    return null;
  }
}

/**
 * Generate a random 8-character alphanumeric share code.
 * Uses characters that are unambiguous (no 0/O/1/I/l).
 */
function generateShareCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ── Local Storage Persistence ──────────────────────────

interface StoredCollectionsData {
  collections: Collection[];
  /** Map of adId -> image URL, cached for preview images */
  adImageCache: Record<string, string>;
}

function getStoredData(userId: string): StoredCollectionsData {
  if (typeof window === "undefined") {
    return { collections: [], adImageCache: {} };
  }

  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (raw) {
      return JSON.parse(raw) as StoredCollectionsData;
    }
  } catch {
    // Corrupted data — reset
  }

  const newData: StoredCollectionsData = {
    collections: [],
    adImageCache: {},
  };
  localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(newData));
  return newData;
}

function saveStoredData(userId: string, data: StoredCollectionsData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(data));
}

// ── Supabase Sync (fire-and-forget) ────────────────────

function syncToSupabase(userId: string, collection: Collection): void {
  supabase
    .from("collections" as never)
    .upsert(
      {
        id: collection.id,
        user_id: userId,
        name: collection.name,
        description: collection.description || null,
        icon: collection.icon,
        ad_ids: collection.adIds,
        is_public: collection.isPublic,
        share_code: collection.shareCode,
        collaborator_ids: collection.collaboratorIds,
        updated_at: collection.updatedAt,
      } as never,
      { onConflict: "id" } as never,
    )
    .then();
}

function deleteFromSupabase(collectionId: string): void {
  supabase
    .from("collections" as never)
    .delete()
    .eq("id" as never, collectionId as never)
    .then();
}

// ── Core Functions ─────────────────────────────────────

/**
 * Create a new collection.
 * Max 20 collections per user.
 *
 * @param name - Collection name (Arabic)
 * @param icon - Emoji icon (optional, defaults to clipboard)
 * @param description - Optional description
 * @returns The created Collection, or null on failure
 */
export function createCollection(
  name: string,
  icon?: string,
  description?: string,
): Collection | null {
  const userId = getCurrentUserId();
  if (!userId) return null;

  if (!name || name.trim().length === 0) return null;
  if (name.trim().length > 50) return null;

  const data = getStoredData(userId);

  if (data.collections.length >= MAX_COLLECTIONS_PER_USER) return null;

  // Check for duplicate name
  const duplicate = data.collections.find(
    (c) => c.name.trim() === name.trim(),
  );
  if (duplicate) return null;

  const now = new Date().toISOString();
  const collection: Collection = {
    id: crypto.randomUUID(),
    userId,
    name: name.trim(),
    description: description?.trim() || undefined,
    icon: icon || "\uD83D\uDCCB", // default clipboard emoji
    adIds: [],
    isPublic: true,
    shareCode: generateShareCode(),
    collaboratorIds: [],
    createdAt: now,
    updatedAt: now,
  };

  data.collections.unshift(collection);
  saveStoredData(userId, data);

  // Sync to Supabase (fire-and-forget)
  syncToSupabase(userId, collection);

  return collection;
}

/**
 * Delete a collection.
 * Only the owner can delete.
 */
export function deleteCollection(collectionId: string): boolean {
  const userId = getCurrentUserId();
  if (!userId) return false;

  const data = getStoredData(userId);
  const index = data.collections.findIndex((c) => c.id === collectionId);

  if (index === -1) return false;

  if (data.collections[index].userId !== userId) return false;

  data.collections.splice(index, 1);
  saveStoredData(userId, data);

  // Sync deletion to Supabase
  deleteFromSupabase(collectionId);

  return true;
}

/**
 * Update collection metadata (name, icon, description, isPublic).
 */
export function updateCollection(
  collectionId: string,
  updates: Partial<Pick<Collection, "name" | "icon" | "description" | "isPublic">>,
): Collection | null {
  const userId = getCurrentUserId();
  if (!userId) return null;

  const data = getStoredData(userId);
  const collection = data.collections.find((c) => c.id === collectionId);

  if (!collection) return null;

  // Only owner or collaborator can update
  if (collection.userId !== userId && !collection.collaboratorIds.includes(userId)) {
    return null;
  }

  if (updates.name !== undefined) {
    if (updates.name.trim().length === 0) return null;
    if (updates.name.trim().length > 50) return null;
    // Check for duplicate name
    const duplicate = data.collections.find(
      (c) => c.id !== collectionId && c.name.trim() === updates.name!.trim(),
    );
    if (duplicate) return null;
    collection.name = updates.name.trim();
  }

  if (updates.icon !== undefined) {
    collection.icon = updates.icon;
  }

  if (updates.description !== undefined) {
    collection.description = updates.description.trim() || undefined;
  }

  if (updates.isPublic !== undefined) {
    collection.isPublic = updates.isPublic;
  }

  collection.updatedAt = new Date().toISOString();
  saveStoredData(userId, data);

  // Sync to Supabase
  syncToSupabase(userId, collection);

  return collection;
}

/**
 * Add an ad to a collection.
 * Max 50 ads per collection.
 *
 * @param collectionId - The collection to add the ad to
 * @param adId - The ad ID to add
 * @param adImage - Optional image URL for preview caching
 * @returns true if successful
 */
export function addToCollection(
  collectionId: string,
  adId: string,
  adImage?: string,
): boolean {
  const userId = getCurrentUserId();
  if (!userId || !adId) return false;

  const data = getStoredData(userId);
  const collection = data.collections.find((c) => c.id === collectionId);

  if (!collection) return false;

  // Only owner or collaborator can add
  if (collection.userId !== userId && !collection.collaboratorIds.includes(userId)) {
    return false;
  }

  if (collection.adIds.includes(adId)) return false;
  if (collection.adIds.length >= MAX_ADS_PER_COLLECTION) return false;

  collection.adIds.push(adId);
  collection.updatedAt = new Date().toISOString();

  // Cache image for preview
  if (adImage) {
    data.adImageCache[adId] = adImage;
  }

  saveStoredData(userId, data);

  // Sync to Supabase
  syncToSupabase(userId, collection);

  return true;
}

/**
 * Remove an ad from a collection.
 */
export function removeFromCollection(
  collectionId: string,
  adId: string,
): boolean {
  const userId = getCurrentUserId();
  if (!userId) return false;

  const data = getStoredData(userId);
  const collection = data.collections.find((c) => c.id === collectionId);

  if (!collection) return false;

  // Only owner or collaborator can remove
  if (collection.userId !== userId && !collection.collaboratorIds.includes(userId)) {
    return false;
  }

  const index = collection.adIds.indexOf(adId);
  if (index === -1) return false;

  collection.adIds.splice(index, 1);
  collection.updatedAt = new Date().toISOString();
  saveStoredData(userId, data);

  // Sync to Supabase
  syncToSupabase(userId, collection);

  return true;
}

/**
 * Get all current user's collections as summaries (for listing).
 * Returns empty array if not logged in.
 */
export function getMyCollections(): CollectionSummary[] {
  const userId = getCurrentUserId();
  if (!userId) return [];

  const data = getStoredData(userId);

  return data.collections.map((c) => {
    // Get preview images from cache (first 3 ads that have images)
    const previewImages: string[] = [];
    for (const adId of c.adIds) {
      if (previewImages.length >= 3) break;
      const cached = data.adImageCache[adId];
      if (cached) {
        previewImages.push(cached);
      }
    }

    return {
      id: c.id,
      name: c.name,
      icon: c.icon,
      adCount: c.adIds.length,
      isPublic: c.isPublic,
      shareCode: c.shareCode,
      updatedAt: c.updatedAt,
      previewImages,
    };
  });
}

/**
 * Get full collection with ad details.
 * Fetches ad data from Supabase for the collection's ad IDs.
 */
export async function getCollectionWithAds(
  collectionId: string,
): Promise<{ success: boolean; collection?: CollectionWithAds; error?: string }> {
  const userId = getCurrentUserId();
  if (!userId) {
    return { success: false, error: "لازم تسجل دخول الأول" };
  }

  const data = getStoredData(userId);
  const collection = data.collections.find((c) => c.id === collectionId);

  if (!collection) {
    return { success: false, error: "القائمة مش موجودة" };
  }

  // Only owner, collaborator, or public can view
  if (
    collection.userId !== userId &&
    !collection.collaboratorIds.includes(userId) &&
    !collection.isPublic
  ) {
    return { success: false, error: "القائمة دي خاصة" };
  }

  // Fetch ad details from Supabase
  const ads = await fetchAdsForCollection(collection.adIds);

  // Update image cache with fresh data
  for (const ad of ads) {
    if (ad.image) {
      data.adImageCache[ad.id] = ad.image;
    }
  }
  saveStoredData(userId, data);

  return {
    success: true,
    collection: {
      ...collection,
      ads,
    },
  };
}

/**
 * Get a collection by its share code (public access, no auth required).
 */
export async function getCollectionByShareCode(
  shareCode: string,
): Promise<{ success: boolean; collection?: CollectionWithAds; error?: string }> {
  if (!shareCode || shareCode.length !== 8) {
    return { success: false, error: "كود المشاركة مش صحيح" };
  }

  // First try Supabase
  try {
    const { data: row } = await supabase
      .from("collections" as never)
      .select("*")
      .eq("share_code" as never, shareCode as never)
      .eq("is_public" as never, true as never)
      .maybeSingle();

    if (row) {
      const record = row as Record<string, unknown>;
      const adIds = (record.ad_ids as string[]) || [];
      const ads = await fetchAdsForCollection(adIds);

      const collection: CollectionWithAds = {
        id: record.id as string,
        userId: record.user_id as string,
        name: record.name as string,
        description: (record.description as string) || undefined,
        icon: (record.icon as string) || "\uD83D\uDCCB",
        adIds,
        isPublic: true,
        shareCode: record.share_code as string,
        collaboratorIds: (record.collaborator_ids as string[]) || [],
        createdAt: record.created_at as string,
        updatedAt: record.updated_at as string,
        ads,
      };

      return { success: true, collection };
    }
  } catch {
    // Supabase not available — try localStorage fallback
  }

  // Fallback: search localStorage (for local-only collections)
  if (typeof window !== "undefined") {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(STORAGE_KEY),
    );

    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const stored = JSON.parse(raw) as StoredCollectionsData;
        const found = stored.collections.find(
          (c) => c.shareCode === shareCode && c.isPublic,
        );
        if (found) {
          const ads = await fetchAdsForCollection(found.adIds);
          return { success: true, collection: { ...found, ads } };
        }
      } catch {
        continue;
      }
    }
  }

  return { success: false, error: "القائمة مش موجودة أو مش متاحة للمشاركة" };
}

/**
 * Get which of the current user's collections contain a specific ad.
 * Returns collection IDs.
 */
export function getAdCollections(adId: string): string[] {
  const userId = getCurrentUserId();
  if (!userId || !adId) return [];

  const data = getStoredData(userId);
  return data.collections
    .filter((c) => c.adIds.includes(adId))
    .map((c) => c.id);
}

/**
 * Generate a shareable link for a collection.
 */
export function generateShareLink(shareCode: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/collections/${shareCode}`;
  }
  return `https://maksab.app/collections/${shareCode}`;
}

/**
 * Generate a WhatsApp share URL with collection details.
 * Accepts a full Collection, CollectionSummary, or a partial object
 * with at least { name, shareCode }.
 */
export function generateWhatsAppShareUrl(
  collection: { name: string; shareCode: string; icon?: string; adCount?: number; adIds?: string[] },
): string {
  const link = generateShareLink(collection.shareCode);
  const adCount = collection.adCount ?? collection.adIds?.length ?? 0;
  const icon = collection.icon || "\uD83D\uDCCB";

  const text = [
    `${icon} ${collection.name}`,
    ``,
    `قائمة فيها ${adCount} إعلان على مكسب`,
    ``,
    `${link}`,
    ``,
    `مكسب — كل صفقة مكسب`,
  ].join("\n");

  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Quick-add an ad to a collection by name.
 * If the collection doesn't exist, create it first.
 */
export function quickAddToCollection(
  collectionName: string,
  adId: string,
  adImage?: string,
  collectionIcon?: string,
): { success: boolean; collectionId?: string; error?: string } {
  const userId = getCurrentUserId();
  if (!userId) {
    return { success: false, error: "لازم تسجل دخول الأول" };
  }

  const data = getStoredData(userId);
  let collection: Collection | undefined = data.collections.find(
    (c) => c.name.trim() === collectionName.trim(),
  );

  if (!collection) {
    const created = createCollection(collectionName, collectionIcon);
    if (!created) {
      return { success: false, error: "مقدرناش ننشئ القائمة" };
    }
    collection = created;
  }

  const added = addToCollection(collection.id, adId, adImage);
  if (!added) {
    return { success: false, error: "مقدرناش نضيف الإعلان للقائمة" };
  }

  return { success: true, collectionId: collection.id };
}

// ── Internal Helpers ───────────────────────────────────

/**
 * Fetch ad details from Supabase for a list of ad IDs.
 * Returns partial ad data needed for collection display.
 */
async function fetchAdsForCollection(
  adIds: string[],
): Promise<CollectionWithAds["ads"]> {
  if (adIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from("ads" as never)
      .select("id, title, price, images, sale_type, status, governorate")
      .in("id" as never, adIds as never);

    if (error || !data) return [];

    const rows = data as Array<Record<string, unknown>>;

    // Maintain the order from adIds
    const rowMap = new Map(rows.map((r) => [r.id as string, r]));
    return adIds
      .map((id) => {
        const row = rowMap.get(id);
        if (!row) return null;
        return {
          id: row.id as string,
          title: row.title as string,
          price: row.price ? Number(row.price) : null,
          image: ((row.images as string[]) ?? [])[0] ?? null,
          saleType: row.sale_type as string,
          status: row.status as string,
          governorate: (row.governorate as string) ?? "",
        };
      })
      .filter(Boolean) as CollectionWithAds["ads"];
  } catch {
    return [];
  }
}
