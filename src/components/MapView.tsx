"use client";

import { useEffect, useRef } from "react";

interface Listing {
  id: string;
  title: string;
  description?: string;
  category?: string;
  listing_type?: string;
  image_url?: string;
  latitude: number;
  longitude: number;
  price?: number;
}

interface MapViewProps {
  listings: Listing[];
  height?: string;
  onListingClick?: (listing: Listing) => void;
}

const TYPE_COLOR: Record<string, string> = {
  swap:   "#16a34a",
  donate: "#7c3aed",
  sale:   "#2563eb",
};

const TYPE_ICON: Record<string, string> = {
  swap:   "🔄",
  donate: "🎁",
  sale:   "💰",
};

export default function MapView({ listings, height = "500px", onListingClick }: MapViewProps) {
  const mapRef   = useRef<any>(null);
  const mapElRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || mapRef.current) return;

    import("leaflet").then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapElRef.current) return;
      const map = L.map(mapElRef.current, { center: [20, 0], zoom: 2 });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      addMarkers(L, map, listings, onListingClick);
      fitMap(L, map, listings);
    });

    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then((L) => {
      mapRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) mapRef.current.removeLayer(layer);
      });
      addMarkers(L, mapRef.current, listings, onListingClick);
      fitMap(L, mapRef.current, listings);
    });
  }, [listings]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />
      <div ref={mapElRef} style={{ height, width: "100%" }} className="rounded-xl z-0" />
    </>
  );
}

function fitMap(L: any, map: any, listings: any[]) {
  const valid = listings.filter((l) => l.latitude && l.longitude);
  if (valid.length > 0) {
    const bounds = L.latLngBounds(valid.map((l) => [l.latitude, l.longitude]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }
}

function addMarkers(L: any, map: any, listings: any[], onListingClick?: (l: any) => void) {
  if (onListingClick) (window as any).__mapListingClick = (id: string) => {
    const found = listings.find((l) => l.id === id);
    if (found) onListingClick(found);
  };

  listings.forEach((listing) => {
    if (!listing.latitude || !listing.longitude) return;

    const type  = listing.listing_type ?? "swap";
    const color = TYPE_COLOR[type] ?? "#16a34a";
    const icon  = TYPE_ICON[type]  ?? "🔄";

    const svgIcon = L.divIcon({
      className: "",
      html: `<div style="background:${color};width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;">
               <span style="transform:rotate(45deg);font-size:14px;">${icon}</span>
             </div>`,
      iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -38],
    });

    const marker = L.marker([listing.latitude, listing.longitude], { icon: svgIcon }).addTo(map);

    marker.bindPopup(`
      <div style="min-width:200px;font-family:system-ui,sans-serif;">
        ${listing.image_url ? `<img src="${listing.image_url}" style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:8px;"/>` : ""}
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
          <strong style="font-size:0.875rem;color:#111;">${listing.title}</strong>
          <span style="background:${color};color:white;font-size:0.65rem;font-weight:600;padding:2px 8px;border-radius:99px;">${type.charAt(0).toUpperCase()+type.slice(1)}</span>
        </div>
        ${listing.category ? `<p style="font-size:0.75rem;color:#6b7280;margin-bottom:4px;">${listing.category}</p>` : ""}
        ${listing.description ? `<p style="font-size:0.75rem;color:#374151;margin-bottom:8px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${listing.description}</p>` : ""}
        ${listing.listing_type === "sale" && listing.price ? `<p style="font-size:0.875rem;font-weight:700;color:#2563eb;">$${listing.price}</p>` : ""}
        ${listing.listing_type === "donate" ? `<p style="font-size:0.75rem;color:#7c3aed;font-weight:600;">Free donation 🎁</p>` : ""}
        <button onclick="window.__mapListingClick&&window.__mapListingClick('${listing.id}')"
          style="margin-top:8px;width:100%;background:${color};color:white;border:none;padding:6px;border-radius:8px;font-size:0.75rem;font-weight:600;cursor:pointer;">
          View Listing
        </button>
      </div>`, { maxWidth: 240 });
  });
}