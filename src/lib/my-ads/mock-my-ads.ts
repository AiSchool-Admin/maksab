/**
 * Mock data and service for the "my ads" management page.
 */

import type { AdStatus } from "@/types";

export interface MyAd {
  id: string;
  title: string;
  price: number | null;
  saleType: "cash" | "auction" | "exchange";
  image: string | null;
  status: AdStatus;
  viewsCount: number;
  favoritesCount: number;
  messagesCount: number;
  createdAt: string;
  governorate: string | null;
  city: string | null;
}

const now = Date.now();
const hour = 3600000;
const day = 86400000;

const mockAds: MyAd[] = [
  {
    id: "my-1",
    title: "تويوتا كورولا 2020 — 45,000 كم",
    price: 350000,
    saleType: "cash",
    image: null,
    status: "active",
    viewsCount: 245,
    favoritesCount: 12,
    messagesCount: 8,
    createdAt: new Date(now - 3 * day).toISOString(),
    governorate: "القاهرة",
    city: "مدينة نصر",
  },
  {
    id: "my-2",
    title: "آيفون 15 برو ماكس — 256GB — مستعمل زيرو",
    price: 48000,
    saleType: "auction",
    image: null,
    status: "active",
    viewsCount: 132,
    favoritesCount: 5,
    messagesCount: 3,
    createdAt: new Date(now - 1 * day).toISOString(),
    governorate: "القاهرة",
    city: "مدينة نصر",
  },
  {
    id: "my-3",
    title: "سامسونج S24 Ultra — 512GB — جديد متبرشم",
    price: null,
    saleType: "exchange",
    image: null,
    status: "active",
    viewsCount: 89,
    favoritesCount: 2,
    messagesCount: 4,
    createdAt: new Date(now - 5 * day).toISOString(),
    governorate: "القاهرة",
    city: "التجمع الخامس",
  },
  {
    id: "my-4",
    title: "غسالة توشيبا 10 كيلو — 2023 — مستعملة ممتاز",
    price: 8500,
    saleType: "cash",
    image: null,
    status: "sold",
    viewsCount: 67,
    favoritesCount: 1,
    messagesCount: 2,
    createdAt: new Date(now - 10 * day).toISOString(),
    governorate: "الجيزة",
    city: "فيصل",
  },
  {
    id: "my-5",
    title: "شقة 150م² — 3 غرف — الطابق الخامس",
    price: 1500000,
    saleType: "cash",
    image: null,
    status: "expired",
    viewsCount: 312,
    favoritesCount: 18,
    messagesCount: 15,
    createdAt: new Date(now - 35 * day).toISOString(),
    governorate: "القاهرة",
    city: "مصر الجديدة",
  },
];

/**
 * Fetch user's own ads.
 */
export async function fetchMyAds(): Promise<MyAd[]> {
  await new Promise((r) => setTimeout(r, 400));
  return mockAds;
}

/**
 * Update an ad's status (sold, deleted, etc.)
 */
export async function updateAdStatus(
  adId: string,
  status: AdStatus,
): Promise<{ success: boolean }> {
  await new Promise((r) => setTimeout(r, 300));
  const ad = mockAds.find((a) => a.id === adId);
  if (ad) {
    ad.status = status;
    return { success: true };
  }
  return { success: false };
}

/**
 * Delete an ad.
 */
export async function deleteAd(
  adId: string,
): Promise<{ success: boolean }> {
  return updateAdStatus(adId, "deleted");
}

/**
 * Status labels in Egyptian Arabic.
 */
export function getStatusLabel(status: AdStatus): { label: string; color: string } {
  switch (status) {
    case "active":
      return { label: "نشط", color: "bg-brand-green/10 text-brand-green" };
    case "sold":
      return { label: "تم البيع", color: "bg-blue-100 text-blue-700" };
    case "exchanged":
      return { label: "تم التبديل", color: "bg-purple-100 text-purple-700" };
    case "expired":
      return { label: "منتهي", color: "bg-orange-100 text-orange-700" };
    case "deleted":
      return { label: "محذوف", color: "bg-gray-200 text-gray-text" };
    default:
      return { label: status, color: "bg-gray-200 text-gray-text" };
  }
}
