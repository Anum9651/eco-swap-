"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { supabase } from "../../../lib/supabase";

const MapView = dynamic(() => import("../../../components/MapView"), { ssr: false });

const CATEGORIES = [
  "All", "Electronics", "Clothing & Apparel", "Furniture", "Books & Media",
  "Sports & Outdoors", "Toys & Games", "Kitchen & Home", "Tools & Hardware",
  "Vehicles & Parts", "Other",
];

interface Listing {
  id: string; title: string; description?: string; category?: string;
  listing_type?: string; image_url?: string; latitude: number;
  longitude: number; price?: number; condition?: string;
}

export default function MapPage() {
  const [listings, setListings]         = useState<Listing[]>([]);
  const [filtered, setFiltered]         = useState<Listing[]>([]);
  const [loading, setLoading]           = useState(true);
  const [typeFilter, setTypeFilter]     = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selected, setSelected]         = useState<Listing | null>(null);

  useEffect(() => {
    supabase
      .from("listings")
      .select("id, title, description, category, listing_type, image_url, latitude, longitude, price, condition")
      .eq("status", "active")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .then(({ data }) => {
        setListings(data ?? []);
        setFiltered(data ?? []);
        setLoading(false);
      });
  }, []);

  const applyFilters = useCallback(() => {
    let result = [...listings];
    if (typeFilter !== "all")   result = result.filter((l) => l.listing_type === typeFilter);
    if (categoryFilter !== "All") result = result.filter((l) => l.category === categoryFilter);
    setFiltered(result);
  }, [listings, typeFilter, categoryFilter]);

  useEffect(() => { applyFilters(); }, [applyFilters]);

  const TYPE_TABS = [
    { value: "all",    label: "All",    icon: "🗺️" },
    { value: "swap",   label: "Swap",   icon: "🔄" },
    { value: "donate", label: "Donate", icon: "🎁" },
    { value: "sale",   label: "Sale",   icon: "💰" },
  ];

  const TYPE_COLOR: Record<string, string> = {
    swap: "bg-green-600", donate: "bg-purple-600", sale: "bg-blue-600",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Listings Map</h1>
          <p className="text-sm text-gray-400 mt-1">
            {loading ? "Loading…" : `${filtered.length} listing${filtered.length !== 1 ? "s" : ""} on the map`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-4 items-center">
        {/* Type filter */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {TYPE_TABS.map((t) => (
            <button key={t.value} onClick={() => setTypeFilter(t.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                typeFilter === t.value ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-xs font-medium px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
        >
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>

        {/* Legend */}
        <div className="flex items-center gap-3 ml-auto">
          {["swap", "donate", "sale"].map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${TYPE_COLOR[t]}`} />
              <span className="text-xs text-gray-500 capitalize">{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map + Selected card side by side */}
      <div className="flex gap-5">
        {/* Map */}
        <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all ${selected ? "flex-1" : "w-full"}`}>
          {loading ? (
            <div className="h-[600px] flex items-center justify-center bg-gray-50">
              <div className="flex flex-col items-center gap-3">
                <svg className="w-8 h-8 animate-spin text-green-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <p className="text-sm text-gray-400">Loading map…</p>
              </div>
            </div>
          ) : (
            <MapView listings={filtered} height="600px" onListingClick={setSelected} />
          )}
        </div>

        {/* Selected listing card */}
        {selected && (
          <div className="w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-24">
              {selected.image_url && (
                <img src={selected.image_url} alt={selected.title} className="w-full h-40 object-cover" />
              )}
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 leading-snug">{selected.title}</h3>
                  <button onClick={() => setSelected(null)}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0 transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {selected.category && <p className="text-xs text-gray-400">{selected.category}</p>}
                {selected.condition && (
                  <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {selected.condition}
                  </span>
                )}
                {selected.description && (
                  <p className="text-sm text-gray-500 line-clamp-3">{selected.description}</p>
                )}
                {selected.listing_type === "sale" && selected.price && (
                  <p className="text-lg font-bold text-blue-600">${selected.price}</p>
                )}
                {selected.listing_type === "donate" && (
                  <p className="text-sm font-semibold text-purple-600">Free donation 🎁</p>
                )}
                <div className={`w-full text-center text-xs font-bold py-2 rounded-xl text-white ${
                  selected.listing_type === "donate" ? "bg-purple-600" :
                  selected.listing_type === "sale"   ? "bg-blue-600"   : "bg-green-600"
                }`}>
                  {selected.listing_type === "donate" ? "🎁 Donation"
                   : selected.listing_type === "sale" ? "💰 For Sale"
                   : "🔄 Available for Swap"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}