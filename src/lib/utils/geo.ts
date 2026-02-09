/**
 * Geolocation utilities for Maksab
 * - Haversine distance calculation
 * - Reverse geocoding (governorate coordinates mapping)
 * - Distance formatting in Arabic
 */

// Governorate approximate center coordinates
export const governorateCoordinates: Record<string, { lat: number; lng: number }> = {
  "القاهرة": { lat: 30.0444, lng: 31.2357 },
  "الجيزة": { lat: 30.0131, lng: 31.2089 },
  "الإسكندرية": { lat: 31.2001, lng: 29.9187 },
  "الدقهلية": { lat: 31.0409, lng: 31.3785 },
  "الشرقية": { lat: 30.5852, lng: 31.5020 },
  "المنوفية": { lat: 30.5972, lng: 30.9876 },
  "القليوبية": { lat: 30.3292, lng: 31.2422 },
  "البحيرة": { lat: 30.8481, lng: 30.3436 },
  "الغربية": { lat: 30.8754, lng: 31.0292 },
  "كفر الشيخ": { lat: 31.1107, lng: 30.9388 },
  "دمياط": { lat: 31.4175, lng: 31.8144 },
  "بورسعيد": { lat: 31.2653, lng: 32.3019 },
  "الإسماعيلية": { lat: 30.5965, lng: 32.2715 },
  "السويس": { lat: 29.9668, lng: 32.5498 },
  "الفيوم": { lat: 29.3084, lng: 30.8428 },
  "بني سويف": { lat: 29.0661, lng: 31.0994 },
  "المنيا": { lat: 28.0871, lng: 30.7618 },
  "أسيوط": { lat: 27.1783, lng: 31.1859 },
  "سوهاج": { lat: 26.5591, lng: 31.6948 },
  "قنا": { lat: 26.1551, lng: 32.7160 },
  "الأقصر": { lat: 25.6872, lng: 32.6396 },
  "أسوان": { lat: 24.0889, lng: 32.8998 },
  "البحر الأحمر": { lat: 27.2579, lng: 33.8116 },
  "الوادي الجديد": { lat: 25.4390, lng: 30.0459 },
  "مطروح": { lat: 31.3543, lng: 27.2373 },
  "شمال سيناء": { lat: 31.0682, lng: 33.8302 },
  "جنوب سيناء": { lat: 28.4933, lng: 33.8676 },
};

/**
 * Calculate distance between two points using Haversine formula
 * @returns Distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Format distance in Arabic
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} متر`;
  }
  if (km < 10) {
    return `${km.toFixed(1)} كم`;
  }
  return `${Math.round(km)} كم`;
}

/**
 * Get user's current GPS position
 */
export function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("الـ GPS مش متاح في المتصفح ده"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error("اسمح بالوصول للموقع من إعدادات المتصفح"));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error("الموقع مش متاح دلوقتي"));
            break;
          case error.TIMEOUT:
            reject(new Error("انتهت المهلة — جرب تاني"));
            break;
          default:
            reject(new Error("مشكلة في تحديد الموقع"));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      },
    );
  });
}

/**
 * Reverse geocode: find nearest governorate from coordinates
 */
export function findNearestGovernorate(lat: number, lng: number): string {
  let closest = "القاهرة";
  let minDist = Infinity;

  for (const [gov, coords] of Object.entries(governorateCoordinates)) {
    const dist = haversineDistance(lat, lng, coords.lat, coords.lng);
    if (dist < minDist) {
      minDist = dist;
      closest = gov;
    }
  }

  return closest;
}

/**
 * Get approximate coordinates for a governorate
 */
export function getGovernorateCoords(governorate: string): { lat: number; lng: number } | null {
  return governorateCoordinates[governorate] || null;
}

/**
 * Egypt bounding box for map
 */
export const EGYPT_BOUNDS = {
  center: { lat: 26.8206, lng: 30.8025 } as const,
  zoom: 6,
  minZoom: 5,
  maxZoom: 18,
  bounds: {
    south: 22.0,
    north: 31.7,
    west: 24.7,
    east: 37.0,
  },
};
