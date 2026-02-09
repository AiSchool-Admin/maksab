"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Navigation, Loader2, Layers, ZoomIn, ZoomOut } from "lucide-react";
import { EGYPT_BOUNDS, haversineDistance, formatDistance, getCurrentPosition } from "@/lib/utils/geo";
import { formatPrice } from "@/lib/utils/format";
import type L from "leaflet";

interface MapAd {
  id: string;
  title: string;
  price: number | null;
  saleType: "cash" | "auction" | "exchange";
  latitude: number;
  longitude: number;
  governorate: string;
  city?: string;
  image?: string;
  categoryIcon?: string;
}

interface MapViewProps {
  ads: MapAd[];
  userLocation?: { lat: number; lng: number } | null;
  onAdClick?: (adId: string) => void;
  onLocationDetected?: (lat: number, lng: number) => void;
  selectedAdId?: string;
  height?: string;
  showControls?: boolean;
}

export default function MapView({
  ads,
  userLocation,
  onAdClick,
  onLocationDetected,
  selectedAdId,
  height = "60vh",
  showControls = true,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [leaflet, setLeaflet] = useState<typeof L | null>(null);

  // Dynamically import Leaflet (SSR-safe)
  useEffect(() => {
    let cancelled = false;
    async function loadLeaflet() {
      const L = (await import("leaflet")).default;
      // @ts-expect-error CSS import has no type declarations
      await import("leaflet/dist/leaflet.css");

      // Fix default icon paths
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      if (!cancelled) setLeaflet(L);
    }
    loadLeaflet();
    return () => { cancelled = true; };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!leaflet || !mapContainerRef.current || mapRef.current) return;

    const map = leaflet.map(mapContainerRef.current, {
      center: [EGYPT_BOUNDS.center.lat, EGYPT_BOUNDS.center.lng],
      zoom: EGYPT_BOUNDS.zoom,
      minZoom: EGYPT_BOUNDS.minZoom,
      maxZoom: EGYPT_BOUNDS.maxZoom,
      zoomControl: false,
      attributionControl: false,
    });

    leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    markersRef.current = leaflet.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [leaflet]);

  // Render ad markers
  useEffect(() => {
    if (!mapReady || !leaflet || !markersRef.current) return;

    markersRef.current.clearLayers();

    ads.forEach((ad) => {
      if (!ad.latitude || !ad.longitude) return;

      const isSelected = ad.id === selectedAdId;
      const saleIcon = ad.saleType === "auction" ? "🔨" : ad.saleType === "exchange" ? "🔄" : "💵";
      const priceText = ad.price ? formatPrice(ad.price) : ad.saleType === "exchange" ? "تبديل" : "";
      const distanceText = userLocation
        ? formatDistance(haversineDistance(userLocation.lat, userLocation.lng, ad.latitude, ad.longitude))
        : "";

      const icon = leaflet.divIcon({
        className: "custom-map-marker",
        html: `
          <div class="${isSelected ? "ring-2 ring-brand-green" : ""}" style="
            background: ${isSelected ? "#1B7A3D" : "white"};
            color: ${isSelected ? "white" : "#1A1A2E"};
            border-radius: 12px;
            padding: 4px 8px;
            font-size: 11px;
            font-weight: 700;
            font-family: var(--font-cairo), sans-serif;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 3px;
            border: 2px solid ${isSelected ? "#145C2E" : "#E5E7EB"};
            cursor: pointer;
            transform: translate(-50%, -100%);
          ">
            <span>${saleIcon}</span>
            <span>${priceText}</span>
          </div>
          <div style="
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 6px solid ${isSelected ? "#1B7A3D" : "white"};
            margin: 0 auto;
            transform: translateX(-50%);
            position: absolute;
            left: 50%;
            bottom: -6px;
          "></div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = leaflet.marker([ad.latitude, ad.longitude], { icon });

      // Popup content
      const popupContent = `
        <div dir="rtl" style="font-family: var(--font-cairo), sans-serif; min-width: 200px; max-width: 250px;">
          ${ad.image ? `<img src="${ad.image}" alt="" style="width:100%; height:100px; object-fit:cover; border-radius:8px; margin-bottom:8px;" />` : ""}
          <p style="font-weight:700; font-size:13px; margin:0 0 4px; line-height:1.4; color:#1A1A2E;">
            ${ad.title}
          </p>
          <p style="color:#1B7A3D; font-weight:700; font-size:14px; margin:0 0 4px;">
            ${saleIcon} ${priceText}
          </p>
          <p style="color:#6B7280; font-size:11px; margin:0;">
            📍 ${ad.governorate}${ad.city ? ` — ${ad.city}` : ""}
            ${distanceText ? ` · ${distanceText}` : ""}
          </p>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: false,
        maxWidth: 260,
        className: "maksab-popup",
      });

      marker.on("click", () => {
        onAdClick?.(ad.id);
      });

      markersRef.current!.addLayer(marker);
    });
  }, [ads, mapReady, leaflet, selectedAdId, userLocation, onAdClick]);

  // Show user location marker
  useEffect(() => {
    if (!mapReady || !leaflet || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    const userIcon = leaflet.divIcon({
      className: "user-location-marker",
      html: `
        <div style="
          width: 18px; height: 18px;
          background: #3B82F6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 0 6px rgba(59,130,246,0.2), 0 2px 4px rgba(0,0,0,0.3);
        "></div>
      `,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    userMarkerRef.current = leaflet.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .addTo(mapRef.current!)
      .bindPopup('<div dir="rtl" style="font-family:var(--font-cairo),sans-serif;text-align:center;"><b>📍 موقعك الحالي</b></div>');
  }, [userLocation, mapReady, leaflet]);

  // Locate user
  const handleLocateMe = useCallback(async () => {
    setIsLocating(true);
    try {
      const pos = await getCurrentPosition();
      onLocationDetected?.(pos.lat, pos.lng);

      if (mapRef.current) {
        mapRef.current.setView([pos.lat, pos.lng], 12, { animate: true });
      }
    } catch {
      // Silently fail — user denied or GPS unavailable
    }
    setIsLocating(false);
  }, [onLocationDetected]);

  // Fly to selected ad
  useEffect(() => {
    if (!mapReady || !selectedAdId) return;
    const ad = ads.find((a) => a.id === selectedAdId);
    if (ad?.latitude && ad?.longitude && mapRef.current) {
      mapRef.current.setView([ad.latitude, ad.longitude], 14, { animate: true });
    }
  }, [selectedAdId, mapReady, ads]);

  return (
    <div className="relative" style={{ height }}>
      {/* Map container */}
      <div ref={mapContainerRef} className="w-full h-full rounded-2xl overflow-hidden z-0" />

      {/* Loading overlay */}
      {!mapReady && (
        <div className="absolute inset-0 bg-gray-100 rounded-2xl flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-brand-green animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-text">جاري تحميل الخريطة...</p>
          </div>
        </div>
      )}

      {/* Controls */}
      {showControls && mapReady && (
        <div className="absolute top-3 end-3 z-[1000] flex flex-col gap-2">
          {/* Locate me button */}
          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
            title="موقعي الحالي"
          >
            {isLocating ? (
              <Loader2 size={18} className="text-blue-500 animate-spin" />
            ) : (
              <Navigation size={18} className="text-blue-500" />
            )}
          </button>

          {/* Zoom controls */}
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all"
          >
            <ZoomIn size={18} className="text-dark" />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all"
          >
            <ZoomOut size={18} className="text-dark" />
          </button>
        </div>
      )}

      {/* Ad count badge */}
      <div className="absolute top-3 start-3 z-[1000]">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg px-3 py-1.5 flex items-center gap-1.5">
          <MapPin size={14} className="text-brand-green" />
          <span className="text-xs font-bold text-dark">{ads.filter(a => a.latitude && a.longitude).length} إعلان على الخريطة</span>
        </div>
      </div>
    </div>
  );
}
